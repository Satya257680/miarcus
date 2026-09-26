// ======================================================
// ACTION POINT RE-CLASSIFICATION
// ======================================================
//
// Repairs data created by the old rule engine, which treated every
// "No" as a problem and every "Yes" as fine:
//
//   1. OPEN Action Points whose answer is actually fine
//      ("Are there any paint issues?" → "No", N/A answers …)
//      are removed, so the answer appears in Checklist Reports.
//
//   2. Checklist answers that actually report a problem but never got
//      an Action Point ("Are there any tile issues?" → "Yes")
//      get an Action Point, so they leave Checklist Reports until the
//      action is completed.
//
//   3. Legacy automatic NSO rules with the wrong expected answer are
//      corrected.
//
// Action Points that somebody already worked on (In Progress / Closed,
// or with an action recorded) are never touched.
//
// Call with { dryRun: true } to preview the changes.
// ======================================================

const db = require("../config/db");
const ActionPoint = require("../models/actionPointModel");
const inspectionService = require("./inspectionService");
const { decideIssue, normalize } = require("../utils/answerClassifier");

const SYNTHETIC_QUESTION_TEXT = "action point item (bulk import)";

const deleteActionPoint = (id) =>
    new Promise((resolve, reject) => {
        ActionPoint.delete(id, (err, result) => (err ? reject(err) : resolve(result)));
    });

const loadAnswers = async (filters = {}) => {
    const where = ["csa.id IS NOT NULL"];
    const params = [];

    if (filters.submission_id) {
        where.push("cs.id = ?");
        params.push(Number(filters.submission_id));
    }
    if (filters.store_id) {
        where.push("cs.store_id = ?");
        params.push(Number(filters.store_id));
    }
    if (filters.start_date) {
        where.push("DATE(cs.submission_date) >= ?");
        params.push(filters.start_date);
    }
    if (filters.end_date) {
        where.push("DATE(cs.submission_date) <= ?");
        params.push(filters.end_date);
    }

    return db.query(`
        SELECT
            csa.id,
            csa.submission_id,
            csa.question_id,
            csa.answer,
            csa.remarks,
            csa.action_taken,
            q.question,
            q.answer_type,
            q.sla_value AS question_sla_value,
            q.sla_unit AS question_sla_unit,
            (
                SELECT GROUP_CONCAT(DISTINCT qd.department_id ORDER BY qd.department_id SEPARATOR ',')
                FROM question_departments qd
                WHERE qd.question_id = q.id
            ) AS department_ids,
            cs.store_id,
            cs.nso_status,
            ap.id AS ap_id,
            ap.status AS ap_status,
            ap.comment AS ap_comment
        FROM checklist_submission_answers csa
        INNER JOIN checklist_submissions cs ON cs.id = csa.submission_id
        LEFT JOIN questions q ON q.id = csa.question_id
        LEFT JOIN action_points ap
            ON ap.id = (
                SELECT ap1.id
                FROM action_points ap1
                WHERE ap1.submission_answer_id = csa.id
                ORDER BY ap1.id DESC
                LIMIT 1
            )
        WHERE ${where.join(" AND ")}
        ORDER BY csa.submission_id ASC, q.sequence_no ASC, csa.id ASC
    `, params);
};

const findRule = (rules, question) => {
    const text = normalize(question);
    return rules.find((rule) => normalize(rule.trigger_column) === text) || null;
};

const isUntouchedOpen = (row) =>
    String(row.ap_status || "Open").trim().toLowerCase() === "open" &&
    !String(row.action_taken || "").trim() &&
    !String(row.ap_comment || "").trim();

const refreshSubmissionStatus = async (submissionId, answers) => {
    const openRows = await db.query(`
        SELECT COUNT(*) AS open_count
        FROM action_points
        WHERE submission_id = ?
          AND LOWER(COALESCE(status, 'Open')) <> 'closed'
    `, [submissionId]);

    const score = inspectionService.calculateScore(answers);
    const status = Number(openRows?.[0]?.open_count || 0) > 0 ? "Open" : "Closed";

    await db.query(`
        UPDATE checklist_submissions
        SET inspection_score = ?, nso_status = ?
        WHERE id = ?
    `, [score, status, submissionId]);
};

const reclassify = async ({ dryRun = true, userId = null, filters = {} } = {}) => {
    const rows = await loadAnswers(filters);
    let rules = await inspectionService.getActiveRules();

    const summary = {
        dry_run: Boolean(dryRun),
        scanned_answers: 0,
        removed_action_points: 0,
        created_action_points: 0,
        skipped_in_progress: 0,
        repaired_rules: 0,
        affected_submissions: 0,
        removed: [],
        created: []
    };

    const bySubmission = new Map();
    for (const row of rows) {
        if (normalize(row.question) === SYNTHETIC_QUESTION_TEXT) continue;
        if (!bySubmission.has(row.submission_id)) bySubmission.set(row.submission_id, []);
        bySubmission.get(row.submission_id).push(row);
    }

    const legacyRuleIds = new Map();

    for (const [submissionId, answers] of bySubmission.entries()) {
        let changed = false;
        const needsActionPoint = [];

        for (const row of answers) {
            summary.scanned_answers++;
            const rule = findRule(rules, row.question);
            const decision = decideIssue(row, rule);

            if (decision.legacyRule && rule?.id) {
                legacyRuleIds.set(rule.id, decision.expectedAnswer);
            }

            // ---------- wrongly created Action Point ----------
            if (row.ap_id && !decision.issue) {
                const apStatus = String(row.ap_status || "Open").toLowerCase();
                if (apStatus === "closed") continue;

                if (!isUntouchedOpen(row)) {
                    summary.skipped_in_progress++;
                    continue;
                }

                summary.removed_action_points++;
                summary.removed.push({
                    action_point_id: row.ap_id,
                    submission_id: submissionId,
                    question: row.question,
                    answer: row.answer,
                    reason: decision.reason
                });

                if (!dryRun) {
                    await deleteActionPoint(row.ap_id);
                    changed = true;
                }
                continue;
            }

            // ---------- missing Action Point ----------
            if (!row.ap_id && decision.issue) {
                summary.created_action_points++;
                summary.created.push({
                    submission_id: submissionId,
                    question: row.question,
                    answer: row.answer,
                    reason: decision.reason
                });
                needsActionPoint.push(row);
            }
        }

        if (!dryRun && needsActionPoint.length) {
            const submission = { id: submissionId, store_id: answers[0].store_id, nso_status: answers[0].nso_status };

            const matched = inspectionService.evaluateRules(needsActionPoint, rules);
            const automatic = await inspectionService.buildAutomaticProblems(
                needsActionPoint,
                rules,
                submission,
                userId
            );

            await inspectionService.createActionPoints(
                submission,
                [...matched, ...automatic],
                userId,
                { sendEmail: false }
            );

            if (automatic.length) {
                rules = await inspectionService.getActiveRules();
            }
            changed = true;
        }

        if (!dryRun && changed) {
            summary.affected_submissions++;
            try {
                await refreshSubmissionStatus(submissionId, answers);
            } catch (error) {
                console.error(`[Reclassify] Submission #${submissionId} status refresh failed:`, error.message);
            }
        } else if (dryRun && (needsActionPoint.length || summary.removed.some((r) => r.submission_id === submissionId))) {
            summary.affected_submissions++;
        }
    }

    summary.repaired_rules = legacyRuleIds.size;
    if (!dryRun) {
        for (const [ruleId, expected] of legacyRuleIds.entries()) {
            try {
                await db.query(`UPDATE nso_rules SET expected_answer = ? WHERE id = ?`, [expected, ruleId]);
            } catch (error) {
                console.error(`[Reclassify] NSO rule #${ruleId} repair failed:`, error.message);
            }
        }
    }

    // Keep the response small.
    summary.removed = summary.removed.slice(0, 50);
    summary.created = summary.created.slice(0, 50);

    return summary;
};

module.exports = { reclassify };

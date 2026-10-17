// ======================================================
// ACTION POINT RE-CHECK (RE-CLASSIFICATION)
// ======================================================
//
// Re-checks existing checklist answers against the ACTIVE rules
// configured in the Issue Control Center (issue_control_rules) — the
// same rules, matched the same way, that new checklist submissions use
// (inspectionService.findRuleForAnswer + answerClassifier.decideIssue):
//
//   1. MOVE TO CHECKLIST REPORTS
//      An existing OPEN Action Point whose answer is the rule's
//      no-issue answer is removed, so the answer shows in Checklist
//      Reports (Checklist Reports lists every answer without an open
//      Action Point). The checklist submission and its answer are
//      never touched.
//
//   2. RAISE AS ACTION POINTS
//      An answer that matches the rule's issue-trigger answer but has
//      no Action Point yet gets exactly ONE Action Point.
//
//   3. RULES CORRECTED
//      Legacy rules saved without an issue-trigger answer that expected
//      "Yes" for a problem-seeking question are repaired (existing
//      behaviour). Counted only for rules that really change.
//
// Safety:
//   • A question with NO active Issue Control Center rule is never
//     guessed. Its existing Action Points are left as they are and
//     reported as "needs review"; its answers are not raised.
//   • Action Points somebody already worked on (In Progress / Closed,
//     comment or action recorded) are never removed.
//   • Each answer is counted once. Action Points are linked to answers
//     by submission_answer_id, or — for imported rows without that
//     link — by submission + question, so nothing is raised twice.
//   • Duplicate answer rows for the same submission + question raise at
//     most one Action Point.
//
// Call with { dryRun: true } to preview the changes.
// ======================================================

const db = require("../config/db");
const ActionPoint = require("../models/actionPointModel");
const inspectionService = require("./inspectionService");
const { decideIssue, normalize } = require("../utils/answerClassifier");

const SYNTHETIC_QUESTION_TEXT = "action point item (bulk import)";

const SAMPLE_LIMIT = 50;

const deleteActionPoint = (id) =>
    new Promise((resolve, reject) => {
        ActionPoint.delete(id, (err, result) => (err ? reject(err) : resolve(result)));
    });

// ------------------------------------------------------
// LOAD SUBMITTED ANSWERS (one row per answer — no joins that multiply)
// ------------------------------------------------------
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
            cs.nso_status
        FROM checklist_submission_answers csa
        INNER JOIN checklist_submissions cs ON cs.id = csa.submission_id
        LEFT JOIN questions q ON q.id = csa.question_id
        WHERE ${where.join(" AND ")}
        ORDER BY csa.submission_id ASC, q.sequence_no ASC, csa.id ASC
    `, params);
};

// ------------------------------------------------------
// LOAD CHECKLIST ACTION POINTS (all statuses) and index them by
// answer id and by submission + question.
// ------------------------------------------------------
const loadActionPointIndex = async (filters = {}) => {
    const where = ["ap.submission_id IS NOT NULL"];
    const params = [];

    if (filters.submission_id) {
        where.push("ap.submission_id = ?");
        params.push(Number(filters.submission_id));
    }
    if (filters.store_id) {
        where.push("ap.store_id = ?");
        params.push(Number(filters.store_id));
    }

    const rows = await db.query(`
        SELECT
            ap.id,
            ap.submission_id,
            ap.submission_answer_id,
            ap.question_id,
            ap.status,
            ap.comment
        FROM action_points ap
        WHERE ${where.join(" AND ")}
        ORDER BY ap.id ASC
    `, params);

    const byAnswer = new Map();
    const byQuestion = new Map();

    for (const ap of rows || []) {
        if (ap.submission_answer_id) {
            const key = Number(ap.submission_answer_id);
            if (!byAnswer.has(key)) byAnswer.set(key, []);
            byAnswer.get(key).push(ap);
        } else if (ap.question_id) {
            const key = `${Number(ap.submission_id)}:${Number(ap.question_id)}`;
            if (!byQuestion.has(key)) byQuestion.set(key, []);
            byQuestion.get(key).push(ap);
        }
    }

    return { byAnswer, byQuestion };
};

const questionKey = (row) => `${Number(row.submission_id)}:${Number(row.question_id || 0)}`;

const linkedActionPoints = (index, row) => {
    const direct = index.byAnswer.get(Number(row.id)) || [];
    const imported = row.question_id ? (index.byQuestion.get(questionKey(row)) || []) : [];
    return [...direct, ...imported];
};

const statusOf = (ap) => String(ap?.status || "Open").trim().toLowerCase();

// Removable = still Open, nobody recorded an action or a comment.
const isUntouchedOpen = (ap, answerRow) =>
    statusOf(ap) === "open" &&
    !String(answerRow.action_taken || "").trim() &&
    !String(ap.comment || "").trim();

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

const pushSample = (list, item) => {
    if (list.length < SAMPLE_LIMIT) list.push(item);
};

const reclassify = async ({ dryRun = true, userId = null, filters = {} } = {}) => {
    const [rows, apIndex, rules] = await Promise.all([
        loadAnswers(filters),
        loadActionPointIndex(filters),
        inspectionService.getActiveRules()
    ]);

    const summary = {
        dry_run: Boolean(dryRun),
        active_rules: rules.length,
        scanned_answers: 0,
        // answers whose question has an active Issue Control Center rule
        evaluated_answers: 0,
        // answers whose question has NO active rule (not evaluated)
        answers_without_rule: 0,
        // existing Action Points re-checked against their rule
        evaluated_action_points: 0,
        // existing OPEN Action Points linked to a question with no rule
        needs_review_no_rule: 0,
        removed_action_points: 0,
        created_action_points: 0,
        // issue answers whose Action Point already exists (kept)
        kept_action_points: 0,
        skipped_in_progress: 0,
        repaired_rules: 0,
        affected_submissions: 0,
        removed: [],
        created: [],
        needs_review: []
    };

    // Group by submission (answers keep their checklist order).
    const bySubmission = new Map();
    for (const row of rows || []) {
        if (normalize(row.question) === SYNTHETIC_QUESTION_TEXT) continue;
        if (!bySubmission.has(row.submission_id)) bySubmission.set(row.submission_id, []);
        bySubmission.get(row.submission_id).push(row);
    }

    const legacyRuleIds = new Map();
    // An Action Point is evaluated once, even when it is reachable from
    // more than one answer row (duplicate answers for one question).
    const seenActionPoints = new Set();

    for (const [submissionId, answers] of bySubmission.entries()) {
        const toRemove = [];
        const needsActionPoint = [];
        // submission + question already handled (has an AP or one is
        // being raised) -> never raise a second one.
        const handledQuestions = new Set();

        for (const row of answers) {
            summary.scanned_answers++;

            const linked = linkedActionPoints(apIndex, row).filter((ap) => !seenActionPoints.has(ap.id));
            linked.forEach((ap) => seenActionPoints.add(ap.id));
            const hasAnyActionPoint = linkedActionPoints(apIndex, row).length > 0;

            const rule = inspectionService.findRuleForAnswer(rules, row);

            // ---------- no active rule: do not guess ----------
            if (!rule) {
                summary.answers_without_rule++;
                const openLinked = linked.filter((ap) => statusOf(ap) !== "closed");
                if (openLinked.length) {
                    summary.needs_review_no_rule += openLinked.length;
                    openLinked.forEach((ap) => pushSample(summary.needs_review, {
                        action_point_id: ap.id,
                        submission_id: submissionId,
                        question: row.question,
                        answer: row.answer,
                        reason: "No active Issue Control Center rule for this question."
                    }));
                }
                if (hasAnyActionPoint && row.question_id) handledQuestions.add(questionKey(row));
                continue;
            }

            summary.evaluated_answers++;
            const decision = decideIssue(row, rule);

            if (decision.legacyRule && rule.id) {
                legacyRuleIds.set(rule.id, decision.expectedAnswer);
            }

            // ---------- answer is an issue ----------
            if (decision.issue) {
                if (hasAnyActionPoint) {
                    summary.evaluated_action_points += linked.length;
                    summary.kept_action_points += linked.length;
                    if (row.question_id) handledQuestions.add(questionKey(row));
                    continue;
                }

                needsActionPoint.push({ row, reason: decision.reason });
                continue;
            }

            // ---------- answer is fine (no-issue) ----------
            for (const ap of linked) {
                summary.evaluated_action_points++;

                if (statusOf(ap) === "closed") continue;

                if (!isUntouchedOpen(ap, row)) {
                    summary.skipped_in_progress++;
                    continue;
                }

                summary.removed_action_points++;
                pushSample(summary.removed, {
                    action_point_id: ap.id,
                    submission_id: submissionId,
                    question: row.question,
                    answer: row.answer,
                    reason: decision.reason
                });
                toRemove.push(ap.id);
            }
        }

        // Decide the raises once the whole submission has been read, so
        // duplicate answer rows for one question raise at most ONE Action
        // Point, and never when that question already keeps an Action
        // Point (one that is not being removed by this re-check).
        const removing = new Set(toRemove);
        const finalNeeds = [];
        for (const { row, reason } of needsActionPoint) {
            if (row.question_id) {
                const key = questionKey(row);
                if (handledQuestions.has(key)) continue;
                const keptElsewhere = answers.some((other) =>
                    other.id !== row.id &&
                    questionKey(other) === key &&
                    linkedActionPoints(apIndex, other).some((ap) => !removing.has(ap.id))
                );
                if (keptElsewhere) continue;
                handledQuestions.add(key);
            }

            finalNeeds.push(row);
            summary.created_action_points++;
            pushSample(summary.created, {
                submission_id: submissionId,
                question: row.question,
                answer: row.answer,
                reason
            });
        }

        const changed = toRemove.length > 0 || finalNeeds.length > 0;
        if (!changed) continue;

        summary.affected_submissions++;
        if (dryRun) continue;

        for (const id of toRemove) {
            await deleteActionPoint(id);
        }

        if (finalNeeds.length) {
            const submission = {
                id: submissionId,
                store_id: answers[0].store_id,
                nso_status: answers[0].nso_status
            };

            // Same rule evaluation as a new submission; createActionPoints
            // also refuses to create a duplicate for an answer.
            const matched = inspectionService.evaluateRules(finalNeeds, rules);

            await inspectionService.createActionPoints(
                submission,
                matched,
                userId,
                { sendEmail: false }
            );
        }

        try {
            await refreshSubmissionStatus(submissionId, answers);
        } catch (error) {
            console.error(`[Reclassify] Submission #${submissionId} status refresh failed:`, error.message);
        }
    }

    // ---------- legacy rule correction (existing feature) ----------
    const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
    const realRepairs = [...legacyRuleIds.entries()].filter(([ruleId, expected]) =>
        normalize(ruleById.get(ruleId)?.expected_answer) !== normalize(expected)
    );

    if (dryRun) {
        summary.repaired_rules = realRepairs.length;
    } else {
        for (const [ruleId, expected] of realRepairs) {
            try {
                const result = await db.query(
                    `UPDATE issue_control_rules SET expected_answer = ? WHERE id = ?`,
                    [expected, ruleId]
                );
                if (Number(result?.affectedRows || 0) > 0) summary.repaired_rules++;
            } catch (error) {
                console.error(`[Reclassify] Issue rule #${ruleId} repair failed:`, error.message);
            }
        }
    }

    return summary;
};

module.exports = { reclassify };

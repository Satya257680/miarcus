// ======================================================
// ACTION POINT RE-CHECK — RECONCILE WITH ISSUE CONTROL CENTER RULES
// ======================================================
//
// Re-check RECONCILES the Action Points that already exist with the
// ACTIVE Issue Control Center rules. It does not mass-create Action
// Points from every historical checklist answer.
//
// STEP A — existing Action Points (always)
//   Every open checklist Action Point is followed to its source answer
//   (action_points.submission_answer_id → checklist_submission_answers)
//   and evaluated with the SAME evaluator as new submissions
//   (utils/issueRuleEvaluator.js) against the rule of that exact
//   question / checklist type:
//     • issue-trigger answer      → RETAINED (unchanged)
//     • no-issue answer           → MOVED to Checklist Reports (the
//                                   untouched Action Point row is
//                                   removed; the submission and the
//                                   answer are never touched)
//     • no active rule            → SKIPPED (no rule)
//     • no reliable source answer → SKIPPED (unmapped)
//     • already worked on         → SKIPPED (in progress / commented /
//                                   assigned / history) — never removed
//     • 2nd+ Action Point for the same answer, untouched → removed as a
//                                   DUPLICATE (one per source answer)
//
// STEP B — missing Action Points (optional, explicit, bounded)
//   Only when the administrator asks for it AND gives a From/To date
//   range (max MAX_RANGE_DAYS): answers of questions that HAVE an active
//   rule, in that range, without any Action Point for the same answer
//   (or the same submission + question), are evaluated; issue-trigger
//   answers get exactly ONE Action Point. Scanned in keyset batches.
//
// RULE REPAIR
//   The only automatic repair is the unambiguous legacy combination
//   "N/A" + "Any non-empty answer" → "N/A" + "Blank answer" (N/A means
//   any non-empty response is fine; the old editor had no "Blank
//   answer" option). Other invalid rules are only reported.
//
// SAFETY
//   • Preview (dryRun) never writes.
//   • Apply re-computes the plan from current data, then writes in
//     small batches, each in its own DB transaction (rolled back on
//     error). The run stops at the first failed batch and reports it;
//     re-running is safe because every step is idempotent.
//   • Each delete re-checks in SQL that the Action Point is still
//     untouched; each insert re-checks that no Action Point exists.
//   • A unique index on action_points.submission_answer_id is added when
//     the data allows it (no duplicates left).
//   • One audit_logs row per applied batch.
// ======================================================

const db = require("../config/db");
const inspectionService = require("./inspectionService");
const {
    evaluateAnswer,
    validateRuleConfig,
    suggestedRepair
} = require("../utils/issueRuleEvaluator");

const MAX_RANGE_DAYS = 92;
const MOVE_BATCH = 500;
const CREATE_BATCH = 200;
const ANSWER_PAGE = 2000;
const SAMPLE_LIMIT = 40;
const LARGE_CREATE_WARNING = 5000;

const text = (value) => String(value ?? "").trim();
const placeholders = (list) => list.map(() => "?").join(", ");
const chunk = (list, size) => {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
};
const pushSample = (list, item) => {
    if (list.length < SAMPLE_LIMIT) list.push(item);
};

// ------------------------------------------------------
// TRANSACTION HELPER (mysql2/promise connection)
// ------------------------------------------------------
const withTransaction = async (work) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const q = async (sql, params = []) => {
            const [rows] = await connection.query(sql, params);
            return rows;
        };
        const result = await work(q);
        await connection.commit();
        return result;
    } catch (error) {
        try { await connection.rollback(); } catch (rollbackError) {
            console.error("[Re-check] Rollback failed:", rollbackError.message);
        }
        throw error;
    } finally {
        try { connection.release(); } catch { /* ignore */ }
    }
};

// ------------------------------------------------------
// INPUT
// ------------------------------------------------------
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(text(value)) && !Number.isNaN(Date.parse(`${text(value)}T00:00:00Z`));

const normalizeOptions = (options = {}) => {
    const includeMissing = options.include_missing === true || options.include_missing === "true";
    const from = text(options.from_date || options.start_date);
    const to = text(options.to_date || options.end_date);
    const storeId = Number(options.store_id) || null;

    if (includeMissing) {
        if (!isDate(from) || !isDate(to)) {
            const error = new Error("Choose a valid From and To date to look for missing Action Points.");
            error.status = 400;
            throw error;
        }
        const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
        if (days < 1) {
            const error = new Error("The To date must be on or after the From date.");
            error.status = 400;
            throw error;
        }
        if (days > MAX_RANGE_DAYS) {
            const error = new Error(`Look for missing Action Points in at most ${MAX_RANGE_DAYS} days at a time (selected: ${days} days).`);
            error.status = 400;
            throw error;
        }
    }

    return { includeMissing, from, to, storeId };
};

// ------------------------------------------------------
// RULES (active only) + in-memory repair
// ------------------------------------------------------
const loadRules = async () => {
    const stored = await inspectionService.getActiveRules();
    const repairs = [];
    const invalid = [];

    const rules = stored.map((rule) => {
        const repair = suggestedRepair(rule);
        if (repair) {
            repairs.push({
                id: rule.id,
                question: rule.trigger_column,
                checklist_type: rule.checklist_type || null,
                from: { expected_answer: rule.expected_answer, issue_answer: rule.issue_answer },
                to: { expected_answer: rule.expected_answer, issue_answer: repair.issue_answer }
            });
            return { ...rule, ...repair, _repairedFrom: rule.issue_answer };
        }
        const problems = validateRuleConfig(rule);
        if (problems.length) {
            invalid.push({ id: rule.id, question: rule.trigger_column, checklist_type: rule.checklist_type || null, problems });
        }
        return rule;
    });

    return { rules, repairs, invalid };
};

// ------------------------------------------------------
// STEP A — existing checklist Action Points
// ------------------------------------------------------
const loadOpenChecklistActionPoints = async (storeId) => {
    const params = [];
    let storeSql = "";
    if (storeId) {
        storeSql = " AND ap.store_id = ?";
        params.push(storeId);
    }

    return db.query(`
        SELECT
            ap.id,
            ap.status,
            ap.comment,
            ap.assigned_to,
            ap.submission_id,
            ap.submission_answer_id,
            ap.store_id,
            csa.id AS answer_id,
            csa.submission_id AS answer_submission_id,
            csa.question_id,
            csa.answer,
            csa.action_taken,
            q.question,
            ct.checklist_name,
            COALESCE(h.touched, 0) AS touched_history
        FROM action_points ap
        LEFT JOIN checklist_submission_answers csa ON csa.id = ap.submission_answer_id
        LEFT JOIN questions q ON q.id = csa.question_id
        LEFT JOIN checklist_types ct ON ct.id = q.checklist_type_id
        LEFT JOIN (
            SELECT action_point_id, COUNT(*) AS touched
            FROM action_point_history
            WHERE action_type <> 'CREATED'
            GROUP BY action_point_id
        ) h ON h.action_point_id = ap.id
        WHERE (ap.submission_id IS NOT NULL OR ap.submission_answer_id IS NOT NULL)
          AND LOWER(COALESCE(ap.status, 'Open')) <> 'closed'
          ${storeSql}
        ORDER BY ap.id ASC
    `, params);
};

const countOtherActionPoints = async (storeId) => {
    const params = [];
    let storeSql = "";
    if (storeId) {
        storeSql = " AND store_id = ?";
        params.push(storeId);
    }
    const rows = await db.query(`
        SELECT
            SUM(CASE WHEN submission_id IS NULL AND submission_answer_id IS NULL
                      AND LOWER(COALESCE(status, 'Open')) <> 'closed' THEN 1 ELSE 0 END) AS manual_open,
            SUM(CASE WHEN (submission_id IS NOT NULL OR submission_answer_id IS NOT NULL)
                      AND LOWER(COALESCE(status, 'Open')) = 'closed' THEN 1 ELSE 0 END) AS checklist_closed
        FROM action_points
        WHERE 1 = 1 ${storeSql}
    `, params);
    return {
        manual_open: Number(rows?.[0]?.manual_open || 0),
        checklist_closed: Number(rows?.[0]?.checklist_closed || 0)
    };
};

const isUntouched = (row) =>
    String(row.status || "Open").trim().toLowerCase() === "open" &&
    !text(row.comment) &&
    !row.assigned_to &&
    !text(row.action_taken) &&
    Number(row.touched_history || 0) === 0;

const planExistingActionPoints = (rows, rules, summary) => {
    const moves = [];          // { id, submission_id, kind: "move" | "duplicate" }

    // Group by source answer so each answer keeps at most one Action Point.
    const byAnswer = new Map();
    for (const row of rows) {
        summary.existing.evaluated++;

        const mapped = row.answer_id &&
            (!row.submission_id || Number(row.answer_submission_id) === Number(row.submission_id));

        if (!mapped) {
            summary.existing.skipped_unmapped++;
            pushSample(summary.samples.skipped, {
                action_point_id: row.id,
                question: row.question || null,
                answer: row.answer ?? null,
                reason: row.submission_answer_id
                    ? "The linked checklist answer no longer exists or belongs to another submission."
                    : "Not linked to a checklist answer (imported / manual) — left unchanged."
            });
            continue;
        }

        const key = Number(row.answer_id);
        if (!byAnswer.has(key)) byAnswer.set(key, []);
        byAnswer.get(key).push(row);
    }

    for (const group of byAnswer.values()) {
        // Keep the Action Point somebody worked on; otherwise the oldest.
        group.sort((a, b) => (isUntouched(a) - isUntouched(b)) || (a.id - b.id));
        const [primary, ...duplicates] = group;

        for (const dup of duplicates) {
            if (isUntouched(dup)) {
                summary.existing.duplicates_removed++;
                moves.push({ id: dup.id, submission_id: dup.submission_id, kind: "duplicate" });
                pushSample(summary.samples.moved, {
                    action_point_id: dup.id, question: dup.question, answer: dup.answer,
                    reason: `Duplicate of Action Point #${primary.id} for the same answer.`
                });
            } else {
                summary.existing.skipped_in_progress++;
            }
        }

        const rule = inspectionService.findRuleForAnswer(rules, primary);
        if (!rule) {
            summary.existing.skipped_no_rule++;
            pushSample(summary.samples.skipped, {
                action_point_id: primary.id, question: primary.question, answer: primary.answer,
                reason: "No active Issue Control Center rule for this question / checklist type."
            });
            continue;
        }

        const decision = evaluateAnswer(primary.answer, rule);

        if (decision.issue) {
            summary.existing.retained++;
            continue;
        }

        if (!isUntouched(primary)) {
            summary.existing.skipped_in_progress++;
            pushSample(summary.samples.skipped, {
                action_point_id: primary.id, question: primary.question, answer: primary.answer,
                reason: "Answer is not an issue, but this Action Point was already worked on — left for manual review."
            });
            continue;
        }

        summary.existing.moved_to_reports++;
        moves.push({ id: primary.id, submission_id: primary.submission_id, kind: "move" });
        pushSample(summary.samples.moved, {
            action_point_id: primary.id, question: primary.question, answer: primary.answer, reason: decision.reason
        });
    }

    return moves;
};

// ------------------------------------------------------
// STEP B — missing Action Points (bounded)
// ------------------------------------------------------
const loadRuledQuestions = async (rules) => {
    const questions = await db.query(`
        SELECT q.id, q.question, ct.checklist_name
        FROM questions q
        LEFT JOIN checklist_types ct ON ct.id = q.checklist_type_id
    `);
    const map = new Map();
    for (const q of questions || []) {
        const rule = inspectionService.findRuleForAnswer(rules, {
            question_id: q.id, question: q.question, checklist_name: q.checklist_name
        });
        if (rule) map.set(Number(q.id), rule);
    }
    return map;
};

const scanMissing = async ({ rules, from, to, storeId, summary, onPage }) => {
    const ruledQuestions = await loadRuledQuestions(rules);
    const questionIds = [...ruledQuestions.keys()];
    const candidates = [];
    const seen = new Set();

    if (!questionIds.length) return candidates;

    let lastId = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const params = [lastId, from, `${to} 23:59:59`, ...questionIds];
        let storeSql = "";
        if (storeId) {
            storeSql = " AND cs.store_id = ?";
            params.push(storeId);
        }
        params.push(ANSWER_PAGE);

        const rows = await db.query(`
            SELECT
                csa.id,
                csa.submission_id,
                csa.question_id,
                csa.answer,
                csa.remarks,
                q.question,
                q.sla_value AS question_sla_value,
                q.sla_unit AS question_sla_unit,
                ct.checklist_name,
                cs.store_id,
                (
                    SELECT GROUP_CONCAT(DISTINCT qd.department_id ORDER BY qd.department_id SEPARATOR ',')
                    FROM question_departments qd
                    WHERE qd.question_id = q.id
                ) AS department_ids
            FROM checklist_submission_answers csa
            INNER JOIN checklist_submissions cs ON cs.id = csa.submission_id
            INNER JOIN questions q ON q.id = csa.question_id
            LEFT JOIN checklist_types ct ON ct.id = q.checklist_type_id
            WHERE csa.id > ?
              AND cs.submission_date >= ?
              AND cs.submission_date <= ?
              AND csa.question_id IN (${placeholders(questionIds)})
              AND NOT EXISTS (
                    SELECT 1 FROM action_points x
                    WHERE x.submission_answer_id = csa.id
              )
              AND NOT EXISTS (
                    SELECT 1 FROM action_points y
                    WHERE y.submission_id = csa.submission_id
                      AND y.question_id = csa.question_id
              )
              ${storeSql}
            ORDER BY csa.id ASC
            LIMIT ?
        `, params);

        if (!rows || !rows.length) break;

        for (const row of rows) {
            summary.missing.evaluated++;
            const rule = ruledQuestions.get(Number(row.question_id));
            if (!rule || !row.store_id || !row.submission_id) {
                summary.missing.skipped_unmapped++;
                continue;
            }
            const decision = evaluateAnswer(row.answer, rule);
            if (!decision.issue) {
                summary.missing.already_correct++;
                continue;
            }
            const key = `${row.submission_id}:${row.question_id}`;
            if (seen.has(key)) {
                summary.missing.duplicate_answers_ignored++;
                continue;
            }
            seen.add(key);
            candidates.push({ row, rule, reason: decision.reason });
            pushSample(summary.samples.created, {
                submission_id: row.submission_id, question: row.question, answer: row.answer, reason: decision.reason
            });
        }

        lastId = Number(rows[rows.length - 1].id);
        if (onPage) onPage(summary.missing.evaluated);
        if (rows.length < ANSWER_PAGE) break;
    }

    summary.missing.to_create = candidates.length;
    return candidates;
};

// ------------------------------------------------------
// PLAN (shared by preview and apply)
// ------------------------------------------------------
const emptySummary = (opts) => ({
    dry_run: true,
    scope: {
        store_id: opts.storeId,
        include_missing: opts.includeMissing,
        from_date: opts.includeMissing ? opts.from : null,
        to_date: opts.includeMissing ? opts.to : null,
        max_range_days: MAX_RANGE_DAYS
    },
    active_rules: 0,
    rules_corrected: 0,
    rule_repairs: [],
    invalid_rules: [],
    existing: {
        open_checklist_action_points: 0,
        evaluated: 0,
        moved_to_reports: 0,
        duplicates_removed: 0,
        retained: 0,
        skipped_no_rule: 0,
        skipped_unmapped: 0,
        skipped_in_progress: 0
    },
    other: { manual_open: 0, checklist_closed: 0 },
    missing: {
        evaluated: 0,
        to_create: 0,
        created: 0,
        already_correct: 0,
        duplicate_answers_ignored: 0,
        skipped_unmapped: 0,
        already_exists: 0
    },
    applied: { moved: 0, duplicates_removed: 0, created: 0, changed_since_preview: 0, batches: 0 },
    errors: [],
    warnings: [],
    unique_index: null,
    samples: { moved: [], created: [], skipped: [] }
});

const buildPlan = async (opts, onProgress) => {
    const summary = emptySummary(opts);

    const { rules, repairs, invalid } = await loadRules();
    summary.active_rules = rules.length;
    summary.rule_repairs = repairs;
    summary.rules_corrected = repairs.length;
    summary.invalid_rules = invalid;

    onProgress?.({ phase: "Reading existing Action Points…" });
    const rows = await loadOpenChecklistActionPoints(opts.storeId);
    summary.existing.open_checklist_action_points = rows.length;
    summary.other = await countOtherActionPoints(opts.storeId);

    const moves = planExistingActionPoints(rows, rules, summary);

    let creates = [];
    if (opts.includeMissing) {
        onProgress?.({ phase: "Looking for missing Action Points…" });
        creates = await scanMissing({
            rules,
            from: opts.from,
            to: opts.to,
            storeId: opts.storeId,
            summary,
            onPage: (evaluated) => onProgress?.({ phase: `Looking for missing Action Points… ${evaluated} answers checked` })
        });
        if (creates.length > LARGE_CREATE_WARNING) {
            summary.warnings.push(`${creates.length} answers match an issue-trigger answer in this period. Check the rule configuration in Issue Control Center before applying.`);
        }
    }

    // Reconciliation check: every open checklist Action Point is in
    // exactly one category.
    const e = summary.existing;
    const accounted = e.moved_to_reports + e.duplicates_removed + e.retained +
        e.skipped_no_rule + e.skipped_unmapped + e.skipped_in_progress;
    summary.existing.reconciled = accounted === e.open_checklist_action_points;
    if (!summary.existing.reconciled) {
        summary.warnings.push(`Counts do not reconcile (${accounted} categorised of ${e.open_checklist_action_points}).`);
    }

    return { summary, rules, repairs, moves, creates };
};

// ------------------------------------------------------
// APPLY
// ------------------------------------------------------
const UNTOUCHED_SQL = `
    LOWER(COALESCE(ap.status, 'Open')) = 'open'
    AND (ap.comment IS NULL OR TRIM(ap.comment) = '')
    AND ap.assigned_to IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM action_point_history h
        WHERE h.action_point_id = ap.id AND h.action_type <> 'CREATED'
    )
    AND NOT EXISTS (
        SELECT 1 FROM checklist_submission_answers a
        WHERE a.id = ap.submission_answer_id AND TRIM(COALESCE(a.action_taken, '')) <> ''
    )
`;

const refreshSubmissionStatuses = async (q, submissionIds) => {
    const ids = [...new Set(submissionIds.filter(Boolean).map(Number))];
    if (!ids.length) return;
    await q(`
        UPDATE checklist_submissions
        SET nso_status = CASE
            WHEN EXISTS (
                SELECT 1 FROM action_points o
                WHERE o.submission_id = checklist_submissions.id
                  AND LOWER(COALESCE(o.status, 'Open')) <> 'closed'
            ) THEN 'Open'
            ELSE 'Closed'
        END
        WHERE id IN (${placeholders(ids)})
    `, ids);
};

const audit = async (q, action, payload, userId) => {
    try {
        await q(`
            INSERT INTO audit_logs (module_name, reference_id, action, old_data, new_data, changed_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, ["Action Points", null, action, null, JSON.stringify(payload), userId || null]);
    } catch (error) {
        // Audit is best-effort; never block the reconciliation on it.
        console.warn("[Re-check] Audit log skipped:", error.message);
    }
};

const applyRuleRepairs = async (repairs, userId, summary) => {
    if (!repairs.length) {
        summary.rules_corrected = 0;
        return;
    }
    let corrected = 0;
    await withTransaction(async (q) => {
        for (const repair of repairs) {
            const result = await q(`
                UPDATE issue_control_rules
                SET issue_answer = ?
                WHERE id = ? AND issue_answer = ? AND expected_answer = ?
            `, [repair.to.issue_answer, repair.id, repair.from.issue_answer, repair.from.expected_answer]);
            corrected += Number(result?.affectedRows || 0);
        }
        await audit(q, "RECHECK_RULE_REPAIR", { repairs }, userId);
    });
    summary.rules_corrected = corrected;
};

const applyMoves = async (moves, userId, summary, progress) => {
    for (const batch of chunk(moves, MOVE_BATCH)) {
        const ids = batch.map((m) => m.id);
        const result = await withTransaction(async (q) => {
            const lockable = await q(`
                SELECT ap.id, ap.submission_id, ap.submission_answer_id
                FROM action_points ap
                WHERE ap.id IN (${placeholders(ids)})
                  AND ${UNTOUCHED_SQL}
                FOR UPDATE
            `, ids);
            const okIds = (lockable || []).map((r) => Number(r.id));
            if (okIds.length) {
                await q(`DELETE FROM action_points WHERE id IN (${placeholders(okIds)})`, okIds);
                await q(`DELETE FROM action_point_history WHERE action_point_id IN (${placeholders(okIds)})`, okIds);
                await refreshSubmissionStatuses(q, lockable.map((r) => r.submission_id));
                await audit(q, "RECHECK_MOVE_TO_REPORTS", {
                    action_point_ids: okIds,
                    answers: lockable.map((r) => ({ action_point_id: r.id, submission_answer_id: r.submission_answer_id }))
                }, userId);
            }
            return okIds;
        });

        const okSet = new Set(result);
        for (const m of batch) {
            if (!okSet.has(m.id)) summary.applied.changed_since_preview++;
            else if (m.kind === "duplicate") summary.applied.duplicates_removed++;
            else summary.applied.moved++;
        }
        summary.applied.batches++;
        progress(batch.length);
    }
};

const insertActionPoint = async (q, data) => {
    const columns = [
        "new_store_opening_id", "submission_id", "submission_answer_id", "rule_id", "store_id",
        "department_id", "question_id", "assigned_to", "priority", "sla_value", "sla_minutes",
        "status", "remarks", "comment", "attachment", "created_by"
    ];
    const values = (row) => columns.map((c) => (row[c] === undefined ? null : row[c]));

    const sql = `
        INSERT INTO action_points (${columns.join(", ")})
        SELECT ${placeholders(columns)}
        FROM (SELECT 1 AS one) guard
        WHERE NOT EXISTS (SELECT 1 FROM action_points x WHERE x.submission_answer_id = ?)
          AND NOT EXISTS (SELECT 1 FROM action_points y WHERE y.submission_id = ? AND y.question_id = ?)
    `;
    const guard = [data.submission_answer_id, data.submission_id, data.question_id];

    try {
        return await q(sql, [...values(data), ...guard]);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return { affectedRows: 0 };
        // Older databases: stale FK to nso_rules — keep the Action Point,
        // drop only the rule link (same as inspectionService).
        if (error.code === "ER_NO_REFERENCED_ROW_2" && /rule_id/i.test(String(error.sqlMessage || error.message || "")) && data.rule_id) {
            return q(sql, [...values({ ...data, rule_id: null }), ...guard]);
        }
        throw error;
    }
};

const applyCreates = async (creates, userId, summary, progress) => {
    for (const batch of chunk(creates, CREATE_BATCH)) {
        const createdIds = await withTransaction(async (q) => {
            const ids = [];
            for (const { row, rule } of batch) {
                const { actionPointData } = inspectionService.buildActionPointData(
                    { id: row.submission_id, store_id: row.store_id },
                    {
                        answer_id: row.id,
                        question_id: row.question_id,
                        remarks: row.remarks,
                        question_sla_value: row.question_sla_value,
                        question_sla_unit: row.question_sla_unit,
                        rule
                    },
                    userId
                );
                const result = await insertActionPoint(q, actionPointData);
                if (Number(result?.affectedRows || 0) === 1 && result.insertId) {
                    await q(`
                        INSERT INTO action_point_history
                            (action_point_id, action_type, status, comment, remarks, old_data, new_data, changed_by, changed_by_name)
                        VALUES (?, 'CREATED', 'Open', NULL, ?, NULL, ?, ?, NULL)
                    `, [result.insertId, actionPointData.remarks, JSON.stringify({ ...actionPointData, source: "Re-check" }), userId || null]);
                    ids.push(Number(result.insertId));
                } else {
                    summary.missing.already_exists++;
                }
            }
            if (ids.length) {
                await refreshSubmissionStatuses(q, batch.map((c) => c.row.submission_id));
                await audit(q, "RECHECK_CREATE_MISSING", { action_point_ids: ids }, userId);
            }
            return ids;
        });

        summary.applied.created += createdIds.length;
        summary.missing.created += createdIds.length;
        summary.applied.batches++;
        progress(batch.length);
    }
};

const ensureAnswerUniqueIndex = async () => {
    try {
        const existing = await db.query(`SHOW INDEX FROM action_points WHERE Key_name = 'uq_action_points_answer'`);
        if (existing && existing.length) return "exists";

        const duplicates = await db.query(`
            SELECT COUNT(*) AS c FROM (
                SELECT submission_answer_id
                FROM action_points
                WHERE submission_answer_id IS NOT NULL
                GROUP BY submission_answer_id
                HAVING COUNT(*) > 1
            ) d
        `);
        if (Number(duplicates?.[0]?.c || 0) > 0) return "skipped: duplicates still exist";

        await db.query(`ALTER TABLE action_points ADD UNIQUE INDEX uq_action_points_answer (submission_answer_id)`);
        return "created";
    } catch (error) {
        console.warn("[Re-check] Unique answer index not added:", error.message);
        return `not added: ${error.code || error.message}`;
    }
};

// ------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------
let applyRunning = false;

const preview = async (options = {}, onProgress) => {
    const opts = normalizeOptions(options);
    const { summary } = await buildPlan(opts, onProgress);
    summary.dry_run = true;
    return summary;
};

const apply = async (options = {}, { userId = null, onProgress } = {}) => {
    if (applyRunning) {
        const error = new Error("A re-check is already being applied. Please wait for it to finish.");
        error.status = 409;
        throw error;
    }
    applyRunning = true;

    const opts = normalizeOptions(options);
    let summary;

    try {
        const plan = await buildPlan(opts, onProgress);
        summary = plan.summary;
        summary.dry_run = false;

        const total = plan.moves.length + plan.creates.length;
        let processed = 0;
        const progress = (n) => {
            processed += n;
            onProgress?.({ phase: "Applying changes…", processed, total });
        };
        onProgress?.({ phase: "Applying changes…", processed: 0, total });

        try {
            await applyRuleRepairs(plan.repairs, userId, summary);
            await applyMoves(plan.moves, userId, summary, progress);
            await applyCreates(plan.creates, userId, summary, progress);
        } catch (error) {
            console.error("[Re-check] Apply stopped:", error);
            summary.errors.push({
                message: error.message || "Unknown error",
                code: error.code || null,
                detail: `${summary.applied.batches} batch(es) were committed before the error; the failing batch was rolled back. Running Re-check again is safe.`
            });
        }

        summary.unique_index = await ensureAnswerUniqueIndex();
        summary.after = await countOtherActionPoints(opts.storeId);
        const openRows = await db.query(`
            SELECT COUNT(*) AS c FROM action_points
            WHERE LOWER(COALESCE(status, 'Open')) <> 'closed'
              ${opts.storeId ? "AND store_id = ?" : ""}
        `, opts.storeId ? [opts.storeId] : []);
        summary.after.open_action_points = Number(openRows?.[0]?.c || 0);

        console.log(`[Re-check] Applied: moved ${summary.applied.moved}, duplicates ${summary.applied.duplicates_removed}, created ${summary.applied.created}, rules ${summary.rules_corrected}, errors ${summary.errors.length}.`);
        return summary;
    } finally {
        applyRunning = false;
    }
};

// Backwards-compatible entry point (old controller signature).
const reclassify = async ({ dryRun = true, userId = null, filters = {} } = {}) =>
    dryRun ? preview(filters) : apply(filters, { userId });

module.exports = {
    preview,
    apply,
    reclassify,
    MAX_RANGE_DAYS
};

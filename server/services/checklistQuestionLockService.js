// ======================================================
// CHECKLIST QUESTION LOCK (per store + per question)
// ------------------------------------------------------
// When an Opening / Closing checklist answer raises an Action Point,
// that SAME store may not answer that SAME question again until the
// Action Point is completed (status Closed). Everything else stays open:
//
//   • the other questions of the checklist  -> answerable
//   • the same question for other stores    -> answerable
//   • other checklist types                 -> not affected
//
// The lock is derived live from action_points (no extra table), so it is
// released automatically the moment the Action Point is completed, and it
// comes back automatically if the Action Point is re-opened. Nothing is
// deleted or overwritten: the original answer, submission, report and the
// completed Action Point all stay as they are.
//
// Enforced in two places:
//   1. GET /api/checklist-submissions/form-options/locked-questions
//      (the form disables the locked cards and explains why), and
//   2. POST /api/checklist-submissions (rejects a direct API request
//      that still sends an answer for a locked question).
// ======================================================

const db = require("../config/db");

// Only Opening / Closing checklists use the lock. Same name rule the
// submission time-window check uses (controllers/checklistSubmissionController).
const LOCKABLE_CHECKLIST_PATTERN = /(opening|closing)/i;

const LOCKED_MESSAGE = "This question is unavailable while its action point is unresolved.";

const isLockableChecklist = (checklistName) =>
    LOCKABLE_CHECKLIST_PATTERN.test(String(checklistName || ""));

const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Unresolved checklist Action Points of one store for one checklist type,
 * one entry per question (the newest Action Point wins).
 *
 * @returns {Promise<Array<{question_id:number, action_point_id:number, status:string,
 *   priority:string, raised_at:string, submission_id:number|null, submission_date:string|null}>>}
 */
const getLockedQuestions = async ({ storeId, checklistTypeId, checklistName = null, questionIds = null }) => {
    const store = toId(storeId);
    const type = toId(checklistTypeId);
    if (!store || !type) return [];

    let name = checklistName;
    if (name === null || name === undefined) {
        const typeRows = await db.query(
            `SELECT checklist_name FROM checklist_types WHERE id = ? LIMIT 1`,
            [type]
        );
        name = typeRows?.[0]?.checklist_name || "";
    }
    if (!isLockableChecklist(name)) return [];

    const params = [store, type];
    let questionFilter = "";
    if (Array.isArray(questionIds)) {
        const ids = [...new Set(questionIds.map(toId).filter(Boolean))];
        if (!ids.length) return [];
        questionFilter = ` AND ap.question_id IN (${ids.map(() => "?").join(", ")})`;
        params.push(...ids);
    }

    // Only checklist-raised Action Points lock a question (manual Action
    // Points without a checklist link never block a checklist).
    const rows = await db.query(
        `
        SELECT
            ap.id AS action_point_id,
            ap.question_id,
            ap.status,
            ap.priority,
            ap.created_at AS raised_at,
            ap.submission_id,
            cs.submission_date
        FROM action_points ap
        INNER JOIN questions q
            ON q.id = ap.question_id
        LEFT JOIN checklist_submissions cs
            ON cs.id = ap.submission_id
        WHERE ap.store_id = ?
          AND q.checklist_type_id = ?
          AND ap.question_id IS NOT NULL
          AND LOWER(COALESCE(ap.status, 'Open')) <> 'closed'
          AND (ap.submission_answer_id IS NOT NULL OR ap.submission_id IS NOT NULL)
          ${questionFilter}
        ORDER BY ap.created_at DESC, ap.id DESC
        `,
        params
    );

    const byQuestion = new Map();
    for (const row of rows || []) {
        const questionId = Number(row.question_id);
        if (byQuestion.has(questionId)) continue;
        byQuestion.set(questionId, {
            question_id: questionId,
            action_point_id: Number(row.action_point_id),
            status: row.status || "Open",
            priority: row.priority || "Medium",
            raised_at: row.raised_at || null,
            submission_id: row.submission_id ? Number(row.submission_id) : null,
            submission_date: row.submission_date || null,
            message: LOCKED_MESSAGE
        });
    }

    return [...byQuestion.values()];
};

/**
 * Throws a 409 error when any of the submitted answers targets a question
 * that is locked for this store. Used by the submission endpoint so the
 * restriction cannot be bypassed with a direct API call.
 */
const assertAnswersAllowed = async ({ storeId, checklistTypeId, checklistName, answers }) => {
    const questionIds = (Array.isArray(answers) ? answers : [])
        .map((item) => toId(item?.question_id))
        .filter(Boolean);

    if (!questionIds.length) return [];

    const locked = await getLockedQuestions({
        storeId,
        checklistTypeId,
        checklistName,
        questionIds
    });

    if (locked.length) {
        const error = new Error(
            locked.length === 1
                ? `${LOCKED_MESSAGE} Remove the answer for that question and submit again.`
                : `${locked.length} questions are unavailable while their action points are unresolved. Remove those answers and submit again.`
        );
        error.status = 409;
        error.code = "QUESTION_LOCKED";
        error.locked = locked;
        throw error;
    }

    return [];
};

// ------------------------------------------------------
// STORE ACCESS (same rule as /form-options/stores)
// A user may only read the lock list of a store they can submit for, so
// one store's open issues are never exposed to another store's users.
// ------------------------------------------------------
const canUserAccessStore = async (user, storeId) => {
    const store = toId(storeId);
    if (!store || !user?.id) return false;

    const filterAccess = require("../utils/filterAccess");
    const { getStoreScope } = require("./notificationAudience");

    if (filterAccess.isAdministrator(user)) return true;

    const scope = await getStoreScope(user.id);
    if (!scope.allStores) {
        const assigned = new Set((scope.storeIds || []).map(Number));
        if (!assigned.has(store)) return false;
    }

    const globals = await filterAccess.getGlobalPolicies(user.id);
    const globalStore = globals?.store || null;
    if (globalStore?.policy === "none") return false;
    if (globalStore?.policy === "selected") {
        return (globalStore.ids || []).map(Number).includes(store);
    }

    return true;
};

module.exports = {
    LOCKED_MESSAGE,
    LOCKABLE_CHECKLIST_PATTERN,
    isLockableChecklist,
    getLockedQuestions,
    assertAnswersAllowed,
    canUserAccessStore
};

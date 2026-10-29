// ======================================================
// COMPLETED ACTION POINTS — BUSINESS RULES
// ------------------------------------------------------
// View / Edit / Export / Delete / Delete All for Action Points that have
// reached the terminal status (Closed, shown as "Completed").
//
// Data-safety rules
//   • Edit changes only follow-up fields (priority, assigned to, remarks,
//     comment, action taken). Store, question, checklist, submission and
//     status linkage are never changed here.
//   • Delete / Delete All ARCHIVE the record (completed_archived_at). The
//     checklist submission, its answer, Checklist Reports' "Action
//     Completed" state, Gallery items and files on disk are untouched.
//   • Every change writes action_point_history + Audit inside a
//     transaction together with the row update.
// ======================================================

const db = require("../config/db");
const CompletedModel = require("../models/completedActionPointModel");
const ActionPoint = require("../models/actionPointModel");
const Activity = require("../models/activityModel");
const Audit = require("../models/auditModel");
const { withAttachments } = require("../utils/actionPointAttachments");

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const MAX_TEXT = 5000;

const httpError = (status, message, code) => {
    const error = new Error(message);
    error.statusCode = status;
    if (code) error.code = code;
    return error;
};

const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const asPromise = (fn, ...args) =>
    new Promise((resolve, reject) => {
        fn(...args, (err, result) => (err ? reject(err) : resolve(result)));
    });

const withTransaction = async (work) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("COMPLETED ACTION POINT ROLLBACK FAILED:", rollbackError.message);
        }
        throw error;
    } finally {
        connection.release();
    }
};

const historySql = `
    INSERT INTO action_point_history
        (action_point_id, action_type, status, comment, remarks, old_data, new_data, changed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const logActivity = (data) => Activity.create(data, () => {});
const logAudit = (data) => Audit.create(data, () => {});

// ------------------------------------------------------
// LIST
// ------------------------------------------------------
const list = async (filters) => {
    const [rows, total] = await Promise.all([
        CompletedModel.list(filters),
        CompletedModel.count(filters)
    ]);
    const limit = Number(filters.limit) || 10;
    return {
        rows: (rows || []).map(withAttachments),
        pagination: {
            page: Math.floor((Number(filters.offset) || 0) / limit) + 1,
            limit,
            total,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        }
    };
};

// ------------------------------------------------------
// VIEW (record + history)
// ------------------------------------------------------
const getById = async (id) => {
    const actionPointId = toId(id);
    if (!actionPointId) throw httpError(400, "Invalid Action Point id.");

    const row = await CompletedModel.getById(actionPointId);
    if (!row) throw httpError(404, "Completed Action Point not found.");

    const history = await asPromise(ActionPoint.getHistory, actionPointId);
    return { ...withAttachments(row), history: history || [] };
};

// ------------------------------------------------------
// EDIT (follow-up fields only)
// ------------------------------------------------------
const normalizeEdit = async (body = {}) => {
    const changes = {};

    if (body.priority !== undefined) {
        const priority = String(body.priority || "").trim();
        if (!PRIORITIES.includes(priority)) {
            throw httpError(400, `Priority must be one of: ${PRIORITIES.join(", ")}.`);
        }
        changes.priority = priority;
    }

    if (body.assigned_to !== undefined) {
        if (body.assigned_to === null || body.assigned_to === "") {
            changes.assigned_to = null;
        } else {
            const userId = toId(body.assigned_to);
            if (!userId) throw httpError(400, "Assigned To must be a valid user.");
            const users = await db.query(`SELECT id FROM users WHERE id = ? LIMIT 1`, [userId]);
            if (!users?.length) throw httpError(400, "Assigned To user was not found.");
            changes.assigned_to = userId;
        }
    }

    for (const field of ["remarks", "comment", "action_taken"]) {
        if (body[field] !== undefined) {
            const text = String(body[field] ?? "").trim();
            if (text.length > MAX_TEXT) {
                throw httpError(400, `${field.replace("_", " ")} is too long (max ${MAX_TEXT} characters).`);
            }
            changes[field] = text;
        }
    }

    if (changes.action_taken !== undefined && !changes.action_taken) {
        throw httpError(400, "Action Taken cannot be empty for a completed Action Point.");
    }

    // Lifecycle linkage is fixed on this page.
    for (const locked of ["store_id", "question_id", "submission_id", "submission_answer_id", "status", "checklist_type_id"]) {
        if (body[locked] !== undefined) {
            throw httpError(400, "Store, question, checklist and status cannot be changed for a completed Action Point.");
        }
    }

    return changes;
};

const update = async (id, body, userId) => {
    const actionPointId = toId(id);
    if (!actionPointId) throw httpError(400, "Invalid Action Point id.");

    const changes = await normalizeEdit(body);
    if (!Object.keys(changes).length) throw httpError(400, "Nothing to update.");

    const before = await CompletedModel.getById(actionPointId);
    if (!before) throw httpError(404, "Completed Action Point not found.");

    await withTransaction(async (connection) => {
        // Re-check inside the transaction: still completed and not archived.
        const [locked] = await connection.query(
            `SELECT id, submission_answer_id FROM action_points
             WHERE id = ? AND LOWER(COALESCE(status, 'Open')) = 'closed' AND completed_archived_at IS NULL
             FOR UPDATE`,
            [actionPointId]
        );
        if (!locked?.length) throw httpError(409, "This Action Point is no longer completed. Refresh and try again.");

        const sets = [];
        const values = [];
        for (const field of ["priority", "assigned_to", "remarks", "comment"]) {
            if (changes[field] !== undefined) {
                sets.push(`${field} = ?`);
                values.push(changes[field] === "" ? null : changes[field]);
            }
        }
        if (sets.length) {
            await connection.query(
                `UPDATE action_points SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [...values, actionPointId]
            );
        }

        // Resolution text lives on the originating checklist answer (that is
        // what Checklist Reports shows). Manual Action Points keep it in the
        // history entry below.
        const answerId = locked[0].submission_answer_id;
        if (changes.action_taken !== undefined && answerId) {
            await connection.query(
                `UPDATE checklist_submission_answers SET action_taken = ? WHERE id = ?`,
                [changes.action_taken, answerId]
            );
        }

        await connection.query(historySql, [
            actionPointId,
            changes.action_taken !== undefined ? "COMPLETED_EDITED" : "UPDATED",
            "Closed",
            changes.comment ?? before.comment ?? null,
            changes.remarks ?? before.remarks ?? null,
            JSON.stringify({
                priority: before.priority,
                assigned_to: before.assigned_to,
                remarks: before.remarks,
                comment: before.comment,
                action_taken: before.action_taken
            }),
            JSON.stringify({ ...changes, edited_from: "Completed Action Points" }),
            userId || null
        ]);
    });

    logAudit({
        module_name: "Action Points",
        reference_id: actionPointId,
        action: "COMPLETED_UPDATE",
        old_data: before,
        new_data: changes,
        changed_by: userId
    });

    logActivity({
        title: "Completed Action Point Updated",
        description: `Completed Action Point #${actionPointId} updated.`,
        module_name: "Action Points",
        status: "Closed",
        priority: changes.priority || before.priority || "Medium",
        created_by: userId,
        assigned_to: changes.assigned_to ?? before.assigned_to ?? null
    });

    return getById(actionPointId);
};

// ------------------------------------------------------
// ARCHIVE (Delete / Delete All)
// ------------------------------------------------------
const archiveIds = async (ids, userId, note) => {
    const clean = [...new Set((ids || []).map(toId).filter(Boolean))];
    if (!clean.length) return 0;

    return withTransaction(async (connection) => {
        let archived = 0;
        for (let i = 0; i < clean.length; i += 500) {
            const part = clean.slice(i, i + 500);
            const marks = part.map(() => "?").join(", ");

            // Lock + re-check the rows: only completed, not-yet-archived
            // records are touched.
            const [rows] = await connection.query(
                `SELECT id FROM action_points
                 WHERE id IN (${marks})
                   AND LOWER(COALESCE(status, 'Open')) = 'closed'
                   AND completed_archived_at IS NULL
                 FOR UPDATE`,
                part
            );
            const target = (rows || []).map((row) => Number(row.id));
            if (!target.length) continue;
            const targetMarks = target.map(() => "?").join(", ");

            const [result] = await connection.query(
                `UPDATE action_points
                 SET completed_archived_at = CURRENT_TIMESTAMP,
                     completed_archived_by = ?
                 WHERE id IN (${targetMarks})`,
                [userId || null, ...target]
            );
            archived += Number(result?.affectedRows || 0);

            await connection.query(
                `INSERT INTO action_point_history
                    (action_point_id, action_type, status, comment, new_data, changed_by)
                 SELECT id, 'ARCHIVED', 'Closed', ?, ?, ?
                 FROM action_points
                 WHERE id IN (${targetMarks})`,
                [note, JSON.stringify({ archived_from: "Completed Action Points" }), userId || null, ...target]
            );
        }
        return archived;
    });
};

const remove = async (id, userId) => {
    const actionPointId = toId(id);
    if (!actionPointId) throw httpError(400, "Invalid Action Point id.");

    const before = await CompletedModel.getById(actionPointId);
    if (!before) throw httpError(404, "Completed Action Point not found.");

    const archived = await archiveIds([actionPointId], userId, "Deleted from Completed Action Points");
    if (!archived) throw httpError(409, "This record was already removed. Refresh and try again.");

    logAudit({
        module_name: "Action Points",
        reference_id: actionPointId,
        action: "COMPLETED_DELETE",
        old_data: before,
        new_data: { archived: true },
        changed_by: userId
    });

    logActivity({
        title: "Completed Action Point Deleted",
        description: `Completed Action Point #${actionPointId} removed from Completed Action Points. The checklist report is unchanged.`,
        module_name: "Action Points",
        status: "Closed",
        priority: before.priority || "Medium",
        created_by: userId,
        assigned_to: before.assigned_to || null
    });

    return {
        success: true,
        deleted: 1,
        message: "Completed Action Point deleted. The original checklist answer stays in Checklist Reports."
    };
};

/**
 * Delete All / Delete Filtered. `expectedCount` is the number the user
 * confirmed in the dialog; if the matching set changed meanwhile the
 * request is refused instead of deleting a different number of records.
 */
const removeAll = async (filters, expectedCount, userId) => {
    const ids = await CompletedModel.ids(filters);
    const expected = Number(expectedCount);

    if (!Number.isInteger(expected) || expected < 0) {
        throw httpError(400, "Confirmation count is required for Delete All.", "CONFIRM_COUNT_REQUIRED");
    }

    if (expected !== ids.length) {
        throw httpError(
            409,
            `The number of matching completed records changed (${ids.length} now, ${expected} confirmed). Refresh and try again.`,
            "CONFIRM_COUNT_MISMATCH"
        );
    }

    if (!ids.length) {
        return { success: true, deleted: 0, message: "No completed Action Points to delete." };
    }

    const filtered = Boolean(filters.__filtered);
    const archived = await archiveIds(
        ids,
        userId,
        filtered ? "Deleted (filtered) from Completed Action Points" : "Deleted (all) from Completed Action Points"
    );

    logAudit({
        module_name: "Action Points",
        reference_id: null,
        action: filtered ? "COMPLETED_DELETE_FILTERED" : "COMPLETED_DELETE_ALL",
        old_data: null,
        new_data: { archived, ids_count: ids.length },
        changed_by: userId
    });

    logActivity({
        title: filtered ? "Filtered Completed Action Points Deleted" : "All Completed Action Points Deleted",
        description: `${archived} completed Action Point(s) removed from Completed Action Points. Checklist Reports are unchanged.`,
        module_name: "Action Points",
        status: "Closed",
        priority: "High",
        created_by: userId,
        assigned_to: null
    });

    return {
        success: true,
        deleted: archived,
        message: `${archived} completed Action Point(s) deleted. Original checklist answers stay in Checklist Reports.`
    };
};

// ------------------------------------------------------
// EXPORT
// ------------------------------------------------------
const exportRows = async (filters) => {
    const rows = await CompletedModel.list({ ...filters, offset: 0, limit: 100000 });
    return (rows || []).map((raw) => {
        const row = withAttachments(raw);
        return {
            id: row.id,
            store_name: row.store_name || "",
            city: row.city || "",
            state: row.state || "",
            checklist_type: row.checklist_kind || "",
            checklist_name: row.checklist_name || "",
            question: row.question || "",
            answer: row.answer || "",
            department_name: row.department_name || "",
            priority: row.priority || "",
            final_status: "Completed",
            submission_date: row.submission_date || "",
            created_at: row.created_at || "",
            completed_at: row.completed_at || "",
            completed_by: row.completed_by || "",
            assigned_to: row.assigned_to_name || "",
            submitted_by: row.submitted_by || "",
            action_taken: row.action_taken || "",
            remarks: row.remarks || "",
            comment: row.comment || "",
            attachment_count: row.attachment_count,
            attachment_reference: row.attachments.map((item) => item.path).join(" | ")
        };
    });
};

const EXPORT_FIELDS = [
    "id",
    "store_name",
    "city",
    "state",
    "checklist_type",
    "checklist_name",
    "question",
    "answer",
    "department_name",
    "priority",
    "final_status",
    "submission_date",
    "created_at",
    "completed_at",
    "completed_by",
    "assigned_to",
    "submitted_by",
    "action_taken",
    "remarks",
    "comment",
    "attachment_count",
    "attachment_reference"
];

module.exports = {
    PRIORITIES,
    EXPORT_FIELDS,
    list,
    getById,
    update,
    remove,
    removeAll,
    exportRows,
    normalizeEdit
};

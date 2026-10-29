// ======================================================
// COMPLETED ACTION POINTS — DATA ACCESS
// ------------------------------------------------------
// A completed Action Point is an action_points row with status 'Closed'
// (shown as "Completed") that has not been archived from this module.
// The same row keeps backing Checklist Reports, so nothing here ever
// deletes the checklist submission, its answer, or a shared attachment.
// ======================================================

const db = require("../config/db");
const ActionPoint = require("./actionPointModel");

const COMPLETED_SQL = `
    LOWER(COALESCE(ap.status, 'Open')) = 'closed'
    AND ap.completed_archived_at IS NULL
`;

// Completion date shown / filtered on. Legacy rows closed before
// completed_at existed fall back to their last update.
const COMPLETED_AT_SQL = "COALESCE(ap.completed_at, ap.updated_at)";

// Opening / Closing / Other — from the checklist type name.
const CHECKLIST_KIND_SQL = `(
    CASE
        WHEN LOWER(COALESCE(ct.checklist_name, '')) LIKE '%opening%' THEN 'Opening'
        WHEN LOWER(COALESCE(ct.checklist_name, '')) LIKE '%closing%' THEN 'Closing'
        WHEN ct.checklist_name IS NULL THEN 'Manual'
        ELSE 'Other'
    END
)`;

// Who completed it: the newest completion entry in the history.
const COMPLETED_BY_SQL = `(
    SELECT COALESCE(cu.name, ch.changed_by_name)
    FROM action_point_history ch
    LEFT JOIN users cu ON cu.id = ch.changed_by
    WHERE ch.action_point_id = ap.id
      AND (ch.action_type = 'COMPLETED' OR ch.status = 'Closed')
      -- later edits / archiving on the Completed page are not "completion"
      AND ch.action_type NOT IN ('UPDATED', 'COMPLETED_EDITED', 'ARCHIVED')
    ORDER BY ch.created_at DESC, ch.id DESC
    LIMIT 1
)`;

// What was done: the checklist answer's action_taken (set by Take Action),
// else the action_taken recorded in the completion history entry (manual
// Action Points have no checklist answer).
const ACTION_TAKEN_SQL = `COALESCE(
    NULLIF(csa.action_taken, ''),
    (
        SELECT JSON_UNQUOTE(JSON_EXTRACT(th.new_data, '$.action_taken'))
        FROM action_point_history th
        WHERE th.action_point_id = ap.id
          AND th.action_type IN ('COMPLETED', 'COMPLETED_EDITED')
          AND th.new_data IS NOT NULL
        ORDER BY th.created_at DESC, th.id DESC
        LIMIT 1
    )
)`;

const FROM_SQL = `
    FROM action_points ap
    INNER JOIN stores s
        ON s.id = ap.store_id
    LEFT JOIN checklist_submissions cs
        ON cs.id = ap.submission_id
    LEFT JOIN checklist_submission_answers csa
        ON csa.id = ap.submission_answer_id
    LEFT JOIN questions q
        ON q.id = ap.question_id
    LEFT JOIN checklist_types ct
        ON ct.id = q.checklist_type_id
    LEFT JOIN departments d
        ON d.id = ap.department_id
    LEFT JOIN users u
        ON u.id = cs.submitted_by
    LEFT JOIN users au
        ON au.id = ap.assigned_to
`;

const SELECT_SQL = `
    SELECT
        ap.id,
        ap.submission_id,
        ap.submission_answer_id,
        ap.store_id,
        ap.department_id,
        ap.question_id,
        ap.assigned_to,
        ap.priority,
        ap.sla_value,
        ap.sla_value AS sla_days,
        ap.sla_minutes,
        ap.status,
        'Completed' AS status_label,
        ap.remarks,
        ap.comment,
        ap.attachment,
        ap.action_photos,
        csa.photos AS answer_photos,
        cs.attachment AS submission_attachment,
        ap.created_at,
        ${COMPLETED_AT_SQL} AS completed_at,
        ap.updated_at,
        COALESCE(cs.submission_date, DATE(ap.created_at)) AS submission_date,
        s.store_name,
        s.city,
        s.state,
        ct.id AS checklist_type_id,
        ct.checklist_name,
        ${CHECKLIST_KIND_SQL} AS checklist_kind,
        q.question,
        csa.answer,
        csa.remarks AS answer_remarks,
        csa.action_remarks,
        ${ACTION_TAKEN_SQL} AS action_taken,
        u.name AS submitted_by,
        u.employee_id AS submitted_by_employee_id,
        au.name AS assigned_to_name,
        ${COMPLETED_BY_SQL} AS completed_by,
        COALESCE(
            d.department_name,
            (
                SELECT GROUP_CONCAT(DISTINCT dn_d.department_name ORDER BY dn_d.department_name SEPARATOR ', ')
                FROM question_departments dn_qd
                INNER JOIN departments dn_d ON dn_d.id = dn_qd.department_id
                WHERE dn_qd.question_id = ap.question_id
            )
        ) AS department_name
`;

const SEARCH_COLUMNS = [
    "s.store_name",
    "s.city",
    "s.state",
    "ct.checklist_name",
    "q.question",
    "csa.answer",
    "csa.action_taken",
    "u.name",
    "au.name",
    "d.department_name",
    "ap.priority",
    "ap.remarks",
    "ap.comment"
];

/**
 * WHERE clause for the list / count / export / delete-all selection.
 * Every filter mirrors the Action Points page, plus the user's Filter
 * Access scope (filters.scope_sql) and the submitter's designation.
 */
const buildWhere = (filters = {}) => {
    const values = [];
    let sql = ` WHERE ${COMPLETED_SQL} `;

    if (filters.store_id) {
        sql += " AND ap.store_id = ? ";
        values.push(Number(filters.store_id));
    }

    if (filters.department_id) {
        sql += ActionPoint.departmentFilterSql(Number(filters.department_id), values);
    }

    if (filters.checklist_type_id) {
        sql += " AND q.checklist_type_id = ? ";
        values.push(Number(filters.checklist_type_id));
    }

    if (filters.checklist_kind) {
        sql += ` AND ${CHECKLIST_KIND_SQL} = ? `;
        values.push(String(filters.checklist_kind));
    }

    if (filters.priority) {
        sql += " AND ap.priority = ? ";
        values.push(String(filters.priority));
    }

    // Date range = completion date.
    if (filters.start_date) {
        sql += ` AND DATE(${COMPLETED_AT_SQL}) >= ? `;
        values.push(filters.start_date);
    }

    if (filters.end_date) {
        sql += ` AND DATE(${COMPLETED_AT_SQL}) <= ? `;
        values.push(filters.end_date);
    }

    if (filters.search) {
        sql += ` AND (${SEARCH_COLUMNS.map((column) => `${column} LIKE ?`).join(" OR ")}) `;
        const keyword = `%${filters.search}%`;
        values.push(...SEARCH_COLUMNS.map(() => keyword));
    }

    if (Array.isArray(filters.ids)) {
        const ids = filters.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
        if (!ids.length) {
            sql += " AND 1 = 0 ";
        } else {
            sql += ` AND ap.id IN (${ids.map(() => "?").join(", ")}) `;
            values.push(...ids);
        }
    }

    // Designation of the submitter + Filter Access scope (same helper as
    // the Action Points list, so both pages narrow identically).
    sql += ActionPoint.accessFilterSql(filters, values);

    return { sql, values };
};

const CompletedActionPoint = {
    COMPLETED_SQL,

    buildWhere,

    async list(filters = {}) {
        const { sql, values } = buildWhere(filters);
        const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100000);
        const offset = Math.max(Number(filters.offset) || 0, 0);

        return db.query(
            `${SELECT_SQL}
             ${FROM_SQL}
             ${sql}
             ORDER BY ${COMPLETED_AT_SQL} DESC, ap.id DESC
             LIMIT ?, ?`,
            [...values, offset, limit]
        );
    },

    async count(filters = {}) {
        const { sql, values } = buildWhere(filters);
        const rows = await db.query(
            `SELECT COUNT(DISTINCT ap.id) AS total ${FROM_SQL} ${sql}`,
            values
        );
        return Number(rows?.[0]?.total || 0);
    },

    async ids(filters = {}) {
        const { sql, values } = buildWhere(filters);
        const rows = await db.query(
            `SELECT DISTINCT ap.id ${FROM_SQL} ${sql} ORDER BY ap.id ASC`,
            values
        );
        return (rows || []).map((row) => Number(row.id));
    },

    async getById(id) {
        const rows = await db.query(
            `${SELECT_SQL}
             ${FROM_SQL}
             WHERE ap.id = ?
               AND ${COMPLETED_SQL}
             LIMIT 1`,
            [Number(id)]
        );
        return rows?.[0] || null;
    }
};

module.exports = CompletedActionPoint;

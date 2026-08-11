const db = require("../config/db");

const NSOTracking = {};

// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

NSOTracking.getAll = (filters = {}, callback) => {

    let sql = `
        SELECT
            nt.id,
            nt.new_store_opening_id,
            nt.rule_id,
            nt.department_id,
            nt.trigger_column,
            nt.status,
            nso.status AS nso_status,
            nt.due_date,
            nt.remarks,
            nt.created_by,
            nt.updated_by,
            nt.created_at,
            nt.updated_at
        FROM nso_tracking nt
        LEFT JOIN new_store_openings nso
            ON nso.id = nt.new_store_opening_id
        WHERE 1 = 1
    `;

    const values = [];

    // ==================================================
    // SEARCH
    // ==================================================

    if (filters.search && filters.search.trim() !== "") {

        sql += `
            AND (
                trigger_column LIKE ?
                OR status LIKE ?
                OR remarks LIKE ?
            )
        `;

        const key = `%${filters.search.trim()}%`;

        values.push(
            key,
            key,
            key
        );
    }

    // ==================================================
    // PAGINATION
    // ==================================================

    const offset = Number.isInteger(Number(filters.offset))
        ? Number(filters.offset)
        : 0;

    const limit = Number.isInteger(Number(filters.limit))
        ? Number(filters.limit)
        : 10;

    sql += `
        ORDER BY id DESC
        LIMIT ?, ?
    `;

    values.push(
        offset,
        limit
    );

    db.query(
        sql,
        values,
        callback
    );
};


// ======================================================
// COUNT NSO TRACKING
// ======================================================

NSOTracking.count = (filters = {}, callback) => {

    let sql = `
        SELECT
            COUNT(*) AS total
        FROM nso_tracking
        WHERE 1 = 1
    `;

    const values = [];

    // ==================================================
    // SEARCH
    // ==================================================

    if (filters.search && filters.search.trim() !== "") {

        sql += `
            AND (
                trigger_column LIKE ?
                OR status LIKE ?
                OR remarks LIKE ?
            )
        `;

        const key = `%${filters.search.trim()}%`;

        values.push(
            key,
            key,
            key
        );
    }

    db.query(
        sql,
        values,
        callback
    );
};


// ======================================================
// CREATE TRACKING
// ======================================================

NSOTracking.create = (data = {}, callback) => {

    const sql = `
        INSERT INTO nso_tracking
        (
            new_store_opening_id,
            rule_id,
            department_id,
            trigger_column,
            status,
            due_date,
            remarks,
            created_by,
            updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [

        // New Store Opening
        data.new_store_opening_id ?? null,

        // Rule
        data.rule_id ?? null,

        // Department
        data.department_id ?? null,

        // Trigger Column
        data.trigger_column ?? null,

        // Status
        data.status ?? "Pending",

        // Due Date
        data.due_date ?? null,

        // Remarks
        data.remarks ?? null,

        // Created By
        data.created_by ?? null,

        // Updated By
        data.updated_by ?? data.created_by ?? null
    ];

    db.query(
        sql,
        values,
        callback
    );
};



// ======================================================
// GET PROJECT SUMMARY
// ======================================================

NSOTracking.getProjectSummary = (projectId, callback) => {

    const sql = `
        SELECT
            nso.id AS new_store_opening_id,
            nso.location,
            nso.city,
            nso.status AS nso_status,
            COUNT(DISTINCT cs.id) AS checklist_count,
            COALESCE(AVG(cs.inspection_score), 0) AS average_score,
            COUNT(DISTINCT CASE WHEN ap.status NOT IN ('Completed', 'Closed') THEN ap.id END) AS open_action_points,
            COUNT(DISTINCT CASE WHEN ap.due_date IS NOT NULL AND ap.due_date < CURDATE() AND ap.status NOT IN ('Completed', 'Closed') THEN ap.id END) AS overdue_action_points,
            COUNT(DISTINCT a.id) AS activity_count
        FROM new_store_openings nso
        LEFT JOIN checklist_submissions cs
            ON cs.new_store_opening_id = nso.id
        LEFT JOIN action_points ap
            ON ap.new_store_opening_id = nso.id
        LEFT JOIN activities a
            ON a.module_name = 'New Store Openings' AND a.reference_id = nso.id
        WHERE nso.id = ?
        GROUP BY nso.id, nso.location, nso.city, nso.status
    `;

    db.query(sql, [projectId], callback);
};

// ======================================================
// GET TRACKING BY ID
// ======================================================

NSOTracking.getById = (id, callback) => {

    const sql = `
        SELECT
            nt.id,
            nt.new_store_opening_id,
            nt.rule_id,
            nt.department_id,
            nt.trigger_column,
            nt.status,
            nso.status AS nso_status,
            nt.due_date,
            nt.remarks,
            nt.created_by,
            nt.updated_by,
            nt.created_at,
            nt.updated_at
        FROM nso_tracking nt
        LEFT JOIN new_store_openings nso
            ON nso.id = nt.new_store_opening_id
        WHERE nt.id = ?
    `;

    db.query(
        sql,
        [id],
        callback
    );
};


// ======================================================
// GET TRACKING BY NEW STORE OPENING ID
// ======================================================

NSOTracking.getByStoreOpening = (id, callback) => {

    const sql = `
        SELECT
            id,
            new_store_opening_id,
            rule_id,
            department_id,
            trigger_column,
            status,
            due_date,
            remarks,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM nso_tracking
        WHERE new_store_opening_id = ?
        ORDER BY id DESC
    `;

    db.query(
        sql,
        [id],
        callback
    );
};


// ======================================================
// UPDATE TRACKING
// ======================================================

NSOTracking.update = (id, data = {}, callback) => {

    const sql = `
        UPDATE nso_tracking
        SET
            rule_id = ?,
            department_id = ?,
            trigger_column = ?,
            status = ?,
            due_date = ?,
            remarks = ?,
            updated_by = ?
        WHERE id = ?
    `;

    const values = [

        // Rule
        data.rule_id ?? null,

        // Department
        data.department_id ?? null,

        // Trigger Column
        data.trigger_column ?? null,

        // Status
        data.status ?? "Pending",

        // Due Date
        data.due_date ?? null,

        // Remarks
        data.remarks ?? null,

        // Updated By
        data.updated_by ?? null,

        // Tracking ID
        id
    ];

    db.query(
        sql,
        values,
        callback
    );
};


// ======================================================
// UPDATE TRACKING STATUS
// ======================================================

NSOTracking.updateStatus = (
    id,
    status,
    updatedBy,
    callback
) => {

    // ==================================================
    // BACKWARD COMPATIBILITY
    //
    // Old call:
    // updateStatus(id, status, callback)
    //
    // New call:
    // updateStatus(id, status, userId, callback)
    // ==================================================

    if (typeof updatedBy === "function") {

        callback = updatedBy;
        updatedBy = null;
    }

    const sql = `
        UPDATE nso_tracking
        SET
            status = ?,
            updated_by = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            status ?? "Pending",
            updatedBy ?? null,
            id
        ],
        callback
    );
};


// ======================================================
// DELETE TRACKING
// ======================================================

NSOTracking.delete = (id, callback) => {

    const sql = `
        DELETE FROM nso_tracking
        WHERE id = ?
    `;

    db.query(
        sql,
        [id],
        callback
    );
};


// ======================================================
// DELETE ALL TRACKING
// ======================================================

NSOTracking.deleteAll = (callback) => {

    const sql = `
        DELETE FROM nso_tracking
    `;

    db.query(
        sql,
        callback
    );
};


// ======================================================
// EXPORT TRACKING
// ======================================================

NSOTracking.export = (callback) => {

    const sql = `
        SELECT
            id,
            new_store_opening_id,
            rule_id,
            department_id,
            trigger_column,
            status,
            due_date,
            remarks,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM nso_tracking
        ORDER BY id DESC
    `;

    db.query(
        sql,
        callback
    );
};


// ======================================================
// GET TRACKING BY STATUS
// ======================================================

NSOTracking.getByStatus = (status, callback) => {

    const sql = `
        SELECT
            id,
            new_store_opening_id,
            rule_id,
            department_id,
            trigger_column,
            status,
            due_date,
            remarks,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM nso_tracking
        WHERE status = ?
        ORDER BY id DESC
    `;

    db.query(
        sql,
        [status],
        callback
    );
};


// ======================================================
// GET TRACKING BY USER
// ======================================================

NSOTracking.getByUser = (userId, callback) => {

    const sql = `
        SELECT
            id,
            new_store_opening_id,
            rule_id,
            department_id,
            trigger_column,
            status,
            due_date,
            remarks,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM nso_tracking
        WHERE
            created_by = ?
            OR updated_by = ?
        ORDER BY id DESC
    `;

    db.query(
        sql,
        [
            userId,
            userId
        ],
        callback
    );
};


// ======================================================
// MODULE EXPORTS
// ======================================================

module.exports = NSOTracking;
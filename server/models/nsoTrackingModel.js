const db = require("../config/db");

const NSOTracking = {};

// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

NSOTracking.getAll = (filters = {}, callback) => {

    let sql = `
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
// GET TRACKING BY ID
// ======================================================

NSOTracking.getById = (id, callback) => {

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
        WHERE id = ?
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
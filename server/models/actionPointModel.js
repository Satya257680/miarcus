const db = require("../config/db");

// ================= Get All Action Points =================

const getAllActionPoints = (callback) => {

    const sql = `
        SELECT
            ap.*,
            s.store_name,
            s.store_code
        FROM action_points ap
        LEFT JOIN stores s
        ON ap.store_id = s.id
        ORDER BY ap.created_at DESC
    `;

    db.query(sql, callback);

};

// ================= Create Action Point =================

const createActionPoint = (data, callback) => {

    const sql = `
        INSERT INTO action_points
        (
            store_id,
            department,
            question,
            sla_value,
            sla_type,
            answer,
            comment,
            attachment,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            data.store_id,
            data.department,
            data.question,
            data.sla_value,
            data.sla_type,
            data.answer,
            data.comment,
            data.attachment,
            "No Action Taken"
        ],
        callback
    );

};

module.exports = {
    getAllActionPoints,
    createActionPoint,
};
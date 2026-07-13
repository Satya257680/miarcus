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

    db.query(sql, (err, result) => {

        if (err) {
            console.log("GET ACTION POINTS ERROR:");
            console.log(err);
            return callback(err);
        }

        callback(null, result);

    });

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

    const values = [
        data.store_id,
        data.department,
        data.question,
        data.sla_value,
        data.sla_type,
        data.answer || "",
        data.comment || "",
        data.attachment || "",
        "No Action Taken"
    ];

    console.log("==================================");
    console.log("INSERT SQL");
    console.log(sql);
    console.log("VALUES");
    console.log(values);
    console.log("==================================");

    db.query(sql, values, (err, result) => {

        if (err) {

            console.log("========== MYSQL ERROR ==========");
            console.log(err);
            console.log("=================================");

            return callback(err);

        }

        console.log("========== INSERT SUCCESS ==========");
        console.log(result);
        console.log("====================================");

        callback(null, result);

    });

};

module.exports = {
    getAllActionPoints,
    createActionPoint,
};
const db = require("../config/db");

const logActivity = (activity, callback = () => {}) => {

    const sql = `
        INSERT INTO activities
        (
            activity_type,
            reference_id,
            title,
            description,
            module_name,
            status,
            priority,
            created_by,
            assigned_to
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            activity.activity_type,
            activity.reference_id,
            activity.title,
            activity.description,
            activity.module_name,
            activity.status || "Open",
            activity.priority || "Medium",
            activity.created_by,
            activity.assigned_to
        ],
        callback
    );
};

module.exports = {
    logActivity
};
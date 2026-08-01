const db = require("../config/db");

// ======================================================
// LOG ACTIVITY
// ======================================================

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

        (err, result) => {

            if (err) {

                return callback(err);

            }

            const activityId = result.insertId;

            // ==========================================
            // CREATE TIMELINE ENTRY
            // ==========================================

            const timelineSql = `
                INSERT INTO activity_timeline
                (
                    activity_id,
                    event_type,
                    event_description,
                    created_by
                )
                VALUES (?, ?, ?, ?)
            `;

            db.query(

                timelineSql,

                [

                    activityId,

                    activity.title,

                    activity.description,

                    activity.created_by

                ]

            );

            // ==========================================
            // CREATE NOTIFICATION
            // ==========================================

            if (activity.assigned_to) {

                const notificationSql = `
                    INSERT INTO activity_notifications
                    (
                        activity_id,
                        user_id,
                        message
                    )
                    VALUES (?, ?, ?)
                `;

                db.query(

                    notificationSql,

                    [

                        activityId,

                        activity.assigned_to,

                        activity.description

                    ]

                );

            }

            callback(null, result);

        }

    );

};

module.exports = {

    logActivity

};
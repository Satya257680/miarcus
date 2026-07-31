const db = require("../config/db");

const Dashboard = {};

// ======================================================
// GET DASHBOARD STATISTICS
// ======================================================

Dashboard.getStats = (callback) => {

    const sql = `

        SELECT

            (SELECT COUNT(*) FROM users) AS totalUsers,

            (SELECT COUNT(*) FROM stores) AS totalStores,

            (SELECT COUNT(*) FROM checklist_submissions) AS totalChecklists,

            (

                SELECT COUNT(*)

                FROM checklist_submission_answers

                WHERE answer IS NULL

                   OR answer = ''

            ) AS pendingActionPoints

    `;

    db.query(sql, callback);

};

// ======================================================
// GET RECENT ACTIVITIES
// ======================================================

Dashboard.getRecentActivities = (callback) => {

    const sql = `

        SELECT *

        FROM (

            SELECT

                'User' AS type,

                CONCAT(name, ' was added') AS activity,

                created_at

            FROM users

            UNION ALL

            SELECT

                'Store' AS type,

                CONCAT(store_name, ' store was created') AS activity,

                created_at

            FROM stores

            UNION ALL

            SELECT

                'Checklist' AS type,

                CONCAT('Checklist submitted (Submission #', id, ')') AS activity,

                created_at

            FROM checklist_submissions

            UNION ALL

            SELECT

                'New Store Opening' AS type,

                CONCAT(location, ', ', city, ' was created') AS activity,

                created_at

            FROM new_store_openings

        ) AS recent_activities

        ORDER BY created_at DESC

        LIMIT 10

    `;

    db.query(sql, callback);

};

module.exports = Dashboard;
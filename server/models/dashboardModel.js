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

module.exports = Dashboard;
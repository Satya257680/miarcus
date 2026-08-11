const db = require("../config/db");


const Dashboard = {};




// ======================================================
// GET DASHBOARD STATISTICS
// ======================================================


Dashboard.getStats = (callback) => {


    const sql = `


    SELECT



        (

            SELECT COUNT(*)

            FROM users

        ) AS totalUsers,




        (

            SELECT COUNT(*)

            FROM stores

        ) AS totalStores,





        (

            SELECT COUNT(*)

            FROM checklist_submissions

        ) AS totalChecklists,






        (

            SELECT COUNT(*)

            FROM checklist_submission_answers

            WHERE 

                answer IS NULL

                OR answer = ''

        ) AS pendingActionPoints,







        (

            SELECT COUNT(*)

            FROM action_points

        ) AS totalActionPoints,







        (

            SELECT COUNT(*)

            FROM new_store_openings

        ) AS totalNewStoreOpenings,







        (
            SELECT COUNT(*)
            FROM nso_rules
        ) AS totalNSORules,

        (
            SELECT COUNT(*)
            FROM new_store_openings
            WHERE status = 'On Hold'
        ) AS onHoldNSO,

        (
            SELECT COUNT(*)
            FROM new_store_openings
            WHERE status = 'Ready For Opening'
        ) AS readyForOpeningNSO,

        (
            SELECT COUNT(*)
            FROM new_store_openings
            WHERE status = 'Opened'
        ) AS openedNSO,

        (
            SELECT COUNT(*)
            FROM action_points
            WHERE status IN ('Open', 'Pending', 'In Progress')
        ) AS openActionPoints,

        (
            SELECT COUNT(*)
            FROM action_points
            WHERE due_date IS NOT NULL
              AND due_date < CURDATE()
              AND status NOT IN ('Completed', 'Closed')
        ) AS overdueActionPoints





    `;




    db.query(

        sql,

        callback

    );



};











// ======================================================
// GET RECENT ACTIVITIES
// ======================================================


Dashboard.getRecentActivities = (callback) => {

    const sql = `
        SELECT
            a.activity_type AS type,
            a.title,
            a.description AS activity,
            a.module_name,
            a.reference_id,
            nso.location AS nso_location,
            nso.city AS nso_city,
            nso.status AS nso_status,
            a.created_at
        FROM activities a
        LEFT JOIN new_store_openings nso
            ON a.module_name = 'New Store Openings'
            AND nso.id = a.reference_id
        ORDER BY a.created_at DESC
        LIMIT 10
    `;

    db.query(sql, callback);

};




// ======================================================
// GET CHECKLIST SUMMARY
// ======================================================


Dashboard.getChecklistSummary = (callback)=>{


    const sql = `


    SELECT


        status,


        COUNT(*) AS total



    FROM checklist_submissions



    GROUP BY status



    `;




    db.query(

        sql,

        callback

    );


};







// ======================================================
// GET ACTION POINT SUMMARY
// ======================================================


Dashboard.getActionPointSummary = (callback)=>{


    const sql = `



    SELECT



        CASE



            WHEN answer IS NULL

            OR answer = ''


            THEN 'Pending'



            ELSE 'Completed'



        END AS status,



        COUNT(*) AS total



    FROM checklist_submission_answers



    GROUP BY status



    `;



    db.query(

        sql,

        callback

    );


};








// ======================================================
// GET NSO BUSINESS SUMMARY
// ======================================================

Dashboard.getNSOSummary = (callback) => {

    const sql = `
        SELECT
            COUNT(*) AS total,
            SUM(status = 'Planning') AS planning,
            SUM(status = 'Layout Pending') AS layout_pending,
            SUM(status = 'Approval Pending') AS approval_pending,
            SUM(status = 'Construction') AS construction,
            SUM(status = 'Training') AS training,
            SUM(status = 'Ready For Opening') AS ready_for_opening,
            SUM(status = 'Opened') AS opened,
            SUM(status = 'Completed') AS completed,
            SUM(status = 'On Hold') AS on_hold,
            SUM(status = 'Cancelled') AS cancelled
        FROM new_store_openings
    `;

    db.query(sql, callback);
};


// ======================================================
// EXPORT MODEL
// ======================================================


module.exports = Dashboard;
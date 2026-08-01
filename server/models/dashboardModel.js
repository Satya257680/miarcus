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

        ) AS totalNSORules





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



    SELECT *



    FROM (







        SELECT


            'User' AS type,



            CONCAT(

                name,

                ' was added'

            ) AS activity,



            created_at



        FROM users







        UNION ALL








        SELECT


            'Store' AS type,



            CONCAT(

                store_name,

                ' store was created'

            ) AS activity,



            created_at



        FROM stores







        UNION ALL








        SELECT


            'Checklist' AS type,



            CONCAT(

                'Checklist submitted (Submission #',

                id,

                ')'

            ) AS activity,



            created_at



        FROM checklist_submissions







        UNION ALL








        SELECT


            'Action Point' AS type,



            CONCAT(

                'Action Point created (#',

                id,

                ')'

            ) AS activity,



            created_at



        FROM checklist_submission_answers







        UNION ALL








        SELECT


            'New Store Opening' AS type,



            CONCAT(

                location,

                ', ',

                city,

                ' was created'

            ) AS activity,



            created_at



        FROM new_store_openings







        UNION ALL








        SELECT


            'NSO Rule' AS type,



            CONCAT(

                'NSO Rule created (#',

                id,

                ')'

            ) AS activity,



            created_at



        FROM nso_rules







    ) AS recent_activities



    ORDER BY created_at DESC



    LIMIT 10



    `;






    db.query(

        sql,

        callback

    );



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
// EXPORT MODEL
// ======================================================


module.exports = Dashboard;
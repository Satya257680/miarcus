const db = require("../config/db");


const ChecklistReport = {};




// ======================================================
// GET ALL REPORTS
// SEARCH + PAGINATION + FILTER
// ======================================================

ChecklistReport.getAll = (

    filters,

    callback

) => {

    let sql = `

        SELECT

            cs.id,

            cs.submission_date,

            cs.status,

            cs.latitude,

            cs.longitude,

            cs.device,

            cs.attachment,

            cs.created_at,

            ct.checklist_name,

            s.store_name,

            u.name AS employee_name,

            u.employee_id,

            GROUP_CONCAT(

                DISTINCT d.department_name

                ORDER BY d.department_name

                SEPARATOR ', '

            ) AS department_name,

            q.id AS question_id,

            q.question,

            q.sequence_no,

            csa.answer,

            csa.remarks,

            ap.id AS action_point_id,

            ap.status AS action_point_status,

            csa.action_taken,

            csa.action_remarks,

            csa.completion_date,

            ap.completed_at AS action_point_completed_at,

            ap.sla_minutes AS action_point_sla_minutes,

            (

                SELECT COUNT(*)

                FROM checklist_submission_answers csa2

                WHERE csa2.submission_id = cs.id

            ) AS total_questions

        FROM checklist_submissions cs

        LEFT JOIN checklist_types ct

            ON ct.id = cs.checklist_type_id

        LEFT JOIN stores s

            ON s.id = cs.store_id

        LEFT JOIN users u

            ON u.id = cs.submitted_by

        LEFT JOIN checklist_submission_answers csa

            ON csa.submission_id = cs.id

        LEFT JOIN (
            SELECT ap1.*
            FROM action_points ap1
            LEFT JOIN action_points ap2
                ON ap2.submission_answer_id = ap1.submission_answer_id
               AND ap2.id > ap1.id
            WHERE ap2.id IS NULL
        ) ap
            ON ap.submission_answer_id = csa.id

        LEFT JOIN questions q

            ON q.id = csa.question_id

        LEFT JOIN question_departments qd

            ON qd.question_id = q.id

        LEFT JOIN departments d

            ON d.id = qd.department_id

        WHERE 1=1

            -- A checklist answer belongs in Reports immediately when no
            -- Action Point is required. If an Action Point exists, keep
            -- the answer out of Reports until that Action Point is closed.
            AND (
                ap.id IS NULL
                OR ap.status = 'Closed'
            )

    `;

    const values = [];



    // ==========================================
    // STORE FILTER
    // ==========================================


    if(filters.store_id){


        sql += `

            AND cs.store_id = ?

        `;


        values.push(

            filters.store_id

        );


    }






    // ==========================================
    // CHECKLIST FILTER
    // ==========================================


    if(filters.checklist_type_id){


        sql += `

            AND cs.checklist_type_id = ?

        `;


        values.push(

            filters.checklist_type_id

        );


    }

    if(filters.new_store_opening_id){
        sql += ` AND cs.new_store_opening_id = ? `;
        values.push(filters.new_store_opening_id);
    }






    // ==========================================
    // EMPLOYEE FILTER
    // ==========================================


    if(filters.employee_id){


        sql += `

            AND u.employee_id = ?

        `;


        values.push(

            filters.employee_id

        );


    }






    // ==========================================
    // DATE FILTER
    // ==========================================


    if(filters.from_date){


        sql += `

            AND DATE(cs.submission_date) >= ?

        `;


        values.push(

            filters.from_date

        );


    }




    if(filters.to_date){


        sql += `

            AND DATE(cs.submission_date) <= ?

        `;


        values.push(

            filters.to_date

        );


    }







    // ==========================================
    // SEARCH
    // ==========================================


    if(filters.search){


        sql += `


        AND (

            s.store_name LIKE ?

            OR ct.checklist_name LIKE ?

            OR u.name LIKE ?

            OR u.employee_id LIKE ?

            OR d.department_name LIKE ?

            OR q.question LIKE ?

            OR csa.answer LIKE ?

            OR csa.remarks LIKE ?

        )


        `;



        const keyword =

        `%${filters.search}%`;



        values.push(

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword

        );


    }






    // ==========================================
    // PAGINATION
    // ==========================================


    const page =

    Number(filters.page) || 1;



    const limit =

    Number(filters.limit) || 10;



    const offset =

    (page - 1) * limit;






    // ==========================================
// GROUP BY + ORDER + PAGINATION
// ==========================================

sql += `

    GROUP BY

        cs.id,

        cs.submission_date,

        cs.status,

        cs.latitude,

        cs.longitude,

        cs.device,

        cs.attachment,

        cs.created_at,

        ct.checklist_name,

        s.store_name,

        u.name,

        u.employee_id,

        q.id,

        q.question,

        q.sequence_no,

        csa.answer,

        csa.remarks,

        ap.id,

        ap.status,

        csa.action_taken,

        csa.action_remarks,

        csa.completion_date,

        ap.completed_at,

        ap.sla_minutes

    ORDER BY

        cs.created_at DESC,

        q.sequence_no ASC

    LIMIT ? OFFSET ?

`;

values.push(

    limit,

    offset

);

db.query(

    sql,

    values,

    callback

);


};
// ======================================================
// GET REPORT BY ID
// WITH ANSWERS
// ======================================================

ChecklistReport.getById = (

    id,

    callback

) => {

    const sql = `

        SELECT

            cs.id,

            cs.submission_date,

            cs.status,

            cs.latitude,

            cs.longitude,

            cs.device,

            cs.attachment,

            cs.created_at,

            ct.checklist_name,

            s.store_name,

            u.name AS employee_name,

            u.employee_id,

            GROUP_CONCAT(

                DISTINCT d.department_name

                ORDER BY d.department_name

                SEPARATOR ', '

            ) AS department_name,

            q.id AS question_id,

            q.question,

            q.sequence_no,

            csa.id AS answer_id,

            csa.answer,

            csa.remarks,

            ap.id AS action_point_id,

            ap.status AS action_point_status,

            csa.action_taken,

            csa.action_remarks,

            csa.completion_date,

            ap.completed_at AS action_point_completed_at,

            ap.sla_minutes AS action_point_sla_minutes

        FROM checklist_submissions cs

        LEFT JOIN checklist_types ct

            ON ct.id = cs.checklist_type_id

        LEFT JOIN stores s

            ON s.id = cs.store_id

        LEFT JOIN users u

            ON u.id = cs.submitted_by

        LEFT JOIN checklist_submission_answers csa

            ON csa.submission_id = cs.id

        LEFT JOIN (
            SELECT ap1.*
            FROM action_points ap1
            LEFT JOIN action_points ap2
                ON ap2.submission_answer_id = ap1.submission_answer_id
               AND ap2.id > ap1.id
            WHERE ap2.id IS NULL
        ) ap
            ON ap.submission_answer_id = csa.id

        LEFT JOIN questions q

            ON q.id = csa.question_id

        LEFT JOIN question_departments qd

            ON qd.question_id = q.id

        LEFT JOIN departments d

            ON d.id = qd.department_id

        WHERE cs.id = ?

        GROUP BY

            cs.id,

            cs.submission_date,

            cs.status,

            cs.latitude,

            cs.longitude,

            cs.device,

            cs.attachment,

            cs.created_at,

            ct.checklist_name,

            s.store_name,

            u.name,

            u.employee_id,

            q.id,

            q.question,

            q.sequence_no,

            csa.id,

            csa.answer,

            csa.remarks,

            ap.id,

            ap.status,

            csa.action_taken,

            csa.action_remarks,

            csa.completion_date,

            ap.completed_at,

            ap.sla_minutes

        ORDER BY

            q.sequence_no ASC

    `;

    db.query(

        sql,

        [id],

        callback

    );

};


// ======================================================
// UPDATE REPORT
// UPDATE STATUS + ANSWER
// ======================================================


// ------------------------------------------------------
// NOTE: same fix as actionPointModel.js / nsoRuleModel.js —
// "../config/db" wraps a mysql2/promise pool and has no
// beginTransaction/commit/rollback of its own; those only
// exist on a connection from pool.getConnection(). This
// grabs a dedicated connection, drives the transaction with
// async/await, and always releases it. Callback signature
// (err, result) is unchanged.
// ------------------------------------------------------

ChecklistReport.update = async (

    id,

    data,

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        // ==========================================
        // UPDATE SUBMISSION STATUS
        // ==========================================

        await connection.query(

            `

            UPDATE checklist_submissions

            SET

                status = ?

            WHERE id = ?

            `,

            [

                data.status,

                id

            ]

        );

        // ==========================================
        // UPDATE ANSWERS
        // ==========================================

        let result = null;

        if (data.answer || data.remarks) {

            const [answerResult] = await connection.query(

                `

                UPDATE checklist_submission_answers

                SET

                    answer = ?,

                    remarks = ?

                WHERE submission_id = ?

                `,

                [

                    data.answer || "",

                    data.remarks || "",

                    id

                ]

            );

            result = answerResult;

        }

        await connection.commit();

        callback(null, result);

    } catch (error) {

        if (connection) {

            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError.message);
            }

        }

        callback(error);

    } finally {

        if (connection) {
            connection.release();
        }

    }

};
// ======================================================
// DELETE REPORT
// DELETE ANSWERS + SUBMISSION
// ======================================================


// ------------------------------------------------------
// NOTE: same connection-based transaction fix as update()
// above.
// ------------------------------------------------------

ChecklistReport.delete = async (

    id,

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        // ==========================================
        // DELETE ACTION POINTS FIRST
        // ==========================================

        await connection.query(
            `
            DELETE FROM action_points
            WHERE submission_id = ?
            `,
            [id]
        );

        // ==========================================
        // DELETE ANSWERS
        // ==========================================

        await connection.query(
            `
            DELETE FROM checklist_submission_answers
            WHERE submission_id = ?
            `,
            [id]
        );

        // ==========================================
        // DELETE SUBMISSION
        // ==========================================

        const [result] = await connection.query(

            `

            DELETE FROM checklist_submissions

            WHERE id = ?

            `,

            [id]

        );

        await connection.commit();

        callback(null, result);

    } catch (error) {

        if (connection) {

            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError.message);
            }

        }

        callback(error);

    } finally {

        if (connection) {
            connection.release();
        }

    }

};
// ======================================================
// DELETE ALL VISIBLE CHECKLIST REPORTS
//
// Only submissions that currently have no open Action Point are
// removed. Active/open Action Points are deliberately preserved.
// ======================================================

ChecklistReport.deleteAll = async (callback) => {

    let connection;

    try {

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Select submissions represented by the current Checklist Reports
        // view: at least one answer is visible (no AP or closed AP), and
        // there are no open Action Points for the submission.
        const [rows] = await connection.query(`
            SELECT DISTINCT cs.id
            FROM checklist_submissions cs
            LEFT JOIN checklist_submission_answers csa
                ON csa.submission_id = cs.id
            LEFT JOIN (
                SELECT ap1.*
                FROM action_points ap1
                LEFT JOIN action_points ap2
                    ON ap2.submission_answer_id = ap1.submission_answer_id
                   AND ap2.id > ap1.id
                WHERE ap2.id IS NULL
            ) ap
                ON ap.submission_answer_id = csa.id
            WHERE (
                ap.id IS NULL
                OR ap.status = 'Closed'
            )
            AND NOT EXISTS (
                SELECT 1
                FROM action_points open_ap
                WHERE open_ap.submission_id = cs.id
                  AND open_ap.status <> 'Closed'
            )
        `);

        const ids = rows.map(row => row.id);

        if (ids.length) {

            const placeholders = ids.map(() => '?').join(',');

            // Remove Action Points belonging to the reports first so
            // submission-answer references cannot be left orphaned.
            await connection.query(
                `DELETE FROM action_points
                 WHERE submission_id IN (${placeholders})`,
                ids
            );

            await connection.query(
                `DELETE FROM checklist_submission_answers
                 WHERE submission_id IN (${placeholders})`,
                ids
            );

            await connection.query(
                `DELETE FROM checklist_submissions
                 WHERE id IN (${placeholders})`,
                ids
            );
        }

        await connection.commit();

        callback(null, {
            affectedSubmissions: ids.length
        });

    } catch (error) {

        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError.message);
            }
        }

        callback(error);

    } finally {

        if (connection) {
            connection.release();
        }
    }
};


// ======================================================
// COUNT REPORTS
// FOR PAGINATION
// ======================================================

ChecklistReport.countAll = (

    filters,

    callback

)=>{


    let sql = `


        SELECT

        COUNT(DISTINCT cs.id) AS total


        FROM checklist_submissions cs



        LEFT JOIN checklist_types ct

            ON ct.id = cs.checklist_type_id

        LEFT JOIN new_store_openings nso
            ON nso.id = cs.new_store_opening_id



        LEFT JOIN stores s

            ON s.id = cs.store_id


LEFT JOIN users u
    ON u.id = cs.submitted_by

LEFT JOIN checklist_submission_answers csa
    ON csa.submission_id = cs.id

LEFT JOIN (
    SELECT ap1.*
    FROM action_points ap1
    LEFT JOIN action_points ap2
        ON ap2.submission_answer_id = ap1.submission_answer_id
       AND ap2.id > ap1.id
    WHERE ap2.id IS NULL
) ap
    ON ap.submission_answer_id = csa.id

LEFT JOIN questions q
    ON q.id = csa.question_id

LEFT JOIN question_departments qd
    ON qd.question_id = q.id

LEFT JOIN departments d
    ON d.id = qd.department_id



        WHERE 1=1

        AND (
            ap.id IS NULL
            OR ap.status = 'Closed'
        )


    `;



    const values = [];





    if(filters.store_id){


        sql += `

        AND cs.store_id = ?

        `;


        values.push(

            filters.store_id

        );


    }






    if(filters.checklist_type_id){


        sql += `

        AND cs.checklist_type_id = ?

        `;


        values.push(

            filters.checklist_type_id

        );


    }

    if(filters.new_store_opening_id){
        sql += ` AND cs.new_store_opening_id = ? `;
        values.push(filters.new_store_opening_id);
    }






    if(filters.employee_id){


        sql += `

        AND u.employee_id = ?

        `;


        values.push(

            filters.employee_id

        );


    }






    if(filters.search){


        sql += `


        AND (

            s.store_name LIKE ?

            OR ct.checklist_name LIKE ?

            OR u.name LIKE ?

            OR u.employee_id LIKE ?

            OR d.department_name LIKE ?

            OR q.question LIKE ?

            OR csa.answer LIKE ?

            OR csa.remarks LIKE ?

        )


        `;



        const keyword =

        `%${filters.search}%`;



        values.push(

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword,

            keyword

        );


    }






    db.query(

        sql,

        values,

        callback

    );


};
// ======================================================
// EXPORT REPORTS
// ======================================================

ChecklistReport.exportReports = (

    callback

) => {

    const sql = `

        SELECT

            cs.id,
            cs.new_store_opening_id,
            nso.location AS nso_location,
            nso.city AS nso_city,
            nso.status AS nso_status,

            ct.checklist_name,

            s.store_name,

            u.name AS employee_name,

            u.employee_id,

            GROUP_CONCAT(

                DISTINCT d.department_name

                ORDER BY d.department_name

                SEPARATOR ', '

            ) AS department_name,

            cs.submission_date,

            cs.status,

            q.question,

            csa.answer,

            csa.remarks

        FROM checklist_submissions cs

        LEFT JOIN checklist_types ct

            ON ct.id = cs.checklist_type_id

        LEFT JOIN new_store_openings nso
            ON nso.id = cs.new_store_opening_id

        LEFT JOIN stores s

            ON s.id = cs.store_id

        LEFT JOIN users u

            ON u.id = cs.submitted_by

        LEFT JOIN checklist_submission_answers csa

            ON csa.submission_id = cs.id

        LEFT JOIN questions q

            ON q.id = csa.question_id

       LEFT JOIN question_departments qd
    ON qd.question_id = q.id
        LEFT JOIN departments d

            ON d.id = qd.department_id

        GROUP BY

            cs.id,
            cs.new_store_opening_id,
            nso.location,
            nso.city,
            nso.status,

            ct.checklist_name,

            s.store_name,

            u.name,

            u.employee_id,

            cs.submission_date,

            cs.status,

            q.id,

            q.question,

            csa.answer,

            csa.remarks

        ORDER BY

            cs.created_at DESC,

            q.sequence_no ASC

    `;

    db.query(

        sql,

        callback

    );

};

module.exports = ChecklistReport;
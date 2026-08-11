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

        LEFT JOIN questions q

            ON q.id = csa.question_id

        LEFT JOIN question_departments qd

            ON qd.question_id = q.id

        LEFT JOIN departments d

            ON d.id = qd.department_id

        WHERE 1=1

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

        csa.remarks

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

            csa.remarks

        FROM checklist_submissions cs

        LEFT JOIN checklist_types ct

            ON ct.id = cs.checklist_type_id

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

            csa.remarks

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
        // DELETE ANSWERS FIRST
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

LEFT JOIN questions q
    ON q.id = csa.question_id

LEFT JOIN question_departments qd
    ON qd.question_id = q.id

LEFT JOIN departments d
    ON d.id = qd.department_id



        WHERE 1=1


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
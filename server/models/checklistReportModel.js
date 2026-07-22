const db = require("../config/db");


const ChecklistReport = {};



// ======================================================
// GET ALL REPORTS
// ======================================================

ChecklistReport.getAll = (filters, callback) => {

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

            d.department_name,

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

        LEFT JOIN departments d
            ON d.id = u.department_id

        LEFT JOIN checklist_submission_answers csa
            ON csa.submission_id = cs.id

        LEFT JOIN questions q
            ON q.id = csa.question_id

        WHERE 1=1

    `;

    const values = [];



    // ==========================================
    // STORE FILTER
    // ==========================================

    if (filters.store_id) {

        sql += `
            AND cs.store_id = ?
        `;

        values.push(filters.store_id);

    }



    // ==========================================
    // CHECKLIST FILTER
    // ==========================================

    if (filters.checklist_type_id) {

        sql += `
            AND cs.checklist_type_id = ?
        `;

        values.push(filters.checklist_type_id);

    }



    // ==========================================
    // EMPLOYEE FILTER
    // ==========================================

    if (filters.employee_id) {

        sql += `
            AND u.employee_id = ?
        `;

        values.push(filters.employee_id);

    }



    // ==========================================
    // FROM DATE
    // ==========================================

    if (filters.from_date) {

        sql += `
            AND DATE(cs.submission_date) >= ?
        `;

        values.push(filters.from_date);

    }



    // ==========================================
    // TO DATE
    // ==========================================

    if (filters.to_date) {

        sql += `
            AND DATE(cs.submission_date) <= ?
        `;

        values.push(filters.to_date);

    }



    // ==========================================
    // SEARCH
    // ==========================================

    if (filters.search) {

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

        const keyword = `%${filters.search}%`;

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
    // ORDER BY
    // ==========================================

    sql += `

        ORDER BY

            cs.created_at DESC,

            q.sequence_no ASC

    `;



    db.query(

        sql,

        values,

        callback

    );

};
// ======================================================
// GET REPORT BY ID
// ======================================================

ChecklistReport.getById = (id, callback) => {

    const sql = `

        SELECT

            cs.id,
            cs.submission_date,
            cs.status,
            cs.latitude,
            cs.longitude,
            cs.device,
            cs.attachment,

            ct.checklist_name,

            s.store_name,

            u.name AS employee_name,
            u.employee_id,

            d.department_name,

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

        LEFT JOIN departments d
            ON d.id = u.department_id

        LEFT JOIN checklist_submission_answers csa
            ON csa.submission_id = cs.id

        LEFT JOIN questions q
            ON q.id = csa.question_id

        WHERE cs.id = ?

        ORDER BY q.sequence_no ASC

    `;

    db.query(sql, [id], callback);

};


// ======================================================
// UPDATE REPORT
// ======================================================

ChecklistReport.update = (id, data, callback) => {

    db.beginTransaction((err) => {

        if (err) {
            return callback(err);
        }

        // ------------------------------------------
        // Update checklist submission
        // ------------------------------------------

        const submissionSql = `

            UPDATE checklist_submissions

            SET

                status = ?

            WHERE id = ?

        `;

        console.log("UPDATE DATA:", data);

        db.query(

            submissionSql,

            [

                data.status,

                id

            ],

            (submissionErr) => {

                if (submissionErr) {

                    console.error("MYSQL UPDATE ERROR:", submissionErr);

                    return db.rollback(() => {

                        callback(submissionErr);

                    });

                }

                // ------------------------------------------
                // Update Answer
                // ------------------------------------------

                const answerSql = `

                    UPDATE checklist_submission_answers

                    SET

                        answer = ?,
                        remarks = ?

                    WHERE submission_id = ?

                `;

                db.query(

                    answerSql,

                    [

                        data.answer,

                        data.remarks,

                        id

                    ],

                    (answerErr, result) => {

                        if (answerErr) {

                            console.error("MYSQL ANSWER UPDATE ERROR:", answerErr);

                            return db.rollback(() => {

                                callback(answerErr);

                            });

                        }

                        db.commit((commitErr) => {

                            if (commitErr) {

                                return db.rollback(() => {

                                    callback(commitErr);

                                });

                            }

                            callback(null, result);

                        });

                    }

                );

            }

        );

    });

};

// ======================================================
// DELETE REPORT
// ======================================================

ChecklistReport.delete = (id, callback) => {

    db.beginTransaction((err) => {

        if (err) {

            return callback(err);

        }

        db.query(

            `
            DELETE FROM checklist_submission_answers
            WHERE submission_id = ?
            `,

            [id],

            (answerErr) => {

                if (answerErr) {

                    return db.rollback(() => {

                        callback(answerErr);

                    });

                }

                db.query(

                    `
                    DELETE FROM checklist_submissions
                    WHERE id = ?
                    `,

                    [id],

                    (deleteErr, result) => {

                        if (deleteErr) {

                            return db.rollback(() => {

                                callback(deleteErr);

                            });

                        }

                        db.commit((commitErr) => {

                            if (commitErr) {

                                return db.rollback(() => {

                                    callback(commitErr);

                                });

                            }

                            callback(null, result);

                        });

                    }

                );

            }

        );

    });

};
module.exports = ChecklistReport;
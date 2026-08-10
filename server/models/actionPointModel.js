const db = require("../config/db");

const ActionPoint = {};



// ======================================================
// CREATE TABLE
// ======================================================

ActionPoint.createTables = (callback) => {

    const sql = `

    CREATE TABLE IF NOT EXISTS action_points
    (

        id INT AUTO_INCREMENT PRIMARY KEY,

        submission_id INT NOT NULL,

        submission_answer_id INT NOT NULL,

        rule_id INT NULL,

        store_id INT NOT NULL,

        department_id INT NULL,

        question_id INT NOT NULL,

        assigned_to INT NULL,

        priority ENUM(

            'Low',

            'Medium',

            'High',

            'Critical'

        ) DEFAULT 'Medium',

        sla_value INT DEFAULT 0,

        status ENUM(

            'Open',

            'In Progress',

            'Closed'

        ) DEFAULT 'Open',

        remarks TEXT NULL,

        attachment VARCHAR(500) NULL,

        completed_at TIMESTAMP NULL,

        created_by INT NULL,

        created_at TIMESTAMP

        DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP

        DEFAULT CURRENT_TIMESTAMP

        ON UPDATE CURRENT_TIMESTAMP,

        INDEX(submission_id),

        INDEX(submission_answer_id),

        INDEX(rule_id),

        INDEX(store_id),

        INDEX(question_id),

        INDEX(status),

        INDEX(priority)

    )

    `;

    db.query(

        sql,

        callback

    );

};



// ======================================================
// GET ALL ACTION POINTS
// ======================================================

ActionPoint.getAll = (

    filters,

    callback

) => {

    let sql = `

    SELECT

        ap.id,

        ap.submission_id,

        ap.submission_answer_id,

        ap.rule_id,

        ap.store_id,

        ap.department_id,

        ap.question_id,

        ap.assigned_to,

        ap.priority,

        ap.sla_value ,

        ap.status,

        ap.remarks AS comment,

        ap.attachment,

        ap.completed_at,

        ap.created_at,

        cs.submission_date,

        cs.inspection_score,

        cs.nso_status,

        s.store_name,

        s.city,

        s.state,

        ct.checklist_name,

        q.question,

        csa.answer,

        csa.remarks AS answer_remarks,

        u.name AS employee_name,

        u.employee_id,

        d.department_name

    FROM action_points ap

    INNER JOIN checklist_submissions cs

        ON ap.submission_id = cs.id

    INNER JOIN checklist_submission_answers csa

        ON ap.submission_answer_id = csa.id

    INNER JOIN stores s

        ON ap.store_id = s.id

    INNER JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id

    INNER JOIN questions q

        ON ap.question_id = q.id

    LEFT JOIN departments d

        ON ap.department_id = d.id

    LEFT JOIN users u

        ON cs.submitted_by = u.id

    WHERE 1 = 1

    `;

    const values = [];



    // ======================================
    // STORE FILTER
    // ======================================

    if (filters.store_id) {

        sql += `

        AND ap.store_id = ?

        `;

        values.push(

            filters.store_id

        );

    }



    // ======================================
    // DEPARTMENT FILTER
    // ======================================

    if (filters.department_id) {

        sql += `

        AND ap.department_id = ?

        `;

        values.push(

            filters.department_id

        );

    }
        // ======================================
    // STATUS FILTER
    // ======================================

    if (filters.status) {

        sql += `

        AND ap.status = ?

        `;

        values.push(

            filters.status

        );

    }



    // ======================================
    // PRIORITY FILTER
    // ======================================

    if (filters.priority) {

        sql += `

        AND ap.priority = ?

        `;

        values.push(

            filters.priority

        );

    }



    // ======================================
    // CHECKLIST TYPE FILTER
    // ======================================

    if (filters.checklist_type_id) {

        sql += `

        AND cs.checklist_type_id = ?

        `;

        values.push(

            filters.checklist_type_id

        );

    }



    // ======================================
    // START DATE
    // ======================================

    if (filters.start_date) {

        sql += `

        AND DATE(cs.submission_date) >= ?

        `;

        values.push(

            filters.start_date

        );

    }



    // ======================================
    // END DATE
    // ======================================

    if (filters.end_date) {

        sql += `

        AND DATE(cs.submission_date) <= ?

        `;

        values.push(

            filters.end_date

        );

    }



    // ======================================
    // SEARCH
    // ======================================

    if (filters.search) {

        sql += `

        AND (

            s.store_name LIKE ?

            OR s.city LIKE ?

            OR s.state LIKE ?

            OR ct.checklist_name LIKE ?

            OR q.question LIKE ?

            OR csa.answer LIKE ?

            OR u.name LIKE ?

            OR d.department_name LIKE ?

            OR ap.status LIKE ?

            OR ap.priority LIKE ?

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

            keyword,

            keyword,

            keyword

        );

    }



    // ======================================
    // GROUP BY
    // ======================================

    sql += `

    GROUP BY

        ap.id,

        ap.submission_id,

        ap.submission_answer_id,

        ap.rule_id,

        ap.store_id,

        ap.department_id,

        ap.question_id,

        ap.assigned_to,

        ap.priority,

        ap.sla_value,

        ap.status,

        ap.remarks,

        ap.attachment,

        ap.completed_at,

        ap.created_at,

        cs.submission_date,

        cs.inspection_score,

        cs.nso_status,

        s.store_name,

        s.city,

        s.state,

        ct.checklist_name,

        q.question,

        csa.answer,

        csa.remarks,

        u.name,

        u.employee_id,

        d.department_name

    `;



    // ======================================
    // ORDER BY
    // ======================================

    sql += `

    ORDER BY

        ap.created_at DESC

    `;



    // ======================================
    // PAGINATION
    // ======================================

    sql += `

    LIMIT ?, ?

    `;

    values.push(

        filters.offset || 0,

        filters.limit || 10

    );



    db.query(

        sql,

        values,

        callback

    );

};
// ======================================================
// COUNT ACTION POINTS
// ======================================================

ActionPoint.count = (

    filters,

    callback

) => {

    let sql = `

    SELECT

        COUNT(DISTINCT ap.id) AS total

    FROM action_points ap

    INNER JOIN checklist_submissions cs

        ON ap.submission_id = cs.id

    INNER JOIN checklist_submission_answers csa

        ON ap.submission_answer_id = csa.id

    INNER JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id

    INNER JOIN stores s

        ON ap.store_id = s.id

    INNER JOIN questions q

        ON ap.question_id = q.id

    LEFT JOIN departments d

        ON ap.department_id = d.id

    LEFT JOIN users u

        ON cs.submitted_by = u.id

    WHERE 1 = 1

    `;

    const values = [];



    // ======================================
    // STORE FILTER
    // ======================================

    if (filters.store_id) {

        sql += `

        AND ap.store_id = ?

        `;

        values.push(

            filters.store_id

        );

    }



    // ======================================
    // DEPARTMENT FILTER
    // ======================================

    if (filters.department_id) {

        sql += `

        AND ap.department_id = ?

        `;

        values.push(

            filters.department_id

        );

    }



    // ======================================
    // STATUS FILTER
    // ======================================

    if (filters.status) {

        sql += `

        AND ap.status = ?

        `;

        values.push(

            filters.status

        );

    }



    // ======================================
    // PRIORITY FILTER
    // ======================================

    if (filters.priority) {

        sql += `

        AND ap.priority = ?

        `;

        values.push(

            filters.priority

        );

    }



    // ======================================
    // CHECKLIST TYPE FILTER
    // ======================================

    if (filters.checklist_type_id) {

        sql += `

        AND cs.checklist_type_id = ?

        `;

        values.push(

            filters.checklist_type_id

        );

    }



    // ======================================
    // START DATE
    // ======================================

    if (filters.start_date) {

        sql += `

        AND DATE(cs.submission_date) >= ?

        `;

        values.push(

            filters.start_date

        );

    }



    // ======================================
    // END DATE
    // ======================================

    if (filters.end_date) {

        sql += `

        AND DATE(cs.submission_date) <= ?

        `;

        values.push(

            filters.end_date

        );

    }



    // ======================================
    // SEARCH
    // ======================================

    if (filters.search) {

        sql += `

        AND (

            s.store_name LIKE ?

            OR s.city LIKE ?

            OR s.state LIKE ?

            OR ct.checklist_name LIKE ?

            OR q.question LIKE ?

            OR csa.answer LIKE ?

            OR u.name LIKE ?

            OR d.department_name LIKE ?

            OR ap.status LIKE ?

            OR ap.priority LIKE ?

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
// GET ACTION POINT BY ID
// ======================================================

ActionPoint.getById = (

    id,

    callback

) => {

    const sql = `

    SELECT

        ap.id,

        ap.submission_id,

        ap.submission_answer_id,

        ap.rule_id,

        ap.store_id,

        ap.department_id,

        ap.question_id,

        ap.assigned_to,

        ap.priority,

        ap.sla_value ,

        ap.status,

        ap.remarks AS comment,

        ap.attachment,

        ap.completed_at,

        ap.created_by,

        ap.created_at,

        ap.updated_at,

        cs.submission_date,

        cs.inspection_score,

        cs.nso_status,

        cs.latitude,

        cs.longitude,

        cs.device,

        s.store_name,

        s.city,

        s.state,

        ct.checklist_name,

        q.question,

        csa.answer,

        csa.remarks AS answer_remarks,

        nr.trigger_column,

        nr.expected_answer,

        nr.create_action_point,

        u.name AS employee_name,

        u.employee_id,

        au.name AS assigned_to_name,

        d.department_name

    FROM action_points ap

    INNER JOIN checklist_submissions cs

        ON ap.submission_id = cs.id

    INNER JOIN checklist_submission_answers csa

        ON ap.submission_answer_id = csa.id

    INNER JOIN questions q

        ON ap.question_id = q.id

    INNER JOIN stores s

        ON ap.store_id = s.id

    INNER JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id

    LEFT JOIN departments d

        ON ap.department_id = d.id

    LEFT JOIN nso_rules nr

        ON ap.rule_id = nr.id

    LEFT JOIN users u

        ON cs.submitted_by = u.id

    LEFT JOIN users au

        ON ap.assigned_to = au.id

    WHERE ap.id = ?

    LIMIT 1

    `;

    db.query(

        sql,

        [

            id

        ],

        callback

    );

};
// ======================================================
// CREATE ACTION POINT
// ======================================================

ActionPoint.create = (

    data,

    callback

) => {

    const sql = `

    INSERT INTO action_points
    (

        submission_id,

        submission_answer_id,

        rule_id,

        store_id,

        department_id,

        question_id,

        assigned_to,

        priority,

        sla_value ,

        status,

        remarks,

        attachment,

        created_by

    )

    VALUES

    (

        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?

    )

    `;

    const values = [

        data.submission_id,

        data.submission_answer_id,

        data.rule_id || null,

        data.store_id,

        data.department_id || null,

        data.question_id,

        data.assigned_to || null,

        data.priority || "Medium",

        Number(data.sla_value ?? data.sla_days) || 0,

        data.status || "Open",

        data.remarks || null,

        data.attachment || null,

        data.created_by || null

    ];

    db.query(

        sql,

        values,

        callback

    );

};



// ======================================================
// UPDATE ACTION POINT
// ======================================================

ActionPoint.update = (

    id,

    data,

    callback

) => {

    const sql = `

    UPDATE action_points

    SET

        assigned_to = ?,

        priority = ?,

        sla_value = ?,

        remarks = ?,

        attachment = ?,

        updated_at = CURRENT_TIMESTAMP

    WHERE id = ?

    `;

    db.query(

        sql,

        [

            data.assigned_to || null,

            data.priority || "Medium",

          Number(data.sla_value ?? data.sla_days) || 0,

            data.remarks || null,

            data.attachment || null,

            id

        ],

        callback

    );

};

// ======================================================
// UPDATE ACTION POINT STATUS
// ======================================================

ActionPoint.updateStatus = (

    id,

    status,

    callback

) => {

    const sql = `

    UPDATE action_points

    SET

        status = ?,

        updated_at = CURRENT_TIMESTAMP

    WHERE id = ?

    `;

    db.query(

        sql,

        [

            status,

            id

        ],

        callback

    );

};



// ======================================================
// TAKE ACTION
// ======================================================

ActionPoint.takeAction = (

    id,

    data,

    callback

) => {

    db.beginTransaction((transactionError) => {

        if (transactionError) {

            return callback(transactionError);

        }

        // ======================================
        // GET ACTION POINT
        // ======================================

        db.query(

            `

            SELECT

                submission_answer_id

            FROM action_points

            WHERE id = ?

            `,

            [id],

            (findError, rows) => {

                if (findError) {

                    return db.rollback(() => {

                        callback(findError);

                    });

                }

                if (rows.length === 0) {

                    return db.rollback(() => {

                        callback(

                            new Error(

                                "Action Point not found."

                            )

                        );

                    });

                }

                const submissionAnswerId =

                    rows[0].submission_answer_id;

                // ======================================
                // UPDATE ACTION POINT
                // ======================================

                db.query(

                    `

                    UPDATE action_points

                    SET

                        status = 'Closed',

                        remarks = ?,

                        completed_at = CURRENT_TIMESTAMP,

                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?

                    `,

                    [

                        data.remarks || "",

                        id

                    ],

                    (actionError) => {

                        if (actionError) {

                            return db.rollback(() => {

                                callback(actionError);

                            });

                        }

                        // ======================================
                        // UPDATE SUBMISSION ANSWER
                        // ======================================

                        db.query(

                            `

                            UPDATE checklist_submission_answers

                            SET

                                action_taken = ?,

                                action_remarks = ?,

                                completion_date = CURRENT_TIMESTAMP

                            WHERE id = ?

                            `,

                            [

                                data.action_taken || "Completed",

                                data.remarks || "",

                                submissionAnswerId

                            ],

                            (answerError) => {

                                if (answerError) {

                                    return db.rollback(() => {

                                        callback(answerError);

                                    });

                                }

                                db.commit(

                                    (commitError) => {

                                        if (commitError) {

                                            return db.rollback(() => {

                                                callback(commitError);

                                            });

                                        }

                                        callback(

                                            null,

                                            {

                                                success: true

                                            }

                                        );

                                    }

                                );

                            }

                        );

                    }

                );

            }

        );

    });

};
// ======================================================
// DELETE ACTION POINT
// ======================================================

ActionPoint.delete = (

    id,

    callback

) => {

    const sql = `

    DELETE FROM action_points

    WHERE id = ?

    `;

    db.query(

        sql,

        [

            id

        ],

        callback

    );

};



// ======================================================
// DELETE ALL ACTION POINTS
// ======================================================

ActionPoint.deleteAll = (

    callback

) => {

    const sql = `

    DELETE FROM action_points

    `;

    db.query(

        sql,

        callback

    );

};



// ======================================================
// GET OPEN ACTION POINTS
// ======================================================

ActionPoint.getOpenActionPoints = (

    callback

) => {

    const sql = `

    SELECT

        ap.id,

        ap.priority,

        ap.status,

     ap.sla_value,

        ap.created_at,

        s.store_name,

        q.question,

        d.department_name,

        u.name AS assigned_to_name

    FROM action_points ap

    INNER JOIN stores s

        ON ap.store_id = s.id

    INNER JOIN questions q

        ON ap.question_id = q.id

    LEFT JOIN departments d

        ON ap.department_id = d.id

    LEFT JOIN users u

        ON ap.assigned_to = u.id

    WHERE ap.status <> 'Closed'

    ORDER BY

        ap.priority DESC,

        ap.created_at ASC

    `;

    db.query(

        sql,

        callback

    );

};



// ======================================================
// GET ACTION POINTS BY SUBMISSION
// ======================================================

ActionPoint.getBySubmission = (

    submissionId,

    callback

) => {

    const sql = `

    SELECT

        ap.*,

        q.question,

        s.store_name,

        d.department_name

    FROM action_points ap

    INNER JOIN questions q

        ON ap.question_id = q.id

    INNER JOIN stores s

        ON ap.store_id = s.id

    LEFT JOIN departments d

        ON ap.department_id = d.id

    WHERE ap.submission_id = ?

    ORDER BY ap.created_at ASC

    `;

    db.query(

        sql,

        [

            submissionId

        ],

        callback

    );

};
// ======================================================
// EXPORT ACTION POINTS
// ======================================================

ActionPoint.exportData = (

    filters,

    callback

) => {

    let sql = `

    SELECT

        ap.id,

        cs.submission_date,

        s.store_name,

        s.city,

        s.state,

        ct.checklist_name,

        q.question,

        d.department_name,

        csa.answer,

        ap.priority,

        ap.sla_value ,

        ap.status,

        ap.remarks AS comment,

        ap.completed_at,

        u.name AS submitted_by,

        au.name AS assigned_to,

        ap.created_at

    FROM action_points ap

    INNER JOIN checklist_submissions cs

        ON ap.submission_id = cs.id

    INNER JOIN checklist_submission_answers csa

        ON ap.submission_answer_id = csa.id

    INNER JOIN stores s

        ON ap.store_id = s.id

    INNER JOIN checklist_types ct

        ON cs.checklist_type_id = ct.id

    INNER JOIN questions q

        ON ap.question_id = q.id

    LEFT JOIN departments d

        ON ap.department_id = d.id

    LEFT JOIN users u

        ON cs.submitted_by = u.id

    LEFT JOIN users au

        ON ap.assigned_to = au.id

    WHERE 1 = 1

    `;

    const values = [];



    // ======================================
    // STORE FILTER
    // ======================================

    if (filters.store_id) {

        sql += `

        AND ap.store_id = ?

        `;

        values.push(

            filters.store_id

        );

    }



    // ======================================
    // STATUS FILTER
    // ======================================

    if (filters.status) {

        sql += `

        AND ap.status = ?

        `;

        values.push(

            filters.status

        );

    }



    // ======================================
    // PRIORITY FILTER
    // ======================================

    if (filters.priority) {

        sql += `

        AND ap.priority = ?

        `;

        values.push(

            filters.priority

        );

    }



    // ======================================
    // SEARCH
    // ======================================

    if (filters.search) {

        sql += `

        AND (

            s.store_name LIKE ?

            OR s.city LIKE ?

            OR s.state LIKE ?

            OR ct.checklist_name LIKE ?

            OR q.question LIKE ?

            OR d.department_name LIKE ?

            OR csa.answer LIKE ?

            OR ap.status LIKE ?

            OR ap.priority LIKE ?

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

            keyword,

            keyword

        );

    }



    sql += `

    ORDER BY

        ap.created_at DESC

    `;



    db.query(

        sql,

        values,

        callback

    );

};



// ======================================================
// DASHBOARD STATISTICS
// ======================================================

ActionPoint.getDashboardStats = (

    callback

) => {

    const sql = `

    SELECT

        COUNT(*) AS total_action_points,

        SUM(

            CASE

                WHEN status = 'Open'

                THEN 1

                ELSE 0

            END

        ) AS open_action_points,

        SUM(

            CASE

                WHEN status = 'In Progress'

                THEN 1

                ELSE 0

            END

        ) AS in_progress_action_points,

        SUM(

            CASE

                WHEN status = 'Closed'

                THEN 1

                ELSE 0

            END

        ) AS closed_action_points

    FROM action_points

    `;

    db.query(

        sql,

        callback

    );

};



// ======================================================
// MODULE EXPORT
// ======================================================

module.exports = ActionPoint;
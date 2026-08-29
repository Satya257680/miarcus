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

            new_store_opening_id INT NULL,

            submission_id INT NULL,

            submission_answer_id INT NULL,

            rule_id INT NULL,

            store_id INT NOT NULL,

            department_id INT NULL,

            question_id INT NULL,

            assigned_to INT NULL,

            priority ENUM(
                'Low',
                'Medium',
                'High',
                'Critical'
            ) DEFAULT 'Medium',

            sla_value INT DEFAULT 0,

            /* Exact SLA duration in minutes; sla_value is retained for legacy/day display. */
            sla_minutes INT DEFAULT 0,

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

            INDEX(new_store_opening_id),
            INDEX(submission_id),
            INDEX(submission_answer_id),
            INDEX(rule_id),
            INDEX(store_id),
            INDEX(question_id),
            INDEX(status),
            INDEX(priority)
        )
    `;

    db.query(sql, callback);
};


// ======================================================
// ENSURE NSO PARENT COLUMN
// ======================================================

ActionPoint.ensureParentColumn = async () => {

    const hasColumn = await new Promise((resolve, reject) => {

        db.query(
            `SHOW COLUMNS FROM action_points
             LIKE 'new_store_opening_id'`,
            (err, rows) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(rows.length > 0);
            }
        );
    });


    if (!hasColumn) {

        await new Promise((resolve, reject) => {

            db.query(
                `
                ALTER TABLE action_points
                ADD COLUMN new_store_opening_id INT NULL
                AFTER id
                `,
                (err) => {

                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                }
            );
        });
    }


    const hasIndex = await new Promise((resolve, reject) => {

        db.query(
            `
            SHOW INDEX
            FROM action_points
            WHERE Key_name = 'idx_action_points_nso'
            `,
            (err, rows) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(rows.length > 0);
            }
        );
    });


    if (!hasIndex) {

        await new Promise((resolve, reject) => {

            db.query(
                `
                ALTER TABLE action_points
                ADD INDEX idx_action_points_nso
                (new_store_opening_id)
                `,
                (err) => {

                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                }
            );
        });
    }
};


// ======================================================
// ENSURE QUESTION IS OPTIONAL
//
// Older installations created question_id as NOT NULL. Bulk/manual
// Action Points are allowed without a checklist question, so migrate the
// existing column to nullable as well as keeping CREATE TABLE compatible.
// ======================================================

ActionPoint.ensureQuestionColumn = async () => {

    const column = await new Promise((resolve, reject) => {

        db.query(
            `SHOW COLUMNS FROM action_points LIKE 'question_id'`,
            (err, rows) => {

                if (err) return reject(err);

                resolve(rows?.[0] || null);
            }
        );

    });

    if (!column) return;

    const type =
        String(column.Type || "").toUpperCase();

    const isNullable =
        String(column.Null || "").toUpperCase() === "YES";

    if (!isNullable) {

        await new Promise((resolve, reject) => {

            db.query(
                `ALTER TABLE action_points
                 MODIFY COLUMN question_id INT NULL`,
                (err) => {

                    if (err) return reject(err);

                    resolve();
                }
            );

        });

        console.log(
            "✅ action_points.question_id changed to nullable"
        );

    } else if (!type.includes("INT")) {

        console.warn(
            "⚠️ action_points.question_id has unexpected type:",
            column.Type
        );

    }

};


// ======================================================
// ENSURE EXACT SLA COLUMN
// Existing databases need an explicit migration because
// CREATE TABLE IF NOT EXISTS does not alter old tables.
// ======================================================

ActionPoint.ensureSlaMinutesColumn = async () => {

    const column = await new Promise((resolve, reject) => {

        db.query(
            `SHOW COLUMNS FROM action_points LIKE 'sla_minutes'`,
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows?.[0] || null);
            }
        );

    });

    if (!column) {

        await new Promise((resolve, reject) => {

            db.query(
                `ALTER TABLE action_points
                 ADD COLUMN sla_minutes INT DEFAULT 0
                 AFTER sla_value`,
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );

        });

        console.log("✅ action_points.sla_minutes added");
    }
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

            ap.new_store_opening_id,

            ap.submission_id,

            ap.submission_answer_id,

            ap.rule_id,

            ap.store_id,

            ap.department_id,

            ap.question_id,

            ap.assigned_to,

            ap.priority,

            ap.sla_value,

            ap.sla_minutes,

            ap.status,

            ap.remarks AS remarks,

            ap.attachment,

            ap.completed_at,

            ap.created_at,

            COALESCE(cs.submission_date, DATE(ap.created_at)) AS date,

            cs.submission_date,

            cs.inspection_score,

            cs.nso_status,

            nso.location AS nso_location,

            nso.city AS nso_city,

            nso.status AS nso_project_status,

        

            s.store_name,

            s.city,

            s.state,

            ct.checklist_name,

            q.question,

            csa.answer,

            ap.sla_value AS sla_days,

            csa.remarks AS answer_remarks,

            u.name AS employee_name,

            u.employee_id,

            d.department_name,

            au.name AS assigned_to_name

        FROM action_points ap

        LEFT JOIN checklist_submissions cs
            ON ap.submission_id = cs.id

        LEFT JOIN checklist_submission_answers csa
            ON ap.submission_answer_id = csa.id

        INNER JOIN stores s
            ON ap.store_id = s.id

        LEFT JOIN questions q
            ON ap.question_id = q.id

        LEFT JOIN checklist_types ct
            ON ct.id = q.checklist_type_id

        LEFT JOIN departments d
            ON ap.department_id = d.id

        LEFT JOIN new_store_openings nso
            ON ap.new_store_opening_id = nso.id

        LEFT JOIN users u
            ON cs.submitted_by = u.id

        LEFT JOIN users au
            ON ap.assigned_to = au.id

        WHERE 1 = 1
    `;


    const values = [];


    // ==================================================
    // STORE FILTER
    // ==================================================

    if (filters.store_id) {

        sql += `
            AND ap.store_id = ?
        `;

        values.push(
            filters.store_id
        );
    }


    // ==================================================
    // DEPARTMENT FILTER
    // ==================================================

    if (filters.department_id) {

        sql += `
            AND ap.department_id = ?
        `;

        values.push(
            filters.department_id
        );
    }


    // ==================================================
    // NEW STORE OPENING FILTER
    // ==================================================

    if (filters.new_store_opening_id) {

        sql += `
            AND ap.new_store_opening_id = ?
        `;

        values.push(
            filters.new_store_opening_id
        );
    }


    // ==================================================
    // STATUS FILTER
    // ==================================================

    if (filters.status) {

        sql += `
            AND ap.status = ?
        `;

        values.push(
            filters.status
        );
    }


    // ==================================================
    // PRIORITY FILTER
    // ==================================================

    if (filters.priority) {

        sql += `
            AND ap.priority = ?
        `;

        values.push(
            filters.priority
        );
    }


    // ==================================================
    // CHECKLIST TYPE FILTER
    // ==================================================

    if (filters.checklist_type_id) {

        sql += `
            AND q.checklist_type_id = ?
        `;

        values.push(
            filters.checklist_type_id
        );
    }


    // ==================================================
    // START DATE
    // ==================================================

    if (filters.start_date) {

        sql += `
            AND COALESCE(cs.submission_date, DATE(ap.created_at)) >= ?
        `;

        values.push(
            filters.start_date
        );
    }


    // ==================================================
    // END DATE
    // ==================================================

    if (filters.end_date) {

        sql += `
            AND COALESCE(cs.submission_date, DATE(ap.created_at)) <= ?
        `;

        values.push(
            filters.end_date
        );
    }


    // ==================================================
    // SEARCH
    // ==================================================

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
                OR ap.remarks LIKE ?
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
            keyword,
            keyword,
            keyword,
            keyword
        );
    }


    // ==================================================
    // ORDER
    // ==================================================

    sql += `
        ORDER BY
            ap.created_at DESC
    `;


    // ==================================================
    // PAGINATION
    // ==================================================

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

        LEFT JOIN checklist_submissions cs
            ON ap.submission_id = cs.id

        LEFT JOIN checklist_submission_answers csa
            ON ap.submission_answer_id = csa.id

        INNER JOIN stores s
            ON ap.store_id = s.id

        LEFT JOIN questions q
            ON ap.question_id = q.id

        LEFT JOIN checklist_types ct
            ON ct.id = q.checklist_type_id

        LEFT JOIN departments d
            ON ap.department_id = d.id

        LEFT JOIN users u
            ON cs.submitted_by = u.id

        WHERE 1 = 1
    `;


    const values = [];


    if (filters.store_id) {

        sql += `
            AND ap.store_id = ?
        `;

        values.push(
            filters.store_id
        );
    }


    if (filters.department_id) {

        sql += `
            AND ap.department_id = ?
        `;

        values.push(
            filters.department_id
        );
    }


    if (filters.new_store_opening_id) {

        sql += `
            AND ap.new_store_opening_id = ?
        `;

        values.push(
            filters.new_store_opening_id
        );
    }


    if (filters.status) {

        sql += `
            AND ap.status = ?
        `;

        values.push(
            filters.status
        );
    }


    if (filters.priority) {

        sql += `
            AND ap.priority = ?
        `;

        values.push(
            filters.priority
        );
    }


    if (filters.checklist_type_id) {

        sql += `
            AND q.checklist_type_id = ?
        `;

        values.push(
            filters.checklist_type_id
        );
    }


    if (filters.start_date) {

        sql += `
            AND (
                COALESCE(cs.submission_date, DATE(ap.created_at)) >= ?
            )
        `;

        values.push(
            filters.start_date
        );
    }


    if (filters.end_date) {

        sql += `
            AND (
                COALESCE(cs.submission_date, DATE(ap.created_at)) <= ?
            )
        `;

        values.push(
            filters.end_date
        );
    }


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
                OR ap.remarks LIKE ?
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

            ap.new_store_opening_id,

            ap.submission_id,

            ap.submission_answer_id,

            ap.rule_id,

            ap.store_id,

            ap.department_id,

            ap.question_id,

            ap.assigned_to,

            ap.priority,

            ap.sla_value AS sla_days,

            ap.sla_value,

            ap.sla_minutes,

            ap.status,

            ap.remarks AS remarks,

            ap.attachment,

            ap.completed_at,

            ap.created_by,

            ap.created_at,

            ap.updated_at,

            cs.submission_date,

            cs.inspection_score,

            cs.nso_status,

            nso.location AS nso_location,

            nso.city AS nso_city,

            nso.status AS nso_project_status,

         

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

        LEFT JOIN checklist_submissions cs
            ON ap.submission_id = cs.id

        LEFT JOIN checklist_submission_answers csa
            ON ap.submission_answer_id = csa.id

        LEFT JOIN questions q
            ON ap.question_id = q.id

        INNER JOIN stores s
            ON ap.store_id = s.id

        LEFT JOIN checklist_types ct
            ON ct.id = q.checklist_type_id

        LEFT JOIN departments d
            ON ap.department_id = d.id

        LEFT JOIN nso_rules nr
            ON ap.rule_id = nr.id

        LEFT JOIN users u
            ON cs.submitted_by = u.id

        LEFT JOIN users au
            ON ap.assigned_to = au.id

        LEFT JOIN new_store_openings nso
            ON ap.new_store_opening_id = nso.id

        WHERE ap.id = ?

        LIMIT 1

    `;


    db.query(
        sql,
        [id],
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
            new_store_opening_id,
            submission_id,
            submission_answer_id,
            rule_id,
            store_id,
            department_id,
            question_id,
            assigned_to,
            priority,
            sla_value,
            sla_minutes,
            status,
            remarks,
            attachment,
            created_by
        )

        VALUES
        (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
        )

    `;


    // ==================================================
    // IMPORTANT
    //
    // Empty manual values become NULL.
    // ==================================================

    const submissionId =
        data.submission_id === undefined ||
        data.submission_id === null ||
        data.submission_id === ""
            ? null
            : Number(data.submission_id);


    const submissionAnswerId =
        data.submission_answer_id === undefined ||
        data.submission_answer_id === null ||
        data.submission_answer_id === ""
            ? null
            : Number(data.submission_answer_id);


    const values = [

        // Legacy NSO project link is optional and normally NULL for checklist/manual APs.
        data.new_store_opening_id || null,

        submissionId,

        submissionAnswerId,

        data.rule_id || null,

        data.store_id
            ? Number(data.store_id)
            : null,

        data.department_id
            ? Number(data.department_id)
            : null,

        data.question_id
            ? Number(data.question_id)
            : null,

        data.assigned_to || null,

        data.priority || "Medium",

        Number(
            data.sla_value ??
            data.sla_days
        ) || 0,

        Number(data.sla_minutes) || 0,

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

            sla_minutes = ?,

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

            Number(
                data.sla_value ??
                data.sla_days
            ) || 0,

            Number(data.sla_minutes) || 0,

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

ActionPoint.takeAction = async (
    id,
    data,
    callback
) => {

    let connection;


    try {

        connection =
            await db.getConnection();


        await connection.beginTransaction();


        // ============================================
        // GET ACTION POINT
        // ============================================

        const [
            rows
        ] = await connection.execute(
            `
            SELECT
                submission_answer_id,

                submission_id

            FROM action_points

            WHERE id = ?
            `,
            [id]
        );


        if (
            !rows ||
            rows.length === 0
        ) {

            await connection.rollback();

            return callback(
                new Error(
                    "Action Point not found."
                )
            );
        }


        const submissionAnswerId =
            rows[0].submission_answer_id;

        const submissionId =
            rows[0].submission_id;


        // ============================================
        // CLOSE ACTION POINT
        // ============================================

        await connection.execute(
            `
            UPDATE action_points

            SET

                status = 'Closed',

                remarks = ?,

                completed_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = ?
            `,
            [
                data.remarks || "",
                id
            ]
        );


        // ============================================
        // CHECKLIST ANSWER
        //
        // Only update this when this Action Point
        // came from a checklist.
        // ============================================

        if (submissionAnswerId) {

            await connection.execute(
                `
                UPDATE checklist_submission_answers

                SET

                    action_taken = ?,

                    action_remarks = ?,

                    completion_date =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `,
                [

                    data.action_taken ||
                        "Completed",

                    data.remarks ||
                        "",

                    submissionAnswerId
                ]
            );
        }

        // A checklist submission is considered completed only when every
        // Action Point raised from that submission has been closed.
        if (submissionId) {

            const [openRows] = await connection.execute(
                `
                SELECT COUNT(*) AS open_count
                FROM action_points
                WHERE submission_id = ?
                  AND status <> 'Closed'
                `,
                [submissionId]
            );

            if (Number(openRows?.[0]?.open_count || 0) === 0) {

                await connection.execute(
                    `
                    UPDATE checklist_submissions
                    SET status = 'Completed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    `,
                    [submissionId]
                );
            }
        }


        await connection.commit();


        callback(
            null,
            {
                success: true
            }
        );

    } catch (error) {

        if (connection) {

            try {

                await connection.rollback();

            } catch (
                rollbackError
            ) {

                console.error(
                    "Rollback failed:",
                    rollbackError.message
                );
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
        [id],
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

            ap.sla_minutes,

            ap.created_at,

            s.store_name,

            q.question,

            d.department_name,

            u.name AS assigned_to_name

        FROM action_points ap

        INNER JOIN stores s
            ON ap.store_id = s.id

        LEFT JOIN questions q
            ON ap.question_id = q.id

        LEFT JOIN departments d
            ON ap.department_id = d.id

        LEFT JOIN users u
            ON ap.assigned_to = u.id

        WHERE ap.status <> 'Closed'

        ORDER BY

            FIELD(
                ap.priority,
                'Critical',
                'High',
                'Medium',
                'Low'
            ),

            ap.created_at ASC

    `;


    db.query(
        sql,
        callback
    );
};


// ======================================================
// GET ACTION POINTS BY NEW STORE OPENING
// ======================================================

ActionPoint.getByNSO = (
    newStoreOpeningId,
    callback
) => {

    const sql = `

        SELECT

            ap.*,

            q.question,

            s.store_name,

            s.city,

            s.state,

            d.department_name,

            ct.checklist_name,

            cs.submission_date,

            cs.inspection_score,

            cs.nso_status,

            nso.location AS nso_location,

            nso.city AS nso_city,

            nso.status AS nso_project_status,

           

            u.name AS assigned_to_name

        FROM action_points ap

        LEFT JOIN checklist_submissions cs
            ON ap.submission_id = cs.id

        LEFT JOIN questions q
            ON ap.question_id = q.id

        INNER JOIN stores s
            ON ap.store_id = s.id

        LEFT JOIN departments d
            ON ap.department_id = d.id

        LEFT JOIN checklist_types ct
            ON ct.id = q.checklist_type_id

        LEFT JOIN new_store_openings nso
            ON ap.new_store_opening_id = nso.id

        LEFT JOIN users u
            ON ap.assigned_to = u.id

        WHERE ap.new_store_opening_id = ?

        ORDER BY

            FIELD(
                ap.priority,
                'Critical',
                'High',
                'Medium',
                'Low'
            ),

            ap.created_at DESC

    `;


    db.query(
        sql,
        [newStoreOpeningId],
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

        LEFT JOIN questions q
            ON ap.question_id = q.id

        INNER JOIN stores s
            ON ap.store_id = s.id

        LEFT JOIN departments d
            ON ap.department_id = d.id

        WHERE ap.submission_id = ?

        ORDER BY
            ap.created_at ASC

    `;


    db.query(
        sql,
        [submissionId],
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

            COALESCE(cs.submission_date, DATE(ap.created_at)) AS submission_date,

            s.store_name,

            s.city,

            s.state,

            ct.checklist_name,

            q.question,

            d.department_name,

            csa.answer,

            ap.priority,

            ap.sla_value AS sla_days,

            ap.sla_minutes,

            ap.status,

            ap.remarks AS remarks,

            ap.completed_at,

            u.name AS submitted_by,

            au.name AS assigned_to,

            ap.created_at

        FROM action_points ap

        LEFT JOIN checklist_submissions cs
            ON ap.submission_id = cs.id

        LEFT JOIN checklist_submission_answers csa
            ON ap.submission_answer_id = csa.id

        INNER JOIN stores s
            ON ap.store_id = s.id

        LEFT JOIN questions q
            ON ap.question_id = q.id

        LEFT JOIN checklist_types ct
            ON ct.id = q.checklist_type_id

        LEFT JOIN departments d
            ON ap.department_id = d.id

        LEFT JOIN users u
            ON cs.submitted_by = u.id

        LEFT JOIN users au
            ON ap.assigned_to = au.id

        WHERE 1 = 1

    `;


    const values = [];


    // ==================================================
    // STORE
    // ==================================================

    if (filters.store_id) {

        sql += `
            AND ap.store_id = ?
        `;

        values.push(
            filters.store_id
        );
    }


    // ==================================================
    // STATUS
    // ==================================================

    if (filters.status) {

        sql += `
            AND ap.status = ?
        `;

        values.push(
            filters.status
        );
    }


    // ==================================================
    // PRIORITY
    // ==================================================

    if (filters.priority) {

        sql += `
            AND ap.priority = ?
        `;

        values.push(
            filters.priority
        );
    }


    // ==================================================
    // SEARCH
    // ==================================================

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
                OR ap.remarks LIKE ?
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
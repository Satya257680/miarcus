const db = require("../config/db");


const ChecklistSubmission = {};



// ======================================================
// CREATE REQUIRED TABLES
// ======================================================

ChecklistSubmission.createTables = (callback) => {

    const submissionTable = `

    CREATE TABLE IF NOT EXISTS checklist_submissions

    (

        id INT AUTO_INCREMENT PRIMARY KEY,

        new_store_opening_id INT NULL,

        checklist_type_id INT NOT NULL,

        store_id INT NOT NULL,

        submitted_by INT NULL,

        submission_date DATE NOT NULL,

        latitude DECIMAL(10,7) NULL,

        longitude DECIMAL(10,7) NULL,

        device VARCHAR(255) NULL,

        attachment VARCHAR(500) NULL,

        status VARCHAR(50)
        DEFAULT 'Submitted',

        inspection_score DECIMAL(5,2)
        DEFAULT 0,

        nso_status ENUM(
            'Open',
            'Closed'
        )
        DEFAULT 'Closed',

        processed_at TIMESTAMP NULL,

        processed_by INT NULL,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

    )

    `;





    const answersTable = `

    CREATE TABLE IF NOT EXISTS checklist_submission_answers

    (

        id INT AUTO_INCREMENT PRIMARY KEY,

        submission_id INT NOT NULL,

        question_id INT NOT NULL,

        answer TEXT NULL,

        remarks TEXT NULL,

        created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(submission_id)

        REFERENCES checklist_submissions(id)

        ON DELETE CASCADE

    )

    `;





    db.query(

        submissionTable,

        (err) => {

            if (err) {

                return callback(err);

            }

            db.query(

                answersTable,

                callback

            );

        }

    );

};

// ======================================================
// ENSURE NEW STORE OPENING PARENT COLUMN
// Existing databases may already have the table.
// CREATE TABLE IF NOT EXISTS does not alter it, so we
// explicitly add the column/index/FK when missing.
// ======================================================

ChecklistSubmission.ensureParentColumn = async () => {

    const hasColumn = await new Promise((resolve, reject) => {
        db.query(
            `SHOW COLUMNS FROM checklist_submissions LIKE 'new_store_opening_id'`,
            (err, rows) => err ? reject(err) : resolve(rows.length > 0)
        );
    });

    if (!hasColumn) {
        await new Promise((resolve, reject) => {
            db.query(
                `ALTER TABLE checklist_submissions ADD COLUMN new_store_opening_id INT NULL AFTER id`,
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    const hasIndex = await new Promise((resolve, reject) => {
        db.query(
            `SHOW INDEX FROM checklist_submissions WHERE Key_name = 'idx_checklist_submissions_nso'`,
            (err, rows) => err ? reject(err) : resolve(rows.length > 0)
        );
    });

    if (!hasIndex) {
        await new Promise((resolve, reject) => {
            db.query(
                `ALTER TABLE checklist_submissions ADD INDEX idx_checklist_submissions_nso (new_store_opening_id)`,
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    const hasParentTable = await new Promise((resolve, reject) => {
        db.query(
            `SELECT TABLE_NAME
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'new_store_openings'
             LIMIT 1`,
            (err, rows) => err ? reject(err) : resolve(rows.length > 0)
        );
    });

    if (!hasParentTable) {
        console.warn("⚠️ new_store_openings table not found; skipping checklist submission FK migration.");
        return;
    }

    const hasForeignKey = await new Promise((resolve, reject) => {
        db.query(
            `SELECT CONSTRAINT_NAME
             FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'checklist_submissions'
               AND COLUMN_NAME = 'new_store_opening_id'
               AND REFERENCED_TABLE_NAME = 'new_store_openings'
             LIMIT 1`,
            (err, rows) => err ? reject(err) : resolve(rows.length > 0)
        );
    });

    if (!hasForeignKey) {
        await new Promise((resolve, reject) => {
            db.query(
                `ALTER TABLE checklist_submissions
                 ADD CONSTRAINT fk_checklist_submissions_nso
                 FOREIGN KEY (new_store_opening_id)
                 REFERENCES new_store_openings(id)
                 ON DELETE SET NULL`,
                (err) => err ? reject(err) : resolve()
            );
        });
    }
};

// ======================================================
// CREATE SUBMISSION WITH ANSWERS
//
// FIX (v2 - matches actual config/db.js):
//
// "../config/db" exports a WRAPPER OBJECT around a
// mysql2/promise pool: { pool, query, execute,
// getConnection, ... }. It has no beginTransaction /
// commit / rollback of its own — those only exist on an
// individual connection object.
//
// db.getConnection() here is an ASYNC function that
// returns a Promise<Connection> (see config/db.js) — it
// does NOT accept a callback. And because the underlying
// pool is mysql2/promise, connection.beginTransaction(),
// connection.commit(), connection.rollback(), and
// connection.query() are all Promise-based as well, not
// callback-based.
//
// This version uses async/await internally, but keeps
// the same callback(err, result) signature the rest of
// the codebase (the controller) already expects, so
// nothing else needs to change.
// ======================================================

ChecklistSubmission.create = async (

    submission,

    answers,

    callback

) => {

    let connection;

    try {

        connection = await db.getConnection();

        await connection.beginTransaction();

        // ======================================
        // INSERT SUBMISSION
        // ======================================

        const submissionSql = `

            INSERT INTO checklist_submissions

            (

                new_store_opening_id,

                checklist_type_id,

                store_id,

                submitted_by,

                submission_date,

                latitude,

                longitude,

                device,

                attachment,

                status,

                inspection_score,

                nso_status,

                processed_at,

                processed_by

            )

            VALUES

            (

                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?

            )

        `;

        const submissionValues = [

            submission.new_store_opening_id || null,

            submission.checklist_type_id,

            submission.store_id,

            submission.submitted_by || null,

            submission.submission_date,

            submission.latitude || null,

            submission.longitude || null,

            submission.device || null,

            submission.attachment || null,

            submission.status || "Submitted",

            0,

            "Closed",

            null,

            null

        ];

        const [submissionResult] = await connection.query(

            submissionSql,

            submissionValues

        );

        const submissionId = submissionResult.insertId;

        // ======================================
        // ANSWERS (if any)
        // ======================================

        if (

            answers &&

            answers.length > 0

        ) {

            const answerValues = answers.map(

                (item) => [

                    submissionId,

                    item.question_id,

                    item.answer !== undefined &&

                    item.answer !== null

                        ? String(item.answer)

                        : "",

                    item.remarks || ""

                ]

            );

            const answerSql = `

                INSERT INTO checklist_submission_answers

                (

                    submission_id,

                    question_id,

                    answer,

                    remarks

                )

                VALUES ?

            `;

            await connection.query(

                answerSql,

                [

                    answerValues

                ]

            );

        }

        await connection.commit();

        callback(

            null,

            {

                submissionId

            }

        );

    }

    catch (error) {

        if (connection) {

            try {

                await connection.rollback();

            }

            catch (rollbackError) {

                console.error(

                    "Rollback also failed:",

                    rollbackError

                );

            }

        }

        callback(error);

    }

    finally {

        if (connection) {

            connection.release();

        }

    }

};

// ======================================================
// GET ALL SUBMISSIONS
// SEARCH + PAGINATION
// ======================================================

ChecklistSubmission.getAll = (

    filters,

    callback

) => {

    let sql = `

        SELECT

            cs.id,

            cs.new_store_opening_id,

            cs.checklist_type_id,

            cs.store_id,

            cs.submitted_by,

            cs.submission_date,

            cs.latitude,

            cs.longitude,

            cs.device,

            cs.attachment,

            cs.status,

            cs.inspection_score,

            cs.nso_status,

            cs.processed_at,

            cs.processed_by,

            cs.created_at,

            cs.updated_at,

            ct.type_name AS checklist_type_name,

            nso.location AS nso_location,

            nso.city AS nso_city,

            nso.status AS nso_project_status,

            s.store_name,

            u.name AS submitted_by_name,

            pu.name AS processed_by_name,

            nso.location AS nso_location,

            nso.city AS nso_city,

            nso.status AS nso_project_status

        FROM checklist_submissions cs

        LEFT JOIN new_store_openings nso

            ON cs.new_store_opening_id = nso.id

        LEFT JOIN checklist_types ct

            ON cs.checklist_type_id = ct.id

        LEFT JOIN stores s

            ON cs.store_id = s.id

        LEFT JOIN users u

            ON cs.submitted_by = u.id

        LEFT JOIN users pu

            ON cs.processed_by = pu.id

        WHERE 1=1

    `;

    const params = [];

    // ======================================
    // SEARCH
    // ======================================

    if (filters.search) {

        sql += `

            AND

            (

                s.store_name LIKE ?

                OR ct.type_name LIKE ?

                OR cs.status LIKE ?

                OR cs.nso_status LIKE ?

                OR u.name LIKE ?

                OR pu.name LIKE ?

            )

        `;

        const search = `%${filters.search}%`;

        params.push(

            search,

            search,

            search,

            search,

            search,

            search

        );

    }

    // ======================================
    // ORDER
    // ======================================

    sql += `

        ORDER BY cs.created_at DESC

    `;

    // ======================================
    // PAGINATION
    // ======================================

    if (

        filters.page &&

        filters.limit

    ) {

        const offset =

            (

                Number(filters.page) - 1

            ) *

            Number(filters.limit);

        sql += `

            LIMIT ?

            OFFSET ?

        `;

        params.push(

            Number(filters.limit),

            offset

        );

    }

    db.query(

        sql,

        params,

        callback

    );

};







// ======================================================
// COUNT SUBMISSIONS
// ======================================================

ChecklistSubmission.countAll = (

    filters,

    callback

) => {

    let sql = `

        SELECT

            COUNT(*) AS total

        FROM checklist_submissions cs

        LEFT JOIN new_store_openings nso

            ON cs.new_store_opening_id = nso.id

        LEFT JOIN checklist_types ct

            ON cs.checklist_type_id = ct.id

        LEFT JOIN stores s

            ON cs.store_id = s.id

        LEFT JOIN users u

            ON cs.submitted_by = u.id

        LEFT JOIN users pu

            ON cs.processed_by = pu.id

        WHERE 1=1

    `;

    const params = [];

    // ======================================
    // SEARCH
    // ======================================

    if (filters.search) {

        sql += `

            AND

            (

                s.store_name LIKE ?

                OR ct.type_name LIKE ?

                OR cs.status LIKE ?

                OR cs.nso_status LIKE ?

                OR u.name LIKE ?

                OR pu.name LIKE ?

            )

        `;

        const search = `%${filters.search}%`;

        params.push(

            search,

            search,

            search,

            search,

            search,

            search

        );

    }

    db.query(

        sql,

        params,

        callback

    );

};

// ======================================================
// VERIFY NSO PROJECT
// ======================================================

ChecklistSubmission.getNewStoreOpeningById = (
    id,
    callback
) => {
    db.query(
        `SELECT id, location, city, status
         FROM new_store_openings
         WHERE id = ?
         LIMIT 1`,
        [id],
        callback
    );
};

// ======================================================
// GET SUBMISSIONS FOR AN NSO PROJECT
// ======================================================

ChecklistSubmission.getByNewStoreOpeningId = (
    newStoreOpeningId,
    callback
) => {
    const sql = `
        SELECT
            cs.*,
            ct.type_name AS checklist_type_name,
            s.store_name,
            s.city AS store_city,
            u.name AS submitted_by_name
        FROM checklist_submissions cs
        LEFT JOIN checklist_types ct ON cs.checklist_type_id = ct.id
        LEFT JOIN stores s ON cs.store_id = s.id
        LEFT JOIN users u ON cs.submitted_by = u.id
        WHERE cs.new_store_opening_id = ?
        ORDER BY cs.created_at DESC
    `;
    db.query(sql, [newStoreOpeningId], callback);
};

// ======================================================
// GET SINGLE SUBMISSION
// ======================================================

ChecklistSubmission.getById = (

    id,

    callback

) => {

    const sql = `

        SELECT

            cs.id,

            cs.new_store_opening_id,

            cs.checklist_type_id,

            cs.store_id,

            cs.submitted_by,

            cs.submission_date,

            cs.latitude,

            cs.longitude,

            cs.device,

            cs.attachment,

            cs.status,

            cs.inspection_score,

            cs.nso_status,

            cs.processed_at,

            cs.processed_by,

            cs.created_at,

            cs.updated_at,

            ct.type_name AS checklist_type_name,

            s.store_name,

            u.name AS submitted_by_name,

            pu.name AS processed_by_name

        FROM checklist_submissions cs

        LEFT JOIN checklist_types ct

            ON cs.checklist_type_id = ct.id

        LEFT JOIN stores s

            ON cs.store_id = s.id

        LEFT JOIN users u

            ON cs.submitted_by = u.id

        LEFT JOIN users pu

            ON cs.processed_by = pu.id

        WHERE cs.id = ?

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
// GET SUBMISSION ANSWERS
// ======================================================

ChecklistSubmission.getAnswers = (

    submissionId,

    callback

) => {

    const sql = `

        SELECT

            csa.*,

            q.question,

            q.sequence_no,

            q.department_id

        FROM checklist_submission_answers csa

        LEFT JOIN questions q

            ON csa.question_id = q.id

        WHERE csa.submission_id = ?

        ORDER BY q.sequence_no ASC

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
// UPDATE SUBMISSION STATUS
// ======================================================

ChecklistSubmission.updateStatus = (

    id,

    status,

    callback

) => {

    const sql = `

        UPDATE checklist_submissions

        SET

            status = ?

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
// UPDATE INSPECTION RESULT
// ======================================================

ChecklistSubmission.updateInspectionResult = (

    submissionId,

    inspectionScore,

    nsoStatus,

    processedBy,

    callback

) => {

    const sql = `

        UPDATE checklist_submissions

        SET

            inspection_score = ?,

            nso_status = ?,

            processed_at = NOW(),

            processed_by = ?

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            inspectionScore,

            nsoStatus,

            processedBy,

            submissionId

        ],

        callback

    );

};



// ======================================================
// EXPORT SUBMISSIONS
// ======================================================

ChecklistSubmission.exportData = (

    callback

) => {

    const sql = `

        SELECT

            cs.id,

            ct.type_name AS checklist_type,

            s.store_name,

            u.name AS submitted_by,

            cs.submission_date,

            cs.status,

            cs.inspection_score,

            cs.nso_status,

            cs.processed_at,

            pu.name AS processed_by,

            cs.created_at

        FROM checklist_submissions cs

        LEFT JOIN checklist_types ct

            ON cs.checklist_type_id = ct.id

        LEFT JOIN stores s

            ON cs.store_id = s.id

        LEFT JOIN users u

            ON cs.submitted_by = u.id

        LEFT JOIN users pu

            ON cs.processed_by = pu.id

        ORDER BY cs.created_at DESC

    `;

    db.query(

        sql,

        callback

    );

};

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = ChecklistSubmission;
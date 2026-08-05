const db = require("../config/db");
// ==========================================================
// GET ALL QUESTIONS
// FILTER + SEARCH
// ==========================================================

const getAllQuestions = (

    filters,

    callback

) => {

    let sql = `

        SELECT

            q.id,

            q.checklist_type_id,

            ct.checklist_name,

            q.question,

            q.sequence_no,

            q.answer_type,

            q.sla_value,

            q.sla_unit,

            q.answer_required,

            q.status,

            q.created_at,

            GROUP_CONCAT(

                DISTINCT d.department_name

                ORDER BY d.department_name

                SEPARATOR ', '

            ) AS departments,

            GROUP_CONCAT(

                DISTINCT d.id

                ORDER BY d.id

                SEPARATOR ','

            ) AS department_ids

        FROM questions q

        LEFT JOIN checklist_types ct

            ON ct.id = q.checklist_type_id

        LEFT JOIN question_departments qd

            ON q.id = qd.question_id

        LEFT JOIN departments d

            ON d.id = qd.department_id

        WHERE 1 = 1

    `;

    const values = [];

    // ==========================================
    // CHECKLIST TYPE FILTER
    // ==========================================

    if (filters.checklist_type_id) {

        sql += `

            AND q.checklist_type_id = ?

        `;

        values.push(

            filters.checklist_type_id

        );

    }

    // ==========================================
    // DEPARTMENT FILTER
    // ==========================================

    if (filters.department_id) {

        sql += `

            AND q.id IN (

                SELECT question_id

                FROM question_departments

                WHERE department_id = ?

            )

        `;

        values.push(

            filters.department_id

        );

    }

    // ==========================================
    // SEARCH
    // ==========================================

    if (filters.search) {

        sql += `

            AND (

                q.question LIKE ?

                OR ct.checklist_name LIKE ?

                OR d.department_name LIKE ?

                OR q.answer_type LIKE ?

            )

        `;

        const keyword = `%${filters.search}%`;

        values.push(

            keyword,

            keyword,

            keyword,

            keyword

        );

    }

    // ==========================================
    // GROUP BY
    // ==========================================

    sql += `

        GROUP BY

            q.id,

            q.checklist_type_id,

            ct.checklist_name,

            q.question,

            q.sequence_no,

            q.answer_type,

            q.sla_value,

            q.sla_unit,

            q.answer_required,

            q.status,

            q.created_at

        ORDER BY

            q.created_at DESC

    `;

    db.query(

        sql,

        values,

        (err, rows) => {

            if (err) return callback(err);

            rows.forEach((row) => {

                row.department_ids = row.department_ids

                    ? row.department_ids
                          .split(",")
                          .map(Number)

                    : [];

            });

            callback(

                null,

                rows

            );

        }

    );

};
// ==========================================================
// GET QUESTIONS BY CHECKLIST TYPE
// (Used in Checklist Submission)
// ==========================================================

const getQuestionsByChecklistType = (

    checklistTypeId,

    callback

) => {

    const sql = `

        SELECT

            q.id,

            q.checklist_type_id,

            q.question,

            q.sequence_no,

            q.answer_type,

            q.sla_value,

            q.sla_unit,

            q.answer_required,

            q.status

        FROM questions q

        WHERE

            q.checklist_type_id = ?

            AND q.status = 'Active'

        ORDER BY

            q.sequence_no ASC,

            q.id ASC

    `;

    db.query(

        sql,

        [

            checklistTypeId

        ],

        callback

    );

};
// ==========================================================
// GET QUESTION BY ID
// ==========================================================

const getQuestionById = (

    id,

    callback

) => {

    const sql = `

        SELECT

            q.*,

            (

                SELECT

                    GROUP_CONCAT(department_id)

                FROM question_departments

                WHERE question_id = q.id

            ) AS department_ids

        FROM questions q

        WHERE q.id = ?

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
// ==========================================================
// CREATE QUESTION
// ==========================================================

const createQuestion = (

    data,

    callback

) => {

    const sql = `

        INSERT INTO questions
        (

            checklist_type_id,

            question,

            sequence_no,

            answer_type,

            sla_value,

            sla_unit,

            answer_required,

            status

        )

        VALUES
        (

            ?, ?, ?, ?, ?, ?, ?, ?

        )

    `;

    db.query(

        sql,

        [

            data.checklist_type_id,

            data.question,

            data.sequence_no || null,

            data.answer_type,

            data.sla_value || null,

            data.sla_unit || null,

            data.answer_required ? 1 : 0,

            data.status || "Active"

        ],

        callback

    );

};
// ==========================================================
// SAVE QUESTION DEPARTMENTS
// ==========================================================

const saveDepartments = (

    questionId,

    departments,

    callback

) => {

    if (

        !departments ||

        departments.length === 0

    ) {

        return callback(null);

    }

    const values = departments.map(

        (departmentId) => [

            questionId,

            departmentId

        ]

    );

    const sql = `

        INSERT INTO question_departments
        (

            question_id,

            department_id

        )

        VALUES ?

    `;

    db.query(

        sql,

        [

            values

        ],

        callback

    );

};
// ==========================================================
// DELETE QUESTION DEPARTMENTS
// ==========================================================

const deleteDepartments = (

    questionId,

    callback

) => {

    const sql = `

        DELETE

        FROM question_departments

        WHERE question_id = ?

    `;

    db.query(

        sql,

        [

            questionId

        ],

        callback

    );

};

// ==========================================================
// UPDATE QUESTION
// ==========================================================

const updateQuestion = (

    id,

    data,

    callback

) => {

    const sql = `

        UPDATE questions

        SET

            checklist_type_id = ?,

            question = ?,

            sequence_no = ?,

            answer_type = ?,

            sla_value = ?,

            sla_unit = ?,

            answer_required = ?,

            status = ?

        WHERE id = ?

    `;

    db.query(

        sql,

        [

            data.checklist_type_id,

            data.question,

            data.sequence_no || null,

            data.answer_type,

            data.sla_value || null,

            data.sla_unit || null,

            data.answer_required ? 1 : 0,

            data.status || "Active",

            id

        ],

        callback

    );

};
// ==========================================================
// DELETE QUESTION
// ==========================================================

const deleteQuestion = (

    id,

    callback

) => {

    const sql = `

        DELETE

        FROM questions

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

// ==========================================================
// DELETE ALL QUESTIONS
// ==========================================================

const deleteAllQuestions = (

    callback

) => {

    const sql = `

        DELETE

        FROM questions

    `;

    db.query(

        sql,

        callback

    );

};

// ==========================================================
// BULK CREATE QUESTIONS
// ==========================================================

const bulkCreateQuestions = (

    questions,

    callback

) => {

    if (!questions || questions.length === 0) {

        return callback(null);

    }

    const values = questions.map((q) => [

        q.checklist_type_id,

        q.question,

        q.sequence_no || null,

        q.answer_type,

        q.sla_value || null,

        q.sla_unit || null,

        q.answer_required ? 1 : 0,

        q.status || "Active"

    ]);

    const sql = `

        INSERT INTO questions
        (

            checklist_type_id,

            question,

            sequence_no,

            answer_type,

            sla_value,

            sla_unit,

            answer_required,

            status

        )

        VALUES ?

    `;

    db.query(

        sql,

        [

            values

        ],

        callback

    );

};
// ==========================================================
// EXPORT MODEL FUNCTIONS
// ==========================================================

module.exports = {

    getAllQuestions,

    getQuestionsByChecklistType,

    getQuestionById,

    createQuestion,

    bulkCreateQuestions,

    saveDepartments,

    deleteDepartments,

    updateQuestion,

    deleteQuestion,

    deleteAllQuestions

};
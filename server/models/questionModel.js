const db = require("../config/db");

// ==========================================================
// GET ALL QUESTIONS
// ==========================================================

const getAllQuestions = (callback) => {

    const sql = `

        SELECT

            q.id,

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

            ) AS departments

        FROM questions q

        LEFT JOIN checklist_types ct

            ON ct.id = q.checklist_type_id

        LEFT JOIN question_departments qd

            ON q.id = qd.question_id

        LEFT JOIN departments d

            ON d.id = qd.department_id

        GROUP BY

            q.id,

            ct.checklist_name,

            q.question,

            q.sequence_no,

            q.answer_type,

            q.sla_value,

            q.sla_unit,

            q.answer_required,

            q.status,

            q.created_at

        ORDER BY q.created_at DESC

    `;

    db.query(

        sql,

        callback

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
// EXPORT MODEL FUNCTIONS
// ==========================================================

module.exports = {

    getAllQuestions,

    getQuestionsByChecklistType,

    getQuestionById,

    createQuestion,

    saveDepartments,

    deleteDepartments,

    updateQuestion,

    deleteQuestion,

    deleteAllQuestions

};
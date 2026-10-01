const db = require("../config/db");

// ==========================================================
// PHOTO EVIDENCE RULE PER QUESTION
// ----------------------------------------------------------
// questions.photo_requirement tells Checklist Submission when a
// question needs a picture:
//   NULL / "Auto"      → system decides (Image answer type, or the
//                        question mentions photo / picture / image)
//   "Optional"         → "Add Photo" button, not mandatory
//   "Required"         → photo must be attached
//   "Required on No"   → photo must be attached when answered "No"
//   "None"             → no photo option for this question
// ==========================================================

const PHOTO_REQUIREMENTS = ["Auto", "Optional", "Required", "Required on No", "None"];

// questions.expected_answer ('Yes' / 'No') — the normal answer of a
// Yes / No question. With Photo Evidence = Auto a photo is required
// only when the OTHER (unexpected) answer is given.
const {
    isYesNoType,
    normalizeExpectedAnswer,
    suggestExpectedAnswer
} = require("../config/checklistExpectedAnswer");

let photoRequirementReady = false;

const ensurePhotoRequirementColumn = async () => {

    const hasColumn = await new Promise((resolve, reject) => {
        db.query(
            `SHOW COLUMNS FROM questions LIKE 'photo_requirement'`,
            (err, rows) => err ? reject(err) : resolve(rows.length > 0)
        );
    });

    if (!hasColumn) {
        await new Promise((resolve, reject) => {
            db.query(
                `ALTER TABLE questions ADD COLUMN photo_requirement VARCHAR(30) NULL`,
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    const hasExpected = await new Promise((resolve, reject) => {
        db.query(
            `SHOW COLUMNS FROM questions LIKE 'expected_answer'`,
            (err, rows) => err ? reject(err) : resolve(rows.length > 0)
        );
    });

    if (!hasExpected) {
        await new Promise((resolve, reject) => {
            db.query(
                `ALTER TABLE questions ADD COLUMN expected_answer VARCHAR(5) NULL`,
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    photoRequirementReady = true;
};

// ----------------------------------------------------------
// EXPECTED ANSWER FOR EVERY EXISTING YES / NO QUESTION
// ----------------------------------------------------------
// Runs on every start but only touches Yes / No questions that do
// not have an expected answer yet (i.e. once per question):
//   • expected_answer  ← suggestion from the wording
//   • "Required on No" → expected Yes + Auto (same behaviour)
//   • "Required" that came from the default sheet list
//     (config/checklistPhotoRules.js) → Auto, so the photo is
//     needed only for the unexpected answer.
// A photo rule an admin chose by hand for other questions is kept.
const applyExpectedAnswerDefaults = async () => {

    if (!photoRequirementReady) return 0;

    const { isPhotoRequiredQuestion } = require("../config/checklistPhotoRules");

    const rows = await new Promise((resolve, reject) => {
        db.query(
            `SELECT id, question, answer_type, photo_requirement
             FROM questions
             WHERE expected_answer IS NULL OR expected_answer = ''`,
            (err, result) => err ? reject(err) : resolve(result || [])
        );
    });

    const yesNoRows = rows.filter((row) => isYesNoType(row.answer_type));

    for (const row of yesNoRows) {
        const current = String(row.photo_requirement || "").trim().toLowerCase();
        let expected = suggestExpectedAnswer(row.question);
        let photo = row.photo_requirement || null;

        if (current === "required on no") {
            expected = "Yes";
            photo = null;
        } else if (current === "required" && isPhotoRequiredQuestion(row.question)) {
            photo = null;
        }

        await new Promise((resolve, reject) => {
            db.query(
                `UPDATE questions SET expected_answer = ?, photo_requirement = ? WHERE id = ?`,
                [expected, photo, row.id],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    if (yesNoRows.length) {
        console.log(`✅ expected answer set for ${yesNoRows.length} Yes / No checklist question(s)`);
    }

    return yesNoRows.length;
};

const setExpectedAnswer = (id, value, answerType, questionText, callback = () => {}) => {

    if (!photoRequirementReady) return callback(null);

    const expected = isYesNoType(answerType)
        ? normalizeExpectedAnswer(value) || suggestExpectedAnswer(questionText)
        : null;

    db.query(
        `UPDATE questions SET expected_answer = ? WHERE id = ?`,
        [expected, id],
        (err) => callback(err || null)
    );
};

// Questions listed in config/checklistPhotoRules.js (the "Required"
// rows of the Opening / Closing checklist sheets) get
// photo_requirement = 'Required' unless an administrator has
// already chosen a setting for them.
const applyDefaultPhotoRules = async () => {

    if (!photoRequirementReady) return 0;

    // Yes / No questions first get their expected answer; they then
    // use the "photo for the unexpected answer" rule instead.
    await applyExpectedAnswerDefaults();

    const { isPhotoRequiredQuestion } = require("../config/checklistPhotoRules");

    const rows = await new Promise((resolve, reject) => {
        db.query(
            `SELECT id, question, answer_type FROM questions WHERE photo_requirement IS NULL OR photo_requirement = ''`,
            (err, result) => err ? reject(err) : resolve(result || [])
        );
    });

    const ids = rows
        .filter((row) => !isYesNoType(row.answer_type) && isPhotoRequiredQuestion(row.question))
        .map((row) => row.id);

    if (!ids.length) return 0;

    await new Promise((resolve, reject) => {
        db.query(
            `UPDATE questions SET photo_requirement = 'Required' WHERE id IN (?)`,
            [ids],
            (err) => err ? reject(err) : resolve()
        );
    });

    return ids.length;
};

const normalizePhotoRequirement = (value) => {
    const text = String(value ?? "").trim().toLowerCase();
    if (!text) return null;
    return PHOTO_REQUIREMENTS.find((item) => item.toLowerCase() === text) || null;
};

const setPhotoRequirement = (id, value, callback = () => {}) => {

    if (!photoRequirementReady || value === undefined) return callback(null);

    const normalized = normalizePhotoRequirement(value);

    db.query(
        `UPDATE questions SET photo_requirement = ? WHERE id = ?`,
        [normalized && normalized !== "Auto" ? normalized : null, id],
        (err) => callback(err || null)
    );
};
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

            ${photoRequirementReady ? "q.photo_requirement, q.expected_answer," : ""}

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

            ${photoRequirementReady ? "q.photo_requirement, q.expected_answer," : ""}

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

            ${photoRequirementReady ? "q.photo_requirement, q.expected_answer," : ""}

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

    ensurePhotoRequirementColumn,

    applyDefaultPhotoRules,

    setPhotoRequirement,

    applyExpectedAnswerDefaults,

    setExpectedAnswer,

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
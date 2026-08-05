const Question = require("../models/questionModel");

const { logActivity } = require("../utils/activityLogger");

const db = require("../config/db");

const XLSX = require("xlsx");
const csv = require("csv-parser");
const { Readable } = require("stream");
const path = require("path");
// ======================================================
// GET QUESTIONS
// If checklist_type_id is passed,
// return only that checklist's questions.
// Otherwise return all questions.
// ======================================================

exports.getQuestions = (req, res) => {

    const {

    checklist_type_id,

    department_id,

    search

} = req.query;

    // ======================================
    // CHECKLIST SUBMISSION
    // ======================================

    if (checklist_type_id) {

        return Question.getQuestionsByChecklistType(

            checklist_type_id,

            (err, rows) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: err.message

                    });

                }

                return res.status(200).json({

                    success: true,

                    data: rows

                });

            }

        );

    }

    // ======================================
    // QUESTIONS PAGE
    // ======================================

    

        Question.getAllQuestions(

    req.query,

    (err, rows) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: err.message

            });

        }

        return res.status(200).json({

            success: true,

            count: rows.length,

            data: rows

        });

    }

);

};
// ======================================================
// GET QUESTION BY ID
// ======================================================

exports.getQuestionById = (req, res) => {

    const { id } = req.params;

    Question.getQuestionById(

        id,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Question not found"

                });

            }

          const question = rows[0];

question.department_ids =

    question.department_ids

        ? question.department_ids
              .split(",")
              .map(Number)

        : [];

return res.status(200).json({

    success: true,

    data: question

});

        }

    );

};
// ======================================================
// CREATE QUESTION
// ======================================================

exports.createQuestion = (req, res) => {

    let {

        checklist_type_id,

        question,

        sequence_no,

        answer_type,

        sla_value,

        sla_unit,

        answer_required,

        status,

        departments = []

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    question = question?.trim();

    if (

        !checklist_type_id ||

        !question ||

        !answer_type

    ) {

        return res.status(400).json({

            success: false,

            message: "Checklist Type, Question and Answer Type are required."

        });

    }

    status = status || "Active";

    // ======================================
    // CREATE QUESTION
    // ======================================

    Question.createQuestion(

        {

            checklist_type_id,

            question,

            sequence_no,

            answer_type,

            sla_value,

            sla_unit,

            answer_required,

            status

        },
                (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            const questionId = result.insertId;

            // ======================================
            // SAVE DEPARTMENTS
            // ======================================

            Question.saveDepartments(

                questionId,

                departments,

                (deptErr) => {

                    if (deptErr) {

                        console.error(deptErr);

                        return res.status(500).json({

                            success: false,

                            message: deptErr.message

                        });

                    }

                    // ======================================
                    // LOG ACTIVITY
                    // ======================================

                    logActivity({

                        activity_type: "Question",

                        reference_id: questionId,

                        title: "Question Created",

                        description: `${question} question was created`,

                        module_name: "Questions",

                        status: "Open",

                        priority: "Medium",

                        created_by: req.user.id,

                        assigned_to: null

                    });

                    return res.status(201).json({

                        success: true,

                        message: "Question created successfully.",

                        id: questionId

                    });

                }

            );

        }

    );

};
// ======================================================
// UPDATE QUESTION
// ======================================================

exports.updateQuestion = (req, res) => {

    const { id } = req.params;

    let {

        checklist_type_id,

        question,

        sequence_no,

        answer_type,

        sla_value,

        sla_unit,

        answer_required,

        status,

        departments = []

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    question = question?.trim();

    if (

        !checklist_type_id ||

        !question ||

        !answer_type

    ) {

        return res.status(400).json({

            success: false,

            message: "Checklist Type, Question and Answer Type are required."

        });

    }

    status = status || "Active";

    // ======================================
    // UPDATE QUESTION
    // ======================================

    Question.updateQuestion(

        id,

        {

            checklist_type_id,

            question,

            sequence_no,

            answer_type,

            sla_value,

            sla_unit,

            answer_required,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // DELETE OLD DEPARTMENTS
            // ======================================

            Question.deleteDepartments(

                id,

                (deleteErr) => {

                    if (deleteErr) {

                        console.error(deleteErr);

                        return res.status(500).json({

                            success: false,

                            message: deleteErr.message

                        });

                    }

                    // ======================================
                    // SAVE NEW DEPARTMENTS
                    // ======================================

                    Question.saveDepartments(

                        id,

                        departments,

                        (saveErr) => {

                            if (saveErr) {

                                console.error(saveErr);

                                return res.status(500).json({

                                    success: false,

                                    message: saveErr.message

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Question",

                                reference_id: id,

                                title: "Question Updated",

                                description: `${question} question was updated`,

                                module_name: "Questions",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Question updated successfully."

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// DELETE QUESTION
// ======================================================

exports.deleteQuestion = (req, res) => {

    const { id } = req.params;

    // ======================================
    // GET QUESTION DETAILS
    // ======================================

    Question.getQuestionById(

        id,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Question not found."

                });

            }

            const questionData = rows[0];

            // ======================================
            // DELETE QUESTION DEPARTMENTS
            // ======================================

            Question.deleteDepartments(

                id,

                (deleteDeptErr) => {

                    if (deleteDeptErr) {

                        console.error(deleteDeptErr);

                        return res.status(500).json({

                            success: false,

                            message: deleteDeptErr.message

                        });

                    }

                    // ======================================
                    // DELETE QUESTION
                    // ======================================

                    Question.deleteQuestion(

                        id,

                        (deleteErr) => {

                            if (deleteErr) {

                                console.error(deleteErr);

                                return res.status(500).json({

                                    success: false,

                                    message: deleteErr.message

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Question",

                                reference_id: id,

                                title: "Question Deleted",

                                description: `${questionData.question} question was deleted`,

                                module_name: "Questions",

                                status: "Closed",

                                priority: "High",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Question deleted successfully."

                            });

                        }

                    );

                }

            );

        }

    );

};



// ======================================================
// DELETE ALL QUESTIONS
// ======================================================

exports.deleteAllQuestions = (req, res) => {

    Question.deleteAllQuestions(

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Question",

                reference_id: 0,

                title: "All Questions Deleted",

                description: "All questions were deleted from the Questions module",

                module_name: "Questions",

                status: "Closed",

                priority: "High",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.status(200).json({

                success: true,

                message: "All Questions deleted successfully."

            });

        }

    );

};
// ======================================================
// BULK UPLOAD QUESTIONS
// ======================================================

exports.bulkUploadQuestions = async (req, res) => {

    console.log("========================================");
    console.log("BULK UPLOAD QUESTIONS");
    console.log("========================================");

    console.log("Content-Type:", req.headers["content-type"]);

    console.log("req.file:", req.file);

    console.log("req.body:", req.body);

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please upload a file."

            });

        }

        const extension = path
            .extname(req.file.originalname)
            .toLowerCase();

        let rows = [];

        // =====================================
        // CSV
        // =====================================

        if (extension === ".csv") {

            rows = await new Promise((resolve, reject) => {

                const result = [];

                Readable.from(req.file.buffer)
                    .pipe(csv())
                    .on("data", (row) => result.push(row))
                    .on("end", () => resolve(result))
                    .on("error", reject);

            });

        }

        // =====================================
        // EXCEL
        // =====================================

        else {

            const workbook = XLSX.read(req.file.buffer, {

                type: "buffer"

            });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            rows = XLSX.utils.sheet_to_json(sheet);

        }

        console.log("Rows Found:", rows.length);

        console.log("First Row:", rows[0]);

        if (!rows.length) {

            return res.status(400).json({

                success: false,

                message: "No data found."

            });

        }

        for (const row of rows) {

            // =====================================
            // CHECKLIST TYPE
            // =====================================

            const [checklists] = await db.promise().query(

                `SELECT id
                 FROM checklist_types
                 WHERE checklist_name = ?`,

                [row["Checklist Type"]]

            );

            if (!checklists.length) {

                console.log(
                    "Checklist Type Not Found:",
                    row["Checklist Type"]
                );

                continue;

            }

            const checklistTypeId = checklists[0].id;

            // =====================================
            // SLA
            // =====================================

            let slaValue = null;

            let slaUnit = null;

            if (row["SLA"]) {

                const sla = String(row["SLA"])
                    .trim()
                    .split(" ");

                slaValue = sla[0];

                slaUnit = sla.slice(1).join(" ");

            }

            // =====================================
            // INSERT QUESTION
            // =====================================

            const [questionResult] = await db.promise().query(

                `INSERT INTO questions
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
                    ?,?,?,?,?,?,?,?
                )`,

                [

                    checklistTypeId,

                    row["Question"],

                    row["Sequence"],

                    row["Answer Type"],

                    slaValue,

                    slaUnit,

                    String(row["Answer Required"]).toLowerCase() === "yes"
                        ? 1
                        : 0,

                    row["Status"] || "Active"

                ]

            );

            const questionId = questionResult.insertId;

            // =====================================
            // DEPARTMENTS
            // =====================================

            if (row["Departments"]) {

                const departments = row["Departments"]
                    .split(",")
                    .map((d) => d.trim());

                for (const departmentName of departments) {

                    const [department] = await db.promise().query(

                        `SELECT id
                         FROM departments
                         WHERE department_name = ?`,

                        [departmentName]

                    );

                    if (department.length) {

                        await db.promise().query(

                            `INSERT INTO question_departments
                            (
                                question_id,
                                department_id
                            )
                            VALUES
                            (
                                ?,?
                            )`,

                            [

                                questionId,

                                department[0].id

                            ]

                        );

                    }

                }

            }

        }

        return res.status(201).json({

            success: true,

            message: "Questions uploaded successfully."

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

};
// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

exports.getQuestions = exports.getQuestions;

exports.getQuestionById = exports.getQuestionById;

exports.createQuestion = exports.createQuestion;

exports.updateQuestion = exports.updateQuestion;

exports.deleteQuestion = exports.deleteQuestion;

exports.deleteAllQuestions = exports.deleteAllQuestions;

exports.bulkUploadQuestions =
    exports.bulkUploadQuestions;
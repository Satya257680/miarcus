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

            message:
                "Checklist Type, Question and Answer Type are required."

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

                        description:
                            `${question} question was created`,

                        module_name: "Questions",

                        status: "Open",

                        priority: "Medium",

                        created_by: req.user.id,

                        assigned_to: null

                    });


                    return res.status(201).json({

                        success: true,

                        message:
                            "Question created successfully.",

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

            message:
                "Checklist Type, Question and Answer Type are required."

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

                                description:
                                    `${question} question was updated`,

                                module_name: "Questions",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });


                            return res.status(200).json({

                                success: true,

                                message:
                                    "Question updated successfully."

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

                                description:
                                    `${questionData.question} question was deleted`,

                                module_name: "Questions",

                                status: "Closed",

                                priority: "High",

                                created_by: req.user.id,

                                assigned_to: null

                            });


                            return res.status(200).json({

                                success: true,

                                message:
                                    "Question deleted successfully."

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

                description:
                    "All questions were deleted from the Questions module",

                module_name: "Questions",

                status: "Closed",

                priority: "High",

                created_by: req.user.id,

                assigned_to: null

            });


            return res.status(200).json({

                success: true,

                message:
                    "All Questions deleted successfully."

            });

        }

    );

};


// ======================================================
// BULK UPLOAD QUESTIONS
// Supports:
// .csv
// .xlsx
// .xls
// ======================================================

exports.bulkUploadQuestions = async (req, res) => {

    console.log("========================================");
    console.log("BULK UPLOAD QUESTIONS");
    console.log("========================================");

    console.log(
        "Content-Type:",
        req.headers["content-type"]
    );

    console.log(
        "File:",
        req.file
            ? req.file.originalname
            : "NO FILE"
    );

    console.log(
        "Body:",
        req.body
    );


    try {

        // =====================================
        // FILE VALIDATION
        // =====================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Please upload a file."

            });

        }


        // =====================================
        // FILE EXTENSION
        // =====================================

        const extension =
            path
                .extname(
                    req.file.originalname
                )
                .toLowerCase();


        let rows = [];


        // =====================================
        // CSV
        // =====================================

        if (extension === ".csv") {

            rows = await new Promise(
                (resolve, reject) => {

                    const result = [];

                    Readable
                        .from(req.file.buffer)

                        .pipe(csv())

                        .on(
                            "data",
                            (row) => {

                                result.push(row);

                            }
                        )

                        .on(
                            "end",
                            () => {

                                resolve(result);

                            }
                        )

                        .on(
                            "error",
                            reject
                        );

                }
            );

        }


        // =====================================
        // EXCEL
        // =====================================

        else if (

            extension === ".xlsx" ||

            extension === ".xls"

        ) {

            const workbook =
                XLSX.read(
                    req.file.buffer,
                    {
                        type: "buffer"
                    }
                );


            if (
                !workbook.SheetNames ||
                !workbook.SheetNames.length
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Excel file does not contain any worksheet."

                });

            }


            const sheet =
                workbook.Sheets[
                    workbook.SheetNames[0]
                ];


            rows =
                XLSX.utils.sheet_to_json(
                    sheet,
                    {
                        defval: ""
                    }
                );

        }


        // =====================================
        // INVALID FILE TYPE
        // =====================================

        else {

            return res.status(400).json({

                success: false,

                message:
                    "Only CSV, XLSX and XLS files are supported."

            });

        }


        // =====================================
        // DEBUG
        // =====================================

        console.log(
            "Rows Found:",
            rows.length
        );


        console.log(
            "First Row:",
            rows.length
                ? rows[0]
                : null
        );


        // =====================================
        // NO DATA
        // =====================================

        if (!rows.length) {

            return res.status(400).json({

                success: false,

                message:
                    "No data found."

            });

        }


        // =====================================
        // RESULT TRACKING
        // =====================================

        let insertedCount = 0;

        let skippedCount = 0;

        const skippedRows = [];


        // =====================================
        // PROCESS EACH ROW
        // =====================================

        for (
            const row of rows
        ) {

            try {

                // =====================================
                // CHECKLIST TYPE
                // Supports:
                //
                // Checklist Type
                // checklist_type
                // checklistType
                // =====================================

                const checklistTypeName =
                    String(

                        row["Checklist Type"] ??

                        row["checklist_type"] ??

                        row["checklistType"] ??

                        ""

                    ).trim();


                // =====================================
                // QUESTION
                // =====================================

                const questionText =
                    String(

                        row["Question"] ??

                        row["question"] ??

                        ""

                    ).trim();


                // =====================================
                // SEQUENCE
                // =====================================

                const sequenceRaw =

                    row["Sequence"] ??

                    row["sequence_no"] ??

                    row["sequence"] ??

                    null;


                let sequence = sequenceRaw;


                if (
                    sequence !== null &&
                    sequence !== undefined &&
                    String(sequence).trim() !== ""
                ) {

                    const numericSequence =
                        Number(sequence);

                    sequence =
                        Number.isNaN(
                            numericSequence
                        )
                            ? null
                            : numericSequence;

                } else {

                    sequence = null;

                }


                // =====================================
                // ANSWER TYPE
                // =====================================

                const answerType =
                    String(

                        row["Answer Type"] ??

                        row["answer_type"] ??

                        row["answerType"] ??

                        ""

                    ).trim();


                // =====================================
                // ANSWER REQUIRED
                // =====================================

                const answerRequiredValue =
                    String(

                        row["Answer Required"] ??

                        row["answer_required"] ??

                        row["answerRequired"] ??

                        ""

                    ).trim();


                // =====================================
                // STATUS
                // =====================================

                const status =
                    String(

                        row["Status"] ??

                        row["status"] ??

                        "Active"

                    ).trim() || "Active";


                // =====================================
                // DEPARTMENTS
                // =====================================

                const departmentsValue =
                    String(

                        row["Departments"] ??

                        row["departments"] ??

                        ""

                    ).trim();


                // =====================================
                // SLA
                // =====================================

                const slaRaw =

                    row["SLA"] ??

                    row["sla"] ??

                    "";


                // =====================================
                // REQUIRED FIELD VALIDATION
                // =====================================

                if (

                    !checklistTypeName ||

                    !questionText ||

                    !answerType

                ) {

                    skippedCount++;

                    skippedRows.push({

                        row: row,

                        question:
                            questionText ||
                            "Unknown",

                        reason:
                            "Checklist Type, Question or Answer Type is missing."

                    });

                    continue;

                }


                // =====================================
                // FIND CHECKLIST TYPE
                // =====================================

                const [
                    checklists
                ] = await db.query(

                    `SELECT id
                     FROM checklist_types
                     WHERE checklist_name = ?
                     LIMIT 1`,

                    [
                        checklistTypeName
                    ]

                );


                // =====================================
                // CHECKLIST NOT FOUND
                // =====================================

                if (

                    !checklists ||

                    !checklists.length

                ) {

                    console.log(
                        "Checklist Type Not Found:",
                        checklistTypeName
                    );


                    skippedCount++;


                    skippedRows.push({

                        row: row,

                        question:
                            questionText,

                        reason:
                            `Checklist Type "${checklistTypeName}" not found.`

                    });


                    continue;

                }


                const checklistTypeId =
                    checklists[0].id;


                // =====================================
                // SLA PARSING
                // Example:
                //
                // 2 Days
                // 5 Hours
                // 1 Day
                // =====================================

                let slaValue = null;

                let slaUnit = null;


                if (

                    slaRaw !== null &&

                    slaRaw !== undefined &&

                    String(slaRaw).trim() !== ""

                ) {

                    const slaParts =
                        String(slaRaw)
                            .trim()
                            .split(/\s+/);


                    slaValue =
                        slaParts[0];


                    slaUnit =
                        slaParts
                            .slice(1)
                            .join(" ") ||
                        null;

                }


                // =====================================
                // ANSWER REQUIRED PARSING
                //
                // Yes / TRUE / 1
                // = 1
                //
                // Anything else
                // = 0
                // =====================================

                const answerRequired =
                    [

                        "yes",

                        "true",

                        "1"

                    ].includes(

                        answerRequiredValue
                            .toLowerCase()

                    )
                        ? 1
                        : 0;


                // =====================================
                // INSERT QUESTION
                // =====================================

                const [
                    questionResult
                ] = await db.query(

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
                        ?, ?, ?, ?, ?, ?, ?, ?
                    )`,

                    [

                        checklistTypeId,

                        questionText,

                        sequence,

                        answerType,

                        slaValue,

                        slaUnit,

                        answerRequired,

                        status

                    ]

                );


                const questionId =
                    questionResult.insertId;


                // =====================================
                // DEPARTMENTS
                // =====================================

                if (
                    departmentsValue
                ) {

                    const departments =
                        departmentsValue

                            .split(",")

                            .map(
                                (department) =>
                                    department.trim()
                            )

                            .filter(
                                Boolean
                            );


                    // =====================================
                    // PROCESS EACH DEPARTMENT
                    // =====================================

                    for (

                        const departmentName
                        of departments

                    ) {

                        // =====================================
                        // FIND DEPARTMENT
                        // =====================================

                        const [
                            department
                        ] = await db.query(

                            `SELECT id
                             FROM departments
                             WHERE department_name = ?
                             LIMIT 1`,

                            [
                                departmentName
                            ]

                        );


                        // =====================================
                        // SAVE DEPARTMENT LINK
                        // =====================================

                        if (

                            department &&

                            department.length

                        ) {

                            await db.query(

                                `INSERT INTO question_departments
                                (
                                    question_id,
                                    department_id
                                )
                                VALUES
                                (
                                    ?, ?
                                )`,

                                [

                                    questionId,

                                    department[0].id

                                ]

                            );

                        }

                        else {

                            console.log(
                                "Department Not Found:",
                                departmentName
                            );

                        }

                    }

                }


                // =====================================
                // ACTIVITY LOG
                // =====================================

                logActivity({

                    activity_type:
                        "Question",

                    reference_id:
                        questionId,

                    title:
                        "Question Created",

                    description:
                        `${questionText} question was created through bulk upload`,

                    module_name:
                        "Questions",

                    status:
                        "Open",

                    priority:
                        "Medium",

                    created_by:
                        req.user?.id || null,

                    assigned_to:
                        null

                });


                // =====================================
                // SUCCESS
                // =====================================

                insertedCount++;


            } catch (rowError) {

                // =====================================
                // ROW ERROR
                // Do not stop entire upload
                // =====================================

                console.error(
                    "Error processing row:",
                    rowError
                );


                skippedCount++;


                skippedRows.push({

                    row: row,

                    question:
                        row["Question"] ||
                        row["question"] ||
                        "Unknown",

                    reason:
                        rowError.message

                });

            }

        }


        // =====================================
        // FINAL RESPONSE
        // =====================================

        return res.status(201).json({

            success: true,

            message:
                `Questions upload completed. ${insertedCount} inserted, ${skippedCount} skipped.`,

            insertedCount:

                insertedCount,

            skippedCount:

                skippedCount,

            skippedRows:

                skippedRows

        });


    } catch (err) {

        console.error(
            "BULK UPLOAD QUESTIONS ERROR:",
            err
        );


        return res.status(500).json({

            success: false,

            message:
                err.message

        });

    }

};


// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

exports.getQuestions =
    exports.getQuestions;

exports.getQuestionById =
    exports.getQuestionById;

exports.createQuestion =
    exports.createQuestion;

exports.updateQuestion =
    exports.updateQuestion;

exports.deleteQuestion =
    exports.deleteQuestion;

exports.deleteAllQuestions =
    exports.deleteAllQuestions;

exports.bulkUploadQuestions =
    exports.bulkUploadQuestions;
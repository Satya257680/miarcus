const Question = require("../models/questionModel");

const { logActivity } = require("../utils/activityLogger");

const db = require("../config/db");

const XLSX = require("xlsx");
const csv = require("csv-parser");
const { Readable } = require("stream");
const path = require("path");


// ======================================================
// HELPER FUNCTIONS
// ======================================================

const cleanValue = (value) => {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
};


// ======================================================
// GET QUESTIONS
// ======================================================

exports.getQuestions = (req, res) => {

    const {
        checklist_type_id,
        department_id,
        search
    } = req.query;


    // ==================================================
    // GET QUESTIONS BY CHECKLIST TYPE
    // ==================================================

    if (checklist_type_id) {

        return Question.getQuestionsByChecklistType(
            checklist_type_id,
            (err, rows) => {

                if (err) {

                    console.error(
                        "GET QUESTIONS BY CHECKLIST ERROR:",
                        err
                    );

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


    // ==================================================
    // GET ALL QUESTIONS
    // ==================================================

    Question.getAllQuestions(
        req.query,
        (err, rows) => {

            if (err) {

                console.error(
                    "GET ALL QUESTIONS ERROR:",
                    err
                );

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

    const {
        id
    } = req.params;


    Question.getQuestionById(
        id,
        (err, rows) => {

            if (err) {

                console.error(
                    "GET QUESTION ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }


            if (
                !rows ||
                rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message: "Question not found"
                });
            }


            const question = rows[0];


            if (
                question.department_ids
            ) {

                question.department_ids =
                    String(
                        question.department_ids
                    )
                        .split(",")
                        .map(Number)
                        .filter(
                            Number.isFinite
                        );

            } else {

                question.department_ids = [];

            }


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


    question =
        cleanValue(question);


    // ==================================================
    // VALIDATION
    // ==================================================

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


    status =
        cleanValue(status) ||
        "Active";


    // ==================================================
    // CREATE QUESTION
    // ==================================================

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

                console.error(
                    "CREATE QUESTION ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }


            const questionId =
                result.insertId;


            // ==================================================
            // SAVE DEPARTMENTS
            // ==================================================

            Question.saveDepartments(
                questionId,
                departments,
                (deptErr) => {

                    if (deptErr) {

                        console.error(
                            "SAVE QUESTION DEPARTMENTS ERROR:",
                            deptErr
                        );

                        return res.status(500).json({
                            success: false,
                            message: deptErr.message
                        });
                    }


                    // ==================================================
                    // ACTIVITY LOG
                    // ==================================================

                    logActivity({

                        activity_type:
                            "Question",

                        reference_id:
                            questionId,

                        title:
                            "Question Created",

                        description:
                            `${question} question was created`,

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


                    return res.status(201).json({

                        success: true,

                        message:
                            "Question created successfully.",

                        id:
                            questionId

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

    const {
        id
    } = req.params;


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


    question =
        cleanValue(question);


    // ==================================================
    // VALIDATION
    // ==================================================

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


    status =
        cleanValue(status) ||
        "Active";


    // ==================================================
    // UPDATE QUESTION
    // ==================================================

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

                console.error(
                    "UPDATE QUESTION ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }


            // ==================================================
            // DELETE OLD DEPARTMENTS
            // ==================================================

            Question.deleteDepartments(
                id,
                (deleteErr) => {

                    if (deleteErr) {

                        console.error(
                            "DELETE QUESTION DEPARTMENTS ERROR:",
                            deleteErr
                        );

                        return res.status(500).json({
                            success: false,
                            message: deleteErr.message
                        });
                    }


                    // ==================================================
                    // SAVE NEW DEPARTMENTS
                    // ==================================================

                    Question.saveDepartments(
                        id,
                        departments,
                        (saveErr) => {

                            if (saveErr) {

                                console.error(
                                    "SAVE NEW QUESTION DEPARTMENTS ERROR:",
                                    saveErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message: saveErr.message
                                });
                            }


                            // ==================================================
                            // ACTIVITY LOG
                            // ==================================================

                            logActivity({

                                activity_type:
                                    "Question",

                                reference_id:
                                    id,

                                title:
                                    "Question Updated",

                                description:
                                    `${question} question was updated`,

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

    const {
        id
    } = req.params;


    // ==================================================
    // GET QUESTION DETAILS
    // ==================================================

    Question.getQuestionById(
        id,
        (err, rows) => {

            if (err) {

                console.error(
                    "GET QUESTION BEFORE DELETE ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }


            if (
                !rows ||
                rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Question not found."
                });
            }


            const questionData =
                rows[0];


            // ==================================================
            // DELETE QUESTION DEPARTMENTS
            // ==================================================

            Question.deleteDepartments(
                id,
                (deleteDeptErr) => {

                    if (deleteDeptErr) {

                        console.error(
                            "DELETE QUESTION DEPARTMENT ERROR:",
                            deleteDeptErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                deleteDeptErr.message
                        });
                    }


                    // ==================================================
                    // DELETE QUESTION
                    // ==================================================

                    Question.deleteQuestion(
                        id,
                        (deleteErr) => {

                            if (deleteErr) {

                                console.error(
                                    "DELETE QUESTION ERROR:",
                                    deleteErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        deleteErr.message
                                });
                            }


                            // ==================================================
                            // ACTIVITY LOG
                            // ==================================================

                            logActivity({

                                activity_type:
                                    "Question",

                                reference_id:
                                    id,

                                title:
                                    "Question Deleted",

                                description:
                                    `${questionData.question} question was deleted`,

                                module_name:
                                    "Questions",

                                status:
                                    "Closed",

                                priority:
                                    "High",

                                created_by:
                                    req.user?.id || null,

                                assigned_to:
                                    null

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

                console.error(
                    "DELETE ALL QUESTIONS ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }


            // ==================================================
            // ACTIVITY LOG
            // ==================================================

            logActivity({

                activity_type:
                    "Question",

                reference_id:
                    0,

                title:
                    "All Questions Deleted",

                description:
                    "All questions were deleted from the Questions module",

                module_name:
                    "Questions",

                status:
                    "Closed",

                priority:
                    "High",

                created_by:
                    req.user?.id || null,

                assigned_to:
                    null

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
//
// Supports:
// CSV
// XLSX
// XLS
// ======================================================

exports.bulkUploadQuestions = async (
    req,
    res
) => {

    console.log("");
    console.log(
        "=========================================="
    );
    console.log(
        "BULK UPLOAD QUESTIONS STARTED"
    );
    console.log(
        "=========================================="
    );


    try {

        // ==================================================
        // FILE VALIDATION
        // ==================================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Please upload a file."

            });

        }


        console.log(
            "Uploaded File:",
            req.file.originalname
        );


        // ==================================================
        // FILE EXTENSION
        // ==================================================

        const extension =
            path
                .extname(
                    req.file.originalname
                )
                .toLowerCase();


        let rows = [];


        // ==================================================
        // READ CSV
        // ==================================================

        if (
            extension === ".csv"
        ) {

            rows =
                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {

                        const result = [];


                        Readable
                            .from(
                                req.file.buffer
                            )
                            .pipe(
                                csv()
                            )
                            .on(
                                "data",
                                (row) => {

                                    result.push(
                                        row
                                    );

                                }
                            )
                            .on(
                                "end",
                                () => {

                                    resolve(
                                        result
                                    );

                                }
                            )
                            .on(
                                "error",
                                reject
                            );

                    }
                );

        }


        // ==================================================
        // READ EXCEL
        // ==================================================

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


        // ==================================================
        // INVALID FILE
        // ==================================================

        else {

            return res.status(400).json({

                success: false,

                message:
                    "Only CSV, XLSX and XLS files are supported."

            });

        }


        console.log(
            "Rows Found:",
            rows.length
        );


        // ==================================================
        // NO DATA
        // ==================================================

        if (
            !rows.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "No data found in uploaded file."

            });

        }


        console.log(
            "First Row:",
            rows[0]
        );


        // ==================================================
        // RESULT COUNTERS
        // ==================================================

        let insertedCount = 0;

        let skippedCount = 0;

        const skippedRows = [];


        // ==================================================
        // PROCESS EVERY ROW
        // ==================================================

        for (
            let index = 0;
            index < rows.length;
            index++
        ) {

            const row =
                rows[index];


            const excelRowNumber =
                index + 2;


            try {

                console.log("");
                console.log(
                    "------------------------------------------"
                );

                console.log(
                    `Processing CSV row ${excelRowNumber}`
                );


                // ==================================================
                // NORMALIZE HEADER NAMES
                // ==================================================

                const normalizedRow = {};


                Object.keys(row)
                    .forEach(
                        (key) => {

                            normalizedRow[
                                cleanValue(key)
                                    .toLowerCase()
                                    .replace(
                                        /\s+/g,
                                        ""
                                    )
                            ] =
                                row[key];

                        }
                    );


                // ==================================================
                // CHECKLIST TYPE
                //
                // Supports:
                //
                // Checklist Type
                // checklist_type
                // checklistType
                // checklistTypeName
                // ==================================================

                const checklistTypeName =
                    cleanValue(

                        row["Checklist Type"] ??
                        row["checklist_type"] ??
                        row["checklistType"] ??
                        row["checklistTypeName"] ??

                        normalizedRow["checklisttype"] ??
                        normalizedRow["checklist_type"] ??
                        normalizedRow["checklisttypename"]

                    );


                // ==================================================
                // QUESTION
                //
                // Supports:
                //
                // Question
                // question
                // questionText
                // ==================================================

                const questionText =
                    cleanValue(

                        row["Question"] ??
                        row["question"] ??
                        row["questionText"] ??

                        normalizedRow["question"] ??
                        normalizedRow["questiontext"]

                    );


                // ==================================================
                // SEQUENCE
                // ==================================================

                const sequenceRaw =

                    row["Sequence"] ??
                    row["sequence_no"] ??
                    row["sequence"] ??

                    normalizedRow["sequence"] ??
                    normalizedRow["sequenceno"] ??

                    null;


                let sequence = null;


                if (
                    sequenceRaw !== null &&
                    sequenceRaw !== undefined &&
                    cleanValue(
                        sequenceRaw
                    ) !== ""
                ) {

                    const numericSequence =
                        Number(
                            sequenceRaw
                        );


                    if (
                        Number.isFinite(
                            numericSequence
                        )
                    ) {

                        sequence =
                            numericSequence;

                    }

                }


                // ==================================================
                // ANSWER TYPE
                // ==================================================

                const answerType =
                    cleanValue(

                        row["Answer Type"] ??
                        row["answer_type"] ??
                        row["answerType"] ??

                        normalizedRow["answertype"] ??
                        normalizedRow["answer_type"]

                    );


                // ==================================================
                // ANSWER REQUIRED
                // ==================================================

                const answerRequiredValue =
                    cleanValue(

                        row["Answer Required"] ??
                        row["answer_required"] ??
                        row["answerRequired"] ??

                        normalizedRow["answerrequired"] ??
                        normalizedRow["answer_required"]

                    );


                // ==================================================
                // STATUS
                // ==================================================

                const status =
                    cleanValue(

                        row["Status"] ??
                        row["status"] ??

                        normalizedRow["status"]

                    ) || "Active";


                // ==================================================
                // DEPARTMENTS
                // ==================================================

                const departmentsValue =
                    cleanValue(

                        row["Departments"] ??
                        row["departments"] ??

                        normalizedRow["departments"]

                    );


                // ==================================================
                // SLA
                // ==================================================

                const slaRaw =
                    cleanValue(

                        row["SLA"] ??
                        row["sla"] ??

                        normalizedRow["sla"]

                    );


                console.log(
                    "Checklist Type:",
                    checklistTypeName
                );

                console.log(
                    "Question:",
                    questionText
                );

                console.log(
                    "Answer Type:",
                    answerType
                );

                console.log(
                    "Departments:",
                    departmentsValue
                );


                // ==================================================
                // REQUIRED FIELD VALIDATION
                // ==================================================

                if (
                    !checklistTypeName ||
                    !questionText ||
                    !answerType
                ) {

                    skippedCount++;


                    skippedRows.push({

                        rowNumber:
                            excelRowNumber,

                        checklistType:
                            checklistTypeName,

                        question:
                            questionText,

                        reason:
                            "Checklist Type, Question or Answer Type is missing."

                    });


                    console.log(
                        "SKIPPED: Required field missing"
                    );


                    continue;

                }


                // ==================================================
                // FIND CHECKLIST TYPE
                //
                // IMPORTANT:
                // Database column:
                // checklist_types.checklist_name
                // ==================================================

                let checklists = [];


                [
                    checklists
                ] = await db.query(

                    `SELECT id
                     FROM checklist_types
                     WHERE LOWER(TRIM(checklist_name)) =
                           LOWER(TRIM(?))
                     LIMIT 1`,

                    [
                        checklistTypeName
                    ]

                );


                // ==================================================
                // CHECKLIST TYPE NOT FOUND
                // ==================================================

                if (
                    !checklists ||
                    !checklists.length
                ) {

                    skippedCount++;


                    skippedRows.push({

                        rowNumber:
                            excelRowNumber,

                        checklistType:
                            checklistTypeName,

                        question:
                            questionText,

                        reason:
                            `Checklist Type "${checklistTypeName}" not found in checklist_types table.`

                    });


                    console.log(
                        "SKIPPED: Checklist type not found:",
                        checklistTypeName
                    );


                    continue;

                }


                const checklistTypeId =
                    checklists[0].id;


                console.log(
                    "Checklist Type ID:",
                    checklistTypeId
                );


                // ==================================================
                // DUPLICATE CHECK
                //
                // Prevent uploading the same question twice.
                // ==================================================

                let existingQuestions = [];


                [
                    existingQuestions
                ] = await db.query(

                    `SELECT id
                     FROM questions
                     WHERE checklist_type_id = ?
                       AND LOWER(TRIM(question)) =
                           LOWER(TRIM(?))
                     LIMIT 1`,

                    [
                        checklistTypeId,
                        questionText
                    ]

                );


                if (
                    existingQuestions &&
                    existingQuestions.length
                ) {

                    skippedCount++;


                    skippedRows.push({

                        rowNumber:
                            excelRowNumber,

                        checklistType:
                            checklistTypeName,

                        question:
                            questionText,

                        reason:
                            `Question already exists with ID ${existingQuestions[0].id}.`

                    });


                    console.log(
                        "SKIPPED: Duplicate question:",
                        questionText
                    );


                    continue;

                }


                // ==================================================
                // SLA PARSING
                //
                // Examples:
                //
                // 2 Days
                // 5 Hours
                // 1 Day
                // ==================================================

                let slaValue = null;

                let slaUnit = null;


                if (
                    slaRaw
                ) {

                    const slaParts =
                        String(
                            slaRaw
                        )
                            .trim()
                            .split(
                                /\s+/
                            );


                    slaValue =
                        slaParts[0] ||
                        null;


                    slaUnit =
                        slaParts
                            .slice(1)
                            .join(" ") ||
                        null;

                }


                // ==================================================
                // ANSWER REQUIRED
                // ==================================================

                const answerRequired =
                    [

                        "yes",

                        "true",

                        "1",

                        "required"

                    ].includes(

                        answerRequiredValue
                            .toLowerCase()

                    )
                        ? 1
                        : 0;


                // ==================================================
                // INSERT QUESTION
                //
                // IMPORTANT:
                // Question insertion happens before departments.
                // Department problems will NOT make the question
                // itself count as skipped.
                // ==================================================

                let questionResult;


                [
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


                if (
                    !questionId
                ) {

                    throw new Error(
                        "Question was not inserted. No insert ID returned."
                    );

                }


                console.log(
                    "QUESTION INSERTED:",
                    questionId
                );


                // ==================================================
                // DEPARTMENTS
                //
                // IMPORTANT:
                //
                // Department is optional.
                //
                // If a department name does not exist,
                // we simply log it and continue.
                //
                // It will NOT cause the question to be skipped.
                // ==================================================

                let departmentWarnings = [];


                if (
                    departmentsValue
                ) {

                    const departments =
                        departmentsValue
                            .split(",")
                            .map(
                                (
                                    department
                                ) =>
                                    cleanValue(
                                        department
                                    )
                            )
                            .filter(
                                Boolean
                            );


                    // ==================================================
                    // PROCESS EACH DEPARTMENT
                    // ==================================================

                    for (
                        const departmentName
                        of departments
                    ) {

                        try {

                            let departmentRows = [];


                            [
                                departmentRows
                            ] = await db.query(

                                `SELECT id
                                 FROM departments
                                 WHERE LOWER(TRIM(department_name)) =
                                       LOWER(TRIM(?))
                                 LIMIT 1`,

                                [
                                    departmentName
                                ]

                            );


                            // ==================================================
                            // DEPARTMENT NOT FOUND
                            // ==================================================

                            if (
                                !departmentRows ||
                                !departmentRows.length
                            ) {

                                console.log(
                                    "Department Not Found:",
                                    departmentName
                                );


                                departmentWarnings.push(
                                    `Department "${departmentName}" not found`
                                );


                                continue;

                            }


                            const departmentId =
                                departmentRows[0].id;


                            // ==================================================
                            // CHECK EXISTING LINK
                            // ==================================================

                            let existingLink = [];


                            [
                                existingLink
                            ] = await db.query(

                                `SELECT question_id
                                 FROM question_departments
                                 WHERE question_id = ?
                                   AND department_id = ?
                                 LIMIT 1`,

                                [

                                    questionId,

                                    departmentId

                                ]

                            );


                            if (
                                existingLink &&
                                existingLink.length
                            ) {

                                console.log(
                                    "Department link already exists:",
                                    departmentName
                                );


                                continue;

                            }


                            // ==================================================
                            // INSERT DEPARTMENT LINK
                            // ==================================================

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

                                    departmentId

                                ]

                            );


                            console.log(
                                "Department linked:",
                                departmentName
                            );

                        } catch (
                            departmentError
                        ) {

                            // ==================================================
                            // DEPARTMENT ERROR
                            //
                            // Do NOT fail the question.
                            // ==================================================

                            console.error(

                                `Department error for "${departmentName}":`,

                                departmentError

                            );


                            departmentWarnings.push(

                                `Department "${departmentName}" could not be linked: ${departmentError.message}`

                            );

                        }

                    }

                }


                // ==================================================
                // ACTIVITY LOG
                // ==================================================

                try {

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

                } catch (
                    activityError
                ) {

                    // Activity logging must NOT
                    // make a successful question
                    // become a skipped row.

                    console.error(
                        "Activity log error:",
                        activityError
                    );

                }


                // ==================================================
                // SUCCESS
                // ==================================================

                insertedCount++;


                console.log(
                    "SUCCESS ROW:",
                    excelRowNumber
                );


                if (
                    departmentWarnings.length
                ) {

                    console.log(
                        "Department warnings:",
                        departmentWarnings
                    );

                }

            } catch (
                rowError
            ) {

                // ==================================================
                // ROW ERROR
                //
                // Only actual question-level errors reach here.
                // ==================================================

                console.error(
                    `Error processing row ${excelRowNumber}:`,
                    rowError
                );


                skippedCount++;


                skippedRows.push({

                    rowNumber:
                        excelRowNumber,

                    checklistType:
                        cleanValue(

                            row["Checklist Type"] ??
                            row["checklist_type"] ??
                            row["checklistType"] ??
                            row["checklistTypeName"] ??

                            ""

                        ),

                    question:
                        cleanValue(

                            row["Question"] ??
                            row["question"] ??
                            row["questionText"] ??

                            ""

                        ),

                    reason:
                        rowError.message ||
                        "Unknown row processing error."

                });

            }

        }


        // ==================================================
        // FINAL RESPONSE
        // ==================================================

        console.log("");
        console.log(
            "=========================================="
        );

        console.log(
            "QUESTION BULK UPLOAD FINISHED"
        );

        console.log(
            "Total:",
            rows.length
        );

        console.log(
            "Inserted:",
            insertedCount
        );

        console.log(
            "Skipped:",
            skippedCount
        );

        console.log(
            "=========================================="
        );


        return res.status(201).json({

            success: true,

            message:
                `Questions upload completed. ${insertedCount} inserted, ${skippedCount} skipped.`,

            totalRecords:
                rows.length,

            insertedCount:
                insertedCount,

            skippedCount:
                skippedCount,

            skippedRows:
                skippedRows

        });

    } catch (
        error
    ) {

        console.error("");
        console.error(
            "=========================================="
        );

        console.error(
            "QUESTION BULK UPLOAD FAILED"
        );

        console.error(
            error
        );

        console.error(
            "=========================================="
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Question bulk upload failed."

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
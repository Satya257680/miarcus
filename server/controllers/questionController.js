const Question = require("../models/questionModel");
const { logActivity } = require("../utils/activityLogger");
const db = require("../config/db");

const XLSX = require("xlsx");
const csv = require("csv-parser");
const { Readable } = require("stream");
const path = require("path");

// ======================================================
// SMALL HELPERS
// ======================================================

const cleanValue = (value) => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
};


const normalizeHeader = (value) => {
    return cleanValue(value)
        .replace(/^\uFEFF/, "")
        .trim();
};


const isTrueValue = (value) => {

    const normalized = cleanValue(value).toLowerCase();

    return [
        "yes",
        "true",
        "1",
        "y",
        "required"
    ].includes(normalized);

};


const isEmptyValue = (value) => {

    return (
        value === null ||
        value === undefined ||
        cleanValue(value) === ""
    );

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

    // ==========================================
    // CHECKLIST SUBMISSION
    // ==========================================

    if (checklist_type_id) {

        return Question.getQuestionsByChecklistType(

            checklist_type_id,

            (err, rows) => {

                if (err) {

                    console.error(
                        "getQuestionsByChecklistType error:",
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


    // ==========================================
    // QUESTIONS MANAGEMENT PAGE
    // ==========================================

    Question.getAllQuestions(

        req.query,

        (err, rows) => {

            if (err) {

                console.error(
                    "getAllQuestions error:",
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

    const { id } = req.params;

    Question.getQuestionById(

        id,

        (err, rows) => {

            if (err) {

                console.error(
                    "getQuestionById error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }


            if (!rows || rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Question not found"

                });

            }


            const question = rows[0];


            question.department_ids =
                question.department_ids

                    ? String(question.department_ids)
                        .split(",")
                        .map(Number)
                        .filter(Boolean)

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


    question = cleanValue(question);

    answer_type = cleanValue(answer_type);

    status =
        cleanValue(status) || "Active";


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


    // ==========================================
    // NORMALIZE DEPARTMENTS
    // ==========================================

    if (!Array.isArray(departments)) {

        if (typeof departments === "string") {

            departments =
                departments
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

        } else {

            departments = [];

        }

    }


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
                    "createQuestion error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }


            const questionId =
                result.insertId;


            Question.saveDepartments(

                questionId,

                departments,

                (deptErr) => {

                    if (deptErr) {

                        console.error(
                            "saveDepartments error:",
                            deptErr
                        );

                        return res.status(500).json({

                            success: false,

                            message: deptErr.message

                        });

                    }


                    // ==========================================
                    // ACTIVITY LOG
                    // ==========================================

                    try {

                        logActivity({

                            activity_type: "Question",

                            reference_id: questionId,

                            title: "Question Created",

                            description:
                                `${question} question was created`,

                            module_name: "Questions",

                            status: "Open",

                            priority: "Medium",

                            created_by:
                                req.user?.id || null,

                            assigned_to: null

                        });

                    } catch (logError) {

                        console.error(
                            "Activity log error:",
                            logError
                        );

                    }


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


    question = cleanValue(question);

    answer_type = cleanValue(answer_type);

    status =
        cleanValue(status) || "Active";


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


    if (!Array.isArray(departments)) {

        if (typeof departments === "string") {

            departments =
                departments
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

        } else {

            departments = [];

        }

    }


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
                    "updateQuestion error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }


            Question.deleteDepartments(

                id,

                (deleteErr) => {

                    if (deleteErr) {

                        console.error(
                            "deleteDepartments error:",
                            deleteErr
                        );

                        return res.status(500).json({

                            success: false,

                            message: deleteErr.message

                        });

                    }


                    Question.saveDepartments(

                        id,

                        departments,

                        (saveErr) => {

                            if (saveErr) {

                                console.error(
                                    "saveDepartments error:",
                                    saveErr
                                );

                                return res.status(500).json({

                                    success: false,

                                    message: saveErr.message

                                });

                            }


                            try {

                                logActivity({

                                    activity_type: "Question",

                                    reference_id: id,

                                    title: "Question Updated",

                                    description:
                                        `${question} question was updated`,

                                    module_name: "Questions",

                                    status: "Open",

                                    priority: "Medium",

                                    created_by:
                                        req.user?.id || null,

                                    assigned_to: null

                                });

                            } catch (logError) {

                                console.error(
                                    "Activity log error:",
                                    logError
                                );

                            }


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


    Question.getQuestionById(

        id,

        (err, rows) => {

            if (err) {

                console.error(
                    "getQuestionById error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }


            if (!rows || rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Question not found."

                });

            }


            const questionData =
                rows[0];


            Question.deleteDepartments(

                id,

                (deleteDeptErr) => {

                    if (deleteDeptErr) {

                        console.error(
                            "deleteDepartments error:",
                            deleteDeptErr
                        );

                        return res.status(500).json({

                            success: false,

                            message: deleteDeptErr.message

                        });

                    }


                    Question.deleteQuestion(

                        id,

                        (deleteErr) => {

                            if (deleteErr) {

                                console.error(
                                    "deleteQuestion error:",
                                    deleteErr
                                );

                                return res.status(500).json({

                                    success: false,

                                    message: deleteErr.message

                                });

                            }


                            try {

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

                            } catch (logError) {

                                console.error(
                                    "Activity log error:",
                                    logError
                                );

                            }


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
                    "deleteAllQuestions error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }


            try {

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

            } catch (logError) {

                console.error(
                    "Activity log error:",
                    logError
                );

            }


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
// CSV FORMAT:
//
// checklistTypeName
// questionText
// answerType
// commentRuleType
// answerRequired
// attachmentRuleType
// actionPointRuleType
// actionPointComparisonValue
// allowDuplicateActionPoints
// slaValue
// slaUnit
// actionDepartments
// questionDepartmentName
// linkedChecklistTypeName
// linkedQuestionText
// comparisonType
// linkedQuestionDateOffset
// sequence
//
// XLSX / XLS ALSO SUPPORTED
// ======================================================

exports.bulkUploadQuestions = async (req, res) => {

    console.log("");
    console.log("==========================================");
    console.log("QUESTION BULK UPLOAD STARTED");
    console.log("==========================================");


    try {

        // ==================================================
        // FILE VALIDATION
        // ==================================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Please upload a CSV, XLSX or XLS file."

            });

        }


        console.log(
            "File:",
            req.file.originalname
        );

        console.log(
            "Size:",
            req.file.size
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
        // CSV
        // ==================================================

        if (extension === ".csv") {

            rows = await new Promise(
                (resolve, reject) => {

                    const parsedRows = [];


                    Readable
                        .from(req.file.buffer)

                        .pipe(
                            csv({
                                mapHeaders: ({
                                    header
                                }) => {

                                    return normalizeHeader(
                                        header
                                    );

                                }
                            })
                        )

                        .on(
                            "data",
                            (row) => {

                                parsedRows.push(row);

                            }
                        )

                        .on(
                            "end",
                            () => {

                                resolve(
                                    parsedRows
                                );

                            }
                        )

                        .on(
                            "error",
                            (error) => {

                                reject(error);

                            }
                        );

                }
            );

        }


        // ==================================================
        // XLSX / XLS
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

                workbook.SheetNames.length === 0

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Excel file does not contain a worksheet."

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
        // INVALID EXTENSION
        // ==================================================

        else {

            return res.status(400).json({

                success: false,

                message:
                    "Only CSV, XLSX and XLS files are supported."

            });

        }


        console.log(
            "Rows found:",
            rows.length
        );


        // ==================================================
        // NO ROWS
        // ==================================================

        if (!rows.length) {

            return res.status(400).json({

                success: false,

                message:
                    "The uploaded file contains no data."

            });

        }


        // ==================================================
        // SHOW HEADERS
        // ==================================================

        console.log(
            "CSV/Excel Headers:",
            Object.keys(rows[0])
        );


        // ==================================================
        // COUNTERS
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

            const row = rows[index];

            const excelRowNumber =
                index + 2;


            try {

                // ==================================================
                // ACTUAL CSV COLUMN NAMES
                // ==================================================

                const checklistTypeName =
                    cleanValue(
                        row["checklistTypeName"]
                    );


                const questionText =
                    cleanValue(
                        row["questionText"]
                    );


                const answerType =
                    cleanValue(
                        row["answerType"]
                    );


                const answerRequiredRaw =
                    row["answerRequired"];


                const slaValueRaw =
                    row["slaValue"];


                const slaUnit =
                    cleanValue(
                        row["slaUnit"]
                    );


                const sequenceRaw =
                    row["sequence"];


                const questionDepartmentName =
                    cleanValue(
                        row["questionDepartmentName"]
                    );


                // ==================================================
                // OPTIONAL RULE FIELDS
                //
                // We read these fields so they are not lost from
                // the uploaded row.
                //
                // They are NOT inserted into questions because the
                // current questions table/model does not contain
                // these columns.
                // ==================================================

                const commentRuleType =
                    cleanValue(
                        row["commentRuleType"]
                    );


                const attachmentRuleType =
                    cleanValue(
                        row["attachmentRuleType"]
                    );


                const actionPointRuleType =
                    cleanValue(
                        row["actionPointRuleType"]
                    );


                const actionPointComparisonValue =
                    cleanValue(
                        row["actionPointComparisonValue"]
                    );


                const allowDuplicateActionPoints =
                    cleanValue(
                        row["allowDuplicateActionPoints"]
                    );


                const actionDepartments =
                    cleanValue(
                        row["actionDepartments"]
                    );


                const linkedChecklistTypeName =
                    cleanValue(
                        row["linkedChecklistTypeName"]
                    );


                const linkedQuestionText =
                    cleanValue(
                        row["linkedQuestionText"]
                    );


                const comparisonType =
                    cleanValue(
                        row["comparisonType"]
                    );


                const linkedQuestionDateOffset =
                    cleanValue(
                        row["linkedQuestionDateOffset"]
                    );


                // Prevent unused-variable issues while keeping
                // the CSV fields available for future rule linking.
                void commentRuleType;
                void attachmentRuleType;
                void actionPointRuleType;
                void actionPointComparisonValue;
                void allowDuplicateActionPoints;
                void actionDepartments;
                void linkedChecklistTypeName;
                void linkedQuestionText;
                void comparisonType;
                void linkedQuestionDateOffset;


                // ==================================================
                // REQUIRED FIELD VALIDATION
                // ==================================================

                if (!checklistTypeName) {

                    skippedCount++;

                    skippedRows.push({

                        rowNumber:
                            excelRowNumber,

                        question:
                            questionText,

                        reason:
                            "checklistTypeName is missing."

                    });

                    continue;

                }


                if (!questionText) {

                    skippedCount++;

                    skippedRows.push({

                        rowNumber:
                            excelRowNumber,

                        question:
                            "Unknown",

                        reason:
                            "questionText is missing."

                    });

                    continue;

                }


                if (!answerType) {

                    skippedCount++;

                    skippedRows.push({

                        rowNumber:
                            excelRowNumber,

                        question:
                            questionText,

                        reason:
                            "answerType is missing."

                    });

                    continue;

                }


                // ==================================================
                // FIND CHECKLIST TYPE
                //
                // We support:
                // 1. Numeric ID
                // 2. checklist_name
                // 3. checklist_type_name
                // 4. name
                // ==================================================

                let checklistRows = [];


                if (
                    /^\d+$/.test(
                        checklistTypeName
                    )
                ) {

                    const [
                        rowsById
                    ] = await db.query(

                        `SELECT id
                         FROM checklist_types
                         WHERE id = ?
                         LIMIT 1`,

                        [
                            Number(
                                checklistTypeName
                            )
                        ]

                    );


                    checklistRows =
                        rowsById;

                }


                if (
                    !checklistRows.length
                ) {

                    const [
                        rowsByName
                    ] = await db.query(

                        `SELECT id
                         FROM checklist_types
                         WHERE
                            checklist_name = ?
                            OR checklist_type_name = ?
                            OR name = ?
                         LIMIT 1`,

                        [

                            checklistTypeName,

                            checklistTypeName,

                            checklistTypeName

                        ]

                    );


                    checklistRows =
                        rowsByName;

                }


                // ==================================================
                // CHECKLIST NOT FOUND
                // ==================================================

                if (
                    !checklistRows.length
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
                            `Checklist Type "${checklistTypeName}" was not found in checklist_types.`

                    });

                    continue;

                }


                const checklistTypeId =
                    checklistRows[0].id;


                // ==================================================
                // SEQUENCE
                // ==================================================

                let sequenceNo = null;


                if (
                    !isEmptyValue(
                        sequenceRaw
                    )
                ) {

                    const parsedSequence =
                        Number(
                            sequenceRaw
                        );


                    if (
                        !Number.isNaN(
                            parsedSequence
                        )
                    ) {

                        sequenceNo =
                            parsedSequence;

                    }

                }


                // ==================================================
                // SLA
                // ==================================================

                let slaValue = null;


                if (
                    !isEmptyValue(
                        slaValueRaw
                    )
                ) {

                    const parsedSla =
                        Number(
                            slaValueRaw
                        );


                    if (
                        !Number.isNaN(
                            parsedSla
                        )
                    ) {

                        slaValue =
                            parsedSla;

                    } else {

                        slaValue =
                            cleanValue(
                                slaValueRaw
                            );

                    }

                }


                // ==================================================
                // ANSWER REQUIRED
                // ==================================================

                const answerRequired =
                    isTrueValue(
                        answerRequiredRaw
                    )
                        ? 1
                        : 0;


                // ==================================================
                // STATUS
                // ==================================================

                const status =
                    "Active";


                // ==================================================
                // INSERT QUESTION
                // ==================================================

                const [
                    insertResult
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
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )`,

                    [

                        checklistTypeId,

                        questionText,

                        sequenceNo,

                        answerType,

                        slaValue,

                        slaUnit || null,

                        answerRequired,

                        status

                    ]

                );


                const questionId =
                    insertResult.insertId;


                // ==================================================
                // DEPARTMENT LINK
                //
                // questionDepartmentName can be:
                //
                // "Safety"
                // "Safety, Operations"
                // "3"
                // ==================================================

                if (
                    questionDepartmentName
                ) {

                    const departmentNames =
                        questionDepartmentName
                            .split(",")
                            .map(
                                (item) =>
                                    item.trim()
                            )
                            .filter(Boolean);


                    for (
                        const departmentValue
                        of departmentNames
                    ) {

                        let departmentRows =
                            [];


                        // ==========================================
                        // DEPARTMENT ID
                        // ==========================================

                        if (
                            /^\d+$/.test(
                                departmentValue
                            )
                        ) {

                            const [
                                rowsById
                            ] = await db.query(

                                `SELECT id
                                 FROM departments
                                 WHERE id = ?
                                 LIMIT 1`,

                                [
                                    Number(
                                        departmentValue
                                    )
                                ]

                            );


                            departmentRows =
                                rowsById;

                        }


                        // ==========================================
                        // DEPARTMENT NAME
                        // ==========================================

                        if (
                            !departmentRows.length
                        ) {

                            const [
                                rowsByName
                            ] = await db.query(

                                `SELECT id
                                 FROM departments
                                 WHERE
                                    department_name = ?
                                    OR name = ?
                                 LIMIT 1`,

                                [

                                    departmentValue,

                                    departmentValue

                                ]

                            );


                            departmentRows =
                                rowsByName;

                        }


                        // ==========================================
                        // INSERT LINK
                        // ==========================================

                        if (
                            departmentRows.length
                        ) {

                            await db.query(

                                `INSERT INTO question_departments
                                (
                                    question_id,
                                    department_id
                                )
                                VALUES
                                (
                                    ?,
                                    ?
                                )`,

                                [

                                    questionId,

                                    departmentRows[0].id

                                ]

                            );

                        } else {

                            console.warn(

                                `Row ${excelRowNumber}: Department "${departmentValue}" not found.`

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

                } catch (logError) {

                    console.error(
                        "Activity log error:",
                        logError
                    );

                }


                // ==================================================
                // INSERT SUCCESS
                // ==================================================

                insertedCount++;


            } catch (rowError) {

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
                            row["checklistTypeName"]
                        ),

                    question:
                        cleanValue(
                            row["questionText"]
                        ),

                    reason:
                        rowError.message

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


    } catch (error) {

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
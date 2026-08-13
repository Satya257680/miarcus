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

    void department_id;
    void search;

    // ==================================================
    // CHECKLIST SUBMISSION
    // ==================================================

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

    // ==================================================
    // QUESTIONS MANAGEMENT PAGE
    // ==================================================

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
    status = cleanValue(status) || "Active";

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

    // ==================================================
    // NORMALIZE DEPARTMENTS
    // ==================================================

    if (!Array.isArray(departments)) {

        if (typeof departments === "string") {

            departments = departments
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

        } else {

            departments = [];
        }
    }

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
                    "createQuestion error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            const questionId = result.insertId;

            // ==================================================
            // SAVE DEPARTMENTS
            // ==================================================

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

                    // ==================================================
                    // ACTIVITY LOG
                    // ==================================================

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
    status = cleanValue(status) || "Active";

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

    // ==================================================
    // NORMALIZE DEPARTMENTS
    // ==================================================

    if (!Array.isArray(departments)) {

        if (typeof departments === "string") {

            departments = departments
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

        } else {

            departments = [];
        }
    }

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
                    "updateQuestion error:",
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
                            "deleteDepartments error:",
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
                                    "saveDepartments error:",
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

            const questionData = rows[0];

            // ==================================================
            // DELETE DEPARTMENT LINKS
            // ==================================================

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

                    // ==================================================
                    // DELETE QUESTION
                    // ==================================================

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

                            // ==================================================
                            // ACTIVITY LOG
                            // ==================================================

                            try {

                                logActivity({
                                    activity_type: "Question",
                                    reference_id: id,
                                    title: "Question Deleted",
                                    description:
                                        `${questionData.question} question was deleted`,
                                    module_name: "Questions",
                                    status: "Closed",
                                    priority: "High",
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

            // ==================================================
            // ACTIVITY LOG
            // ==================================================

            try {

                logActivity({
                    activity_type: "Question",
                    reference_id: 0,
                    title: "All Questions Deleted",
                    description:
                        "All questions were deleted from the Questions module",
                    module_name: "Questions",
                    status: "Closed",
                    priority: "High",
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
                    "All Questions deleted successfully."
            });
        }
    );
};

// ======================================================
// BULK UPLOAD QUESTIONS
//
// SUPPORTED FILES:
// CSV / XLSX / XLS
//
// REQUIRED CSV COLUMNS:
// checklistTypeName
// questionText
// answerType
//
// OPTIONAL COLUMNS:
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
// ======================================================

const normalizeLookupValue = (value) => {
    return cleanValue(value)
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
};

const getRowValue = (row, keys) => {

    for (const key of keys) {

        if (
            Object.prototype.hasOwnProperty.call(
                row,
                key
            )
        ) {

            const value = cleanValue(row[key]);

            if (value !== "") {
                return value;
            }
        }
    }

    return "";
};

const getRowRawValue = (row, keys) => {

    for (const key of keys) {

        if (
            Object.prototype.hasOwnProperty.call(
                row,
                key
            )
        ) {
            return row[key];
        }
    }

    return "";
};

// ======================================================
// BULK UPLOAD
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
        // READ FILE
        // ==================================================

        const extension = path
            .extname(req.file.originalname)
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

                                parsedRows.push(
                                    row
                                );
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
        // EXCEL
        // ==================================================

        else if (
            extension === ".xlsx" ||
            extension === ".xls"
        ) {

            const workbook = XLSX.read(
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

            rows = XLSX.utils.sheet_to_json(
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
            "Rows found:",
            rows.length
        );

        // ==================================================
        // EMPTY FILE
        // ==================================================

        if (!rows.length) {

            return res.status(400).json({
                success: false,
                message:
                    "The uploaded file contains no data."
            });
        }

        console.log(
            "CSV/Excel Headers:",
            Object.keys(rows[0])
        );

        // ==================================================
        // NORMALIZE HEADERS
        // ==================================================

        const normalizedRows =
            rows.map(
                (originalRow) => {

                    const normalizedRow = {};

                    Object.keys(
                        originalRow
                    ).forEach(
                        (key) => {

                            const normalizedKey =
                                cleanValue(key)
                                    .replace(
                                        /^\uFEFF/,
                                        ""
                                    )
                                    .replace(
                                        /[\s_-]+(.)?/g,
                                        (
                                            _,
                                            char
                                        ) =>
                                            char
                                                ? char.toUpperCase()
                                                : ""
                                    );

                            normalizedRow[key] =
                                originalRow[key];

                            normalizedRow[
                                normalizedKey
                            ] =
                                originalRow[key];
                        }
                    );

                    return normalizedRow;
                }
            );

        // ==================================================
        // COUNTERS
        // ==================================================

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const skippedRows = [];

        // ==================================================
        // PROCESS EVERY ROW
        // ==================================================

        for (
            let index = 0;
            index < normalizedRows.length;
            index++
        ) {

            const row =
                normalizedRows[index];

            const excelRowNumber =
                index + 2;

            try {

                // ==================================================
                // READ CSV VALUES
                // ==================================================

                const checklistTypeName =
                    getRowValue(
                        row,
                        [
                            "checklistTypeName",
                            "checklist_type_name",
                            "ChecklistTypeName",
                            "Checklist Type Name",
                            "checklistName",
                            "checklist_name"
                        ]
                    );

                const questionText =
                    getRowValue(
                        row,
                        [
                            "questionText",
                            "question_text",
                            "QuestionText",
                            "Question",
                            "question"
                        ]
                    );

                const answerType =
                    getRowValue(
                        row,
                        [
                            "answerType",
                            "answer_type",
                            "AnswerType",
                            "Answer Type"
                        ]
                    );

                const answerRequiredRaw =
                    getRowRawValue(
                        row,
                        [
                            "answerRequired",
                            "answer_required",
                            "AnswerRequired",
                            "Answer Required"
                        ]
                    );

                const slaValueRaw =
                    getRowRawValue(
                        row,
                        [
                            "slaValue",
                            "sla_value",
                            "SlaValue",
                            "SLA Value"
                        ]
                    );

                const slaUnit =
                    getRowValue(
                        row,
                        [
                            "slaUnit",
                            "sla_unit",
                            "SlaUnit",
                            "SLA Unit"
                        ]
                    );

                const sequenceRaw =
                    getRowRawValue(
                        row,
                        [
                            "sequence",
                            "sequenceNo",
                            "sequence_no",
                            "Sequence"
                        ]
                    );

                const questionDepartmentName =
                    getRowValue(
                        row,
                        [
                            "questionDepartmentName",
                            "question_department_name",
                            "QuestionDepartmentName",
                            "departmentName",
                            "department_name"
                        ]
                    );

                // ==================================================
                // OPTIONAL RULE FIELDS
                // ==================================================

                const commentRuleType =
                    getRowValue(
                        row,
                        [
                            "commentRuleType",
                            "comment_rule_type"
                        ]
                    );

                const attachmentRuleType =
                    getRowValue(
                        row,
                        [
                            "attachmentRuleType",
                            "attachment_rule_type"
                        ]
                    );

                const actionPointRuleType =
                    getRowValue(
                        row,
                        [
                            "actionPointRuleType",
                            "action_point_rule_type"
                        ]
                    );

                const actionPointComparisonValue =
                    getRowValue(
                        row,
                        [
                            "actionPointComparisonValue",
                            "action_point_comparison_value"
                        ]
                    );

                const allowDuplicateActionPoints =
                    getRowValue(
                        row,
                        [
                            "allowDuplicateActionPoints",
                            "allow_duplicate_action_points"
                        ]
                    );

                const actionDepartments =
                    getRowValue(
                        row,
                        [
                            "actionDepartments",
                            "action_departments"
                        ]
                    );

                const linkedChecklistTypeName =
                    getRowValue(
                        row,
                        [
                            "linkedChecklistTypeName",
                            "linked_checklist_type_name"
                        ]
                    );

                const linkedQuestionText =
                    getRowValue(
                        row,
                        [
                            "linkedQuestionText",
                            "linked_question_text"
                        ]
                    );

                const comparisonType =
                    getRowValue(
                        row,
                        [
                            "comparisonType",
                            "comparison_type"
                        ]
                    );

                const linkedQuestionDateOffset =
                    getRowValue(
                        row,
                        [
                            "linkedQuestionDateOffset",
                            "linked_question_date_offset"
                        ]
                    );

                // ==================================================
                // UNUSED OPTIONAL FIELDS
                // ==================================================

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
                // REQUIRED VALIDATION
                // ==================================================

                if (!checklistTypeName) {

                    skippedCount++;

                    skippedRows.push({
                        rowNumber:
                            excelRowNumber,

                        checklistType:
                            "",

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

                        checklistType:
                            checklistTypeName,

                        question:
                            "",

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

                        checklistType:
                            checklistTypeName,

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
                // Actual DB column:
                // checklist_types.checklist_name
                // ==================================================

                let checklistRows = [];

                // --------------------------------------------------
                // CHECKLIST TYPE BY ID
                // --------------------------------------------------

                if (
                    /^\d+$/.test(
                        checklistTypeName
                    )
                ) {

                    const rowsById = await db.query(
                        `
                        SELECT id
                        FROM checklist_types
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [
                            Number(
                                checklistTypeName
                            )
                        ]
                    );

                    checklistRows =
                        rowsById;
                }

                // --------------------------------------------------
                // CHECKLIST TYPE BY NAME
                // --------------------------------------------------

                if (
                    !checklistRows.length
                ) {

                    const rowsByName = await db.query(
                        `
                        SELECT id
                        FROM checklist_types
                        WHERE LOWER(
                            TRIM(checklist_name)
                        )
                        =
                        LOWER(
                            TRIM(?)
                        )
                        LIMIT 1
                        `,
                        [
                            checklistTypeName
                        ]
                    );

                    checklistRows =
                        rowsByName;
                }

                // --------------------------------------------------
                // CHECKLIST TYPE NOT FOUND
                // --------------------------------------------------

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
                            `Checklist Type "${checklistTypeName}" was not found in checklist_types.checklist_name.`
                    });

                    continue;
                }

                const checklistTypeId =
                    checklistRows[0].id;

                // ==================================================
                // FIND EXISTING QUESTION
                //
                // IMPORTANT:
                // Existing questions are UPDATED.
                // They are NOT skipped.
                // ==================================================

                const duplicateRows = await db.query(
                    `
                    SELECT id
                    FROM questions
                    WHERE checklist_type_id = ?
                    AND LOWER(
                        TRIM(question)
                    )
                    =
                    LOWER(
                        TRIM(?)
                    )
                    LIMIT 1
                    `,
                    [
                        checklistTypeId,
                        questionText
                    ]
                );

                const existingQuestionId =
                    duplicateRows.length
                        ? duplicateRows[0].id
                        : null;

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

                const status =
                    "Active";

                // ==================================================
                // INSERT OR UPDATE
                // ==================================================

                let questionId;

                // ==================================================
                // UPDATE EXISTING QUESTION
                // ==================================================

                if (
                    existingQuestionId
                ) {

                    await db.query(
                        `
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
                        `,
                        [
                            checklistTypeId,
                            questionText,
                            sequenceNo,
                            answerType,
                            slaValue,
                            slaUnit || null,
                            answerRequired,
                            status,
                            existingQuestionId
                        ]
                    );

                    questionId =
                        existingQuestionId;

                }

                // ==================================================
                // INSERT NEW QUESTION
                // ==================================================

                else {

                    const insertResult = await db.query(
                        `
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
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `,
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

                    questionId =
                        insertResult.insertId;
                }

                // ==================================================
                // DEPARTMENT LINKS
                //
                // Department can be:
                // 1. Department ID
                // 2. Department name
                //
                // Missing department does NOT skip question.
                // ==================================================

                const missingDepartments =
                    [];

                // ==================================================
                // REMOVE OLD LINKS
                // ==================================================

                if (
                    existingQuestionId
                ) {

                    await db.query(
                        `
                        DELETE FROM question_departments
                        WHERE question_id = ?
                        `,
                        [
                            questionId
                        ]
                    );
                }

                // ==================================================
                // ADD NEW DEPARTMENT LINKS
                // ==================================================

                if (
                    questionDepartmentName
                ) {

                    const departmentValues =
                        questionDepartmentName
                            .split(",")
                            .map(
                                (item) =>
                                    item.trim()
                            )
                            .filter(
                                Boolean
                            );

                    for (
                        const departmentValue
                        of departmentValues
                    ) {

                        let departmentRows =
                            [];

                        // ==================================================
                        // DEPARTMENT BY ID
                        // ==================================================

                        if (
                            /^\d+$/.test(
                                departmentValue
                            )
                        ) {

                            const rowsById = await db.query(
                                `
                                SELECT id
                                FROM departments
                                WHERE id = ?
                                LIMIT 1
                                `,
                                [
                                    Number(
                                        departmentValue
                                    )
                                ]
                            );

                            departmentRows =
                                rowsById;
                        }

                        // ==================================================
                        // DEPARTMENT BY NAME
                        // ==================================================

                        if (
                            !departmentRows.length
                        ) {

                            const rowsByName = await db.query(
                                `
                                SELECT id
                                FROM departments
                                WHERE LOWER(
                                    TRIM(department_name)
                                )
                                =
                                LOWER(
                                    TRIM(?)
                                )
                                LIMIT 1
                                `,
                                [
                                    departmentValue
                                ]
                            );

                            departmentRows =
                                rowsByName;
                        }

                        // ==================================================
                        // DEPARTMENT FOUND
                        // ==================================================

                        if (
                            departmentRows.length
                        ) {

                            await db.query(
                                `
                                INSERT INTO question_departments
                                (
                                    question_id,
                                    department_id
                                )
                                VALUES (?, ?)
                                `,
                                [
                                    questionId,
                                    departmentRows[0].id
                                ]
                            );
                        }

                        // ==================================================
                        // DEPARTMENT NOT FOUND
                        // ==================================================

                        else {

                            missingDepartments.push(
                                departmentValue
                            );
                        }
                    }
                }

                // ==================================================
                // LOG MISSING DEPARTMENTS
                // ==================================================

                if (
                    missingDepartments.length
                ) {

                    console.warn(
                        `Row ${excelRowNumber}: Question ${questionId} inserted/updated, but department(s) not found:`,
                        missingDepartments
                    );
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
                            existingQuestionId
                                ? "Question Updated"
                                : "Question Created",

                        description:
                            existingQuestionId
                                ? `${questionText} question was updated through bulk upload`
                                : `${questionText} question was created through bulk upload`,

                        module_name:
                            "Questions",

                        status:
                            "Open",

                        priority:
                            "Medium",

                        created_by:
                            req.user?.id ||
                            null,

                        assigned_to:
                            null
                    });

                }
                catch (logError) {

                    console.error(
                        "Activity log error:",
                        logError
                    );
                }

                // ==================================================
                // SUCCESS COUNTERS
                // ==================================================

                if (
                    existingQuestionId
                ) {

                    updatedCount++;

                }
                else {

                    insertedCount++;
                }

            }
            catch (rowError) {

                console.error(
                    `Error processing row ${excelRowNumber}:`,
                    rowError?.stack || rowError
                );

                skippedCount++;

                skippedRows.push({
                    rowNumber:
                        excelRowNumber,

                    checklistType:
                        cleanValue(
                            getRowValue(
                                row,
                                [
                                    "checklistTypeName",
                                    "checklist_type_name",
                                    "checklistName",
                                    "checklist_name"
                                ]
                            )
                        ),

                    question:
                        cleanValue(
                            getRowValue(
                                row,
                                [
                                    "questionText",
                                    "question_text",
                                    "Question",
                                    "question"
                                ]
                            )
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
            "Updated:",
            updatedCount
        );

        console.log(
            "Skipped:",
            skippedCount
        );

        console.log(
            "=========================================="
        );

        const skippedReasonCounts = {};

        skippedRows.forEach((item) => {

            const reason =
                item.reason ||
                "Unknown error";

            skippedReasonCounts[reason] =
                (skippedReasonCounts[reason] || 0) + 1;
        });

        console.log(
            "Skipped reasons:",
            skippedReasonCounts
        );

        return res.status(201).json({

            success:
                true,

            message:
                `Questions upload completed. ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped.`,

            totalRecords:
                rows.length,

            insertedCount:
                insertedCount,

            updatedCount:
                updatedCount,

            skippedCount:
                skippedCount,

            skippedRows:
                skippedRows
        });

    }
    catch (error) {

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

            success:
                false,

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
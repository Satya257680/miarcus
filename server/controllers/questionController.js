const { readDeleteScope, eachId, cbToPromise, sendFilteredResult } = require("../utils/deleteScope");
const Question = require("../models/questionModel");
const { logActivity } = require("../utils/activityLogger");
const { runBulkUpload } = require("../utils/bulkUploadEngine");
const {
    isYesNoType,
    normalizeExpectedAnswer
} = require("../config/checklistExpectedAnswer");
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

    // Checklist questions are master data and must never be served from
    // a browser/proxy cache. The frontend also sends a cache-busting token
    // for an explicit "Refresh Questions" action.
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Surrogate-Control": "no-store"
    });


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
        photo_requirement,
        expected_answer,
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

            // Photo evidence rule (Auto / Optional / Required / Required on No / None)
            Question.setPhotoRequirement(questionId, photo_requirement, (photoErr) => {
                if (photoErr) console.error("setPhotoRequirement error:", photoErr);
            });

            // Normal answer of a Yes / No question (photo needed for the other one)
            Question.setExpectedAnswer(questionId, expected_answer, answer_type, question, (expErr) => {
                if (expErr) console.error("setExpectedAnswer error:", expErr);
            });

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
        photo_requirement,
        expected_answer,
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

            // Photo evidence rule (Auto / Optional / Required / Required on No / None)
            Question.setPhotoRequirement(id, photo_requirement, (photoErr) => {
                if (photoErr) console.error("setPhotoRequirement error:", photoErr);
            });

            // Normal answer of a Yes / No question (photo needed for the other one)
            Question.setExpectedAnswer(id, expected_answer, answer_type, question, (expErr) => {
                if (expErr) console.error("setExpectedAnswer error:", expErr);
            });

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

exports.deleteAllQuestions = async (req, res) => {

    // Filters applied on the page -> the client sends the ids of the
    // matching questions; each is removed with its department mapping,
    // exactly like a single delete. No filters -> delete all.
    const scope = readDeleteScope(req);

    if (scope.filtered) {
        try {
            const result = await eachId(scope.ids || [], async (id) => {
                await cbToPromise(Question.deleteDepartments, id);
                await cbToPromise(Question.deleteQuestion, id);
            });

            try {
                logActivity({
                    activity_type: "Question",
                    reference_id: 0,
                    title: "Filtered Questions Deleted",
                    description: `${result.deleted} filtered question(s) were deleted from the Questions module`,
                    module_name: "Questions",
                    status: "Closed",
                    priority: "High",
                    created_by: req.user?.id || null,
                    assigned_to: null
                });
            } catch (logError) {
                console.error("Activity log error:", logError);
            }

            return sendFilteredResult(res, result, "question(s)");
        } catch (error) {
            console.error("deleteAllQuestions (filtered) error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

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
// BULK UPLOAD  (global bulk-upload engine)
//
// Existing question (same checklist type + text) -> updated,
// otherwise created. Every row on its own; problems are reported with
// the exact Excel row / column / value / reason. Extra columns are
// kept with the question (bulk_extra_data).
// ======================================================

exports.bulkUploadQuestions = (req, res) =>
    runBulkUpload({
        req,
        res,
        module: "questions",

        prepare: async (ctx) => {
            const [types, departments] = await Promise.all([
                db.query("SELECT id, checklist_name FROM checklist_types"),
                db.query("SELECT id, department_name FROM departments")
            ]);
            ctx.data.typeByName = new Map(types.map((t) => [cleanValue(t.checklist_name).toLowerCase(), t.id]));
            ctx.data.typeById = new Set(types.map((t) => String(t.id)));
            ctx.data.deptByName = new Map(departments.map((d) => [cleanValue(d.department_name).toLowerCase(), d.id]));
            ctx.data.deptById = new Set(departments.map((d) => String(d.id)));
        },

        validateRow: (row, ctx) => {
            const typeValue = ctx.text("Checklist Type");
            let checklistTypeId = ctx.data.typeByName.get(typeValue.toLowerCase()) || null;
            if (!checklistTypeId && /^\d+$/.test(typeValue) && ctx.data.typeById.has(typeValue)) {
                checklistTypeId = Number(typeValue);
            }
            if (typeValue && !checklistTypeId) {
                ctx.fail("Checklist Type", typeValue, "Checklist Type does not exist. Create it in Checklist Types first.");
            }
            ctx.checklistTypeId = checklistTypeId;

            const sequence = ctx.text("Sequence");
            if (sequence && Number.isNaN(Number(sequence))) {
                ctx.fail("Sequence", sequence, "Sequence must be a number.");
            }

            const required = ctx.cell("Answer Required");
            if (!isEmptyValue(required) && !["yes", "no", "true", "false", "1", "0", "y", "n", "required", "optional"].includes(cleanValue(required).toLowerCase())) {
                ctx.fail("Answer Required", required, "Answer Required must be Yes or No.");
            }

            const photoRaw = ctx.text("Photo Requirement").toLowerCase();
            const PHOTO = {
                required: "Required", yes: "Required", y: "Required", true: "Required", 1: "Required", mandatory: "Required", "photo required": "Required",
                "required on no": "Required on No", "required if no": "Required on No", "on no": "Required on No",
                optional: "Optional",
                auto: "Auto", "auto (system decides)": "Auto", "unexpected answer": "Auto", "required on unexpected answer": "Auto",
                none: "None", "no photo": "None", "not required": "None", no: "None"
            };
            ctx.photoRequirement = photoRaw ? PHOTO[photoRaw] : undefined;
            if (photoRaw && !ctx.photoRequirement && !["-", ""].includes(photoRaw)) {
                // Only an explicit Photo column is validated; "Remarks" text is free form.
                const header = (ctx.headers.columns || []).find((c) => c.target === "Photo Requirement");
                if (header && !/remark/i.test(header.source)) {
                    ctx.fail("Photo Requirement", ctx.text("Photo Requirement"), "Use Auto, Required, Optional, Required on No or None.");
                }
            }

            // Expected / normal answer (Yes / No questions only).
            const expectedRaw = ctx.text("Expected Answer");
            ctx.expectedAnswer = normalizeExpectedAnswer(expectedRaw);
            if (expectedRaw && !ctx.expectedAnswer && !["-", ""].includes(expectedRaw.trim())) {
                ctx.fail("Expected Answer", expectedRaw, "Expected Answer must be Yes or No.");
            }
        },

        duplicateKey: (row, ctx) => ({
            key: `${ctx.checklistTypeId}|${ctx.text("Question").toLowerCase()}`,
            column: "Question",
            value: ctx.text("Question")
        }),

        processRow: async (row, ctx) => {
            const questionText = ctx.text("Question");
            const checklistTypeId = ctx.checklistTypeId;

            const duplicateRows = await db.query(
                `SELECT id FROM questions WHERE checklist_type_id = ? AND LOWER(TRIM(question)) = LOWER(TRIM(?)) LIMIT 1`,
                [checklistTypeId, questionText]
            );
            const existingQuestionId = duplicateRows.length ? duplicateRows[0].id : null;

            const sequenceRaw = ctx.text("Sequence");
            const sequenceNo = sequenceRaw === "" ? null : Number(sequenceRaw);

            const slaRaw = ctx.cell("SLA Value");
            let slaValue = null;
            if (!isEmptyValue(slaRaw)) {
                slaValue = Number.isNaN(Number(slaRaw)) ? cleanValue(slaRaw) : Number(slaRaw);
            }

            const values = [
                checklistTypeId,
                questionText,
                sequenceNo,
                ctx.text("Answer Type"),
                slaValue,
                ctx.text("SLA Unit") || null,
                isTrueValue(ctx.cell("Answer Required")) ? 1 : 0,
                "Active"
            ];

            let questionId;
            if (existingQuestionId) {
                await db.query(
                    `UPDATE questions SET checklist_type_id = ?, question = ?, sequence_no = ?, answer_type = ?, sla_value = ?, sla_unit = ?, answer_required = ?, status = ? WHERE id = ?`,
                    [...values, existingQuestionId]
                );
                questionId = existingQuestionId;
            } else {
                const insertResult = await db.query(
                    `INSERT INTO questions (checklist_type_id, question, sequence_no, answer_type, sla_value, sla_unit, answer_required, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    values
                );
                questionId = insertResult.insertId;
            }

            const answerType = ctx.text("Answer Type");
            const yesNo = isYesNoType(answerType);

            let photoRequirement = ctx.photoRequirement;
            // Yes / No questions use "photo for the unexpected answer" (Auto);
            // the default sheet list only forces "Required" for other types.
            if (!photoRequirement && !yesNo && require("../config/checklistPhotoRules").isPhotoRequiredQuestion(questionText)) {
                photoRequirement = "Required";
            }

            await new Promise((resolve) =>
                Question.setExpectedAnswer(questionId, ctx.expectedAnswer, answerType, questionText, (expErr) => {
                    if (expErr) console.error("bulk setExpectedAnswer error:", expErr);
                    resolve();
                })
            );
            if (photoRequirement) {
                await new Promise((resolve) =>
                    Question.setPhotoRequirement(questionId, photoRequirement, (photoErr) => {
                        if (photoErr) console.error("bulk setPhotoRequirement error:", photoErr);
                        resolve();
                    })
                );
            }

            // Department links — a missing department never drops the question,
            // it is reported as a note on that row.
            if (existingQuestionId) {
                await db.query(`DELETE FROM question_departments WHERE question_id = ?`, [questionId]);
            }

            const departmentValues = ctx.text("Department").split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
            for (const value of departmentValues) {
                const departmentId =
                    ctx.data.deptByName.get(value.toLowerCase()) ||
                    (/^\d+$/.test(value) && ctx.data.deptById.has(value) ? Number(value) : null);
                if (departmentId) {
                    await db.query(`INSERT INTO question_departments (question_id, department_id) VALUES (?, ?)`, [questionId, departmentId]);
                } else {
                    ctx.note("Department", value, `Department "${value}" does not exist — the question was saved without it.`);
                }
            }

            try {
                logActivity({
                    activity_type: "Question",
                    reference_id: questionId,
                    title: existingQuestionId ? "Question Updated" : "Question Created",
                    description: `${questionText} question was ${existingQuestionId ? "updated" : "created"} through bulk upload`,
                    module_name: "Questions",
                    status: "Open",
                    priority: "Medium",
                    created_by: req.user?.id || null,
                    assigned_to: null
                });
            } catch (logError) {
                console.error("Activity log error:", logError);
            }

            return { id: questionId, updated: Boolean(existingQuestionId) };
        }
    });

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
const db = require("../config/db");

// ======================================================
// MODELS
// ======================================================

const NSORule = require("../models/nsoRuleModel");

const ActionPoint = require("../models/actionPointModel");

const Activity = require("../models/activityModel");

const Audit = require("../models/auditModel");

const nsoStatusService = require("./nsoStatusService");
const { logActivity } = require("../utils/activityLogger");

// ======================================================
// GET SUBMISSION
// ======================================================

const getSubmission = (submissionId) => {

    return new Promise((resolve, reject) => {

        const sql = `

            SELECT *

            FROM checklist_submissions

            WHERE id = ?

            LIMIT 1

        `;

        db.query(

            sql,

            [

                submissionId

            ],

            (err, rows) => {

                if (err) {

                    return reject(err);

                }

                if (

                    rows.length === 0

                ) {

                    return reject(

                        new Error(

                            "Checklist submission not found."

                        )

                    );

                }

                resolve(rows[0]);

            }

        );

    });

};

// ======================================================
// GET SUBMISSION ANSWERS
// ======================================================

const getSubmissionAnswers = (

    submissionId

) => {

    return new Promise((resolve, reject) => {

        const sql = `

            SELECT

                csa.id,

                csa.question_id,

                csa.answer,

                csa.remarks,

                q.question,

                q.checklist_type_id,

                q.answer_type,

                q.sla_value AS question_sla_value,

                q.sla_unit AS question_sla_unit,

                GROUP_CONCAT(
                    DISTINCT qd.department_id
                    ORDER BY qd.department_id
                    SEPARATOR ','
                ) AS department_ids

            FROM checklist_submission_answers csa

            INNER JOIN questions q
                ON q.id = csa.question_id

            LEFT JOIN question_departments qd
                ON qd.question_id = q.id

            WHERE csa.submission_id = ?

            GROUP BY
                csa.id,
                csa.question_id,
                csa.answer,
                csa.remarks,
                q.question,
                q.checklist_type_id,
                q.answer_type,
                q.sla_value,
                q.sla_unit

            ORDER BY q.sequence_no

        `;

        db.query(

            sql,

            [

                submissionId

            ],

            (err, rows) => {

                if (err) {

                    return reject(err);

                }

                resolve(rows);

            }

        );

    });

};

// ======================================================
// LOAD ACTIVE NSO RULES
// ======================================================

const getActiveRules = () => {

    return new Promise((resolve, reject) => {

        const sql = `

            SELECT

                nr.*,

                GROUP_CONCAT(

                    nrd.department_id

                ) AS department_ids

            FROM nso_rules nr

            LEFT JOIN nso_rule_departments nrd

                ON nr.id = nrd.rule_id

            WHERE nr.is_active = 1

            GROUP BY nr.id

        `;

        db.query(

            sql,

            (err, rows) => {

                if (err) {

                    return reject(err);

                }

                resolve(rows);

            }

        );

    });

};

// ======================================================
// CALCULATE SCORE
// ======================================================

const calculateScore = (

    answers

) => {

    if (

        answers.length === 0

    ) {

        return 0;

    }

    let score = 0;

    answers.forEach(

        (answer) => {

            if (

                answer.answer === "Yes"

            ) {

                score++;

            }

        }

    );

    return Number(

        (

            score /

            answers.length *

            100

        ).toFixed(2)

    );

};

// ======================================================
// MAIN SERVICE
// ======================================================

const processInspection = async (

    submissionId,

    userId

) => {

    const submission =

        await getSubmission(

            submissionId

        );

    const answers =

        await getSubmissionAnswers(

            submissionId

        );

    const rules =

        await getActiveRules();

    const score =

        calculateScore(

            answers

        );

    return {

        submission,

        answers,

        rules,

        score

    };

};
// ======================================================
// EVALUATE NSO RULES
// ======================================================

const evaluateRules = (
    answers,
    rules
) => {

    const matchedRules = [];

    answers.forEach((answer) => {
        const questionText = normalizeText(answer.question);
        if (!questionText) return;

        const rule = rules.find((item) => {
            const triggerColumn = normalizeText(item.trigger_column);
            return triggerColumn === questionText;
        });

        if (!rule) return;

        const submittedAnswer = String(answer.answer ?? "").trim();
        const expectedAnswer = String(rule.expected_answer ?? "").trim();

        if (
            submittedAnswer.toLowerCase() !==
            expectedAnswer.toLowerCase()
        ) {
            matchedRules.push({
                answer_id: answer.id,
                question_id: answer.question_id,
                question: answer.question,
                answer: answer.answer,
                expected_answer: rule.expected_answer,
                remarks: answer.remarks,
                department_ids: answer.department_ids,
                rule
            });
        }
    });

    return matchedRules;
};

// ======================================================
// BUILD AUTOMATIC RULES FOR NEW PROBLEMS
// ======================================================

const buildAutomaticProblems = async (
    answers,
    rules,
    submission,
    userId
) => {
    const problems = [];

    for (const answer of answers) {
        const questionText = normalizeText(answer.question);
        if (!questionText) continue;

        // A manually configured active rule always wins.
        const existingRule = rules.find(
            (item) => normalizeText(item.trigger_column) === questionText
        );

        if (existingRule) continue;
        if (!isAutomaticProblem(answer)) continue;

        try {
            const automaticRule = await createAutomaticNSORule(
                answer,
                submission,
                userId
            );

            problems.push({
                answer_id: answer.id,
                question_id: answer.question_id,
                question: answer.question,
                answer: answer.answer,
                expected_answer: automaticRule.expected_answer,
                remarks: answer.remarks,
                department_ids: answer.department_ids,
                rule: automaticRule,
                automatic: true
            });
        } catch (error) {
            console.error(
                `Automatic NSO Rule creation failed for question #${answer.question_id}:`,
                error
            );
        }
    }

    return problems;
};

// ======================================================
// TRUTHY FLAG HELPER
// ======================================================

// ------------------------------------------------------
// nso_rules boolean-ish columns (create_action_point,
// mandatory, is_active) can come back from mysql2 as a
// plain number (TINYINT), a string ("1"/"0"), a boolean, or
// a Buffer (BIT(1) columns default to a Buffer, e.g. <01>).
// `Number(buffer) !== 1` is always true, which silently
// skipped action-point creation on any BIT(1) rule column —
// this normalizes all of those shapes to a real boolean.
// ------------------------------------------------------

const isFlagEnabled = (value) => {

    if (Buffer.isBuffer(value)) {
        return value.length > 0 && value[0] === 1;
    }

    if (typeof value === "boolean") {
        return value;
    }

    return Number(value) === 1;

};

// ======================================================
// AUTOMATIC PROBLEM DETECTION
//
// A checklist does not need an NSO Rule to be submitted.
// The inspection engine first detects an obvious problem.
// If no matching manual rule exists, an NSO Rule is then
// generated automatically and used for the Action Point.
// ======================================================

const normalizeText = (value) =>
    String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

const isAutomaticProblem = (answer) => {
    const value = normalizeText(answer.answer);
    const remarks = normalizeText(answer.remarks);
    const type = normalizeText(answer.answer_type);

    if (!value) {
        return true;
    }

    // Yes/No questions: only an explicit No is automatically a problem.
    if (["yes/no", "yes_no", "boolean"].includes(type)) {
        return value === "no";
    }

    const problemPhrases = [
        "no",
        "not available",
        "unavailable",
        "missing",
        "not working",
        "broken",
        "damaged",
        "defective",
        "failed",
        "failure",
        "error",
        "issue",
        "problem",
        "in progress",
        "progress",
        "ongoing",
        "continue",
        "continuing",
        "pending",
        "not started",
        "not complete",
        "not completed",
        "incomplete",
        "unfinished",
        "partially complete",
        "partial",
        "blocked",
        "rejected",
        "overdue",
        "delay",
        "delayed"
    ];

    const positivePhrases = [
        "yes",
        "completed",
        "complete",
        "done",
        "available",
        "working",
        "ok",
        "okay",
        "pass",
        "passed",
        "satisfactory",
        "no issue",
        "no problem",
        "not applicable",
        "n/a",
        "na"
    ];

    if (positivePhrases.includes(value)) {
        return false;
    }

    if (problemPhrases.some((phrase) => value.includes(phrase))) {
        return true;
    }

    if (
        problemPhrases.some((phrase) => remarks.includes(phrase)) &&
        !positivePhrases.some((phrase) => value.includes(phrase))
    ) {
        return true;
    }

    return false;
};

const inferExpectedAnswer = (answer) => {
    const value = normalizeText(answer.answer);

    if (value === "no") return "Yes";
    if (value === "na" || value === "n/a") return "Yes";

    // Existing NSO rules currently support Yes / No / NA as their
    // expected-answer values. For an automatically detected textual
    // problem, Yes means "the requirement should be satisfactory".
    return "Yes";
};

const getRuleDepartmentIds = (answer) => {
    if (!answer.department_ids) return [];

    return String(answer.department_ids)
        .split(",")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0);
};

const createAutomaticNSORule = async (
    answer,
    submission,
    userId
) => {
    const departments = getRuleDepartmentIds(answer);

    const priority =
        answer.priority || "High";

    const questionSlaValue = Number(answer.question_sla_value);
    const questionSlaUnit = normalizeText(answer.question_sla_unit);

    const slaDays =
        questionSlaValue > 0
            ? Math.max(
                1,
                questionSlaUnit.includes("hour")
                    ? Math.ceil(questionSlaValue / 24)
                    : Math.ceil(questionSlaValue)
              )
            : 3;

    const rule = {
        trigger_column: answer.question,
        expected_answer: inferExpectedAnswer(answer),
        priority,
        sla_days: slaDays,
        create_action_point: 1,
        mandatory: 1,
        is_active: 1,
        created_by: userId,
        departments
    };

    const result = await new Promise((resolve, reject) => {
        NSORule.createRuleWithDepartments(
            rule,
            (err, created) => err ? reject(err) : resolve(created)
        );
    });

    return {
        ...rule,
        id: result.insertId,
        department_ids: departments.join(",")
    };
};

const findResponsibleUser = async (departmentIds) => {
    if (!departmentIds || departmentIds.length === 0) {
        return null;
    }

    return new Promise((resolve, reject) => {
        const placeholders = departmentIds.map(() => "?").join(",");
        db.query(
            `SELECT id, name, email\n             FROM users\n             WHERE department_id IN (${placeholders})\n               AND (status = 'Active' OR status IS NULL)\n             ORDER BY id ASC\n             LIMIT 1`,
            departmentIds,
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows?.[0] || null);
            }
        );
    });
};

const notifyActionPoint = async ({
    actionPointId,
    submissionId,
    question,
    priority,
    departmentIds,
    userId,
    automatic = true
}) => {
    try {
        const responsibleUser = await findResponsibleUser(departmentIds);

        await logActivity({
            activity_type: automatic ? "Automatic Action Point" : "Action Point",
            reference_id: actionPointId,
            title: "Action Point Created",
            description:
                `Action Point #${actionPointId} was created${automatic ? " automatically" : ""} for checklist submission #${submissionId}. Problem: ${question}`,
            module_name: "Action Points",
            status: "Open",
            priority: priority || "Medium",
            created_by: userId,
            assigned_to: responsibleUser?.id || null
        });

        return responsibleUser;
    } catch (error) {
        console.error("Action Point notification error:", error);
        return null;
    }
};

// ======================================================
// CREATE ACTION POINTS
// ======================================================

const createActionPoints = (
    submission,
    matchedRules,
    userId
) => {

    return new Promise(async (resolve, reject) => {

        if (!matchedRules || matchedRules.length === 0) {
            return resolve([]);
        }

        const createdActionPoints = [];

        try {

            for (const item of matchedRules) {

                const rule = item.rule;

                if (!isFlagEnabled(rule.create_action_point)) {
                    continue;
                }

                if (!item.answer_id) {
                    throw new Error(
                        `Missing checklist submission answer ID for question ${item.question_id}.`
                    );
                }

                const departmentIds = rule.department_ids
                    ? String(rule.department_ids)
                        .split(",")
                        .map((id) => Number(id))
                        .filter(Boolean)
                    : [];

                const actionPointData = {
                    new_store_opening_id: submission.new_store_opening_id || null,
                    submission_id: submission.id,
                    submission_answer_id: item.answer_id,
                    rule_id: rule.id || null,
                    store_id: submission.store_id,
                    department_id: departmentIds[0] || null,
                    question_id: item.question_id,
                    assigned_to: null,
                    priority: rule.priority || "Medium",
                    sla_value: Number(rule.sla_days) || 0,
                    status: "Open",
                    remarks: item.remarks || null,
                    attachment: null,
                    created_by: userId || null
                };

                const result = await new Promise((resolveCreate, rejectCreate) => {

                    ActionPoint.create(
                        actionPointData,
                        (err, result) => {
                            if (err) {
                                return rejectCreate(err);
                            }
                            resolveCreate(result);
                        }
                    );

                });

                createdActionPoints.push({
                    id: result.insertId,
                    submission_id: submission.id,
                    submission_answer_id: item.answer_id,
                    rule_id: rule.id || null,
                    question_id: item.question_id
                });

                await notifyActionPoint({
                    actionPointId: result.insertId,
                    submissionId: submission.id,
                    question: item.question,
                    priority: actionPointData.priority,
                    departmentIds,
                    userId,
                    automatic: Boolean(item.automatic)
                });

                console.log(
                    `[Inspection] Action Point #${result.insertId} created for submission #${submission.id}, answer #${item.answer_id}, rule #${rule.id}.`
                );

            }

            resolve(createdActionPoints);

        }
        catch (error) {

            console.error(
                "[Inspection] Failed to create Action Point(s):",
                error
            );

            reject(error);

        }

    });

};

// ======================================================
// SAVE ACTIVITY
// ======================================================

const saveActivity = (

    submissionId,

    matchedRules,

    userId

) => {

    Activity.create(

        {

            title:

                "Inspection Processed",

            description:

                `${matchedRules.length} rule(s) matched during inspection`,

            module_name:

                "Checklist Reports",

            status:

                "Closed",

            priority:

                "Medium",

            created_by:

                userId,

            assigned_to:

                null

        },

        () => {}

    );

};

// ======================================================
// SAVE AUDIT
// ======================================================

const saveAudit = (

    submissionId,

    matchedRules,

    score,

    userId

) => {

    Audit.create(

        {

            module_name:

                "Checklist Reports",

            reference_id:

                submissionId,

            action:

                "PROCESS",

            old_data:

                null,

            new_data: {

                score,

                matched_rules:

                    matchedRules

            },

            changed_by:

                userId

        },

        () => {}

    );

};

// ======================================================
// UPDATE NSO STATUS
// ======================================================

const updateNSOStatus = async (
    submission,
    matchedRules,
    userId
) => {

    if (!submission) {
        throw new Error("Checklist submission is required for NSO status update.");
    }

    const checklistStatus = matchedRules.length > 0 ? "Open" : "Closed";

    // Keep the checklist-level result for backward compatibility.
    await new Promise((resolve, reject) => {
        db.query(
            `UPDATE checklist_submissions SET nso_status = ? WHERE id = ?`,
            [checklistStatus, submission.id],
            (err) => err ? reject(err) : resolve()
        );
    });

    // The NSO project is the authoritative business record.  All status
    // decisions go through one service so controllers, inspections and future
    // workflows cannot drift apart.
    return nsoStatusService.applyInspectionResult(
        submission.new_store_opening_id,
        matchedRules,
        userId
    );
};

// ======================================================
// COMPLETE INSPECTION
// ======================================================

const runInspection = async (

    submissionId,

    userId

) => {

    try {

        const {

            submission,

            answers,

            rules,

            score

        } = await processInspection(

            submissionId,

            userId

        );

        // ======================================
        // RULE ENGINE
        // ======================================

        const matchedRules =
            evaluateRules(
                answers,
                rules
            );

        // ======================================
        // AUTOMATIC PROBLEM DETECTION
        // ======================================

        const automaticProblems =
            await buildAutomaticProblems(
                answers,
                rules,
                submission,
                userId
            );

        const allMatchedRules = [
            ...matchedRules,
            ...automaticProblems
        ];

        // ======================================
        // CREATE ACTION POINTS
        // ======================================

        const createdActionPoints =
            await createActionPoints(
                submission,
                allMatchedRules,
                userId
            );

        // ======================================
        // UPDATE NSO STATUS
        // ======================================

        const nsoStatusResult = await updateNSOStatus(

            submission,

            allMatchedRules,

            userId

        );

        // ======================================
        // ACTIVITY
        // ======================================

        saveActivity(

            submissionId,

            allMatchedRules,

            userId

        );

        // ======================================
        // AUDIT
        // ======================================

        saveAudit(

            submissionId,

            allMatchedRules,

            score,

            userId

        );

        return {

            success: true,

            nso_status: nsoStatusResult?.status || submission.nso_status || (allMatchedRules.length > 0 ? "Open" : "Closed"),

            nso_status_changed: Boolean(nsoStatusResult?.changed),

            submission_id:

                submissionId,

            score,

            total_answers:

                answers.length,

            matched_rules:

                allMatchedRules.length,

            action_points:
                createdActionPoints.length,

            created_action_points:
                createdActionPoints,

            automatic_rules:
                automaticProblems.length,

        };

    }

    catch (

        err

    ) {

        throw err;

    }

};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    processInspection,

    runInspection,

    calculateScore,

    evaluateRules,

    createActionPoints,

    updateNSOStatus

};
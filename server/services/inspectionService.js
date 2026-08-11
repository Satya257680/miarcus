const db = require("../config/db");

// ======================================================
// MODELS
// ======================================================

const NSORule = require("../models/nsoRuleModel");

const ActionPoint = require("../models/actionPointModel");

const Activity = require("../models/activityModel");

const Audit = require("../models/auditModel");

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

                q.checklist_type_id

            FROM checklist_submission_answers csa

            INNER JOIN questions q

                ON q.id = csa.question_id

            WHERE csa.submission_id = ?

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

        const questionText = String(
            answer.question || ""
        ).trim().toLowerCase();

        if (!questionText) {
            return;
        }

        const rule = rules.find((item) => {

            const triggerColumn = String(
                item.trigger_column || ""
            ).trim().toLowerCase();

            return triggerColumn === questionText;

        });

        if (!rule) {
            return;
        }

        const submittedAnswer = String(
            answer.answer ?? ""
        ).trim();

        const expectedAnswer = String(
            rule.expected_answer ?? ""
        ).trim();

        if (
            submittedAnswer.toLowerCase() !==
            expectedAnswer.toLowerCase()
        ) {

            matchedRules.push({

                answer_id:
                    answer.id,

                question_id:
                    answer.question_id,

                question:
                    answer.question,

                answer:
                    answer.answer,

                expected_answer:
                    rule.expected_answer,

                remarks:
                    answer.remarks,

                rule

            });

        }

    });

    return matchedRules;

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

const updateNSOStatus = (

    submissionId,

    matchedRules

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            const status =

                matchedRules.length > 0

                    ? "Open"

                    : "Closed";

            const sql = `

                UPDATE checklist_submissions

                SET

                    nso_status = ?

                WHERE id = ?

            `;

            db.query(

                sql,

                [

                    status,

                    submissionId

                ],

                (err) => {

                    if (

                        err

                    ) {

                        return reject(

                            err

                        );

                    }

                    resolve();

                }

            );

        }

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
        // CREATE ACTION POINTS
        // ======================================

        const createdActionPoints =
            await createActionPoints(
                submission,
                matchedRules,
                userId
            );

        // ======================================
        // UPDATE NSO STATUS
        // ======================================

        await updateNSOStatus(

            submissionId,

            matchedRules

        );

        // ======================================
        // ACTIVITY
        // ======================================

        saveActivity(

            submissionId,

            matchedRules,

            userId

        );

        // ======================================
        // AUDIT
        // ======================================

        saveAudit(

            submissionId,

            matchedRules,

            score,

            userId

        );

        return {

            success: true,

            submission_id:

                submissionId,

            score,

            total_answers:

                answers.length,

            matched_rules:

                matchedRules.length,

            action_points:
                createdActionPoints.length,

            created_action_points:
                createdActionPoints,

            nso_status:

                matchedRules.length > 0

                    ? "Open"

                    : "Closed"

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
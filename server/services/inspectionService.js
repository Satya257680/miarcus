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

    answers.forEach(

        (answer) => {

            const rule = rules.find(

                (item) =>

                    item.trigger_column ===

                    answer.question

            );

            if (

                !rule

            ) {

                return;

            }

            if (

                String(answer.answer).trim() !==

                String(rule.expected_answer).trim()

            ) {

                matchedRules.push({

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

        }

    );

    return matchedRules;

};

// ======================================================
// CREATE ACTION POINTS
// ======================================================

const createActionPoints = (

    submission,

    matchedRules,

    userId

) => {

    return new Promise(

        (

            resolve,

            reject

        ) => {

            if (

                matchedRules.length === 0

            ) {

                return resolve();

            }

            let completed = 0;

            matchedRules.forEach(

                (

                    item

                ) => {

                    const rule =

                        item.rule;

                    if (

                        Number(

                            rule.create_action_point

                        ) !== 1

                    ) {

                        completed++;

                        if (

                            completed ===

                            matchedRules.length

                        ) {

                            resolve();

                        }

                        return;

                    }

                    const departmentIds =

                        rule.department_ids

                            ? rule.department_ids

                                  .split(",")

                                  .map(Number)

                            : [];

                ActionPoint.create(

    {

        submission_id:

            submission.id,

        store_id:

            submission.store_id,

        department_id:

            departmentIds[0] ||

            null,

        question_id:

            item.question_id,

        answer:

            item.answer,

        remarks:

            item.remarks,

        sla_value:

            rule.sla_days,

        sla_type:

            "Days",

        priority:

            rule.priority,

        created_by:

            userId

    },

    (

        err

    ) => {

        // ======================================
        // DEBUG
        // ======================================

        if (

            err

        ) {

            console.log(

                "====================================="

            );

            console.log(

                "ACTION POINT INSERT ERROR"

            );

            console.log(

                err

            );

            console.log(

                "Submission ID:",

                submission.id

            );

            console.log(

                "Store ID:",

                submission.store_id

            );

            console.log(

                "Department ID:",

                departmentIds[0] || null

            );

            console.log(

                "Question ID:",

                item.question_id

            );

            console.log(

                "Answer:",

                item.answer

            );

            console.log(

                "Remarks:",

                item.remarks

            );

            console.log(

                "SLA Value:",

                rule.sla_days

            );

            console.log(

                "Priority:",

                rule.priority

            );

            console.log(

                "Created By:",

                userId

            );

            console.log(

                "====================================="

            );

            return reject(

                err

            );

        }

        console.log(

            "====================================="

        );

        console.log(

            "ACTION POINT CREATED SUCCESSFULLY"

        );

        console.log(

            "Submission ID:",

            submission.id

        );

        console.log(

            "Question ID:",

            item.question_id

        );

        console.log(

            "====================================="

        );

        completed++;

        if (

            completed ===

            matchedRules.length

        ) {

            resolve();

        }

    }

);

                }

            );

        }

    );

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

                matchedRules.filter(

                    (

                        item

                    ) =>

                        Number(

                            item.rule.create_action_point

                        ) === 1

                ).length,

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

const db = require("../config/db");

// ======================================================
// MODELS
// ======================================================

const NSORule = require("../models/nsoRuleModel");

const Activity = require("../models/activityModel");

const Audit = require("../models/auditModel");

// ======================================================
// SERVICES
// ======================================================
// Action Point creation now lives in ONE place —
// actionPointService.js. This file no longer talks to
// the ActionPoint model directly.
// ======================================================

const actionPointService = require("./actionPointService");

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

        db.query(sql, [submissionId], (err, rows) => {

            if (err) {
                return reject(err);
            }

            if (rows.length === 0) {
                return reject(
                    new Error("Checklist submission not found.")
                );
            }

            resolve(rows[0]);

        });

    });

};

// ======================================================
// GET SUBMISSION ANSWERS
// ======================================================

const getSubmissionAnswers = (submissionId) => {

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

        db.query(sql, [submissionId], (err, rows) => {

            if (err) {
                return reject(err);
            }

            resolve(rows);

        });

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
                GROUP_CONCAT(nrd.department_id) AS department_ids
            FROM nso_rules nr
            LEFT JOIN nso_rule_departments nrd
                ON nr.id = nrd.rule_id
            WHERE nr.is_active = 1
            GROUP BY nr.id
        `;

        db.query(sql, (err, rows) => {

            if (err) {
                return reject(err);
            }

            resolve(rows);

        });

    });

};

// ======================================================
// CALCULATE SCORE
// ======================================================

const calculateScore = (answers) => {

    if (answers.length === 0) {
        return 0;
    }

    let score = 0;

    answers.forEach((answer) => {
        if (answer.answer === "Yes") {
            score++;
        }
    });

    return Number(
        (score / answers.length * 100).toFixed(2)
    );

};

// ======================================================
// MAIN SERVICE — GATHER SUBMISSION DATA
// ======================================================

const processInspection = async (submissionId, userId) => {

    const submission = await getSubmission(submissionId);
    const answers = await getSubmissionAnswers(submissionId);
    const rules = await getActiveRules();
    const score = calculateScore(answers);

    return { submission, answers, rules, score };

};

// ======================================================
// EVALUATE NSO RULES
// ======================================================

const evaluateRules = (answers, rules) => {

    const matchedRules = [];

    answers.forEach((answer) => {

        const questionText = String(answer.question || "")
            .trim()
            .toLowerCase();

        if (!questionText) {
            return;
        }

        const rule = rules.find((item) => {
            const triggerColumn = String(item.trigger_column || "")
                .trim()
                .toLowerCase();
            return triggerColumn === questionText;
        });

        if (!rule) {
            return;
        }

        const submittedAnswer = String(answer.answer ?? "").trim();
        const expectedAnswer = String(rule.expected_answer ?? "").trim();

        if (submittedAnswer.toLowerCase() !== expectedAnswer.toLowerCase()) {

            matchedRules.push({
                answer_id: answer.id,
                question_id: answer.question_id,
                question: answer.question,
                answer: answer.answer,
                expected_answer: rule.expected_answer,
                remarks: answer.remarks,
                rule
            });

        }

    });

    return matchedRules;

};

// ======================================================
// SAVE ACTIVITY (for the overall inspection run)
// ======================================================

const saveActivity = (submissionId, matchedRules, userId) => {

    Activity.create(
        {
            title: "Inspection Processed",
            description: `${matchedRules.length} rule(s) matched during inspection`,
            module_name: "Checklist Reports",
            status: "Closed",
            priority: "Medium",
            created_by: userId,
            assigned_to: null
        },
        () => {}
    );

};

// ======================================================
// SAVE AUDIT (for the overall inspection run)
// ======================================================

const saveAudit = (submissionId, matchedRules, score, userId) => {

    Audit.create(
        {
            module_name: "Checklist Reports",
            reference_id: submissionId,
            action: "PROCESS",
            old_data: null,
            new_data: {
                score,
                matched_rules: matchedRules
            },
            changed_by: userId
        },
        () => {}
    );

};

// ======================================================
// UPDATE NSO STATUS
// ======================================================

const updateNSOStatus = (submissionId, matchedRules) => {

    return new Promise((resolve, reject) => {

        const status = matchedRules.length > 0 ? "Open" : "Closed";

        const sql = `
            UPDATE checklist_submissions
            SET nso_status = ?
            WHERE id = ?
        `;

        db.query(sql, [status, submissionId], (err) => {

            if (err) {
                return reject(err);
            }

            resolve();

        });

    });

};

// ======================================================
// COMPLETE INSPECTION
// ======================================================

const runInspection = async (submissionId, userId) => {

    try {

        const { submission, answers, rules, score } =
            await processInspection(submissionId, userId);

        // ======================================
        // RULE ENGINE
        // ======================================

        const matchedRules = evaluateRules(answers, rules);

        // ======================================
        // CREATE ACTION POINTS
        // Delegated to actionPointService — this is
        // now the ONLY place Action Points get created
        // from the rule engine.
        // ======================================

        const createdActionPoints =
            await actionPointService.createFromRules(
                submission,
                matchedRules,
                userId
            );

        // ======================================
        // UPDATE NSO STATUS
        // ======================================

        await updateNSOStatus(submissionId, matchedRules);

        // ======================================
        // ACTIVITY
        // ======================================

        saveActivity(submissionId, matchedRules, userId);

        // ======================================
        // AUDIT
        // ======================================

        saveAudit(submissionId, matchedRules, score, userId);

        return {
            success: true,
            submission_id: submissionId,
            score,
            total_answers: answers.length,
            matched_rules: matchedRules.length,
            action_points: createdActionPoints.length,
            created_action_points: createdActionPoints,
            nso_status: matchedRules.length > 0 ? "Open" : "Closed"
        };

    }
    catch (err) {
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

    updateNSOStatus

    // NOTE: createActionPoints is no longer exported from
    // here — use actionPointService.createFromRules instead.

};
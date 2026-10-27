// ======================================================
// ISSUE CONTROL CENTER — RULES API
// ======================================================
// Rules decide which checklist answers raise an Action Point. They are
// evaluated by utils/issueRuleEvaluator.js for new submissions AND for
// the Action Points Re-check, so what is saved here is exactly what is
// applied.
//
// • The question text and checklist type are taken from the selected
//   checklist question (questions + checklist_types), never typed by
//   hand, so a rule always belongs to that exact question.
// • One rule per question / checklist type (checked here and by the
//   database key).
// • Answer combinations are validated before saving.
// • Saving a rule affects NEW submissions immediately. Existing Action
//   Points are not rewritten; the administrator previews and applies
//   that with "Re-check Answers" on the Action Points page.
// ======================================================

const Rule = require("../models/issueControlRuleModel");
const {
    validateRuleConfig,
    canonicalLabel,
    suggestedRepair,
    EXPECTED_OPTIONS,
    ISSUE_OPTIONS
} = require("../utils/issueRuleEvaluator");

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const cols = "id, question_id, question_text, checklist_type, expected_answer, issue_answer, priority, sla_days, departments, is_active, created_at, updated_at";
const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const HISTORY_NOTE = "It applies to new checklist submissions immediately. Existing Action Points are not changed — use Re-check Answers on the Action Points page to preview and apply.";

const badRequest = (res, errors) => res.status(400).json({ success: false, message: errors[0], errors });

// ------------------------------------------------------
// QUESTIONS (with checklist type) — authoritative source
// ------------------------------------------------------
// department_names: the question's configured departments (Settings ->
// Questions). Shown read-only in the rule library when the rule's own
// free-text "Responsible department(s)" is empty, because the question
// mapping is what Action Points use for their department.
const loadQuestions = () => Rule.query(`
    SELECT q.id, q.question, q.status, q.sequence_no, q.checklist_type_id, ct.checklist_name,
        (
            SELECT GROUP_CONCAT(DISTINCT d.department_name ORDER BY d.department_name SEPARATOR ', ')
            FROM question_departments qd
            INNER JOIN departments d ON d.id = qd.department_id
            WHERE qd.question_id = q.id
        ) AS department_names
    FROM questions q
    LEFT JOIN checklist_types ct ON ct.id = q.checklist_type_id
    ORDER BY ct.checklist_name, q.sequence_no, q.id
`);

const loadQuestion = async (id) => {
    const rows = await Rule.query(`
        SELECT q.id, q.question, q.status, q.checklist_type_id, ct.checklist_name
        FROM questions q
        LEFT JOIN checklist_types ct ON ct.id = q.checklist_type_id
        WHERE q.id = ?
        LIMIT 1
    `, [id]);
    return rows?.[0] || null;
};

const isActiveQuestion = (q) => norm(q?.status || "Active") === "active";

// Same idea as inspectionService.findRuleForAnswer: exact question id
// first; text + checklist type only for rules without a usable link.
const questionForRule = (rule, questions, byId) => {
    if (rule.question_id != null && byId.has(Number(rule.question_id))) {
        return byId.get(Number(rule.question_id));
    }
    const textKey = norm(rule.question_text);
    const typeKey = norm(rule.checklist_type);
    return questions.find((q) =>
        norm(q.question) === textKey && (!typeKey || norm(q.checklist_name) === typeKey)
    ) || null;
};

const describeRule = (rule, questions, byId) => {
    const question = questionForRule(rule, questions, byId);
    const configErrors = validateRuleConfig(rule);
    return {
        ...rule,
        linked_question_id: question ? question.id : null,
        question_status: question ? (question.status || "Active") : null,
        question_state: !question ? "missing" : isActiveQuestion(question) ? "active" : "inactive",
        question_departments: question ? (question.department_names || null) : null,
        config_errors: configErrors,
        suggested_repair: suggestedRepair(rule)
    };
};

// ------------------------------------------------------
// VALIDATE + NORMALISE A REQUEST BODY
// ------------------------------------------------------
const prepare = async (body = {}, existing = null) => {
    const errors = [];
    let questionId = body.question_id !== undefined && body.question_id !== null && String(body.question_id).trim() !== "" && String(body.question_id) !== "__legacy__"
        ? Number(body.question_id)
        : null;
    let questionText = "";
    let checklistType = null;

    if (questionId) {
        const question = Number.isInteger(questionId) && questionId > 0 ? await loadQuestion(questionId) : null;
        if (!question) {
            errors.push("The selected checklist question no longer exists. Choose another question.");
        } else {
            questionText = String(question.question || "").trim();
            checklistType = question.checklist_name || null;
        }
    } else if (existing) {
        // Legacy rule saved without a question link: keep its question.
        questionId = existing.question_id || null;
        questionText = String(existing.question_text || "").trim();
        checklistType = existing.checklist_type || null;
    } else {
        errors.push("Select a checklist question.");
    }

    const expected = canonicalLabel(body.expected_answer, "expected");
    const issue = canonicalLabel(body.issue_answer, "issue");
    errors.push(...validateRuleConfig({ expected_answer: expected, issue_answer: issue }));

    const priority = PRIORITIES.includes(body.priority) ? body.priority : (body.priority ? null : "Medium");
    if (!priority) errors.push("Priority must be Low, Medium, High or Critical.");

    const sla = Number(body.sla_days ?? 0);
    if (!Number.isFinite(sla) || sla < 0 || sla > 365 || Math.floor(sla) !== sla) {
        errors.push("SLA (days) must be a whole number from 0 to 365.");
    }

    const departments = String(body.departments ?? "").trim();
    if (departments.length > 500) errors.push("Responsible department(s) is too long (max 500 characters).");

    const isActive = body.is_active === undefined ? 1 : (Number(body.is_active) ? 1 : 0);

    return {
        errors,
        data: {
            question_id: questionId || null,
            question_text: questionText,
            checklist_type: checklistType,
            expected_answer: expected,
            issue_answer: issue,
            priority: priority || "Medium",
            sla_days: Number.isFinite(sla) ? Math.max(0, Math.floor(sla)) : 0,
            departments: departments || null,
            is_active: isActive
        }
    };
};

// Another rule for the same question / checklist type?
const findConflict = async (data, excludeId = 0) => {
    const rows = await Rule.query(`
        SELECT id, question_text, checklist_type
        FROM issue_control_rules
        WHERE id <> ?
          AND (
                (question_id IS NOT NULL AND question_id = ?)
                OR (LOWER(TRIM(question_text)) = ? AND LOWER(TRIM(COALESCE(checklist_type, ''))) = ?)
          )
        LIMIT 1
    `, [Number(excludeId) || 0, data.question_id || 0, norm(data.question_text), norm(data.checklist_type)]);
    return rows?.[0] || null;
};

const conflictResponse = (res, conflict) => res.status(409).json({
    success: false,
    message: `A rule already exists for this question${conflict.checklist_type ? ` in ${conflict.checklist_type}` : ""}. Edit that rule instead.`,
    conflict_rule_id: conflict.id
});

// ------------------------------------------------------
// GET /api/issue-control-rules
// ------------------------------------------------------
exports.list = async (req, res) => {
    try {
        await Rule.ensureTable();
        const [rows, questions] = await Promise.all([
            Rule.query(`SELECT ${cols} FROM issue_control_rules ORDER BY checklist_type, question_text`),
            loadQuestions()
        ]);
        const byId = new Map(questions.map((q) => [Number(q.id), q]));
        res.json({
            success: true,
            rules: rows.map((rule) => describeRule(rule, questions, byId)),
            options: { expected_answers: EXPECTED_OPTIONS, issue_answers: ISSUE_OPTIONS }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Unable to load issue rules." });
    }
};

// ------------------------------------------------------
// GET /api/issue-control-rules/questions
// Every checklist question with its rule state (per-question controls).
// ------------------------------------------------------
exports.questions = async (req, res) => {
    try {
        await Rule.ensureTable();
        const [rules, questions] = await Promise.all([
            Rule.query(`SELECT ${cols} FROM issue_control_rules`),
            loadQuestions()
        ]);
        const byId = new Map(questions.map((q) => [Number(q.id), q]));
        const ruleByQuestion = new Map();
        for (const rule of rules) {
            const question = questionForRule(rule, questions, byId);
            if (question && !ruleByQuestion.has(Number(question.id))) {
                ruleByQuestion.set(Number(question.id), describeRule(rule, questions, byId));
            }
        }
        res.json({
            success: true,
            questions: questions.map((q) => {
                const rule = ruleByQuestion.get(Number(q.id)) || null;
                return {
                    id: q.id,
                    question: q.question,
                    status: q.status || "Active",
                    checklist_type_id: q.checklist_type_id,
                    checklist_name: q.checklist_name || null,
                    rule_state: !rule ? "none" : Number(rule.is_active) ? "active" : "inactive",
                    rule
                };
            })
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Unable to load checklist questions." });
    }
};

// ------------------------------------------------------
// POST /api/issue-control-rules
// ------------------------------------------------------
exports.create = async (req, res) => {
    try {
        await Rule.ensureTable();
        const { errors, data } = await prepare(req.body);
        if (errors.length) return badRequest(res, errors);

        const conflict = await findConflict(data);
        if (conflict) return conflictResponse(res, conflict);

        const r = await Rule.query(
            "INSERT INTO issue_control_rules (question_id,question_text,checklist_type,expected_answer,issue_answer,priority,sla_days,departments,is_active) VALUES (?,?,?,?,?,?,?,?,?)",
            [data.question_id, data.question_text, data.checklist_type, data.expected_answer, data.issue_answer, data.priority, data.sla_days, data.departments, data.is_active]
        );
        res.status(201).json({ success: true, id: r.insertId, message: `Issue rule created. ${HISTORY_NOTE}` });
    } catch (e) {
        console.error(e);
        res.status(e.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, message: e.code === "ER_DUP_ENTRY" ? "A rule already exists for this question. Edit that rule instead." : "Unable to create issue rule." });
    }
};

// ------------------------------------------------------
// PUT /api/issue-control-rules/:id
// ------------------------------------------------------
exports.update = async (req, res) => {
    try {
        await Rule.ensureTable();
        const id = Number(req.params.id);
        const found = await Rule.query(`SELECT ${cols} FROM issue_control_rules WHERE id = ? LIMIT 1`, [id]);
        if (!found.length) return res.status(404).json({ success: false, message: "Rule not found." });

        const { errors, data } = await prepare(req.body, found[0]);
        if (errors.length) return badRequest(res, errors);

        const conflict = await findConflict(data, id);
        if (conflict) return conflictResponse(res, conflict);

        await Rule.query(
            "UPDATE issue_control_rules SET question_id=?,question_text=?,checklist_type=?,expected_answer=?,issue_answer=?,priority=?,sla_days=?,departments=?,is_active=? WHERE id=?",
            [data.question_id, data.question_text, data.checklist_type, data.expected_answer, data.issue_answer, data.priority, data.sla_days, data.departments, data.is_active, id]
        );
        res.json({ success: true, message: `Issue rule updated. ${HISTORY_NOTE}` });
    } catch (e) {
        console.error(e);
        res.status(e.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, message: e.code === "ER_DUP_ENTRY" ? "A rule already exists for this question. Edit that rule instead." : "Unable to update issue rule." });
    }
};

// ------------------------------------------------------
// PATCH /api/issue-control-rules/:id/status   { is_active: 0|1 }
// ------------------------------------------------------
exports.setStatus = async (req, res) => {
    try {
        await Rule.ensureTable();
        const id = Number(req.params.id);
        const isActive = Number(req.body?.is_active) ? 1 : 0;
        const found = await Rule.query(`SELECT ${cols} FROM issue_control_rules WHERE id = ? LIMIT 1`, [id]);
        if (!found.length) return res.status(404).json({ success: false, message: "Rule not found." });

        if (isActive) {
            const problems = validateRuleConfig(found[0]);
            if (problems.length) {
                return res.status(400).json({ success: false, message: `Fix this rule before activating it: ${problems[0]}`, errors: problems });
            }
        }

        await Rule.query("UPDATE issue_control_rules SET is_active = ? WHERE id = ?", [isActive, id]);
        res.json({
            success: true,
            is_active: isActive,
            message: isActive
                ? `Rule activated. ${HISTORY_NOTE}`
                : "Rule deactivated. New submissions of this question will no longer raise Action Points. Existing Action Points are not changed."
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Unable to change rule status." });
    }
};

exports.remove = async (req, res) => {
    try {
        await Rule.ensureTable();
        const r = await Rule.query("DELETE FROM issue_control_rules WHERE id=?", [req.params.id]);
        if (!r.affectedRows) return res.status(404).json({ success: false, message: "Rule not found." });
        res.json({ success: true, message: "Issue rule deleted. Existing Action Points were not changed." });
    } catch (e) {
        res.status(500).json({ success: false, message: "Unable to delete issue rule." });
    }
};

exports.removeAll = async (req, res) => {
    try {
        await Rule.ensureTable();
        const r = await Rule.query("DELETE FROM issue_control_rules");
        res.json({ success: true, deleted: r.affectedRows || 0, message: "Issue rules deleted. Existing Action Points were not deleted." });
    } catch (e) {
        res.status(500).json({ success: false, message: "Unable to delete issue rules." });
    }
};

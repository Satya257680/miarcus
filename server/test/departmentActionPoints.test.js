// Regression tests: a question's configured department (Settings ->
// Questions / question_departments) must reach the Action Point and the
// Action Points Department filter.
// Run: node --test test/departmentActionPoints.test.js   (no database needed)
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(40);

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

// Stub config/db so the services load without a MySQL connection.
const captured = [];
const dbPath = require.resolve(path.join(__dirname, "../config/db"));
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        query: (sql, params, cb) => {
            if (typeof params === "function") { cb = params; params = []; }
            captured.push({ sql, params });
            if (cb) return cb(null, [{ total: 0 }]);
            return Promise.resolve([]);
        },
        execute: () => Promise.resolve([]),
        getConnection: async () => ({ release() {} }),
        closePool: async () => {}
    }
};

const inspection = require("../services/inspectionService");
const ActionPoint = require("../models/actionPointModel");

const placeholders = (sql) => (sql.match(/\?/g) || []).length;

test("Action Point takes its department from the question, not the rule", () => {
    const { actionPointData } = inspection.buildActionPointData(
        { id: 100, store_id: 1 },
        { answer_id: 1001, question_id: 1, department_ids: "3,1", rule: { id: 7, department_ids: null } },
        10
    );
    assert.strictEqual(actionPointData.department_id, 1);
});

test("Legacy rule departments are only a fallback", () => {
    const { actionPointData } = inspection.buildActionPointData(
        { id: 100, store_id: 1 },
        { answer_id: 1002, question_id: 2, department_ids: null, rule: { id: 8, department_ids: "5" } },
        10
    );
    assert.strictEqual(actionPointData.department_id, 5);
});

test("A question with no department keeps department_id NULL (nothing guessed)", () => {
    const { actionPointData } = inspection.buildActionPointData(
        { id: 100, store_id: 1 },
        { answer_id: 1003, question_id: 4, department_ids: "", rule: { id: 9, department_ids: null } },
        10
    );
    assert.strictEqual(actionPointData.department_id, null);
});

test("Non-issue answers do not produce matched rules", () => {
    const rules = [{ id: 1, question_id: 1, trigger_column: "Are there any tile issues?", checklist_type: "Opening Checklist", expected_answer: "No", issue_answer: "Yes", create_action_point: 1, is_active: 1 }];
    const base = { question_id: 1, question: "Are there any tile issues?", checklist_name: "Opening Checklist", department_ids: "1" };
    assert.strictEqual(inspection.evaluateRules([{ ...base, id: 1, answer: "No" }], rules).length, 0);
    const issue = inspection.evaluateRules([{ ...base, id: 2, answer: "Yes" }], rules);
    assert.strictEqual(issue.length, 1);
    assert.strictEqual(issue[0].department_ids, "1");
});

test("List, count and export use the question-aware department filter with aligned placeholders", async () => {
    const filters = {
        department_id: 1, store_id: 1, status: "Open", priority: "High", checklist_type_id: 1,
        start_date: "2026-10-01", end_date: "2026-10-27", search: "tile", designation_id: 2,
        offset: 0, limit: 10
    };
    for (const fn of ["getAll", "count", "exportData"]) {
        captured.length = 0;
        await new Promise((resolve) => ActionPoint[fn](filters, resolve));
        const { sql, params } = captured[0];
        assert.match(sql, /question_departments flt_qd/, `${fn} must check question_departments`);
        assert.strictEqual(placeholders(sql), params.length, `${fn} placeholders vs values`);
    }
});

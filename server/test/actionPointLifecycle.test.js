// Regression tests: Action Point lifecycle (per-store question lock,
// Completed Action Points, attachment "View" list, active-only deletes).
// Run: node --test test/actionPointLifecycle.test.js   (no database needed)
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(40);

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

// ------------------------------------------------------
// Stub config/db: every query is recorded and answered by `responder`.
// ------------------------------------------------------
const captured = [];
let responder = () => [];

const run = (sql, params) => {
    captured.push({ sql: String(sql), params: params || [] });
    return responder(String(sql), params || []);
};

const dbPath = require.resolve(path.join(__dirname, "../config/db"));
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        query: (sql, params, cb) => {
            if (typeof params === "function") { cb = params; params = []; }
            const result = Promise.resolve().then(() => run(sql, params));
            if (cb) { result.then((rows) => cb(null, rows), cb); return undefined; }
            return result;
        },
        execute: (sql, params) => Promise.resolve(run(sql, params)),
        getConnection: async () => ({
            beginTransaction: async () => {},
            commit: async () => {},
            rollback: async () => {},
            release() {},
            query: async (sql, params) => [run(sql, params)],
            execute: async (sql, params) => [run(sql, params)]
        }),
        closePool: async () => {}
    }
};

const reset = (fn = () => []) => { captured.length = 0; responder = fn; };
const placeholders = (sql) => (sql.match(/\?/g) || []).length;

const { buildAttachmentList, withAttachments, toSafeReference } = require("../utils/actionPointAttachments");
const lock = require("../services/checklistQuestionLockService");
const ActionPoint = require("../models/actionPointModel");
const CompletedModel = require("../models/completedActionPointModel");
const completed = require("../services/completedActionPointService");
const { readFilters } = require("../controllers/completedActionPointController");

// ======================================================
// ATTACHMENTS
// ======================================================

test("attachment list merges own file, Take Action photos, question evidence and checklist file", () => {
    const list = buildAttachmentList({
        attachment: "C:\\miarcus\\server\\uploads\\ap.pdf",
        action_photos: JSON.stringify(["uploads/fix-1.jpg", "uploads/fix-2.jpg"]),
        answer_photos: JSON.stringify(["uploads/q.jpg", "https://cdn.example.com/q.png"]),
        submission_attachment: "/var/app/uploads/sub.pdf"
    });
    assert.deepStrictEqual(list.map((i) => i.path), [
        "uploads/ap.pdf",
        "uploads/fix-1.jpg",
        "uploads/fix-2.jpg",
        "uploads/q.jpg",
        "https://cdn.example.com/q.png",
        "uploads/sub.pdf"
    ]);
    assert.deepStrictEqual([...new Set(list.map((i) => i.source))], ["Action Points", "Checklist Submission"]);
    assert.ok(!JSON.stringify(list).includes("C:"), "no server disk path leaks to the browser");
});

test("attachment list is empty (no misleading View) when nothing exists", () => {
    assert.deepStrictEqual(buildAttachmentList({ attachment: null, action_photos: "[]", answer_photos: "" }), []);
    const row = withAttachments({ id: 1, attachment: null });
    assert.strictEqual(row.attachment_count, 0);
});

test("path traversal and duplicates are dropped", () => {
    assert.strictEqual(toSafeReference("uploads/../../etc/passwd"), null);
    const list = buildAttachmentList({ attachment: "uploads/a.jpg", action_photos: ["uploads/a.jpg"] });
    assert.strictEqual(list.length, 1);
});

test("withAttachments removes the raw evidence columns", () => {
    const row = withAttachments({ id: 5, action_photos: "[]", answer_photos: null, submission_attachment: null });
    assert.strictEqual(row.action_photos, undefined);
    assert.strictEqual(row.answer_photos, undefined);
    assert.strictEqual(row.submission_attachment, undefined);
});

// ======================================================
// PER-STORE QUESTION LOCK
// ======================================================

test("only Opening / Closing checklists use the question lock", () => {
    assert.ok(lock.isLockableChecklist("Opening Checklist"));
    assert.ok(lock.isLockableChecklist("Store CLOSING checklist"));
    assert.ok(!lock.isLockableChecklist("RM Visit Checklist"));
});

test("lock query is scoped to store + checklist type + unresolved checklist Action Points", async () => {
    reset((sql) => (sql.includes("FROM action_points") ? [
        { action_point_id: 9, question_id: 11, status: "Open", priority: "High", raised_at: "2026-10-28", submission_id: 100 },
        { action_point_id: 7, question_id: 11, status: "Open", priority: "Low", raised_at: "2026-10-20", submission_id: 90 }
    ] : []));
    const locked = await lock.getLockedQuestions({ storeId: 4, checklistTypeId: 2, checklistName: "Opening Checklist" });
    const { sql, params } = captured.find((c) => c.sql.includes("FROM action_points"));
    assert.deepStrictEqual(params.slice(0, 2), [4, 2]);
    assert.match(sql, /ap\.store_id = \?/);
    assert.match(sql, /q\.checklist_type_id = \?/);
    assert.match(sql, /<> 'closed'/);
    assert.match(sql, /submission_answer_id IS NOT NULL OR ap\.submission_id IS NOT NULL/);
    assert.strictEqual(placeholders(sql), params.length);
    assert.strictEqual(locked.length, 1, "one entry per question (newest Action Point)");
    assert.strictEqual(locked[0].action_point_id, 9);
    assert.strictEqual(locked[0].message, lock.LOCKED_MESSAGE);
});

test("non-lockable checklist never queries or locks", async () => {
    reset(() => { throw new Error("must not query"); });
    assert.deepStrictEqual(
        await lock.getLockedQuestions({ storeId: 4, checklistTypeId: 3, checklistName: "RM Visit Checklist" }),
        []
    );
});

test("submission with an answer for a locked question is rejected (409 QUESTION_LOCKED)", async () => {
    reset((sql) => (sql.includes("FROM action_points") ? [{ action_point_id: 9, question_id: 11, status: "Open" }] : []));
    await assert.rejects(
        lock.assertAnswersAllowed({
            storeId: 1,
            checklistTypeId: 1,
            checklistName: "Opening Checklist",
            answers: [{ question_id: 11 }, { question_id: 12 }]
        }),
        (error) => error.status === 409 && error.code === "QUESTION_LOCKED" && error.locked[0].question_id === 11
    );
    const { params } = captured.find((c) => c.sql.includes("FROM action_points"));
    assert.deepStrictEqual(params, [1, 1, 11, 12], "only the submitted questions of this store are checked");
});

test("submission without locked answers passes", async () => {
    reset(() => []);
    await lock.assertAnswersAllowed({
        storeId: 1, checklistTypeId: 1, checklistName: "Closing Checklist", answers: [{ question_id: 12 }]
    });
});

// ======================================================
// ACTIVE LIST / ACTIVE-ONLY DELETE
// ======================================================

test("Action Points list, count and export show active records only", async () => {
    for (const fn of ["getAll", "count", "exportData"]) {
        reset(() => [{ total: 0 }]);
        await new Promise((resolve, reject) => ActionPoint[fn]({ search: "x", offset: 0, limit: 10 }, (e) => (e ? reject(e) : resolve())));
        const { sql, params } = captured[0];
        assert.ok(sql.includes(ActionPoint.ACTIVE_ONLY_SQL), `${fn} uses the active-only rule`);
        assert.strictEqual(placeholders(sql), params.length, `${fn} placeholders`);
    }
});

test("Action Points Delete All only targets active rows", async () => {
    reset((sql) => (sql.startsWith("SELECT ap.id") ? [{ id: 3 }] : { affectedRows: 1 }));
    const result = await new Promise((resolve, reject) =>
        ActionPoint.deleteAll([3, 4, 5], (e, r) => (e ? reject(e) : resolve(r)))
    );
    assert.ok(captured[0].sql.includes(ActionPoint.ACTIVE_ONLY_SQL));
    const deletes = captured.filter((c) => c.sql.startsWith("DELETE FROM action_points"));
    assert.deepStrictEqual(deletes[0].params, [3], "closed ids 4,5 are never deleted");
    assert.strictEqual(result.affectedRows, 1);
});

// ======================================================
// COMPLETED ACTION POINTS
// ======================================================

test("Completed filters: only completed, not archived; placeholders match", () => {
    const { sql, values } = CompletedModel.buildWhere({
        store_id: 1, department_id: 2, checklist_type_id: 3, checklist_kind: "Opening",
        priority: "High", start_date: "2026-10-01", end_date: "2026-10-31", search: "bulb",
        designation_id: 4, scope_sql: "(ap.store_id IN (?))", scope_params: [[1]]
    });
    assert.match(sql, /= 'closed'/);
    assert.match(sql, /completed_archived_at IS NULL/);
    assert.strictEqual(placeholders(sql), values.length);
});

test("controller filter reader drops malformed values", () => {
    assert.deepStrictEqual(
        readFilters({ store_id: "abc", priority: "Urgent", start_date: "28/10/2026", checklist_kind: "Opening", search: "  x  ", department_id: "7" }),
        { checklist_kind: "Opening", search: "x", department_id: 7 }
    );
});

test("edit rejects lifecycle linkage and invalid values", async () => {
    await assert.rejects(completed.normalizeEdit({ store_id: 2 }), (e) => e.statusCode === 400);
    await assert.rejects(completed.normalizeEdit({ status: "Open" }), (e) => e.statusCode === 400);
    await assert.rejects(completed.normalizeEdit({ priority: "Urgent" }), (e) => e.statusCode === 400);
    await assert.rejects(completed.normalizeEdit({ action_taken: "   " }), (e) => e.statusCode === 400);
    reset(() => []);
    await assert.rejects(completed.normalizeEdit({ assigned_to: 999 }), (e) => e.statusCode === 400);
    assert.deepStrictEqual(await completed.normalizeEdit({ priority: "High", remarks: " ok " }), { priority: "High", remarks: "ok" });
});

test("Delete All requires the confirmed count to match the server count", async () => {
    reset((sql) => (sql.includes("SELECT DISTINCT ap.id") ? [{ id: 1 }, { id: 2 }] : []));
    await assert.rejects(completed.removeAll({}, 5, 1), (e) => e.code === "CONFIRM_COUNT_MISMATCH" && e.statusCode === 409);
    await assert.rejects(completed.removeAll({}, undefined, 1), (e) => e.code === "CONFIRM_COUNT_REQUIRED");
});

test("Delete All archives (never hard-deletes) completed rows", async () => {
    reset((sql) => {
        if (sql.includes("SELECT DISTINCT ap.id")) return [{ id: 1 }, { id: 2 }];
        if (sql.includes("FOR UPDATE")) return [{ id: 1 }, { id: 2 }];
        if (sql.startsWith("UPDATE action_points")) return { affectedRows: 2 };
        return [];
    });
    const result = await completed.removeAll({}, 2, 1);
    assert.strictEqual(result.deleted, 2);
    assert.ok(!captured.some((c) => /^\s*DELETE FROM action_points/i.test(c.sql)), "no hard delete");
    assert.ok(captured.some((c) => c.sql.includes("completed_archived_at = CURRENT_TIMESTAMP")));
    assert.ok(captured.some((c) => c.sql.includes("'ARCHIVED'")), "history written");
});

// ======================================================
// ROUTES
// ======================================================

test("Completed routes are registered before the generic /:id routes", () => {
    const router = require("../routes/actionpointRoutes");
    const order = router.stack
        .filter((layer) => layer.route)
        .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    const index = (entry) => order.indexOf(entry);
    for (const method of ["GET", "DELETE"]) {
        assert.ok(index(`${method} /completed`) >= 0, `${method} /completed registered`);
        assert.ok(index(`${method} /completed`) < index(`${method} /:id`), `${method} /completed before /:id`);
    }
    assert.ok(index("GET /completed/export") < index("GET /:id"));
});

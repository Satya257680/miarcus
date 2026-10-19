// Regression tests for the L&D media / duration / email fixes and the
// token hardening. No real database, mail provider or network is used:
// config/db and services/emailService are replaced in require.cache.
//
// Run:  node --test test/lnd-auth-fixes.test.js   (from server/)

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-that-is-at-least-64-characters-long-1234567890";
process.env.NODE_ENV = "test";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "miarcus-test-"));
process.env.UPLOAD_DIR = TMP;

// ---------------- fake database ----------------
const fakeDb = {
    handler: async () => [],
    calls: [],
    query(sql, params = [], callback) {
        if (typeof params === "function") { callback = params; params = []; }
        fakeDb.calls.push({ sql: String(sql), params });
        const p = Promise.resolve().then(() => fakeDb.handler(String(sql), params));
        if (typeof callback === "function") { p.then((r) => callback(null, r), (e) => callback(e)); return undefined; }
        return p;
    },
    reset(handler) { fakeDb.calls = []; fakeDb.handler = handler || (async () => []); },
};
require.cache[require.resolve("../config/db")] = { id: "db", filename: "db", loaded: true, exports: fakeDb };

// ---------------- fake email service ----------------
const sent = [];
const fakeEmail = { sendEmail: async (mail) => { if (fakeEmail.fail) throw fakeEmail.fail; sent.push(mail); return { id: "x" }; }, fail: null };
require.cache[require.resolve("../services/emailService")] = { id: "email", filename: "email", loaded: true, exports: fakeEmail };

const canResolve = (name) => { try { require.resolve(name); return true; } catch { return false; } };
const hasExpress = canResolve("express");
const hasJwt = canResolve("jsonwebtoken");

test.after(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

// =====================================================
// storage.resolveUploadFile
// =====================================================
test("resolveUploadFile resolves inside UPLOAD_DIR and never creates anything", () => {
    const { resolveUploadFile, UPLOAD_DIR } = require("../config/storage");
    const target = resolveUploadFile("lnd", "123-abc.mp4");
    assert.equal(target, path.join(UPLOAD_DIR, "lnd", "123-abc.mp4"));
    assert.equal(fs.existsSync(target), false, "must not mkdir a directory named like the file");
    for (const bad of ["../x", "..", ".env", "a/b.mp4", "a\\b.mp4", "", null, "x\0.mp4"]) {
        assert.equal(resolveUploadFile("lnd", bad), null, `rejects ${JSON.stringify(bad)}`);
    }
    assert.equal(resolveUploadFile("../../etc", "passwd"), null);
});

// =====================================================
// L&D media streaming (the HTTP 500 "Unable to load file")
// =====================================================
const sign = (id, exp) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(`lnd-media:${id}:${exp}`).digest("hex");

const startMediaServer = async () => {
    const express = require("express");
    const c = require("../controllers/lndController");
    const app = express();
    app.get("/api/lnd/media/:id/file", c.streamMedia);
    const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    return { server, base: `http://127.0.0.1:${server.address().port}` };
};

test("L&D media: existing file streams (200), supports Range (206), missing file is 404 without creating a folder", { skip: !hasExpress && "express not installed" }, async () => {
    const { UPLOAD_DIR } = require("../config/storage");
    const dir = path.join(UPLOAD_DIR, "lnd");
    fs.mkdirSync(dir, { recursive: true });
    const content = Buffer.from("0123456789abcdefghij");
    fs.writeFileSync(path.join(dir, "1700000000000-aaaa.mp4"), content);

    const rows = {
        1: { id: 1, stored_name: "1700000000000-aaaa.mp4", original_name: "Lesson 1.mp4", allow_download: 1 },
        2: { id: 2, stored_name: "1700000000000-missing.mp4", original_name: "Gone.mp4", allow_download: 1 },
        3: { id: 3, stored_name: "../../secret.txt", original_name: "x", allow_download: 1 },
    };
    fakeDb.reset(async (sql, params) => (/FROM lnd_media m/.test(sql) ? (rows[params[0]] ? [rows[params[0]]] : []) : []));

    const { server, base } = await startMediaServer();
    try {
        const exp = Date.now() + 60000;
        const url = (id, e = exp) => `${base}/api/lnd/media/${id}/file?exp=${e}&sig=${sign(id, e)}`;

        const ok = await fetch(url(1));
        assert.equal(ok.status, 200);
        assert.equal(ok.headers.get("content-type"), "video/mp4");
        assert.equal(Buffer.from(await ok.arrayBuffer()).toString(), content.toString());

        const ranged = await fetch(url(1), { headers: { Range: "bytes=0-3" } });
        assert.equal(ranged.status, 206);
        assert.equal(await ranged.text(), "0123");

        const missing = await fetch(url(2));
        assert.equal(missing.status, 404);
        assert.equal(fs.existsSync(path.join(dir, "1700000000000-missing.mp4")), false, "no directory may be created for a missing file");

        const traversal = await fetch(url(3));
        assert.equal(traversal.status, 404);

        const badSig = await fetch(`${base}/api/lnd/media/1/file?exp=${exp}&sig=${"0".repeat(64)}`);
        assert.equal(badSig.status, 403);

        const expired = await fetch(url(1, Date.now() - 1000));
        assert.equal(expired.status, 403);
    } finally {
        server.close();
    }
});

test("L&D media: a folder left behind by the old mkdir bug is treated as missing (404, not 500)", { skip: !hasExpress && "express not installed" }, async () => {
    const { UPLOAD_DIR } = require("../config/storage");
    fs.mkdirSync(path.join(UPLOAD_DIR, "lnd", "1700000000000-dir.mp4"), { recursive: true });
    fakeDb.reset(async (sql) => (/FROM lnd_media m/.test(sql) ? [{ id: 9, stored_name: "1700000000000-dir.mp4", original_name: "d.mp4", allow_download: 1 }] : []));
    const { server, base } = await startMediaServer();
    try {
        const exp = Date.now() + 60000;
        const r = await fetch(`${base}/api/lnd/media/9/file?exp=${exp}&sig=${sign(9, exp)}`);
        assert.equal(r.status, 404);
    } finally {
        server.close();
    }
});

// =====================================================
// authMiddleware — token subject validation
// =====================================================
const runAuth = (token) => new Promise((resolve) => {
    const auth = require("../middleware/authMiddleware");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ status: this.statusCode, body, req }); return this; },
    };
    auth(req, res, () => resolve({ status: 200, next: true, req }));
});

const signLogin = (claims, opts = {}) => {
    const jwt = require("jsonwebtoken");
    const { JWT_SECRET, JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE } = require("../config/security");
    return jwt.sign(claims, JWT_SECRET, { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: "1h", ...opts });
};

const activeUser = (over = {}) => [{ id: 7, name: "Asha", email: "a@x.com", status: "Active", is_activated: 1, is_admin: 0, token_version: 2, ...over }];

test("authMiddleware: a valid login token still authenticates (unchanged behaviour)", { skip: !hasJwt && "jsonwebtoken not installed" }, async () => {
    fakeDb.reset(async () => activeUser());
    const r = await runAuth(signLogin({ id: 7, email: "a@x.com", is_admin: 0, tokenVersion: 2 }));
    assert.equal(r.next, true);
    assert.equal(r.req.user.id, 7);
});

test("authMiddleware: password-reset / typed tokens are rejected before any DB lookup", { skip: !hasJwt && "jsonwebtoken not installed" }, async () => {
    fakeDb.reset(async () => activeUser());
    const reset = await runAuth(signLogin({ sub: "a@x.com", type: "password-reset", jti: "j" }));
    assert.equal(reset.status, 401);
    const typedWithId = await runAuth(signLogin({ id: 7, type: "file-access", tokenVersion: 2 }));
    assert.equal(typedWithId.status, 401);
    const badId = await runAuth(signLogin({ id: "7 OR 1=1", tokenVersion: 2 }));
    assert.equal(badId.status, 401);
    assert.equal(fakeDb.calls.length, 0, "rejected before the users query");
});

test("authMiddleware: revoked token version is still rejected", { skip: !hasJwt && "jsonwebtoken not installed" }, async () => {
    fakeDb.reset(async () => activeUser({ token_version: 3 }));
    const r = await runAuth(signLogin({ id: 7, tokenVersion: 2 }));
    assert.equal(r.status, 401);
});

// =====================================================
// shared stream / file token check
// =====================================================
test("authenticateLoginToken: accepts current sessions, rejects revoked / inactive / non-activated users", { skip: !hasJwt && "jsonwebtoken not installed" }, async () => {
    const { authenticateLoginToken } = require("../utils/accessToken");
    const token = signLogin({ id: 7, tokenVersion: 2 });

    fakeDb.reset(async () => activeUser());
    assert.ok(await authenticateLoginToken(token));

    fakeDb.reset(async () => activeUser({ token_version: 5 }));
    assert.equal(await authenticateLoginToken(token), null, "revoked session");

    fakeDb.reset(async () => activeUser({ status: "Inactive" }));
    assert.equal(await authenticateLoginToken(token), null, "inactive user");

    fakeDb.reset(async () => activeUser({ is_activated: 0 }));
    assert.equal(await authenticateLoginToken(token), null, "not activated");

    fakeDb.reset(async () => activeUser());
    assert.equal(await authenticateLoginToken(signLogin({ sub: "a@x.com", type: "password-reset" })), null, "reset token");
    assert.equal(await authenticateLoginToken("garbage"), null);
});

// =====================================================
// L&D email delivery + retry
// =====================================================
test("L&D email: a status-save error after a successful send is NOT recorded as failed", async () => {
    const svc = require("../services/lndNotificationService");
    sent.length = 0; fakeEmail.fail = null;
    const updates = [];
    fakeDb.reset(async (sql, params) => {
        if (/SET status = 'sent'/.test(sql)) throw new Error("db down");
        updates.push({ sql, params });
        return [];
    });
    await svc._deliver([{ id: 1, userId: 7, email: "a@x.com", noticeKey: "invite", payload: { kind: "invite", learnerName: "A", program: { id: 1, title: "P" }, moduleCount: 1 } }]);
    assert.equal(sent.length, 1);
    assert.equal(updates.filter((u) => /status = 'failed'/.test(u.sql)).length, 0);
});

test("L&D email: provider failure stores a sanitised, actionable reason", async () => {
    const svc = require("../services/lndNotificationService");
    const err = new Error("Gmail API authentication failed."); err.code = "GMAIL_API_AUTH_FAILED";
    fakeEmail.fail = err;
    const updates = [];
    fakeDb.reset(async (sql, params) => { updates.push({ sql, params }); return []; });
    await svc._deliver([{ id: 2, userId: 7, email: "a@x.com", noticeKey: "invite", payload: { kind: "invite", learnerName: "A", program: { id: 1, title: "P" }, moduleCount: 1 } }]);
    fakeEmail.fail = null;
    const failed = updates.find((u) => /status = 'failed'/.test(u.sql));
    assert.ok(failed);
    assert.match(failed.params[0], /GMAIL_REFRESH_TOKEN/);
    assert.equal(svc.failureReason(new Error("bad token=abc123secret")).includes("abc123secret"), false);
});

test("L&D email: retryFailed re-sends each failed invite once, even when clicked twice", async () => {
    const svc = require("../services/lndNotificationService");
    sent.length = 0; fakeEmail.fail = null;
    const notifications = new Map([[11, { id: 11, user_id: 7, notice_key: "invite", status: "failed" }]]);
    fakeDb.reset(async (sql, params) => {
        if (/FROM lnd_programs WHERE id = \?/.test(sql)) return [{ id: 1, title: "P", description: "", status: "Active" }];
        if (/SELECT id, user_id, notice_key, status FROM lnd_notifications/.test(sql)) return [...notifications.values()].filter((n) => n.status === "failed");
        if (/FROM users u/.test(sql)) return [{ id: 7, name: "Asha", email: "a@x.com" }];
        if (/COUNT\(\*\) AS n FROM lnd_modules/.test(sql)) return [{ n: 2 }];
        if (/UPDATE lnd_notifications SET status = 'queued'/.test(sql)) {
            const n = notifications.get(params[0]);
            if (n && n.status === "failed") { n.status = "queued"; return { affectedRows: 1 }; }
            return { affectedRows: 0 };
        }
        if (/SET status = 'sent'/.test(sql)) { const n = notifications.get(params[0]); if (n) n.status = "sent"; return { affectedRows: 1 }; }
        if (/lnd_access|page_permissions|user_page|lnd_settings/i.test(sql)) return [];
        return [];
    });
    // utils/lndAccess.accessibleUserSql may query settings; stub it.
    const lnd = require("../utils/lndAccess");
    const original = lnd.accessibleUserSql;
    lnd.accessibleUserSql = async () => ({ sql: "1=1", params: [] });
    try {
        const [a, b] = await Promise.all([svc.retryFailed({ programId: 1 }), svc.retryFailed({ programId: 1 })]);
        assert.equal(a.retried + b.retried, 1, "only one of two concurrent retries claims the row");
        await new Promise((r) => setTimeout(r, 30));
        assert.equal(sent.length, 1);
        assert.equal(notifications.get(11).status, "sent");
        const again = await svc.retryFailed({ programId: 1 });
        assert.equal(again.retried, 0, "a sent email is never retried");
    } finally {
        lnd.accessibleUserSql = original;
    }
});

// =====================================================
// production 5xx response guard
// =====================================================
test("errorResponseGuard strips SQL / internal details from 5xx bodies only", () => {
    const { _sanitize } = require("../middleware/errorResponseGuard");
    const out = _sanitize({ success: false, message: "Unknown column 'x' in 'field list'", error: "ER_BAD_FIELD_ERROR", sqlMessage: "..." }, "req-1");
    assert.equal(out.error, undefined);
    assert.equal(out.sqlMessage, undefined);
    assert.equal(out.requestId, "req-1");
    assert.doesNotMatch(out.message, /column/i);
    const friendly = _sanitize({ success: false, message: "Unable to load Action Point history.", error: "boom" });
    assert.equal(friendly.message, "Unable to load Action Point history.");
});

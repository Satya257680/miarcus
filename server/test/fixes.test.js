// Behavioural regression tests for the security fixes.
process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(40);

const test = require("node:test");
const assert = require("node:assert");

test("password policy accepts 8-64 characters and rejects others", () => {
    const { validatePassword } = require("../config/security");
    assert.strictEqual(validatePassword("Abcdef1!"), null);
    assert.strictEqual(validatePassword("Abcdefghijklmnop1!"), null);
    assert.ok(validatePassword("Abc1!"));
    assert.ok(validatePassword("Aa1!" + "x".repeat(70)));
});

test("originGuard origin list is shared with CORS defaults", () => {
    delete process.env.ALLOWED_ORIGINS;
    const { isAllowedBrowserOrigin } = require("../middleware/requestSecurity");
    assert.ok(isAllowedBrowserOrigin("http://localhost:5173"));
    assert.ok(isAllowedBrowserOrigin("https://rytual2.miarcus.com/"));
    assert.ok(!isAllowedBrowserOrigin("https://miarcus.vercel.app"));
    assert.ok(!isAllowedBrowserOrigin("https://rytual.miarcus.com"));
    assert.ok(!isAllowedBrowserOrigin("https://evil.example.com"));
});

test("public AI limiter is exported", (t) => {
    try { require.resolve("express-rate-limit"); }
    catch { return t.skip("express-rate-limit not installed"); }
    const m = require("../middleware/apiRateLimit");
    assert.strictEqual(typeof m.publicAiLimiter, "function");
});

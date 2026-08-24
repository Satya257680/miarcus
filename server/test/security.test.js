const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-that-is-at-least-64-characters-long-1234567890";
process.env.NODE_ENV = "test";
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_USER = process.env.DB_USER || "test";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "test";
process.env.DB_NAME = process.env.DB_NAME || "test";

const { validatePassword } = require("../config/security");
const { safeFilename, safeRelativePath } = require("../utils/pathSecurity");
const { isAllowedBrowserOrigin } = require("../middleware/requestSecurity");

const root = path.resolve(__dirname, "..");

function allJsFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", "uploads", "certs", "test"].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...allJsFiles(full));
        else if (entry.name.endsWith(".js")) out.push(full);
    }
    return out;
}

test("password policy rejects weak passwords", () => {
    assert.ok(validatePassword("password") !== null);
    assert.equal(validatePassword("StrongPassword1!"), null);
});

test("file names reject traversal and absolute paths", () => {
    assert.equal(safeFilename("../../.env"), null);
    assert.equal(safeFilename("..\\server.js"), null);
    assert.equal(safeFilename("/etc/passwd"), null);
    assert.equal(safeFilename("safe-document.pdf"), "safe-document.pdf");
    assert.equal(safeRelativePath("attendance/photo.jpg"), "attendance/photo.jpg");
    assert.equal(safeRelativePath("attendance/../../secret"), null);
});

test("browser origin guard allows configured/approved origins and rejects arbitrary origins", () => {
    process.env.ALLOWED_ORIGINS = "https://example.miarcus.test";
    assert.equal(isAllowedBrowserOrigin("https://example.miarcus.test"), true);
    assert.equal(isAllowedBrowserOrigin("https://evil.example"), false);
});

test("security regression scan contains no plaintext password fallback or hard-coded JWT fallback", () => {
    const files = allJsFiles(root);
    const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    assert.equal(source.includes("password === user.password"), false);
    assert.equal(source.includes("miarcus_secret_key"), false);
});

test("SQL templates do not interpolate request data directly", () => {
    const files = allJsFiles(root);
    const suspicious = [];
    for (const file of files) {
        const source = fs.readFileSync(file, "utf8");
        if (/`[^`]*\$\{\s*req\.(body|params|query)/s.test(source)) {
            suspicious.push(path.relative(root, file));
        }
    }
    assert.deepEqual(suspicious, []);
});

test("production database configuration does not silently disable TLS verification", () => {
    const source = fs.readFileSync(path.join(root, "config", "db.js"), "utf8");
    assert.equal(source.includes("rejectUnauthorized: false"), false);
    assert.equal(source.includes("family: 4"), false);
});

test("user list query never selects password hashes for API output", () => {
    const source = fs.readFileSync(path.join(root, "models", "userModel.js"), "utf8");
    const getAllStart = source.indexOf("const getAllUsers");
    const getAllEnd = source.indexOf("const checkEmailExists");
    const block = source.slice(getAllStart, getAllEnd);
    assert.equal(/\bu\.password\b/.test(block), false);
});

test("public upload directory is opt-in only", () => {
    const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
    assert.match(source, /ALLOW_PUBLIC_UPLOADS/);
    assert.match(source, /NODE_ENV === "production" \? "false" : "true"/);
});

test("diagnostic endpoints are protected by authentication", () => {
    const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
    for (const endpoint of ["/api/upload-test", "/api/routes/status", "/api/test"]) {
        const idx = source.indexOf(`"${endpoint}"`);
        assert.ok(idx >= 0, `${endpoint} missing`);
        const block = source.slice(idx, idx + 250);
        assert.match(block, /authMiddleware/);
    }
});

test("protected route modules include server-side authentication middleware", () => {
    const routesDir = path.join(root, "routes");
    const files = fs.readdirSync(routesDir).filter((name) => name.endsWith("Routes.js") && name !== "authRoutes.js");
    const missing = [];
    for (const file of files) {
        const source = fs.readFileSync(path.join(routesDir, file), "utf8");
        if (!source.includes("authMiddleware")) missing.push(file);
    }
    assert.deepEqual(missing, []);
});

test("administrator authorization never trusts legacy JWT administrator claims", () => {
    const source = fs.readFileSync(path.join(root, "middleware", "permissionMiddleware.js"), "utf8");
    assert.doesNotMatch(source, /req\.user\.administrator/);
    assert.match(source, /Number\(req\.user\.is_admin\) === 1/);
});

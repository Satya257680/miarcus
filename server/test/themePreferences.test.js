// Appearance / theme preference API tests.
// Self-contained: runs the real route + model + adminOnly code against an
// in-memory database stub, so no MySQL, network or express install is needed.
//   node --test test/themePreferences.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");
const path = require("path");

function createHarness({ legacyGlobal = null } = {}) {
    const state = {
        users: { 1: { is_admin: 1 }, 2: { is_admin: 0 }, 3: { is_admin: 0 } },
        personal: {},
        global: legacyGlobal ? { ...legacyGlobal } : null,
        columns: {
            // An installation from BEFORE this upgrade.
            user_theme_preferences: new Set(["id", "user_id", "theme", "accent_color", "font_size", "font_family", "sidebar_style", "created_at", "updated_at"]),
            miarcus_global_theme_settings: new Set(["id", "enabled", "theme", "accent_color", "font_size", "font_family", "sidebar_style", "updated_by", "created_at", "updated_at"])
        }
    };

    function query(sql, params = [], cb) {
        if (typeof params === "function") { cb = params; params = []; }
        const s = sql.replace(/\s+/g, " ").trim();
        const done = (err, rows) => {
            if (cb) { Promise.resolve().then(() => cb(err, rows)); return undefined; }
            return err ? Promise.reject(err) : Promise.resolve(rows);
        };
        if (/^SELECT COUNT\(\*\) AS count FROM information_schema\.COLUMNS/.test(s)) {
            return done(null, [{ count: state.columns[params[0]]?.has(params[1]) ? 1 : 0 }]);
        }
        let m = s.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+) .*DEFAULT '?([\w-]+)'?/);
        if (m) {
            const [, table, column, def] = m;
            if (state.columns[table].has(column)) {
                const e = new Error("Duplicate column"); e.code = "ER_DUP_FIELDNAME"; e.errno = 1060; return done(e);
            }
            state.columns[table].add(column);
            const value = /^\d+$/.test(def) ? Number(def) : def;
            const rows = table === "user_theme_preferences" ? Object.values(state.personal) : (state.global ? [state.global] : []);
            rows.forEach((row) => { row[column] = value; });
            return done(null, []);
        }
        if (/^CREATE TABLE/.test(s)) return done(null, []);
        if (/^SELECT .* FROM user_theme_preferences WHERE user_id = \?/.test(s)) {
            const row = state.personal[params[0]]; return done(null, row ? [{ ...row }] : []);
        }
        if (/^INSERT INTO user_theme_preferences/.test(s)) {
            const cols = s.match(/\(([^)]*)\) VALUES/)[1].split(",").map((x) => x.trim());
            const row = {}; cols.forEach((c, i) => { row[c] = params[i]; });
            state.personal[row.user_id] = { ...(state.personal[row.user_id] || {}), ...row };
            return done(null, { affectedRows: 1 });
        }
        if (/^DELETE FROM user_theme_preferences WHERE user_id = \?/.test(s)) {
            delete state.personal[params[0]]; return done(null, { affectedRows: 1 });
        }
        if (/FROM miarcus_global_theme_settings WHERE id = 1/.test(s)) {
            if (!state.global) return done(null, []);
            const row = { ...state.global };
            // A column that does not exist yet would make MySQL fail the SELECT.
            if (!state.columns.miarcus_global_theme_settings.has("allow_personal")) {
                return done(new Error("Unknown column 'allow_personal'"));
            }
            return done(null, [row]);
        }
        if (/^INSERT INTO miarcus_global_theme_settings/.test(s)) {
            const cols = s.match(/\(([^)]*)\) VALUES/)[1].split(",").map((x) => x.trim());
            const values = [1, ...params];
            const row = {}; cols.forEach((c, i) => { row[c] = values[i]; });
            state.global = { ...(state.global || {}), ...row };
            return done(null, { affectedRows: 1 });
        }
        if (/^SELECT is_admin FROM users WHERE id = \?/.test(s)) {
            const user = state.users[params[0]]; return done(null, user ? [{ is_admin: user.is_admin }] : []);
        }
        return done(new Error("Unexpected SQL: " + s));
    }

    const routes = [];
    const fakeExpress = {
        Router() {
            const router = {};
            ["get", "put", "post", "delete", "patch"].forEach((method) => {
                router[method] = (routePath, ...handlers) => routes.push({ method: method.toUpperCase(), path: routePath, handlers });
            });
            return router;
        }
    };
    const fakeAuth = (req, res, next) => {
        const match = /^Bearer user-(\d+)$/.exec(req.headers.authorization || "");
        if (!match) return res.status(401).json({ success: false });
        const id = Number(match[1]);
        req.user = { id, is_admin: Number(state.users[id]?.is_admin) === 1 };
        return next();
    };

    const serverRoot = path.resolve(__dirname, "..");
    const files = ["models/themePreferenceModel.js", "routes/themePreferenceRoutes.js", "middleware/adminOnly.js"]
        .map((file) => require.resolve(path.join(serverRoot, file)));
    files.forEach((file) => { delete require.cache[file]; });

    const originalLoad = Module._load;
    Module._load = function load(request) {
        if (request === "express") return fakeExpress;
        if (request === "../config/db") return { query };
        if (request === "../middleware/authMiddleware") return fakeAuth;
        return originalLoad.apply(this, arguments);
    };
    let Model;
    try {
        Model = require(files[0]);
        require(files[1]);
    } finally {
        Module._load = originalLoad;
        files.forEach((file) => { delete require.cache[file]; });
    }

    const call = (method, routePath, userId, body) => {
        const route = routes.find((r) => r.method === method && r.path === routePath);
        assert.ok(route, `route ${method} ${routePath} exists`);
        const req = { headers: userId ? { authorization: `Bearer user-${userId}` } : {}, body };
        return new Promise((resolve, reject) => {
            let status = 200;
            const res = { status(code) { status = code; return res; }, json(payload) { resolve({ status, body: payload }); return res; } };
            let index = 0;
            const next = (err) => {
                if (err) return reject(err);
                const handler = route.handlers[index++];
                if (handler) Promise.resolve(handler(req, res, next)).catch(reject);
                return undefined;
            };
            next();
        });
    };

    return { state, Model, call };
}

test("normalize keeps valid values, drops unknown ones and fills new keys", () => {
    const { Model } = createHarness();
    const out = Model.normalize({ theme: "midnight", accentColor: "theme", motion: "reduced", cornerStyle: "sharp", tableDensity: "compact", evil: "<script>", fontSize: "huge" });
    assert.deepEqual(out, { theme: "midnight", accentColor: "theme", fontSize: "medium", fontFamily: "default", sidebarStyle: "comfortable", tableDensity: "compact", cornerStyle: "sharp", motion: "reduced" });
    assert.deepEqual(Model.normalize(null), Model.DEFAULT_PREFERENCES);
    assert.deepEqual(Model.normalize(["x"]), Model.DEFAULT_PREFERENCES);
});

test("migration adds the new columns to an existing install and can run twice", async () => {
    const { state, Model } = createHarness();
    state.personal[2] = { user_id: 2, theme: "nord", accent_color: "blue", font_size: "large", font_family: "serif", sidebar_style: "compact" };
    await Model.ensureTable();
    await Model.ensureTable();
    for (const column of ["table_density", "corner_style", "motion"]) {
        assert.ok(state.columns.user_theme_preferences.has(column), column);
        assert.ok(state.columns.miarcus_global_theme_settings.has(column), column);
    }
    assert.ok(state.columns.miarcus_global_theme_settings.has("allow_personal"));
    const kept = await Model.getPersonal(2);
    assert.equal(kept.isCustom, true);
    assert.equal(kept.preferences.theme, "nord");
    assert.equal(kept.preferences.fontSize, "large");
    assert.equal(kept.preferences.motion, "system");
});

test("a global theme that was active before the upgrade stays enforced", async () => {
    const { Model } = createHarness({ legacyGlobal: { id: 1, enabled: 1, theme: "royal", accent_color: "gold", font_size: "medium", font_family: "serif", sidebar_style: "comfortable" } });
    await Model.ensureTable();
    const globalTheme = await Model.getGlobal();
    assert.equal(globalTheme.enabled, true);
    assert.equal(globalTheme.allowPersonal, false);
    assert.equal(globalTheme.mode, "enforced");
    assert.equal(globalTheme.preferences.theme, "royal");
});

test("personal preferences: read, save, reset are scoped to the signed-in user", async () => {
    const { state, Model, call } = createHarness();
    await Model.ensureTable();

    let res = await call("GET", "/", 2);
    assert.equal(res.status, 200);
    assert.equal(res.body.isCustom, false);
    assert.equal(res.body.preferences.theme, "miarcus-original");

    res = await call("PUT", "/", 2, { theme: "aurora", accentColor: "teal", motion: "reduced" });
    assert.equal(res.status, 200);
    assert.equal(res.body.isCustom, true);
    assert.equal(state.personal[2].theme, "aurora");
    assert.equal(state.personal[2].motion, "reduced");
    assert.equal(state.personal[3], undefined, "other users untouched");

    // { preferences: {...} } body shape is accepted too.
    res = await call("PUT", "/", 3, { preferences: { theme: "dark" } });
    assert.equal(state.personal[3].theme, "dark");

    res = await call("DELETE", "/", 2);
    assert.equal(res.status, 200);
    assert.equal(res.body.isCustom, false);
    assert.equal(state.personal[2], undefined);
    assert.equal(state.personal[3].theme, "dark", "reset only affects the caller");

    res = await call("GET", "/", null);
    assert.equal(res.status, 401);
});

test("only administrators can save the organisation appearance", async () => {
    const { state, Model, call } = createHarness();
    await Model.ensureTable();

    let res = await call("PUT", "/global", 2, { enabled: true, preferences: { theme: "dark" } });
    assert.equal(res.status, 403);
    assert.equal(state.global, null);

    // A forged admin flag on the token is not enough: adminOnly re-checks the database.
    state.users[2].is_admin = 0;
    res = await call("PUT", "/global", 1, { enabled: true, allowPersonal: true, preferences: { theme: "professional", accentColor: "theme" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.globalTheme.mode, "default");
    assert.equal(Number(state.global.allow_personal), 1);

    res = await call("GET", "/global", 2);
    assert.equal(res.body.globalTheme.mode, "default");
    assert.equal(res.body.globalTheme.preferences.theme, "professional");

    // Older clients that do not send allowPersonal keep the original "enforced" behaviour.
    res = await call("PUT", "/global", 1, { enabled: true, preferences: { theme: "forest" } });
    assert.equal(res.body.globalTheme.mode, "enforced");

    res = await call("PUT", "/global", 1, { enabled: false });
    assert.equal(res.body.globalTheme.mode, "off");
    res = await call("GET", "/global", 3);
    assert.equal(res.body.globalTheme.enabled, false);
});

// ==========================================================
// LEARNING & DEVELOPMENT — OWNER-CONTROLLED ACCESS
// ==========================================================
//
// "Learning & Development" is an OWNER-GATED module:
//
//   • The OWNER (e.g. Satyajit Nayak) always has Full access.
//   • Everyone else — INCLUDING administrators — has NO access
//     unless the owner has explicitly granted a level.
//   • Only the owner can grant / change / revoke access.
//   • The normal Add/Edit User screens can never change it
//     (see userModel.updateUserPermissions, which preserves it).
//
// The owner is identified by environment variables (set in
// server/.env). If neither is set, NOBODY is the owner and the
// module is closed to everyone (fail closed).
//
//   LND_OWNER_EMAIL=satyajit@yourcompany.com          (comma list ok)
//   LND_OWNER_USER_ID=12                              (optional)
//
// ACCESS MODE (Access Control page → "Bulk Access Control")
// ----------------------------------------------------------
//   selected (default) → only users the owner granted (previous behaviour)
//   everyone           → every active user can at least VIEW (learner);
//                        explicit Manager / Full grants still apply;
//                        a per-user "Cannot see" is stored as a deny.
//   nobody             → nobody except the owner. Grants are kept (not
//                        deleted) so switching back restores them.
//
// The mode is applied inside getGrantedLevel(), which is the single
// function used by login, /api/users/me/access (sidebar) and the
// permission middleware (pages + APIs) — so sidebar, routes and APIs
// always agree.
// ==========================================================

const db = require("../config/db");

const MODULE_NAME = "Learning & Development";
const LEVELS = ["None", "View", "Add", "Edit", "Full"];
const RANK = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };
const MODES = ["selected", "everyone", "nobody"];

const GATED_MODULES = new Set([MODULE_NAME]);

const ownerEmails = () =>
    String(process.env.LND_OWNER_EMAIL || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

const ownerIds = () =>
    String(process.env.LND_OWNER_USER_ID || "")
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isInteger(v) && v > 0);

// Synchronous check when id + email are already known.
const isOwnerRow = ({ id, email } = {}) =>
    ownerIds().includes(Number(id)) ||
    ownerEmails().includes(String(email || "").trim().toLowerCase());

const isOwner = async (userId) => {
    if (!userId) return false;
    if (ownerIds().includes(Number(userId))) return true;
    if (!ownerEmails().length) return false;

    const rows = await db.query(
        "SELECT email FROM users WHERE id = ? LIMIT 1",
        [userId]
    );

    return ownerEmails().includes(
        String(rows?.[0]?.email || "").trim().toLowerCase()
    );
};

// ----------------------------------------------------------
// ACCESS MODE STORAGE
// ----------------------------------------------------------
let tablesReady = null;
const ensureAccessTables = () => {
    if (!tablesReady) {
        tablesReady = (async () => {
            await db.query(`
                CREATE TABLE IF NOT EXISTS lnd_access_settings (
                    id INT NOT NULL PRIMARY KEY,
                    mode VARCHAR(10) NOT NULL DEFAULT 'selected',
                    updated_by INT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await db.query(`
                CREATE TABLE IF NOT EXISTS lnd_access_denies (
                    user_id INT NOT NULL PRIMARY KEY,
                    created_by INT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            return true;
        })().catch((error) => {
            tablesReady = null;
            throw error;
        });
    }
    return tablesReady;
};

// Small in-process cache: the mode is read on every L&D request.
const MODE_TTL_MS = 5000;
let modeCache = { value: null, at: 0 };

const getAccessMode = async () => {
    if (modeCache.value && Date.now() - modeCache.at < MODE_TTL_MS) return modeCache.value;
    try {
        await ensureAccessTables();
        const rows = await db.query("SELECT mode FROM lnd_access_settings WHERE id = 1 LIMIT 1");
        const mode = MODES.includes(rows?.[0]?.mode) ? rows[0].mode : "selected";
        modeCache = { value: mode, at: Date.now() };
        return mode;
    } catch (error) {
        // Fail to the previous behaviour (explicit grants only).
        console.error("L&D access mode lookup failed:", error.message);
        return "selected";
    }
};

const setAccessModeValue = async (mode, userId) => {
    if (!MODES.includes(mode)) throw new Error("Invalid access mode");
    await ensureAccessTables();
    const updated = await db.query(
        "UPDATE lnd_access_settings SET mode = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        [mode, userId || null]
    );
    if (!Number(updated?.affectedRows || 0)) {
        await db.query("INSERT INTO lnd_access_settings (id, mode, updated_by) VALUES (1, ?, ?)", [mode, userId || null]);
    }
    modeCache = { value: mode, at: Date.now() };
    return mode;
};

const isDenied = async (userId) => {
    await ensureAccessTables();
    const rows = await db.query("SELECT user_id FROM lnd_access_denies WHERE user_id = ? LIMIT 1", [userId]);
    return Boolean(rows?.length);
};

// Best explicitly granted level (user_permissions row).
const getExplicitLevel = async (userId) => {
    const rows = await db.query(
        "SELECT permission FROM user_permissions WHERE user_id = ? AND module_name = ?",
        [userId, MODULE_NAME]
    );

    const best = (rows || [])
        .map((row) => row.permission)
        .sort((a, b) => (RANK[b] || 0) - (RANK[a] || 0))[0];

    return RANK[best] !== undefined ? best : "None";
};

// Pure resolver (also used to compute levels for the Access Control list).
const resolveLevel = ({ mode, explicit, denied }) => {
    const granted = RANK[explicit] !== undefined ? explicit : "None";
    if (mode === "nobody") return "None";
    if (mode === "everyone") {
        if (denied) return "None";
        return (RANK[granted] || 0) >= RANK.View ? granted : "View";
    }
    return granted;
};

// Level for a NON-owner user, after applying the access mode.
const getGrantedLevel = async (userId) => {
    const mode = await getAccessMode();
    if (mode === "nobody") return "None";
    const explicit = await getExplicitLevel(userId);
    const denied = mode === "everyone" ? await isDenied(userId) : false;
    return resolveLevel({ mode, explicit, denied });
};

// Owner → Full. Everyone else → what the owner granted / the mode allows.
// Administrator status is deliberately NOT considered.
const getEffectiveLevel = async (userId) =>
    (await isOwner(userId)) ? "Full" : getGrantedLevel(userId);

const isGatedModule = (name) => GATED_MODULES.has(name);

const levelSatisfies = (level, required = "View") =>
    (RANK[level] || 0) >= Math.max(RANK[required] || 1, 1);

// ----------------------------------------------------------
// SQL: "user <alias> can open L&D" — same rules as getEffectiveLevel,
// used to resolve learners for counts and emails on the server.
// ----------------------------------------------------------
const accessibleUserSql = async (alias = "u") => {
    await ensureAccessTables();
    const mode = await getAccessMode();
    const ids = ownerIds();
    const emails = ownerEmails();
    const params = [];
    const ownerParts = [];
    if (ids.length) {
        ownerParts.push(`${alias}.id IN (${ids.map(() => "?").join(", ")})`);
        params.push(...ids);
    }
    if (emails.length) {
        ownerParts.push(`LOWER(${alias}.email) IN (${emails.map(() => "?").join(", ")})`);
        params.push(...emails);
    }
    const owner = ownerParts.length ? `(${ownerParts.join(" OR ")})` : "1 = 0";

    if (mode === "nobody") return { sql: owner, params, mode };
    if (mode === "everyone") {
        return {
            sql: `(${owner} OR NOT EXISTS (SELECT 1 FROM lnd_access_denies dn WHERE dn.user_id = ${alias}.id))`,
            params,
            mode,
        };
    }
    return {
        sql: `(${owner} OR EXISTS (SELECT 1 FROM user_permissions upm WHERE upm.user_id = ${alias}.id AND upm.module_name = ? AND upm.permission IN ('View', 'Add', 'Edit', 'Full')))`,
        params: [...params, MODULE_NAME],
        mode,
    };
};

module.exports = {
    MODULE_NAME,
    LEVELS,
    RANK,
    MODES,
    isOwner,
    isOwnerRow,
    getAccessMode,
    setAccessModeValue,
    ensureAccessTables,
    getExplicitLevel,
    resolveLevel,
    getGrantedLevel,
    getEffectiveLevel,
    isGatedModule,
    levelSatisfies,
    accessibleUserSql,
};

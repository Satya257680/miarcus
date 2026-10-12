const db = require("../config/db");

// ======================================================
// CHECKLIST ACCESS SERVICE
// ------------------------------------------------------
// Decides which checklist types a user may SEE and SUBMIT.
//
//   Store user  -> Opening + Closing
//   RM          -> RM Visit
//   VM          -> VM Visit
//   ASM         -> ASM Visit
//   Admin       -> everything (never restricted)
//
// Management can grant / remove any of the five types for
// an individual user from "Checklist Access Control"
// (stored in checklist_access_overrides). Only the
// DIFFERENCES from the role default are stored, so changing
// a user's designation automatically changes their defaults.
//
// Checklist types that are not one of the five (e.g. a
// custom type) are left untouched -> behaviour unchanged.
// ======================================================

const CATEGORIES = [
    { key: "opening", label: "Opening Checklist" },
    { key: "closing", label: "Closing Checklist" },
    { key: "rm", label: "RM Visit Checklist" },
    { key: "vm", label: "VM Visit Checklist" },
    { key: "asm", label: "ASM Visit Checklist" }
];
const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

const ROLE_DEFAULTS = {
    store: ["opening", "closing"],
    rm: ["rm"],
    vm: ["vm"],
    asm: ["asm"],
    admin: CATEGORY_KEYS
};

const ROLE_LABELS = {
    store: "Store User",
    rm: "RM",
    vm: "VM",
    asm: "ASM",
    admin: "Admin"
};

const normalize = (value) =>
    String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const hasWord = (text, words) => {
    const padded = ` ${text} `;
    return words.some((w) => padded.includes(` ${w} `));
};

// Checklist type name -> category key (null = not access controlled)
const categoryOfType = (name) => {
    const text = normalize(name);
    if (!text) return null;
    if (hasWord(text, ["asm"]) || text.includes("area sales manager")) return "asm";
    if (hasWord(text, ["rm"]) || text.includes("regional manager")) return "rm";
    if (hasWord(text, ["vm"]) || text.includes("visual merchandis") || text.includes("visiting manager")) return "vm";
    // New Store Opening checklists are NOT the daily Opening checklist
    if (/\b(nso|new store)\b/.test(text)) return null;
    if (hasWord(text, ["opening"])) return "opening";
    if (hasWord(text, ["closing"])) return "closing";
    return null;
};

// Designation -> role
const roleOf = ({ is_admin, designation }) => {
    if (Number(is_admin) === 1 || is_admin === true) return "admin";
    const text = normalize(designation);
    if (hasWord(text, ["asm"]) || text.includes("area sales manager")) return "asm";
    if (/\bstore\b/.test(text)) return "store";
    if (hasWord(text, ["rm"]) || text.includes("regional manager")) return "rm";
    if (hasWord(text, ["vm"]) || text.includes("visual merchandis") || text.includes("visiting manager")) return "vm";
    return "store";
};

let ready = null;
const ensureTables = () => {
    if (!ready) {
        ready = db
            .query(`
                CREATE TABLE IF NOT EXISTS checklist_access_overrides (
                    user_id INT NOT NULL,
                    checklist_key VARCHAR(20) NOT NULL,
                    allowed TINYINT(1) NOT NULL,
                    updated_by INT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, checklist_key),
                    KEY idx_cao_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `)
            .catch((err) => {
                ready = null;
                throw err;
            });
    }
    return ready;
};

const effectiveKeys = (role, overrides) => {
    const set = new Set(ROLE_DEFAULTS[role] || ROLE_DEFAULTS.store);
    (overrides || []).forEach((o) => {
        if (!CATEGORY_KEYS.includes(o.checklist_key)) return;
        if (Number(o.allowed) === 1) set.add(o.checklist_key);
        else set.delete(o.checklist_key);
    });
    return set;
};

// Access of ONE user. Admin => unrestricted.
const getUserAccess = async (userId) => {
    await ensureTables();
    const rows = await db.query(
        `SELECT u.id, u.is_admin, dg.designation_name AS designation
           FROM users u LEFT JOIN designations dg ON dg.id = u.designation_id
          WHERE u.id = ? LIMIT 1`,
        [Number(userId)]
    );
    const user = rows?.[0];
    if (!user) return { role: "store", unrestricted: false, keys: new Set() };
    const role = roleOf(user);
    if (role === "admin") return { role, unrestricted: true, keys: new Set(CATEGORY_KEYS) };
    const overrides = await db.query(
        "SELECT checklist_key, allowed FROM checklist_access_overrides WHERE user_id = ?",
        [Number(userId)]
    );
    return { role, unrestricted: false, keys: effectiveKeys(role, overrides) };
};

const canUseType = (access, typeName) => {
    if (access.unrestricted) return true;
    const key = categoryOfType(typeName);
    return key === null ? true : access.keys.has(key);
};

// Admin page: users + effective access
const listUsers = async ({ search = "", role = "" } = {}) => {
    await ensureTables();
    const users = await db.query(`
        SELECT u.id, u.employee_id, u.name, u.is_admin,
               dg.designation_name AS designation,
               (SELECT GROUP_CONCAT(s.store_name ORDER BY s.store_name SEPARATOR ', ')
                  FROM user_stores us JOIN stores s ON s.id = us.store_id
                 WHERE us.user_id = u.id) AS stores
          FROM users u
          LEFT JOIN designations dg ON dg.id = u.designation_id
         WHERE u.status = 'Active'
         ORDER BY u.name ASC
         LIMIT 5000
    `);
    const overrides = await db.query(
        "SELECT user_id, checklist_key, allowed FROM checklist_access_overrides"
    );
    const byUser = new Map();
    overrides.forEach((o) => {
        const id = Number(o.user_id);
        if (!byUser.has(id)) byUser.set(id, []);
        byUser.get(id).push(o);
    });

    const q = String(search || "").trim().toLowerCase();
    const wantRole = String(role || "").toLowerCase();
    const all = users.map((u) => {
        const r = roleOf(u);
        const keys = r === "admin" ? new Set(CATEGORY_KEYS) : effectiveKeys(r, byUser.get(Number(u.id)));
        const access = {};
        CATEGORY_KEYS.forEach((k) => (access[k] = keys.has(k)));
        const defaults = new Set(ROLE_DEFAULTS[r]);
        return {
            id: u.id,
            employee_id: u.employee_id || "",
            name: u.name,
            role: r,
            role_label: ROLE_LABELS[r],
            designation: u.designation || "",
            stores: u.stores || "",
            locked: r === "admin",
            customized: r !== "admin" && CATEGORY_KEYS.some((k) => keys.has(k) !== defaults.has(k)),
            access
        };
    });

    const counts = { total: all.length, store: 0, rm: 0, vm: 0, asm: 0, admin: 0 };
    all.forEach((u) => (counts[u.role] += 1));

    const data = all.filter((u) => {
        if (wantRole && u.role !== wantRole) return false;
        if (!q) return true;
        return [u.name, u.employee_id, u.stores, u.designation, u.role_label]
            .join(" ")
            .toLowerCase()
            .includes(q);
    });
    return { data, counts };
};

// Save access for one or many users.
// `access` = { opening: true|false|undefined, ... } ; undefined = leave unchanged
const saveAccess = async (userIds, access, actorId) => {
    await ensureTables();
    const ids = [...new Set((userIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (!ids.length) return { updated: 0 };
    const placeholders = ids.map(() => "?").join(",");
    const users = await db.query(
        `SELECT u.id, u.is_admin, dg.designation_name AS designation
           FROM users u LEFT JOIN designations dg ON dg.id = u.designation_id
          WHERE u.id IN (${placeholders}) AND u.status = 'Active'`,
        ids
    );
    let updated = 0;
    for (const user of users) {
        const role = roleOf(user);
        if (role === "admin") continue; // admins are always unrestricted
        const defaults = new Set(ROLE_DEFAULTS[role]);
        for (const key of CATEGORY_KEYS) {
            if (typeof access?.[key] !== "boolean") continue;
            if (access[key] === defaults.has(key)) {
                await db.query(
                    "DELETE FROM checklist_access_overrides WHERE user_id = ? AND checklist_key = ?",
                    [user.id, key]
                );
            } else {
                await db.query(
                    `INSERT INTO checklist_access_overrides (user_id, checklist_key, allowed, updated_by)
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), updated_by = VALUES(updated_by)`,
                    [user.id, key, access[key] ? 1 : 0, Number(actorId) || null]
                );
            }
        }
        updated += 1;
    }
    return { updated };
};

const resetAccess = async (userIds) => {
    await ensureTables();
    const ids = [...new Set((userIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (!ids.length) return { updated: 0 };
    await db.query(
        `DELETE FROM checklist_access_overrides WHERE user_id IN (${ids.map(() => "?").join(",")})`,
        ids
    );
    return { updated: ids.length };
};

module.exports = {
    CATEGORIES,
    CATEGORY_KEYS,
    ROLE_DEFAULTS,
    ROLE_LABELS,
    categoryOfType,
    roleOf,
    ensureTables,
    getUserAccess,
    canUseType,
    listUsers,
    saveAccess,
    resetAccess
};

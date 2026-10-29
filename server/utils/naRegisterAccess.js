// ======================================================
// N/A REGISTER — ACCESS
// ------------------------------------------------------
// Module name (user_permissions.module_name): "N/A Register"
//
// Who can open it
//   • Administrators                     → Full
//   • Users with FULL STORE ACCESS       → at least View
//       (Users → Filter / store access "All stores", or anyone the
//        portal already treats as all-store: ASM / RM / Area / City /
//        Regional manager … designations, or mapped to many stores —
//        see services/notificationAudience.getStoreScope)
//   • Everyone else                      → only the level granted in
//       Users → Access (RBAC). No grant = no access.
//
// The granted level always wins when it is higher than the default,
// so an administrator can still give a store user access, or raise
// an all-store user to Full.
//
// Which stores' rows are visible
//   • Administrator / full store access → every store
//   • Others → only their stores (Filter Access override, otherwise
//     the stores assigned in user_stores)
// ======================================================

const db = require("../config/db");

const MODULE_NAME = "N/A Register";
const FULL_STORE_DEFAULT_LEVEL = "View";

const LEVEL_RANK = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };

const isAdministrator = (user) =>
    [1, "1", true].includes(user?.is_admin) ||
    [1, "1", true].includes(user?.is_super_admin);

const parseIds = (value) => {
    if (value == null || value === "") return null;
    let list = value;
    if (typeof list === "string") {
        try {
            list = JSON.parse(list);
        } catch {
            list = list.split(",");
        }
    }
    if (!Array.isArray(list)) return null;
    return [...new Set(list.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
};

const maxLevel = (a, b) => ((LEVEL_RANK[a] || 0) >= (LEVEL_RANK[b] || 0) ? a : b);

// ------------------------------------------------------
// STORE SCOPE
// → { all: true } | { all: false, storeIds: [..] }
// ------------------------------------------------------
const getStoreScopeFor = async (userId, administrator = false) => {
    if (administrator) return { all: true, storeIds: [] };

    const id = Number(userId);

    // 1. Explicit Filter Access / user access override.
    try {
        const rows = await db.query(
            "SELECT store_ids, all_stores FROM user_access_overrides WHERE user_id = ? LIMIT 1",
            [id]
        );
        const override = rows?.[0];
        if (override) {
            if (override.all_stores != null && Number(override.all_stores) === 1) {
                return { all: true, storeIds: [] };
            }
            const ids = parseIds(override.store_ids);
            if (override.all_stores != null || ids) {
                return { all: false, storeIds: ids || [] };
            }
        }
    } catch (error) {
        if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
    }

    // 2. Portal-wide all-store users (designation / many stores).
    try {
        const { getStoreScope } = require("../services/notificationAudience");
        const scope = await getStoreScope(id);
        if (scope?.allStores) return { all: true, storeIds: [] };
        if (Array.isArray(scope?.storeIds) && scope.storeIds.length) {
            return { all: false, storeIds: scope.storeIds.map(Number) };
        }
    } catch (error) {
        console.warn("[N/A Register] store scope lookup failed:", error.message);
    }

    // 3. Assigned stores.
    try {
        const rows = await db.query("SELECT store_id FROM user_stores WHERE user_id = ?", [id]);
        return {
            all: false,
            storeIds: (rows || []).map((row) => Number(row.store_id)).filter((n) => n > 0)
        };
    } catch (error) {
        if (error?.code === "ER_NO_SUCH_TABLE") return { all: false, storeIds: [] };
        throw error;
    }
};

const hasFullStoreAccess = async (userId, administrator = false) =>
    (await getStoreScopeFor(userId, administrator)).all === true;

// ------------------------------------------------------
// LEVEL
// ------------------------------------------------------
const getGrantedLevel = async (userId) => {
    try {
        const rows = await db.query(
            "SELECT permission FROM user_permissions WHERE user_id = ? AND module_name = ? LIMIT 1",
            [Number(userId), MODULE_NAME]
        );
        const level = rows?.[0]?.permission;
        return LEVEL_RANK[level] !== undefined ? level : "None";
    } catch {
        return "None";
    }
};

// user = { id, is_admin } (req.user)
const getEffectiveLevel = async (user) => {
    if (!user?.id) return "None";
    if (isAdministrator(user)) return "Full";

    const granted = await getGrantedLevel(user.id);
    const fullStore = await hasFullStoreAccess(user.id, false);

    return fullStore ? maxLevel(granted, FULL_STORE_DEFAULT_LEVEL) : granted;
};

const levelSatisfies = (level, required = "View") =>
    (LEVEL_RANK[level] || 0) >= (LEVEL_RANK[required] || 1);

// ------------------------------------------------------
// EXPRESS MIDDLEWARE
// requireNaRegister("View") / requireNaRegister("Full")
// ------------------------------------------------------
const requireNaRegister = (required = "View") => async (req, res, next) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const level = await getEffectiveLevel(req.user);
        if (!levelSatisfies(level, required)) {
            return res.status(403).json({ success: false, message: "Access Denied" });
        }
        req.naRegisterLevel = level;
        return next();
    } catch (error) {
        console.error("[N/A Register] permission check failed:", error);
        return res.status(500).json({ success: false, message: "Permission Check Failed" });
    }
};

// Adds the effective N/A Register level to a permissions map that is
// sent to the browser (login + /api/users/me/access), so the sidebar
// and route guard show the module to all-store users by default.
const applyEffectiveLevel = async (user, permissions = {}) => {
    try {
        permissions[MODULE_NAME] = await getEffectiveLevel(user);
    } catch (error) {
        console.warn("[N/A Register] effective level failed:", error.message);
    }
    return permissions;
};

module.exports = {
    MODULE_NAME,
    FULL_STORE_DEFAULT_LEVEL,
    getStoreScopeFor,
    hasFullStoreAccess,
    getEffectiveLevel,
    levelSatisfies,
    requireNaRegister,
    applyEffectiveLevel,
    isAdministrator
};

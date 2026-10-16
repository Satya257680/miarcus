// ======================================================
// FILTER ACCESS CONTROLLER
// ======================================================
// /api/filter-access/options        – read-only lookup for module filters
//                                      (any user with View on the module)
// /api/filter-access/catalog         – admin: every value + modules
// /api/filter-access/users           – admin: users + access summary
// /api/filter-access/users/:id       – admin: one user's module policies
// PUT/DELETE .../users/:id/modules/:module, DELETE .../users/:id
// ======================================================

const db = require("../config/db");
const filterAccess = require("../utils/filterAccess");

let Audit = null;
try { Audit = require("../models/auditModel"); } catch { Audit = null; }

const denyUnlessAdmin = (req, res) => {
    if (!filterAccess.isAdministrator(req.user)) {
        res.status(403).json({ success: false, message: "Administrator access required" });
        return true;
    }
    return false;
};

const audit = (data) => {
    if (!Audit || typeof Audit.create !== "function") return;
    try { Audit.create(data, () => {}); } catch { /* best effort */ }
};

const moduleFrom = (value) => {
    const name = String(value || "").trim();
    return filterAccess.MODULES[name] ? name : null;
};

// ------------------------------------------------------
// READ-ONLY LOOKUP – GET /api/filter-access/options?module=Action Points
// Mounted after permissionMiddleware(module, "View") in the routes file,
// so it never grants a module and never needs master-module permissions.
// ------------------------------------------------------
exports.getOptions = async (req, res) => {
    try {
        const scope = req.filterScope;
        const filters = await filterAccess.getAuthorizedOptions(req, scope);
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            module: scope.module,
            restricted: scope.restricted,
            filters,
        });
    } catch (error) {
        console.error("Filter access options failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load filter options." });
    }
};

// ------------------------------------------------------
// ADMIN – CATALOG
// ------------------------------------------------------
exports.getCatalog = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    try {
        const values = {};
        for (const key of filterAccess.FILTER_KEYS) {
            const rows = await filterAccess.loadMaster(key);
            values[key] = rows.map(({ user_ids, department_ids, ...rest }) => rest);
        }
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            modules: Object.entries(filterAccess.MODULES).map(([name, def]) => ({
                name,
                filters: def.filters.map((key) => ({ key, label: filterAccess.FILTER_LABELS[key] })),
            })),
            policies: filterAccess.POLICIES,
            values,
        });
    } catch (error) {
        console.error("Filter access catalog failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load filter values." });
    }
};

// ------------------------------------------------------
// ADMIN – USERS LIST
// ------------------------------------------------------
exports.listUsers = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    try {
        await filterAccess.ensureTable();

        const users = await db.query(`
            SELECT u.id, u.employee_id, u.name, u.email, u.status, u.profile_photo,
                   u.is_admin, u.department_id, u.designation_id,
                   d.department_name AS department, dg.designation_name AS designation,
                   (SELECT GROUP_CONCAT(us.store_id ORDER BY us.store_id)
                    FROM user_stores us WHERE us.user_id = u.id) AS store_ids
            FROM users u
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN designations dg ON dg.id = u.designation_id
            WHERE COALESCE(u.status, 'Active') <> 'Deleted'
            ORDER BY u.name
        `);

        const rules = await db.query(
            `SELECT user_id, module_name, filter_key, policy, value_ids FROM user_filter_access`
        );

        let globals = [];
        try {
            globals = await db.query(`SELECT user_id FROM user_access_overrides`);
        } catch (error) {
            if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
        }
        const globalSet = new Set((globals || []).map((r) => Number(r.user_id)));

        const byUser = new Map();
        for (const r of rules || []) {
            const uid = Number(r.user_id);
            if (!byUser.has(uid)) byUser.set(uid, {});
            const modules = byUser.get(uid);
            if (!modules[r.module_name]) modules[r.module_name] = {};
            modules[r.module_name][r.filter_key] = {
                policy: r.policy,
                ids: r.policy === "selected" ? filterAccess.toIds(r.value_ids) : [],
            };
        }

        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            users: (users || []).map((u) => {
                const modules = byUser.get(Number(u.id)) || {};
                return {
                    id: Number(u.id),
                    employee_id: u.employee_id,
                    name: u.name,
                    email: u.email,
                    status: u.status || "Active",
                    profile_photo: u.profile_photo || null,
                    is_admin: filterAccess.isAdministrator(u),
                    department_id: u.department_id ? Number(u.department_id) : null,
                    designation_id: u.designation_id ? Number(u.designation_id) : null,
                    department: u.department,
                    designation: u.designation,
                    store_ids: filterAccess.toIds(u.store_ids),
                    modules,
                    has_global_override: globalSet.has(Number(u.id)),
                    has_custom_access: Object.keys(modules).length > 0 || globalSet.has(Number(u.id)),
                };
            }),
        });
    } catch (error) {
        console.error("Filter access user list failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load users." });
    }
};

// ------------------------------------------------------
// ADMIN – ONE USER
// ------------------------------------------------------
exports.getUser = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    try {
        const found = await db.query(`SELECT id, is_admin FROM users WHERE id = ? LIMIT 1`, [userId]);
        if (!found?.length) return res.status(404).json({ success: false, message: "User not found" });

        const modules = {};
        for (const name of Object.keys(filterAccess.MODULES)) {
            modules[name] = await filterAccess.getPolicies(userId, name);
        }
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            user_id: userId,
            is_admin: filterAccess.isAdministrator(found[0]),
            modules,
        });
    } catch (error) {
        console.error("Filter access get user failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load filter access." });
    }
};

// ------------------------------------------------------
// ADMIN – SAVE ONE MODULE
// body: { filters: { store: { policy: "selected", ids: [1,2] }, ... } }
// Filters left out of the body keep their current setting.
// ------------------------------------------------------
exports.saveModule = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    const userId = Number(req.params.id);
    const moduleName = moduleFrom(req.params.module);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    if (!moduleName) {
        return res.status(400).json({ success: false, message: "Filter access is not available for this module." });
    }

    const input = req.body?.filters;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return res.status(400).json({ success: false, message: "No filter settings were sent." });
    }

    const allowedKeys = filterAccess.MODULES[moduleName].filters;
    const changes = [];

    for (const [key, value] of Object.entries(input)) {
        if (!allowedKeys.includes(key)) {
            return res.status(400).json({ success: false, message: `Unknown filter "${key}" for ${moduleName}.` });
        }
        const policy = String(value?.policy || "").toLowerCase();
        if (!filterAccess.POLICIES.includes(policy)) {
            return res.status(400).json({ success: false, message: `Invalid access policy for ${filterAccess.FILTER_LABELS[key]}.` });
        }
        changes.push({ key, policy, ids: policy === "selected" ? filterAccess.toIds(value?.ids) : [] });
    }

    try {
        await filterAccess.ensureTable();

        const found = await db.query(`SELECT id FROM users WHERE id = ? LIMIT 1`, [userId]);
        if (!found?.length) return res.status(404).json({ success: false, message: "User not found" });

        // Only keep IDs that really exist, so a crafted request cannot
        // store arbitrary values.
        for (const change of changes) {
            if (change.policy !== "selected" || !change.ids.length) continue;
            const rows = await filterAccess.loadMaster(change.key, change.ids);
            const valid = new Set(rows.map((r) => Number(r.id)));
            const unknown = change.ids.filter((id) => !valid.has(id));
            if (unknown.length) {
                return res.status(400).json({
                    success: false,
                    message: `Some selected ${filterAccess.FILTER_LABELS[change.key]} values no longer exist. Refresh and try again.`,
                });
            }
        }

        const before = await filterAccess.getPolicies(userId, moduleName);

        for (const change of changes) {
            if (change.policy === "default") {
                await db.query(
                    `DELETE FROM user_filter_access WHERE user_id = ? AND module_name = ? AND filter_key = ?`,
                    [userId, moduleName, change.key]
                );
            } else {
                await db.query(
                    `INSERT INTO user_filter_access (user_id, module_name, filter_key, policy, value_ids, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE policy = VALUES(policy), value_ids = VALUES(value_ids),
                                             updated_by = VALUES(updated_by)`,
                    [
                        userId,
                        moduleName,
                        change.key,
                        change.policy,
                        change.policy === "selected" ? JSON.stringify(change.ids) : null,
                        req.user?.id || null,
                    ]
                );
            }
        }

        const after = await filterAccess.getPolicies(userId, moduleName);

        audit({
            module_name: "Filter Access",
            reference_id: userId,
            action: "UPDATE",
            old_data: { module: moduleName, filters: before },
            new_data: { module: moduleName, filters: after },
            changed_by: req.user?.id || null,
        });

        return res.json({
            success: true,
            message: `Filter access for ${moduleName} saved. It applies from the user's next request.`,
            filters: after,
        });
    } catch (error) {
        console.error("Filter access save failed:", error);
        return res.status(500).json({ success: false, message: "Unable to save filter access." });
    }
};

// ------------------------------------------------------
// ADMIN – RESET ONE MODULE
// ------------------------------------------------------
exports.resetModule = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    const userId = Number(req.params.id);
    const moduleName = moduleFrom(req.params.module);
    if (!Number.isInteger(userId) || userId < 1 || !moduleName) {
        return res.status(400).json({ success: false, message: "Invalid request" });
    }
    try {
        await filterAccess.ensureTable();
        await db.query(`DELETE FROM user_filter_access WHERE user_id = ? AND module_name = ?`, [userId, moduleName]);
        audit({
            module_name: "Filter Access",
            reference_id: userId,
            action: "RESET_MODULE",
            old_data: null,
            new_data: { module: moduleName },
            changed_by: req.user?.id || null,
        });
        return res.json({ success: true, message: `${moduleName} is back on default access.` });
    } catch (error) {
        console.error("Filter access module reset failed:", error);
        return res.status(500).json({ success: false, message: "Unable to reset filter access." });
    }
};

// ------------------------------------------------------
// ADMIN – RESET EVERYTHING FOR A USER
// Removes every per-module rule and the existing global overrides
// (user_access_overrides) so only role-based rules remain.
// ------------------------------------------------------
exports.resetUser = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    try {
        await filterAccess.ensureTable();
        await db.query(`DELETE FROM user_filter_access WHERE user_id = ?`, [userId]);
        try {
            await db.query(`DELETE FROM user_access_overrides WHERE user_id = ?`, [userId]);
        } catch (error) {
            if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
        }
        audit({
            module_name: "Filter Access",
            reference_id: userId,
            action: "RESET_ALL",
            old_data: null,
            new_data: null,
            changed_by: req.user?.id || null,
        });
        return res.json({ success: true, message: "All overrides removed. Role-based rules apply." });
    } catch (error) {
        console.error("Filter access reset failed:", error);
        return res.status(500).json({ success: false, message: "Unable to reset filter access." });
    }
};

// ======================================================
// FILTER ACCESS CONTROLLER
// ======================================================
// GET    /api/filter-access/options?module=…   read-only filter options
//                                              (module View permission only)
// GET    /api/filter-access/catalog            admin: modules + every value
// GET    /api/filter-access/users              admin: users + access summary
// GET    /api/filter-access/users/:id          admin: one user's rules
// PUT    /api/filter-access/users/:id/modules/:module   save (module or "*")
// DELETE /api/filter-access/users/:id/modules/:module   reset one module
// DELETE /api/filter-access/users/:id          reset everything
// POST   /api/filter-access/bulk/preview       admin: users in a group
// POST   /api/filter-access/bulk/apply         admin: apply to confirmed users
//
// Module "*" = the user's global defaults (all supported modules).
// ======================================================

const db = require("../config/db");
const filterAccess = require("../utils/filterAccess");

let Audit = null;
try { Audit = require("../models/auditModel"); } catch { Audit = null; }

const { GLOBAL, MODULES, FILTER_KEYS, FILTER_LABELS } = filterAccess;

// Largest group a single bulk request may change.
const BULK_LIMIT = 1000;

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
    if (name === GLOBAL) return GLOBAL;
    return MODULES[name] ? name : null;
};

const moduleLabel = (name) => (name === GLOBAL ? "Global defaults" : name);

const validId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// ------------------------------------------------------
// READ-ONLY LOOKUP – GET /api/filter-access/options?module=…
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
            sources: scope.sources || {},
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
        for (const key of FILTER_KEYS) {
            const rows = await filterAccess.loadMaster(key);
            values[key] = rows.map(({ user_ids, department_ids, ...rest }) => rest);
        }
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            global: {
                name: GLOBAL,
                label: "Global defaults (all modules)",
                filters: FILTER_KEYS.map((key) => ({ key, label: FILTER_LABELS[key] })),
            },
            modules: Object.entries(MODULES).map(([name, def]) => ({
                name,
                note: def.note || "",
                filters: def.filters.map((key) => ({ key, label: FILTER_LABELS[key] })),
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

        // Older global overrides (read as global defaults when no "*" row).
        let legacy = [];
        try {
            legacy = await db.query(`
                SELECT user_id, department_ids, all_departments, store_ids, all_stores,
                       checklist_type_ids, all_checklist_types
                FROM user_access_overrides`);
        } catch (error) {
            if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
        }

        const byUser = new Map();
        const put = (uid, moduleName, key, rule) => {
            if (!byUser.has(uid)) byUser.set(uid, {});
            const modules = byUser.get(uid);
            if (!modules[moduleName]) modules[moduleName] = {};
            modules[moduleName][key] = rule;
        };

        for (const r of rules || []) {
            put(Number(r.user_id), r.module_name, r.filter_key, {
                policy: r.policy,
                ids: r.policy === "selected" ? filterAccess.toIds(r.value_ids) : [],
            });
        }

        for (const row of legacy || []) {
            const uid = Number(row.user_id);
            for (const [key, field] of Object.entries(filterAccess.LEGACY_FIELDS)) {
                if (byUser.get(uid)?.[GLOBAL]?.[key]) continue;
                const all = row[field.all];
                const ids = row[field.ids] == null ? null : filterAccess.toIds(row[field.ids]);
                if (all != null && Number(all) === 1) put(uid, GLOBAL, key, { policy: "all", ids: [] });
                else if (all != null || ids) put(uid, GLOBAL, key, { policy: "selected", ids: ids || [] });
            }
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
                    has_custom_access: Object.keys(modules).length > 0,
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
    const userId = validId(req.params.id);
    if (!userId) return res.status(400).json({ success: false, message: "Invalid user ID" });
    try {
        const found = await db.query(`SELECT id, is_admin FROM users WHERE id = ? LIMIT 1`, [userId]);
        if (!found?.length) return res.status(404).json({ success: false, message: "User not found" });

        const modules = {};
        const effective = {};
        for (const name of Object.keys(MODULES)) {
            modules[name] = await filterAccess.getPolicies(userId, name);
            effective[name] = (await filterAccess.getEffectivePolicies(userId, name)).sources;
        }
        const global = await filterAccess.getGlobalPolicies(userId);

        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            user_id: userId,
            is_admin: filterAccess.isAdministrator(found[0]),
            global,
            modules,
            effective_sources: effective,
        });
    } catch (error) {
        console.error("Filter access get user failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load filter access." });
    }
};

// ------------------------------------------------------
// ADMIN – SAVE ONE MODULE (or "*" = global defaults)
// body: { filters: { store: { policy: "selected", ids: [1,2] }, ... } }
// Filters left out of the body keep their current setting.
// ------------------------------------------------------
exports.saveModule = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    const userId = validId(req.params.id);
    const moduleName = moduleFrom(req.params.module);
    if (!userId) return res.status(400).json({ success: false, message: "Invalid user ID" });
    if (!moduleName) {
        return res.status(400).json({ success: false, message: "Filter access is not available for this module." });
    }

    try {
        const { changes, error } = await filterAccess.validateChanges(moduleName, req.body?.filters);
        if (error) return res.status(400).json({ success: false, message: error });

        const found = await db.query(`SELECT id FROM users WHERE id = ? LIMIT 1`, [userId]);
        if (!found?.length) return res.status(404).json({ success: false, message: "User not found" });

        const read = () => (moduleName === GLOBAL
            ? filterAccess.getGlobalPolicies(userId)
            : filterAccess.getPolicies(userId, moduleName));

        const before = await read();
        await filterAccess.applyRules(userId, moduleName, changes, req.user?.id);
        const after = await read();

        audit({
            module_name: "Filter Access",
            reference_id: userId,
            action: "UPDATE",
            old_data: { module: moduleLabel(moduleName), filters: before },
            new_data: { module: moduleLabel(moduleName), filters: after },
            changed_by: req.user?.id || null,
        });

        return res.json({
            success: true,
            message: `${moduleLabel(moduleName)} saved. It applies from the user's next request.`,
            filters: after,
        });
    } catch (error) {
        console.error("Filter access save failed:", error);
        return res.status(500).json({ success: false, message: "Unable to save filter access." });
    }
};

// ------------------------------------------------------
// ADMIN – RESET ONE MODULE (or "*")
// ------------------------------------------------------
exports.resetModule = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    const userId = validId(req.params.id);
    const moduleName = moduleFrom(req.params.module);
    if (!userId || !moduleName) {
        return res.status(400).json({ success: false, message: "Invalid request" });
    }
    try {
        await filterAccess.ensureTable();
        if (moduleName === GLOBAL) {
            await filterAccess.clearGlobal(userId, req.user?.id);
        } else {
            await db.query(`DELETE FROM user_filter_access WHERE user_id = ? AND module_name = ?`, [userId, moduleName]);
        }
        audit({
            module_name: "Filter Access",
            reference_id: userId,
            action: "RESET_MODULE",
            old_data: null,
            new_data: { module: moduleLabel(moduleName) },
            changed_by: req.user?.id || null,
        });
        return res.json({ success: true, message: `${moduleLabel(moduleName)} is back on default access.` });
    } catch (error) {
        console.error("Filter access module reset failed:", error);
        return res.status(500).json({ success: false, message: "Unable to reset filter access." });
    }
};

// ------------------------------------------------------
// ADMIN – RESET EVERYTHING FOR A USER
// Removes every module rule and the global defaults (including the older
// user_access_overrides values) so only role-based rules remain. The
// older module_names list is not touched.
// ------------------------------------------------------
exports.resetUser = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    const userId = validId(req.params.id);
    if (!userId) return res.status(400).json({ success: false, message: "Invalid user ID" });
    try {
        await filterAccess.ensureTable();
        await db.query(`DELETE FROM user_filter_access WHERE user_id = ? AND module_name <> ?`, [userId, GLOBAL]);
        await filterAccess.clearGlobal(userId, req.user?.id);
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

// ------------------------------------------------------
// ADMIN – BULK: PREVIEW
// body: { department_ids?, designation_ids?, store_ids? }
// ------------------------------------------------------
const readGroup = (body = {}) => ({
    department_ids: filterAccess.toIds(body.department_ids),
    designation_ids: filterAccess.toIds(body.designation_ids),
    store_ids: filterAccess.toIds(body.store_ids),
});

const groupIsEmpty = (group) =>
    !group.department_ids.length && !group.designation_ids.length && !group.store_ids.length;

exports.bulkPreview = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    try {
        const group = readGroup(req.body);
        if (groupIsEmpty(group)) {
            return res.status(400).json({ success: false, message: "Choose at least one department, designation or store." });
        }
        const users = await filterAccess.findUsersByGroup(group);
        return res.json({
            success: true,
            total: users.length,
            limit: BULK_LIMIT,
            users: users.map((u) => ({
                id: Number(u.id),
                name: u.name,
                employee_id: u.employee_id,
                department: u.department,
                designation: u.designation,
                stores: u.stores || "",
                status: u.status || "Active",
                is_admin: filterAccess.isAdministrator(u),
            })),
        });
    } catch (error) {
        console.error("Filter access bulk preview failed:", error);
        return res.status(500).json({ success: false, message: "Unable to find matching users." });
    }
};

// ------------------------------------------------------
// ADMIN – BULK: APPLY
// body: { department_ids?, designation_ids?, store_ids?,  (the group)
//         user_ids: [...],                                (confirmed in preview)
//         module: "Action Points" | ... | "*",
//         filters: { store: { policy, ids }, ... } }      (only these change)
//
// The group is looked up again on the server. Only users that are BOTH in
// the group and in the confirmed list are changed, so a crafted request
// cannot reach anyone outside the previewed group. Filters not sent are
// left exactly as they were for every user.
// ------------------------------------------------------
exports.bulkApply = async (req, res) => {
    if (denyUnlessAdmin(req, res)) return;
    try {
        const group = readGroup(req.body);
        if (groupIsEmpty(group)) {
            return res.status(400).json({ success: false, message: "Choose at least one department, designation or store." });
        }

        const moduleName = moduleFrom(req.body?.module);
        if (!moduleName) {
            return res.status(400).json({ success: false, message: "Filter access is not available for this module." });
        }

        const { changes, error } = await filterAccess.validateChanges(moduleName, req.body?.filters);
        if (error) return res.status(400).json({ success: false, message: error });

        const confirmed = filterAccess.toIds(req.body?.user_ids);
        if (!confirmed.length) {
            return res.status(400).json({ success: false, message: "Confirm the users to update first." });
        }
        if (confirmed.length > BULK_LIMIT) {
            return res.status(400).json({ success: false, message: `At most ${BULK_LIMIT} users can be updated at once.` });
        }

        const members = await filterAccess.findUsersByGroup(group);
        const memberMap = new Map(members.map((u) => [Number(u.id), u]));
        const targets = confirmed.filter((id) => memberMap.has(id));
        const skipped = confirmed.filter((id) => !memberMap.has(id));

        const updated = [];
        const failed = [];
        for (const userId of targets) {
            try {
                await filterAccess.applyRules(userId, moduleName, changes, req.user?.id);
                updated.push(userId);
            } catch (err) {
                console.error(`Filter access bulk apply failed for user ${userId}:`, err);
                failed.push({ id: userId, name: memberMap.get(userId)?.name || `User #${userId}`, error: "Could not be saved" });
            }
        }

        audit({
            module_name: "Filter Access",
            reference_id: null,
            action: "BULK_UPDATE",
            old_data: { group, module: moduleLabel(moduleName) },
            new_data: {
                filters: Object.fromEntries(changes.map((c) => [c.key, { policy: c.policy, ids: c.ids }])),
                updated,
                failed: failed.map((f) => f.id),
                skipped,
            },
            changed_by: req.user?.id || null,
        });

        return res.status(failed.length && !updated.length ? 500 : 200).json({
            success: failed.length === 0,
            message: `${updated.length} user(s) updated${failed.length ? `, ${failed.length} failed` : ""}${skipped.length ? `, ${skipped.length} skipped (no longer in the group)` : ""}.`,
            module: moduleLabel(moduleName),
            updated: updated.length,
            updated_ids: updated,
            failed,
            skipped,
        });
    } catch (error) {
        console.error("Filter access bulk apply failed:", error);
        return res.status(500).json({ success: false, message: "Unable to apply filter access." });
    }
};

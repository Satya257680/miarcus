const db = require("../config/db");
const PagePermission = require("../models/pagePermissionModel");
const lnd = require("../utils/lndAccess");

// ==========================================================
// GET /api/users/me/access
// ==========================================================
//
// Returns the signed-in user's CURRENT access straight from the
// database, so the frontend can refresh the sidebar and page
// guards without a logout after an admin changes permissions.
//
// {
//   success: true,
//   administrator: false,
//   permissions: { "Quiz": "Add", "Expenses": "View", ... },
//   pageAccess:  { "quiz.setup": false, ... }
// }
// ==========================================================

const getMyAccess = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const administrator = Number(req.user?.is_admin) === 1 || req.user?.is_admin === true;

        const rows = await db.query(
            "SELECT module_name, permission FROM user_permissions WHERE user_id = ?",
            [userId]
        );

        const permissions = {};

        (rows || []).forEach((row) => {
            permissions[row.module_name] = administrator ? "Full" : row.permission;
        });

        // Learning & Development is owner-controlled: administrators
        // do NOT get it automatically.
        const lndOwner = await lnd.isOwner(userId);
        permissions[lnd.MODULE_NAME] = lndOwner
            ? "Full"
            : await lnd.getGrantedLevel(userId);

        // Optional per-user scope overrides (NULL means existing/default access rules).
        // Missing table is tolerated during rollout; apply server-side in module queries
        // through the shared scope helper when each module is migrated.
        let accessScope = {
            department_ids: null, all_departments: null,
            store_ids: null, all_stores: null,
            checklist_type_ids: null, all_checklist_types: null,
            module_names: null,
        };
        try {
            const scopeRows = await db.query(
                "SELECT department_ids, all_departments, store_ids, all_stores, checklist_type_ids, all_checklist_types, module_names FROM user_access_overrides WHERE user_id = ? LIMIT 1",
                [userId]
            );
            const scope = scopeRows?.[0];
            if (scope) {
                const parse = (value) => {
                    if (value == null || value === "") return null;
                    if (typeof value === "object") return value;
                    try { return JSON.parse(value); } catch { return null; }
                };
                accessScope = {
                    department_ids: parse(scope.department_ids),
                    all_departments: scope.all_departments == null ? null : Boolean(scope.all_departments),
                    store_ids: parse(scope.store_ids),
                    all_stores: scope.all_stores == null ? null : Boolean(scope.all_stores),
                    checklist_type_ids: parse(scope.checklist_type_ids),
                    all_checklist_types: scope.all_checklist_types == null ? null : Boolean(scope.all_checklist_types),
                    module_names: parse(scope.module_names),
                };
            }
        } catch (scopeError) {
            // The SQL migration may not have been run yet. Keep existing access behavior.
            if (scopeError?.code !== "ER_NO_SUCH_TABLE") console.error("Access scope lookup failed:", scopeError.message);
        }

        let pageAccess = {};

        if (!administrator) {
            try {
                pageAccess = await PagePermission.getForUser(userId);
            } catch (pageError) {
                console.error("Page access lookup failed:", pageError.message);
            }
        }

        res.set("Cache-Control", "no-store");

        return res.json({
            success: true,
            administrator,
            lndOwner,
            permissions,
            pageAccess,
            accessScope,
        });
    } catch (error) {
        console.error("Load my access failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load access",
        });
    }
};

module.exports = { getMyAccess };

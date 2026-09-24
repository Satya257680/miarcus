const db = require("../config/db");

// Some routes use a name that is not a stored RBAC module. Those
// fall back to the module that owns them in the access screen, so
// e.g. "NSO Tracking" follows the "New Store Openings" level.
const MODULE_FALLBACKS = {
    "NSO Tracking": ["New Store Openings"],
    "Checklist Submit": ["Checklist Submission"],
    "Stores": ["Store Management"],
    "Expense": ["Expenses"],
};

const LEVEL_RANK = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };

// ======================================================
// ROLE BASED ACCESS CONTROL
// ======================================================

const permissionMiddleware = (moduleName, requiredPermission) => {

    return (req, res, next) => {

        // ======================================================
        // CHECK AUTHENTICATION
        // ======================================================

        if (!req.user || !req.user.id) {

            return res.status(401).json({

                success: false,

                message: "Unauthorized"

            });

        }

        const userId = req.user.id;

        // ======================================================
        // ADMINISTRATOR BYPASS
        // ======================================================
        // Administrator automatically has FULL access
        // to every module.
        //
        // This check is intentionally BEFORE the
        // user_permissions database lookup.
        // ======================================================

        // Authorization must use the current database-backed is_admin value
        // populated by authMiddleware. Never trust legacy administrator claims
        // copied from the JWT payload.
        const isAdministrator = Number(req.user.is_admin) === 1;

        if (isAdministrator) {

            return next();

        }

        // ======================================================
        // LOAD REQUESTED PERMISSION
        // ======================================================

        db.query(

            `
            SELECT permission
            FROM user_permissions
            WHERE user_id = ?
            AND module_name IN (?)
            `,

            [userId, [moduleName, ...(MODULE_FALLBACKS[moduleName] || [])]],

            (err, result) => {

                // ======================================================
                // DATABASE ERROR
                // ======================================================

                if (err) {

                    console.error(
                        "Permission Check Failed:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message: "Permission Check Failed"

                    });

                }

                // ======================================================
                // NO PERMISSION RECORD
                // ======================================================

                if (!result || result.length === 0) {

                    return res.status(403).json({

                        success: false,

                        message: "Access Denied"

                    });

                }

                // Highest level wins when a fallback module also matches.
                const permission = result
                    .map((row) => row.permission)
                    .sort((a, b) => (LEVEL_RANK[b] || 0) - (LEVEL_RANK[a] || 0))[0];

                // ======================================================
                // FULL ACCESS
                // ======================================================

                if (permission === "Full") {

                    return next();

                }

                // ======================================================
                // VIEW ACCESS
                // ======================================================

                if (

                    requiredPermission === "View" &&

                    [
                        "View",
                        "Add",
                        "Edit",
                        "Full"
                    ].includes(permission)

                ) {

                    return next();

                }

                // ======================================================
                // ADD ACCESS
                // ======================================================

                if (

                    requiredPermission === "Add" &&

                    [
                        "Add",
                        "Edit",
                        "Full"
                    ].includes(permission)

                ) {

                    return next();

                }

                // ======================================================
                // EDIT ACCESS
                // ======================================================

                if (

                    requiredPermission === "Edit" &&

                    [
                        "Edit",
                        "Full"
                    ].includes(permission)

                ) {

                    return next();

                }

                // ======================================================
                // FULL ACCESS REQUIRED
                // ======================================================

                if (

                    requiredPermission === "Full" &&

                    permission === "Full"

                ) {

                    return next();

                }

                // ======================================================
                // INSUFFICIENT PERMISSION
                // ======================================================

                return res.status(403).json({

                    success: false,

                    message: "Insufficient Permission"

                });

            }

        );

    };

};

module.exports = permissionMiddleware;
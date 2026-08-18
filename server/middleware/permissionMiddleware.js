const db = require("../config/db");

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

        const isAdministrator =
            req.user.is_admin === true ||
            req.user.is_admin === 1 ||
            req.user.is_admin === "1" ||
            req.user.administrator === true ||
            req.user.administrator === 1 ||
            req.user.administrator === "1";

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
            AND module_name = ?
            LIMIT 1
            `,

            [userId, moduleName],

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

                const permission = result[0].permission;

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
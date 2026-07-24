const db = require("../config/db");

// ======================================================
// ROLE BASED ACCESS CONTROL
// ======================================================

const permissionMiddleware = (moduleName, requiredPermission) => {

    return (req, res, next) => {

        const userId = req.user.id;

        const sql = `
            SELECT permission
            FROM user_permissions
            WHERE user_id = ?
            AND module_name = ?
            LIMIT 1
        `;

        db.query(

            sql,

            [userId, moduleName],

            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: "Permission Check Failed"

                    });

                }

                if (result.length === 0) {

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
                // VIEW
                // View, Add and Edit users can view
                // ======================================================

                if (

                    requiredPermission === "View" &&

                    [

                        "View",

                        "Add",

                        "Edit"

                    ].includes(permission)

                ) {

                    return next();

                }

                // ======================================================
                // ADD
                // Add and Edit users can add
                // ======================================================

                if (

                    requiredPermission === "Add" &&

                    [

                        "Add",

                        "Edit"

                    ].includes(permission)

                ) {

                    return next();

                }

                // ======================================================
                // EDIT
                // Only Edit users can edit
                // ======================================================

                if (

                    requiredPermission === "Edit" &&

                    permission === "Edit"

                ) {

                    return next();

                }

                // ======================================================
                // ACCESS DENIED
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
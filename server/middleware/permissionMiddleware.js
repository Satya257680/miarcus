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

            console.log("====================================");
            console.log("AUTH FAILED");
            console.log(req.user);
            console.log("====================================");

            return res.status(401).json({

                success: false,

                message: "Unauthorized"

            });

        }

        const userId = req.user.id;

        console.log("\n====================================");
        console.log("PERMISSION CHECK");
        console.log("User ID :", userId);
        console.log("Module  :", moduleName);
        console.log("Required:", requiredPermission);
        console.log("====================================");

        // ======================================================
        // LOAD USER PERMISSION
        // ======================================================

        const permissionSql = `
            SELECT permission
            FROM user_permissions
            WHERE user_id = ?
            AND module_name = ?
            LIMIT 1
        `;

        console.log("SQL:");
        console.log(permissionSql);
        console.log("Values:", [userId, moduleName]);

        db.query(

            permissionSql,

            [userId, moduleName],

            (err, result) => {

                if (err) {

                    console.error("DATABASE ERROR");
                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: "Permission Check Failed"

                    });

                }

                console.log("Permission Result:", result);

                if (result.length === 0) {

                    console.log("NO PERMISSION FOUND");

                    return res.status(403).json({

                        success: false,

                        message: "Access Denied"

                    });

                }

                const permission = result[0].permission;

                console.log("User Permission:", permission);

                // ======================================================
                // FULL ACCESS
                // ======================================================

                if (permission === "Full") {

                    console.log("FULL ACCESS GRANTED");

                    return next();

                }

                // ======================================================
                // VIEW
                // ======================================================

                if (

                    requiredPermission === "View" &&

                    ["View", "Add", "Edit", "Full"].includes(permission)

                ) {

                    console.log("VIEW ACCESS GRANTED");

                    return next();

                }

                // ======================================================
                // ADD
                // ======================================================

                if (

                    requiredPermission === "Add" &&

                    ["Add", "Edit", "Full"].includes(permission)

                ) {

                    console.log("ADD ACCESS GRANTED");

                    return next();

                }

                // ======================================================
                // EDIT
                // ======================================================

                if (

                    requiredPermission === "Edit" &&

                    ["Edit", "Full"].includes(permission)

                ) {

                    console.log("EDIT ACCESS GRANTED");

                    return next();

                }

                // ======================================================
                // DELETE
                // ======================================================

                if (

                    requiredPermission === "Full" &&

                    permission === "Full"

                ) {

                    console.log("DELETE ACCESS GRANTED");

                    return next();

                }

                console.log("INSUFFICIENT PERMISSION");

                return res.status(403).json({

                    success: false,

                    message: "Insufficient Permission"

                });

            }

        );

    };

};

module.exports = permissionMiddleware;
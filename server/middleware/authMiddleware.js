const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { JWT_SECRET, JWT_ALGORITHM } = require("../config/security");

// ======================================================
// VERIFY JWT
// ======================================================

const authMiddleware = (req, res, next) => {

    const authHeader = req.headers.authorization;

    // ======================================================
    // CHECK AUTHORIZATION HEADER
    // ======================================================

    if (!authHeader || !authHeader.startsWith("Bearer ")) {

        return res.status(401).json({

            success: false,

            message: "Authorization Token Missing or Invalid"

        });

    }

    const token = authHeader.split(" ")[1];

    if (!token) {

        return res.status(401).json({

            success: false,

            message: "Invalid Token"

        });

    }

    try {

        const decoded = jwt.verify(
            token,
            JWT_SECRET,
            { algorithms: [JWT_ALGORITHM] }
        );

        // ======================================================
        // CHECK CURRENT USER STATUS
        // ======================================================

        db.query(

            "SELECT name, status, is_activated, is_admin FROM users WHERE id = ? LIMIT 1",

            [decoded.id],

            (err, result) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message: "Database Error"

                    });

                }

                if (result.length === 0) {

                    return res.status(401).json({

                        success: false,

                        message: "User Not Found"

                    });

                }

                if (result[0].status !== "Active" || !result[0].is_activated) {

                    return res.status(401).json({

                        success: false,

                        message: `Dear ${result[0].name},

Your account is no longer active and access to the miarcus ERP application has been disabled.

Please contact your administrator for further assistance.

Thank you for using our application.

Regards,
miarcus Team`

                    });

                }

                req.user = {
                    ...decoded,
                    id: result[0].id || decoded.id,
                    is_admin: Number(result[0].is_admin) === 1,
                };

                next();

            }

        );

    } catch (err) {

        return res.status(401).json({

            success: false,

            message: "Token Expired or Invalid"

        });

    }

};

module.exports = authMiddleware;
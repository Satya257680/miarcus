const jwt = require("jsonwebtoken");
const db = require("../config/db");

// ======================================================
// VERIFY JWT
// ======================================================

const authMiddleware = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({

            success: false,

            message: "No Token Provided"

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

            process.env.JWT_SECRET || "miarcus_secret_key"

        );

        // ==========================================
        // Check Current User Status
        // ==========================================

        db.query(

            "SELECT name, status FROM users WHERE id=? LIMIT 1",

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

                if (result[0].status !== "Active") {

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

                req.user = decoded;

                next();

            }

        );

    }

    catch (err) {

        return res.status(401).json({

            success: false,

            message: "Token Expired or Invalid"

        });

    }

};

module.exports = authMiddleware;
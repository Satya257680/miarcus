const db = require("../config/db");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");

const jwt = require("jsonwebtoken");
const {
    sendForgotPasswordOTPEmail,
    sendResetPasswordEmail
} = require("../services/emailService");

// ======================================================
// GENERATE OTP
// ======================================================

const generateOTP = () => {

    return otpGenerator.generate(6, {

        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
        digits: true

    });

};


// ======================================================
// LOGIN USER
// POST : /api/auth/login
// ======================================================

const loginUser = (req, res) => {

    const { email, password } = req.body;

   const sql = `
    SELECT
        id,
        employee_id,
        name,
        email,
        password,
        profile_photo,
        department_id,
        designation_id,
        is_admin,
        status,
        is_activated
    FROM users
    WHERE email=?
    LIMIT 1
`;

    db.query(sql, [email], async (err, result) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,
                message: "Database Error"

            });

        }

        if (result.length === 0) {

            return res.status(401).json({

                success: false,
                message: "Invalid Email or Password"

            });

        }

        const user = result[0];
       // =============================
// Check User Status
// =============================

if (user.status !== "Active") {

    return res.status(403).json({

        success: false,

        message: `Dear ${user.name},

Your account is no longer active and access to the miarcus ERP application has been disabled.

Please contact your administrator for further assistance.

Thank you for using the miarcus ERP application.

Regards,
miarcus Team`

    });

}

// =============================
// Check Account Activation
// =============================

if (!user.is_activated) {

    return res.status(403).json({

        success: false,

        message: "Your account is not activated. Please activate it from the invitation email."

    });

}

let passwordMatched = false;

        // Check bcrypt password
        try {

            passwordMatched = await bcrypt.compare(
                password,
                user.password
            );

        }

        catch {

            // Fallback for old plain-text passwords
            passwordMatched = password === user.password;

        }

        if (!passwordMatched) {

            return res.status(401).json({

                success: false,
                message: "Invalid Email or Password"

            });

        }

     // ======================================================
// LOAD USER PERMISSIONS
// ======================================================

const permissionSql = `
    SELECT
        module_name,
        permission
    FROM user_permissions
    WHERE user_id = ?
`;

db.query(permissionSql, [user.id], (permissionErr, permissionRows) => {

    if (permissionErr) {

        console.error(permissionErr);

        return res.status(500).json({

            success: false,
            message: "Failed to Load Permissions"

        });

    }

    const permissions = {};

    permissionRows.forEach((row) => {

        permissions[row.module_name] = row.permission;

    });

    // ======================================================
// GENERATE JWT TOKEN
// ======================================================

const token = jwt.sign(

    {

        id: user.id,

        email: user.email,

        is_admin: user.is_admin

    },

    process.env.JWT_SECRET || "miarcus_secret_key",

    {

        expiresIn: "1d"

    }

);

   return res.status(200).json({

    success: true,

    message: "Login Successful",

    token,

    user: {

        id: user.id,

        employee_id: user.employee_id || "",

        name: user.name,

        email: user.email,

        profile_photo: user.profile_photo || "",

        department_id: user.department_id || null,

        designation_id: user.designation_id || null,

        administrator: user.is_admin === 1

    },

    permissions

});
});

});

};
// ======================================================
// FORGOT PASSWORD
// POST : /api/auth/forgot-password
// ======================================================

const forgotPassword = (req, res) => {

    const { email } = req.body;

    const checkUserSql = `
        SELECT id, name, email
        FROM users
        WHERE email=?
    `;

    db.query(checkUserSql, [email], (err, result) => {

        if (err) {

            console.log(err);

            return res.status(500).json({

                success: false,

                message: "Database Error"

            });

        }

        if (result.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Email Not Found"

            });

        }

        const user = result[0];

        const otp = generateOTP();

        const expiresAt = new Date(

            Date.now() + 10 * 60 * 1000

        );

        // ======================================
        // Remove Previous OTP
        // ======================================

        db.query(

            "DELETE FROM password_reset_otp WHERE email=?",

            [email],

            (deleteErr) => {

                if (deleteErr) {

                    return res.status(500).json({

                        success: false,

                        message: "Database Error"

                    });

                }

                const insertSql = `
                    INSERT INTO password_reset_otp
                    (email, otp, expires_at)
                    VALUES (?, ?, ?)
                `;

                db.query(

                    insertSql,

                    [

                        email,

                        otp,

                        expiresAt

                    ],

                    (insertErr) => {

                        if (insertErr) {

                            return res.status(500).json({

                                success: false,

                                message: "Failed to Save OTP"

                            });

                        }

                        // ======================================
                        // Send OTP Email
                        // ======================================

                        sendForgotPasswordOTPEmail(user, otp)

                            .then(() => {

                                return res.status(200).json({

                                    success: true,

                                    message: "OTP Sent Successfully"

                                });

                            })

                            .catch((mailErr) => {

                                console.error(mailErr);

                                return res.status(500).json({

                                    success: false,

                                    message: "Failed to Send OTP"

                                });

                            });

                    }

                );

            }

        );

    });

};

// ======================================================
// VERIFY OTP
// POST : /api/auth/verify-otp
// ======================================================

const verifyOTP = (req, res) => {

    const {

        email,
        otp

    } = req.body;

    const sql = `
        SELECT *
        FROM password_reset_otp
        WHERE email=?
        AND otp=?
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(

        sql,

        [

            email,
            otp

        ],

        (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,
                    message: "Database Error"

                });

            }

            if (result.length === 0) {

                return res.status(400).json({

                    success: false,
                    message: "Invalid OTP"

                });

            }

            const record = result[0];

            if (new Date(record.expires_at) < new Date()) {

                return res.status(400).json({

                    success: false,
                    message: "OTP Expired"

                });

            }

            db.query(

                `
                UPDATE password_reset_otp
                SET verified=1
                WHERE id=?
                `,

                [

                    record.id

                ],

                (updateErr) => {

                    if (updateErr) {

                        return res.status(500).json({

                            success: false,
                            message: "Database Error"

                        });

                    }

                    return res.status(200).json({

                        success: true,
                        message: "OTP Verified Successfully"

                    });

                }

            );

        }

    );

};
// ======================================================
// RESET PASSWORD
// PUT : /api/auth/reset-password
// ======================================================

const resetPassword = async (req, res) => {

    const {

        email,
        password

    } = req.body;

    const checkOtpSql = `
        SELECT *
        FROM password_reset_otp
        WHERE email=?
        AND verified=1
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(

        checkOtpSql,

        [

            email

        ],

        async (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,
                    message: "Database Error"

                });

            }

            if (result.length === 0) {

                return res.status(400).json({

                    success: false,
                    message: "OTP Verification Required"

                });

            }

            try {

                const hashedPassword = await bcrypt.hash(password, 10);

                const updateSql = `
                    UPDATE users
                    SET password=?
                    WHERE email=?
                `;

                db.query(

                    updateSql,

                    [

                        hashedPassword,
                        email

                    ],

                    (updateErr, updateResult) => {

                        if (updateErr) {

                            return res.status(500).json({

                                success: false,
                                message: "Database Error"

                            });

                        }

                        if (updateResult.affectedRows === 0) {

                            return res.status(404).json({

                                success: false,
                                message: "User Not Found"

                            });

                        }

                        // ======================================
                        // Delete OTP
                        // ======================================

                        db.query(

                            "DELETE FROM password_reset_otp WHERE email=?",

                            [

                                email

                            ]

                        );

                        // ======================================
                        // Send Password Reset Confirmation Email
                        // ======================================

                        const user = {

                            email

                        };

                        sendResetPasswordEmail(user)

                            .catch((mailErr) => {

                                console.error(mailErr);

                            });

                        return res.status(200).json({

                            success: true,

                            message: "Password Updated Successfully"

                        });

                    }

                );

            }

            catch (error) {

                console.error(error);

                return res.status(500).json({

                    success: false,

                    message: "Password Hashing Failed"

                });

            }

        }

    );

};
// ======================================================
// SIGN UP USER
// POST : /api/auth/signup
// ======================================================

const signupUser = async (req, res) => {

    try {

        const {
            fullName,
            employeeId,
            email,
            password,
            callContact,
            whatsappContact,
            reportsTo,
            department_id,
            designation_id,
            stores,
            permissions
        } = req.body;


        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            !fullName ||
            !employeeId ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Full Name, Employee ID, Email and Password are required."

            });

        }


        if (password.length < 6) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must contain at least 6 characters."

            });

        }


        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();


        // ==================================================
        // CHECK EXISTING EMAIL
        // ==================================================

        const emailSql = `
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
        `;

        db.query(
            emailSql,
            [cleanEmail],
            async (emailErr, emailResult) => {

                if (emailErr) {

                    console.error(
                        "Signup email check error:",
                        emailErr
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database Error"

                    });

                }


                if (
                    emailResult.length > 0
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "An account with this email already exists."

                    });

                }


                // ==========================================
                // CHECK EMPLOYEE ID
                // ==========================================

                const employeeSql = `
                    SELECT id
                    FROM users
                    WHERE employee_id = ?
                    LIMIT 1
                `;

                db.query(
                    employeeSql,
                    [employeeId.trim()],
                    async (
                        employeeErr,
                        employeeResult
                    ) => {

                        if (employeeErr) {

                            console.error(
                                "Signup employee check error:",
                                employeeErr
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Database Error"

                            });

                        }


                        if (
                            employeeResult.length > 0
                        ) {

                            return res.status(409).json({

                                success: false,

                                message:
                                    "This Employee ID is already registered."

                            });

                        }


                        // ======================================
                        // HASH PASSWORD
                        // ======================================

                        const hashedPassword =
                            await bcrypt.hash(
                                password,
                                10
                            );


                        // ======================================
                        // CREATE USER
                        //
                        // IMPORTANT:
                        //
                        // Self-signup users are:
                        //
                        // Active
                        // Activated
                        // Not Administrator
                        //
                        // No email is required.
                        // ======================================

                        const insertSql = `
                            INSERT INTO users
                            (
                                employee_id,
                                name,
                                email,
                                password,
                                call_contact,
                                whatsapp_contact,
                                reports_to,
                                department_id,
                                designation_id,
                                is_admin,
                                status,
                                is_activated
                            )
                            VALUES
                            (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Active', 1)
                        `;


                        const reportId =
                            reportsTo?.id ||
                            null;


                        db.query(

                            insertSql,

                            [

                                employeeId.trim(),

                                fullName.trim(),

                                cleanEmail,

                                hashedPassword,

                                callContact
                                    ? String(
                                        callContact
                                    ).trim()
                                    : null,

                                whatsappContact
                                    ? String(
                                        whatsappContact
                                    ).trim()
                                    : null,

                                reportId,

                                department_id ||
                                    null,

                                designation_id ||
                                    null

                            ],

                            (
                                insertErr,
                                result
                            ) => {

                                if (insertErr) {

                                    console.error(
                                        "Signup insert error:",
                                        insertErr
                                    );

                                    return res.status(500).json({

                                        success: false,

                                        message:
                                            "Failed to create account."

                                    });

                                }


                                const userId =
                                    result.insertId;


                                // ==================================
                                // CREATE PERMISSIONS
                                // ==================================

                                const permissionEntries =
                                    Object.entries(
                                        permissions || {}
                                    )
                                    .filter(
                                        ([, permission]) =>
                                            permission &&
                                            permission !== "None"
                                    );


                                if (
                                    permissionEntries.length === 0
                                ) {

                                    return res.status(201).json({

                                        success: true,

                                        message:
                                            "Account created successfully.",

                                        userId

                                    });

                                }


                                const permissionValues =
                                    permissionEntries.map(
                                        (
                                            [
                                                moduleName,
                                                permission
                                            ]
                                        ) => [

                                            userId,

                                            moduleName,

                                            permission

                                        ]
                                    );


                                const permissionSql = `
                                    INSERT INTO user_permissions
                                    (
                                        user_id,
                                        module_name,
                                        permission
                                    )
                                    VALUES ?
                                `;


                                db.query(

                                    permissionSql,

                                    [
                                        permissionValues
                                    ],

                                    (
                                        permissionErr
                                    ) => {

                                        if (
                                            permissionErr
                                        ) {

                                            console.error(
                                                "Signup permission error:",
                                                permissionErr
                                            );

                                            return res.status(500).json({

                                                success: false,

                                                message:
                                                    "Account created, but permissions could not be saved."

                                            });

                                        }


                                        // ==================================
                                        // EMAIL SERVICE
                                        //
                                        // TEMPORARILY DISABLED
                                        //
                                        // DO NOT SEND EMAIL.
                                        // ==================================

                                        console.log(
                                            "🧪 Signup email skipped for:",
                                            cleanEmail
                                        );


                                        return res.status(201).json({

                                            success: true,

                                            message:
                                                "Account created successfully.",

                                            userId

                                        });

                                    }

                                );

                            }

                        );

                    }

                );

            }

        );

    }
    catch (error) {

        console.error(
            "Signup error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to create account."

        });

    }

};

module.exports = {

    loginUser,

    signupUser,

    forgotPassword,

    verifyOTP,

    resetPassword

};
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
    JWT_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_TTL,
    RESET_TOKEN_TTL,
    BCRYPT_ROUNDS,
    OTP_TTL_MS,
    hashOtp,
    generateOtp,
    generateResetJti,
    normalizeEmail,
    validatePassword,
} = require("../config/security");
const {
    sendForgotPasswordOTPEmail,
    sendResetPasswordEmail
} = require("../services/emailService");

// ======================================================
// SECURITY HELPERS
// ======================================================

const allowedResetDomain = /@(gmail\.com|jawandson\.com|miarcus\.com)$/i;

// ======================================================
// LOGIN USER
// POST : /api/auth/login
// ======================================================

const loginUser = (req, res) => {

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
        return res.status(401).json({
            success: false,
            message: "Invalid Email or Password"
        });
    }

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

if (user.status !== "Active" || !user.is_activated) {
    return res.status(401).json({
        success: false,
        message: "Invalid Email or Password"
    });
}

let passwordMatched = false;

        // Only bcrypt hashes are accepted. Plain-text password fallback is removed.
        try {
            passwordMatched = await bcrypt.compare(
                password,
                user.password || ""
            );
        } catch (compareError) {
            console.error("Password verification failed:", compareError);
            passwordMatched = false;
        }

        if (!passwordMatched) {

            return res.status(401).json({
                success: false,
                message: "Invalid Email or Password"
            });

        }

        // Transparently upgrade older bcrypt hashes after a successful login.
        // Plain-text passwords are never accepted.
        try {
            const rounds = bcrypt.getRounds(user.password || "");
            if (Number.isInteger(rounds) && rounds < BCRYPT_ROUNDS) {
                const upgradedHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
                db.query(
                    "UPDATE users SET password=? WHERE id=?",
                    [upgradedHash, user.id],
                    (rehashErr) => {
                        if (rehashErr) console.error("Password hash upgrade failed:", rehashErr);
                    }
                );
            }
        } catch (rehashError) {
            console.error("Password hash inspection failed:", rehashError);
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

    JWT_SECRET,

    {
        algorithm: JWT_ALGORITHM,
        expiresIn: ACCESS_TOKEN_TTL,
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

    const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();

    if (!allowedResetDomain.test(email)) {

        return res.status(400).json({

            success: false,

            message:
                "Password reset OTP is available only for @gmail.com, @jawandson.com, and @miarcus.com email addresses."

        });
    }

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
            // Deliberately use the same response as a successful request to
            // prevent account enumeration.
            return res.status(200).json({
                success: true,
                message: "If the account exists, a password-reset OTP has been sent."
            });
        }

        const user = result[0];

        const otp = generateOtp();
        const otpHash = hashOtp(otp);

        const expiresAt = new Date(Date.now() + OTP_TTL_MS);

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

                        otpHash,
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

    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!allowedResetDomain.test(email) || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const sql = `
        SELECT *
        FROM password_reset_otp
        WHERE email=?
        AND otp=?
        AND verified=0
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(

        sql,

        [

            email,
            hashOtp(otp)

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
                WHERE id=? AND verified=0
                `,

                [

                    record.id

                ],

                (updateErr, updateResult) => {

                    if (updateErr) {

                        return res.status(500).json({

                            success: false,
                            message: "Database Error"

                        });

                    }

                    // The OTP is one-time-use. If another request verified
                    // it first, this update affects 0 rows and must fail.
                    if (updateResult.affectedRows === 0) {

                        return res.status(400).json({

                            success: false,
                            message: "Invalid or already used OTP"

                        });

                    }

                    const resetToken = jwt.sign(
                        {
                            sub: String(email),
                            type: "password-reset",
                            jti: generateResetJti(),
                        },
                        JWT_SECRET,
                        {
                            algorithm: JWT_ALGORITHM,
                            expiresIn: RESET_TOKEN_TTL,
                        }
                    );

                    return res.status(200).json({
                        success: true,
                        message: "OTP Verified Successfully",
                        resetToken,
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

    const password = String(req.body?.password || "");
    const resetToken = String(req.body?.resetToken || "").trim();

    if (!resetToken) {
        return res.status(400).json({
            success: false,
            message: "Password reset authorization is missing or expired."
        });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
    }

    let resetClaims;
    try {
        resetClaims = jwt.verify(resetToken, JWT_SECRET, {
            algorithms: [JWT_ALGORITHM],
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: "Password reset authorization is invalid or expired."
        });
    }

    if (resetClaims?.type !== "password-reset" || !resetClaims?.sub) {
        return res.status(400).json({
            success: false,
            message: "Password reset authorization is invalid or expired."
        });
    }

    const email = normalizeEmail(resetClaims.sub);
    if (!allowedResetDomain.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid password reset request." });
    }

    const checkOtpSql = `
        SELECT id
        FROM password_reset_otp
        WHERE email=?
        AND verified=1
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(
        checkOtpSql,
        [email],

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

                const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

                const updateSql = `
                    UPDATE users
                    SET password=?
                    WHERE email=?
                    AND status='Active'
                `;

                db.query(

                    updateSql,

                    [

                        hashedPassword,
                        email

                    ],

                    async (updateErr, updateResult) => {

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

                        try {

                            await sendResetPasswordEmail(user);

                            return res.status(200).json({
                                success: true,
                                warning: false,
                                emailSent: true,
                                message: "Password Updated Successfully"
                            });

                        } catch (mailErr) {

                            console.error(
                                "Password reset confirmation email failed:",
                                mailErr?.message || mailErr
                            );

                            return res.status(200).json({
                                success: true,
                                warning: true,
                                emailSent: false,
                                message: "Password Updated Successfully, but the confirmation email could not be sent."
                            });

                        }

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

        if (String(process.env.ALLOW_PUBLIC_SIGNUP || "false").toLowerCase() !== "true") {
            return res.status(403).json({
                success: false,
                message: "Public registration is disabled. Please use an administrator invitation."
            });
        }

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


        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({
                success: false,
                message: passwordError
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
                                BCRYPT_ROUNDS
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
                            (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Inactive', 0)
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

                                return res.status(201).json({
                                    success: true,
                                    message: "Account created successfully. An administrator must activate the account before login.",
                                    userId
                                });
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

// ======================================================
// GET SIGNUP PAGE DATA
// GET : /api/auth/signup-data
//
// PUBLIC ROUTE
// No login token required.
//
// Returns everything the Signup page needs in a
// single call:
//
// - reports  -> list of possible "Reports To" managers
// - departments
// - designations
// - stores
//
// NOTE:
// If your table/column names differ from the ones
// below, update the four SQL strings only — the
// response shape can stay the same.
// ======================================================

const getSignupData = (req, res) => {

    // ==================================================
    // REPORTS TO (managers)
    // ==================================================

    const reportsSql = `
        SELECT
            u.id,
            u.name AS manager_name,
            d.department_name AS department
        FROM users u
        LEFT JOIN departments d
            ON u.department_id = d.id
        WHERE u.status = 'Active'
        ORDER BY u.name ASC
    `;

    db.query(reportsSql, (reportsErr, reportsResult) => {

        if (reportsErr) {

            console.error(
                "Signup data - reports error:",
                reportsErr
            );

            return res.status(500).json({

                success: false,

                message: "Failed to load Reports To list."

            });

        }


        // ==============================================
        // DEPARTMENTS
        // ==============================================

        const departmentsSql = `
            SELECT
                id,
                department_name
            FROM departments
            ORDER BY department_name ASC
        `;

        db.query(departmentsSql, (deptErr, deptResult) => {

            if (deptErr) {

                console.error(
                    "Signup data - departments error:",
                    deptErr
                );

                return res.status(500).json({

                    success: false,

                    message: "Failed to load Departments."

                });

            }


            // ==========================================
            // DESIGNATIONS
            // ==========================================

            const designationsSql = `
                SELECT
                    id,
                    designation_name,
                    department_id
                FROM designations
                ORDER BY designation_name ASC
            `;

            db.query(designationsSql, (desigErr, desigResult) => {

                if (desigErr) {

                    console.error(
                        "Signup data - designations error:",
                        desigErr
                    );

                    return res.status(500).json({

                        success: false,

                        message: "Failed to load Designations."

                    });

                }


                // ======================================
                // STORES
                // ======================================

                const storesSql = `
                    SELECT
                        id,
                        store_name
                    FROM stores
                    ORDER BY store_name ASC
                `;

                db.query(storesSql, (storeErr, storeResult) => {

                    if (storeErr) {

                        console.error(
                            "Signup data - stores error:",
                            storeErr
                        );

                        return res.status(500).json({

                            success: false,

                            message: "Failed to load Stores."

                        });

                    }


                    // ==================================
                    // SEND COMBINED RESPONSE
                    // ==================================

                    return res.status(200).json({

                        success: true,

                        reports: reportsResult,

                        departments: deptResult,

                        designations: desigResult,

                        stores: storeResult

                    });

                });

            });

        });

    });

};

module.exports = {

    loginUser,

    signupUser,

    forgotPassword,

    verifyOTP,

    resetPassword,

    getSignupData

};
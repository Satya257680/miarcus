const db = require("../config/db");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const transporter = require("../config/mailer");


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
            designation_id
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

        return res.status(200).json({

            success: true,

            message: "Login Successful",

            user: {

                id: user.id,

                employee_id:
                    user.employee_id || "",

                name:
                    user.name,

                email:
                    user.email,

                profile_photo:
                    user.profile_photo || "",

                department_id:
                    user.department_id || null,

                designation_id:
                    user.designation_id || null

            }

        });

    });

};
// ======================================================
// FORGOT PASSWORD
// POST : /api/auth/forgot-password
// ======================================================

const forgotPassword = (req, res) => {

    console.log("BODY:", req.body);

    const { email } = req.body;

    console.log("EMAIL:", email);

    const checkUserSql = `
        SELECT id
        FROM users
        WHERE email=?
    `;

    db.query(checkUserSql, [email], (err, result) => {

        console.log("DB RESULT:", result);

        if (err) {
            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Database Error"
            });
        }

        if (result.length === 0) {

            console.log("USER NOT FOUND");

            return res.status(404).json({
                success: false,
                message: "Email Not Found"
            });

        }

        console.log("USER FOUND");

        // keep the remaining code exactly the same...
        const otp = generateOTP();

        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Remove old OTPs

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

                        transporter.sendMail(

                            {

                                from: process.env.EMAIL_USER,

                                to: email,

                                subject: "Miarcus ERP Password Reset OTP",

                                html: `
                                    <h2>Password Reset OTP</h2>

                                    <p>Hello,</p>

                                    <p>Your OTP is:</p>

                                    <h1>${otp}</h1>

                                    <p>
                                        This OTP is valid for
                                        <b>10 minutes</b>.
                                    </p>

                                    <p>
                                        Do not share this OTP.
                                    </p>
                                `

                            },

                            (mailErr) => {

                                if (mailErr) {

                                    console.error(mailErr);

                                    return res.status(500).json({

                                        success: false,
                                        message: "Failed to Send OTP"

                                    });

                                }

                                return res.status(200).json({

                                    success: true,
                                    message: "OTP Sent Successfully"

                                });

                            }

                        );

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

                        // Delete OTP after successful reset

                        db.query(

                            "DELETE FROM password_reset_otp WHERE email=?",

                            [

                                email

                            ]

                        );

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
module.exports = {

    loginUser,

    forgotPassword,

    verifyOTP,

    resetPassword

};
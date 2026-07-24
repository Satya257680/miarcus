const fs = require("fs");
const XLSX = require("xlsx");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const User = require("../models/userModel");
const transporter = require("../config/mailer");
// ==========================================================
// Get All Users
// ==========================================================

const getUsers = (req, res) => {

    User.getAllUsers((err, result) => {

        if (err) {

            console.log(err);

            return res.status(500).json({

                success: false,
                message: "Database Error"

            });

        }

        res.json({

            success: true,
            users: result

        });

    });

};

// ==========================================================
// Create User + Send Invitation
// ==========================================================

const createUser = (req, res) => {

    const user = req.body;

    // -------------------------
    // Check Duplicate Email
    // -------------------------

    User.checkEmailExists(

        user.email,

        (emailErr, emailResult) => {

            if (emailErr) {

                return res.status(500).json({

                    success: false,
                    message: "Database Error"

                });

            }

            if (emailResult.length > 0) {

                return res.status(400).json({

                    success: false,
                    message: "Email already exists"

                });

            }

            // -------------------------
            // Check Employee ID
            // -------------------------

            User.checkEmployeeIdExists(

                user.employeeId,

                (empErr, empResult) => {

                    if (empErr) {

                        return res.status(500).json({

                            success: false,
                            message: "Database Error"

                        });

                    }

                    if (empResult.length > 0) {

                        return res.status(400).json({

                            success: false,
                            message: "Employee ID already exists"

                        });

                    }

                    // -------------------------
                    // Save User
                    // -------------------------

                    User.addUser(

                        user,

                        (addErr, addResult) => {

                            if (addErr) {

                                console.log(addErr);

                                return res.status(500).json({

                                    success: false,
                                    message: "Unable to add user"

                                });

                            }

                            const userId = addResult.insertId;

                            const token = crypto.randomBytes(32).toString("hex");

                            const expiresAt = new Date(

                                Date.now() + 24 * 60 * 60 * 1000

                            );

                            // -------------------------
                            // Save Token
                            // -------------------------

                            User.saveActivationToken(

                                userId,

                                token,

                                expiresAt,

                                (tokenErr) => {

                                    if (tokenErr) {

                                        console.log(tokenErr);

                                        return res.status(500).json({

                                            success: false,
                                            message: "Unable to create activation token"

                                        });

                                    }

                                    const activationLink =
                                        `http://localhost:5173/activate-account/${token}`;

                                    // -------------------------
                                    // Send Mail
                                    // -------------------------

                                    transporter.sendMail(

                                        {

                                            from: process.env.EMAIL_USER,

                                            to: user.email,

                                            subject: "Welcome to Miarcus ERP",

                                            html: `

                                                <div style="font-family:Arial;padding:30px">

                                                    <h2>Welcome to Miarcus ERP</h2>

                                                    <p>Hello <b>${user.fullName}</b>,</p>

                                                    <p>Your account has been created successfully.</p>

                                                    <p>Please click the button below to activate your account and create your password.</p>

                                                    <p style="margin:30px 0">

                                                        <a
                                                            href="${activationLink}"
                                                            style="
                                                                background:#6c63ff;
                                                                color:#fff;
                                                                padding:12px 24px;
                                                                text-decoration:none;
                                                                border-radius:6px;
                                                            "
                                                        >

                                                            Activate Account

                                                        </a>

                                                    </p>

                                                    <p>This link will expire in 24 hours.</p>

                                                    <p>Regards,<br><b>Miarcus ERP Team</b></p>

                                                </div>

                                            `

                                        },

                                        (mailErr) => {

                                            if (mailErr) {

                                                console.log(mailErr);

                                                return res.status(500).json({

                                                    success: false,
                                                    message: "User created but invitation email failed"

                                                });

                                            }

                                            return res.status(201).json({

                                                success: true,
                                                message: "User created and invitation sent successfully"

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

    );

};

// ==========================================================
// Bulk Upload Users
// ==========================================================

const bulkUploadUsers = (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,
                message: "No file uploaded"

            });

        }

        const workbook = XLSX.readFile(req.file.path);

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const users = XLSX.utils.sheet_to_json(sheet, {

            defval: "",
            blankrows: false

        });

        const filteredUsers = users.filter((user) => {

            return (

                String(user["Employee ID"] || "").trim() !== "" ||

                String(user["Name"] || "").trim() !== "" ||

                String(user["Email"] || "").trim() !== ""

            );

        });

        if (filteredUsers.length === 0) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({

                success: false,
                message: "No valid users found."

            });

        }

        User.bulkInsertUsers(filteredUsers, (err, result) => {

            if (fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

            }

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,
                    message: "Bulk Upload Failed"

                });

            }

            res.json({

                success: true,

                message: `${result.affectedRows} users uploaded successfully`

            });

        });

    }

    catch (err) {

        console.log(err);

        if (req.file && fs.existsSync(req.file.path)) {

            fs.unlinkSync(req.file.path);

        }

        res.status(500).json({

            success: false,

            message: "Upload Error"

        });

    }

};
// ==========================
// Update User
// ==========================

const updateUser = (req, res) => {

    User.updateUser(

        req.params.id,

        req.body,

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message: "Update Failed"

                });

            }

            // ======================================
            // Send Activation / Deactivation Email
            // ======================================

            const user = req.body;

            let subject = "";

            let html = "";

            if (user.active) {

                subject = "Miarcus ERP - Account Activated";

                html = `
                    <div style="font-family:Arial,sans-serif;padding:30px;line-height:1.8;color:#333;">

                        <h2 style="color:#6C63FF;">
                            Miarcus ERP
                        </h2>

                        <p>Dear <b>${user.fullName}</b>,</p>

                        <p>
                            We are pleased to inform you that your
                            <b>Miarcus ERP account has been activated.</b>
                        </p>

                        <p>
                            Click the button below to log in to the Miarcus ERP application.
                        </p>

                        <p style="margin:30px 0;">

                            <a
                                href="http://localhost:5173/"
                                style="
                                    background:#6C63FF;
                                    color:#ffffff;
                                    padding:14px 28px;
                                    text-decoration:none;
                                    border-radius:6px;
                                    font-size:16px;
                                    font-weight:bold;
                                    display:inline-block;
                                "
                            >
                                Login to Miarcus ERP
                            </a>

                        </p>

                        <p>
                            If the button doesn't work, copy and paste this link into your browser:
                        </p>

                        <p>
                            <a href="http://localhost:5173/">
                                http://localhost:5173/
                            </a>
                        </p>

                        <hr style="margin:30px 0;">

                        <p>
                            Thank you for using the Miarcus ERP application.
                        </p>

                        <p>
                            Regards,<br>
                            <b>Miarcus Team</b>
                        </p>

                    </div>
                `;

            } else {

                subject = "Miarcus ERP - Account Deactivated";

                html = `
                    <div style="font-family:Arial,sans-serif;padding:30px;line-height:1.8;color:#333;">

                        <h2 style="color:#6C63FF;">
                            Miarcus ERP
                        </h2>

                        <p>Dear <b>${user.fullName}</b>,</p>

                        <p>
                            Your <b>Miarcus ERP account has been deactivated.</b>
                        </p>

                        <p>
                            You can no longer access the application.
                        </p>

                        <p>
                            If you believe this action was taken in error,
                            please contact your administrator.
                        </p>

                        <hr style="margin:30px 0;">

                        <p>
                            Thank you for using the Miarcus ERP application.
                        </p>

                        <p>
                            Regards,<br>
                            <b>Miarcus Team</b>
                        </p>

                    </div>
                `;

            }

            transporter.sendMail(

                {

                    from: process.env.EMAIL_USER,

                    to: user.email,

                    subject,

                    html

                },

                (mailErr) => {

                    if (mailErr) {

                        console.log(mailErr);

                    }

                }

            );

            res.json({

                success: true,

                message: "User Updated Successfully"

            });

        }

    );

};

// ==========================
// Disable User
// ==========================

const disableUser = (req, res) => {

    User.disableUser(

        req.params.id,

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to Disable User"

                });

            }

            res.json({

                success: true,

                message: "User Disabled Successfully"

            });

        }

    );

};

// ==========================
// Delete User
// ==========================

const deleteUser = (req, res) => {

    User.deleteUser(

        req.params.id,

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to Delete User"

                });

            }

            res.json({

                success: true,

                message: "User Deleted Successfully"

            });

        }

    );

};

// ==========================
// Delete All Users
// ==========================

const deleteAllUsers = (req, res) => {

    User.deleteAllUsers(

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to Delete Users"

                });

            }

            res.json({

                success: true,

                message: "All Users Deleted Successfully"

            });

        }

    );

};

// ==========================
// Get User Names
// ==========================

const getUserNames = (req, res) => {

    User.getUserNames(

        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            res.json({

                success: true,

                users: result

            });

        }

    );

};
// ==========================
// Validate Activation Token
// ==========================

const validateActivationToken = (req, res) => {

    const { token } = req.params;

    User.getActivationToken(token, (err, result) => {

        if (err) {

            console.log(err);

            return res.status(500).json({

                success: false,

                message: "Database Error"

            });

        }

        if (result.length === 0) {

            return res.status(400).json({

                success: false,

                message: "Invalid or Expired Activation Link"

            });

        }

        res.json({

            success: true,

            message: "Activation link is valid"

        });

    });

};
// ==========================
// Activate User Account
// ==========================

const activateUserAccount = async (req, res) => {

    try {

        const {

            token,

            password

        } = req.body;

        User.getActivationToken(

            token,

            async (err, result) => {

                if (err) {

                    console.log(err);

                    return res.status(500).json({

                        success: false,

                        message: "Database Error"

                    });

                }

                if (result.length === 0) {

                    return res.status(400).json({

                        success: false,

                        message: "Invalid or Expired Activation Link"

                    });

                }

                const activation = result[0];

                const hashedPassword = await bcrypt.hash(password, 10);

                User.activateUser(

                    activation.user_id,

                    hashedPassword,

                    (activateErr) => {

                        if (activateErr) {

                            console.log(activateErr);

                            return res.status(500).json({

                                success: false,

                                message: "Unable to Activate Account"

                            });

                        }

                        User.markTokenUsed(

                            token,

                            (tokenErr) => {

                                if (tokenErr) {

                                    console.log(tokenErr);

                                }

                                return res.json({

                                    success: true,

                                    message: "Account Activated Successfully"

                                });

                            }

                        );

                    }

                );

            }

        );

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: "Server Error"

        });

    }

};
// ==========================
// Resend Invitation
// ==========================

const resendInvitation = (req, res) => {

    const userId = req.params.id;

    User.getUserById(

        userId,

        (err, users) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            if (users.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "User Not Found"

                });

            }

            const user = users[0];

            if (user.is_activated) {

                return res.status(400).json({

                    success: false,

                    message: "User Already Activated"

                });

            }

            const token = crypto.randomBytes(32).toString("hex");

            const expiresAt = new Date(

                Date.now() + 24 * 60 * 60 * 1000

            );

            User.saveActivationToken(

                user.id,

                token,

                expiresAt,

                (tokenErr) => {

                    if (tokenErr) {

                        console.log(tokenErr);

                        return res.status(500).json({

                            success: false,

                            message: "Unable to Generate Token"

                        });

                    }

                    const activationLink =
                        `http://localhost:5173/activate-account/${token}`;

                    transporter.sendMail(

                        {

                            from: process.env.EMAIL_USER,

                            to: user.email,

                            subject: "Miarcus ERP Invitation",

                            html: `
                                <h2>Hello ${user.name}</h2>

                                <p>Your invitation link has been regenerated.</p>

                                <p>

                                <a href="${activationLink}">
                                Activate Account
                                </a>

                                </p>

                                <p>This link expires in 24 hours.</p>
                            `

                        },

                        (mailErr) => {

                            if (mailErr) {

                                console.log(mailErr);

                                return res.status(500).json({

                                    success: false,

                                    message: "Unable to Send Email"

                                });

                            }

                            res.json({

                                success: true,

                                message: "Invitation Sent Successfully"

                            });

                        }

                    );

                }

            );

        }

    );

};
module.exports = {

    getUsers,

    createUser,

    bulkUploadUsers,

    updateUser,

    disableUser,

    deleteUser,

    deleteAllUsers,

    getUserNames,

    validateActivationToken,

    activateUserAccount,

    resendInvitation

};
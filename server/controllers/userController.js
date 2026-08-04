const fs = require("fs");
const XLSX = require("xlsx");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const User = require("../models/userModel");
const { logActivity } = require("../utils/activityLogger");

const {

    sendInvitationEmail,

    sendAccountUpdatedEmail,

    sendAccountActivatedEmail,

    sendAccountDisabledEmail,

    sendAccountEnabledEmail,

    sendAccountDeletedEmail

} = require("../services/emailService");

const {

    addToQueue

} = require("../utils/emailTemplates/emailQueue");

// ==========================================================
// GET ALL USERS
// ==========================================================

const getUsers = (req, res) => {

    User.getAllUsers(

        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            return res.json({

                success: true,

                users: result

            });

        }

    );

};
// ==========================================================
// CREATE USER + SEND INVITATION
// ==========================================================

const createUser = (req, res) => {

    const user = req.body;

    // =============================
// FIX EMPTY INTEGER VALUES
// =============================

user.designation_id = user.designation_id || null;

user.department_id = user.department_id || null;

user.reports_to = user.reports_to || null;

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

                            const token = crypto
                                .randomBytes(32)
                                .toString("hex");

                            const expiresAt = new Date(

                                Date.now() + 24 * 60 * 60 * 1000

                            );

                            // -------------------------
                            // Save Activation Token
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
                                        `${process.env.FRONTEND_URL}/activate-account/${token}`;
                                                                            // -------------------------
                                    // Send Invitation Email
                                    // -------------------------

                                    sendInvitationEmail(

                                        user,

                                        activationLink

                                    )

                                    .then(() => {

                                        // ======================================
                                        // Log Activity
                                        // ======================================

                                        logActivity({

                                            activity_type: "User",

                                            reference_id: userId,

                                            title: "User Created",

                                            description: `${user.fullName || user.name} was added`,

                                            module_name: "Users",

                                            status: "Open",

                                            priority: "Medium",

                                            // Logged-in Administrator
                                            created_by: req.user.id,

                                            // Newly Created User
                                            assigned_to: userId

                                        });

                                        return res.status(201).json({

                                            success: true,

                                            message: "User created and invitation sent successfully"

                                        });

                                    })

                                    .catch((mailErr) => {

                                        console.log(mailErr);

                                        return res.status(500).json({

                                            success: false,

                                            message: "User created but invitation email failed"

                                        });

                                    });

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
// BULK UPLOAD USERS
// ==========================================================

const bulkUploadUsers = async (req, res) => {

    console.time("Total Upload");

    try {

        // ======================================================
        // CHECK FILE
        // ======================================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "No file uploaded"

            });

        }

        // ======================================================
        // READ EXCEL
        // ======================================================

        const workbook = XLSX.readFile(req.file.path);

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const users = XLSX.utils.sheet_to_json(

            sheet,

            {

                defval: "",

                blankrows: false

            }

        );

        // ======================================================
        // REMOVE EMPTY ROWS
        // ======================================================

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

        // ======================================================
        // COUNTERS
        // ======================================================

        let imported = 0;

        let skipped = 0;

        let emailsSent = 0;

        const errors = [];

        // ======================================================
        // LOOP USERS
        // ======================================================

        for (const row of filteredUsers) {

            const user = {

                employeeId: row["Employee ID"],

                fullName: row["Name"],

                email: row["Email"],

                callContact: row["Call Contact"],

                whatsappContact: row["WhatsApp Contact"],

                department_id: null,

                designation_id: null,

                reportsTo: row["Reports To"],

                active: (row["Status"] || "Active") === "Active",

                stores: [],

                permissions: {}

            };

            try {
                                // ======================================================
                // CHECK EMAIL
                // ======================================================

                const emailExists = await new Promise(

                    (resolve, reject) => {

                        User.checkEmailExists(

                            user.email,

                            (err, result) => {

                                if (err) {

                                    return reject(err);

                                }

                                resolve(result);

                            }

                        );

                    }

                );

                if (emailExists.length > 0) {

                    skipped++;

                    errors.push(

                        `${user.email} - Email already exists`

                    );

                    continue;

                }

                // ======================================================
                // CHECK EMPLOYEE ID
                // ======================================================

                const empExists = await new Promise(

                    (resolve, reject) => {

                        User.checkEmployeeIdExists(

                            user.employeeId,

                            (err, result) => {

                                if (err) {

                                    return reject(err);

                                }

                                resolve(result);

                            }

                        );

                    }

                );

                if (empExists.length > 0) {

                    skipped++;

                    errors.push(

                        `${user.employeeId} - Employee ID already exists`

                    );

                    continue;

                }

                // ======================================================
                // GET DEPARTMENT
                // ======================================================

                const department = await new Promise(

                    (resolve, reject) => {

                        User.getDepartmentIdByName(

                            row["Department"],

                            (err, result) => {

                                if (err) {

                                    return reject(err);

                                }

                                resolve(result);

                            }

                        );

                    }

                );

                // ======================================================
                // GET DESIGNATION
                // ======================================================

                const designation = await new Promise(

                    (resolve, reject) => {

                        User.getDesignationIdByName(

                            row["Designation"],

                            (err, result) => {

                                if (err) {

                                    return reject(err);

                                }

                                resolve(result);

                            }

                        );

                    }

                );

                // ======================================================
                // VALIDATE DEPARTMENT
                // ======================================================

                if (!department.length) {

                    skipped++;

                    errors.push(

                        `Department not found: ${row["Department"]}`

                    );

                    continue;

                }

                // ======================================================
                // VALIDATE DESIGNATION
                // ======================================================

                if (!designation.length) {

                    skipped++;

                    errors.push(

                        `Designation not found: ${row["Designation"]}`

                    );

                    continue;

                }

                user.department_id = department[0].id;

                user.designation_id = designation[0].id;
                                // ======================================================
                // ADD USER
                // ======================================================

                const addResult = await new Promise(

                    (resolve, reject) => {

                        User.addUser(

                            user,

                            (err, result) => {

                                if (err) {

                                    return reject(err);

                                }

                                resolve(result);

                            }

                        );

                    }

                );
                console.log("Inserted User:", addResult);

                const userId = addResult.insertId;
console.log("New User ID:", userId);
console.log("Department From Excel:", user.department);
console.log("Designation From Excel:", user.designation);

                // ======================================================
                // CREATE ACTIVATION TOKEN
                // ======================================================

                const token = crypto
                    .randomBytes(32)
                    .toString("hex");

                const expiresAt = new Date(

                    Date.now() + 24 * 60 * 60 * 1000

                );

                await new Promise(

                    (resolve, reject) => {

                        User.saveActivationToken(

                            userId,

                            token,

                            expiresAt,

                            (err) => {

                                if (err) {

                                    return reject(err);

                                }

                                resolve();

                            }

                        );

                    }

                );

                // ======================================================
                // ACTIVATION LINK
                // ======================================================

                const activationLink =
                    `${process.env.FRONTEND_URL}/activate-account/${token}`;

                // ======================================================
                // SEND EMAIL
                // ======================================================

                addToQueue(

                    async () => {

                        await sendInvitationEmail(

                            user,

                            activationLink

                        );

                        console.log(

                            `Invitation email sent to ${user.email}`

                        );

                    }

                );

                // ======================================================
                // LOG ACTIVITY
                // ======================================================

                logActivity({

                    activity_type: "User",

                    reference_id: userId,

                    title: "User Created",

                    description: `${user.fullName} was added`,

                    module_name: "Users",

                    status: "Open",

                    priority: "Medium",

                    // Logged-in Administrator
                    created_by: req.user.id,

                    // Newly Created User
                    assigned_to: userId

                });

                imported++;

                emailsSent++;

            }

            catch (err) {

                console.log(err);

                skipped++;

                errors.push(

                    `${user.email || user.employeeId} - ${err.message}`

                );

            }

        }

        // ======================================================
        // DELETE TEMP FILE
        // ======================================================

        if (fs.existsSync(req.file.path)) {

            fs.unlinkSync(req.file.path);

        }

        console.timeEnd("Total Upload");

        return res.json({

            success: true,

            message: "Bulk Upload Completed",

            imported,

            skipped,

            emailsSent,

            errors

        });

    }

    catch (err) {

        console.log(err);

        if (

            req.file &&

            fs.existsSync(req.file.path)

        ) {

            fs.unlinkSync(req.file.path);

        }

        return res.status(500).json({

            success: false,

            message: "Upload Error"

        });

    }

};
// ==========================
// UPDATE USER
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

            const user = req.body;

            // ======================================
            // Send Account Updated Email
            // ======================================

            sendAccountUpdatedEmail(user)

                .catch((mailErr) => {

                    console.log(mailErr);

                });

            // ======================================
            // Log Activity
            // ======================================

            logActivity({

                activity_type: "User",

                reference_id: req.params.id,

                title: "User Updated",

                description: `${user.fullName || user.name} was updated`,

                module_name: "Users",

                status: "Open",

                priority: "Medium",

                // Logged-in Administrator
                created_by: req.user.id,

                // Updated User
                assigned_to: req.params.id

            });

            return res.json({

                success: true,

                message: "User Updated Successfully"

            });

        }

    );

};
// ==========================
// DISABLE USER
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

            // ======================================
            // Get User Details
            // ======================================

            User.getUserById(

                req.params.id,

                (userErr, users) => {

                    if (userErr) {

                        console.log(userErr);

                        return res.status(500).json({

                            success: false,

                            message: "Database Error"

                        });

                    }

                    if (users.length > 0) {

                        const user = users[0];

                        // ======================================
                        // Send Account Disabled Email
                        // ======================================

                        sendAccountDisabledEmail(user)

                            .catch((mailErr) => {

                                console.log(mailErr);

                            });

                        // ======================================
                        // Log Activity
                        // ======================================

                        logActivity({

                            activity_type: "User",

                            reference_id: user.id,

                            title: "User Disabled",

                            description: `${user.name || user.fullName} was disabled`,

                            module_name: "Users",

                            status: "Closed",

                            priority: "High",

                            // Administrator performing the action
                            created_by: req.user.id,

                            // User being disabled
                            assigned_to: user.id

                        });

                    }

                    return res.json({

                        success: true,

                        message: "User Disabled Successfully"

                    });

                }

            );

        }

    );

};
// ==========================
// DELETE USER
// ==========================

const deleteUser = (req, res) => {

    User.getUserById(

        req.params.id,

        (userErr, users) => {

            if (userErr) {

                console.log(userErr);

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

                    // ======================================
                    // Send Account Deleted Email
                    // ======================================

                    sendAccountDeletedEmail(user)

                        .catch((mailErr) => {

                            console.log(mailErr);

                        });

                    // ======================================
                    // Log Activity
                    // ======================================

                    logActivity({

                        activity_type: "User",

                        reference_id: user.id,

                        title: "User Deleted",

                        description: `${user.name || user.fullName} was deleted`,

                        module_name: "Users",

                        status: "Closed",

                        priority: "High",

                        // Logged-in Administrator
                        created_by: req.user.id,

                        // Deleted User
                        assigned_to: user.id

                    });

                    return res.json({

                        success: true,

                        message: "User Deleted Successfully"

                    });

                }

            );

        }

    );

};
// ==========================
// DELETE ALL USERS
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

            // ======================================
            // Log Activity
            // ======================================

            logActivity({

                activity_type: "User",

                reference_id: 0,

                title: "All Users Deleted",

                description: "All users were deleted",

                module_name: "Users",

                status: "Closed",

                priority: "High",

                // Administrator performing the action
                created_by: req.user.id,

                // No single user assigned
                assigned_to: null

            });

            return res.json({

                success: true,

                message: "All Users Deleted Successfully"

            });

        }

    );

};
// ==========================
// GET USER NAMES
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

            return res.json({

                success: true,

                users: result

            });

        }

    );

};
// ==========================
// VALIDATE ACTIVATION TOKEN
// ==========================

const validateActivationToken = (req, res) => {

    const { token } = req.params;

    User.getActivationToken(

        token,

        (err, result) => {

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

            return res.json({

                success: true,

                message: "Activation link is valid"

            });

        }

    );

};
// ==========================
// ACTIVATE USER ACCOUNT
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

                const hashedPassword = await bcrypt.hash(

                    password,

                    10

                );

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

                        // ======================================
                        // Get User Details
                        // ======================================

                        User.getUserById(

                            activation.user_id,

                            (userErr, users) => {

                                if (!userErr && users.length > 0) {

                                    const user = users[0];

                                    // ======================================
                                    // Send Activation Email
                                    // ======================================

                                    sendAccountActivatedEmail(user)

                                        .catch((mailErr) => {

                                            console.log(mailErr);

                                        });

                                    // ======================================
                                    // Log Activity
                                    // ======================================

                                    logActivity({

                                        activity_type: "User",

                                        reference_id: user.id,

                                        title: "User Activated",

                                        description: `${user.name || user.fullName} activated the account`,

                                        module_name: "Users",

                                        status: "Closed",

                                        priority: "Medium",

                                        // User activates own account
                                        created_by: user.id,

                                        assigned_to: user.id

                                    });

                                }

                                // ======================================
                                // Mark Token Used
                                // ======================================

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

        );

    }

    catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            message: "Server Error"

        });

    }

};
// ==========================
// RESEND INVITATION
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

            const token = crypto
                .randomBytes(32)
                .toString("hex");

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
                        `${process.env.FRONTEND_URL}/activate-account/${token}`;

                    // ======================================
                    // SEND INVITATION EMAIL
                    // ======================================

                    sendInvitationEmail(

                        user,

                        activationLink

                    )

                    .then(() => {

                        // ======================================
                        // LOG ACTIVITY
                        // ======================================

                        logActivity({

                            activity_type: "User",

                            reference_id: user.id,

                            title: "Invitation Resent",

                            description: `Invitation email resent to ${user.name || user.fullName}`,

                            module_name: "Users",

                            status: "Open",

                            priority: "Low",

                            // Administrator performing the action
                            created_by: req.user.id,

                            // User receiving the invitation
                            assigned_to: user.id

                        });

                        return res.json({

                            success: true,

                            message: "Invitation Sent Successfully"

                        });

                    })

                    .catch((mailErr) => {

                        console.log(mailErr);

                        return res.status(500).json({

                            success: false,

                            message: "Unable to Send Email"

                        });

                    });

                }

            );

        }

    );

};
// ==========================================================
// EXPORT CONTROLLER FUNCTIONS
// ==========================================================

module.exports = {

    // ======================================
    // User Management
    // ======================================

    getUsers,

    createUser,

    bulkUploadUsers,

    updateUser,

    disableUser,

    deleteUser,

    deleteAllUsers,

    // ======================================
    // User Lookup
    // ======================================

    getUserNames,

    // ======================================
    // Account Activation
    // ======================================

    validateActivationToken,

    activateUserAccount,

    resendInvitation

};
const fs = require("fs");
const XLSX = require("xlsx");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const User = require("../models/userModel");

const {
    sendInvitationEmail,
    sendAccountUpdatedEmail,
    sendAccountActivatedEmail,
    sendAccountDisabledEmail,
    sendAccountEnabledEmail,
    sendAccountDeletedEmail
} = require("../services/emailService");
const { addToQueue } = require("../utils/emailTemplates/emailQueue");
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
    `${process.env.FRONTEND_URL}/activate-account/${token}`;
    console.log("User Object:", user);
console.log("user.name:", user.name);
console.log("user.fullName:", user.fullName);
// -------------------------
// Send Invitation Email
// -------------------------

sendInvitationEmail(user, activationLink)

    .then(() => {

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

}

// ==========================================================
// Bulk Upload Users
// ==========================================================

const bulkUploadUsers = async (req, res) => {

    console.time("Total Upload");

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

        let imported = 0;
        let skipped = 0;
        let emailsSent = 0;
        const errors = [];

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

                const emailExists = await new Promise((resolve, reject) => {

                    User.checkEmailExists(user.email, (err, result) => {

                        if (err) return reject(err);

                        resolve(result);

                    });

                });

                if (emailExists.length > 0) {

                    skipped++;
                    errors.push(`${user.email} - Email already exists`);
                    continue;

                }

                const empExists = await new Promise((resolve, reject) => {

                    User.checkEmployeeIdExists(user.employeeId, (err, result) => {

                        if (err) return reject(err);

                        resolve(result);

                    });

                });

                if (empExists.length > 0) {

                    skipped++;
                    errors.push(`${user.employeeId} - Employee ID already exists`);
                    continue;

                }
                const department = await new Promise((resolve, reject) => {

    User.getDepartmentIdByName(

        row["Department"],

        (err, result) => {

            if (err) return reject(err);

            resolve(result);

        }

    );

});

const designation = await new Promise((resolve, reject) => {

    User.getDesignationIdByName(

        row["Designation"],

        (err, result) => {

            if (err) return reject(err);

            resolve(result);

        }

    );

});

if (!department.length) {

    skipped++;
    errors.push(`Department not found: ${row["Department"]}`);
    continue;

}

if (!designation.length) {

    skipped++;
    errors.push(`Designation not found: ${row["Designation"]}`);
    continue;

}

user.department_id = department[0].id;
user.designation_id = designation[0].id;
                const addResult = await new Promise((resolve, reject) => {

    User.addUser(user, (err, result) => {

        if (err) return reject(err);

        resolve(result);

    });

});

const userId = addResult.insertId;

const token = crypto.randomBytes(32).toString("hex");

const expiresAt = new Date(

    Date.now() + 24 * 60 * 60 * 1000

);

await new Promise((resolve, reject) => {

    User.saveActivationToken(

        userId,

        token,

        expiresAt,

        (err) => {

            if (err) return reject(err);

            resolve();

        }

    );

});

const activationLink =
`${process.env.FRONTEND_URL}/activate-account/${token}`;

addToQueue(async () => {

    await sendInvitationEmail(user, activationLink);

    console.log(`Invitation email sent to ${user.email}`);

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

        if (req.file && fs.existsSync(req.file.path)) {

            fs.unlinkSync(req.file.path);

        }

        return res.status(500).json({

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
            // Send Account Updated Email
            // ======================================

            const user = req.body;

            sendAccountUpdatedEmail(user)
                .catch((mailErr) => {

                    console.log(mailErr);

                });

            return res.json({

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

            // ======================================
            // Get User Details
            // ======================================

            User.getUserById(

                req.params.id,

                (userErr, users) => {

                    if (!userErr && users.length > 0) {

                        sendAccountDisabledEmail(users[0])
                            .catch(console.error);

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
// Delete User
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

                       // ======================================
// Send Account Activated Email
// ======================================

User.getUserById(

    activation.user_id,

    (userErr, users) => {

        if (!userErr && users.length > 0) {

            sendAccountActivatedEmail(users[0])
                .catch(console.error);

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
    `${process.env.FRONTEND_URL}/activate-account/${token}`;
    
// -------------------------
// Send Invitation Email
// -------------------------

sendInvitationEmail(user, activationLink)

    .then(() => {

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
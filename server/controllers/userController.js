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

const { getAppUrl } = require("../config/appUrl");


// ==========================================================
// RBAC CONFIGURATION
// ==========================================================
//
// IMPORTANT:
//
// The module name MUST be exactly:
//
//     Quiz
//
// because the Quiz routes use:
//
//     permissionMiddleware("Quiz", level)
//
// Permission levels:
//
//     None
//     View
//     Add
//     Edit
//     Full
//
// ==========================================================

const RBAC_MODULES = [
    "Dashboard",
    "Action Points",
    "Quiz",
    "Checklist Reports",
    "Checklist Submit",
    "Checklist Types",
    "Questions",
    "Departments",
    "Designations",
    "Store Management",
    "Users",
    "Reports To",
    "NSO Rules",
    "New Store Openings",
    "Announcements",
    "Gallery",
    "Expenses",
    "Profile",
    "Settings"
];

const RBAC_LEVELS = new Set([
    "None",
    "View",
    "Add",
    "Edit",
    "Full"
]);


// ==========================================================
// NORMALIZE RBAC PERMISSIONS
// ==========================================================

const normalizePermissions = (
    permissions,
    administrator = false
) => {

    const input =
        permissions &&
        typeof permissions === "object"
            ? permissions
            : {};

    const normalized = {};

    RBAC_MODULES.forEach((module) => {

        const requested =
            input[module];

        if (administrator) {

            normalized[module] = "Full";

        } else if (
            RBAC_LEVELS.has(requested)
        ) {

            normalized[module] =
                requested;

        } else {

            normalized[module] =
                "None";
        }
    });

    return normalized;
};


// ==========================================================
// CHECK ADMINISTRATOR
// ==========================================================

const isAdministrator = (
    body = {}
) => {

    return (
        body.administrator === true ||
        body.administrator === 1 ||
        body.administrator === "1" ||
        body.is_admin === true ||
        body.is_admin === 1 ||
        body.is_admin === "1"
    );
};


// ==========================================================
// PREPARE USER PAYLOAD
// ==========================================================
//
// This function guarantees:
//
// permissions.Quiz
//
// always exists.
//
// Example:
//
// permissions: {
//     Quiz: "View"
// }
//
// ==========================================================

const prepareUserPayload = (
    body = {}
) => {

    const administrator =
        isAdministrator(body);

    return {

        ...body,

        designation_id:
            body.designation_id ||
            null,

        department_id:
            body.department_id ||
            null,

        reports_to:
            body.reports_to ||
            null,

        permissions:
            normalizePermissions(
                body.permissions,
                administrator
            ),

        administrator
    };
};


// ==========================================================
// GET ALL USERS
// ==========================================================

const getUsers = (
    req,
    res
) => {

    User.getAllUsers(

        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Database Error"

                });
            }

            return res.json({

                success: true,

                users:
                    result

            });
        }
    );
};


// ==========================================================
// CREATE USER + SEND INVITATION
// ==========================================================

const createUser = (
    req,
    res
) => {

    // ------------------------------------------------------
    // Normalize user payload
    // ------------------------------------------------------

    const user =
        prepareUserPayload(
            req.body
        );


    // ------------------------------------------------------
    // Check Duplicate Email
    // ------------------------------------------------------

    User.checkEmailExists(

        user.email,

        (emailErr, emailResult) => {

            if (emailErr) {

                console.log(emailErr);

                return res.status(500).json({

                    success: false,

                    message:
                        "Database Error"

                });
            }


            if (
                emailResult &&
                emailResult.length > 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email already exists"

                });
            }


            // --------------------------------------------------
            // Check Employee ID
            // --------------------------------------------------

            User.checkEmployeeIdExists(

                user.employeeId,

                (empErr, empResult) => {

                    if (empErr) {

                        console.log(empErr);

                        return res.status(500).json({

                            success: false,

                            message:
                                "Database Error"

                        });
                    }


                    if (
                        empResult &&
                        empResult.length > 0
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Employee ID already exists"

                        });
                    }


                    // --------------------------------------------------
                    // Save User
                    // --------------------------------------------------

                    User.addUser(

                        user,

                        (addErr, addResult) => {

                            if (addErr) {

                                console.log(addErr);

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Unable to add user"

                                });
                            }


                            const userId =
                                addResult.insertId;


                            const token =
                                crypto
                                    .randomBytes(32)
                                    .toString("hex");


                            const expiresAt =
                                new Date(
                                    Date.now() +
                                    24 *
                                    60 *
                                    60 *
                                    1000
                                );


                            // --------------------------------------------------
                            // Save Activation Token
                            // --------------------------------------------------

                            User.saveActivationToken(

                                userId,

                                token,

                                expiresAt,

                                (tokenErr) => {

                                    if (tokenErr) {

                                        console.log(
                                            tokenErr
                                        );

                                        return res.status(500).json({

                                            success: false,

                                            message:
                                                "Unable to create activation token"

                                        });
                                    }


                                    const activationLink =
                                        `${getAppUrl()}/activate-account/${token}`;


                                    // --------------------------------------------------
                                    // Send Invitation Email
                                    // --------------------------------------------------

                                    sendInvitationEmail(

                                        user,

                                        activationLink

                                    )

                                    .then(() => {

                                        // ----------------------------------------------
                                        // Activity Log
                                        // ----------------------------------------------

                                        logActivity({

                                            activity_type:
                                                "User",

                                            reference_id:
                                                userId,

                                            title:
                                                "User Created",

                                            description:
                                                `${user.fullName || user.name} was added`,

                                            module_name:
                                                "Users",

                                            status:
                                                "Open",

                                            priority:
                                                "Medium",

                                            created_by:
                                                req.user.id,

                                            assigned_to:
                                                userId

                                        });


                                        return res.status(201).json({

                                            success: true,

                                            message:
                                                "User created and invitation sent successfully"

                                        });

                                    })

                                    .catch((mailErr) => {

                                        console.error(
                                            "Invitation email failed:",
                                            mailErr?.message ||
                                            mailErr
                                        );


                                        try {

                                            logActivity({

                                                activity_type:
                                                    "User",

                                                reference_id:
                                                    userId,

                                                title:
                                                    "User Created - Invitation Email Failed",

                                                description:
                                                    `${user.fullName || user.name} was added but invitation email failed`,

                                                module_name:
                                                    "Users",

                                                status:
                                                    "Open",

                                                priority:
                                                    "High",

                                                created_by:
                                                    req.user.id,

                                                assigned_to:
                                                    userId

                                            });

                                        } catch (
                                            activityErr
                                        ) {

                                            console.error(
                                                "Activity log failed:",
                                                activityErr
                                            );
                                        }


                                        return res.status(201).json({

                                            success: true,

                                            warning: true,

                                            emailSent: false,

                                            message:
                                                "User created successfully, but invitation email could not be sent."

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

const bulkUploadUsers = async (
    req,
    res
) => {

    console.time(
        "Total Upload"
    );


    try {

        // --------------------------------------------------
        // Check File
        // --------------------------------------------------

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "No file uploaded"

            });
        }


        // --------------------------------------------------
        // Read Excel
        // --------------------------------------------------

        const workbook =
            XLSX.readFile(
                req.file.path
            );


        const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];


        const users =
            XLSX.utils.sheet_to_json(
                sheet,
                {
                    defval: "",
                    blankrows: false
                }
            );


        // --------------------------------------------------
        // Remove Empty Rows
        // --------------------------------------------------

        const filteredUsers =
            users.filter(
                (user) => {

                    return (

                        String(
                            user["Employee ID"] ||
                            ""
                        ).trim() !== ""

                        ||

                        String(
                            user["Name"] ||
                            ""
                        ).trim() !== ""

                        ||

                        String(
                            user["Email"] ||
                            ""
                        ).trim() !== ""
                    );
                }
            );


        if (
            filteredUsers.length === 0
        ) {

            fs.unlinkSync(
                req.file.path
            );

            return res.status(400).json({

                success: false,

                message:
                    "No valid users found."

            });
        }


        // --------------------------------------------------
        // Counters
        // --------------------------------------------------

        let imported = 0;

        let skipped = 0;

        let emailsSent = 0;

        const errors = [];


        // --------------------------------------------------
        // Loop Users
        // --------------------------------------------------

        for (
            const row
            of filteredUsers
        ) {

            const user = {

                employeeId:
                    row["Employee ID"],

                fullName:
                    row["Name"],

                email:
                    row["Email"],

                callContact:
                    row["Call Contact"],

                whatsappContact:
                    row["WhatsApp Contact"],

                department_id:
                    null,

                designation_id:
                    null,

                reportsTo:
                    row["Reports To"],

                active:
                    (
                        row["Status"] ||
                        "Active"
                    ) === "Active",

                stores:
                    [],

                // ----------------------------------------------
                // IMPORTANT:
                // Bulk imported users have no module access
                // by default.
                //
                // Quiz is explicitly included.
                // ----------------------------------------------

                permissions:
                    normalizePermissions(
                        {},
                        false
                    ),

                administrator:
                    false
            };


            try {

                // --------------------------------------------------
                // Check Email
                // --------------------------------------------------

                const emailExists =
                    await new Promise(
                        (
                            resolve,
                            reject
                        ) => {

                            User.checkEmailExists(

                                user.email,

                                (
                                    err,
                                    result
                                ) => {

                                    if (err) {

                                        return reject(
                                            err
                                        );
                                    }

                                    resolve(
                                        result
                                    );
                                }
                            );
                        }
                    );


                if (
                    emailExists &&
                    emailExists.length > 0
                ) {

                    skipped++;

                    errors.push(
                        `${user.email} - Email already exists`
                    );

                    continue;
                }


                // --------------------------------------------------
                // Check Employee ID
                // --------------------------------------------------

                const empExists =
                    await new Promise(
                        (
                            resolve,
                            reject
                        ) => {

                            User.checkEmployeeIdExists(

                                user.employeeId,

                                (
                                    err,
                                    result
                                ) => {

                                    if (err) {

                                        return reject(
                                            err
                                        );
                                    }

                                    resolve(
                                        result
                                    );
                                }
                            );
                        }
                    );


                if (
                    empExists &&
                    empExists.length > 0
                ) {

                    skipped++;

                    errors.push(
                        `${user.employeeId} - Employee ID already exists`
                    );

                    continue;
                }


                // --------------------------------------------------
                // Get Department
                // --------------------------------------------------

                const department =
                    await new Promise(
                        (
                            resolve,
                            reject
                        ) => {

                            User.getDepartmentIdByName(

                                row["Department"],

                                (
                                    err,
                                    result
                                ) => {

                                    if (err) {

                                        return reject(
                                            err
                                        );
                                    }

                                    resolve(
                                        result
                                    );
                                }
                            );
                        }
                    );


                // --------------------------------------------------
                // Get Designation
                // --------------------------------------------------

                const designation =
                    await new Promise(
                        (
                            resolve,
                            reject
                        ) => {

                            User.getDesignationIdByName(

                                row["Designation"],

                                (
                                    err,
                                    result
                                ) => {

                                    if (err) {

                                        return reject(
                                            err
                                        );
                                    }

                                    resolve(
                                        result
                                    );
                                }
                            );
                        }
                    );


                // --------------------------------------------------
                // Validate Department
                // --------------------------------------------------

                if (
                    !department ||
                    !department.length
                ) {

                    skipped++;

                    errors.push(
                        `Department not found: ${row["Department"]}`
                    );

                    continue;
                }


                // --------------------------------------------------
                // Validate Designation
                // --------------------------------------------------

                if (
                    !designation ||
                    !designation.length
                ) {

                    skipped++;

                    errors.push(
                        `Designation not found: ${row["Designation"]}`
                    );

                    continue;
                }


                user.department_id =
                    department[0].id;


                user.designation_id =
                    designation[0].id;


                // --------------------------------------------------
                // Add User
                // --------------------------------------------------

                const addResult =
                    await new Promise(
                        (
                            resolve,
                            reject
                        ) => {

                            User.addUser(

                                user,

                                (
                                    err,
                                    result
                                ) => {

                                    if (err) {

                                        return reject(
                                            err
                                        );
                                    }

                                    resolve(
                                        result
                                    );
                                }
                            );
                        }
                    );


                console.log(
                    "Inserted User:",
                    addResult
                );


                const userId =
                    addResult.insertId;


                console.log(
                    "New User ID:",
                    userId
                );


                // --------------------------------------------------
                // Create Activation Token
                // --------------------------------------------------

                const token =
                    crypto
                        .randomBytes(32)
                        .toString("hex");


                const expiresAt =
                    new Date(
                        Date.now() +
                        24 *
                        60 *
                        60 *
                        1000
                    );


                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {

                        User.saveActivationToken(

                            userId,

                            token,

                            expiresAt,

                            (err) => {

                                if (err) {

                                    return reject(
                                        err
                                    );
                                }

                                resolve();
                            }
                        );
                    }
                );


                // --------------------------------------------------
                // Activation Link
                // --------------------------------------------------

                const activationLink =
                    `${getAppUrl()}/activate-account/${token}`;


                // --------------------------------------------------
                // Send Email
                // --------------------------------------------------

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


                // --------------------------------------------------
                // Activity Log
                // --------------------------------------------------

                logActivity({

                    activity_type:
                        "User",

                    reference_id:
                        userId,

                    title:
                        "User Created",

                    description:
                        `${user.fullName} was added`,

                    module_name:
                        "Users",

                    status:
                        "Open",

                    priority:
                        "Medium",

                    created_by:
                        req.user.id,

                    assigned_to:
                        userId

                });


                imported++;

                emailsSent++;

            } catch (err) {

                console.log(err);

                skipped++;

                errors.push(
                    `${user.email || user.employeeId} - ${err.message}`
                );
            }
        }


        // --------------------------------------------------
        // Delete Temporary File
        // --------------------------------------------------

        if (
            fs.existsSync(
                req.file.path
            )
        ) {

            fs.unlinkSync(
                req.file.path
            );
        }


        console.timeEnd(
            "Total Upload"
        );


        return res.json({

            success: true,

            message:
                "Bulk Upload Completed",

            imported,

            skipped,

            emailsSent,

            errors

        });

    } catch (err) {

        console.log(err);


        if (
            req.file &&
            fs.existsSync(
                req.file.path
            )
        ) {

            fs.unlinkSync(
                req.file.path
            );
        }


        return res.status(500).json({

            success: false,

            message:
                "Upload Error"

        });
    }
};


// ==========================================================
// UPDATE USER
// ==========================================================

const updateUser = (
    req,
    res
) => {

    // ------------------------------------------------------
    // Normalize permissions before updating.
    // ------------------------------------------------------

    const user =
        prepareUserPayload(
            req.body
        );


    User.updateUser(

        req.params.id,

        user,

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Update Failed"

                });
            }


            // --------------------------------------------------
            // Send Account Updated Email
            // --------------------------------------------------

            sendAccountUpdatedEmail(
                user
            )

            .catch(
                (mailErr) => {

                    console.log(
                        mailErr
                    );
                }
            );


            // --------------------------------------------------
            // Log Activity
            // --------------------------------------------------

            logActivity({

                activity_type:
                    "User",

                reference_id:
                    req.params.id,

                title:
                    "User Updated",

                description:
                    `${user.fullName || user.name} was updated`,

                module_name:
                    "Users",

                status:
                    "Open",

                priority:
                    "Medium",

                created_by:
                    req.user.id,

                assigned_to:
                    req.params.id

            });


            return res.json({

                success: true,

                message:
                    "User Updated Successfully"

            });
        }
    );
};


// ==========================================================
// DISABLE USER
// ==========================================================

const disableUser = (
    req,
    res
) => {

    User.disableUser(

        req.params.id,

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to Disable User"

                });
            }


            // --------------------------------------------------
            // Get User Details
            // --------------------------------------------------

            User.getUserById(

                req.params.id,

                (
                    userErr,
                    users
                ) => {

                    if (userErr) {

                        console.log(
                            userErr
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Database Error"

                        });
                    }


                    if (
                        users &&
                        users.length > 0
                    ) {

                        const user =
                            users[0];


                        // --------------------------------------------------
                        // Send Account Disabled Email
                        // --------------------------------------------------

                        sendAccountDisabledEmail(
                            user
                        )

                        .catch(
                            (mailErr) => {

                                console.log(
                                    mailErr
                                );
                            }
                        );


                        // --------------------------------------------------
                        // Activity Log
                        // --------------------------------------------------

                        logActivity({

                            activity_type:
                                "User",

                            reference_id:
                                user.id,

                            title:
                                "User Disabled",

                            description:
                                `${user.name || user.fullName} was disabled`,

                            module_name:
                                "Users",

                            status:
                                "Closed",

                            priority:
                                "High",

                            created_by:
                                req.user.id,

                            assigned_to:
                                user.id

                        });
                    }


                    return res.json({

                        success: true,

                        message:
                            "User Disabled Successfully"

                    });
                }
            );
        }
    );
};


// ==========================================================
// ENABLE USER
// ==========================================================

const enableUser = (
    req,
    res
) => {

    User.enableUser(

        req.params.id,

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to Enable User"

                });
            }


            User.getUserById(

                req.params.id,

                (
                    userErr,
                    users
                ) => {

                    if (
                        userErr
                    ) {

                        console.log(
                            userErr
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Database Error"

                        });
                    }


                    if (
                        users &&
                        users.length > 0
                    ) {

                        const user =
                            users[0];


                        sendAccountEnabledEmail(
                            user
                        )

                        .catch(
                            (mailErr) => {

                                console.log(
                                    mailErr
                                );
                            }
                        );


                        logActivity({

                            activity_type:
                                "User",

                            reference_id:
                                user.id,

                            title:
                                "User Enabled",

                            description:
                                `${user.name || user.fullName} was enabled`,

                            module_name:
                                "Users",

                            status:
                                "Open",

                            priority:
                                "Medium",

                            created_by:
                                req.user.id,

                            assigned_to:
                                user.id

                        });
                    }


                    return res.json({

                        success: true,

                        message:
                            "User Enabled Successfully"

                    });
                }
            );
        }
    );
};


// ==========================================================
// DELETE USER
// ==========================================================

const deleteUser = (
    req,
    res
) => {

    User.getUserById(

        req.params.id,

        (
            userErr,
            users
        ) => {

            if (userErr) {

                console.log(
                    userErr
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Database Error"

                });
            }


            if (
                !users ||
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User Not Found"

                });
            }


            const user =
                users[0];


            User.deleteUser(

                req.params.id,

                (err) => {

                    if (err) {

                        console.log(err);

                        return res.status(500).json({

                            success: false,

                            message:
                                "Unable to Delete User"

                        });
                    }


                    // --------------------------------------------------
                    // Send Account Deleted Email
                    // --------------------------------------------------

                    sendAccountDeletedEmail(
                        user
                    )

                    .catch(
                        (mailErr) => {

                            console.log(
                                mailErr
                            );
                        }
                    );


                    // --------------------------------------------------
                    // Activity Log
                    // --------------------------------------------------

                    logActivity({

                        activity_type:
                            "User",

                        reference_id:
                            user.id,

                        title:
                            "User Deleted",

                        description:
                            `${user.name || user.fullName} was deleted`,

                        module_name:
                            "Users",

                        status:
                            "Closed",

                        priority:
                            "High",

                        created_by:
                            req.user.id,

                        assigned_to:
                            user.id

                    });


                    return res.json({

                        success: true,

                        message:
                            "User Deleted Successfully"

                    });
                }
            );
        }
    );
};


// ==========================================================
// DELETE ALL USERS
// ==========================================================

const deleteAllUsers = (
    req,
    res
) => {

    User.deleteAllUsers(

        (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to Delete Users"

                });
            }


            // --------------------------------------------------
            // Activity Log
            // --------------------------------------------------

            logActivity({

                activity_type:
                    "User",

                reference_id:
                    0,

                title:
                    "All Users Deleted",

                description:
                    "All users were deleted",

                module_name:
                    "Users",

                status:
                    "Closed",

                priority:
                    "High",

                created_by:
                    req.user.id,

                assigned_to:
                    null

            });


            return res.json({

                success: true,

                message:
                    "All Users Deleted Successfully"

            });
        }
    );
};


// ==========================================================
// GET USER NAMES
// ==========================================================

const getUserNames = (
    req,
    res
) => {

    User.getUserNames(

        (err, result) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Database Error"

                });
            }


            return res.json({

                success: true,

                users:
                    result

            });
        }
    );
};


// ==========================================================
// VALIDATE ACTIVATION TOKEN
// ==========================================================

const validateActivationToken = (
    req,
    res
) => {

    const {
        token
    } = req.params;


    User.getActivationToken(

        token,

        (
            err,
            result
        ) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Database Error"

                });
            }


            if (
                !result ||
                result.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid or Expired Activation Link"

                });
            }


            return res.json({

                success: true,

                message:
                    "Activation link is valid"

            });
        }
    );
};


// ==========================================================
// ACTIVATE USER ACCOUNT
// ==========================================================

const activateUserAccount = async (
    req,
    res
) => {

    try {

        const {
            token,
            password
        } = req.body;


        User.getActivationToken(

            token,

            async (
                err,
                result
            ) => {

                if (err) {

                    console.log(err);

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database Error"

                    });
                }


                if (
                    !result ||
                    result.length === 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid or Expired Activation Link"

                    });
                }


                const activation =
                    result[0];


                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );


                User.activateUser(

                    activation.user_id,

                    hashedPassword,

                    (activateErr) => {

                        if (activateErr) {

                            console.log(
                                activateErr
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Unable to Activate Account"

                            });
                        }


                        // --------------------------------------------------
                        // Get User Details
                        // --------------------------------------------------

                        User.getUserById(

                            activation.user_id,

                            (
                                userErr,
                                users
                            ) => {

                                if (
                                    !userErr &&
                                    users &&
                                    users.length > 0
                                ) {

                                    const user =
                                        users[0];


                                    // ------------------------------------------
                                    // Send Activation Email
                                    // ------------------------------------------

                                    sendAccountActivatedEmail(
                                        user
                                    )

                                    .catch(
                                        (mailErr) => {

                                            console.log(
                                                mailErr
                                            );
                                        }
                                    );


                                    // ------------------------------------------
                                    // Activity Log
                                    // ------------------------------------------

                                    logActivity({

                                        activity_type:
                                            "User",

                                        reference_id:
                                            user.id,

                                        title:
                                            "User Activated",

                                        description:
                                            `${user.name || user.fullName} activated the account`,

                                        module_name:
                                            "Users",

                                        status:
                                            "Closed",

                                        priority:
                                            "Medium",

                                        created_by:
                                            user.id,

                                        assigned_to:
                                            user.id

                                    });
                                }


                                // --------------------------------------------------
                                // Mark Token Used
                                // --------------------------------------------------

                                User.markTokenUsed(

                                    token,

                                    (
                                        tokenErr
                                    ) => {

                                        if (
                                            tokenErr
                                        ) {

                                            console.log(
                                                tokenErr
                                            );
                                        }


                                        return res.json({

                                            success:
                                                true,

                                            message:
                                                "Account Activated Successfully"

                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            message:
                "Server Error"

        });
    }
};


// ==========================================================
// RESEND INVITATION
// ==========================================================

const resendInvitation = (
    req,
    res
) => {

    const userId =
        req.params.id;


    User.getUserById(

        userId,

        (
            err,
            users
        ) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Database Error"

                });
            }


            if (
                !users ||
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User Not Found"

                });
            }


            const user =
                users[0];


            if (
                user.is_activated
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User Already Activated"

                });
            }


            const token =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            const expiresAt =
                new Date(
                    Date.now() +
                    24 *
                    60 *
                    60 *
                    1000
                );


            User.saveActivationToken(

                user.id,

                token,

                expiresAt,

                (tokenErr) => {

                    if (tokenErr) {

                        console.log(
                            tokenErr
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Unable to Generate Token"

                        });
                    }


                    const activationLink =
                        `${getAppUrl()}/activate-account/${token}`;


                    // --------------------------------------------------
                    // Send Invitation Email
                    // --------------------------------------------------

                    sendInvitationEmail(

                        user,

                        activationLink

                    )

                    .then(() => {

                        // ----------------------------------------------
                        // Activity Log
                        // ----------------------------------------------

                        logActivity({

                            activity_type:
                                "User",

                            reference_id:
                                user.id,

                            title:
                                "Invitation Resent",

                            description:
                                `Invitation email resent to ${user.name || user.fullName}`,

                            module_name:
                                "Users",

                            status:
                                "Open",

                            priority:
                                "Low",

                            created_by:
                                req.user.id,

                            assigned_to:
                                user.id

                        });


                        return res.json({

                            success:
                                true,

                            message:
                                "Invitation Sent Successfully"

                        });

                    })

                    .catch(
                        (mailErr) => {

                            console.error(
                                "Resend invitation failed:",
                                mailErr?.message ||
                                mailErr
                            );


                            return res.status(500).json({

                                success:
                                    false,

                                emailSent:
                                    false,

                                message:
                                    "Unable to send invitation email"

                            });
                        }
                    );
                }
            );
        }
    );
};


// ==========================================================
// EXPORT CONTROLLER FUNCTIONS
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // User Management
    // ------------------------------------------------------

    getUsers,

    createUser,

    bulkUploadUsers,

    updateUser,

    disableUser,

    enableUser,

    deleteUser,

    deleteAllUsers,


    // ------------------------------------------------------
    // User Lookup
    // ------------------------------------------------------

    getUserNames,


    // ------------------------------------------------------
    // Account Activation
    // ------------------------------------------------------

    validateActivationToken,

    activateUserAccount,

    resendInvitation

};
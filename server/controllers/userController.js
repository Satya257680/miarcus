const { readDeleteScope } = require("../utils/deleteScope");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { validatePassword, BCRYPT_ROUNDS } = require("../config/security");
const { encryptPassword } = require("../config/passwordVault");
const PasswordVault = require("../models/passwordVaultModel");

const User = require("../models/userModel");
const PagePermission = require("../models/pagePermissionModel");
const { logActivity } = require("../utils/activityLogger");

const {
    sendInvitationEmail,
    sendUserCredentialsEmail,
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
const db = require("../config/db");
const {
    runBulkUpload,
    isEmail,
    call: bulkCall,
    sql: bulkSql
} = require("../utils/bulkUploadEngine");

// ==========================================================
// EMAIL DELIVERY HELPER
// Database actions remain successful when an email provider
// fails, but the email failure is explicitly reported.
// ==========================================================

const sendLifecycleEmail = async (sendFunction, user, label) => {
    try {
        await sendFunction(user);
        return { sent: true, error: null };
    } catch (error) {
        console.error(`❌ ${label} email failed:`, error?.message || error);
        return { sent: false, error };
    }
};


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
    "Activity Center",
    "Action Points",
    "Quiz",
    "Checklist Reports",
    "Checklist Submission",
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
    "Asset Master",
    "Employee Location",
    "Attendance",
    "Expenses",
    "Petty Cash",
    "Billing",
    "Daily Collection",
    "Visit Planner",
    "Travel Plan",
    "Travel Plan Approvals",
    "Sales Review",
    "Listing Tracker",
    "Inventory Planning",
    "Collection Tracking",
    "Chat",
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
                module === "Daily Collection" && requested === "Full"
                    ? "Edit"
                    : requested;

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
    body = {},
    actorIsAdministrator = false
) => {

    // A normal Users editor must never be able to self-promote or promote
    // another account to administrator by posting is_admin/administrator.
    const administrator = actorIsAdministrator && isAdministrator(body);

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

const sanitizeUserSecurityFields = (body, actorIsAdministrator) => {
    const clean = { ...body };
    if (!actorIsAdministrator) {
        delete clean.is_admin;
        delete clean.administrator;
    }
    return clean;
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

            // Attach page-level (sub-module) access so the Edit
            // User screen can show which pages are switched on.
            PagePermission.getForAllUsers()
                .then((pageMap) => {
                    (result || []).forEach((row) => {
                        row.page_access = pageMap[row.id] || {};
                    });
                })
                .catch((pageError) => {
                    console.error("Page access lookup failed:", pageError.message);
                })
                .finally(() => {
                    res.json({

                        success: true,

                        users:
                            result

                    });
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

    const actorIsAdministrator = Number(req.user?.is_admin) === 1;
    const user = prepareUserPayload(
        sanitizeUserSecurityFields(req.body, actorIsAdministrator),
        actorIsAdministrator
    );


    // ------------------------------------------------------
    // Validate Admin-Supplied Password
    // ------------------------------------------------------
    //
    // The person creating the account sets the new user's
    // password directly — the new user never creates or
    // chooses their own password. It is emailed to them
    // directly once the account has been created, and the
    // account is active immediately (no separate self-service
    // "activate & choose a password" step).
    // ------------------------------------------------------

    const rawPassword = String(req.body?.password || "");
    const confirmRawPassword = String(req.body?.confirmPassword || "");

    const createPasswordError = validatePassword(rawPassword);

    if (createPasswordError) {

        return res.status(400).json({

            success: false,

            message: createPasswordError

        });
    }

    if (
        confirmRawPassword &&
        rawPassword !== confirmRawPassword
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Password and Confirm Password do not match."

        });
    }


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

                        async (addErr, addResult) => {

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


                            // --------------------------------------------------
                            // Save page-level (sub-module) access
                            // --------------------------------------------------

                            try {
                                await PagePermission.saveForUser(
                                    userId,
                                    req.body?.pageAccess,
                                    user.administrator
                                );
                            } catch (pageError) {
                                console.error("Saving page access failed:", pageError.message);
                            }


                            // --------------------------------------------------
                            // Set Admin-Supplied Password
                            // --------------------------------------------------
                            //
                            // Hashes the password for real authentication,
                            // keeps an encrypted copy for the Password
                            // Management screen, and activates the account
                            // immediately — no self-service activation link.
                            // --------------------------------------------------

                            let hashedPassword;
                            let encryptedPassword;

                            try {

                                hashedPassword =
                                    await bcrypt.hash(
                                        rawPassword,
                                        BCRYPT_ROUNDS
                                    );

                                encryptedPassword =
                                    encryptPassword(rawPassword);

                                await PasswordVault.setUserPassword(
                                    userId,
                                    hashedPassword,
                                    encryptedPassword,
                                    req.user.id
                                );

                            } catch (passwordSetErr) {

                                console.error(
                                    "Unable to set password for new user:",
                                    passwordSetErr
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "User record was created, but the password could not be saved. Please update the password from Password Management."

                                });
                            }


                            // --------------------------------------------------
                            // Send Account Credentials Email
                            // --------------------------------------------------

                            sendUserCredentialsEmail(

                                user,

                                rawPassword

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
                                        "User created and login credentials sent successfully"

                                });

                            })

                            .catch((mailErr) => {

                                console.error(
                                    "Account credentials email failed:",
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
                                            "User Created - Credentials Email Failed",

                                        description:
                                            `${user.fullName || user.name} was added but the credentials email failed`,

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
                                        "User created successfully, but the credentials email could not be sent. Please share the password with the user manually from Password Management."

                                });
                            });
                        }
                    );
                }
            );
        }
    );
};


// ==========================================================
// BULK UPLOAD USERS  (global bulk-upload engine)
// ==========================================================
//
// Every row is validated and saved on its own. A row that fails
// (invalid email, duplicate email / Employee ID, unknown department or
// designation, ...) is reported with its Excel row number, column,
// value and reason — the remaining rows are still imported. Extra
// columns are saved with the user (bulk_extra_data).
// ==========================================================

const bulkUploadUsers = async (req, res) => {
    let emailsSent = 0;
    let emailsFailed = 0;
    const emailFailures = [];

    const lower = (v) => String(v ?? "").trim().toLowerCase();

    const body = await runBulkUpload({
        req,
        res,
        respond: false,
        module: "users",

        prepare: async (ctx) => {
            const [departments, designations, users] = await Promise.all([
                bulkSql("SELECT id, department_name FROM departments"),
                bulkSql("SELECT id, designation_name, department_id FROM designations"),
                bulkSql("SELECT email, employee_id FROM users")
            ]);

            ctx.data.departments = new Map(departments.map((d) => [lower(d.department_name), d]));
            ctx.data.designations = designations;
            ctx.data.emails = new Set(users.map((u) => lower(u.email)).filter(Boolean));
            ctx.data.codes = new Set(users.map((u) => lower(u.employee_id)).filter(Boolean));
        },

        validateRow: (row, ctx) => {
            const d = ctx.data;
            const email = ctx.text("Email");
            const code = ctx.text("Employee ID");

            if (email && !isEmail(email)) {
                ctx.fail("Email", email, "Invalid email address.");
            } else if (email && d.emails.has(lower(email))) {
                ctx.duplicate("Email", email, `Email ${email} already exists in the database.`);
            }

            if (code && d.codes.has(lower(code))) {
                ctx.duplicate("Employee ID", code, `Employee ID ${code} already exists in the database.`);
            }

            const departmentName = ctx.text("Department");
            const department = departmentName ? d.departments.get(lower(departmentName)) : null;
            if (departmentName && !department) {
                ctx.fail("Department", departmentName, "Department does not exist. Create it in Departments first.");
            }

            const designationName = ctx.text("Designation");
            let designation = null;
            if (designationName) {
                const matches = d.designations.filter((x) => lower(x.designation_name) === lower(designationName));
                designation =
                    (department && matches.find((x) => Number(x.department_id) === Number(department.id))) ||
                    matches[0] ||
                    null;
                if (!designation) {
                    ctx.fail("Designation", designationName, "Designation does not exist. Create it in Designations first.");
                }
            }

            const status = ctx.text("Status");
            if (status && !["active", "inactive"].includes(lower(status))) {
                ctx.fail("Status", status, "Status must be Active or Inactive.");
            }

            ctx.resolved = { department, designation, email, code };
        },

        duplicateKey: (row, ctx) => ({
            key: lower(ctx.resolved?.email) || lower(ctx.resolved?.code),
            column: "Email",
            value: ctx.resolved?.email || ctx.resolved?.code
        }),

        processRow: async (row, ctx) => {
            const r = ctx.resolved;

            const user = {
                employeeId: r.code,
                fullName: ctx.text("Name"),
                email: r.email,
                callContact: ctx.text("Call Contact"),
                whatsappContact: ctx.text("WhatsApp Contact"),
                department_id: r.department.id,
                designation_id: r.designation.id,
                reportsTo: ctx.text("Reports To"),
                active: lower(ctx.text("Status") || "Active") !== "inactive",
                stores: [],
                // Bulk imported users have no module access by default
                // (Quiz is explicitly included by normalizePermissions).
                permissions: normalizePermissions({}, false),
                administrator: false
            };

            const addResult = await bulkCall(User.addUser, user);
            const userId = addResult.insertId;

            const token = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await bulkCall(User.saveActivationToken, userId, token, expiresAt);

            const activationLink = `${getAppUrl()}/activate-account/${token}`;

            try {
                await addToQueue(() => sendInvitationEmail(user, activationLink));
                emailsSent += 1;
            } catch (emailErr) {
                emailsFailed += 1;
                emailFailures.push(`${user.email} - ${emailErr?.message || "Invitation email failed to send"}`);
                ctx.note("Email", user.email, `User created, but the invitation email could not be sent (${emailErr?.message || "mail error"}).`);
            }

            logActivity({
                activity_type: "User",
                reference_id: userId,
                title: "User Created",
                description: `${user.fullName} was added`,
                module_name: "Users",
                status: "Open",
                priority: "Medium",
                created_by: req.user.id,
                assigned_to: userId
            });

            return { id: userId };
        }
    });

    if (body.completed) {
        if (emailsSent) body.message += ` ${emailsSent} invitation email${emailsSent === 1 ? "" : "s"} sent.`;
        if (emailsFailed) body.message += ` ${emailsFailed} invitation email${emailsFailed === 1 ? "" : "s"} failed.`;
    }

    return res.status(body.completed ? 200 : 400).json({
        ...body,
        emailsSent,
        emailsFailed,
        emailFailures
    });
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

    const actorIsAdministrator = Number(req.user?.is_admin) === 1;
    const user = prepareUserPayload(
        sanitizeUserSecurityFields(req.body, actorIsAdministrator),
        actorIsAdministrator
    );


    User.updateUser(

        req.params.id,

        user,

        async (err) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    success: false,

                    message:
                        "Update Failed"

                });
            }


            // --------------------------------------------------
            // Save page-level (sub-module) access
            // --------------------------------------------------

            try {
                await PagePermission.saveForUser(
                    req.params.id,
                    req.body?.pageAccess,
                    user.administrator
                );
            } catch (pageError) {
                console.error("Saving page access failed:", pageError.message);
            }


            // --------------------------------------------------
            // Send Account Updated Email
            // --------------------------------------------------

            const emailResult = await sendLifecycleEmail(
                sendAccountUpdatedEmail,
                user,
                "Account updated"
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

                warning: !emailResult.sent,

                emailSent: emailResult.sent,

                message: emailResult.sent
                    ? "User Updated Successfully"
                    : "User Updated Successfully, but the email could not be sent."

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

    // --------------------------------------------------
    // Get User Details FIRST — Administrator and Super Admin
    // accounts can never be disabled from here, so that has to be
    // checked before anything is changed in the database.
    // --------------------------------------------------

    User.getUserById(

        req.params.id,

        async (
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


            const isProtected =
                Number(user.is_admin) === 1 ||
                Number(user.is_super_admin) === 1;

            if (isProtected) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Administrator and Super Admin accounts cannot be disabled."

                });
            }


            User.disableUser(

                req.params.id,

                async (err) => {

                    if (err) {

                        console.log(err);

                        return res.status(500).json({

                            success: false,

                            message:
                                "Unable to Disable User"

                        });
                    }


                    // --------------------------------------------------
                    // Send Account Disabled Email
                    // --------------------------------------------------

                    const emailResult = await sendLifecycleEmail(
                        sendAccountDisabledEmail,
                        user,
                        "Account disabled"
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


                    return res.json({

                        success: true,

                        warning: !emailResult.sent,

                        emailSent: emailResult.sent,

                        message: emailResult.sent
                            ? "User Disabled Successfully"
                            : "User Disabled Successfully, but the email could not be sent."

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

                async (
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


                        const emailResult = await sendLifecycleEmail(
                            sendAccountEnabledEmail,
                            user,
                            "Account enabled"
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

                        warning: !emailResult.sent,

                        emailSent: emailResult.sent,

                        message: emailResult.sent
                            ? "User Enabled Successfully"
                            : "User Enabled Successfully, but the email could not be sent."

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


            // --------------------------------------------------
            // Administrator and Super Admin accounts can never be
            // deleted from here — the same protection "Delete All"
            // already applies (it only ever removes is_admin = 0
            // rows), extended to the single-user delete action so
            // it can't be used to route around that rule.
            // --------------------------------------------------

            const isProtected =
                Number(user.is_admin) === 1 ||
                Number(user.is_super_admin) === 1;

            if (isProtected) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Administrator and Super Admin accounts cannot be deleted."

                });
            }


            User.deleteUser(

                req.params.id,

                async (err) => {

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

                    const emailResult = await sendLifecycleEmail(
                        sendAccountDeletedEmail,
                        user,
                        "Account deleted"
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

                        warning: !emailResult.sent,

                        emailSent: emailResult.sent,

                        message: emailResult.sent
                            ? "User Deleted Successfully"
                            : "User Deleted Successfully, but the email could not be sent."

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

    // Search / department / reports-to filter applied on the page -> the
    // client sends the ids of the listed users and only those are deleted.
    const scope = readDeleteScope(req);
    const ids = scope.filtered ? (scope.ids || []) : null;

    User.deleteAllUsers(

        ids,

        (err, result) => {

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
                    ids ? "Filtered Users Deleted" : "All Users Deleted",

                description:
                    ids
                        ? `${Number(result?.affectedRows || 0)} filtered user(s) were deleted`
                        : "All users were deleted",

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
                    ids
                        ? `${Number(result?.affectedRows || 0)} filtered user(s) deleted successfully`
                        : "All Users Deleted Successfully"

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


                const passwordError = validatePassword(password);

                if (passwordError) {
                    return res.status(400).json({
                        success: false,
                        message: passwordError
                    });
                }

                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        BCRYPT_ROUNDS
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

                            async (
                                userErr,
                                users
                            ) => {

                                let emailResult = {
                                    sent: true,
                                    error: null
                                };

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

                                    emailResult = await sendLifecycleEmail(
                                        sendAccountActivatedEmail,
                                        user,
                                        "Account activated"
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

                                            warning: !emailResult.sent,

                                            emailSent: emailResult.sent,

                                            message: emailResult.sent
                                                ? "Account Activated Successfully"
                                                : "Account Activated Successfully, but the email could not be sent."

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
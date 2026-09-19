const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { validatePassword, BCRYPT_ROUNDS } = require("../config/security");
const { encryptPassword } = require("../config/passwordVault");
const PasswordVault = require("../models/passwordVaultModel");

const User = require("../models/userModel");
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
const { parseBulkFile } = require("../utils/bulkFileParser");

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
        // Read File
        // --------------------------------------------------
        //
        // Accepts CSV, Excel, PDF, or a photo — see
        // utils/bulkFileParser.js. Whatever format it was,
        // this always comes back as plain row objects keyed
        // by the same column names ("Employee ID", "Name",
        // "Email", ...), so nothing below this point needs to
        // know or care which format the admin actually
        // uploaded.
        // --------------------------------------------------

        let users, sourceType, parseWarnings;

        try {

            const parsed =
                await parseBulkFile(
                    req.file.path,
                    req.file.originalname,
                    req.file.mimetype
                );

            users = parsed.rows;
            sourceType = parsed.sourceType;
            parseWarnings = parsed.warnings;

        } catch (parseErr) {

            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(parseErr.status || 400).json({

                success: false,

                message:
                    parseErr.message ||
                    "Could not read this file."

            });
        }


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

        let emailsFailed = 0;

        const errors = [];

        const emailFailures = [];


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
                // Validate Email Format
                // --------------------------------------------------
                //
                // A malformed address (missing "@", no domain, etc.)
                // used to sail straight through to the department/
                // designation checks below and either get skipped for
                // an unrelated reason or, worse, reach the DB insert
                // and activation-email step with an address that could
                // never receive mail. Catching it here up front gives
                // the admin the real, specific reason immediately.
                // --------------------------------------------------

                const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                const emailValue = String(user.email || "").trim();

                if (!EMAIL_REGEX.test(emailValue)) {

                    skipped++;

                    errors.push(
                        `${emailValue || user.employeeId || "row"} - Invalid or missing email address`
                    );

                    continue;
                }

                user.email = emailValue;


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
                //
                // Previously this fired the invitation email into the
                // queue without awaiting or checking the result, so
                // `emailsSent` was incremented unconditionally right
                // here — it reported "sent" even when the send later
                // failed (bad address, mail provider error, etc.), and
                // any failure only ever reached the server console,
                // never the admin running the bulk upload. Awaiting the
                // queued job (the queue itself still sends one email at
                // a time) lets us report the real outcome per user.
                // --------------------------------------------------

                try {

                    await addToQueue(

                        () => sendInvitationEmail(

                            user,

                            activationLink

                        )
                    );

                    console.log(
                        `Invitation email sent to ${user.email}`
                    );

                    emailsSent++;

                } catch (emailErr) {

                    console.error(
                        `Invitation email FAILED for ${user.email}:`,
                        emailErr?.message || emailErr
                    );

                    emailsFailed++;

                    emailFailures.push(
                        `${user.email} - ${emailErr?.message || "Invitation email failed to send"}`
                    );
                }


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


        // --------------------------------------------------
        // Build An Honest Summary Message
        // --------------------------------------------------
        //
        // Previously this always replied with `success: true` and the
        // static message "Bulk Upload Completed", even when every row
        // was skipped and zero users were created — the admin saw a
        // cheerful confirmation while nothing actually happened and no
        // emails went out. The message and `success` flag now reflect
        // what really occurred, and the skip reasons (department not
        // found, invalid email, duplicate, etc.) are surfaced directly
        // in the alert instead of only in the server console.
        // --------------------------------------------------

        const summaryParts = [];

        if (imported > 0) {
            summaryParts.push(`${imported} user${imported === 1 ? "" : "s"} imported`);
        }

        if (emailsSent > 0) {
            summaryParts.push(`${emailsSent} invitation email${emailsSent === 1 ? "" : "s"} sent`);
        }

        if (emailsFailed > 0) {
            summaryParts.push(`${emailsFailed} invitation email${emailsFailed === 1 ? "" : "s"} failed to send`);
        }

        if (skipped > 0) {
            summaryParts.push(`${skipped} row${skipped === 1 ? "" : "s"} skipped`);
        }

        const reasonPreview = errors.length
            ? ` Reason${errors.length === 1 ? "" : "s"}: ${errors.slice(0, 5).join("; ")}${errors.length > 5 ? ` (+${errors.length - 5} more — see details)` : ""}`
            : "";

        const message = imported > 0
            ? `${summaryParts.join(", ")}.${reasonPreview}`
            : `No users were imported.${reasonPreview || " Check the file and try again."}`;

        return res.json({

            success: imported > 0,

            message,

            sourceType,

            imported,

            skipped,

            emailsSent,

            emailsFailed,

            errors,

            emailFailures,

            warnings:
                parseWarnings

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
                        users &&
                        users.length > 0
                    ) {

                        const user =
                            users[0];


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
                    }


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
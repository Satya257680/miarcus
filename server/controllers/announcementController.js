const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { Parser } = require("json2csv");
const Announcement = require("../models/announcementModel");
const transporter = require("../config/mailer");

// ======================================================
// EMAIL CONFIGURATION
// ======================================================

const EMAIL_FROM = String(
    process.env.EMAIL_FROM || ""
).trim();

// ======================================================
// HTML ESCAPE
// ======================================================

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

// ======================================================
// SEND ANNOUNCEMENT EMAIL
// ======================================================

const sendAnnouncementEmail = async (recipient) => {

    if (!EMAIL_FROM) {
        throw new Error(
            "EMAIL_FROM environment variable is not configured."
        );
    }

    if (!recipient || !recipient.email) {
        throw new Error(
            "Recipient email address is required."
        );
    }

    const baseUrl =
        process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 5000}`;

    const attachmentUrl = recipient.attachment_path
        ? `${baseUrl}/uploads/${encodeURIComponent(
            path.basename(recipient.attachment_path)
        )}`
        : null;

    try {

        const result = await transporter.sendMail({

            from: EMAIL_FROM,

            to: String(recipient.email).trim(),

            subject: String(
                recipient.title || "MIARCUS Announcement"
            ).trim(),

            html: `
                <div style="
                    font-family:Arial,sans-serif;
                    max-width:680px;
                    margin:auto;
                    color:#222;
                ">

                    <h2 style="
                        margin-bottom:20px;
                    ">
                        ${escapeHtml(
                            recipient.title ||
                            "MIARCUS Announcement"
                        )}
                    </h2>

                    <div style="
                        white-space:pre-wrap;
                        line-height:1.6;
                        font-size:15px;
                    ">
                        ${escapeHtml(
                            recipient.content || ""
                        )}
                    </div>

                    ${
                        attachmentUrl
                            ? `
                                <p style="
                                    margin-top:24px;
                                ">

                                    <a
                                        href="${attachmentUrl}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style="
                                            display:inline-block;
                                            padding:10px 16px;
                                            background:#2f6f7e;
                                            color:#ffffff;
                                            text-decoration:none;
                                            border-radius:6px;
                                            font-weight:600;
                                        "
                                    >
                                        View / Download Attachment
                                    </a>

                                </p>
                            `
                            : ""
                    }

                    <p style="
                        color:#777;
                        font-size:12px;
                        margin-top:28px;
                    ">
                        Sent from MIARCUS
                    </p>

                </div>
            `

        });

        console.log(
            `✅ Announcement email sent to ${recipient.email}`
        );

        if (result?.messageId) {

            console.log(
                "📧 Message ID:",
                result.messageId
            );

        }

        if (result?.id) {

            console.log(
                "📧 Email ID:",
                result.id
            );

        }

        return result;

    } catch (error) {

        console.error(
            `❌ Announcement email failed for ${recipient.email}`
        );

        console.error(
            "Email error:",
            error?.message || error
        );

        if (error?.code) {

            console.error(
                "Email error code:",
                error.code
            );

        }

        if (error?.statusCode) {

            console.error(
                "Email status code:",
                error.statusCode
            );

        }

        if (error?.response) {

            console.error(
                "Email response:",
                error.response
            );

        }

        throw error;

    }

};

// ======================================================
// GET ANNOUNCEMENTS
// ======================================================

const getAnnouncements = (req, res) => {

    Announcement.getAll(
        req.user.id,
        {
            search: req.query.search || "",
            startDate: req.query.startDate || "",
            endDate: req.query.endDate || ""
        },
        (err, rows) => {

            if (err) {

                console.error(
                    "Announcement getAll:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to load announcements"
                });

            }

            return res.json({
                success: true,
                announcements: rows
            });

        }
    );

};

// ======================================================
// GET USERS
// ======================================================

const getUsers = (req, res) => {

    Announcement.getUsers(
        req.query.search || "",
        (err, users) => {

            if (err) {

                console.error(
                    "Announcement getUsers:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to load users"
                });

            }

            return res.json({
                success: true,
                users
            });

        }
    );

};

// ======================================================
// CREATE ANNOUNCEMENT
// ======================================================

const createAnnouncement = (req, res) => {

    const title =
        String(req.body.title || "").trim();

    const content =
        String(req.body.content || "").trim();

    const audience =
        String(
            req.body.audience || "everyone"
        ).toLowerCase();

    const isPinned = [
        "true",
        "1",
        1,
        true
    ].includes(req.body.isPinned);

    let specificIds = [];

    try {

        specificIds = Array.isArray(
            req.body.specificUserIds
        )
            ? req.body.specificUserIds
            : JSON.parse(
                req.body.specificUserIds || "[]"
            );

    } catch (error) {

        return res.status(400).json({
            success: false,
            message:
                "Invalid selected users"
        });

    }

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (!title) {

        return res.status(400).json({
            success: false,
            message:
                "Title is required"
        });

    }

    if (
        ![
            "everyone",
            "managers",
            "users",
            "specific"
        ].includes(audience)
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Invalid audience"
        });

    }

    if (
        audience === "specific" &&
        !specificIds.length
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Select at least one user"
        });

    }

    // --------------------------------------------------
    // Get recipients
    // --------------------------------------------------

    Announcement.getUsersForAudience(
        audience,
        specificIds,
        (userErr, users) => {

            if (userErr) {

                console.error(
                    "Announcement recipients:",
                    userErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to determine recipients"
                });

            }

            if (!users.length) {

                return res.status(400).json({
                    success: false,
                    message:
                        "No active recipients found"
                });

            }

            const insertAnnouncement = () => {

                Announcement.create(
                    {
                        title,
                        content,
                        audience,
                        isPinned,
                        createdBy: req.user.id,
                        attachmentOriginalName:
                            req.file?.originalname,
                        attachmentPath:
                            req.file?.filename
                    },
                    (createErr, result) => {

                        if (createErr) {

                            console.error(
                                "Create announcement:",
                                createErr
                            );

                            if (req.file?.path) {

                                fs.unlink(
                                    req.file.path,
                                    () => {}
                                );

                            }

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to create announcement"
                            });

                        }

                        const announcementId =
                            result.insertId;

                        Announcement.addRecipients(
                            announcementId,
                            users,
                            recipientErr => {

                                if (recipientErr) {

                                    console.error(
                                        "Add recipients:",
                                        recipientErr
                                    );

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Announcement created but recipients could not be created"
                                    });

                                }

                                Announcement.getRecipientsForEmail(
                                    announcementId,
                                    async (
                                        lookupErr,
                                        recipients
                                    ) => {

                                        if (lookupErr) {

                                            console.error(
                                                "Email recipient lookup:",
                                                lookupErr
                                            );

                                            return res.status(201).json({
                                                success: true,
                                                message:
                                                    "Announcement published; email processing could not start",
                                                announcementId,
                                                recipients:
                                                    users.length
                                            });

                                        }

                                        let emailSent = 0;
                                        let emailFailed = 0;

                                        for (
                                            const recipient
                                            of recipients
                                        ) {

                                            try {

                                                await sendAnnouncementEmail(
                                                    recipient
                                                );

                                                await new Promise(
                                                    (
                                                        resolve,
                                                        reject
                                                    ) => {

                                                        Announcement.updateEmailStatus(
                                                            recipient.recipient_id,
                                                            "sent",
                                                            null,
                                                            err =>
                                                                err
                                                                    ? reject(err)
                                                                    : resolve()
                                                        );

                                                    }
                                                );

                                                emailSent++;

                                            } catch (
                                                mailErr
                                            ) {

                                                emailFailed++;

                                                console.error(
                                                    `Announcement email failed for ${recipient.email}:`,
                                                    mailErr
                                                );

                                                Announcement.updateEmailStatus(
                                                    recipient.recipient_id,
                                                    "failed",
                                                    mailErr.message,
                                                    () => {}
                                                );

                                            }

                                        }

                                        return res.status(201).json({

                                            success: true,

                                            message:
                                                "Announcement published successfully",

                                            announcementId,

                                            recipients:
                                                users.length,

                                            emailSent,

                                            emailFailed

                                        });

                                    }
                                );

                            }
                        );

                    }
                );

            };

            // --------------------------------------------------
            // PIN ANNOUNCEMENT
            // --------------------------------------------------

            if (isPinned) {

                Announcement.unpinOthers(
                    err => {

                        if (err) {

                            console.error(
                                "Unpin announcements:",
                                err
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to update pinned announcement"
                            });

                        }

                        insertAnnouncement();

                    }
                );

            } else {

                insertAnnouncement();

            }

        }
    );

};

// ======================================================
// UPDATE ANNOUNCEMENT
// ======================================================

const updateAnnouncement = (req, res) => {

    const id = req.params.id;

    const title =
        String(req.body.title || "").trim();

    const content =
        String(req.body.content || "").trim();

    const audience =
        String(
            req.body.audience || "everyone"
        ).toLowerCase();

    const isPinned = [
        "true",
        "1",
        1,
        true
    ].includes(req.body.isPinned);

    let specificIds = [];

    try {

        specificIds = Array.isArray(
            req.body.specificUserIds
        )
            ? req.body.specificUserIds
            : JSON.parse(
                req.body.specificUserIds || "[]"
            );

    } catch (error) {

        return res.status(400).json({
            success: false,
            message:
                "Invalid selected users"
        });

    }

    if (!title) {

        return res.status(400).json({
            success: false,
            message:
                "Title is required"
        });

    }

    if (
        ![
            "everyone",
            "managers",
            "users",
            "specific"
        ].includes(audience)
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Invalid audience"
        });

    }

    if (
        audience === "specific" &&
        !specificIds.length
    ) {

        return res.status(400).json({
            success: false,
            message:
                "Select at least one user"
        });

    }

    Announcement.getAnnouncementById(
        id,
        (findErr, existing) => {

            if (findErr) {

                console.error(
                    "Find announcement:",
                    findErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to load announcement"
                });

            }

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Announcement not found"
                });

            }

            Announcement.getUsersForAudience(
                audience,
                specificIds,
                (userErr, users) => {

                    if (userErr) {

                        console.error(
                            "Announcement recipients:",
                            userErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Unable to determine recipients"
                        });

                    }

                    if (!users.length) {

                        return res.status(400).json({
                            success: false,
                            message:
                                "No active recipients found"
                        });

                    }

                    const attachmentPath =
                        req.file?.filename ||
                        existing.attachment_path ||
                        null;

                    const attachmentOriginalName =
                        req.file?.originalname ||
                        existing.attachment_original_name ||
                        null;

                    const update = () => {

                        Announcement.update(
                            id,
                            {
                                title,
                                content,
                                audience,
                                isPinned,
                                attachmentOriginalName,
                                attachmentPath
                            },
                            (updateErr) => {

                                if (updateErr) {

                                    console.error(
                                        "Update announcement:",
                                        updateErr
                                    );

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Unable to update announcement"
                                    });

                                }

                                Announcement.replaceRecipients(
                                    id,
                                    users,
                                    recipientErr => {

                                        if (recipientErr) {

                                            console.error(
                                                "Replace recipients:",
                                                recipientErr
                                            );

                                            return res.status(500).json({
                                                success: false,
                                                message:
                                                    "Announcement updated but recipients could not be updated"
                                            });

                                        }

                                        return res.json({
                                            success: true,
                                            message:
                                                "Announcement updated successfully"
                                        });

                                    }
                                );

                            }
                        );

                    };

                    if (isPinned) {

                        Announcement.unpinOthers(
                            err => {

                                if (err) {

                                    console.error(
                                        "Unpin announcements:",
                                        err
                                    );

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Unable to update pinned announcement"
                                    });

                                }

                                update();

                            }
                        );

                    } else {

                        update();

                    }

                }
            );

        }
    );

};

// ======================================================
// GET RECIPIENT USERS
// ======================================================

const getRecipientUsers = (req, res) => {

    Announcement.getRecipientUsers(
        req.params.id,
        (err, users) => {

            if (err) {

                console.error(
                    "Announcement recipients:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to load announcement recipients"
                });

            }

            return res.json({
                success: true,
                users
            });

        }
    );

};

// ======================================================
// MARK AS READ
// ======================================================

const markRead = (req, res) => {

    Announcement.markRead(
        req.params.id,
        req.user.id,
        err => {

            if (err) {

                console.error(
                    "Announcement mark read:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to mark announcement as read"
                });

            }

            return res.json({
                success: true
            });

        }
    );

};

// ======================================================
// GET COUNTS
// ======================================================

const getCounts = (req, res) => {

    Announcement.getCounts(
        req.params.id,
        (err, rows) => {

            if (err) {

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to load counts"
                });

            }

            return res.json({
                success: true,
                counts:
                    rows[0] || {}
            });

        }
    );

};

// ======================================================
// MARK EMAIL DELIVERED
// ======================================================

const markEmailDelivered = (req, res) => {

    Announcement.updateEmailStatus(
        req.params.recipientId,
        "delivered",
        null,
        err => {

            if (err) {

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to update email status"
                });

            }

            return res.json({
                success: true
            });

        }
    );

};

// ======================================================
// DELETE ANNOUNCEMENT
// ======================================================

const deleteAnnouncement = (req, res) => {

    Announcement.getAnnouncementById(
        req.params.id,
        (findErr, announcement) => {

            if (findErr) {

                console.error(
                    "Find announcement for delete:",
                    findErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to prepare announcement deletion"
                });

            }

            if (!announcement) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Announcement not found"
                });

            }

            Announcement.deleteAnnouncement(
                req.params.id,
                err => {

                    if (err) {

                        console.error(
                            "Delete announcement:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Unable to delete announcement"
                        });

                    }

                    if (
                        announcement.attachment_path
                    ) {

                        fs.unlink(
                            path.join(
                                process.cwd(),
                                "uploads",
                                path.basename(
                                    announcement.attachment_path
                                )
                            ),
                            () => {}
                        );

                    }

                    return res.json({
                        success: true,
                        message:
                            "Announcement deleted"
                    });

                }
            );

        }
    );

};

// ======================================================
// BULK UPLOAD / EXPORT / DELETE ALL
// ======================================================

const normalizeBulkAudience = (
    value = "everyone"
) => {

    const v =
        String(value)
            .trim()
            .toLowerCase();

    const map = {

        all: "everyone",

        everyone: "everyone",

        manager: "managers",

        managers: "managers",

        user: "users",

        users: "users",

        specific: "specific",

        "specific users": "specific",

        "specific_users": "specific"

    };

    return map[v] || v;

};

// ======================================================
// PARSE BULK USER IDS
// ======================================================

const parseBulkIds = value => {

    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {

        return value
            .map(Number)
            .filter(
                Number.isInteger
            );

    }

    try {

        const parsed =
            JSON.parse(
                String(value)
            );

        if (Array.isArray(parsed)) {

            return parsed
                .map(Number)
                .filter(
                    Number.isInteger
                );

        }

    } catch (_) {}

    return String(value)
        .split(/[;,|]/)
        .map(v => Number(v.trim()))
        .filter(
            Number.isInteger
        );

};

// ======================================================
// READ BULK FILE
// ======================================================

const readAnnouncementBulkFile = (
    filePath
) => {

    const workbook =
        XLSX.readFile(
            filePath,
            {
                cellDates: true
            }
        );

    const sheet =
        workbook.SheetNames[0];

    if (!sheet) {
        return [];
    }

    return XLSX.utils.sheet_to_json(
        workbook.Sheets[sheet],
        {
            defval: ""
        }
    );

};

// ======================================================
// CREATE BULK ANNOUNCEMENT
// ======================================================

const createBulkAnnouncement = (
    req,
    row
) => new Promise(
    (resolve, reject) => {

        const title =
            String(
                row.title ??
                row.Title ??
                ""
            ).trim();

        const content =
            String(
                row.content ??
                row.Content ??
                row.message ??
                ""
            ).trim();

        const audience =
            normalizeBulkAudience(
                row.audience ??
                row.Audience ??
                row.send_to ??
                "everyone"
            );

        const isPinned = [
            "1",
            "true",
            "yes",
            "y",
            "on"
        ].includes(
            String(
                row.is_pinned ??
                row.pinned ??
                ""
            )
                .trim()
                .toLowerCase()
        );

        const specificIds =
            parseBulkIds(
                row.specific_user_ids ??
                row.specificUserIds ??
                row.user_ids ??
                ""
            );

        if (!title) {

            return reject(
                new Error(
                    "Title is required"
                )
            );

        }

        if (
            ![
                "everyone",
                "managers",
                "users",
                "specific"
            ].includes(audience)
        ) {

            return reject(
                new Error(
                    "Audience must be everyone, managers, users or specific"
                )
            );

        }

        if (
            audience === "specific" &&
            !specificIds.length
        ) {

            return reject(
                new Error(
                    "specific_user_ids is required for specific audience"
                )
            );

        }

        Announcement.getUsersForAudience(
            audience,
            specificIds,
            async (
                userErr,
                users
            ) => {

                if (userErr) {

                    return reject(
                        userErr
                    );

                }

                if (!users.length) {

                    return reject(
                        new Error(
                            "No active recipients found"
                        )
                    );

                }

                const insert = () =>
                    Announcement.create(
                        {
                            title,
                            content,
                            audience,
                            isPinned,
                            createdBy:
                                req.user.id
                        },
                        async (
                            createErr,
                            result
                        ) => {

                            if (createErr) {

                                return reject(
                                    createErr
                                );

                            }

                            const announcementId =
                                result.insertId;

                            Announcement.addRecipients(
                                announcementId,
                                users,
                                async recipientErr => {

                                    if (recipientErr) {

                                        return reject(
                                            recipientErr
                                        );

                                    }

                                    Announcement.getRecipientsForEmail(
                                        announcementId,
                                        async (
                                            emailLookupErr,
                                            recipients
                                        ) => {

                                            let emailSent = 0;

                                            let emailFailed = 0;

                                            if (
                                                !emailLookupErr
                                            ) {

                                                for (
                                                    const recipient
                                                    of recipients
                                                ) {

                                                    try {

                                                        await sendAnnouncementEmail(
                                                            recipient
                                                        );

                                                        await new Promise(
                                                            (
                                                                resolveUpdate,
                                                                rejectUpdate
                                                            ) => {

                                                                Announcement.updateEmailStatus(
                                                                    recipient.recipient_id,
                                                                    "sent",
                                                                    null,
                                                                    err =>
                                                                        err
                                                                            ? rejectUpdate(err)
                                                                            : resolveUpdate()
                                                                );

                                                            }
                                                        );

                                                        emailSent++;

                                                    } catch (
                                                        mailErr
                                                    ) {

                                                        emailFailed++;

                                                        Announcement.updateEmailStatus(
                                                            recipient.recipient_id,
                                                            "failed",
                                                            mailErr.message,
                                                            () => {}
                                                        );

                                                    }

                                                }

                                            } else {

                                                emailFailed =
                                                    users.length;

                                            }

                                            resolve({

                                                announcementId,

                                                recipients:
                                                    users.length,

                                                emailSent,

                                                emailFailed

                                            });

                                        }
                                    );

                                }
                            );

                        }
                    );

                if (isPinned) {

                    Announcement.unpinOthers(
                        err => {

                            if (err) {

                                return reject(
                                    err
                                );

                            }

                            insert();

                        }
                    );

                } else {

                    insert();

                }

            }
        );

    }
);

// ======================================================
// BULK UPLOAD ANNOUNCEMENTS
// ======================================================

const bulkUploadAnnouncements = async (
    req,
    res
) => {

    if (!req.file) {

        return res.status(400).json({
            success: false,
            message:
                "Please upload a CSV, XLSX or XLS file"
        });

    }

    try {

        const rows =
            readAnnouncementBulkFile(
                req.file.path
            );

        if (!rows.length) {

            return res.status(400).json({
                success: false,
                message:
                    "The uploaded file contains no rows"
            });

        }

        let created = 0;
        let failed = 0;
        let emailSent = 0;
        let emailFailed = 0;

        const errors = [];

        for (
            let i = 0;
            i < rows.length;
            i++
        ) {

            try {

                const result =
                    await createBulkAnnouncement(
                        req,
                        rows[i]
                    );

                created++;

                emailSent +=
                    result.emailSent || 0;

                emailFailed +=
                    result.emailFailed || 0;

            } catch (err) {

                failed++;

                errors.push({

                    row: i + 2,

                    message:
                        err.message ||
                        "Unable to create announcement"

                });

            }

        }

        fs.unlink(
            req.file.path,
            () => {}
        );

        return res.status(201).json({

            success:
                created > 0,

            message:
                `${created} announcement(s) uploaded successfully` +
                (
                    failed
                        ? `, ${failed} row(s) failed`
                        : ""
                ) +
                ".",

            processed:
                rows.length,

            created,

            failed,

            emailSent,

            emailFailed,

            errors

        });

    } catch (err) {

        fs.unlink(
            req.file.path,
            () => {}
        );

        console.error(
            "Announcement bulk upload:",
            err
        );

        return res.status(400).json({

            success: false,

            message:
                "Unable to read the uploaded file"

        });

    }

};

// ======================================================
// EXPORT ANNOUNCEMENTS
// ======================================================

const exportAnnouncements = (
    req,
    res
) => {

    Announcement.getAllForExport(
        (err, rows) => {

            if (err) {

                console.error(
                    "Announcement export:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to export announcements"
                });

            }

            try {

                const parser =
                    new Parser({

                        fields: [

                            "id",

                            "title",

                            "content",

                            "audience",

                            "status",

                            "is_pinned",

                            "attachment_original_name",

                            "published_at",

                            "created_at",

                            "created_by_name"

                        ]

                    });

                const csv =
                    parser.parse(
                        rows || []
                    );

                res.setHeader(
                    "Content-Type",
                    "text/csv; charset=utf-8"
                );

                res.setHeader(
                    "Content-Disposition",
                    'attachment; filename="Announcements.csv"'
                );

                return res
                    .status(200)
                    .send(csv);

            } catch (exportErr) {

                console.error(
                    "Announcement CSV:",
                    exportErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to generate announcement export"
                });

            }

        }
    );

};

// ======================================================
// DELETE ALL ANNOUNCEMENTS
// ======================================================

const deleteAllAnnouncements = (
    req,
    res
) => {

    Announcement.getAttachmentPaths(
        (pathErr, rows) => {

            if (pathErr) {

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to prepare announcements for deletion"
                });

            }

            Announcement.deleteAllAnnouncements(
                err => {

                    if (err) {

                        console.error(
                            "Delete all announcements:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Unable to delete all announcements"
                        });

                    }

                    for (
                        const row
                        of rows || []
                    ) {

                        if (
                            !row.attachment_path
                        ) {

                            continue;

                        }

                        fs.unlink(
                            path.join(
                                process.cwd(),
                                "uploads",
                                path.basename(
                                    row.attachment_path
                                )
                            ),
                            () => {}
                        );

                    }

                    return res.json({

                        success: true,

                        message:
                            "All announcements deleted successfully"

                    });

                }
            );

        }
    );

};

// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

module.exports = {

    getAnnouncements,

    getUsers,

    createAnnouncement,

    updateAnnouncement,

    getRecipientUsers,

    markRead,

    getCounts,

    markEmailDelivered,

    deleteAnnouncement,

    bulkUploadAnnouncements,

    exportAnnouncements,

    deleteAllAnnouncements

};
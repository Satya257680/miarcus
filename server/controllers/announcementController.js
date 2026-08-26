const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
const { Parser } = require("json2csv");
const Announcement = require("../models/announcementModel");
const { sendGenericEmail } = require("../services/emailService");
const announcementEmail = require("../utils/emailTemplates/announcementEmail");
const Notification = require("../services/notificationService");
const { UPLOAD_DIR } = require("../config/storage");
const {
    JWT_SECRET,
    JWT_ALGORITHM,
    FILE_TOKEN_TTL
} = require("../config/security");

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const getAnnouncementEmailAttachment = (announcementId) =>
    new Promise((resolve) => {
        Announcement.getAttachment(
            announcementId,
            (error, row) => {
                if (error || !row) return resolve(null);

                const buffer = row.attachment_data;

                if (!buffer || !buffer.length) {
                    return resolve(null);
                }

                resolve({
                    filename: row.attachment_original_name || "announcement-attachment",
                    contentType: row.attachment_mime_type || "application/octet-stream",
                    content: Buffer.from(buffer)
                });
            }
        );
    });

const sendAnnouncementEmail = async (recipient, attachment = null) => {
    const appUrl = String(
        process.env.PUBLIC_APP_URL ||
        "https://rytual-peach.vercel.app"
    ).trim().replace(/\/+$/, "");

    const announcementId = Number(recipient.announcement_id || recipient.id || 0);
    const announcementUrl = `${appUrl}/announcements`;

    let attachmentUrl = "";
    if (announcementId > 0 && recipient.user_id) {
        const token = createAnnouncementAttachmentToken(
            announcementId,
            recipient.user_id
        );

        attachmentUrl =
            `${appUrl}/api/announcements/${announcementId}/attachment?token=${encodeURIComponent(token)}`;
    }

    const html = announcementEmail({
        recipientName: recipient.name || "there",
        title: recipient.title,
        content: recipient.content,
        announcementUrl,
        attachmentUrl: recipient.attachment_original_name ? attachmentUrl : "",
        attachmentName: recipient.attachment_original_name
    });

    const textLines = [
        `Hello ${recipient.name || "there"},`,
        "",
        `A new announcement has been published on MIARCUS: ${recipient.title || "New Announcement"}`,
        "",
        recipient.content || "",
        "",
        `Open announcement: ${announcementUrl}`
    ];

    if (recipient.attachment_original_name && attachmentUrl) {
        textLines.push(
            `Open attachment directly: ${attachmentUrl}`,
            `Attachment: ${recipient.attachment_original_name}`
        );
    }

    textLines.push("", "Sent from MIARCUS");

    return sendGenericEmail({
        to: recipient.email,
        subject: `MIARCUS Announcement: ${recipient.title}`,
        html,
        text: textLines.join("\n"),
        // Gmail receives the real binary file as a separate attachment.
        // Keep large files available through the secure direct link even
        // when they are too large for a practical email attachment.
        attachments:
            attachment && attachment.content.length <= (18 * 1024 * 1024)
                ? [attachment]
                : []
    });
};


const createAnnouncementAttachmentToken = (announcementId, userId) =>
    jwt.sign(
        {
            type: "announcement-attachment",
            announcementId: Number(announcementId),
            userId: Number(userId)
        },
        JWT_SECRET,
        {
            algorithm: JWT_ALGORITHM,
            expiresIn: FILE_TOKEN_TTL
        }
    );

const verifyAnnouncementAttachmentToken = (token, announcementId) => {
    const claims = jwt.verify(
        String(token || ""),
        JWT_SECRET,
        { algorithms: [JWT_ALGORITHM] }
    );

    if (
        claims?.type !== "announcement-attachment" ||
        Number(claims.announcementId) !== Number(announcementId) ||
        !Number.isInteger(Number(claims.userId))
    ) {
        throw new Error("Invalid announcement attachment token");
    }

    return claims;
};

const getAnnouncementAttachmentToken = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid announcement id"
        });
    }

    Announcement.userCanViewAttachment(
        id,
        req.user.id,
        (accessErr, announcement) => {
            if (accessErr) {
                console.error(
                    "Announcement attachment access:",
                    accessErr
                );
                return res.status(500).json({
                    success: false,
                    message: "Unable to authorize attachment"
                });
            }

            if (!announcement) {
                return res.status(404).json({
                    success: false,
                    message: "Announcement attachment not found"
                });
            }

            return res.json({
                success: true,
                token: createAnnouncementAttachmentToken(
                    id,
                    req.user.id
                )
            });
        }
    );
};

const getAnnouncementAttachment = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid announcement id"
        });
    }

    let claims;

    try {
        claims = verifyAnnouncementAttachmentToken(
            req.query.token,
            id
        );
    } catch (_) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired attachment token"
        });
    }

    Announcement.userCanViewAttachment(
        id,
        claims.userId,
        (accessErr, announcement) => {
            if (accessErr) {
                console.error(
                    "Announcement attachment authorization:",
                    accessErr
                );
                return res.status(500).json({
                    success: false,
                    message: "Unable to authorize attachment"
                });
            }

            if (!announcement) {
                return res.status(403).json({
                    success: false,
                    message: "Attachment access denied"
                });
            }

            Announcement.getAttachment(
                id,
                (attachmentErr, row) => {
                    if (attachmentErr) {
                        console.error(
                            "Announcement attachment load:",
                            attachmentErr
                        );
                        return res.status(500).json({
                            success: false,
                            message: "Unable to load attachment"
                        });
                    }

                    if (!row) {
                        return res.status(404).json({
                            success: false,
                            message: "Attachment not found"
                        });
                    }

                    let buffer = row.attachment_data;

                    // Backward-compatible fallback for an attachment that
                    // has not yet been migrated from the old disk storage.
                    if (
                        (!buffer || !buffer.length) &&
                        row.attachment_path
                    ) {
                        const filename = path.basename(
                            String(row.attachment_path)
                        );
                        const filePath = path.resolve(
                            UPLOAD_DIR,
                            filename
                        );

                        try {
                            buffer = fs.readFileSync(filePath);
                        } catch (_) {
                            buffer = null;
                        }
                    }

                    if (!buffer || !buffer.length) {
                        return res.status(404).json({
                            success: false,
                            message: "Attachment file is no longer available"
                        });
                    }

                    const mimeType =
                        row.attachment_mime_type ||
                        "application/octet-stream";

                    const originalName =
                        String(
                            row.attachment_original_name ||
                            "attachment"
                        )
                            .replace(/[/\\\\?%*:|"<>]/g, "_")
                            .slice(0, 180);

                    const disposition =
                        String(req.query.download || "") === "1"
                            ? "attachment"
                            : "inline";

                    res.setHeader(
                        "Content-Type",
                        mimeType
                    );
                    res.setHeader(
                        "Content-Length",
                        String(buffer.length)
                    );
                    res.setHeader(
                        "Content-Disposition",
                        `${disposition}; filename="${originalName}"`
                    );

                    // The frontend loads this endpoint through the Vercel
                    // /api rewrite, so SAMEORIGIN keeps PDF iframes protected
                    // without using the insecure public upload directory.
                    res.setHeader(
                        "X-Frame-Options",
                        "SAMEORIGIN"
                    );
                    res.setHeader(
                        "Content-Security-Policy",
                        "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'"
                    );
                    res.setHeader(
                        "Cross-Origin-Resource-Policy",
                        "same-origin"
                    );
                    res.setHeader(
                        "X-Content-Type-Options",
                        "nosniff"
                    );
                    res.setHeader(
                        "Cache-Control",
                        "private, no-store, max-age=0"
                    );

                    return res.send(buffer);
                }
            );
        }
    );
};

const getAnnouncements = (req, res) => {
    Announcement.getAll(req.user.id, {
        search: req.query.search || "",
        startDate: req.query.startDate || "",
        endDate: req.query.endDate || ""
    }, (err, rows) => {
        if (err) {
            console.error("Announcement getAll:", err);
            return res.status(500).json({ success: false, message: "Unable to load announcements" });
        }
        res.json({ success: true, announcements: rows });
    });
};

const getUsers = (req, res) => {
    Announcement.getUsers(req.query.search || "", (err, users) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to load users" });
        res.json({ success: true, users });
    });
};

const createAnnouncement = (req, res) => {
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    const audience = String(req.body.audience || "everyone").toLowerCase();
    const isPinned = ["true", "1", 1, true].includes(req.body.isPinned);

    let specificIds = [];
    try {
        specificIds = Array.isArray(req.body.specificUserIds)
            ? req.body.specificUserIds
            : JSON.parse(req.body.specificUserIds || "[]");
    } catch {
        return res.status(400).json({ success: false, message: "Invalid selected users" });
    }

    if (!title) return res.status(400).json({ success: false, message: "Title is required" });
    if (!["everyone", "managers", "users", "specific"].includes(audience)) {
        return res.status(400).json({ success: false, message: "Invalid audience" });
    }
    if (audience === "specific" && !specificIds.length) {
        return res.status(400).json({ success: false, message: "Select at least one user" });
    }

    Announcement.getUsersForAudience(audience, specificIds, (userErr, users) => {
        if (userErr) {
            console.error(userErr);
            return res.status(500).json({ success: false, message: "Unable to determine recipients" });
        }

        if (!users.length) {
            return res.status(400).json({ success: false, message: "No active recipients found" });
        }

        const insert = () => {
            Announcement.create({
                title,
                content,
                audience,
                isPinned,
                createdBy: req.user.id,
                attachmentOriginalName: req.file?.originalname,
                attachmentPath: req.file?.filename,
                attachmentData: req.file
                    ? fs.readFileSync(req.file.path)
                    : null,
                attachmentMimeType: req.file?.mimetype || null
            }, (createErr, result) => {
                if (createErr) {
                    console.error(createErr);
                    if (req.file?.path) fs.unlink(req.file.path, () => {});
                    return res.status(500).json({ success: false, message: "Unable to create announcement" });
                }

                const announcementId = result.insertId;

                Announcement.addRecipients(announcementId, users, (recipientErr) => {
                    if (recipientErr) {
                        console.error(recipientErr);
                        return res.status(500).json({
                            success: false,
                            message: "Announcement created but recipients could not be created"
                        });
                    }

                    // ==================================================
                    // CREATE IN-APP NOTIFICATIONS
                    // ==================================================
                    // announcement_recipients is the source of truth for
                    // the audience. createForUsers() is promise-based, so
                    // await it instead of passing a callback that the
                    // service does not consume.
                    (async () => {
                        try {
                            await Notification.createForUsers(
                                users.map((user) => user.id),
                                {
                                    title,
                                    message:
                                        content ||
                                        "A new announcement has been published.",
                                    type: "announcement",
                                    module_name: "announcements",
                                    action_name: "Published",
                                    entity_id: announcementId,
                                    link: "/announcements"
                                }
                            );
                        } catch (notificationErr) {
                            // Notification failure must not prevent the
                            // already-created announcement from completing.
                            console.error(
                                "Announcement notification error:",
                                notificationErr
                            );
                        }

                        Announcement.getRecipientsForEmail(
                            announcementId,
                            async (lookupErr, recipients) => {
                        if (lookupErr) {
                            return res.status(201).json({
                                success: true,
                                message: "Announcement published; email processing could not start",
                                announcementId,
                                recipients: users.length
                            });
                        }

                        let emailSent = 0;
                        let emailFailed = 0;
                        const emailAttachment = await getAnnouncementEmailAttachment(announcementId);

                        for (const recipient of recipients) {
                            try {
                                await sendAnnouncementEmail(recipient, emailAttachment);
                                await new Promise((resolve, reject) => {
                                    Announcement.updateEmailStatus(
                                        recipient.recipient_id,
                                        "sent",
                                        null,
                                        err => err ? reject(err) : resolve()
                                    );
                                });
                                emailSent++;
                            } catch (mailErr) {
                                emailFailed++;
                                Announcement.updateEmailStatus(
                                    recipient.recipient_id,
                                    "failed",
                                    mailErr.message,
                                    () => {}
                                );
                            }
                        }

                                res.status(201).json({
                                    success: true,
                                    message: "Announcement published successfully",
                                    announcementId,
                                    recipients: users.length,
                                    emailSent,
                                    emailFailed
                                });
                            }
                        );
                    })();
                });
            });
        };

        if (isPinned) {
            Announcement.unpinOthers(err => {
                if (err) console.error("Unpin announcement:", err);
                insert();
            });
        } else {
            insert();
        }
    });
};


// ======================================================
// UPDATE ANNOUNCEMENT
// Supports:
// - Edit title/message
// - Change audience
// - Replace/remove attachment
// - Pin / unpin
// Only this announcement module is affected.
// ======================================================
const updateAnnouncement = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: "Invalid announcement id" });
    }

    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    const audience = String(req.body.audience || "everyone").toLowerCase();
    const isPinned = ["true", "1", 1, true, "yes", "on"].includes(req.body.isPinned);
    const removeAttachment = ["true", "1", 1, true, "yes", "on"].includes(req.body.removeAttachment);

    let specificIds = [];
    try {
        specificIds = Array.isArray(req.body.specificUserIds)
            ? req.body.specificUserIds
            : JSON.parse(req.body.specificUserIds || "[]");
    } catch {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: "Invalid selected users" });
    }

    if (!title) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (!["everyone", "managers", "users", "specific"].includes(audience)) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: "Invalid audience" });
    }

    if (audience === "specific" && !specificIds.length) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: "Select at least one user" });
    }

    Announcement.getById(id, (findErr, existing) => {
        if (findErr) {
            if (req.file?.path) fs.unlink(req.file.path, () => {});
            console.error("Announcement getById:", findErr);
            return res.status(500).json({ success: false, message: "Unable to load announcement" });
        }

        if (!existing) {
            if (req.file?.path) fs.unlink(req.file.path, () => {});
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        const audienceChanged = String(existing.audience) !== audience;
        const oldAttachment = existing.attachment_path;
        const newAttachmentPath = req.file?.filename ||
            (removeAttachment ? null : existing.attachment_path);
        const newAttachmentName = req.file?.originalname ||
            (removeAttachment ? null : existing.attachment_original_name);

        const saveUpdate = () => {
            Announcement.update(id, {
                title,
                content,
                audience,
                isPinned,
                attachmentOriginalName: newAttachmentName,
                attachmentPath: newAttachmentPath,
                attachmentChanged: Boolean(req.file) || removeAttachment,
                attachmentData: req.file
                    ? fs.readFileSync(req.file.path)
                    : (removeAttachment ? null : undefined),
                attachmentMimeType: req.file
                    ? req.file.mimetype
                    : (removeAttachment ? null : undefined)
            }, (updateErr) => {
                if (updateErr) {
                    if (req.file?.path) fs.unlink(req.file.path, () => {});
                    console.error("Announcement update:", updateErr);
                    return res.status(500).json({ success: false, message: "Unable to update announcement" });
                }

                const cleanupOldAttachment = () => {
                    if (
                        oldAttachment &&
                        (req.file || removeAttachment) &&
                        oldAttachment !== newAttachmentPath
                    ) {
                        fs.unlink(
                            path.join(UPLOAD_DIR, path.basename(oldAttachment)),
                            () => {}
                        );
                    }
                };

                const finish = () => {
                    cleanupOldAttachment();
                    return res.json({
                        success: true,
                        message: isPinned
                            ? "Announcement updated and pinned successfully"
                            : "Announcement updated successfully"
                    });
                };

                if (!audienceChanged) {
                    return finish();
                }

                Announcement.getUsersForAudience(audience, specificIds, (usersErr, users) => {
                    if (usersErr) {
                        return res.status(500).json({
                            success: false,
                            message: "Announcement updated but recipients could not be loaded"
                        });
                    }

                    if (!users.length) {
                        return res.status(400).json({
                            success: false,
                            message: "Announcement updated but no active recipients were found"
                        });
                    }

                    Announcement.deleteRecipients(id, deleteErr => {
                        if (deleteErr) {
                            return res.status(500).json({
                                success: false,
                                message: "Announcement updated but old recipients could not be replaced"
                            });
                        }

                        Announcement.addRecipients(id, users, addErr => {
                            if (addErr) {
                                return res.status(500).json({
                                    success: false,
                                    message: "Announcement updated but new recipients could not be created"
                                });
                            }

                            // Email the newly selected audience. Errors are recorded per recipient
                            // and do not make the announcement update fail.
                            Announcement.getRecipientsForEmail(id, async (emailLookupErr, recipients) => {
                                if (!emailLookupErr) {
                                    const emailAttachment = await getAnnouncementEmailAttachment(id);
                                    for (const recipient of recipients) {
                                        try {
                                            await sendAnnouncementEmail(recipient, emailAttachment);
                                            Announcement.updateEmailStatus(
                                                recipient.recipient_id,
                                                "sent",
                                                null,
                                                () => {}
                                            );
                                        } catch (mailErr) {
                                            Announcement.updateEmailStatus(
                                                recipient.recipient_id,
                                                "failed",
                                                mailErr.message,
                                                () => {}
                                            );
                                        }
                                    }
                                }
                                finish();
                            });
                        });
                    });
                });
            });
        };

        if (isPinned) {
            Announcement.unpinOthers(unpinErr => {
                if (unpinErr) {
                    if (req.file?.path) fs.unlink(req.file.path, () => {});
                    console.error("Unpin before update:", unpinErr);
                    return res.status(500).json({ success: false, message: "Unable to update pinned announcement" });
                }
                saveUpdate();
            });
        } else {
            saveUpdate();
        }
    });
};

const markRead = (req, res) => {
    Announcement.markRead(req.params.id, req.user.id, err => {
        if (err) return res.status(500).json({ success: false, message: "Unable to mark as read" });
        res.json({ success: true });
    });
};

const getRecipientUsers = (req, res) => {
    Announcement.getRecipientUsers(req.params.id, (err, users) => {
        if (err) {
            console.error("Announcement recipients:", err);
            return res.status(500).json({ success: false, message: "Unable to load announcement recipients" });
        }
        return res.json({ success: true, users });
    });
};

const getCounts = (req, res) => {
    Announcement.getCounts(req.params.id, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to load counts" });
        res.json({ success: true, counts: rows[0] || {} });
    });
};

const markEmailDelivered = (req, res) => {
    Announcement.updateEmailStatus(req.params.recipientId, "delivered", null, err => {
        if (err) return res.status(500).json({ success: false, message: "Unable to update email status" });
        res.json({ success: true });
    });
};

const deleteAnnouncement = (req, res) => {
    Announcement.deleteAnnouncement(req.params.id, err => {
        if (err) return res.status(500).json({ success: false, message: "Unable to delete announcement" });
        res.json({ success: true, message: "Announcement deleted" });
    });
};


// ======================================================
// BULK UPLOAD / EXPORT / DELETE ALL
// These endpoints use the existing global BulkUploadModal
// and global toolbar pattern. No other module is changed.
// ======================================================

const normalizeBulkAudience = (value = "everyone") => {
    const v = String(value).trim().toLowerCase();
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

const parseBulkIds = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(Number).filter(Number.isInteger);
    try {
        const parsed = JSON.parse(String(value));
        if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isInteger);
    } catch (_) {}
    return String(value)
        .split(/[;,|]/)
        .map(v => Number(v.trim()))
        .filter(Number.isInteger);
};

const readAnnouncementBulkFile = (filePath) => {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheet = workbook.SheetNames[0];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" });
};

const createBulkAnnouncement = (req, row) => new Promise((resolve, reject) => {
    const title = String(row.title ?? row.Title ?? "").trim();
    const content = String(row.content ?? row.Content ?? row.message ?? "").trim();
    const audience = normalizeBulkAudience(row.audience ?? row.Audience ?? row.send_to ?? "everyone");
    const isPinned = ["1", "true", "yes", "y", "on"].includes(String(row.is_pinned ?? row.pinned ?? "").trim().toLowerCase());
    const specificIds = parseBulkIds(row.specific_user_ids ?? row.specificUserIds ?? row.user_ids ?? "");

    if (!title) return reject(new Error("Title is required"));
    if (!["everyone", "managers", "users", "specific"].includes(audience)) {
        return reject(new Error("Audience must be everyone, managers, users or specific"));
    }
    if (audience === "specific" && !specificIds.length) {
        return reject(new Error("specific_user_ids is required for specific audience"));
    }

    Announcement.getUsersForAudience(audience, specificIds, async (userErr, users) => {
        if (userErr) return reject(userErr);
        if (!users.length) return reject(new Error("No active recipients found"));

        const insert = () => Announcement.create({
            title,
            content,
            audience,
            isPinned,
            createdBy: req.user.id
        }, async (createErr, result) => {
            if (createErr) return reject(createErr);
            const announcementId = result.insertId;

            Announcement.addRecipients(announcementId, users, async recipientErr => {
                if (recipientErr) return reject(recipientErr);

                Announcement.getRecipientsForEmail(announcementId, async (emailLookupErr, recipients) => {
                    let emailSent = 0;
                    let emailFailed = 0;
                    const emailAttachment = await getAnnouncementEmailAttachment(announcementId);

                    if (!emailLookupErr) {
                        for (const recipient of recipients) {
                            try {
                                await sendAnnouncementEmail(recipient, emailAttachment);
                                await new Promise((resolveUpdate, rejectUpdate) => {
                                    Announcement.updateEmailStatus(
                                        recipient.recipient_id,
                                        "sent",
                                        null,
                                        err => err ? rejectUpdate(err) : resolveUpdate()
                                    );
                                });
                                emailSent++;
                            } catch (mailErr) {
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
                        emailFailed = users.length;
                    }

                    resolve({ announcementId, recipients: users.length, emailSent, emailFailed });
                });
            });
        });

        if (isPinned) {
            Announcement.unpinOthers(err => {
                if (err) return reject(err);
                insert();
            });
        } else {
            insert();
        }
    });
});

const bulkUploadAnnouncements = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Please upload a CSV, XLSX or XLS file" });
    }

    try {
        const rows = readAnnouncementBulkFile(req.file.path);
        if (!rows.length) {
            return res.status(400).json({ success: false, message: "The uploaded file contains no rows" });
        }

        let created = 0;
        let failed = 0;
        let emailSent = 0;
        let emailFailed = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            try {
                const result = await createBulkAnnouncement(req, rows[i]);
                created++;
                emailSent += result.emailSent || 0;
                emailFailed += result.emailFailed || 0;
            } catch (err) {
                failed++;
                errors.push({ row: i + 2, message: err.message || "Unable to create announcement" });
            }
        }

        fs.unlink(req.file.path, () => {});

        return res.status(201).json({
            success: created > 0,
            message: `${created} announcement(s) uploaded successfully${failed ? `, ${failed} row(s) failed` : ""}.`,
            processed: rows.length,
            created,
            failed,
            emailSent,
            emailFailed,
            errors
        });
    } catch (err) {
        fs.unlink(req.file.path, () => {});
        console.error("Announcement bulk upload:", err);
        return res.status(400).json({ success: false, message: "Unable to read the uploaded file" });
    }
};

const exportAnnouncements = (req, res) => {
    Announcement.getAllForExport((err, rows) => {
        if (err) {
            console.error("Announcement export:", err);
            return res.status(500).json({ success: false, message: "Unable to export announcements" });
        }

        try {
            const parser = new Parser({
                fields: [
                    "id", "title", "content", "audience", "status", "is_pinned",
                    "attachment_original_name", "published_at", "created_at", "created_by_name"
                ]
            });
            const csv = parser.parse(rows || []);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="Announcements.csv"');
            return res.status(200).send(csv);
        } catch (exportErr) {
            console.error("Announcement CSV:", exportErr);
            return res.status(500).json({ success: false, message: "Unable to generate announcement export" });
        }
    });
};

const deleteAllAnnouncements = (req, res) => {
    Announcement.getAttachmentPaths((pathErr, rows) => {
        if (pathErr) {
            return res.status(500).json({ success: false, message: "Unable to prepare announcements for deletion" });
        }

        Announcement.deleteAllAnnouncements(err => {
            if (err) {
                console.error("Delete all announcements:", err);
                return res.status(500).json({ success: false, message: "Unable to delete all announcements" });
            }

            for (const row of rows || []) {
                if (!row.attachment_path) continue;
                fs.unlink(path.join(UPLOAD_DIR, path.basename(row.attachment_path)), () => {});
            }

            return res.json({ success: true, message: "All announcements deleted successfully" });
        });
    });
};

module.exports = {
    getAnnouncements,
    getUsers,
    getAnnouncementAttachmentToken,
    getAnnouncementAttachment,
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

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
const { Parser } = require("json2csv");
const Announcement = require("../models/announcementModel");
const { runBulkUpload, rowError, parseYesNo } = require("../utils/bulkUploadEngine");
const { readDeleteScope } = require("../utils/deleteScope");
const { sendGenericEmail } = require("../services/emailService");
const announcementEmail = require("../utils/emailTemplates/announcementEmail");
const Notification = require("../services/notificationService");
const { UPLOAD_DIR } = require("../config/storage");
const { getAppUrl } = require("../config/appUrl");
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
    const appUrl = getAppUrl();

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

// ======================================================
// BACKGROUND EMAIL DELIVERY
//
// Emails are sent AFTER the HTTP response has been returned so a
// large audience can no longer cause request time-outs. Every
// recipient's result is still recorded in announcement_recipients.
// onlyUserIds (optional) limits sending to newly added recipients.
// ======================================================

const setEmailStatus = (recipientId, status, reason = null) =>
    new Promise((resolve, reject) => {
        Announcement.updateEmailStatus(
            recipientId,
            status,
            reason,
            (err) => (err ? reject(err) : resolve())
        );
    });

const sendEmailsInBackground = (announcementId, onlyUserIds = null) => {
    setImmediate(() => {
        Announcement.getRecipientsForEmail(
            announcementId,
            async (lookupErr, recipients) => {
                if (lookupErr) {
                    console.error(
                        "Announcement email lookup:",
                        lookupErr
                    );
                    return;
                }

                const allowed = Array.isArray(onlyUserIds)
                    ? new Set(onlyUserIds.map(Number))
                    : null;

                const targets = allowed
                    ? recipients.filter((r) => allowed.has(Number(r.user_id)))
                    : recipients;

                if (!targets.length) return;

                const emailAttachment =
                    await getAnnouncementEmailAttachment(announcementId);

                for (const recipient of targets) {
                    try {
                        await sendAnnouncementEmail(recipient, emailAttachment);
                        await setEmailStatus(recipient.recipient_id, "sent");
                    } catch (mailErr) {
                        try {
                            await setEmailStatus(
                                recipient.recipient_id,
                                "failed",
                                mailErr.message
                            );
                        } catch (statusErr) {
                            console.error(
                                "Announcement email status:",
                                statusErr
                            );
                        }
                    }
                }
            }
        );
    });
};

const toPositiveInt = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
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
                        // Roll back so no recipient-less announcement is left behind.
                        Announcement.deleteAnnouncement(announcementId, () => {});
                        return res.status(500).json({
                            success: false,
                            message: "Unable to create announcement recipients"
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

                        // Respond immediately; emails continue in the background.
                        sendEmailsInBackground(announcementId);

                        return res.status(201).json({
                            success: true,
                            message: "Announcement published successfully. Emails are being sent in the background.",
                            announcementId,
                            recipients: users.length,
                            emailsQueued: users.length
                        });
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

    const cleanupUpload = () => {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    };

    Announcement.getById(id, (findErr, existing) => {
        if (findErr) {
            cleanupUpload();
            console.error("Announcement getById:", findErr);
            return res.status(500).json({ success: false, message: "Unable to load announcement" });
        }

        if (!existing) {
            cleanupUpload();
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        const audienceChanged = String(existing.audience) !== audience;
        // "specific" can change its selected users without changing the
        // audience type, so it must always be re-synced.
        const recipientsNeedSync = audienceChanged || audience === "specific";
        const oldAttachment = existing.attachment_path;
        const newAttachmentPath = req.file?.filename ||
            (removeAttachment ? null : existing.attachment_path);
        const newAttachmentName = req.file?.originalname ||
            (removeAttachment ? null : existing.attachment_original_name);

        // plan = { toAdd: [users], toRemoveIds: [userIds] } or null
        const saveUpdate = (plan) => {
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
                    cleanupUpload();
                    console.error("Announcement update:", updateErr);
                    return res.status(500).json({ success: false, message: "Unable to update announcement" });
                }

                const finish = () => {
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
                    return res.json({
                        success: true,
                        message: isPinned
                            ? "Announcement updated and pinned successfully"
                            : "Announcement updated successfully"
                    });
                };

                if (!plan || (!plan.toAdd.length && !plan.toRemoveIds.length)) {
                    return finish();
                }

                const removeStep = (next) =>
                    plan.toRemoveIds.length
                        ? Announcement.removeRecipientsByUserIds(id, plan.toRemoveIds, next)
                        : next(null);

                const addStep = (next) =>
                    plan.toAdd.length
                        ? Announcement.addRecipients(id, plan.toAdd, next)
                        : next(null);

                removeStep((removeErr) => {
                    if (removeErr) {
                        console.error("Announcement remove recipients:", removeErr);
                        return res.status(500).json({
                            success: false,
                            message: "Announcement updated but removed recipients could not be saved"
                        });
                    }

                    addStep((addErr) => {
                        if (addErr) {
                            console.error("Announcement add recipients:", addErr);
                            return res.status(500).json({
                                success: false,
                                message: "Announcement updated but new recipients could not be saved"
                            });
                        }

                        // Only people who were NOT already recipients are emailed.
                        // Existing recipients keep their read / email status.
                        if (plan.toAdd.length) {
                            sendEmailsInBackground(
                                id,
                                plan.toAdd.map((u) => u.id)
                            );
                        }

                        finish();
                    });
                });
            });
        };

        const runUpdate = (plan) => {
            if (!isPinned) return saveUpdate(plan);

            Announcement.unpinOthers((unpinErr) => {
                if (unpinErr) {
                    cleanupUpload();
                    console.error("Unpin before update:", unpinErr);
                    return res.status(500).json({ success: false, message: "Unable to update pinned announcement" });
                }
                saveUpdate(plan);
            });
        };

        // Recipients are resolved and validated BEFORE anything is saved,
        // so a bad audience can no longer leave a half-updated announcement.
        if (!recipientsNeedSync) return runUpdate(null);

        Announcement.getUsersForAudience(audience, specificIds, (usersErr, users) => {
            if (usersErr) {
                cleanupUpload();
                console.error("Announcement audience:", usersErr);
                return res.status(500).json({ success: false, message: "Unable to determine recipients" });
            }

            if (!users.length) {
                cleanupUpload();
                return res.status(400).json({ success: false, message: "No active recipients found" });
            }

            Announcement.getRecipientUserIds(id, (idsErr, rows) => {
                if (idsErr) {
                    cleanupUpload();
                    console.error("Announcement current recipients:", idsErr);
                    return res.status(500).json({ success: false, message: "Unable to load current recipients" });
                }

                const current = new Set(rows.map((r) => Number(r.user_id)));
                const target = new Set(users.map((u) => Number(u.id)));

                runUpdate({
                    toAdd: users.filter((u) => !current.has(Number(u.id))),
                    toRemoveIds: [...current].filter((uid) => !target.has(uid))
                });
            });
        });
    });
};

const markRead = (req, res) => {
    const id = toPositiveInt(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, message: "Invalid announcement id" });
    }

    // Scoped to the logged-in user's own recipient row inside the model.
    Announcement.markRead(id, req.user.id, err => {
        if (err) return res.status(500).json({ success: false, message: "Unable to mark as read" });
        res.json({ success: true });
    });
};

const getRecipientUsers = (req, res) => {
    const id = toPositiveInt(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, message: "Invalid announcement id" });
    }

    Announcement.getRecipientUsers(id, (err, users) => {
        if (err) {
            console.error("Announcement recipients:", err);
            return res.status(500).json({ success: false, message: "Unable to load announcement recipients" });
        }
        return res.json({ success: true, users });
    });
};

const getCounts = (req, res) => {
    const id = toPositiveInt(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, message: "Invalid announcement id" });
    }

    Announcement.getCounts(id, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to load counts" });
        res.json({ success: true, counts: rows[0] || {} });
    });
};

const markEmailDelivered = (req, res) => {
    const recipientId = toPositiveInt(req.params.recipientId);
    if (!recipientId) {
        return res.status(400).json({ success: false, message: "Invalid recipient id" });
    }

    Announcement.updateEmailStatus(recipientId, "delivered", null, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to update email status" });

        // Only an email that was actually sent can become "delivered".
        if (!result || result.affectedRows === 0) {
            return res.status(409).json({
                success: false,
                message: "Recipient not found or email has not been sent"
            });
        }

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

// Creates one announcement from already-validated values.
const createBulkAnnouncement = (req, values) => new Promise((resolve, reject) => {
    const { title, content, audience, isPinned, specificIds } = values;

    Announcement.getUsersForAudience(audience, specificIds, async (userErr, users) => {
        if (userErr) return reject(userErr);
        if (!users.length) {
            return reject(rowError(
                audience === "specific" ? "Specific User IDs" : "Audience",
                audience === "specific" ? specificIds.join(", ") : audience,
                "No active recipients were found for this audience."
            ));
        }

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

// ======================================================
// BULK UPLOAD ANNOUNCEMENTS  (global bulk-upload engine)
// ======================================================

const bulkUploadAnnouncements = async (req, res) => {
    let emailSent = 0;
    let emailFailed = 0;

    const body = await runBulkUpload({
        req,
        res,
        respond: false,
        module: "announcements",

        validateRow: (row, ctx) => {
            const audienceRaw = ctx.text("Audience") || "everyone";
            const audience = normalizeBulkAudience(audienceRaw);
            if (!["everyone", "managers", "users", "specific"].includes(audience)) {
                ctx.fail("Audience", audienceRaw, "Audience must be everyone, managers, users or specific.");
            }

            const pinned = parseYesNo(ctx.cell("Pinned"), false);
            if (pinned === null) ctx.fail("Pinned", ctx.cell("Pinned"), "Pinned must be Yes or No.");

            const specificRaw = ctx.text("Specific User IDs");
            const specificIds = parseBulkIds(specificRaw);
            if (audience === "specific" && !specificIds.length) {
                ctx.fail("Specific User IDs", specificRaw, "Specific User IDs are required when Audience is specific.");
            }

            ctx.values = {
                title: ctx.text("Title"),
                content: ctx.text("Content"),
                audience,
                isPinned: Boolean(pinned),
                specificIds
            };
        },

        processRow: async (row, ctx) => {
            const result = await createBulkAnnouncement(req, ctx.values);
            emailSent += result.emailSent || 0;
            emailFailed += result.emailFailed || 0;
            if (result.emailFailed) {
                ctx.note("Audience", ctx.values.audience, `Announcement saved, but ${result.emailFailed} email(s) could not be sent.`);
            }
            return { id: result.announcementId };
        }
    });

    return res.status(body.completed ? 201 : 400).json({ ...body, emailSent, emailFailed });
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
    // Filters applied on the page -> only the matching ids are deleted.
    const scope = readDeleteScope(req);
    const ids = scope.filtered ? (scope.ids || []) : null;

    Announcement.getAttachmentPaths(ids, (pathErr, rows) => {
        if (pathErr) {
            return res.status(500).json({ success: false, message: "Unable to prepare announcements for deletion" });
        }

        Announcement.deleteAllAnnouncements(ids, (err, result) => {
            if (err) {
                console.error("Delete all announcements:", err);
                return res.status(500).json({ success: false, message: "Unable to delete all announcements" });
            }

            for (const row of rows || []) {
                if (!row.attachment_path) continue;
                fs.unlink(path.join(UPLOAD_DIR, path.basename(row.attachment_path)), () => {});
            }

            if (ids) {
                const count = Number(result?.affectedRows || 0);
                return res.json({ success: true, deleted: count, message: `${count} filtered announcement(s) deleted successfully` });
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

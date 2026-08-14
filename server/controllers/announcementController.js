const fs = require("fs");
const path = require("path");
const Announcement = require("../models/announcementModel");
const transporter = require("../config/mailer");

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const sendAnnouncementEmail = async (recipient) => {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const attachmentUrl = recipient.attachment_path
        ? `${baseUrl}/uploads/${encodeURIComponent(path.basename(recipient.attachment_path))}`
        : null;

    return transporter.sendMail({
        from: EMAIL_FROM,
        to: recipient.email,
        subject: recipient.title,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto">
                <h2>${escapeHtml(recipient.title)}</h2>
                <div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(recipient.content || "")}</div>
                ${attachmentUrl ? `<p><a href="${attachmentUrl}">View attachment</a></p>` : ""}
                <p style="color:#777;font-size:12px">Sent from MIARCUS</p>
            </div>
        `
    });
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
                attachmentPath: req.file?.filename
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

                    Announcement.getRecipientsForEmail(announcementId, async (lookupErr, recipients) => {
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

                        for (const recipient of recipients) {
                            try {
                                await sendAnnouncementEmail(recipient);
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
                    });
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

const markRead = (req, res) => {
    Announcement.markRead(req.params.id, req.user.id, err => {
        if (err) return res.status(500).json({ success: false, message: "Unable to mark as read" });
        res.json({ success: true });
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

module.exports = {
    getAnnouncements,
    getUsers,
    createAnnouncement,
    markRead,
    getCounts,
    markEmailDelivered,
    deleteAnnouncement
};

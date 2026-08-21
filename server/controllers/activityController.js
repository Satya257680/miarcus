const Activity = require("../models/activityModel");
const { sendGenericEmail } = require("../services/emailService");
const { logActivity } = require("../utils/activityLogger");

// ======================================================
// GET ALL ACTIVITIES
// ======================================================

exports.getAllActivities = (req, res) => {

    const filters = {
        search: req.query.search || "",
        module_name: req.query.module_name || "",
        activity_type: req.query.activity_type || "",
        action: req.query.action || "",
        status: req.query.status || "",
        priority: req.query.priority || "",
        date_from: req.query.date_from || "",
        date_to: req.query.date_to || "",
        new_store_opening_id: req.query.new_store_opening_id || "",
        page: req.query.page || 1,
        limit: req.query.limit || 10
    };

    Activity.getAll(

    filters,

    req.user,

    (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Failed to fetch activities"

            });

        }

        res.json({

            success: true,

            data: results

        });

    }

);
};

// ======================================================
// GET ACTIVITY BY ID
// ======================================================

exports.getActivityById = (req, res) => {

    const { id } = req.params;

Activity.getById(

    id,

    req.user,

    (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch activity"
            });

        }

        if (results.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Activity not found"
            });

        }

        res.json({
            success: true,
            data: results[0]
        });

    });

};

// ======================================================
// GET ACTIVITY DETAILS
// ======================================================

exports.getActivityDetails = (req, res) => {

    const { id } = req.params;

    Activity.getDetails(

    id,

    req.user,

    (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch activity details"
            });

        }

        if (results.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Activity not found"
            });

        }

        res.json({
            success: true,
            data: results[0]
        });

    });

};

// ======================================================
// GET ACTIVITY COMMENTS
// ======================================================

exports.getActivityComments = (req, res) => {

    const { id } = req.params;

    Activity.getComments(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Failed to fetch comments"

            });

        }

        res.json({

            success: true,

            data: results

        });

    });

};
// ======================================================
// GET ACTIVITY FILES
// ======================================================

exports.getActivityFiles = (req, res) => {

    const { id } = req.params;

    Activity.getFiles(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch files"
            });

        }

        res.json({
            success: true,
            data: results
        });

    });

};

// ======================================================
// GET ACTIVITY NOTIFICATIONS
// ======================================================

exports.getActivityNotifications = (req, res) => {

    const { id } = req.params;

    Activity.getNotifications(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch notifications"
            });

        }

        res.json({
            success: true,
            data: results
        });

    });

};

// ======================================================
// GET ACTIVITY MENTIONS
// ======================================================

exports.getActivityMentions = (req, res) => {

    const { id } = req.params;

    Activity.getMentions(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch mentions"
            });

        }

        res.json({
            success: true,
            data: results
        });

    });

};
// ======================================================
// GET ACTIVITY TIMELINE
// ======================================================

exports.getActivityTimeline = (req, res) => {

    const { id } = req.params;

    Activity.hasAccess(id, req.user, (err, allowed) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Permission Check Failed"

            });

        }

        if (!allowed) {

            return res.status(403).json({

                success: false,

                message: "Access Denied"

            });

        }

        Activity.getTimeline(id, (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch activity timeline"

                });

            }

            res.json({

                success: true,

                data: results

            });

        });

    });

};
// ======================================================
// ADD ACTIVITY COMMENT
// ======================================================

exports.addComment = (req, res) => {

    const { id } = req.params;

    const { comment } = req.body;

    const userId = req.user.id;

    if (!comment || !comment.trim()) {

        return res.status(400).json({

            success: false,

            message: "Comment is required"

        });

    }

    Activity.addComment(

        id,

        userId,

        comment,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to add comment"

                });

            }

            res.status(201).json({

                success: true,

                message: "Comment added successfully",

                data: {

                    id: result.insertId

                }

            });

        }

    );

};
// ======================================================
// UPLOAD ACTIVITY FILE
// ======================================================

exports.uploadActivityFile = (req, res) => {

    const { id } = req.params;

    const userId = req.user.id;

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "Please select a file."

        });

    }

    Activity.uploadFile(

        id,

        userId,

        req.file.originalname,

        req.file.filename,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to upload file"

                });

            }

            res.status(201).json({

                success: true,

                message: "File uploaded successfully",

                data: {

                    id: result.insertId

                }

            });

        }

    );

};

// ======================================================
// DELETE ACTIVITY FILE
// ======================================================

exports.deleteActivityFile = (req, res) => {

    const { fileId } = req.params;

    Activity.deleteFile(

        fileId,

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to delete file"

                });

            }

            res.json({

                success: true,

                message: "File deleted successfully"

            });

        }

    );

};

// ======================================================
// DELETE ONE ACTIVITY
// ======================================================

exports.deleteActivity = (req, res) => {
    const { id } = req.params;
    Activity.deleteById(id, req.user, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Failed to delete activity" });
        }
        if (result?.forbidden) {
            return res.status(403).json({ success: false, message: "Access Denied" });
        }
        logActivity({
            activity_type: "Activity Center Activity",
            reference_id: Number(id) || 0,
            title: "Activity Deleted",
            description: `Activity #${id} was deleted.`,
            module_name: "Activity Center",
            status: "Closed",
            priority: "High",
            created_by: req.user.id,
            assigned_to: null
        }).catch((error) => console.error("Activity delete audit error:", error.message));
        return res.json({ success: true, message: "Activity deleted successfully" });
    });
};

// ======================================================
// DELETE ALL MATCHING ACTIVITIES
// ======================================================

exports.deleteAllActivities = (req, res) => {
    Activity.deleteAll(req.body || {}, req.user, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Failed to delete activities" });
        }
        const deleted = result?.deleted || 0;
        if (deleted > 0) {
            logActivity({
                activity_type: "Activity Center Activity",
                reference_id: 0,
                title: "Activities Deleted",
                description: `${deleted} activity record(s) were deleted from Activity Center.`,
                module_name: "Activity Center",
                status: "Closed",
                priority: "High",
                created_by: req.user.id,
                assigned_to: null
            }).catch((error) => console.error("Activity bulk delete audit error:", error.message));
        }
        return res.json({
            success: true,
            deleted,
            message: `${deleted} activity record(s) deleted successfully`
        });
    });
};

// ======================================================
// SEND EMAIL TO THE ACTIVITY USER
// ======================================================

exports.sendActivityEmail = async (req, res) => {
    const { id } = req.params;
    const { subject, message } = req.body || {};

    if (!String(subject || "").trim() || !String(message || "").trim()) {
        return res.status(400).json({ success: false, message: "Subject and message are required." });
    }

    Activity.getDetails(id, req.user, async (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Failed to load activity recipient." });
        }
        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Activity recipient not found." });
        }

        const activity = rows[0];
        const recipient = activity.assigned_to_email || activity.created_by_email;
        const recipientName = activity.assigned_to_name || activity.created_by_name || "there";
        if (!recipient) {
            return res.status(400).json({ success: false, message: "No email address is available for this activity." });
        }

        try {
            const safeMessage = String(message).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
            await sendGenericEmail({
                to: recipient,
                subject: String(subject).trim(),
                text: String(message).trim(),
                html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>Hello ${recipientName},</p><p>${safeMessage}</p><hr/><p style="color:#64748b;font-size:12px">MIARCUS Activity Center • ${activity.module_name || "Activity"}</p></div>`
            });

            return res.json({ success: true, message: `Email sent successfully to ${recipient}.` });
        } catch (error) {
            console.error("Activity email error:", error);
            return res.status(500).json({ success: false, message: error.message || "Email could not be sent." });
        }
    });
};

// ======================================================
// CHAT MESSAGES
// ======================================================

exports.getActivityMessages = (req, res) => {
    Activity.getMessages(req.params.id, req.user, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Failed to fetch messages" });
        }
        res.json({ success: true, data: rows || [] });
    });
};

exports.addActivityMessage = (req, res) => {
    const message = String(req.body?.message || "").trim();
    if (!message) {
        return res.status(400).json({ success: false, message: "Message is required." });
    }

    Activity.hasAccess(req.params.id, req.user, (accessErr, allowed) => {
        if (accessErr) return res.status(500).json({ success: false, message: "Permission check failed" });
        if (!allowed) return res.status(403).json({ success: false, message: "Access Denied" });

        Activity.getDetails(req.params.id, req.user, (detailErr, rows) => {
            if (detailErr) return res.status(500).json({ success: false, message: "Failed to load recipient" });
            if (!rows.length) return res.status(404).json({ success: false, message: "Activity not found" });

            const receiverId = Number(rows[0].assigned_to || rows[0].created_by || 0) || null;
            Activity.addMessage(req.params.id, req.user.id, receiverId, message, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: "Failed to send message" });
                }
                res.status(201).json({ success: true, data: { id: result.insertId } });
            });
        });
    });
};

exports.markActivityMessagesRead = (req, res) => {
    Activity.markMessagesRead(req.params.id, req.user.id, (err) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to mark messages as read" });
        res.json({ success: true });
    });
};

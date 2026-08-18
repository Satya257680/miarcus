const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../services/notificationService");

const router = express.Router();

// ======================================================
// GET NOTIFICATIONS
// ======================================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.getNotifications(
            req.user.id,
            req.query.limit
        );

        const unreadCount = await Notification.getUnreadCount(
            req.user.id
        );

        return res.json({
            success: true,
            notifications: notifications.map((notification) => ({
                id: notification.id,
                title: notification.title,
                message: notification.message || "",
                type: notification.type,
                module: notification.module_name,
                reference_id: notification.entity_id,
                url: notification.link,
                is_read: Boolean(notification.is_read),
                created_at: notification.created_at
            })),
            unreadCount
        });
    } catch (error) {
        console.error("Get notifications:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load notifications"
        });
    }
});

// ======================================================
// UNREAD COUNT
// ======================================================
router.get("/unread-count", authMiddleware, async (req, res) => {
    try {
        const unreadCount = await Notification.getUnreadCount(
            req.user.id
        );

        return res.json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error("Unread notification count:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load unread count"
        });
    }
});

// ======================================================
// REAL-TIME SSE STREAM
// ======================================================
//
// EventSource cannot send an Authorization header.
// The frontend therefore sends the JWT as:
// /api/notifications/stream?token=...
//
// Notification.openStream() validates that token, checks the
// current user, registers the response and sends new events.
// ======================================================
router.get("/stream", (req, res) => {
    Promise.resolve(
        Notification.openStream(req, res)
    ).catch((error) => {
        console.error("Notification stream error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Unable to open notification stream"
            });
        }

        res.end();
    });
});

// ======================================================
// MARK ONE AS READ
// ======================================================
const markRead = async (req, res) => {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid notification id"
        });
    }

    try {
        await Notification.markRead(
            req.user.id,
            notificationId
        );

        return res.json({ success: true });
    } catch (error) {
        console.error("Mark notification read:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to mark notification as read"
        });
    }
};

// PUT is the primary method. PATCH is also accepted so older
// frontend builds do not break during deployment.
router.put("/:id/read", authMiddleware, markRead);
router.patch("/:id/read", authMiddleware, markRead);

// ======================================================
// MARK ALL AS READ
// ======================================================
const markAllRead = async (req, res) => {
    try {
        await Notification.markAllRead(req.user.id);
        return res.json({ success: true });
    } catch (error) {
        console.error("Mark all notifications read:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to mark notifications as read"
        });
    }
};

router.put("/read-all", authMiddleware, markAllRead);
router.patch("/read-all", authMiddleware, markAllRead);

module.exports = router;

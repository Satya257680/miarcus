const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const notificationService = require("../services/notificationService");

// ======================================================
// GET CURRENT USER NOTIFICATIONS
// ======================================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const notifications = await notificationService.getNotifications(
            req.user.id,
            req.query.limit
        );

        const unreadCount = await notificationService.getUnreadCount(req.user.id);

        res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({ success: false, message: "Failed to load notifications" });
    }
});

// ======================================================
// UNREAD COUNT
// ======================================================
router.get("/unread-count", authMiddleware, async (req, res) => {
    try {
        const unreadCount = await notificationService.getUnreadCount(req.user.id);
        res.json({ success: true, unreadCount });
    } catch (error) {
        console.error("Unread count error:", error);
        res.status(500).json({ success: false, message: "Failed to load unread count" });
    }
});

// ======================================================
// MARK ONE READ
// ======================================================
router.patch("/:id/read", authMiddleware, async (req, res) => {
    try {
        await notificationService.markRead(req.user.id, req.params.id);
        const unreadCount = await notificationService.getUnreadCount(req.user.id);
        res.json({ success: true, unreadCount });
    } catch (error) {
        console.error("Mark notification read error:", error);
        res.status(500).json({ success: false, message: "Failed to mark notification as read" });
    }
});

// ======================================================
// MARK ALL READ
// ======================================================
router.patch("/read-all", authMiddleware, async (req, res) => {
    try {
        await notificationService.markAllRead(req.user.id);
        res.json({ success: true, unreadCount: 0 });
    } catch (error) {
        console.error("Mark all notifications read error:", error);
        res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
    }
});

// ======================================================
// REAL-TIME SSE STREAM
// ======================================================
router.get("/stream", notificationService.openStream);

module.exports = router;

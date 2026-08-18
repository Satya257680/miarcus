const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../services/notificationService");

const router = express.Router();

// ======================================================
// GET NOTIFICATIONS
// ======================================================
router.get("/", authMiddleware, (req, res) => {
    Notification.getForUser(req.user.id, req.query.limit, (err, rows) => {
        if (err) {
            console.error("Get notifications:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to load notifications"
            });
        }

        Notification.getUnreadCount(req.user.id, (countErr, unreadCount) => {
            if (countErr) {
                console.error("Get notification count:", countErr);
                return res.status(500).json({
                    success: false,
                    message: "Unable to load notification count"
                });
            }

            res.json({
                success: true,
                notifications: rows.map(NotificationRow => ({
                    id: NotificationRow.id,
                    title: NotificationRow.title,
                    message: NotificationRow.message || "",
                    type: NotificationRow.type,
                    module: NotificationRow.module,
                    reference_id: NotificationRow.reference_id,
                    url: NotificationRow.url,
                    is_read: Boolean(NotificationRow.is_read),
                    created_at: NotificationRow.created_at
                })),
                unreadCount
            });
        });
    });
});

// ======================================================
// UNREAD COUNT
// ======================================================
router.get("/unread-count", authMiddleware, (req, res) => {
    Notification.getUnreadCount(req.user.id, (err, unreadCount) => {
        if (err) {
            console.error("Unread notification count:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to load unread count"
            });
        }

        res.json({ success: true, unreadCount });
    });
});

// ======================================================
// REAL-TIME SSE STREAM
// ======================================================
// EventSource cannot send Authorization headers, so the
// frontend uses fetch() with the normal Bearer token.
// ======================================================
router.get("/stream", (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authorization Token Missing or Invalid"
        });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Token Expired or Invalid"
        });
    }

    const userId = Number(decoded.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
            success: false,
            message: "Invalid user"
        });
    }

    db.query(
        "SELECT status FROM users WHERE id=? LIMIT 1",
        [userId],
        (err, rows) => {
            if (err) {
                console.error("Notification stream auth:", err);
                return res.status(500).end();
            }

            if (!rows.length || rows[0].status !== "Active") {
                return res.status(401).end();
            }

            res.status(200);
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders?.();

            Notification.addClient(userId, res);

            Notification.writeSSE(res, "connected", {
                connected: true,
                userId,
                at: new Date().toISOString()
            });

            // Keep the SSE connection alive through proxies/load balancers.
            const heartbeat = setInterval(() => {
                try {
                    res.write(`: heartbeat ${Date.now()}\n\n`);
                } catch (err) {
                    clearInterval(heartbeat);
                }
            }, 25000);

            req.on("close", () => {
                clearInterval(heartbeat);
            });
        }
    );
});

// ======================================================
// MARK ONE AS READ
// ======================================================
router.put("/:id/read", authMiddleware, (req, res) => {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid notification id"
        });
    }

    Notification.markRead(
        req.user.id,
        notificationId,
        (err) => {
            if (err) {
                console.error("Mark notification read:", err);
                return res.status(500).json({
                    success: false,
                    message: "Unable to mark notification as read"
                });
            }

            res.json({ success: true });
        }
    );
});

// ======================================================
// MARK ALL AS READ
// ======================================================
router.put("/read-all", authMiddleware, (req, res) => {
    Notification.markAllRead(req.user.id, (err) => {
        if (err) {
            console.error("Mark all notifications read:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to mark notifications as read"
            });
        }

        res.json({ success: true });
    });
});

module.exports = router;

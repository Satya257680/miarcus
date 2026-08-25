const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

const router = express.Router();

const query = (sql, params = []) => db.query(sql, params);

const isAdmin = (user) =>
    user?.is_admin === true ||
    user?.is_admin === 1 ||
    user?.is_admin === "1" ||
    user?.administrator === true ||
    user?.administrator === 1 ||
    user?.administrator === "1";

const getNotificationColumns = async () => {
    const columns = await query(
        `SHOW COLUMNS FROM notifications`
    );

    return new Set(
        (columns || []).map((row) => String(row.Field))
    );
};

const readStateExpression = (columns) => {
    if (columns.has("is_read")) {
        return "COALESCE(is_read, 0)";
    }

    if (columns.has("read_at")) {
        return "CASE WHEN read_at IS NULL THEN 0 ELSE 1 END";
    }

    if (columns.has("status")) {
        return "CASE WHEN LOWER(COALESCE(status, 'unread')) = 'read' THEN 1 ELSE 0 END";
    }

    return "0";
};

/*
  GET current user's notifications.
  The route is deliberately schema-aware so it works with the
  existing MIARCUS notification table without replacing the
  notification service.
*/
router.get(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            const columns = await getNotificationColumns();

            if (!columns.has("user_id")) {
                throw new Error(
                    "notifications.user_id column is missing."
                );
            }

            const readExpr = readStateExpression(columns);

            const rows = await query(
                `
                SELECT
                    n.*,
                    ${readExpr} AS notification_is_read
                FROM notifications n
                WHERE n.user_id = ?
                ORDER BY n.created_at DESC, n.id DESC
                LIMIT 100
                `,
                [req.user.id]
            );

            const unread = rows.filter(
                (row) => Number(row.notification_is_read) === 0
            ).length;

            return res.json({
                success: true,
                data: rows,
                unread,
            });
        } catch (error) {
            console.error("Notification center GET:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to load notifications.",
            });
        }
    }
);

/* ==========================================================
   MARK ONE READ
========================================================== */

router.patch(
    "/:id/read",
    authMiddleware,
    async (req, res) => {
        try {
            const columns = await getNotificationColumns();
            const id = Number(req.params.id);

            if (!id || !columns.has("user_id")) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid notification.",
                });
            }

            let sql = "";
            let params = [];

            if (columns.has("is_read")) {
                sql = `
                    UPDATE notifications
                    SET is_read = 1
                    WHERE id = ?
                      AND user_id = ?
                `;
                params = [id, req.user.id];
            } else if (columns.has("read_at")) {
                sql = `
                    UPDATE notifications
                    SET read_at = COALESCE(read_at, NOW())
                    WHERE id = ?
                      AND user_id = ?
                `;
                params = [id, req.user.id];
            } else if (columns.has("status")) {
                sql = `
                    UPDATE notifications
                    SET status = 'read'
                    WHERE id = ?
                      AND user_id = ?
                `;
                params = [id, req.user.id];
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Notification read state is not supported.",
                });
            }

            await query(sql, params);

            return res.json({
                success: true,
            });
        } catch (error) {
            console.error("Notification center mark read:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to mark notification as read.",
            });
        }
    }
);

/* ==========================================================
   CLEAR ONE
========================================================== */

router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {
        try {
            const columns = await getNotificationColumns();
            const id = Number(req.params.id);

            if (!id || !columns.has("user_id")) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid notification.",
                });
            }

            const result = await query(
                `
                DELETE FROM notifications
                WHERE id = ?
                  AND user_id = ?
                `,
                [id, req.user.id]
            );

            return res.json({
                success: true,
                deleted: Number(result?.affectedRows || 0),
            });
        } catch (error) {
            console.error("Notification center clear one:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to clear notification.",
            });
        }
    }
);

/* ==========================================================
   CLEAR ALL CURRENT USER NOTIFICATIONS
========================================================== */

router.delete(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            const columns = await getNotificationColumns();

            if (!columns.has("user_id")) {
                return res.status(400).json({
                    success: false,
                    message: "Notification user relationship is missing.",
                });
            }

            const result = await query(
                `
                DELETE FROM notifications
                WHERE user_id = ?
                `,
                [req.user.id]
            );

            return res.json({
                success: true,
                deleted: Number(result?.affectedRows || 0),
                message: "All notifications cleared.",
            });
        } catch (error) {
            console.error("Notification center clear all:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to clear all notifications.",
            });
        }
    }
);

/* ==========================================================
   MARK ALL READ
========================================================== */

router.patch(
    "/read-all",
    authMiddleware,
    async (req, res) => {
        try {
            const columns = await getNotificationColumns();

            let sql = "";

            if (columns.has("is_read")) {
                sql = `
                    UPDATE notifications
                    SET is_read = 1
                    WHERE user_id = ?
                `;
            } else if (columns.has("read_at")) {
                sql = `
                    UPDATE notifications
                    SET read_at = COALESCE(read_at, NOW())
                    WHERE user_id = ?
                `;
            } else if (columns.has("status")) {
                sql = `
                    UPDATE notifications
                    SET status = 'read'
                    WHERE user_id = ?
                `;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Notification read state is not supported.",
                });
            }

            await query(sql, [req.user.id]);

            return res.json({
                success: true,
            });
        } catch (error) {
            console.error("Notification center read all:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to mark notifications as read.",
            });
        }
    }
);

module.exports = router;

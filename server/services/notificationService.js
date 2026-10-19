const db = require("../config/db");
const { authenticateLoginToken } = require("../utils/accessToken");
const {
    issueStreamTicket,
    authenticateStreamTicket,
    legacyQueryTokenAllowed,
} = require("../utils/streamTicket");
const { openSseStream } = require("../utils/sseStream");

// ======================================================
// MIARCUS REAL-TIME NOTIFICATION SERVICE
// Persistent notifications live in MySQL. SSE clients are
// kept in memory per Node process and receive new records
// immediately after they are committed to MySQL.
// ======================================================

const clients = new Map(); // userId -> Set(response)

const normalizeId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            module_name VARCHAR(100) NULL,
            action_name VARCHAR(100) NULL,
            entity_id BIGINT NULL,
            link VARCHAR(500) NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'info',
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (id),
            INDEX idx_notifications_user_read (user_id, is_read, id),
            INDEX idx_notifications_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

function serialize(row) {
    if (!row) return null;
    return {
        id: Number(row.id),
        user_id: Number(row.user_id),
        title: row.title,
        message: row.message,
        module_name: row.module_name,
        action_name: row.action_name,
        entity_id: row.entity_id == null ? null : Number(row.entity_id),
        link: row.link,
        type: row.type,
        is_read: Boolean(row.is_read),
        created_at: row.created_at,
        read_at: row.read_at
    };
}

function broadcast(userId, notification) {
    const id = normalizeId(userId);
    if (!id) return;

    const userClients = clients.get(id);
    if (!userClients || userClients.size === 0) return;

    for (const stream of [...userClients]) {
        // stream.send() returns false (and closes itself) when the
        // connection is gone; the onClose hook removes it from the map.
        if (!stream.send("notification", notification)) {
            userClients.delete(stream);
        }
    }
}

function addClient(userId, stream) {
    const id = normalizeId(userId);
    if (!id) return () => {};

    if (!clients.has(id)) clients.set(id, new Set());
    clients.get(id).add(stream);

    return () => removeClient(id, stream);
}

function removeClient(userId, stream) {
    const id = normalizeId(userId);
    if (!id) return;

    const userClients = clients.get(id);
    if (!userClients) return;

    userClients.delete(stream);
    if (userClients.size === 0) clients.delete(id);
}

async function createNotification(data = {}) {
    const userId = normalizeId(data.user_id);
    if (!userId) throw new Error("Notification user_id is required");

    const title = String(data.title || "MIARCUS Notification").slice(0, 255);
    const message = String(data.message || "You have a new notification.");
    const moduleName = data.module_name ? String(data.module_name).slice(0, 100) : null;
    const actionName = data.action_name ? String(data.action_name).slice(0, 100) : null;
    const entityId = normalizeId(data.entity_id);
    const link = data.link ? String(data.link).slice(0, 500) : null;
    const type = String(data.type || "info").slice(0, 50);

    /*
     * db.query() in MIARCUS returns only result rows, not the
     * mysql2 ResultSetHeader. Use one native connection here so
     * insertId is guaranteed to belong to this INSERT.
     */
    const connection = await db.getConnection();

    try {
        const [result] = await connection.query(`
            INSERT INTO notifications
            (user_id, title, message, module_name, action_name, entity_id, link, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, title, message, moduleName, actionName, entityId, link, type]);

        const [rows] = await connection.query(
            "SELECT * FROM notifications WHERE id = ? LIMIT 1",
            [result.insertId]
        );

        const notification = serialize(rows[0]);
        broadcast(userId, notification);
        return notification;
    } finally {
        connection.release();
    }
}

async function createForUsers(userIds, data = {}) {
    const uniqueIds = [...new Set((userIds || []).map(normalizeId).filter(Boolean))];
    const created = [];

    for (const userId of uniqueIds) {
        try {
            created.push(await createNotification({ ...data, user_id: userId }));
        } catch (error) {
            console.error("Notification create error:", error.message);
        }
    }

    return created;
}

async function getNotifications(userId, limit = 30) {
    const id = normalizeId(userId);
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

    return db.query(`
        SELECT *
        FROM notifications
        WHERE user_id = ?
          AND COALESCE(module_name, '') NOT IN ('System', 'Employee Location')
        ORDER BY id DESC
        LIMIT ${safeLimit}
    `, [id]).then(rows => rows.map(serialize));
}

async function getUnreadCount(userId) {
    const id = normalizeId(userId);
    const rows = await db.query(`
        SELECT COUNT(*) AS unread_count
        FROM notifications
        WHERE user_id = ?
          AND is_read = 0
          AND COALESCE(module_name, '') NOT IN ('System', 'Employee Location')
    `, [id]);
    return Number(rows[0]?.unread_count || 0);
}

async function markRead(userId, notificationId) {
    const uid = normalizeId(userId);
    const nid = normalizeId(notificationId);

    await db.query(`
        UPDATE notifications
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    `, [nid, uid]);

    return { success: true };
}

async function markAllRead(userId) {
    const uid = normalizeId(userId);

    await db.query(`
        UPDATE notifications
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND is_read = 0
    `, [uid]);

    return { success: true };
}

async function openStream(req, res) {
    // Preferred: a 60-second, single-use, notifications-only ticket
    // (POST /api/notifications/stream-token). The long-lived login JWT is
    // accepted in the query string ONLY when SSE_ALLOW_LOGIN_TOKEN=true
    // (temporary rollback switch for old cached frontends).
    let userId = null;

    const ticket = String(req.query.ticket || "").trim();
    if (ticket) {
        const session = await authenticateStreamTicket(ticket, "notifications");
        if (session) userId = Number(session.user.id);
    } else if (req.query.token && legacyQueryTokenAllowed()) {
        // Login token only, active + activated user, current token version.
        const session = await authenticateLoginToken(req.query.token);
        if (session) userId = Number(session.decoded.id);
    }

    if (!userId) {
        res.setHeader("Cache-Control", "no-store");
        return res.status(401).end();
    }

    let remove = () => {};
    const stream = openSseStream(req, res, {
        channel: "notifications",
        userId,
        onClose: () => remove(),
    });
    remove = addClient(userId, stream);

    stream.send("connected", { connected: true });
}

/** Issue a notifications stream ticket for an authenticated request. */
function issueTicket(user) {
    return issueStreamTicket({
        userId: user.id,
        tokenVersion: user.tokenVersion,
        purpose: "notifications",
    });
}

module.exports = {
    ensureTable,
    createNotification,
    createForUsers,
    getNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    openStream,
    issueTicket
};

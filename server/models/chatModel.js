const db = require("../config/db");

const normalizeJson = (value) => {
    if (value == null) return null;
    if (typeof value === "string") {
        try { return JSON.parse(value); } catch { return null; }
    }
    return value;
};

const ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            conversation_type VARCHAR(20) NOT NULL DEFAULT 'direct',
            store_id INT NULL,
            title VARCHAR(255) NULL,
            created_by INT NULL,
            deleted_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_chat_conv_store (store_id),
            INDEX idx_chat_conv_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    try {
        await db.query(`ALTER TABLE chat_conversations ADD COLUMN deleted_at DATETIME NULL AFTER created_by`);
    } catch (error) {
        if (!/duplicate column|1060/i.test(String(error.message || error))) throw error;
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_conversation_members (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            conversation_id BIGINT NOT NULL,
            user_id INT NOT NULL,
            joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_read_message_id BIGINT NULL,
            UNIQUE KEY uq_chat_member (conversation_id, user_id),
            INDEX idx_chat_member_user (user_id),
            INDEX idx_chat_member_conversation (conversation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            conversation_id BIGINT NOT NULL,
            sender_id INT NOT NULL,
            message_type VARCHAR(30) NOT NULL DEFAULT 'text',
            message_text TEXT NULL,
            attachment_url VARCHAR(700) NULL,
            attachment_name VARCHAR(255) NULL,
            attachment_mime VARCHAR(150) NULL,
            reply_to_id BIGINT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            edited_at DATETIME NULL,
            deleted_at DATETIME NULL,
            INDEX idx_chat_message_conversation (conversation_id, id),
            INDEX idx_chat_message_sender (sender_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_message_user_deletions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            message_id BIGINT NOT NULL,
            user_id INT NOT NULL,
            deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_chat_message_user_delete (message_id, user_id),
            INDEX idx_chat_message_user_delete_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_conversation_user_hides (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            conversation_id BIGINT NOT NULL,
            user_id INT NOT NULL,
            hidden_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_chat_conversation_user_hide (conversation_id, user_id),
            INDEX idx_chat_conversation_user_hide_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_reactions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            message_id BIGINT NOT NULL,
            user_id INT NOT NULL,
            reaction VARCHAR(20) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_chat_reaction (message_id, user_id, reaction),
            INDEX idx_chat_reaction_message (message_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_presence (
            user_id INT PRIMARY KEY,
            status VARCHAR(20) NOT NULL DEFAULT 'offline',
            last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_store_managers (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            store_id INT NOT NULL,
            user_id INT NOT NULL,
            assigned_by INT NULL,
            assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_chat_store_manager (store_id),
            INDEX idx_chat_manager_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_calls (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            conversation_id BIGINT NOT NULL,
            store_id INT NULL,
            caller_id INT NOT NULL,
            callee_id INT NOT NULL,
            call_type VARCHAR(20) NOT NULL DEFAULT 'audio',
            status VARCHAR(20) NOT NULL DEFAULT 'ringing',
            started_at DATETIME NULL,
            ended_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_chat_call_conversation (conversation_id),
            INDEX idx_chat_call_store (store_id),
            INDEX idx_chat_call_callee (callee_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Older deployments may already have chat_calls without store_id.
    // Add it safely so call history can remain store-aware.
    try {
        await db.query(`ALTER TABLE chat_calls ADD COLUMN store_id INT NULL AFTER conversation_id`);
    } catch (error) {
        if (!/duplicate column|1060/i.test(String(error.message || error))) throw error;
    }

    try {
        await db.query(`ALTER TABLE chat_calls ADD INDEX idx_chat_call_store (store_id)`);
    } catch (error) {
        if (!/duplicate key name|1061/i.test(String(error.message || error))) throw error;
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_call_signals (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            call_id BIGINT NOT NULL,
            sender_id INT NOT NULL,
            signal_type VARCHAR(30) NOT NULL,
            payload_json LONGTEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_chat_signal_call (call_id, id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
};

const getUserStores = async (userId) => {
    const rows = await db.query(
        `SELECT DISTINCT store_id FROM user_stores WHERE user_id = ?`,
        [userId]
    );
    return rows.map(row => Number(row.store_id)).filter(Boolean);
};

const isAdmin = (user) =>
    user?.is_admin === true ||
    user?.is_admin === 1 ||
    user?.is_admin === "1" ||
    user?.administrator === true ||
    user?.administrator === 1 ||
    user?.administrator === "1";

const getUsersForStore = async (storeId, excludeUserId = null) => {
    const params = [storeId];
    let exclude = "";
    if (excludeUserId) {
        exclude = "AND u.id <> ?";
        params.push(excludeUserId);
    }

    return db.query(`
        SELECT
            u.id, u.name, u.email, u.profile_photo,
            u.department_id, u.designation_id,
            d.department_name AS department,
            dg.designation_name AS designation,
            CASE
                WHEN p.last_seen >= (CURRENT_TIMESTAMP - INTERVAL 2 MINUTE)
                THEN COALESCE(p.status, 'offline')
                ELSE 'offline'
            END AS presence_status,
            p.last_seen
        FROM users u
        LEFT JOIN user_stores us
            ON us.user_id = u.id
           AND us.store_id = ?
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN designations dg ON dg.id = u.designation_id
        LEFT JOIN chat_presence p ON p.user_id = u.id
        WHERE u.status = 'Active'
          AND (us.store_id IS NOT NULL OR u.is_admin = 1)
          ${exclude}
        GROUP BY u.id
        ORDER BY CASE WHEN u.is_admin = 1 THEN 0 ELSE 1 END, u.name ASC
    `, params);
};

const getAllActiveUsers = async (excludeUserId = null) => {
    const params = [];
    const exclude = excludeUserId ? "AND u.id <> ?" : "";

    if (excludeUserId) params.push(excludeUserId);

    return db.query(`
        SELECT
            u.id, u.name, u.email, u.profile_photo,
            u.department_id, u.designation_id, u.is_admin,
            d.department_name AS department,
            dg.designation_name AS designation,
            CASE
                WHEN p.last_seen >= (CURRENT_TIMESTAMP - INTERVAL 2 MINUTE)
                THEN COALESCE(p.status, 'offline')
                ELSE 'offline'
            END AS presence_status,
            p.last_seen,
            GROUP_CONCAT(DISTINCT s.store_name ORDER BY s.store_name SEPARATOR ', ') AS store_names
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN designations dg ON dg.id = u.designation_id
        LEFT JOIN chat_presence p ON p.user_id = u.id
        LEFT JOIN user_stores us ON us.user_id = u.id
        LEFT JOIN stores s ON s.id = us.store_id
        WHERE u.status = 'Active' ${exclude}
        GROUP BY u.id
        ORDER BY CASE WHEN u.is_admin = 1 THEN 0 ELSE 1 END, u.name ASC
    `, params);
};

const getUserById = async (id) => {
    const rows = await db.query(`
        SELECT
            u.id, u.name, u.email, u.profile_photo,
            u.department_id, u.designation_id, u.status, u.is_admin,
            d.department_name AS department,
            dg.designation_name AS designation
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN designations dg ON dg.id = u.designation_id
        WHERE u.id = ? LIMIT 1
    `, [id]);
    return rows[0] || null;
};

const userSharesStore = async (userA, userB, storeId = null) => {
    const params = [userA, userB];
    let storeClause = "";
    if (storeId) {
        storeClause = "AND a.store_id = ?";
        params.push(storeId);
    }

    const rows = await db.query(`
        SELECT DISTINCT a.store_id
        FROM user_stores a
        INNER JOIN user_stores b
            ON b.store_id = a.store_id
           AND b.user_id = ?
        WHERE a.user_id = ? ${storeClause}
        LIMIT 20
    `, params);
    return rows.map(r => Number(r.store_id)).filter(Boolean);
};

const findDirectConversation = async (userA, userB, storeId) => {
    const rows = await db.query(`
        SELECT c.id
        FROM chat_conversations c
        INNER JOIN chat_conversation_members m1
            ON m1.conversation_id = c.id AND m1.user_id = ?
        INNER JOIN chat_conversation_members m2
            ON m2.conversation_id = c.id AND m2.user_id = ?
        WHERE c.conversation_type = 'direct'
          AND c.store_id = ?
          AND c.deleted_at IS NULL
        LIMIT 1
    `, [userA, userB, storeId]);
    return rows[0] || null;
};

const createConversation = async ({ type = "direct", storeId = null, title = null, createdBy, memberIds = [] }) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(`
            INSERT INTO chat_conversations
            (conversation_type, store_id, title, created_by)
            VALUES (?, ?, ?, ?)
        `, [type, storeId || null, title || null, createdBy || null]);

        const conversationId = result.insertId;
        const uniqueMembers = [...new Set(memberIds.map(Number).filter(Boolean))];

        if (uniqueMembers.length) {
            await connection.query(`
                INSERT INTO chat_conversation_members (conversation_id, user_id)
                VALUES ?
            `, [uniqueMembers.map(userId => [conversationId, userId])]);
        }

        await connection.commit();
        return conversationId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getConversation = async (conversationId) => {
    const rows = await db.query(`
        SELECT
            c.*,
            s.store_name,
            s.store_code
        FROM chat_conversations c
        LEFT JOIN stores s ON s.id = c.store_id
        WHERE c.id = ? AND c.deleted_at IS NULL
        LIMIT 1
    `, [conversationId]);

    if (!rows[0]) return null;

    const members = await db.query(`
        SELECT
            u.id, u.name, u.email, u.profile_photo,
            u.department_id, u.designation_id,
            d.department_name AS department,
            dg.designation_name AS designation,
            p.status AS presence_status,
            p.last_seen
        FROM chat_conversation_members m
        INNER JOIN users u ON u.id = m.user_id
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN designations dg ON dg.id = u.designation_id
        LEFT JOIN chat_presence p ON p.user_id = u.id
        WHERE m.conversation_id = ? AND u.status = 'Active'
        ORDER BY u.name ASC
    `, [conversationId]);

    return { ...rows[0], members };
};

const getConversationsForUser = async (userId, admin = false, storeId = null) => {
    // Parameters are ordered to match the SELECT subqueries first, then WHERE.
    const paramsBeforeWhere = [userId, userId, userId, userId, userId, userId];
    const params = [...paramsBeforeWhere, userId];
    const where = [
        `NOT EXISTS (
            SELECT 1
            FROM chat_conversation_user_hides h
            WHERE h.conversation_id = c.id
              AND h.user_id = ?
              AND h.hidden_at >= COALESCE(lm.created_at, c.updated_at)
        )`,
        `c.deleted_at IS NULL`
    ];

    if (!admin) {
        where.push(`EXISTS (
            SELECT 1 FROM chat_conversation_members mx
            WHERE mx.conversation_id = c.id AND mx.user_id = ?
        )`);
        params.push(userId);
    }

    if (storeId) {
        where.push("c.store_id = ?");
        params.push(storeId);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    return db.query(`
        SELECT
            c.id, c.conversation_type, c.store_id, c.title, c.created_by,
            c.updated_at, s.store_name, s.store_code,
            lm.id AS last_message_id,
            lm.message_type AS last_message_type,
            lm.message_text AS last_message_text,
            lm.created_at AS last_message_at,
            sender.name AS last_sender_name,
            (
                SELECT u2.name
                FROM chat_conversation_members cm2
                INNER JOIN users u2 ON u2.id = cm2.user_id
                WHERE cm2.conversation_id = c.id
                  AND cm2.user_id <> ?
                ORDER BY cm2.id ASC
                LIMIT 1
            ) AS direct_name,
            (
                SELECT u2.profile_photo
                FROM chat_conversation_members cm2
                INNER JOIN users u2 ON u2.id = cm2.user_id
                WHERE cm2.conversation_id = c.id
                  AND cm2.user_id <> ?
                ORDER BY cm2.id ASC
                LIMIT 1
            ) AS direct_photo,
            (
                SELECT COUNT(*)
                FROM chat_messages um
                WHERE um.conversation_id = c.id
                  AND um.deleted_at IS NULL
                  AND um.sender_id <> ?
                  AND um.id > COALESCE((
                      SELECT cmr.last_read_message_id
                      FROM chat_conversation_members cmr
                      WHERE cmr.conversation_id = c.id AND cmr.user_id = ?
                      LIMIT 1
                  ), 0)
                  AND NOT EXISTS (
                      SELECT 1 FROM chat_message_user_deletions md
                      WHERE md.message_id = um.id AND md.user_id = ?
                  )
            ) AS unread_count,
            (
                SELECT COUNT(*)
                FROM chat_conversation_members cm
                WHERE cm.conversation_id = c.id
            ) AS member_count
        FROM chat_conversations c
        LEFT JOIN stores s ON s.id = c.store_id
        LEFT JOIN chat_messages lm ON lm.id = (
            SELECT MAX(m2.id)
            FROM chat_messages m2
            WHERE m2.conversation_id = c.id
              AND m2.deleted_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM chat_message_user_deletions md2
                  WHERE md2.message_id = m2.id AND md2.user_id = ?
              )
        )
        LEFT JOIN users sender ON sender.id = lm.sender_id
        ${whereSql}
        ORDER BY COALESCE(lm.created_at, c.updated_at) DESC, c.id DESC
        LIMIT 200
    `, params);
};

const getMessages = async (conversationId, limit = 100, beforeId = null, userId = null) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const params = [conversationId];
    const userDeleteClause = userId
        ? `AND NOT EXISTS (
            SELECT 1 FROM chat_message_user_deletions md
            WHERE md.message_id = m.id AND md.user_id = ?
        )`
        : "";
    if (userId) params.push(userId);
    const beforeClause = beforeId ? "AND m.id < ?" : "";
    if (beforeId) params.push(beforeId);

    const rows = await db.query(`
        SELECT
            m.*,
            u.name AS sender_name,
            u.profile_photo AS sender_photo,
            r.message_text AS reply_text,
            rr.name AS reply_sender_name,
            (
                SELECT COUNT(*)
                FROM chat_conversation_members cmr
                WHERE cmr.conversation_id = m.conversation_id
                  AND cmr.user_id <> m.sender_id
                  AND cmr.last_read_message_id >= m.id
            ) AS read_count
        FROM chat_messages m
        INNER JOIN users u ON u.id = m.sender_id
        LEFT JOIN chat_messages r ON r.id = m.reply_to_id
        LEFT JOIN users rr ON rr.id = r.sender_id
        WHERE m.conversation_id = ?
          ${userDeleteClause}
          ${beforeClause}
        ORDER BY m.id DESC
        LIMIT ${safeLimit}
    `, params);

    const ordered = rows.reverse();

    for (const message of ordered) {
        message.reactions = await db.query(`
            SELECT reaction, COUNT(*) AS count
            FROM chat_reactions
            WHERE message_id = ?
            GROUP BY reaction
            ORDER BY count DESC
        `, [message.id]);
    }

    return ordered;
};

const createMessage = async ({
    conversationId, senderId, messageType = "text",
    messageText = "", attachmentUrl = null,
    attachmentName = null, attachmentMime = null, replyToId = null
}) => {
    const result = await db.query(`
        INSERT INTO chat_messages
        (conversation_id, sender_id, message_type, message_text, attachment_url, attachment_name, attachment_mime, reply_to_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        conversationId,
        senderId,
        messageType,
        messageText || null,
        attachmentUrl,
        attachmentName,
        attachmentMime,
        replyToId || null
    ]);

    await db.query(`
        UPDATE chat_conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
    `, [conversationId]);

    await db.query(`
        DELETE FROM chat_conversation_user_hides
        WHERE conversation_id = ? AND user_id = ?
    `, [conversationId, senderId]);

    const rows = await db.query(`
        SELECT
            m.*,
            u.name AS sender_name,
            u.profile_photo AS sender_photo
        FROM chat_messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE m.id = ?
        LIMIT 1
    `, [result.insertId]);

    return rows[0] || null;
};

const getConversationMemberIds = async (conversationId) => {
    const rows = await db.query(
        `SELECT user_id FROM chat_conversation_members WHERE conversation_id = ?`,
        [conversationId]
    );
    return rows.map(r => Number(r.user_id)).filter(Boolean);
};

const isConversationMember = async (conversationId, userId) => {
    const rows = await db.query(
        `SELECT id FROM chat_conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1`,
        [conversationId, userId]
    );
    return rows.length > 0;
};

const markRead = async (conversationId, userId, messageId) => {
    await db.query(`
        UPDATE chat_conversation_members
        SET last_read_message_id = ?
        WHERE conversation_id = ? AND user_id = ?
    `, [messageId || null, conversationId, userId]);
};

const updateMessage = async (messageId, userId, text) => {
    const rows = await db.query(`
        SELECT id FROM chat_messages
        WHERE id = ? AND sender_id = ? AND deleted_at IS NULL
        LIMIT 1
    `, [messageId, userId]);

    if (!rows.length) return null;

    await db.query(`
        UPDATE chat_messages
        SET message_text = ?, edited_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [text, messageId]);

    return db.query(`
        SELECT m.*, u.name AS sender_name, u.profile_photo AS sender_photo
        FROM chat_messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE m.id = ? LIMIT 1
    `, [messageId]).then(r => r[0] || null);
};

const deleteMessageForMe = async (messageId, userId) => {
    const rows = await db.query(`
        SELECT id FROM chat_messages WHERE id = ? LIMIT 1
    `, [messageId]);
    if (!rows.length) return false;

    await db.query(`
        INSERT INTO chat_message_user_deletions (message_id, user_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP
    `, [messageId, userId]);
    return true;
};

const deleteMessageForEveryone = async (messageId, userId) => {
    const rows = await db.query(`
        SELECT id FROM chat_messages
        WHERE id = ? AND sender_id = ? AND deleted_at IS NULL
        LIMIT 1
    `, [messageId, userId]);

    if (!rows.length) return false;

    await db.query(`
        UPDATE chat_messages
        SET deleted_at = CURRENT_TIMESTAMP, message_text = NULL,
            attachment_url = NULL, attachment_name = NULL, attachment_mime = NULL,
            message_type = 'deleted'
        WHERE id = ?
    `, [messageId]);

    await db.query(`DELETE FROM chat_reactions WHERE message_id = ?`, [messageId]);
    return true;
};

const clearConversationForMe = async (conversationId, userId) => {
    await db.query(`
        INSERT INTO chat_message_user_deletions (message_id, user_id)
        SELECT id, ?
        FROM chat_messages
        WHERE conversation_id = ?
        ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP
    `, [userId, conversationId]);
    return true;
};

const hideConversationForMe = async (conversationId, userId) => {
    await db.query(`
        INSERT INTO chat_conversation_user_hides (conversation_id, user_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE hidden_at = CURRENT_TIMESTAMP
    `, [conversationId, userId]);
    return true;
};

const deleteConversationForEveryone = async (conversationId) => {
    const result = await db.query(`
        UPDATE chat_conversations
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
    `, [conversationId]);
    return Number(result.affectedRows || 0) > 0;
};

const toggleReaction = async (messageId, userId, reaction) => {
    const existing = await db.query(`
        SELECT id FROM chat_reactions
        WHERE message_id = ? AND user_id = ? AND reaction = ?
        LIMIT 1
    `, [messageId, userId, reaction]);

    if (existing.length) {
        await db.query(`DELETE FROM chat_reactions WHERE id = ?`, [existing[0].id]);
        return false;
    }

    await db.query(`
        INSERT INTO chat_reactions (message_id, user_id, reaction)
        VALUES (?, ?, ?)
    `, [messageId, userId, reaction]);

    return true;
};

const updatePresence = async (userId, status = "online") => {
    const safeStatus = ["online", "offline", "away", "busy"].includes(status) ? status : "online";
    await db.query(`
        INSERT INTO chat_presence (user_id, status, last_seen)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            last_seen = CURRENT_TIMESTAMP
    `, [userId, safeStatus]);
};

const getPresence = async (userId) => {
    const rows = await db.query(`SELECT * FROM chat_presence WHERE user_id = ? LIMIT 1`, [userId]);
    return rows[0] || { user_id: userId, status: "offline", last_seen: null };
};

const createCall = async ({ conversationId, storeId, callerId, calleeId, callType }) => {
    const result = await db.query(`
        INSERT INTO chat_calls (conversation_id, store_id, caller_id, callee_id, call_type, status)
        VALUES (?, ?, ?, ?, ?, 'ringing')
    `, [conversationId, storeId || null, callerId, calleeId, callType]);

    const rows = await db.query(`
        SELECT c.*, cu.name caller_name, ru.name callee_name
        FROM chat_calls c
        INNER JOIN users cu ON cu.id = c.caller_id
        INNER JOIN users ru ON ru.id = c.callee_id
        WHERE c.id = ? LIMIT 1
    `, [result.insertId]);

    return rows[0] || null;
};

const getCall = async (callId) => {
    const rows = await db.query(`
        SELECT c.*, cu.name caller_name, ru.name callee_name
        FROM chat_calls c
        INNER JOIN users cu ON cu.id = c.caller_id
        INNER JOIN users ru ON ru.id = c.callee_id
        WHERE c.id = ? LIMIT 1
    `, [callId]);
    return rows[0] || null;
};

const addSignal = async ({ callId, senderId, signalType, payload }) => {
    const result = await db.query(`
        INSERT INTO chat_call_signals
        (call_id, sender_id, signal_type, payload_json)
        VALUES (?, ?, ?, ?)
    `, [callId, senderId, signalType, JSON.stringify(payload || {})]);

    return {
        id: result.insertId,
        call_id: callId,
        sender_id: senderId,
        signal_type: signalType,
        payload
    };
};

const getSignals = async (callId, userId, afterId = 0) => {
    const rows = await db.query(`
        SELECT id, call_id, sender_id, signal_type, payload_json, created_at
        FROM chat_call_signals
        WHERE call_id = ? AND id > ? AND sender_id <> ?
        ORDER BY id ASC
        LIMIT 100
    `, [callId, Number(afterId) || 0, userId]);

    return rows.map(row => ({
        ...row,
        payload: normalizeJson(row.payload_json) || {}
    }));
};

const updateCall = async (callId, status) => {
    const allowed = ["ringing", "accepted", "rejected", "ended", "missed"];
    const safeStatus = allowed.includes(status) ? status : "ended";

    await db.query(`
        UPDATE chat_calls
        SET status = ?,
            started_at = CASE WHEN ? = 'accepted' AND started_at IS NULL THEN CURRENT_TIMESTAMP ELSE started_at END,
            ended_at = CASE WHEN ? IN ('ended','rejected','missed') THEN CURRENT_TIMESTAMP ELSE ended_at END
        WHERE id = ?
    `, [safeStatus, safeStatus, safeStatus, callId]);

    return getCall(callId);
};

const getCallHistory = async (userId, admin = false, storeId = null, limit = 100) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 300);
    const params = [];
    const where = [];

    if (!admin) {
        where.push(`(c.caller_id = ? OR c.callee_id = ?)`);
        params.push(userId, userId);
        where.push(`c.store_id IN (
            SELECT us.store_id
            FROM user_stores us
            WHERE us.user_id = ?
        )`);
        params.push(userId);
    }

    if (storeId) {
        where.push(`c.store_id = ?`);
        params.push(storeId);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    return db.query(`
        SELECT
            c.id,
            c.conversation_id,
            c.store_id,
            s.store_name,
            s.store_code,
            c.caller_id,
            c.callee_id,
            caller.name AS caller_name,
            caller.email AS caller_email,
            caller.profile_photo AS caller_photo,
            callee.name AS callee_name,
            callee.email AS callee_email,
            callee.profile_photo AS callee_photo,
            c.call_type,
            c.status,
            c.started_at,
            c.ended_at,
            c.created_at,
            CASE
                WHEN c.started_at IS NOT NULL AND c.ended_at IS NOT NULL
                THEN TIMESTAMPDIFF(SECOND, c.started_at, c.ended_at)
                ELSE NULL
            END AS duration_seconds
        FROM chat_calls c
        LEFT JOIN stores s ON s.id = c.store_id
        INNER JOIN users caller ON caller.id = c.caller_id
        INNER JOIN users callee ON callee.id = c.callee_id
        ${whereSql}
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT ${safeLimit}
    `, params);
};

const getStoreManager = async (storeId) => {
    const rows = await db.query(`
        SELECT
            m.store_id,
            m.user_id,
            u.name, u.email, u.profile_photo
        FROM chat_store_managers m
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.store_id = ?
        LIMIT 1
    `, [storeId]);
    return rows[0] || null;
};

const getAdminStoreOverview = async () => db.query(`
    SELECT
        s.id, s.store_name, s.store_code, s.city, s.state, s.status,
        m.user_id AS manager_id,
        u.name AS manager_name,
        u.email AS manager_email
    FROM stores s
    LEFT JOIN chat_store_managers m ON m.store_id = s.id
    LEFT JOIN users u ON u.id = m.user_id
    ORDER BY s.store_name ASC
`);

const assignStoreManager = async (storeId, userId, assignedBy) => {
    if (!userId) {
        await db.query(`DELETE FROM chat_store_managers WHERE store_id = ?`, [storeId]);
        return null;
    }

    const eligible = await db.query(`
        SELECT u.id
        FROM users u
        INNER JOIN user_stores us ON us.user_id = u.id AND us.store_id = ?
        WHERE u.id = ? AND u.status = 'Active'
        LIMIT 1
    `, [storeId, userId]);

    if (!eligible.length) {
        const error = new Error("The selected manager must be an active user assigned to this store.");
        error.statusCode = 400;
        throw error;
    }

    await db.query(`
        INSERT INTO chat_store_managers (store_id, user_id, assigned_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            assigned_by = VALUES(assigned_by),
            assigned_at = CURRENT_TIMESTAMP
    `, [storeId, userId, assignedBy || null]);

    return getStoreManager(storeId);
};

module.exports = {
    ensureTables,
    getUserStores,
    isAdmin,
    getUsersForStore,
    getAllActiveUsers,
    getUserById,
    userSharesStore,
    findDirectConversation,
    createConversation,
    getConversation,
    getConversationsForUser,
    getMessages,
    createMessage,
    getConversationMemberIds,
    isConversationMember,
    markRead,
    updateMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    hideConversationForMe,
    clearConversationForMe,
    deleteConversationForEveryone,
    toggleReaction,
    updatePresence,
    getPresence,
    createCall,
    getCall,
    getCallHistory,
    addSignal,
    getSignals,
    updateCall,
    getStoreManager,
    getAdminStoreOverview,
    assignStoreManager
};

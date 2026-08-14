const db = require("../config/db");

const createTables = (callback) => {
    const sql = `
        CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NULL,
            attachment_original_name VARCHAR(255) NULL,
            attachment_path VARCHAR(500) NULL,
            audience ENUM('everyone','managers','users','specific') NOT NULL DEFAULT 'everyone',
            status ENUM('draft','published') NOT NULL DEFAULT 'published',
            is_pinned TINYINT(1) NOT NULL DEFAULT 0,
            published_at DATETIME NULL,
            created_by INT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_announcements_published (status, published_at),
            INDEX idx_announcements_pinned (is_pinned)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS announcement_recipients (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            announcement_id INT NOT NULL,
            user_id INT NOT NULL,
            in_app_status ENUM('delivered','read') NOT NULL DEFAULT 'delivered',
            delivered_at DATETIME NULL,
            read_at DATETIME NULL,
            email_status ENUM('pending','sent','delivered','failed') NOT NULL DEFAULT 'pending',
            email_sent_at DATETIME NULL,
            email_delivered_at DATETIME NULL,
            email_failed_at DATETIME NULL,
            email_failure_reason VARCHAR(1000) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_announcement_recipient (announcement_id, user_id),
            INDEX idx_recipient_user (user_id),
            CONSTRAINT fk_announcement_recipient_announcement
                FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS announcement_email_logs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            announcement_id INT NOT NULL,
            recipient_id BIGINT NULL,
            user_id INT NULL,
            email VARCHAR(255) NULL,
            status ENUM('sent','delivered','failed') NOT NULL,
            failure_reason VARCHAR(1000) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email_announcement (announcement_id),
            INDEX idx_email_recipient (recipient_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    // mysql2 does not allow multiple statements unless configured.
    const statements = sql.split(/;\s*(?=CREATE TABLE)/).map(s => s.trim()).filter(Boolean);
    let i = 0;
    const next = (err) => {
        if (err || i >= statements.length) return callback(err || null);
        db.query(statements[i++] + ";", next);
    };
    next();
};

const getAll = (userId, { search = "", startDate = "", endDate = "" }, callback) => {
    const params = [userId];
    let where = `
        WHERE ar.user_id = ?
          AND a.status = 'published'
    `;
    if (search) {
        where += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
        const q = `%${search}%`;
        params.push(q, q);
    }
    if (startDate) {
        where += ` AND DATE(COALESCE(a.published_at, a.created_at)) >= ?`;
        params.push(startDate);
    }
    if (endDate) {
        where += ` AND DATE(COALESCE(a.published_at, a.created_at)) <= ?`;
        params.push(endDate);
    }

    const sql = `
        SELECT
            a.id, a.title, a.content,
            a.attachment_original_name,
            a.attachment_path,
            a.audience, a.status, a.is_pinned,
            a.published_at, a.created_at,
            u.name AS created_by_name,
            ar.id AS recipient_id,
            ar.in_app_status,
            ar.delivered_at,
            ar.read_at,
            ar.email_status,
            ar.email_sent_at,
            ar.email_delivered_at,
            ar.email_failed_at,
            ar.email_failure_reason
        FROM announcements a
        INNER JOIN announcement_recipients ar
            ON ar.announcement_id = a.id
        LEFT JOIN users u
            ON u.id = a.created_by
        ${where}
        ORDER BY a.is_pinned DESC, COALESCE(a.published_at, a.created_at) DESC, a.id DESC
    `;
    db.query(sql, params, callback);
};

const getUsersForAudience = (audience, specificIds, callback) => {
    let sql = `
        SELECT
            u.id, u.name, u.email,
            u.designation_id,
            dg.designation_name AS designation,
            u.status,
            u.is_admin
        FROM users u
        LEFT JOIN designations dg ON dg.id = u.designation_id
        WHERE u.status = 'Active'
    `;
    const params = [];

    if (audience === "managers") {
        sql += `
            AND (
                LOWER(COALESCE(dg.designation_name, '')) LIKE '%manager%'
                OR u.is_admin = 1
            )
        `;
    } else if (audience === "users") {
        sql += `
            AND (
                LOWER(COALESCE(dg.designation_name, '')) NOT LIKE '%manager%'
                AND COALESCE(u.is_admin, 0) = 0
            )
        `;
    } else if (audience === "specific") {
        const ids = Array.isArray(specificIds) ? specificIds.map(Number).filter(Number.isInteger) : [];
        if (!ids.length) return callback(null, []);
        sql += ` AND u.id IN (${ids.map(() => "?").join(",")})`;
        params.push(...ids);
    }

    sql += ` ORDER BY u.name ASC`;
    db.query(sql, params, callback);
};

const create = (data, callback) => {
    const sql = `
        INSERT INTO announcements
        (title, content, attachment_original_name, attachment_path,
         audience, status, is_pinned, published_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [
        data.title,
        data.content || null,
        data.attachmentOriginalName || null,
        data.attachmentPath || null,
        data.audience,
        data.status || "published",
        data.isPinned ? 1 : 0,
        data.status === "published" ? new Date() : null,
        data.createdBy
    ], callback);
};

const addRecipients = (announcementId, users, callback) => {
    if (!users.length) return callback(null);
    const values = users.map(u => [
        announcementId, u.id, "delivered", new Date(), null, "pending"
    ]);
    db.query(`
        INSERT INTO announcement_recipients
        (announcement_id, user_id, in_app_status, delivered_at, read_at, email_status)
        VALUES ?
    `, [values], callback);
};

const markRead = (announcementId, userId, callback) => {
    db.query(`
        UPDATE announcement_recipients
        SET in_app_status='read', read_at=COALESCE(read_at, NOW())
        WHERE announcement_id=? AND user_id=?
    `, [announcementId, userId], callback);
};

const getRecipientsForEmail = (announcementId, callback) => {
    db.query(`
        SELECT ar.id AS recipient_id, ar.user_id,
               u.name, u.email,
               a.title, a.content,
               a.attachment_original_name, a.attachment_path
        FROM announcement_recipients ar
        INNER JOIN users u ON u.id=ar.user_id
        INNER JOIN announcements a ON a.id=ar.announcement_id
        WHERE ar.announcement_id=? AND u.status='Active'
    `, [announcementId], callback);
};

const updateEmailStatus = (recipientId, status, reason, callback) => {
    const map = {
        sent: "email_status='sent', email_sent_at=NOW(), email_failed_at=NULL, email_failure_reason=NULL",
        delivered: "email_status='delivered', email_delivered_at=NOW(), email_failure_reason=NULL",
        failed: "email_status='failed', email_failed_at=NOW(), email_failure_reason=?"
    };
    if (!map[status]) return callback(new Error("Invalid email status"));
    const params = status === "failed" ? [reason || "Email failed", recipientId] : [recipientId];
    db.query(`UPDATE announcement_recipients SET ${map[status]} WHERE id=?`, params, callback);
};

const getUsers = (search, callback) => {
    const q = `%${search || ""}%`;
    db.query(`
        SELECT u.id, u.name, u.email,
               dg.designation_name AS designation
        FROM users u
        LEFT JOIN designations dg ON dg.id=u.designation_id
        WHERE u.status='Active'
          AND (u.name LIKE ? OR u.email LIKE ?)
        ORDER BY u.name ASC
        LIMIT 100
    `, [q, q], callback);
};

const getCounts = (announcementId, callback) => {
    db.query(`
        SELECT
            COUNT(*) AS recipients,
            SUM(in_app_status='delivered') AS in_app_delivered,
            SUM(in_app_status='read') AS in_app_read,
            SUM(email_status='sent') AS email_sent,
            SUM(email_status='delivered') AS email_delivered,
            SUM(email_status='failed') AS email_failed
        FROM announcement_recipients
        WHERE announcement_id=?
    `, [announcementId], callback);
};

const unpinOthers = (callback) => {
    db.query(`UPDATE announcements SET is_pinned=0 WHERE is_pinned=1`, callback);
};

const deleteAnnouncement = (id, callback) => {
    db.query(`DELETE FROM announcements WHERE id=?`, [id], callback);
};

module.exports = {
    createTables, getAll, getUsersForAudience, create, addRecipients,
    markRead, getRecipientsForEmail, updateEmailStatus, getUsers,
    getCounts, unpinOthers, deleteAnnouncement
};

const db = require("../config/db");

async function addColumnIfMissing(table, column, definition) {
    const rows = await db.query(
        `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );

    if (Number(rows?.[0]?.count || 0) === 0) {
        await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    }
}

async function ensureSecuritySchema() {
    await addColumnIfMissing("users", "token_version", "INT NOT NULL DEFAULT 0");

    await db.query(`
        CREATE TABLE IF NOT EXISTS security_events (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            event_type VARCHAR(80) NOT NULL,
            user_id BIGINT NULL,
            ip_address VARCHAR(128) NULL,
            method VARCHAR(12) NULL,
            request_path VARCHAR(500) NULL,
            request_id VARCHAR(100) NULL,
            user_agent VARCHAR(500) NULL,
            details_json JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX idx_security_events_user (user_id, created_at),
            INDEX idx_security_events_type (event_type, created_at),
            INDEX idx_security_events_ip (ip_address, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function incrementTokenVersion(userId) {
    await db.query("UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = ?", [userId]);
}

async function getTokenVersion(userId) {
    const rows = await db.query("SELECT COALESCE(token_version, 0) AS token_version FROM users WHERE id = ? LIMIT 1", [userId]);
    return Number(rows?.[0]?.token_version || 0);
}

module.exports = { ensureSecuritySchema, incrementTokenVersion, getTokenVersion };

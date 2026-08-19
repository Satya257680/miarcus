const db = require("../config/db");

const Gallery = {
    async ensureTables() {
        await db.query(`
            CREATE TABLE IF NOT EXISTS gallery_photos (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
                uploaded_by INT NOT NULL,
                category VARCHAR(100) NULL,
                description TEXT NULL,
                status ENUM('active','deleted') NOT NULL DEFAULT 'active',
                uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_gallery_uploaded_by (uploaded_by),
                INDEX idx_gallery_uploaded_at (uploaded_at),
                INDEX idx_gallery_category (category),
                INDEX idx_gallery_status (status),
                CONSTRAINT fk_gallery_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS gallery_mobile_sessions (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                token_hash CHAR(64) NOT NULL,
                created_by INT NOT NULL,
                expires_at DATETIME NOT NULL,
                status ENUM('pending','uploaded','expired','cancelled') NOT NULL DEFAULT 'pending',
                gallery_photo_id BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                uploaded_at TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_gallery_mobile_token (token_hash),
                INDEX idx_gallery_mobile_creator (created_by),
                INDEX idx_gallery_mobile_expiry (expires_at, status),
                CONSTRAINT fk_gallery_mobile_creator FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_gallery_mobile_photo FOREIGN KEY (gallery_photo_id) REFERENCES gallery_photos(id) ON UPDATE CASCADE ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    },

    async list({ search = "", category = "", from = "", to = "", page = 1, limit = 24 }) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 100);
        const offset = (safePage - 1) * safeLimit;
        const params = [];
        const where = [`g.status = 'active'`];

        if (search) {
            where.push(`(g.file_name LIKE ? OR g.description LIKE ? OR g.category LIKE ? OR u.name LIKE ? OR u.employee_id LIKE ?)`);
            const value = `%${search}%`;
            params.push(value, value, value, value, value);
        }
        if (category) {
            where.push(`g.category = ?`);
            params.push(category);
        }
        if (from) {
            where.push(`DATE(g.uploaded_at) >= ?`);
            params.push(from);
        }
        if (to) {
            where.push(`DATE(g.uploaded_at) <= ?`);
            params.push(to);
        }

        const whereSql = where.join(" AND ");
        const countRows = await db.query(`
            SELECT COUNT(*) AS total
            FROM gallery_photos g
            INNER JOIN users u ON u.id = g.uploaded_by
            WHERE ${whereSql}
        `, params);

        const rows = await db.query(`
            SELECT
                g.id,
                g.file_name,
                g.file_path,
                g.mime_type,
                g.file_size,
                g.uploaded_by,
                g.category,
                g.description,
                g.uploaded_at,
                u.name AS uploaded_by_name,
                u.employee_id
            FROM gallery_photos g
            INNER JOIN users u ON u.id = g.uploaded_by
            WHERE ${whereSql}
            ORDER BY g.id DESC
            LIMIT ? OFFSET ?
        `, [...params, safeLimit, offset]);

        return {
            rows,
            total: Number(countRows[0]?.total || 0),
            page: safePage,
            limit: safeLimit,
            totalPages: Math.max(Math.ceil(Number(countRows[0]?.total || 0) / safeLimit), 1)
        };
    },

    async getById(id) {
        const rows = await db.query(`
            SELECT
                g.*,
                u.name AS uploaded_by_name,
                u.employee_id
            FROM gallery_photos g
            INNER JOIN users u ON u.id = g.uploaded_by
            WHERE g.id = ? AND g.status = 'active'
            LIMIT 1
        `, [id]);
        return rows[0] || null;
    },

    async create(data) {
        const result = await db.query(`
            INSERT INTO gallery_photos
            (file_name, file_path, mime_type, file_size, uploaded_by, category, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            data.file_name,
            data.file_path,
            data.mime_type,
            data.file_size || 0,
            data.uploaded_by,
            data.category || null,
            data.description || null
        ]);
        return Number(result.insertId);
    },

    async softDelete(id) {
        const result = await db.query(`
            UPDATE gallery_photos
            SET status = 'deleted'
            WHERE id = ? AND status = 'active'
        `, [id]);
        return result.affectedRows > 0;
    },

    async createMobileSession({ tokenHash, createdBy, expiresAt }) {
        const result = await db.query(`
            INSERT INTO gallery_mobile_sessions
            (token_hash, created_by, expires_at)
            VALUES (?, ?, ?)
        `, [tokenHash, createdBy, expiresAt]);
        return Number(result.insertId);
    },

    async getMobileSession(tokenHash) {
        const rows = await db.query(`
            SELECT *
            FROM gallery_mobile_sessions
            WHERE token_hash = ?
            LIMIT 1
        `, [tokenHash]);
        return rows[0] || null;
    },

    async markMobileUploaded(sessionId, photoId) {
        await db.query(`
            UPDATE gallery_mobile_sessions
            SET status = 'uploaded', gallery_photo_id = ?, uploaded_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'pending'
        `, [photoId, sessionId]);
    },

    async expireSession(sessionId) {
        await db.query(`
            UPDATE gallery_mobile_sessions
            SET status = 'expired'
            WHERE id = ? AND status = 'pending'
        `, [sessionId]);
    },

    async getSessionStatus(sessionId, createdBy) {
        const rows = await db.query(`
            SELECT id, status, expires_at, gallery_photo_id, uploaded_at
            FROM gallery_mobile_sessions
            WHERE id = ? AND created_by = ?
            LIMIT 1
        `, [sessionId, createdBy]);
        return rows[0] || null;
    },

    async categories() {
        const rows = await db.query(`
            SELECT category, COUNT(*) AS photo_count
            FROM gallery_photos
            WHERE status = 'active' AND category IS NOT NULL AND category <> ''
            GROUP BY category
            ORDER BY category ASC
        `);
        return rows.map(row => ({
            category: row.category,
            photo_count: Number(row.photo_count || 0)
        }));
    }
};

module.exports = Gallery;

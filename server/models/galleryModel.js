const db = require("../config/db");

const columnExists = async (table, column) => {
    const rows = await db.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    return Number(rows[0]?.count || 0) > 0;
};

const addColumnIfMissing = async (table, column, definition) => {
    if (!(await columnExists(table, column))) {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
};

const Gallery = {
    async ensureTables() {
        await db.query(`
            CREATE TABLE IF NOT EXISTS gallery_photos (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
                file_data MEDIUMBLOB NULL,
                uploaded_by INT NOT NULL,
                category VARCHAR(100) NULL,
                description TEXT NULL,
                location_type ENUM('head_office','store') NOT NULL DEFAULT 'head_office',
                store_id INT NULL,
                latitude DECIMAL(10,7) NULL,
                longitude DECIMAL(10,7) NULL,
                location_accuracy DECIMAL(10,2) NULL,
                source_module VARCHAR(100) NULL,
                source_record_id BIGINT NULL,
                source_field VARCHAR(100) NULL,
                status ENUM('active','deleted') NOT NULL DEFAULT 'active',
                uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_gallery_uploaded_by (uploaded_by),
                INDEX idx_gallery_uploaded_at (uploaded_at),
                INDEX idx_gallery_category (category),
                INDEX idx_gallery_location (location_type, store_id),
                INDEX idx_gallery_coordinates (latitude, longitude),
                INDEX idx_gallery_source (source_module, source_record_id),
                INDEX idx_gallery_status (status),
                CONSTRAINT fk_gallery_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Existing installations receive the new Gallery location fields without
        // requiring the company to manually rebuild the table.
        await addColumnIfMissing("gallery_photos", "file_data", "MEDIUMBLOB NULL");
        await addColumnIfMissing("gallery_photos", "location_type", "ENUM('head_office','store') NOT NULL DEFAULT 'head_office'");
        await addColumnIfMissing("gallery_photos", "store_id", "INT NULL");
        await addColumnIfMissing("gallery_photos", "latitude", "DECIMAL(10,7) NULL");
        await addColumnIfMissing("gallery_photos", "longitude", "DECIMAL(10,7) NULL");
        await addColumnIfMissing("gallery_photos", "location_accuracy", "DECIMAL(10,2) NULL");
        await addColumnIfMissing("gallery_photos", "source_module", "VARCHAR(100) NULL");
        await addColumnIfMissing("gallery_photos", "source_record_id", "BIGINT NULL");
        await addColumnIfMissing("gallery_photos", "source_field", "VARCHAR(100) NULL");

        await db.query(`
            CREATE TABLE IF NOT EXISTS gallery_mobile_sessions (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                token_hash CHAR(64) NOT NULL,
                created_by INT NOT NULL,
                expires_at DATETIME NOT NULL,
                status ENUM('pending','uploaded','expired','cancelled') NOT NULL DEFAULT 'pending',
                gallery_photo_id BIGINT UNSIGNED NULL,
                location_type ENUM('head_office','store') NOT NULL DEFAULT 'head_office',
                store_id INT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                uploaded_at TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_gallery_mobile_token (token_hash),
                INDEX idx_gallery_mobile_creator (created_by),
                INDEX idx_gallery_mobile_expiry (expires_at, status),
                INDEX idx_gallery_mobile_location (location_type, store_id),
                CONSTRAINT fk_gallery_mobile_creator FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_gallery_mobile_photo FOREIGN KEY (gallery_photo_id) REFERENCES gallery_photos(id) ON UPDATE CASCADE ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await addColumnIfMissing("gallery_mobile_sessions", "location_type", "ENUM('head_office','store') NOT NULL DEFAULT 'head_office'");
        await addColumnIfMissing("gallery_mobile_sessions", "store_id", "INT NULL");
    },

    async list({ search = "", category = "", locationType = "", storeId = "", from = "", to = "", page = 1, limit = 24 }) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 100);
        const offset = (safePage - 1) * safeLimit;
        const params = [];
        const where = [`g.status = 'active'`];

        if (search) {
            where.push(`(
                g.file_name LIKE ? OR
                g.description LIKE ? OR
                g.category LIKE ? OR
                u.name LIKE ? OR
                u.employee_id LIKE ? OR
                COALESCE(s.store_name, 'Head Office') LIKE ?
            )`);
            const value = `%${search}%`;
            params.push(value, value, value, value, value, value);
        }
        if (category) {
            where.push(`g.category = ?`);
            params.push(category);
        }
        if (locationType) {
            where.push(`g.location_type = ?`);
            params.push(locationType);
        }
        if (storeId) {
            where.push(`g.store_id = ?`);
            params.push(storeId);
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
            LEFT JOIN stores s ON s.id = g.store_id
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
                g.location_type,
                g.store_id,
                g.latitude,
                g.longitude,
                g.location_accuracy,
                g.source_module,
                g.source_record_id,
                g.source_field,
                g.uploaded_at,
                u.name AS uploaded_by_name,
                u.employee_id,
                s.store_name,
                s.store_code
            FROM gallery_photos g
            INNER JOIN users u ON u.id = g.uploaded_by
            LEFT JOIN stores s ON s.id = g.store_id
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
                u.employee_id,
                s.store_name,
                s.store_code
            FROM gallery_photos g
            INNER JOIN users u ON u.id = g.uploaded_by
            LEFT JOIN stores s ON s.id = g.store_id
            WHERE g.id = ? AND g.status = 'active'
            LIMIT 1
        `, [id]);
        return rows[0] || null;
    },

    async create(data) {
        const result = await db.query(`
            INSERT INTO gallery_photos
            (file_name, file_path, mime_type, file_size, file_data, uploaded_by, category, description,
             location_type, store_id, latitude, longitude, location_accuracy,
             source_module, source_record_id, source_field)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.file_name,
            data.file_path,
            data.mime_type,
            data.file_size || 0,
            data.file_data || null,
            data.uploaded_by,
            data.category || null,
            data.description || null,
            data.location_type || "head_office",
            data.store_id || null,
            data.latitude ?? null,
            data.longitude ?? null,
            data.location_accuracy ?? null,
            data.source_module || "Gallery",
            data.source_record_id || null,
            data.source_field || "photo"
        ]);
        return Number(result.insertId);
    },

    async registerAttachment(data) {
        const existing = await db.query(`
            SELECT id
            FROM gallery_photos
            WHERE file_path = ? AND source_module = ? AND status = 'active'
            LIMIT 1
        `, [data.file_path, data.source_module || "Attachment"]);

        if (existing.length) return Number(existing[0].id);

        return this.create({
            ...data,
            source_module: data.source_module || "Attachment",
            source_field: data.source_field || "attachment"
        });
    },

    async deleteAll() {
        const rows = await db.query(`
            SELECT id, file_path, source_module
            FROM gallery_photos
            WHERE status = 'active'
        `);

        await db.query(`
            UPDATE gallery_photos
            SET status = 'deleted'
            WHERE status = 'active'
        `);

        return rows;
    },

    async getLocations() {
        const rows = await db.query(`
            SELECT id, store_name, store_code, city, state, status
            FROM stores
            WHERE LOWER(COALESCE(status, 'Active')) = 'active'
            ORDER BY store_name ASC
        `);

        return [
            { id: null, location_type: "head_office", name: "Head Office", code: "MIARCUS-HO" },
            ...rows.map(row => ({
                id: Number(row.id),
                location_type: "store",
                name: row.store_name,
                code: row.store_code,
                city: row.city || "",
                state: row.state || ""
            }))
        ];
    },

    async storeExists(storeId) {
        const rows = await db.query(
            `SELECT id FROM stores WHERE id = ? AND LOWER(COALESCE(status, 'Active')) = 'active' LIMIT 1`,
            [storeId]
        );
        return rows.length > 0;
    },

    async getStoreName(storeId) {
        const rows = await db.query(
            `SELECT store_name FROM stores WHERE id = ? LIMIT 1`,
            [storeId]
        );
        return rows[0]?.store_name || null;
    },

    async getFile(id) {
        const rows = await db.query(`
            SELECT id, file_name, file_path, mime_type, file_size, file_data
            FROM gallery_photos
            WHERE id = ? AND status = 'active'
            LIMIT 1
        `, [id]);
        return rows[0] || null;
    },

    async saveFileData(id, buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) return;
        await db.query(`
            UPDATE gallery_photos
            SET file_data = ?, file_size = ?
            WHERE id = ? AND status = 'active'
        `, [buffer, buffer.length, id]);
    },

    async softDelete(id) {
        const result = await db.query(`
            UPDATE gallery_photos
            SET status = 'deleted'
            WHERE id = ? AND status = 'active'
        `, [id]);
        return result.affectedRows > 0;
    },

    async createMobileSession({ tokenHash, createdBy, expiresAt, locationType, storeId }) {
        const result = await db.query(`
            INSERT INTO gallery_mobile_sessions
            (token_hash, created_by, expires_at, location_type, store_id)
            VALUES (?, ?, ?, ?, ?)
        `, [tokenHash, createdBy, expiresAt, locationType || "head_office", storeId || null]);
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
            SELECT id, status, expires_at, gallery_photo_id, uploaded_at, location_type, store_id
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

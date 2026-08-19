const db = require("../config/db");

const EmployeeLocation = {
    async ensureTables() {
        await db.query(`
            CREATE TABLE IF NOT EXISTS location_work_schedules (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                employee_id INT NULL,
                day_of_week TINYINT NOT NULL DEFAULT 1,
                start_time TIME NOT NULL DEFAULT '09:00:00',
                end_time TIME NOT NULL DEFAULT '18:00:00',
                timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
                enabled TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_location_schedule_employee (employee_id),
                INDEX idx_location_schedule_day (day_of_week, enabled)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS location_devices (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                employee_id INT NOT NULL,
                device_identifier VARCHAR(255) NOT NULL,
                device_name VARCHAR(255) NULL,
                status ENUM('active','inactive','blocked') NOT NULL DEFAULT 'active',
                registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_seen_at TIMESTAMP NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_location_device_identifier (device_identifier),
                INDEX idx_location_device_employee (employee_id),
                CONSTRAINT fk_location_device_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS location_records (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                employee_id INT NOT NULL,
                device_id BIGINT UNSIGNED NULL,
                latitude DECIMAL(10,7) NOT NULL,
                longitude DECIMAL(10,7) NOT NULL,
                accuracy DECIMAL(10,2) NULL,
                source VARCHAR(50) NOT NULL DEFAULT 'mock',
                captured_at DATETIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_location_record_employee_time (employee_id, captured_at),
                INDEX idx_location_record_time (captured_at),
                CONSTRAINT fk_location_record_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_location_record_device FOREIGN KEY (device_id) REFERENCES location_devices(id) ON UPDATE CASCADE ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS location_access_logs (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                accessed_by INT NOT NULL,
                employee_id INT NULL,
                action VARCHAR(100) NOT NULL,
                metadata JSON NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_location_access_user (accessed_by, created_at),
                INDEX idx_location_access_employee (employee_id, created_at),
                CONSTRAINT fk_location_access_user FOREIGN KEY (accessed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    },

    async logAccess({ accessedBy, employeeId = null, action, metadata = {} }) {
        await db.query(
            `INSERT INTO location_access_logs (accessed_by, employee_id, action, metadata) VALUES (?, ?, ?, ?)`,
            [accessedBy, employeeId || null, action, JSON.stringify(metadata)]
        );
    },

    async saveRecord(record) {
        const result = await db.query(
            `INSERT INTO location_records
                (employee_id, device_id, latitude, longitude, accuracy, source, captured_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                record.employee_id,
                record.device_id || null,
                record.latitude,
                record.longitude,
                record.accuracy || null,
                record.source || "mock",
                record.captured_at || new Date()
            ]
        );
        return Number(result.insertId);
    },

    async getStats() {
        const rows = await db.query(`
            SELECT
                COUNT(*) AS total_records,
                COUNT(DISTINCT employee_id) AS tracked_employees,
                MAX(captured_at) AS last_capture
            FROM location_records
            WHERE DATE(captured_at) = CURDATE()
        `);
        return rows[0] || { total_records: 0, tracked_employees: 0, last_capture: null };
    },

    async getAccessLogs({ limit = 50 } = {}) {
        const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
        return db.query(`
            SELECT
                l.id,
                l.accessed_by,
                l.employee_id,
                l.action,
                l.metadata,
                l.created_at,
                u.name AS accessed_by_name
            FROM location_access_logs l
            INNER JOIN users u ON u.id = l.accessed_by
            ORDER BY l.id DESC
            LIMIT ?
        `, [safeLimit]);
    }
};

module.exports = EmployeeLocation;

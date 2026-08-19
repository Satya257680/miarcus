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
                source VARCHAR(50) NOT NULL DEFAULT 'browser-gps',
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
        // Default company schedule: Monday-Friday, 09:00-18:00.
        // Admin scheduling can later update these rows to 09:00-21:00 or another policy.
        await db.query(`
            INSERT INTO location_work_schedules
                (employee_id, day_of_week, start_time, end_time, timezone, enabled)
            SELECT NULL, days.day_of_week, '09:00:00', '18:00:00', 'Asia/Kolkata', 1
            FROM (
                SELECT 1 AS day_of_week UNION ALL SELECT 2 UNION ALL SELECT 3
                UNION ALL SELECT 4 UNION ALL SELECT 5
            ) days
            WHERE NOT EXISTS (
                SELECT 1 FROM location_work_schedules s
                WHERE s.employee_id IS NULL
                  AND s.day_of_week = days.day_of_week
            )
        `);
    },

    async registerDevice({ employeeId, deviceIdentifier, deviceName }) {
        const existing = await db.query(
            `SELECT id, employee_id, status FROM location_devices WHERE device_identifier = ? LIMIT 1`,
            [deviceIdentifier]
        );

        if (existing.length && Number(existing[0].employee_id) !== Number(employeeId)) {
            throw new Error("This device is already registered to another employee.");
        }

        if (existing.length) {
            await db.query(
                `UPDATE location_devices
                 SET device_name = ?, status = 'active', last_seen_at = NOW()
                 WHERE id = ?`,
                [deviceName || null, existing[0].id]
            );
            return Number(existing[0].id);
        }

        const result = await db.query(
            `INSERT INTO location_devices
                (employee_id, device_identifier, device_name, status, last_seen_at)
             VALUES (?, ?, ?, 'active', NOW())`,
            [employeeId, deviceIdentifier, deviceName || null]
        );
        return Number(result.insertId);
    },

    async getActiveDeviceForEmployee(employeeId) {
        const rows = await db.query(
            `SELECT id, employee_id, device_identifier, device_name, status, registered_at, last_seen_at
             FROM location_devices
             WHERE employee_id = ? AND status = 'active'
             ORDER BY registered_at ASC
             LIMIT 1`,
            [employeeId]
        );
        return rows[0] || null;
    },

    async getDeviceForEmployee(employeeId, deviceIdentifier) {
        const rows = await db.query(
            `SELECT id, employee_id, device_identifier, status
             FROM location_devices
             WHERE employee_id = ? AND device_identifier = ? AND status = 'active'
             LIMIT 1`,
            [employeeId, deviceIdentifier]
        );
        return rows[0] || null;
    },

    async touchDevice(deviceId) {
        await db.query(`UPDATE location_devices SET last_seen_at = NOW() WHERE id = ? AND status = 'active'`, [deviceId]);
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
                record.source || "browser-gps",
                record.captured_at || new Date()
            ]
        );
        if (record.device_id) await this.touchDevice(record.device_id);
        return Number(result.insertId);
    },

    async getCurrentLocations({ search = "", status = "" } = {}) {
        const query = String(search || "").trim().toLowerCase();
        const params = [];
        let sql = `
            SELECT u.id AS employee_id, u.employee_id AS employee_code, u.name,
                   u.call_contact AS mobile, d.department_name AS department,
                   dg.designation_name AS designation, lr.latitude, lr.longitude,
                   lr.accuracy, lr.captured_at, lr.source
            FROM users u
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN designations dg ON dg.id = u.designation_id
            LEFT JOIN (
                SELECT r.* FROM location_records r
                INNER JOIN (
                    SELECT employee_id, MAX(captured_at) AS max_captured_at
                    FROM location_records GROUP BY employee_id
                ) latest ON latest.employee_id = r.employee_id
                       AND latest.max_captured_at = r.captured_at
            ) lr ON lr.employee_id = u.id
            INNER JOIN location_devices ld ON ld.employee_id = u.id AND ld.status = 'active'
            WHERE u.status = 'Active'
        `;
        if (query) {
            sql += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.employee_id) LIKE ? OR LOWER(COALESCE(u.call_contact,'')) LIKE ?)`;
            const like = `%${query}%`;
            params.push(like, like, like);
        }
        sql += ` ORDER BY u.name ASC`;
        const rows = await db.query(sql, params);
        const now = Date.now();
        return rows.filter((row) => {
            const captured = row.captured_at ? new Date(row.captured_at) : null;
            const online = captured && (now - captured.getTime()) <= 120000;
            return !status || (status === 'online' ? online : !online);
        }).map((row) => {
            const captured = row.captured_at ? new Date(row.captured_at) : null;
            const online = captured && (now - captured.getTime()) <= 120000;
            return {
                employee_id: row.employee_id, employee_code: row.employee_code, name: row.name,
                department: row.department || '—', designation: row.designation || '—',
                mobile: row.mobile || '—', latitude: row.latitude == null ? null : Number(row.latitude),
                longitude: row.longitude == null ? null : Number(row.longitude),
                accuracy: row.accuracy == null ? null : Number(row.accuracy),
                status: online ? 'online' : 'offline',
                last_update: captured ? captured.toISOString() : null,
                address: row.latitude != null ? `${Number(row.latitude).toFixed(6)}, ${Number(row.longitude).toFixed(6)}` : 'No location received',
                provider: row.source || 'browser'
            };
        });
    },

    async getHistory(employeeId, date) {
        return db.query(`SELECT id, employee_id, latitude, longitude, accuracy, source, captured_at
                         FROM location_records WHERE employee_id = ? AND DATE(captured_at) = ?
                         ORDER BY captured_at ASC`, [employeeId, date]);
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

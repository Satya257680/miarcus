const db = require("../config/db");

const query = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const createTables = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS attendance_records (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            employee_id INT NOT NULL,
            store_id INT NULL,
            work_date DATE NOT NULL,
            status ENUM('Present','Completed','Absent','On Leave') NOT NULL DEFAULT 'Present',
            check_in_at DATETIME NULL,
            check_out_at DATETIME NULL,
            check_in_latitude DECIMAL(10,7) NULL,
            check_in_longitude DECIMAL(10,7) NULL,
            check_in_accuracy DECIMAL(10,2) NULL,
            check_out_latitude DECIMAL(10,7) NULL,
            check_out_longitude DECIMAL(10,7) NULL,
            check_out_accuracy DECIMAL(10,2) NULL,
            check_in_photo VARCHAR(500) NULL,
            check_out_photo VARCHAR(500) NULL,
            check_in_remarks VARCHAR(1000) NULL,
            check_out_remarks VARCHAR(1000) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_attendance_employee_day (employee_id, work_date),
            KEY idx_attendance_date (work_date),
            KEY idx_attendance_store (store_id),
            KEY idx_attendance_status (status),
            CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_attendance_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const getContext = async (userId, workDate) => {
    const users = await query(`
        SELECT u.id, u.employee_id, u.name, u.email, u.department_id,
               d.department_name AS department, u.designation_id,
               dg.designation_name AS designation, u.is_admin
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN designations dg ON dg.id = u.designation_id
        WHERE u.id = ? LIMIT 1
    `, [userId]);

    const stores = await query(`
        SELECT s.id, s.store_name, s.store_code, s.city, s.state, s.address
        FROM stores s
        INNER JOIN user_stores us ON us.store_id = s.id
        WHERE us.user_id = ? AND (s.status IS NULL OR s.status = 'Active')
        ORDER BY s.store_name ASC
    `, [userId]);

    const attendance = await query(`
        SELECT a.*, s.store_name, s.store_code
        FROM attendance_records a
        LEFT JOIN stores s ON s.id = a.store_id
        WHERE a.employee_id = ? AND a.work_date = ?
        LIMIT 1
    `, [userId, workDate]);

    return { user: users[0] || null, stores, attendance: attendance[0] || null };
};

const getRecord = async (userId, workDate) => {
    const rows = await query(`
        SELECT a.*, s.store_name, s.store_code
        FROM attendance_records a
        LEFT JOIN stores s ON s.id = a.store_id
        WHERE a.employee_id = ? AND a.work_date = ?
        LIMIT 1
    `, [userId, workDate]);
    return rows[0] || null;
};

const createCheckIn = async (data) => {
    const result = await query(`
        INSERT INTO attendance_records
        (employee_id, store_id, work_date, status, check_in_at,
         check_in_latitude, check_in_longitude, check_in_accuracy,
         check_in_photo, check_in_remarks)
        VALUES (?, ?, ?, 'Present', ?, ?, ?, ?, ?, ?)
    `, [
        data.employeeId, data.storeId || null, data.workDate, data.checkInAt,
        data.latitude, data.longitude, data.accuracy || null,
        data.photo || null, data.remarks || null
    ]);
    return result.insertId;
};

const createCheckOut = async (data) => {
    await query(`
        UPDATE attendance_records
        SET status='Completed', check_out_at=?,
            check_out_latitude=?, check_out_longitude=?, check_out_accuracy=?,
            check_out_photo=?, check_out_remarks=?
        WHERE id=? AND employee_id=? AND work_date=? AND check_out_at IS NULL
    `, [
        data.checkOutAt, data.latitude, data.longitude, data.accuracy || null,
        data.photo || null, data.remarks || null,
        data.id, data.employeeId, data.workDate
    ]);
    return getRecord(data.employeeId, data.workDate);
};

const getReport = async ({ page = 1, pageSize = 10, search = '', userId = '', storeId = '', from = '', to = '', status = '' }) => {
    const where = ['1=1'];
    const params = [];

    if (search) {
        where.push('(u.name LIKE ? OR u.employee_id LIKE ? OR u.email LIKE ? OR s.store_name LIKE ? OR s.store_code LIKE ?)');
        const q = `%${search}%`;
        params.push(q, q, q, q, q);
    }
    if (userId) { where.push('a.employee_id = ?'); params.push(userId); }
    if (storeId) { where.push('a.store_id = ?'); params.push(storeId); }
    if (from) { where.push('a.work_date >= ?'); params.push(from); }
    if (to) { where.push('a.work_date <= ?'); params.push(to); }
    if (status) { where.push('a.status = ?'); params.push(status); }

    const countRows = await query(`
        SELECT COUNT(*) AS total
        FROM attendance_records a
        INNER JOIN users u ON u.id=a.employee_id
        LEFT JOIN stores s ON s.id=a.store_id
        WHERE ${where.join(' AND ')}
    `, params);

    const total = Number(countRows[0]?.total || 0);
    const safePageSize = Math.min(Math.max(Number(pageSize) || 10, 5), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safePageSize;

    const rows = await query(`
        SELECT a.id, a.work_date, a.status, a.check_in_at, a.check_out_at,
               a.check_in_latitude, a.check_in_longitude, a.check_in_accuracy,
               a.check_out_latitude, a.check_out_longitude, a.check_out_accuracy,
               a.check_in_photo, a.check_out_photo,
               a.check_in_remarks, a.check_out_remarks,
               u.id AS user_id, u.employee_id, u.name, u.email,
               d.department_name AS department,
               dg.designation_name AS designation,
               s.id AS store_id, s.store_name, s.store_code
        FROM attendance_records a
        INNER JOIN users u ON u.id=a.employee_id
        LEFT JOIN departments d ON d.id=u.department_id
        LEFT JOIN designations dg ON dg.id=u.designation_id
        LEFT JOIN stores s ON s.id=a.store_id
        WHERE ${where.join(' AND ')}
        ORDER BY a.work_date DESC, COALESCE(a.check_in_at, a.created_at) DESC
        LIMIT ? OFFSET ?
    `, [...params, safePageSize, offset]);

    const summaryRows = await query(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status='Completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN a.check_in_at IS NOT NULL AND TIME(a.check_in_at) > '09:15:00' THEN 1 ELSE 0 END) AS late,
            SUM(CASE WHEN a.check_in_at IS NOT NULL AND a.check_out_at IS NULL THEN 1 ELSE 0 END) AS open_sessions
        FROM attendance_records a
        INNER JOIN users u ON u.id=a.employee_id
        LEFT JOIN stores s ON s.id=a.store_id
        WHERE ${where.join(' AND ')}
    `, params);

    return {
        rows,
        total,
        page: safePage,
        pageSize: safePageSize,
        pages: Math.max(Math.ceil(total / safePageSize), 1),
        summary: summaryRows[0] || {}
    };
};

const getEmployees = async () => query(`
    SELECT id, employee_id, name, email
    FROM users
    WHERE status='Active'
    ORDER BY name ASC
`);

const getStores = async () => query(`
    SELECT id, store_name, store_code
    FROM stores
    WHERE status IS NULL OR status='Active'
    ORDER BY store_name ASC
`);

module.exports = {
    createTables,
    getContext,
    getRecord,
    createCheckIn,
    createCheckOut,
    getReport,
    getEmployees,
    getStores
};

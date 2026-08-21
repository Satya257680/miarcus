const db = require("../config/db");

// ======================================================
// DATABASE QUERY HELPER
// ======================================================

const query = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) =>
            err ? reject(err) : resolve(rows)
        );
    });

// ======================================================
// ATTENDANCE TABLE
// ======================================================

const createTables = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS attendance_records (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

            employee_id INT NOT NULL,
            store_id INT NULL,

            work_date DATE NOT NULL,

            status ENUM(
                'Present',
                'Completed',
                'Absent',
                'On Leave'
            ) NOT NULL DEFAULT 'Present',

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
            updated_at TIMESTAMP NOT NULL
                DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

            PRIMARY KEY (id),

            KEY idx_attendance_date (work_date),
            KEY idx_attendance_store (store_id),
            KEY idx_attendance_status (status),

            CONSTRAINT fk_attendance_employee
                FOREIGN KEY (employee_id)
                REFERENCES users(id)
                ON DELETE CASCADE,

            CONSTRAINT fk_attendance_store
                FOREIGN KEY (store_id)
                REFERENCES stores(id)
                ON DELETE SET NULL

        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci
    `);

    // ------------------------------------------------
    // MIGRATION:
    //
    // Older databases were created with a UNIQUE KEY on
    // (employee_id, work_date), which allowed only one
    // attendance record per employee per day and blocked
    // checking in again after a completed session.
    //
    // Employees can now check in again the same day after
    // checking out (multiple sessions/day), while every
    // past session stays intact for Attendance Reports.
    //
    // Drop the old unique index if it still exists. This
    // is safe to run every time the server starts.
    // ------------------------------------------------

    try {
        await query(`
            ALTER TABLE attendance_records
            DROP INDEX uq_attendance_employee_day
        `);
    } catch (error) {
        // Index already removed / never existed on a
        // fresh install. Nothing to do.
    }
};

// ======================================================
// ADMIN / PERMISSION HELPERS
// ======================================================

const isAdministrator = async (userId) => {
    const rows = await query(
        `
            SELECT is_admin
            FROM users
            WHERE id = ?
            LIMIT 1
        `,
        [userId]
    );

    return [true, 1, "1"].includes(rows[0]?.is_admin);
};

const hasFullAttendanceAccess = async (userId) => {
    const rows = await query(
        `
            SELECT permission
            FROM user_permissions
            WHERE user_id = ?
              AND module_name = 'Attendance'
            LIMIT 1
        `,
        [userId]
    );

    return rows[0]?.permission === "Full";
};

// ======================================================
// HEAD OFFICE STORE
// ======================================================

const getHeadOfficeStore = async () => {
    const rows = await query(`
        SELECT
            id,
            store_name,
            store_code,
            city,
            state,
            address
        FROM stores
        WHERE
            (
                store_code = '501'
                OR UPPER(store_name) = 'HEAD OFFICE MRC'
            )
            AND (status IS NULL OR status = 'Active')
        ORDER BY
            CASE
                WHEN store_code = '501' THEN 0
                ELSE 1
            END,
            id ASC
        LIMIT 1
    `);

    return rows[0] || null;
};

// ======================================================
// ASSIGNED STORE
// ======================================================
// Normal employee:
//     -> only their assigned store
//
// Admin / Full Attendance:
//     -> Head Office MRC
// ======================================================

const getAssignedAttendanceStore = async (
    userId,
    forceHeadOffice = false
) => {
    if (forceHeadOffice) {
        return getHeadOfficeStore();
    }

    const rows = await query(
        `
            SELECT
                s.id,
                s.store_name,
                s.store_code,
                s.city,
                s.state,
                s.address
            FROM user_stores us
            INNER JOIN stores s
                ON s.id = us.store_id
            WHERE us.user_id = ?
              AND (s.status IS NULL OR s.status = 'Active')
            ORDER BY s.id ASC
            LIMIT 1
        `,
        [userId]
    );

    return rows[0] || null;
};

// ======================================================
// CURRENT INDIA TIME
// ======================================================
// Attendance timestamps are generated on the server.
//
// This prevents the browser/frontend from sending an
// incorrect/stale check-in or check-out time.
//
// Stored DATETIME is India Standard Time (IST).
// ======================================================

const getCurrentIndiaDateTime = () => {
    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(now);

    const values = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );

    const date = `${values.year}-${values.month}-${values.day}`;
    const datetime = `${date} ${values.hour}:${values.minute}:${values.second}`;

    return { date, datetime };
};

// ======================================================
// ATTENDANCE CONTEXT
// ======================================================

const getContext = async (userId, workDate) => {
    const users = await query(
        `
            SELECT
                u.id,
                u.employee_id,
                u.name,
                u.email,
                u.department_id,
                d.department_name AS department,
                u.designation_id,
                dg.designation_name AS designation,
                u.is_admin
            FROM users u
            LEFT JOIN departments d
                ON d.id = u.department_id
            LEFT JOIN designations dg
                ON dg.id = u.designation_id
            WHERE u.id = ?
            LIMIT 1
        `,
        [userId]
    );

    const user = users[0] || null;

    if (!user) {
        return {
            user: null,
            stores: [],
            assignedStore: null,
            assignmentType: null,
            attendance: null
        };
    }

    // --------------------------------------------------
    // ADMIN / FULL ACCESS
    // --------------------------------------------------

    const administrator =
        [true, 1, "1"].includes(user.is_admin);

    const fullAttendanceAccess = administrator
        ? true
        : await hasFullAttendanceAccess(userId);

    // --------------------------------------------------
    // STORE ASSIGNMENT
    // --------------------------------------------------
    // Admin / Full:
    //     HEAD OFFICE MRC
    //
    // Normal:
    //     assigned store from user_stores
    // --------------------------------------------------

    const assignedStore =
        await getAssignedAttendanceStore(
            userId,
            administrator || fullAttendanceAccess
        );

    // --------------------------------------------------
    // EXISTING ATTENDANCE FOR REQUESTED DATE
    // --------------------------------------------------

    const attendance = await query(
        `
            SELECT
                a.id,
                a.employee_id,
                a.store_id,

                DATE_FORMAT(a.work_date, '%Y-%m-%d') AS work_date,

                a.status,

                DATE_FORMAT(a.check_in_at, '%Y-%m-%d %H:%i:%s') AS check_in_at,
                DATE_FORMAT(a.check_out_at, '%Y-%m-%d %H:%i:%s') AS check_out_at,

                a.check_in_latitude,
                a.check_in_longitude,
                a.check_in_accuracy,

                a.check_out_latitude,
                a.check_out_longitude,
                a.check_out_accuracy,

                a.check_in_photo,
                a.check_out_photo,

                a.check_in_remarks,
                a.check_out_remarks,

                DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,

                s.store_name,
                s.store_code
            FROM attendance_records a
            LEFT JOIN stores s
                ON s.id = a.store_id
            WHERE a.employee_id = ?
              AND a.work_date = ?
            ORDER BY
                a.check_in_at DESC,
                a.id DESC
            LIMIT 1
        `,
        [userId, workDate]
    );

    return {
        user,

        stores: assignedStore
            ? [assignedStore]
            : [],

        assignedStore,

        assignmentType:
            administrator || fullAttendanceAccess
                ? "head-office"
                : "user-assigned",

        attendance: attendance[0] || null
    };
};

// ======================================================
// GET TODAY'S RECORD
// ======================================================

const getRecord = async (userId, workDate) => {
    const rows = await query(
        `
            SELECT
                a.id,
                a.employee_id,
                a.store_id,

                DATE_FORMAT(a.work_date, '%Y-%m-%d') AS work_date,

                a.status,

                DATE_FORMAT(a.check_in_at, '%Y-%m-%d %H:%i:%s') AS check_in_at,
                DATE_FORMAT(a.check_out_at, '%Y-%m-%d %H:%i:%s') AS check_out_at,

                a.check_in_latitude,
                a.check_in_longitude,
                a.check_in_accuracy,

                a.check_out_latitude,
                a.check_out_longitude,
                a.check_out_accuracy,

                a.check_in_photo,
                a.check_out_photo,

                a.check_in_remarks,
                a.check_out_remarks,

                DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,

                s.store_name,
                s.store_code
            FROM attendance_records a
            LEFT JOIN stores s
                ON s.id = a.store_id
            WHERE a.employee_id = ?
              AND a.work_date = ?
            ORDER BY
                a.check_in_at DESC,
                a.id DESC
            LIMIT 1
        `,
        [userId, workDate]
    );

    return rows[0] || null;
};

// ======================================================
// CREATE CHECK-IN
// ======================================================
// IMPORTANT:
// check-in time and work date are generated by backend.
//
// Frontend cannot manipulate the attendance timestamp.
//
// This fixes:
// - old/stale check-in time
// - wrong browser time
// - refresh changing displayed time
// - check-in time not matching actual server time
// ======================================================

const createCheckIn = async (data) => {
    const current = await getCurrentIndiaDateTime();

    if (!current.datetime || !current.date) {
        throw new Error(
            "Unable to determine current India Standard Time."
        );
    }

    const result = await query(
        `
            INSERT INTO attendance_records
            (
                employee_id,
                store_id,
                work_date,
                status,
                check_in_at,
                check_in_latitude,
                check_in_longitude,
                check_in_accuracy,
                check_in_photo,
                check_in_remarks
            )
            VALUES
            (
                ?,
                ?,
                ?,
                'Present',
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `,
        [
            data.employeeId,

            data.storeId || null,

            // SERVER GENERATED INDIA DATE
            current.date,

            // SERVER GENERATED INDIA TIME
            current.datetime,

            data.latitude ?? null,
            data.longitude ?? null,
            data.accuracy ?? null,

            data.photo || null,
            data.remarks || null
        ]
    );

    return result.insertId;
};

// ======================================================
// CREATE CHECK-OUT
// ======================================================
// IMPORTANT:
// Check-out timestamp is also generated by backend.
//
// The supplied data.checkOutAt is intentionally ignored.
// ======================================================

const createCheckOut = async (data) => {
    const current = await getCurrentIndiaDateTime();

    if (!current.datetime) {
        throw new Error(
            "Unable to determine current India Standard Time."
        );
    }

    const result = await query(
        `
            UPDATE attendance_records
            SET
                status = 'Completed',
                check_out_at = ?,
                check_out_latitude = ?,
                check_out_longitude = ?,
                check_out_accuracy = ?,
                check_out_photo = ?,
                check_out_remarks = ?
            WHERE id = ?
              AND employee_id = ?
              AND work_date = ?
              AND check_in_at IS NOT NULL
              AND check_out_at IS NULL
        `,
        [
            current.datetime,
            data.latitude ?? null,
            data.longitude ?? null,
            data.accuracy ?? null,
            data.photo || null,
            data.remarks || null,
            data.id,
            data.employeeId,
            data.workDate
        ]
    );

    if (!result.affectedRows) {
        throw new Error(
            "Attendance checkout could not be completed because the record changed or is already closed."
        );
    }

    return getRecord(
        data.employeeId,
        data.workDate
    );
};

// ======================================================
// ATTENDANCE REPORT
// ======================================================

const getReport = async ({
    page = 1,
    pageSize = 10,
    search = "",
    userId = "",
    storeId = "",
    from = "",
    to = "",
    status = ""
}) => {
    const where = ["1=1"];
    const params = [];

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    if (search) {
        where.push(
            `
                (
                    u.name LIKE ?
                    OR u.employee_id LIKE ?
                    OR u.email LIKE ?
                    OR s.store_name LIKE ?
                    OR s.store_code LIKE ?
                )
            `
        );

        const q = `%${search}%`;

        params.push(
            q,
            q,
            q,
            q,
            q
        );
    }

    // --------------------------------------------------
    // EMPLOYEE
    // --------------------------------------------------

    if (userId) {
        where.push("a.employee_id = ?");
        params.push(userId);
    }

    // --------------------------------------------------
    // STORE
    // --------------------------------------------------

    if (storeId) {
        where.push("a.store_id = ?");
        params.push(storeId);
    }

    // --------------------------------------------------
    // FROM DATE
    // --------------------------------------------------

    if (from) {
        where.push("a.work_date >= ?");
        params.push(from);
    }

    // --------------------------------------------------
    // TO DATE
    // --------------------------------------------------

    if (to) {
        where.push("a.work_date <= ?");
        params.push(to);
    }

    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    if (status) {
        where.push("a.status = ?");
        params.push(status);
    }

    const whereSql = where.join(" AND ");

    // ==================================================
    // TOTAL COUNT
    // ==================================================

    const countRows = await query(
        `
            SELECT COUNT(*) AS total

            FROM attendance_records a

            INNER JOIN users u
                ON u.id = a.employee_id

            LEFT JOIN stores s
                ON s.id = a.store_id

            WHERE ${whereSql}
        `,
        params
    );

    const total =
        Number(countRows[0]?.total || 0);

    // ==================================================
    // PAGINATION
    // ==================================================

    const safePageSize = Math.min(
        Math.max(Number(pageSize) || 10, 5),
        10000
    );

    const safePage =
        Math.max(Number(page) || 1, 1);

    const offset =
        (safePage - 1) * safePageSize;

    // ==================================================
    // RECORDS
    // ==================================================

    const rows = await query(
        `
            SELECT

                a.id,
                DATE_FORMAT(a.work_date, '%Y-%m-%d') AS work_date,
                a.status,

                DATE_FORMAT(a.check_in_at, '%Y-%m-%d %H:%i:%s') AS check_in_at,
                DATE_FORMAT(a.check_out_at, '%Y-%m-%d %H:%i:%s') AS check_out_at,

                a.check_in_latitude,
                a.check_in_longitude,
                a.check_in_accuracy,

                a.check_out_latitude,
                a.check_out_longitude,
                a.check_out_accuracy,

                a.check_in_photo,
                a.check_out_photo,

                a.check_in_remarks,
                a.check_out_remarks,

                u.id AS user_id,
                u.employee_id,
                u.name,
                u.email,

                d.department_name AS department,

                dg.designation_name AS designation,

                s.id AS store_id,
                s.store_name,
                s.store_code

            FROM attendance_records a

            INNER JOIN users u
                ON u.id = a.employee_id

            LEFT JOIN departments d
                ON d.id = u.department_id

            LEFT JOIN designations dg
                ON dg.id = u.designation_id

            LEFT JOIN stores s
                ON s.id = a.store_id

            WHERE ${whereSql}

            ORDER BY
                a.work_date DESC,
                COALESCE(
                    a.check_in_at,
                    a.created_at
                ) DESC

            LIMIT ?
            OFFSET ?
        `,
        [
            ...params,
            safePageSize,
            offset
        ]
    );

    // ==================================================
    // SUMMARY
    // ==================================================

    const summaryRows = await query(
        `
            SELECT

                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN a.status = 'Present'
                        THEN 1
                        ELSE 0
                    END
                ) AS present,

                SUM(
                    CASE
                        WHEN a.status = 'Completed'
                        THEN 1
                        ELSE 0
                    END
                ) AS completed,

                SUM(
                    CASE
                        WHEN
                            a.check_in_at IS NOT NULL
                            AND TIME(a.check_in_at) > '09:15:00'
                        THEN 1
                        ELSE 0
                    END
                ) AS late,

                SUM(
                    CASE
                        WHEN
                            a.check_in_at IS NOT NULL
                            AND a.check_out_at IS NULL
                        THEN 1
                        ELSE 0
                    END
                ) AS open_sessions

            FROM attendance_records a

            INNER JOIN users u
                ON u.id = a.employee_id

            LEFT JOIN stores s
                ON s.id = a.store_id

            WHERE ${whereSql}
        `,
        params
    );

    return {
        rows,

        total,

        page: safePage,

        pageSize: safePageSize,

        pages: Math.max(
            Math.ceil(total / safePageSize),
            1
        ),

        summary:
            summaryRows[0] || {}
    };
};

// ======================================================
// EMPLOYEES
// ======================================================

const getEmployees = async () =>
    query(`
        SELECT
            id,
            employee_id,
            name,
            email
        FROM users
        WHERE status = 'Active'
        ORDER BY name ASC
    `);

// ======================================================
// STORES
// ======================================================

const getStores = async () =>
    query(`
        SELECT
            id,
            store_name,
            store_code
        FROM stores
        WHERE status IS NULL
           OR status = 'Active'
        ORDER BY store_name ASC
    `);

// ======================================================
// DELETE SINGLE ATTENDANCE
// ======================================================

const deleteRecord = async (id) => {
    const rows = await query(
        `
            SELECT
                id,
                check_in_photo,
                check_out_photo
            FROM attendance_records
            WHERE id = ?
            LIMIT 1
        `,
        [id]
    );

    if (!rows.length) {
        return null;
    }

    await query(
        `
            DELETE FROM attendance_records
            WHERE id = ?
        `,
        [id]
    );

    return rows[0];
};

// ======================================================
// DELETE ALL ATTENDANCE
// ======================================================

const deleteAllRecords = async () => {
    const photos = await query(`
        SELECT
            check_in_photo,
            check_out_photo
        FROM attendance_records
    `);

    await query(`
        DELETE FROM attendance_records
    `);

    return photos;
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    createTables,

    isAdministrator,
    hasFullAttendanceAccess,

    getHeadOfficeStore,
    getAssignedAttendanceStore,

    getContext,
    getRecord,

    createCheckIn,
    createCheckOut,

    getReport,

    getEmployees,
    getStores,

    deleteRecord,
    deleteAllRecords
};
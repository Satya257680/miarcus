const db = require("../config/db");

const DailyCollection = {};

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

DailyCollection.ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS daily_collection_reports (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            store_id INT NOT NULL,
            report_date DATE NOT NULL,
            submitted_by INT NULL,
            submitted_at DATETIME NULL,
            total_billed DECIMAL(14,2) NULL,
            bill_count INT NULL,
            upi_amount DECIMAL(14,2) NULL,
            cash_amount DECIMAL(14,2) NULL,
            bank_transfer_amount DECIMAL(14,2) NULL,
            card_amount DECIMAL(14,2) NULL,
            total_collected DECIMAL(14,2) NULL,
            variance DECIMAL(14,2) NULL,
            notes TEXT NULL,
            status ENUM('missing','submitted','locked') NOT NULL DEFAULT 'missing',
            reminder_sent_at DATETIME NULL,
            escalation_sent_at DATETIME NULL,
            reminder_claimed_at DATETIME NULL,
            escalation_claimed_at DATETIME NULL,
            blocked_at DATETIME NULL,
            blocked_by INT NULL,
            approved_at DATETIME NULL,
            approved_by INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_daily_collection_store_date (store_id, report_date),
            INDEX idx_daily_collection_date_status (report_date, status),
            INDEX idx_daily_collection_submitted_by (submitted_by),
            CONSTRAINT fk_daily_collection_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_daily_collection_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_daily_collection_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Safe migrations for installations that already have the Daily Collection table.
    for (const [column, definition] of [
        ["reminder_claimed_at", "DATETIME NULL"],
        ["escalation_claimed_at", "DATETIME NULL"]
    ]) {
        try {
            await db.query(`ALTER TABLE daily_collection_reports ADD COLUMN ${column} ${definition}`);
        } catch (error) {
            if (error?.code !== "ER_DUP_FIELDNAME") {
                console.error(`Daily Collection migration (${column}) skipped:`, error.message || error);
            }
        }
    }

    try {
        await db.query(`ALTER TABLE daily_collection_access_controls ADD COLUMN blocked_by INT NULL`);
    } catch (error) {
        if (error?.code !== "ER_DUP_FIELDNAME") {
            console.error("Daily Collection access-control migration skipped:", error.message || error);
        }
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS daily_collection_email_settings (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            email_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_by INT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_daily_collection_email_admin FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
        INSERT INTO daily_collection_email_settings (id, email_enabled)
        VALUES (1, 1)
        ON DUPLICATE KEY UPDATE id = id
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS daily_collection_access_controls (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            store_id INT NOT NULL,
            report_date DATE NOT NULL,
            blocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            blocked_by INT NULL,
            unblocked_at DATETIME NULL,
            unblocked_by INT NULL,
            reason VARCHAR(255) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_daily_collection_block (user_id, store_id, report_date),
            INDEX idx_daily_collection_block_active (user_id, unblocked_at),
            CONSTRAINT fk_daily_collection_block_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_daily_collection_block_store FOREIGN KEY (store_id) REFERENCES stores(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_daily_collection_block_admin FOREIGN KEY (unblocked_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

DailyCollection.getStoreManagers = async (storeId) => {
    const rows = await db.query(`
        SELECT DISTINCT
            u.id, u.name, u.email, u.call_contact,
            s.store_name,
            COALESCE(NULLIF(TRIM(mu.name), ''), NULLIF(TRIM(s.manager_name), '')) AS manager_name,
            s.email AS store_email
        FROM users u
        INNER JOIN user_stores us ON us.user_id = u.id
        INNER JOIN stores s ON s.id = us.store_id
        INNER JOIN user_permissions up ON up.user_id = u.id
        LEFT JOIN chat_store_managers csm ON csm.store_id = s.id
        LEFT JOIN users mu ON mu.id = csm.user_id AND mu.status = 'Active'
        WHERE us.store_id = ?
          AND u.status = 'Active'
          AND u.is_admin = 0
          AND up.module_name = 'Daily Collection'
          AND up.permission IN ('View', 'Add', 'Edit', 'Full')
        ORDER BY u.id ASC
    `, [storeId]);
    return rows;
};

DailyCollection.getAdminRecipients = async () => {
    return db.query(`
        SELECT id, name, email
        FROM users
        WHERE is_admin = 1
          AND status = 'Active'
          AND email IS NOT NULL
          AND TRIM(email) <> ''
        ORDER BY id ASC
    `);
};

DailyCollection.getEmailSettings = async () => {
    const rows = await db.query(`
        SELECT email_enabled, updated_by, updated_at
        FROM daily_collection_email_settings
        WHERE id = 1
        LIMIT 1
    `);
    const row = rows[0] || {};
    return {
        email_enabled: Boolean(row.email_enabled ?? 1),
        updated_by: row.updated_by || null,
        updated_at: row.updated_at || null
    };
};

DailyCollection.updateEmailSettings = async (enabled, adminId) => {
    await db.query(`
        INSERT INTO daily_collection_email_settings (id, email_enabled, updated_by)
        VALUES (1, ?, ?)
        ON DUPLICATE KEY UPDATE
            email_enabled = VALUES(email_enabled),
            updated_by = VALUES(updated_by)
    `, [enabled ? 1 : 0, adminId]);
    return DailyCollection.getEmailSettings();
};

// Atomic claims prevent duplicate emails when multiple scheduler instances
// happen to execute the same deadline check at the same time.
DailyCollection.claimReminder = async (id) => {
    const result = await db.query(`
        UPDATE daily_collection_reports
        SET reminder_claimed_at = NOW()
        WHERE id = ?
          AND status = 'missing'
          AND reminder_sent_at IS NULL
          AND (reminder_claimed_at IS NULL OR reminder_claimed_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
    `, [id]);
    return Number(result.affectedRows || 0) > 0;
};

DailyCollection.releaseReminderClaim = async (id) => {
    await db.query(`
        UPDATE daily_collection_reports
        SET reminder_claimed_at = NULL
        WHERE id = ? AND reminder_sent_at IS NULL
    `, [id]);
};

DailyCollection.claimEscalation = async (id) => {
    const result = await db.query(`
        UPDATE daily_collection_reports
        SET escalation_claimed_at = NOW()
        WHERE id = ?
          AND status = 'missing'
          AND escalation_sent_at IS NULL
          AND (escalation_claimed_at IS NULL OR escalation_claimed_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
    `, [id]);
    return Number(result.affectedRows || 0) > 0;
};

DailyCollection.releaseEscalationClaim = async (id) => {
    await db.query(`
        UPDATE daily_collection_reports
        SET escalation_claimed_at = NULL
        WHERE id = ? AND escalation_sent_at IS NULL
    `, [id]);
};

DailyCollection.getStoreScopeForUser = async (userId) => {
    return db.query(`
        SELECT s.id, s.store_name, s.store_code, s.email, s.manager_name
        FROM stores s
        INNER JOIN user_stores us ON us.store_id = s.id
        WHERE us.user_id = ?
          AND s.status = 'Active'
        ORDER BY s.store_name ASC
    `, [userId]);
};

DailyCollection.getEntryStoresForUser = async (userId) => {
    // Daily Entry is intentionally restricted to stores where this user is
    // the explicitly assigned store manager. This keeps the entry screen
    // separate from the broader user_stores/report visibility scope.
    return db.query(`
        SELECT
            s.id,
            s.store_name,
            s.store_code,
            s.email,
            s.manager_name,
            m.user_id AS manager_id
        FROM chat_store_managers m
        INNER JOIN stores s ON s.id = m.store_id
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.user_id = ?
          AND u.status = 'Active'
          AND s.status = 'Active'
        ORDER BY s.store_name ASC
    `, [userId]);
};

DailyCollection.getActiveStore = async (storeId) => {
    const rows = await db.query(`
        SELECT id, store_name, store_code
        FROM stores
        WHERE id = ? AND status = 'Active'
        LIMIT 1
    `, [storeId]);
    return rows[0] || null;
};

DailyCollection.getStores = async () => {
    return db.query(`
        SELECT id, store_name, store_code, email, manager_name, status
        FROM stores
        WHERE status = 'Active'
        ORDER BY store_name ASC
    `);
};

DailyCollection.getBillSummary = async (storeId, reportDate) => {
    const rows = await db.query(`
        SELECT
            COUNT(DISTINCT b.id) AS bill_count,
            COALESCE(SUM(b.grand_total), 0) AS total_billed,
            COALESCE(SUM(CASE WHEN p.payment_type = 'UPI' THEN p.amount ELSE 0 END), 0) AS system_upi,
            COALESCE(SUM(CASE WHEN p.payment_type = 'Cash' THEN p.amount ELSE 0 END), 0) AS system_cash,
            COALESCE(SUM(CASE WHEN p.payment_type = 'Bank Transfer' THEN p.amount ELSE 0 END), 0) AS system_bank_transfer,
            COALESCE(SUM(CASE WHEN p.payment_type = 'Card' THEN p.amount ELSE 0 END), 0) AS system_card
        FROM bills b
        LEFT JOIN payments p ON p.id = (
            SELECT MAX(p2.id) FROM payments p2 WHERE p2.bill_id = b.id
        )
        WHERE b.store_id = ?
          AND DATE(b.bill_date) = ?
          AND b.status <> 'CANCELLED'
    `, [storeId, reportDate]);

    return rows[0] || {
        bill_count: 0,
        total_billed: 0,
        system_upi: 0,
        system_cash: 0,
        system_bank_transfer: 0,
        system_card: 0
    };
};

DailyCollection.getReport = async ({ userId, isAdmin, storeId, date }) => {
    const params = [date];
    let scope = "";

    if (!isAdmin) {
        scope = ` AND s.id IN (
            SELECT us.store_id FROM user_stores us WHERE us.user_id = ?
        )`;
        params.push(userId);
    }

    if (storeId) {
        scope += " AND s.id = ?";
        params.push(storeId);
    }

    return db.query(`
        SELECT
            r.*,
            s.store_name,
            s.store_code,
            COALESCE(NULLIF(TRIM(mu.name), ''), NULLIF(TRIM(s.manager_name), '')) AS manager_name,
            u.name AS submitted_by_name,
            au.name AS approved_by_name
        FROM daily_collection_reports r
        INNER JOIN stores s ON s.id = r.store_id
        LEFT JOIN chat_store_managers csm ON csm.store_id = s.id
        LEFT JOIN users mu ON mu.id = csm.user_id AND mu.status = 'Active'
        LEFT JOIN users u ON u.id = r.submitted_by
        LEFT JOIN users au ON au.id = r.approved_by
        WHERE r.report_date = ?
          ${scope}
        ORDER BY s.store_name ASC
    `, params);
};

DailyCollection.ensureDueRows = async (reportDate) => {
    await db.query(`
        INSERT INTO daily_collection_reports (store_id, report_date, status)
        SELECT s.id, ?, 'missing'
        FROM stores s
        WHERE s.status = 'Active'
          AND NOT EXISTS (
              SELECT 1
              FROM daily_collection_reports r
              WHERE r.store_id = s.id AND r.report_date = ?
          )
    `, [reportDate, reportDate]);
};

DailyCollection.getEscalationCandidates = async (reportDate) => {
    return db.query(`
        SELECT r.*, s.store_name, s.store_code,
               COALESCE(NULLIF(TRIM(mu.name), ''), NULLIF(TRIM(s.manager_name), '')) AS manager_name,
               s.email AS store_email
        FROM daily_collection_reports r
        INNER JOIN stores s ON s.id = r.store_id
        LEFT JOIN chat_store_managers csm ON csm.store_id = s.id
        LEFT JOIN users mu ON mu.id = csm.user_id AND mu.status = 'Active' 
        WHERE r.report_date = ?
          AND r.escalation_sent_at IS NULL
          AND r.status IN ('missing', 'locked')
          AND r.blocked_at IS NOT NULL
        ORDER BY s.store_name ASC
    `, [reportDate]);
};

DailyCollection.getMissingReports = async (reportDate) => {
    return db.query(`
        SELECT r.*, s.store_name, s.store_code,
               COALESCE(NULLIF(TRIM(mu.name), ''), NULLIF(TRIM(s.manager_name), '')) AS manager_name,
               s.email AS store_email
        FROM daily_collection_reports r
        INNER JOIN stores s ON s.id = r.store_id
        LEFT JOIN chat_store_managers csm ON csm.store_id = s.id
        LEFT JOIN users mu ON mu.id = csm.user_id AND mu.status = 'Active' 
        WHERE r.report_date = ?
          AND r.status = 'missing'
        ORDER BY s.store_name ASC
    `, [reportDate]);
};

DailyCollection.markReminderSent = async (id) => {
    await db.query(`
        UPDATE daily_collection_reports
        SET reminder_sent_at = COALESCE(reminder_sent_at, NOW())
        WHERE id = ?
    `, [id]);
};

DailyCollection.lockReport = async (id, markEscalationSent = true) => {
    await db.query(`
        UPDATE daily_collection_reports
        SET status = 'locked',
            blocked_at = COALESCE(blocked_at, NOW()),
            escalation_sent_at = CASE
                WHEN ? = 1 THEN COALESCE(escalation_sent_at, NOW())
                ELSE escalation_sent_at
            END
        WHERE id = ? AND status = 'missing'
    `, [markEscalationSent ? 1 : 0, id]);
};

DailyCollection.submitReport = async ({
    reportId, storeId, reportDate, submittedBy,
    upiAmount, cashAmount, bankTransferAmount, cardAmount, notes
}) => {
    const summary = await DailyCollection.getBillSummary(storeId, reportDate);
    const amounts = {
        upi: num(upiAmount),
        cash: num(cashAmount),
        bank: num(bankTransferAmount),
        card: num(cardAmount)
    };
    const totalCollected = num(amounts.upi + amounts.cash + amounts.bank + amounts.card);
    const totalBilled = num(summary.total_billed);
    const variance = num(totalCollected - totalBilled);

    const existing = await db.query(`
        SELECT id FROM daily_collection_reports
        WHERE id = ? AND store_id = ? AND report_date = ?
        LIMIT 1
    `, [reportId, storeId, reportDate]);

    if (!existing.length) {
        const error = new Error("Daily collection report was not found.");
        error.status = 404;
        throw error;
    }

    await db.query(`
        UPDATE daily_collection_reports
        SET submitted_by = ?,
            submitted_at = NOW(),
            total_billed = ?,
            bill_count = ?,
            upi_amount = ?,
            cash_amount = ?,
            bank_transfer_amount = ?,
            card_amount = ?,
            total_collected = ?,
            variance = ?,
            notes = ?,
            status = 'submitted'
        WHERE id = ?
    `, [
        submittedBy, totalBilled, Number(summary.bill_count || 0),
        amounts.upi, amounts.cash, amounts.bank, amounts.card,
        totalCollected, variance, notes || null, reportId
    ]);

    return {
        reportId,
        storeId,
        reportDate,
        ...summary,
        total_billed: totalBilled,
        bill_count: Number(summary.bill_count || 0),
        upi_amount: amounts.upi,
        cash_amount: amounts.cash,
        bank_transfer_amount: amounts.bank,
        card_amount: amounts.card,
        total_collected: totalCollected,
        variance
    };
};

DailyCollection.getActiveBlock = async (userId, storeId = null) => {
    const params = [userId];
    const storeFilter = storeId ? " AND c.store_id = ?" : "";
    if (storeId) params.push(Number(storeId));
    const rows = await db.query(`
        SELECT c.*, s.store_name
        FROM daily_collection_access_controls c
        INNER JOIN stores s ON s.id = c.store_id
        WHERE c.user_id = ? AND c.unblocked_at IS NULL
          ${storeFilter}
        ORDER BY c.blocked_at DESC
        LIMIT 1
    `, params);
    return rows[0] || null;
};

DailyCollection.blockManagersForStore = async (storeId, reportDate, reason) => {
    const managers = await DailyCollection.getStoreManagers(storeId);
    for (const manager of managers) {
        await db.query(`
            INSERT INTO daily_collection_access_controls
                (user_id, store_id, report_date, reason)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                blocked_at = COALESCE(blocked_at, NOW()),
                reason = VALUES(reason),
                unblocked_at = IF(unblocked_at IS NULL, NULL, unblocked_at),
                unblocked_by = IF(unblocked_at IS NULL, unblocked_by, NULL)
        `, [manager.id, storeId, reportDate, reason]);
    }
    return managers;
};

DailyCollection.blockUsersForStore = async (storeId, reportDate, reason, adminId) => {
    const users = await DailyCollection.getStoreManagers(storeId);
    for (const user of users) {
        await db.query(`
            INSERT INTO daily_collection_access_controls
                (user_id, store_id, report_date, reason, blocked_by)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                blocked_at = NOW(),
                reason = VALUES(reason),
                blocked_by = VALUES(blocked_by),
                unblocked_at = NULL,
                unblocked_by = NULL
        `, [user.id, storeId, reportDate, reason, adminId]);
    }
    return users;
};

DailyCollection.getBlockedReports = async () => {
    return db.query(`
        SELECT
            MIN(c.id) AS control_id,
            c.store_id,
            c.report_date,
            MAX(c.blocked_at) AS blocked_at,
            MAX(c.blocked_by) AS blocked_by,
            MAX(c.reason) AS reason,
            s.store_name,
            COUNT(*) AS blocked_user_count,
            GROUP_CONCAT(c.id ORDER BY c.id SEPARATOR ',') AS control_ids
        FROM daily_collection_access_controls c
        INNER JOIN users u ON u.id = c.user_id
        INNER JOIN stores s ON s.id = c.store_id
        WHERE c.unblocked_at IS NULL
          AND COALESCE(u.is_admin, 0) = 0
          AND u.status = 'Active'
        GROUP BY c.store_id, c.report_date, s.store_name
        ORDER BY MAX(c.blocked_at) DESC
    `);
};

DailyCollection.getReportById = async ({ id, userId, isAdmin }) => {
    const params = [Number(id)];
    let scope = '';
    if (!isAdmin) {
        scope = ` AND r.store_id IN (
            SELECT us.store_id FROM user_stores us WHERE us.user_id = ?
        )`;
        params.push(userId);
    }
    const rows = await db.query(`
        SELECT
            r.*,
            s.store_name,
            s.store_code,
            COALESCE(NULLIF(TRIM(mu.name), ''), NULLIF(TRIM(s.manager_name), '')) AS manager_name,
            u.name AS submitted_by_name,
            au.name AS approved_by_name
        FROM daily_collection_reports r
        INNER JOIN stores s ON s.id = r.store_id
        LEFT JOIN chat_store_managers csm ON csm.store_id = s.id
        LEFT JOIN users mu ON mu.id = csm.user_id AND mu.status = 'Active'
        LEFT JOIN users u ON u.id = r.submitted_by
        LEFT JOIN users au ON au.id = r.approved_by
        WHERE r.id = ? ${scope}
        LIMIT 1
    `, params);
    return rows[0] || null;
};

DailyCollection.getReportForStoreDate = async (storeId, reportDate) => {
    const rows = await db.query(`
        SELECT id, store_id, report_date, status
        FROM daily_collection_reports
        WHERE store_id = ? AND report_date = ?
        LIMIT 1
    `, [storeId, reportDate]);
    return rows[0] || null;
};

DailyCollection.getStoreByIdentifier = async ({ storeId, storeCode, storeName }) => {
    if (storeId) {
        const rows = await db.query(`
            SELECT id, store_name, store_code, status
            FROM stores WHERE id = ? AND status = 'Active' LIMIT 1
        `, [Number(storeId)]);
        if (rows[0]) return rows[0];
    }
    if (storeCode) {
        const rows = await db.query(`
            SELECT id, store_name, store_code, status
            FROM stores WHERE store_code = ? AND status = 'Active' LIMIT 1
        `, [String(storeCode).trim()]);
        if (rows[0]) return rows[0];
    }
    if (storeName) {
        const rows = await db.query(`
            SELECT id, store_name, store_code, status
            FROM stores WHERE store_name = ? AND status = 'Active' LIMIT 1
        `, [String(storeName).trim()]);
        if (rows[0]) return rows[0];
    }
    return null;
};

DailyCollection.deleteReport = async (id) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const rows = await connection.query(
            `SELECT store_id, report_date FROM daily_collection_reports WHERE id = ? LIMIT 1`,
            [Number(id)]
        );
        if (!rows[0]?.length) {
            await connection.rollback();
            return false;
        }
        const report = rows[0][0];
        await connection.query(
            `DELETE FROM daily_collection_access_controls WHERE store_id = ? AND report_date = ?`,
            [report.store_id, report.report_date]
        );
        const result = await connection.query(
            `DELETE FROM daily_collection_reports WHERE id = ?`,
            [Number(id)]
        );
        await connection.commit();
        return Number(result[0]?.affectedRows || 0) > 0;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

DailyCollection.deleteAllReports = async () => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(`DELETE FROM daily_collection_access_controls`);
        const result = await connection.query(`DELETE FROM daily_collection_reports`);
        await connection.commit();
        return Number(result[0]?.affectedRows || 0);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

DailyCollection.unblock = async (controlId, adminId) => {
    const result = await db.query(`
        UPDATE daily_collection_access_controls
        SET unblocked_at = NOW(), unblocked_by = ?
        WHERE id = ? AND unblocked_at IS NULL
    `, [adminId, controlId]);
    return result.affectedRows > 0;
};

module.exports = DailyCollection;

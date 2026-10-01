const db = require("../config/db");

const MODULE = "Petty Cash";

const PettyCash = {
    async createTables() {
        await db.query(`
            CREATE TABLE IF NOT EXISTS petty_cash_advances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                advance_no VARCHAR(100) NOT NULL UNIQUE,
                store_id INT NOT NULL,
                paid_by INT NOT NULL,
                received_by INT NOT NULL,
                advance_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                purpose VARCHAR(500) NULL,
                advance_date DATE NOT NULL,
                status ENUM('OPEN','PARTIALLY_SETTLED','SETTLED','CANCELLED') NOT NULL DEFAULT 'OPEN',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_pca_store (store_id),
                INDEX idx_pca_paid (paid_by),
                INDEX idx_pca_received (received_by),
                INDEX idx_pca_date (advance_date),
                INDEX idx_pca_status (status)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS petty_cash_expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                advance_id INT NOT NULL,
                expense_type VARCHAR(120) NOT NULL,
                description VARCHAR(500) NULL,
                amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                bill_filename VARCHAR(500) NULL,
                bill_path VARCHAR(1000) NULL,
                expense_date DATE NOT NULL,
                entered_by INT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_pce_advance (advance_id),
                CONSTRAINT fk_pce_advance FOREIGN KEY (advance_id) REFERENCES petty_cash_advances(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS petty_cash_deposits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                advance_id INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                deposited_by INT NOT NULL,
                received_by INT NOT NULL,
                deposit_date DATE NOT NULL,
                reference_no VARCHAR(150) NULL,
                receipt_filename VARCHAR(500) NULL,
                receipt_path VARCHAR(1000) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_pcd_advance (advance_id),
                CONSTRAINT fk_pcd_advance FOREIGN KEY (advance_id) REFERENCES petty_cash_advances(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS petty_cash_settlements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                advance_id INT NOT NULL UNIQUE,
                advance_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                total_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
                total_deposit DECIMAL(15,2) NOT NULL DEFAULT 0,
                balance DECIMAL(15,2) NOT NULL DEFAULT 0,
                settled_by INT NOT NULL,
                settled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status ENUM('SETTLED') NOT NULL DEFAULT 'SETTLED',
                INDEX idx_pcs_advance (advance_id),
                CONSTRAINT fk_pcs_advance FOREIGN KEY (advance_id) REFERENCES petty_cash_advances(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS petty_cash_email_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                advance_created TINYINT(1) NOT NULL DEFAULT 1,
                expense_added TINYINT(1) NOT NULL DEFAULT 1,
                deposit_added TINYINT(1) NOT NULL DEFAULT 1,
                settlement_completed TINYINT(1) NOT NULL DEFAULT 1,
                advance_cancelled TINYINT(1) NOT NULL DEFAULT 1,
                recipient_mode VARCHAR(20) NOT NULL DEFAULT 'direct',
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_pces_user (user_id)
            )
        `);

        // Recipient preferences were added after the first Petty Cash release.
        // Add them safely for existing installations without requiring a manual SQL migration.
        const recipientColumns = [
            ["send_to_giver", "TINYINT(1) NOT NULL DEFAULT 1"],
            ["send_to_receiver", "TINYINT(1) NOT NULL DEFAULT 1"],
            ["send_to_reporting_manager", "TINYINT(1) NOT NULL DEFAULT 0"],
            ["send_to_admins", "TINYINT(1) NOT NULL DEFAULT 0"],
            ["recipient_mode", "VARCHAR(20) NOT NULL DEFAULT 'direct'"]
        ];
        for (const [column, definition] of recipientColumns) {
            try {
                await db.query(`ALTER TABLE petty_cash_email_settings ADD COLUMN ${column} ${definition}`);
            } catch (error) {
                // ER_DUP_FIELDNAME means the column already exists.
                if (error?.code !== "ER_DUP_FIELDNAME") {
                    console.error(`Petty Cash email settings migration (${column}) skipped:`, error.message || error);
                }
            }
        }

        await PettyCash.ensureEmailRecipientsTable();
        await PettyCash.ensureAdvanceColumns();

        // Seed the global row from an existing administrator's settings once.
        // This preserves today's notification choices when the central mode is introduced.
        try {
            const globalRows = await db.query(`SELECT id FROM petty_cash_email_settings WHERE user_id=0 LIMIT 1`);
            if (!globalRows.length) {
                const adminRows = await db.query(`
                    SELECT p.advance_created,p.expense_added,p.deposit_added,p.settlement_completed,p.advance_cancelled,p.recipient_mode
                    FROM petty_cash_email_settings p
                    INNER JOIN users u ON u.id=p.user_id
                    WHERE (u.is_admin=1 OR u.administrator=1 OR u.is_admin=true OR u.administrator=true)
                    ORDER BY p.user_id
                    LIMIT 1
                `);

                if (adminRows.length) {
                    const row = adminRows[0];
                    await db.query(`
                        INSERT INTO petty_cash_email_settings
                            (user_id,advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled,recipient_mode)
                        VALUES (0,?,?,?,?,?,?)
                    `, [
                        row.advance_created,
                        row.expense_added,
                        row.deposit_added,
                        row.settlement_completed,
                        row.advance_cancelled,
                        row.recipient_mode === "everyone" ? "everyone" : "direct"
                    ]);
                }
            }
        } catch (globalSettingsMigrationError) {
            console.error("Petty Cash global email settings migration skipped:", globalSettingsMigrationError.message || globalSettingsMigrationError);
        }

        // One-time migration: copy existing Expenses access into the new
        // dedicated Petty Cash module so current users keep access after deploy.
        // Future Petty Cash permissions are independent.
        try {
            await db.query(`
                INSERT INTO user_permissions (user_id, module_name, permission)
                SELECT ep.user_id, 'Petty Cash', ep.permission
                FROM user_permissions ep
                WHERE ep.module_name='Expenses'
                  AND NOT EXISTS (
                      SELECT 1 FROM user_permissions pp
                      WHERE pp.user_id=ep.user_id AND pp.module_name='Petty Cash'
                  )
            `);
        } catch (permissionMigrationError) {
            console.error("Petty Cash permission migration skipped:", permissionMigrationError.message);
        }

        console.log("✅ Petty Cash tables verified");
    },

    // Contact list for "Specific" routing (like NSO / Checklist email
    // routing). Also called lazily so the page works even before the
    // server has been restarted after an update.
    async ensureEmailRecipientsTable() {
        if (PettyCash._recipientsTableReady) return;
        await db.query(`
            CREATE TABLE IF NOT EXISTS petty_cash_email_recipients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_key VARCHAR(120) NOT NULL UNIQUE,
                role_label VARCHAR(150) NOT NULL DEFAULT 'Recipient',
                contact_name VARCHAR(150) NULL,
                email VARCHAR(255) NULL,
                user_id INT NULL,
                is_custom TINYINT(1) NOT NULL DEFAULT 0,
                enabled TINYINT(1) NOT NULL DEFAULT 1,
                advance_created TINYINT(1) NOT NULL DEFAULT 1,
                expense_added TINYINT(1) NOT NULL DEFAULT 1,
                deposit_added TINYINT(1) NOT NULL DEFAULT 1,
                settlement_completed TINYINT(1) NOT NULL DEFAULT 1,
                advance_cancelled TINYINT(1) NOT NULL DEFAULT 1,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_pcer_enabled (enabled)
            )
        `);

        try {
            await db.query(`ALTER TABLE petty_cash_email_recipients ADD COLUMN removed TINYINT(1) NOT NULL DEFAULT 0`);
        } catch (error) {
            if (error?.code !== "ER_DUP_FIELDNAME") {
                console.error("Petty Cash email recipients migration (removed) skipped:", error.message || error);
            }
        }
        for (const [column, definition] of [
            ["include_direct", "TINYINT(1) NOT NULL DEFAULT 1"],
            ["master_enabled", "TINYINT(1) NOT NULL DEFAULT 1"]
        ]) {
            try {
                await db.query(`ALTER TABLE petty_cash_email_settings ADD COLUMN ${column} ${definition}`);
            } catch (error) {
                if (error?.code !== "ER_DUP_FIELDNAME") {
                    console.error(`Petty Cash email settings migration (${column}) skipped:`, error.message || error);
                }
            }
        }
        PettyCash._recipientsTableReady = true;
    },

    // Supporting document of the advance itself (mandatory from this
    // release). Added lazily so existing databases upgrade on their own.
    async ensureAdvanceColumns() {
        if (PettyCash._advanceColumnsReady) return;
        for (const [column, definition] of [
            ["attachment_filename", "VARCHAR(500) NULL"],
            ["attachment_path", "VARCHAR(1000) NULL"],
            ["created_by", "INT NULL"],
            ["updated_by", "INT NULL"]
        ]) {
            try {
                await db.query(`ALTER TABLE petty_cash_advances ADD COLUMN ${column} ${definition}`);
            } catch (error) {
                if (error?.code !== "ER_DUP_FIELDNAME") {
                    console.error(`Petty Cash advance migration (${column}) skipped:`, error.message || error);
                }
            }
        }
        PettyCash._advanceColumnsReady = true;
    },

    async getNextAdvanceNo() {
        const rows = await db.query(`
            SELECT advance_no FROM petty_cash_advances
            WHERE advance_no REGEXP '^ADV-[0-9]+$'
            ORDER BY CAST(SUBSTRING(advance_no, 5) AS UNSIGNED) DESC
            LIMIT 1
        `);
        const last = Number(String(rows?.[0]?.advance_no || "ADV-0").slice(4)) || 0;
        let next = last + 1;
        // Guard against a manually typed number already using the slot.
        for (let i = 0; i < 50; i += 1) {
            const candidate = `ADV-${String(next).padStart(3, "0")}`;
            const used = await db.query(`SELECT 1 FROM petty_cash_advances WHERE advance_no=? LIMIT 1`, [candidate]);
            if (!used.length) return candidate;
            next += 1;
        }
        return `ADV-${Date.now()}`;
    },

    async updateAdvance(id, data) {
        await PettyCash.ensureAdvanceColumns();
        const sets = ["advance_amount=?", "purpose=?", "advance_date=?", "updated_at=NOW()"];
        const params = [data.advance_amount, data.purpose, data.advance_date];
        if (data.updated_by) { sets.push("updated_by=?"); params.push(data.updated_by); }
        if (data.attachment_path) {
            sets.push("attachment_filename=?", "attachment_path=?");
            params.push(data.attachment_filename || null, data.attachment_path);
        }
        params.push(id);
        const result = await db.query(`UPDATE petty_cash_advances SET ${sets.join(", ")} WHERE id=?`, params);
        await PettyCash.refreshStatus(id);
        return result;
    },

    // Shared WHERE builder for the advance-level filters used by the
    // Manage Expenses / Manage Deposits registers.
    scopeFilters(filters = {}, userId, admin = false) {
        const where = [];
        const params = [];
        if (!admin) {
            where.push(`EXISTS (SELECT 1 FROM user_stores scope_us WHERE scope_us.user_id=? AND scope_us.store_id=a.store_id)`);
            params.push(userId);
        }
        if (filters.store_id) { where.push("a.store_id=?"); params.push(filters.store_id); }
        if (filters.status) { where.push("a.status=?"); params.push(filters.status); }
        if (filters.advance_id) { where.push("a.id=?"); params.push(filters.advance_id); }
        return { where, params };
    },

    async listExpenses(filters = {}, userId, admin = false) {
        const { where, params } = PettyCash.scopeFilters(filters, userId, admin);
        if (filters.search) {
            const term = `%${filters.search}%`;
            where.push(`(a.advance_no LIKE ? OR e.expense_type LIKE ? OR COALESCE(e.description,'') LIKE ? OR COALESCE(s.store_name,'') LIKE ? OR COALESCE(u.name,'') LIKE ?)`);
            params.push(term, term, term, term, term);
        }
        if (filters.expense_type) { where.push("e.expense_type=?"); params.push(filters.expense_type); }
        if (filters.from) { where.push("e.expense_date>=?"); params.push(filters.from); }
        if (filters.to) { where.push("e.expense_date<=?"); params.push(filters.to); }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        return db.query(`
            SELECT e.id,e.advance_id,e.expense_type,e.description,e.amount,e.bill_filename,e.bill_path,
                   DATE_FORMAT(e.expense_date,'%Y-%m-%d') AS expense_date,e.created_at,
                   a.advance_no,a.status AS advance_status,s.store_name,u.name AS entered_by_name,
                   receiver.name AS received_by_name
            FROM petty_cash_expenses e
            INNER JOIN petty_cash_advances a ON a.id=e.advance_id
            LEFT JOIN stores s ON s.id=a.store_id
            LEFT JOIN users u ON u.id=e.entered_by
            LEFT JOIN users receiver ON receiver.id=a.received_by
            ${whereSql}
            ORDER BY e.expense_date DESC, e.id DESC
            LIMIT 1000
        `, params);
    },

    async listDeposits(filters = {}, userId, admin = false) {
        const { where, params } = PettyCash.scopeFilters(filters, userId, admin);
        if (filters.search) {
            const term = `%${filters.search}%`;
            where.push(`(a.advance_no LIKE ? OR COALESCE(d.reference_no,'') LIKE ? OR COALESCE(s.store_name,'') LIKE ? OR COALESCE(depositor.name,'') LIKE ? OR COALESCE(receiver.name,'') LIKE ?)`);
            params.push(term, term, term, term, term);
        }
        if (filters.from) { where.push("d.deposit_date>=?"); params.push(filters.from); }
        if (filters.to) { where.push("d.deposit_date<=?"); params.push(filters.to); }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        return db.query(`
            SELECT d.id,d.advance_id,d.amount,d.reference_no,d.receipt_filename,d.receipt_path,
                   DATE_FORMAT(d.deposit_date,'%Y-%m-%d') AS deposit_date,d.created_at,
                   a.advance_no,a.status AS advance_status,s.store_name,
                   depositor.name AS deposited_by_name,receiver.name AS received_by_name
            FROM petty_cash_deposits d
            INNER JOIN petty_cash_advances a ON a.id=d.advance_id
            LEFT JOIN stores s ON s.id=a.store_id
            LEFT JOIN users depositor ON depositor.id=d.deposited_by
            LEFT JOIN users receiver ON receiver.id=d.received_by
            ${whereSql}
            ORDER BY d.deposit_date DESC, d.id DESC
            LIMIT 1000
        `, params);
    },

    // Audit history of one advance, with the user's name instead of "#id".
    async getAuditTrail(referenceId) {
        return db.query(`
            SELECT al.*, u.name AS changed_by_name, u.email AS changed_by_email
            FROM audit_logs al
            LEFT JOIN users u ON u.id=al.changed_by
            WHERE al.module_name=? AND al.reference_id=?
            ORDER BY al.id DESC
        `, [MODULE, referenceId]);
    },

    // Module-wide audit trail for the "Audit Trail" page.
    async getAuditLog(filters = {}, userId, admin = false) {
        const where = ["al.module_name=?"];
        const params = [MODULE];
        if (!admin) {
            where.push(`(al.changed_by=? OR EXISTS (
                SELECT 1 FROM petty_cash_advances sa
                INNER JOIN user_stores us ON us.store_id=sa.store_id AND us.user_id=?
                WHERE sa.id=al.reference_id))`);
            params.push(userId, userId);
        }
        if (filters.action) { where.push("al.action=?"); params.push(filters.action); }
        if (filters.search) {
            const term = `%${filters.search}%`;
            where.push(`(COALESCE(a.advance_no,'') LIKE ? OR COALESCE(u.name,'') LIKE ? OR al.action LIKE ? OR COALESCE(al.new_data,'') LIKE ? OR COALESCE(al.old_data,'') LIKE ?)`);
            params.push(term, term, term, term, term);
        }
        return db.query(`
            SELECT al.*, u.name AS changed_by_name, a.advance_no, s.store_name
            FROM audit_logs al
            LEFT JOIN users u ON u.id=al.changed_by
            LEFT JOIN petty_cash_advances a ON a.id=al.reference_id
            LEFT JOIN stores s ON s.id=a.store_id
            WHERE ${where.join(" AND ")}
            ORDER BY al.id DESC
            LIMIT 1000
        `, params);
    },

    async getUserContact(userId) {
        const rows = await db.query(`SELECT id,name,email FROM users WHERE id=? LIMIT 1`, [userId]);
        return rows?.[0] || null;
    },

    async isAdmin(userId) {
        let rows;
        try {
            rows = await db.query(`SELECT is_admin, administrator FROM users WHERE id=? LIMIT 1`, [userId]);
        } catch {
            rows = await db.query(`SELECT is_admin FROM users WHERE id=? LIMIT 1`, [userId]);
        }
        const u = rows[0] || {};
        return u.is_admin === 1 || u.administrator === 1 || u.is_admin === true || u.administrator === true;
    },

    async getAccessibleStoreIds(userId) {
        return db.query(`SELECT store_id FROM user_stores WHERE user_id=?`, [userId]);
    },

    async canAccessStore(userId, storeId) {
        if (await PettyCash.isAdmin(userId)) return true;
        const rows = await db.query(`SELECT 1 FROM user_stores WHERE user_id=? AND store_id=? LIMIT 1`, [userId, storeId]);
        return rows.length > 0;
    },

    async userBelongsToStore(userId, storeId) {
        const rows = await db.query(`SELECT 1 FROM user_stores WHERE user_id=? AND store_id=? LIMIT 1`, [userId, storeId]);
        return rows.length > 0;
    },

    async getOptions(userId, admin = false) {
        const stores = admin
            ? await db.query(`SELECT id, store_name, store_code FROM stores WHERE LOWER(COALESCE(status,'Active')) <> 'inactive' ORDER BY store_name`)
            : await db.query(`
                SELECT s.id, s.store_name, s.store_code
                FROM stores s
                INNER JOIN user_stores us ON us.store_id=s.id AND us.user_id=?
                WHERE LOWER(COALESCE(s.status,'Active')) <> 'inactive'
                ORDER BY s.store_name
            `, [userId]);

        const users = admin
            ? await db.query(`SELECT id, name, employee_id, email FROM users ORDER BY name`)
            : await db.query(`
                SELECT DISTINCT u.id, u.name, u.employee_id, u.email
                FROM users u
                INNER JOIN user_stores us ON us.user_id=u.id
                WHERE us.store_id IN (SELECT store_id FROM user_stores WHERE user_id=?)
                ORDER BY u.name
            `, [userId]);

        return { stores: stores || [], users: users || [] };
    },

    async createAdvance(data) {
        await PettyCash.ensureAdvanceColumns();
        const result = await db.query(`
            INSERT INTO petty_cash_advances
            (advance_no, store_id, paid_by, received_by, advance_amount, purpose, advance_date, attachment_filename, attachment_path, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [data.advance_no, data.store_id, data.paid_by, data.received_by, data.advance_amount, data.purpose || null, data.advance_date, data.attachment_filename || null, data.attachment_path || null, data.created_by || null]);
        return { id: result.insertId, advance_no: data.advance_no };
    },

    async addExpense(advanceId, data) {
        const result = await db.query(`
            INSERT INTO petty_cash_expenses
            (advance_id, expense_type, description, amount, bill_filename, bill_path, expense_date, entered_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [advanceId, data.expense_type, data.description || null, data.amount, data.bill_filename || null, data.bill_path || null, data.expense_date, data.entered_by]);
        await PettyCash.refreshStatus(advanceId);
        return { id: result.insertId };
    },

    async addDeposit(advanceId, data) {
        const result = await db.query(`
            INSERT INTO petty_cash_deposits
            (advance_id, amount, deposited_by, received_by, deposit_date, reference_no, receipt_filename, receipt_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [advanceId, data.amount, data.deposited_by, data.received_by, data.deposit_date, data.reference_no || null, data.receipt_filename || null, data.receipt_path || null]);
        await PettyCash.refreshStatus(advanceId);
        return { id: result.insertId };
    },

    async refreshStatus(advanceId) {
        const rows = await db.query(`
            SELECT a.advance_amount,
                COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id),0) AS total_expense,
                COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id),0) AS total_deposit,
                a.status
            FROM petty_cash_advances a WHERE a.id=?
        `, [advanceId]);
        if (!rows.length || rows[0].status === "CANCELLED" || rows[0].status === "SETTLED") return;
        const a = rows[0];
        const expense = Number(a.total_expense);
        const deposit = Number(a.total_deposit);
        const balance = Number(a.advance_amount) - expense - deposit;
        let status = "OPEN";
        if (Math.abs(balance) <= 0.005 && (expense > 0 || deposit > 0)) status = "PARTIALLY_SETTLED";
        else if (expense > 0 || deposit > 0) status = "PARTIALLY_SETTLED";
        await db.query(`UPDATE petty_cash_advances SET status=?, updated_at=NOW() WHERE id=?`, [status, advanceId]);
    },

    async getAll(filters = {}, userId, admin = false) {
        const where = [];
        const params = [];
        if (!admin) {
            where.push(`EXISTS (SELECT 1 FROM user_stores scope_us WHERE scope_us.user_id=? AND scope_us.store_id=a.store_id)`);
            params.push(userId);
        }
        if (filters.store_id) { where.push("a.store_id=?"); params.push(filters.store_id); }
        if (filters.status) { where.push("a.status=?"); params.push(filters.status); }
        if (filters.paid_by) { where.push("a.paid_by=?"); params.push(filters.paid_by); }
        if (filters.received_by) { where.push("a.received_by=?"); params.push(filters.received_by); }
        if (filters.search) {
            const term = `%${filters.search}%`;
            where.push(`(a.advance_no LIKE ? OR a.purpose LIKE ? OR s.store_name LIKE ? OR COALESCE(payer.name,'') LIKE ? OR COALESCE(receiver.name,'') LIKE ?)`);
            params.push(term, term, term, term, term);
        }
        if (filters.from) { where.push("a.advance_date>=?"); params.push(filters.from); }
        if (filters.to) { where.push("a.advance_date<=?"); params.push(filters.to); }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        return db.query(`
            SELECT a.id,a.advance_no,a.store_id,a.paid_by,a.received_by,s.store_name,s.store_code,a.advance_amount,DATE_FORMAT(a.advance_date,'%Y-%m-%d') AS advance_date,a.purpose,a.status,a.created_at,
                COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id),0) AS total_expense,
                COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id),0) AS total_deposit,
                a.advance_amount-COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id),0)-COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id),0) AS balance,
                payer.name AS paid_by_name, receiver.name AS received_by_name
            FROM petty_cash_advances a
            LEFT JOIN stores s ON s.id=a.store_id
            LEFT JOIN users payer ON payer.id=a.paid_by
            LEFT JOIN users receiver ON receiver.id=a.received_by
            ${whereSql} ORDER BY a.id DESC LIMIT 500
        `, params);
    },

    async getById(id) {
        const advances = await db.query(`
            SELECT a.*,DATE_FORMAT(a.advance_date,'%Y-%m-%d') AS advance_date,s.store_name,s.store_code,payer.name AS paid_by_name,payer.email AS paid_by_email,
                receiver.name AS received_by_name,receiver.email AS received_by_email
            FROM petty_cash_advances a
            LEFT JOIN stores s ON s.id=a.store_id
            LEFT JOIN users payer ON payer.id=a.paid_by
            LEFT JOIN users receiver ON receiver.id=a.received_by
            WHERE a.id=? LIMIT 1
        `, [id]);
        if (!advances.length) return null;
        const advance = advances[0];
        const expenses = await db.query(`SELECT e.*,DATE_FORMAT(e.expense_date,'%Y-%m-%d') AS expense_date,u.name AS entered_by_name,u.email AS entered_by_email FROM petty_cash_expenses e LEFT JOIN users u ON u.id=e.entered_by WHERE e.advance_id=? ORDER BY e.id`, [id]);
        const deposits = await db.query(`SELECT d.*,DATE_FORMAT(d.deposit_date,'%Y-%m-%d') AS deposit_date,depositor.name AS deposited_by_name,depositor.email AS deposited_by_email,receiver.name AS received_by_name,receiver.email AS received_by_email FROM petty_cash_deposits d LEFT JOIN users depositor ON depositor.id=d.deposited_by LEFT JOIN users receiver ON receiver.id=d.received_by WHERE d.advance_id=? ORDER BY d.id`, [id]);
        const settlements = await db.query(`SELECT st.*,u.name AS settled_by_name,u.email AS settled_by_email FROM petty_cash_settlements st LEFT JOIN users u ON u.id=st.settled_by WHERE st.advance_id=? LIMIT 1`, [id]);
        const totalExpense = expenses.reduce((sum,x)=>sum+Number(x.amount||0),0);
        const totalDeposit = deposits.reduce((sum,x)=>sum+Number(x.amount||0),0);
        return {...advance,total_expense:totalExpense,total_deposit:totalDeposit,balance:Number(advance.advance_amount||0)-totalExpense-totalDeposit,expenses,deposits,settlement:settlements[0]||null};
    },

    async settle(id, userId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [advances] = await connection.query(`SELECT * FROM petty_cash_advances WHERE id=? FOR UPDATE`, [id]);
            if (!advances.length) throw new Error("Petty cash advance not found.");
            const advance = advances[0];
            if (advance.status === "SETTLED") throw new Error("This advance is already settled.");
            const [expenseRows] = await connection.query(`SELECT COALESCE(SUM(amount),0) AS total FROM petty_cash_expenses WHERE advance_id=?`, [id]);
            const [depositRows] = await connection.query(`SELECT COALESCE(SUM(amount),0) AS total FROM petty_cash_deposits WHERE advance_id=?`, [id]);
            const totalExpense=Number(expenseRows[0]?.total||0), totalDeposit=Number(depositRows[0]?.total||0);
            const balance=Number(advance.advance_amount)-totalExpense-totalDeposit;
            if (Math.abs(balance)>0.005) throw new Error(`Cannot settle yet. Current balance is ₹${balance.toLocaleString("en-IN",{minimumFractionDigits:2})}.`);
            await connection.query(`INSERT INTO petty_cash_settlements (advance_id,advance_amount,total_expense,total_deposit,balance,settled_by) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE advance_amount=VALUES(advance_amount),total_expense=VALUES(total_expense),total_deposit=VALUES(total_deposit),balance=VALUES(balance),settled_by=VALUES(settled_by),settled_at=NOW()`, [id,advance.advance_amount,totalExpense,totalDeposit,balance,userId]);
            await connection.query(`UPDATE petty_cash_advances SET status='SETTLED',updated_at=NOW() WHERE id=?`, [id]);
            await connection.commit();
            return {advance_amount:Number(advance.advance_amount),total_expense:totalExpense,total_deposit:totalDeposit,balance};
        } catch(error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
    },

    async cancel(id) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Delete child records explicitly. This works even when an older
            // database was created before the ON DELETE CASCADE constraints
            // were added.
            await connection.query(`DELETE FROM petty_cash_expenses WHERE advance_id=?`, [id]);
            await connection.query(`DELETE FROM petty_cash_deposits WHERE advance_id=?`, [id]);
            await connection.query(`DELETE FROM petty_cash_settlements WHERE advance_id=?`, [id]);
            const [result] = await connection.query(`DELETE FROM petty_cash_advances WHERE id=?`, [id]);

            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async bulkCancel(ids) {
        if (!ids?.length) return { affectedRows: 0 };

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const placeholders = ids.map(() => "?").join(",");

            // Explicit child deletion makes bulk delete reliable on both new
            // and existing installations, regardless of their FK definition.
            await connection.query(`DELETE FROM petty_cash_expenses WHERE advance_id IN (${placeholders})`, ids);
            await connection.query(`DELETE FROM petty_cash_deposits WHERE advance_id IN (${placeholders})`, ids);
            await connection.query(`DELETE FROM petty_cash_settlements WHERE advance_id IN (${placeholders})`, ids);
            const [result] = await connection.query(`DELETE FROM petty_cash_advances WHERE id IN (${placeholders})`, ids);

            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async getDeleteCandidates(userId, admin=false) {
        if (admin) {
            return db.query(`SELECT a.id,a.advance_no,a.paid_by,a.received_by,a.store_id FROM petty_cash_advances a ORDER BY a.id`);
        }
        return db.query(`
            SELECT a.id,a.advance_no,a.paid_by,a.received_by,a.store_id
            FROM petty_cash_advances a
            WHERE a.paid_by=?
              AND EXISTS (SELECT 1 FROM user_stores us WHERE us.user_id=? AND us.store_id=a.store_id)
            ORDER BY a.id
        `, [userId,userId]);
    },

    async getSummary(userId, admin=false, storeId="") {
        const scope = admin ? "" : `AND EXISTS (SELECT 1 FROM user_stores us WHERE us.user_id=? AND us.store_id=a.store_id)`;
        const params = admin ? [] : [userId];
        if (storeId) { /* handled below in each query */ }
        const storeClause = storeId ? " AND a.store_id=?" : "";
        const baseParams = storeId ? [...params, storeId] : [...params];
        const rows = await db.query(`SELECT COUNT(*) total_advances,COALESCE(SUM(advance_amount),0) total_advanced,
            COALESCE(SUM((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id)),0) total_expense,
            COALESCE(SUM((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id)),0) total_deposit,
            COALESCE(SUM(CASE WHEN status='SETTLED' THEN advance_amount ELSE 0 END),0) settled_amount,
            COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIALLY_SETTLED') THEN 1 ELSE 0 END),0) open_advances,
            COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIALLY_SETTLED') THEN advance_amount-COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id),0)-COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id),0) ELSE 0 END),0) outstanding_balance
            FROM petty_cash_advances a WHERE status<>'CANCELLED' ${scope} ${storeClause}`, baseParams);
        const storeRows = await db.query(`SELECT s.store_name,COALESCE(SUM(a.advance_amount),0) advances_given,
            COALESCE(SUM((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id)),0) total_expenses,
            COALESCE(SUM((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id)),0) total_deposits
            FROM petty_cash_advances a JOIN stores s ON s.id=a.store_id WHERE a.status<>'CANCELLED' ${scope} ${storeClause}
            GROUP BY s.id,s.store_name ORDER BY s.store_name LIMIT 100`, baseParams);
        const peopleRows = await db.query(`SELECT u.name employee,COALESCE(SUM(a.advance_amount),0) total_advance,
            COALESCE(SUM(CASE WHEN a.status='SETTLED' THEN a.advance_amount ELSE 0 END),0) settled
            FROM petty_cash_advances a JOIN users u ON u.id=a.received_by WHERE a.status<>'CANCELLED' ${scope} ${storeClause}
            GROUP BY u.id,u.name ORDER BY total_advance DESC LIMIT 100`, baseParams);
        return {summary: rows[0] || {},storeWise:storeRows||[],personWise:peopleRows||[]};
    },

    async getEmailSettings(userId = 0) {
        let rows = [];
        try {
            rows = await db.query(`
                SELECT advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled,
                       recipient_mode,include_direct,master_enabled
                FROM petty_cash_email_settings WHERE user_id=? LIMIT 1
            `, [userId]);
        } catch (error) {
            // Older installs before the include_direct / master_enabled columns.
            rows = await db.query(`
                SELECT advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled,
                       recipient_mode
                FROM petty_cash_email_settings WHERE user_id=? LIMIT 1
            `, [userId]);
        }

        if (!rows.length) {
            return {
                advance_created:true,
                expense_added:true,
                deposit_added:true,
                settlement_completed:true,
                advance_cancelled:true,
                recipient_mode:"direct",
                include_direct:true,
                master_enabled:true
            };
        }

        const mode = ["everyone","specific"].includes(rows[0].recipient_mode) ? rows[0].recipient_mode : "direct";

        return {
            advance_created: Boolean(rows[0].advance_created),
            expense_added: Boolean(rows[0].expense_added),
            deposit_added: Boolean(rows[0].deposit_added),
            settlement_completed: Boolean(rows[0].settlement_completed),
            advance_cancelled: Boolean(rows[0].advance_cancelled),
            recipient_mode: mode,
            include_direct: rows[0].include_direct === undefined ? true : Boolean(rows[0].include_direct),
            master_enabled: rows[0].master_enabled === undefined ? true : Boolean(rows[0].master_enabled)
        };
    },

    // Every active administrator is listed automatically; extra
    // e-mails (accounts, owners, regional heads) are added as custom rows.
    async getEmailContacts() {
        await PettyCash.ensureEmailRecipientsTable();
        // The users table only has is_admin (there is no "administrator"
        // column) - referencing it made this endpoint return HTTP 500.
        const admins = await db.query(`
            SELECT id,name,email
            FROM users
            WHERE is_admin=1
              AND LOWER(COALESCE(status,'Active')) NOT IN ('inactive','disabled')
              AND email IS NOT NULL AND TRIM(email)<>''
            ORDER BY name
        `);

        for (const admin of admins) {
            await db.query(`
                INSERT INTO petty_cash_email_recipients
                    (role_key,role_label,contact_name,email,user_id,is_custom,enabled)
                VALUES (?,?,?,?,?,0,1)
                ON DUPLICATE KEY UPDATE contact_name=VALUES(contact_name), email=VALUES(email)
            `, [`admin_${admin.id}`, "Administrator", admin.name, admin.email, admin.id]);
        }

        let rows;
        try {
            rows = await db.query(`
                SELECT id,role_key,role_label,contact_name,email,user_id,is_custom,enabled,
                       advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled
                FROM petty_cash_email_recipients
                WHERE COALESCE(removed,0)=0
                ORDER BY is_custom ASC, contact_name ASC, id ASC
            `);
        } catch (error) {
            rows = await db.query(`
                SELECT id,role_key,role_label,contact_name,email,user_id,is_custom,enabled,
                       advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled
                FROM petty_cash_email_recipients
                ORDER BY is_custom ASC, contact_name ASC, id ASC
            `);
        }

        const activeAdminKeys = new Set(admins.map((a) => `admin_${a.id}`));

        return rows
            .filter((row) => Number(row.is_custom) === 1 || activeAdminKeys.has(row.role_key))
            .map((row) => ({
                ...row,
                is_custom: Boolean(row.is_custom),
                enabled: Boolean(row.enabled),
                advance_created: Boolean(row.advance_created),
                expense_added: Boolean(row.expense_added),
                deposit_added: Boolean(row.deposit_added),
                settlement_completed: Boolean(row.settlement_completed),
                advance_cancelled: Boolean(row.advance_cancelled)
            }));
    },

    async countRemovedContacts() {
        try {
            const rows = await db.query(`SELECT COUNT(*) AS n FROM petty_cash_email_recipients WHERE is_custom=0 AND removed=1`);
            return Number(rows[0]?.n || 0);
        } catch {
            return 0;
        }
    },

    async saveEmailContacts(list = [], { removedKeys = [], restoreRemoved = false } = {}) {
        if (restoreRemoved) {
            await db.query(`UPDATE petty_cash_email_recipients SET removed=0 WHERE is_custom=0`).catch(() => {});
        }
        const removed = (Array.isArray(removedKeys) ? removedKeys : []).map((k) => String(k || "").trim()).filter(Boolean);
        if (removed.length) {
            await db.query(`UPDATE petty_cash_email_recipients SET removed=1 WHERE is_custom=0 AND role_key IN (?)`, [removed]).catch(() => {});
        }

        const flags = ["enabled","advance_created","expense_added","deposit_added","settlement_completed","advance_cancelled"];
        const keep = [];

        for (const item of Array.isArray(list) ? list : []) {
            const email = String(item.email || "").trim();
            const roleKey = String(item.role_key || "").trim().slice(0, 120);
            if (!roleKey) continue;
            if (item.is_custom && !email) continue;
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                const err = new Error(`Invalid email address: ${email}`);
                err.statusCode = 400;
                throw err;
            }
            keep.push(roleKey);
            const values = flags.map((f) => (item[f] === false || item[f] === 0 || item[f] === "0" ? 0 : 1));

            await db.query(`
                INSERT INTO petty_cash_email_recipients
                    (role_key,role_label,contact_name,email,is_custom,${flags.join(",")})
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE
                    role_label=VALUES(role_label),
                    contact_name=VALUES(contact_name),
                    email=VALUES(email),
                    ${flags.map((f) => `${f}=VALUES(${f})`).join(",")}
            `, [
                roleKey,
                String(item.role_label || (item.is_custom ? "Recipient" : "Administrator")).trim().slice(0, 150),
                String(item.contact_name || "").trim().slice(0, 150) || null,
                email || null,
                item.is_custom ? 1 : 0,
                ...values
            ]);
        }

        // Custom rows removed on the page are deleted.
        if (keep.length) {
            await db.query(
                `DELETE FROM petty_cash_email_recipients WHERE is_custom=1 AND role_key NOT IN (?)`,
                [keep]
            );
        } else {
            await db.query(`DELETE FROM petty_cash_email_recipients WHERE is_custom=1`);
        }

        return PettyCash.getEmailContacts();
    },

    async getGlobalEmailSettings() {
        return PettyCash.getEmailSettings(0);
    },

    async updateEmailSettings(userId, data, global = false) {
        const targetUserId = global ? 0 : Number(userId);
        const keys = [
            "advance_created",
            "expense_added",
            "deposit_added",
            "settlement_completed",
            "advance_cancelled"
        ];
        await PettyCash.ensureEmailRecipientsTable();
        const values = keys.map((key)=>data[key] === false || data[key] === 0 ? 0 : 1);
        const recipientMode = ["everyone","specific"].includes(data.recipient_mode) ? data.recipient_mode : "direct";
        const includeDirect = data.include_direct === false || data.include_direct === 0 ? 0 : 1;
        const masterEnabled = data.master_enabled === false || data.master_enabled === 0 ? 0 : 1;

        await db.query(`
            INSERT INTO petty_cash_email_settings
                (user_id,advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled,recipient_mode,include_direct,master_enabled)
            VALUES (?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
                advance_created=VALUES(advance_created),
                expense_added=VALUES(expense_added),
                deposit_added=VALUES(deposit_added),
                settlement_completed=VALUES(settlement_completed),
                advance_cancelled=VALUES(advance_cancelled),
                recipient_mode=VALUES(recipient_mode),
                include_direct=VALUES(include_direct),
                master_enabled=VALUES(master_enabled)
        `, [targetUserId,...values,recipientMode,includeDirect,masterEnabled]);

        if (global && Array.isArray(data.recipients)) {
            await PettyCash.saveEmailContacts(data.recipients, {
                removedKeys: data.removed_keys,
                restoreRemoved: Boolean(data.restore_removed)
            });
        }

        return global
            ? PettyCash.getGlobalEmailSettings()
            : PettyCash.getEmailSettings(targetUserId);
    },

    async getEmailRecipients({ giverId=0, receiverId=0, settings={}, event=null } = {}) {
        const recipients = new Map();

        const addRows = (rows) => {
            (rows || []).forEach((row) => {
                if (row?.email) {
                    recipients.set(String(row.email).trim().toLowerCase(), {
                        email: row.email,
                        name: row.name || ""
                    });
                }
            });
        };

        if (settings.recipient_mode === "everyone") {
            addRows(await db.query(`
                SELECT id,name,email
                FROM users
                WHERE LOWER(COALESCE(status,'Active')) NOT IN ('inactive','disabled')
                  AND email IS NOT NULL
                  AND TRIM(email)<>''
                ORDER BY name
            `));
        } else if (settings.recipient_mode === "specific") {
            const flag = ["advance_created","expense_added","deposit_added","settlement_completed","advance_cancelled"].includes(event) ? event : null;
            const contacts = await PettyCash.getEmailContacts();
            addRows(contacts
                .filter((c) => c.enabled && c.email && (!flag || c[flag]))
                .map((c) => ({ email: c.email, name: c.contact_name })));

            if (settings.include_direct !== false) {
                const targetIds = [Number(giverId), Number(receiverId)].filter(Boolean);
                if (targetIds.length) {
                    addRows(await db.query(`
                        SELECT id,name,email FROM users
                        WHERE id IN (?) AND email IS NOT NULL AND TRIM(email)<>''
                    `, [targetIds]));
                }
            }
        } else {
            const targetIds = [Number(giverId), Number(receiverId)].filter(Boolean);
            if (targetIds.length) {
                const placeholders = targetIds.map(()=>"?").join(",");
                addRows(await db.query(`
                    SELECT id,name,email
                    FROM users
                    WHERE id IN (${placeholders})
                      AND email IS NOT NULL
                      AND TRIM(email)<>''
                `, targetIds));
            }
        }

        return Array.from(recipients.values());
    },

    async isEmailEnabled(userId, event) {
        const settings = await PettyCash.getEmailSettings(userId);
        return settings[event] !== false;
    }
};

module.exports = PettyCash;

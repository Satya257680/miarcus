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
            ["send_to_admins", "TINYINT(1) NOT NULL DEFAULT 0"]
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

    async isAdmin(userId) {
        const rows = await db.query(`
            SELECT is_admin, administrator FROM users WHERE id=? LIMIT 1
        `, [userId]);
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
        const result = await db.query(`
            INSERT INTO petty_cash_advances
            (advance_no, store_id, paid_by, received_by, advance_amount, purpose, advance_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [data.advance_no, data.store_id, data.paid_by, data.received_by, data.advance_amount, data.purpose || null, data.advance_date]);
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
            SELECT a.id,a.advance_no,a.store_id,s.store_name,s.store_code,a.advance_amount,a.advance_date,a.purpose,a.status,
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
            SELECT a.*,s.store_name,s.store_code,payer.name AS paid_by_name,payer.email AS paid_by_email,
                receiver.name AS received_by_name,receiver.email AS received_by_email
            FROM petty_cash_advances a
            LEFT JOIN stores s ON s.id=a.store_id
            LEFT JOIN users payer ON payer.id=a.paid_by
            LEFT JOIN users receiver ON receiver.id=a.received_by
            WHERE a.id=? LIMIT 1
        `, [id]);
        if (!advances.length) return null;
        const advance = advances[0];
        const expenses = await db.query(`SELECT e.*,u.name AS entered_by_name,u.email AS entered_by_email FROM petty_cash_expenses e LEFT JOIN users u ON u.id=e.entered_by WHERE e.advance_id=? ORDER BY e.id`, [id]);
        const deposits = await db.query(`SELECT d.*,depositor.name AS deposited_by_name,depositor.email AS deposited_by_email,receiver.name AS received_by_name,receiver.email AS received_by_email FROM petty_cash_deposits d LEFT JOIN users depositor ON depositor.id=d.deposited_by LEFT JOIN users receiver ON receiver.id=d.received_by WHERE d.advance_id=? ORDER BY d.id`, [id]);
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
            return db.query(`
                SELECT a.id,a.advance_no,a.paid_by,a.received_by,a.store_id
                FROM petty_cash_advances a
                ORDER BY a.id
            `);
        }

        return db.query(`
            SELECT a.id,a.advance_no,a.paid_by,a.received_by,a.store_id
            FROM petty_cash_advances a
            WHERE a.paid_by=?
              AND EXISTS (
                  SELECT 1 FROM user_stores us
                  WHERE us.user_id=? AND us.store_id=a.store_id
              )
            ORDER BY a.id
        `, [userId, userId]);
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

    async getEmailSettings(userId) {
        const rows = await db.query(`
            SELECT advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled,
                   send_to_giver,send_to_receiver,send_to_reporting_manager,send_to_admins
            FROM petty_cash_email_settings WHERE user_id=? LIMIT 1
        `, [userId]);
        if (!rows.length) {
            return {
                advance_created:true, expense_added:true, deposit_added:true,
                settlement_completed:true, advance_cancelled:true,
                send_to_giver:true, send_to_receiver:true,
                send_to_reporting_manager:false, send_to_admins:false
            };
        }
        return Object.fromEntries(Object.entries(rows[0]).map(([k,v])=>[k,Boolean(v)]));
    },

    async updateEmailSettings(userId, data) {
        const keys = [
            "advance_created","expense_added","deposit_added","settlement_completed","advance_cancelled",
            "send_to_giver","send_to_receiver","send_to_reporting_manager","send_to_admins"
        ];
        const values = keys.map((key)=>data[key] === false || data[key] === 0 ? 0 : 1);
        await db.query(`
            INSERT INTO petty_cash_email_settings
                (user_id,advance_created,expense_added,deposit_added,settlement_completed,advance_cancelled,send_to_giver,send_to_receiver,send_to_reporting_manager,send_to_admins)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
                advance_created=VALUES(advance_created),
                expense_added=VALUES(expense_added),
                deposit_added=VALUES(deposit_added),
                settlement_completed=VALUES(settlement_completed),
                advance_cancelled=VALUES(advance_cancelled),
                send_to_giver=VALUES(send_to_giver),
                send_to_receiver=VALUES(send_to_receiver),
                send_to_reporting_manager=VALUES(send_to_reporting_manager),
                send_to_admins=VALUES(send_to_admins)
        `, [userId,...values]);
        return PettyCash.getEmailSettings(userId);
    },

    async getEmailRecipients({ giverId=0, receiverId=0, settings={}, actorId=0 } = {}) {
        const targetIds = [Number(giverId), Number(receiverId)].filter(Boolean);
        const recipients = new Map();

        const addRows = (rows) => {
            (rows || []).forEach((row) => {
                if (row?.email) recipients.set(String(row.email).toLowerCase(), { email:row.email, name:row.name || "" });
            });
        };

        if (settings.send_to_giver && Number(giverId)) {
            addRows(await db.query(`SELECT id,name,email FROM users WHERE id=? AND email IS NOT NULL AND email<>'' LIMIT 1`, [giverId]));
        }
        if (settings.send_to_receiver && Number(receiverId)) {
            addRows(await db.query(`SELECT id,name,email FROM users WHERE id=? AND email IS NOT NULL AND email<>'' LIMIT 1`, [receiverId]));
        }
        if (settings.send_to_reporting_manager && targetIds.length) {
            const placeholders = targetIds.map(()=>"?").join(",");
            addRows(await db.query(`
                SELECT DISTINCT manager.id,manager.name,manager.email
                FROM users employee
                INNER JOIN users manager
                    ON LOWER(TRIM(manager.name))=LOWER(TRIM(employee.reports_to))
                WHERE employee.id IN (${placeholders})
                  AND employee.reports_to IS NOT NULL
                  AND TRIM(employee.reports_to)<>''
                  AND manager.email IS NOT NULL AND manager.email<>''
            `, targetIds));
        }
        if (settings.send_to_admins) {
            addRows(await db.query(`
                SELECT id,name,email FROM users
                WHERE (is_admin=1 OR administrator=1 OR is_admin=true OR administrator=true)
                  AND LOWER(COALESCE(status,'Active')) NOT IN ('inactive','disabled')
                  AND email IS NOT NULL AND email<>''
            `));
        }
        return Array.from(recipients.values());
    },

    async isEmailEnabled(userId, event) {
        const settings = await PettyCash.getEmailSettings(userId);
        return settings[event] !== false;
    }
};

module.exports = PettyCash;

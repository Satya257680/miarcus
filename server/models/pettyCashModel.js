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
                CONSTRAINT fk_pce_advance
                    FOREIGN KEY (advance_id) REFERENCES petty_cash_advances(id)
                    ON DELETE CASCADE
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
                CONSTRAINT fk_pcd_advance
                    FOREIGN KEY (advance_id) REFERENCES petty_cash_advances(id)
                    ON DELETE CASCADE
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
                CONSTRAINT fk_pcs_advance
                    FOREIGN KEY (advance_id) REFERENCES petty_cash_advances(id)
                    ON DELETE CASCADE
            )
        `);

        console.log("✅ petty_cash table(s) verified");
    },

    async getOptions() {
        const stores = await db.query(`
            SELECT id, store_name, store_code
            FROM stores
            WHERE LOWER(COALESCE(status,'Active')) <> 'inactive'
            ORDER BY store_name
        `);

        const users = await db.query(`
            SELECT id, name, employee_id
            FROM users
            ORDER BY name
        `);

        return { stores: stores || [], users: users || [] };
    },

    async createAdvance(data) {
        const result = await db.query(`
            INSERT INTO petty_cash_advances
            (advance_no, store_id, paid_by, received_by, advance_amount, purpose, advance_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            data.advance_no,
            data.store_id,
            data.paid_by,
            data.received_by,
            data.advance_amount,
            data.purpose || null,
            data.advance_date
        ]);

        return { id: result.insertId, advance_no: data.advance_no };
    },

    async addExpense(advanceId, data) {
        const result = await db.query(`
            INSERT INTO petty_cash_expenses
            (advance_id, expense_type, description, amount, bill_filename, bill_path, expense_date, entered_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            advanceId,
            data.expense_type,
            data.description || null,
            data.amount,
            data.bill_filename || null,
            data.bill_path || null,
            data.expense_date,
            data.entered_by
        ]);

        await PettyCash.refreshStatus(advanceId);
        return { id: result.insertId };
    },

    async addDeposit(advanceId, data) {
        const result = await db.query(`
            INSERT INTO petty_cash_deposits
            (advance_id, amount, deposited_by, received_by, deposit_date, reference_no, receipt_filename, receipt_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            advanceId,
            data.amount,
            data.deposited_by,
            data.received_by,
            data.deposit_date,
            data.reference_no || null,
            data.receipt_filename || null,
            data.receipt_path || null
        ]);

        await PettyCash.refreshStatus(advanceId);
        return { id: result.insertId };
    },

    async refreshStatus(advanceId) {
        const rows = await db.query(`
            SELECT
                a.advance_amount,
                COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id = a.id),0) AS total_expense,
                COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id = a.id),0) AS total_deposit
            FROM petty_cash_advances a
            WHERE a.id = ?
        `, [advanceId]);

        if (!rows.length) return;

        const a = rows[0];
        const balance = Number(a.advance_amount) - Number(a.total_expense) - Number(a.total_deposit);
        let status = "OPEN";

        // Reaching zero balance means the numbers are reconcilable,
        // but the user must still explicitly click "Settle" so the
        // settlement record and audit trail are created.
        if (Number(a.total_expense) > 0 || Number(a.total_deposit) > 0) {
            status = "PARTIALLY_SETTLED";
        }

        await db.query(`
            UPDATE petty_cash_advances SET status = ?, updated_at = NOW() WHERE id = ?
        `, [status, advanceId]);
    },

    async getAll(filters = {}) {
        const where = [];
        const params = [];

        if (filters.store_id) {
            where.push("a.store_id = ?");
            params.push(filters.store_id);
        }

        if (filters.status) {
            where.push("a.status = ?");
            params.push(filters.status);
        }

        if (filters.search) {
            const term = `%${filters.search}%`;
            where.push(`(
                a.advance_no LIKE ?
                OR a.purpose LIKE ?
                OR s.store_name LIKE ?
                OR COALESCE(receiver.name,'') LIKE ?
            )`);
            params.push(term, term, term, term);
        }

        if (filters.from) {
            where.push("a.advance_date >= ?");
            params.push(filters.from);
        }

        if (filters.to) {
            where.push("a.advance_date <= ?");
            params.push(filters.to);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        return db.query(`
            SELECT
                a.id,
                a.advance_no,
                a.store_id,
                s.store_name,
                s.store_code,
                a.advance_amount,
                a.advance_date,
                a.purpose,
                a.status,
                COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id),0) AS total_expense,
                COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id),0) AS total_deposit,
                a.advance_amount
                    - COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id),0)
                    - COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id),0) AS balance,
                payer.name AS paid_by_name,
                receiver.name AS received_by_name
            FROM petty_cash_advances a
            LEFT JOIN stores s ON s.id=a.store_id
            LEFT JOIN users payer ON payer.id=a.paid_by
            LEFT JOIN users receiver ON receiver.id=a.received_by
            ${whereSql}
            ORDER BY a.id DESC
            LIMIT 300
        `, params);
    },

    async getById(id) {
        const advances = await db.query(`
            SELECT
                a.*,
                s.store_name,
                s.store_code,
                payer.name AS paid_by_name,
                receiver.name AS received_by_name
            FROM petty_cash_advances a
            LEFT JOIN stores s ON s.id=a.store_id
            LEFT JOIN users payer ON payer.id=a.paid_by
            LEFT JOIN users receiver ON receiver.id=a.received_by
            WHERE a.id = ?
            LIMIT 1
        `, [id]);

        if (!advances.length) return null;

        const advance = advances[0];

        const expenses = await db.query(`
            SELECT
                e.*,
                u.name AS entered_by_name
            FROM petty_cash_expenses e
            LEFT JOIN users u ON u.id=e.entered_by
            WHERE e.advance_id=?
            ORDER BY e.id
        `, [id]);

        const deposits = await db.query(`
            SELECT
                d.*,
                depositor.name AS deposited_by_name,
                receiver.name AS received_by_name
            FROM petty_cash_deposits d
            LEFT JOIN users depositor ON depositor.id=d.deposited_by
            LEFT JOIN users receiver ON receiver.id=d.received_by
            WHERE d.advance_id=?
            ORDER BY d.id
        `, [id]);

        const settlements = await db.query(`
            SELECT
                st.*,
                u.name AS settled_by_name
            FROM petty_cash_settlements st
            LEFT JOIN users u ON u.id=st.settled_by
            WHERE st.advance_id=?
            LIMIT 1
        `, [id]);

        const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const totalDeposit = deposits.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const balance = Number(advance.advance_amount || 0) - totalExpense - totalDeposit;

        return {
            ...advance,
            total_expense: totalExpense,
            total_deposit: totalDeposit,
            balance,
            expenses,
            deposits,
            settlement: settlements[0] || null
        };
    },

    async settle(id, userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [advances] = await connection.query(`
                SELECT * FROM petty_cash_advances WHERE id=? FOR UPDATE
            `, [id]);

            if (!advances.length) {
                throw new Error("Petty cash advance not found.");
            }

            const advance = advances[0];

            const [expenseRows] = await connection.query(`
                SELECT COALESCE(SUM(amount),0) AS total FROM petty_cash_expenses WHERE advance_id=?
            `, [id]);

            const [depositRows] = await connection.query(`
                SELECT COALESCE(SUM(amount),0) AS total FROM petty_cash_deposits WHERE advance_id=?
            `, [id]);

            const totalExpense = Number(expenseRows[0]?.total || 0);
            const totalDeposit = Number(depositRows[0]?.total || 0);
            const balance = Number(advance.advance_amount) - totalExpense - totalDeposit;

            if (Math.abs(balance) > 0.005) {
                throw new Error(
                    `Cannot settle yet. Expense + deposit must equal ₹${Number(advance.advance_amount).toLocaleString("en-IN",{minimumFractionDigits:2})}. Current balance is ₹${balance.toLocaleString("en-IN",{minimumFractionDigits:2})}.`
                );
            }

            await connection.query(`
                INSERT INTO petty_cash_settlements
                (advance_id, advance_amount, total_expense, total_deposit, balance, settled_by)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    advance_amount=VALUES(advance_amount),
                    total_expense=VALUES(total_expense),
                    total_deposit=VALUES(total_deposit),
                    balance=VALUES(balance),
                    settled_by=VALUES(settled_by),
                    settled_at=NOW()
            `, [id, advance.advance_amount, totalExpense, totalDeposit, balance, userId]);

            await connection.query(`
                UPDATE petty_cash_advances
                SET status='SETTLED', updated_at=NOW()
                WHERE id=?
            `, [id]);

            await connection.commit();

            return {
                advance_amount: Number(advance.advance_amount),
                total_expense: totalExpense,
                total_deposit: totalDeposit,
                balance
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async cancel(id, userId) {
        const result = await db.query(`
            UPDATE petty_cash_advances
            SET status='CANCELLED', updated_at=NOW()
            WHERE id=? AND status <> 'SETTLED'
        `, [id]);

        return result;
    },

    async getSummary() {
        const rows = await db.query(`
            SELECT
                COUNT(*) AS total_advances,
                COALESCE(SUM(advance_amount),0) AS total_advanced,
                COALESCE(SUM((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id)),0) AS total_expense,
                COALESCE(SUM((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id)),0) AS total_deposit,
                COALESCE(SUM(CASE WHEN status='SETTLED' THEN advance_amount ELSE 0 END),0) AS settled_amount,
                COALESCE(SUM(CASE WHEN status IN ('OPEN','PARTIALLY_SETTLED') THEN
                    advance_amount
                    - COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id),0)
                    - COALESCE((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id),0)
                    ELSE 0 END),0) AS outstanding_balance
            FROM petty_cash_advances a
            WHERE status <> 'CANCELLED'
        `);

        const storeRows = await db.query(`
            SELECT
                s.store_name,
                COALESCE(SUM(a.advance_amount),0) AS advances_given,
                COALESCE(SUM((SELECT SUM(e.amount) FROM petty_cash_expenses e WHERE e.advance_id=a.id)),0) AS total_expenses,
                COALESCE(SUM((SELECT SUM(d.amount) FROM petty_cash_deposits d WHERE d.advance_id=a.id)),0) AS total_deposits
            FROM petty_cash_advances a
            JOIN stores s ON s.id=a.store_id
            WHERE a.status <> 'CANCELLED'
            GROUP BY s.id, s.store_name
            ORDER BY s.store_name
            LIMIT 50
        `);

        const peopleRows = await db.query(`
            SELECT
                u.name AS employee,
                COALESCE(SUM(a.advance_amount),0) AS total_advance,
                COALESCE(SUM(CASE WHEN a.status='SETTLED' THEN a.advance_amount ELSE 0 END),0) AS settled
            FROM petty_cash_advances a
            JOIN users u ON u.id=a.received_by
            WHERE a.status <> 'CANCELLED'
            GROUP BY u.id, u.name
            ORDER BY total_advance DESC
            LIMIT 50
        `);

        return {
            summary: rows[0] || {
                total_advances: 0,
                total_advanced: 0,
                settled_amount: 0,
                outstanding_balance: 0
            },
            storeWise: storeRows || [],
            personWise: peopleRows || []
        };
    }
};

module.exports = PettyCash;

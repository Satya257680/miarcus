const db = require("../config/db");

async function columnExists(table, column) {
    const rows = await db.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
    return Array.isArray(rows) && rows.length > 0;
}

async function addColumnIfMissing(table, column, definition) {
    if (!(await columnExists(table, column))) {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`✅ Expense migration: added ${table}.${column}`);
    }
}

async function seedHeadOffice() {
    // Store Management remains the source of truth for stores.
    // This only creates the requested MI Arcus Head Office once.
    const rows = await db.query(
        `SELECT id FROM stores WHERE store_code = ? OR store_name = ? LIMIT 1`,
        ["MIARCUS-HO", "MI Arcus Head Office"]
    );

    if (Array.isArray(rows) && rows.length === 0) {
        await db.query(`
            INSERT INTO stores
            (store_name, store_code, country, city, state, address, manager_name, contact_number, email, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            "MI Arcus Head Office",
            "MIARCUS-HO",
            "India",
            "Head Office",
            "Odisha",
            "MI Arcus Head Office",
            "MI Arcus",
            "",
            "",
            "Active"
        ]);
        console.log("✅ MI Arcus Head Office store created.");
    }
}

const Expense = {
    async createTables() {
        await db.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                submitted_by INT NOT NULL,
                store_id INT NULL,
                expense_type VARCHAR(100) NULL,
                invoice_number VARCHAR(150) NULL,
                vendor_name VARCHAR(255) NULL,
                vendor_gstin VARCHAR(30) NULL,
                bill_date DATE NULL,
                subtotal DECIMAL(15,2) DEFAULT 0,
                tax_amount DECIMAL(15,2) DEFAULT 0,
                total_amount DECIMAL(15,2) DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'INR',
                status ENUM('Pending','Approved','Rejected','Review Required') DEFAULT 'Pending',
                risk_level ENUM('Low Risk','Review Required','High Risk') DEFAULT 'Review Required',
                risk_score DECIMAL(6,2) DEFAULT 50,
                ocr_confidence DECIMAL(6,2) DEFAULT 0,
                attachment_path TEXT NULL,
                original_filename VARCHAR(500) NULL,
                mime_type VARCHAR(150) NULL,
                file_hash CHAR(64) NULL,
                ai_analysis_json LONGTEXT NULL,
                verification_json LONGTEXT NULL,
                rejection_reason TEXT NULL,
                reviewed_by INT NULL,
                reviewed_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_expenses_submitted_by (submitted_by),
                INDEX idx_expenses_store (store_id),
                INDEX idx_expenses_invoice (invoice_number),
                INDEX idx_expenses_vendor (vendor_name),
                INDEX idx_expenses_file_hash (file_hash),
                INDEX idx_expenses_status (status),
                INDEX idx_expenses_risk (risk_level),
                INDEX idx_expenses_created (created_at)
            )
        `);

        // Existing production databases already have `expenses`.
        await addColumnIfMissing("expenses", "store_id", "INT NULL");
        await addColumnIfMissing("expenses", "file_hash", "CHAR(64) NULL");

        await db.query(`
            CREATE TABLE IF NOT EXISTS expense_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expense_id INT NOT NULL,
                description VARCHAR(500) NULL,
                quantity DECIMAL(15,3) DEFAULT 1,
                unit_price DECIMAL(15,2) DEFAULT 0,
                tax_rate DECIMAL(8,2) DEFAULT 0,
                tax_amount DECIMAL(15,2) DEFAULT 0,
                line_total DECIMAL(15,2) DEFAULT 0,
                INDEX idx_expense_items_expense (expense_id),
                CONSTRAINT fk_expense_items_expense FOREIGN KEY (expense_id)
                    REFERENCES expenses(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS expense_checks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expense_id INT NOT NULL,
                check_type VARCHAR(100) NOT NULL,
                check_status VARCHAR(50) NOT NULL,
                score DECIMAL(6,2) DEFAULT 0,
                details_json LONGTEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_expense_checks_expense (expense_id),
                CONSTRAINT fk_expense_checks_expense FOREIGN KEY (expense_id)
                    REFERENCES expenses(id) ON DELETE CASCADE
            )
        `);

        // Seed only after the normal Store Management table exists.
        try {
            await seedHeadOffice();
        } catch (error) {
            console.warn("⚠️ Could not seed MI Arcus Head Office:", error.message);
        }
    },

    async getAll(filters = {}) {
        const where = [];
        const params = [];

        if (filters.status) {
            where.push("e.status = ?");
            params.push(filters.status);
        }

        if (filters.type) {
            where.push("e.expense_type = ?");
            params.push(filters.type);
        }

        if (filters.storeId) {
            where.push("e.store_id = ?");
            params.push(filters.storeId);
        }

        if (filters.userId) {
            where.push("e.submitted_by = ?");
            params.push(filters.userId);
        }

        if (filters.search) {
            const term = `%${filters.search}%`;
            where.push(`
                (
                    e.invoice_number LIKE ?
                    OR e.vendor_name LIKE ?
                    OR e.expense_type LIKE ?
                    OR s.store_name LIKE ?
                    OR s.store_code LIKE ?
                    OR CAST(e.total_amount AS CHAR) LIKE ?
                    OR COALESCE(u.name, '') LIKE ?
                    OR COALESCE(u.employee_id, '') LIKE ?
                )
            `);
            params.push(term, term, term, term, term, term, term, term);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const rows = await db.query(`
            SELECT
                e.*,
                COALESCE(s.store_name, 'Not selected') AS store_name,
                COALESCE(s.store_code, '') AS store_code,
                COALESCE(u.name, 'Unknown User') AS submitted_by_name,
                COALESCE(u.employee_id, '') AS submitted_by_employee_id,
                COALESCE(r.name, '') AS reviewed_by_name
            FROM expenses e
            LEFT JOIN stores s ON s.id = e.store_id
            LEFT JOIN users u ON u.id = e.submitted_by
            LEFT JOIN users r ON r.id = e.reviewed_by
            ${whereSql}
            ORDER BY e.created_at DESC
        `, params);

        return Array.isArray(rows) ? rows : [];
    },

    async getById(id) {
        const rows = await db.query(`
            SELECT
                e.*,
                COALESCE(s.store_name, 'Not selected') AS store_name,
                COALESCE(s.store_code, '') AS store_code,
                COALESCE(u.name, 'Unknown User') AS submitted_by_name,
                COALESCE(u.employee_id, '') AS submitted_by_employee_id,
                COALESCE(r.name, '') AS reviewed_by_name
            FROM expenses e
            LEFT JOIN stores s ON s.id = e.store_id
            LEFT JOIN users u ON u.id = e.submitted_by
            LEFT JOIN users r ON r.id = e.reviewed_by
            WHERE e.id = ?
            LIMIT 1
        `, [id]);

        if (!Array.isArray(rows) || rows.length === 0) return null;

        const items = await db.query(`SELECT * FROM expense_items WHERE expense_id = ? ORDER BY id ASC`, [id]);
        const checks = await db.query(`SELECT * FROM expense_checks WHERE expense_id = ? ORDER BY id ASC`, [id]);

        return {
            ...rows[0],
            items: Array.isArray(items) ? items : [],
            checks: Array.isArray(checks) ? checks : [],
            ai_analysis: safeJson(rows[0].ai_analysis_json, {}),
            verification: safeJson(rows[0].verification_json, {})
        };
    },

    async create(data) {
        const result = await db.query(`
            INSERT INTO expenses (
                submitted_by, store_id, expense_type, invoice_number, vendor_name,
                vendor_gstin, bill_date, subtotal, tax_amount, total_amount, currency,
                status, risk_level, risk_score, ocr_confidence, attachment_path,
                original_filename, mime_type, file_hash, ai_analysis_json, verification_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.submitted_by,
            data.store_id || null,
            data.expense_type,
            data.invoice_number || null,
            data.vendor_name || null,
            data.vendor_gstin || null,
            data.bill_date || null,
            Number(data.subtotal || 0),
            Number(data.tax_amount || 0),
            Number(data.total_amount || 0),
            data.currency || "INR",
            data.status || "Pending",
            data.risk_level || "Review Required",
            Number(data.risk_score || 50),
            Number(data.ocr_confidence || 0),
            data.attachment_path || null,
            data.original_filename || null,
            data.mime_type || null,
            data.file_hash || null,
            JSON.stringify(data.ai_analysis || {}),
            JSON.stringify(data.verification || {})
        ]);

        return Number(result?.insertId || 0);
    },

    async addItems(expenseId, items = []) {
        if (!Array.isArray(items) || items.length === 0) return;
        for (const item of items) {
            await db.query(`
                INSERT INTO expense_items
                (expense_id, description, quantity, unit_price, tax_rate, tax_amount, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                expenseId,
                item.description || "",
                Number(item.quantity || 1),
                Number(item.unit_price || 0),
                Number(item.tax_rate || 0),
                Number(item.tax_amount || 0),
                Number(item.line_total || 0)
            ]);
        }
    },

    async addChecks(expenseId, checks = []) {
        if (!Array.isArray(checks) || checks.length === 0) return;
        for (const check of checks) {
            await db.query(`
                INSERT INTO expense_checks
                (expense_id, check_type, check_status, score, details_json)
                VALUES (?, ?, ?, ?, ?)
            `, [
                expenseId,
                check.check_type || "Unknown",
                check.check_status || "REVIEW",
                Number(check.score || 0),
                JSON.stringify(check.details || {})
            ]);
        }
    },

    async updateAnalysis(expenseId, data) {
        await db.query(`
            UPDATE expenses
            SET risk_level = ?, risk_score = ?, status = ?, verification_json = ?
            WHERE id = ?
        `, [
            data.risk_level,
            Number(data.risk_score || 0),
            data.status,
            JSON.stringify(data.verification || {}),
            expenseId
        ]);
    },

    async updateReview(id, reviewerId, status, reason = null) {
        await db.query(`
            UPDATE expenses
            SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ?
        `, [status, reason, reviewerId, id]);
    },

    async getTypes() {
        const rows = await db.query(`
            SELECT DISTINCT expense_type
            FROM expenses
            WHERE expense_type IS NOT NULL AND expense_type <> ''
            ORDER BY expense_type
        `);
        return Array.isArray(rows) ? rows.map((row) => row.expense_type).filter(Boolean) : [];
    },

    async getDuplicateInfo({ fileHash, invoiceNumber, vendorName, excludeId = null }) {
        const conditions = [];
        const params = [];

        if (fileHash) {
            conditions.push("e.file_hash = ?");
            params.push(fileHash);
        }

        if (invoiceNumber) {
            conditions.push(`(
                e.invoice_number = ?
                AND (
                    e.vendor_name = ?
                    OR e.vendor_name IS NULL
                    OR ? = ''
                )
            )`);
            params.push(invoiceNumber, vendorName || "", vendorName || "");
        }

        if (!conditions.length) return [];

        let sql = `
            SELECT e.id, e.invoice_number, e.vendor_name, e.file_hash, e.created_at,
                   COALESCE(s.store_name, 'Not selected') AS store_name
            FROM expenses e
            LEFT JOIN stores s ON s.id = e.store_id
            WHERE e.status <> 'Rejected'
              AND (${conditions.join(" OR ")})
        `;

        if (excludeId) {
            sql += " AND e.id <> ?";
            params.push(excludeId);
        }

        sql += " ORDER BY e.id DESC";
        const rows = await db.query(sql, params);
        return Array.isArray(rows) ? rows : [];
    },

    async deleteById(id) {
        const rows = await db.query(`SELECT attachment_path FROM expenses WHERE id = ? LIMIT 1`, [id]);
        if (!Array.isArray(rows) || rows.length === 0) return { deleted: false, attachment_path: null };

        await db.query(`DELETE FROM expense_checks WHERE expense_id = ?`, [id]);
        await db.query(`DELETE FROM expense_items WHERE expense_id = ?`, [id]);
        await db.query(`DELETE FROM expenses WHERE id = ?`, [id]);

        return { deleted: true, attachment_path: rows[0].attachment_path || null };
    },

    async deleteAll() {
        const rows = await db.query(`SELECT attachment_path FROM expenses`);
        await db.query(`DELETE FROM expense_checks`);
        await db.query(`DELETE FROM expense_items`);
        const result = await db.query(`DELETE FROM expenses`);
        return {
            count: Number(result?.affectedRows || 0),
            attachments: Array.isArray(rows)
                ? rows.map((row) => row.attachment_path).filter(Boolean)
                : []
        };
    }
};

function safeJson(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

module.exports = Expense;

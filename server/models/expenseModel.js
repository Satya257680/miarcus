const db = require("../config/db");

// ======================================================
// EXPENSE MODEL
// ======================================================

const Expense = {

    // ==================================================
    // CREATE TABLES
    // ==================================================

    async createTables() {

        await db.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,

                submitted_by INT NOT NULL,

                expense_type VARCHAR(100) NULL,

                invoice_number VARCHAR(150) NULL,

                vendor_name VARCHAR(255) NULL,

                vendor_gstin VARCHAR(30) NULL,

                bill_date DATE NULL,

                subtotal DECIMAL(15,2) DEFAULT 0,

                tax_amount DECIMAL(15,2) DEFAULT 0,

                total_amount DECIMAL(15,2) DEFAULT 0,

                currency VARCHAR(10) DEFAULT 'INR',

                status ENUM(
                    'Pending',
                    'Approved',
                    'Rejected',
                    'Review Required'
                ) DEFAULT 'Pending',

                risk_level ENUM(
                    'Low Risk',
                    'Review Required',
                    'High Risk'
                ) DEFAULT 'Review Required',

                risk_score DECIMAL(6,2) DEFAULT 50,

                ocr_confidence DECIMAL(6,2) DEFAULT 0,

                attachment_path TEXT NULL,

                original_filename VARCHAR(500) NULL,

                mime_type VARCHAR(150) NULL,

                ai_analysis_json LONGTEXT NULL,

                verification_json LONGTEXT NULL,

                rejection_reason TEXT NULL,

                reviewed_by INT NULL,

                reviewed_at DATETIME NULL,

                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                updated_at DATETIME
                    DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_expenses_submitted_by (submitted_by),

                INDEX idx_expenses_invoice (invoice_number),

                INDEX idx_expenses_vendor (vendor_name),

                INDEX idx_expenses_status (status),

                INDEX idx_expenses_created (created_at)
            )
        `);


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

                CONSTRAINT fk_expense_items_expense
                    FOREIGN KEY (expense_id)
                    REFERENCES expenses(id)
                    ON DELETE CASCADE
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

                CONSTRAINT fk_expense_checks_expense
                    FOREIGN KEY (expense_id)
                    REFERENCES expenses(id)
                    ON DELETE CASCADE
            )
        `);
    },


    // ==================================================
    // GET ALL EXPENSES
    // ==================================================

    async getAll(filters = {}) {

        const where = [];

        const params = [];


        // ----------------------------------------------
        // STATUS
        // ----------------------------------------------

        if (filters.status) {

            where.push(
                "e.status = ?"
            );

            params.push(
                filters.status
            );
        }


        // ----------------------------------------------
        // TYPE
        // ----------------------------------------------

        if (filters.type) {

            where.push(
                "e.expense_type = ?"
            );

            params.push(
                filters.type
            );
        }


        // ----------------------------------------------
        // USER
        // ----------------------------------------------

        if (filters.userId) {

            where.push(
                "e.submitted_by = ?"
            );

            params.push(
                filters.userId
            );
        }


        // ----------------------------------------------
        // SEARCH
        // ----------------------------------------------

        if (filters.search) {

            const term =
                `%${filters.search}%`;

            where.push(`
                (
                    e.invoice_number LIKE ?
                    OR e.vendor_name LIKE ?
                    OR e.expense_type LIKE ?
                    OR CAST(e.total_amount AS CHAR) LIKE ?
                    OR COALESCE(u.name, '') LIKE ?
                    OR COALESCE(u.employee_id, '') LIKE ?
                )
            `);

            params.push(
                term,
                term,
                term,
                term,
                term,
                term
            );
        }


        const whereSql =
            where.length
                ? `WHERE ${where.join(" AND ")}`
                : "";


        // IMPORTANT:
        // db.query() already returns rows/result.
        // Do NOT use [rows] here.

        const rows = await db.query(`
            SELECT
                e.*,

                COALESCE(
                    u.name,
                    'Unknown User'
                ) AS submitted_by_name,

                COALESCE(
                    u.employee_id,
                    ''
                ) AS submitted_by_employee_id,

                COALESCE(
                    r.name,
                    ''
                ) AS reviewed_by_name

            FROM expenses e

            LEFT JOIN users u
                ON u.id = e.submitted_by

            LEFT JOIN users r
                ON r.id = e.reviewed_by

            ${whereSql}

            ORDER BY e.created_at DESC

        `, params);


        return Array.isArray(rows)
            ? rows
            : [];
    },


    // ==================================================
    // GET EXPENSE BY ID
    // ==================================================

    async getById(id) {

        // ----------------------------------------------
        // EXPENSE
        // ----------------------------------------------

        const rows = await db.query(`
            SELECT
                e.*,

                COALESCE(
                    u.name,
                    'Unknown User'
                ) AS submitted_by_name,

                COALESCE(
                    u.employee_id,
                    ''
                ) AS submitted_by_employee_id,

                COALESCE(
                    r.name,
                    ''
                ) AS reviewed_by_name

            FROM expenses e

            LEFT JOIN users u
                ON u.id = e.submitted_by

            LEFT JOIN users r
                ON r.id = e.reviewed_by

            WHERE e.id = ?

            LIMIT 1

        `, [id]);


        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            return null;
        }


        // ----------------------------------------------
        // ITEMS
        // ----------------------------------------------

        const items = await db.query(`
            SELECT *
            FROM expense_items
            WHERE expense_id = ?
            ORDER BY id ASC
        `, [id]);


        // ----------------------------------------------
        // CHECKS
        // ----------------------------------------------

        const checks = await db.query(`
            SELECT *
            FROM expense_checks
            WHERE expense_id = ?
            ORDER BY id ASC
        `, [id]);


        // ----------------------------------------------
        // RETURN
        // ----------------------------------------------

        return {

            ...rows[0],

            items:
                Array.isArray(items)
                    ? items
                    : [],

            checks:
                Array.isArray(checks)
                    ? checks
                    : [],

            ai_analysis:
                safeJson(
                    rows[0].ai_analysis_json,
                    null
                ),

            verification:
                safeJson(
                    rows[0].verification_json,
                    null
                )
        };
    },


    // ==================================================
    // CREATE EXPENSE
    // ==================================================

    async create(data) {

        // IMPORTANT:
        // db.query() returns ResultSetHeader directly.
        // Therefore:
        //
        // WRONG:
        // const [result] = await db.query(...)
        //
        // CORRECT:
        // const result = await db.query(...)

        const result = await db.query(`

            INSERT INTO expenses (

                submitted_by,

                expense_type,

                invoice_number,

                vendor_name,

                vendor_gstin,

                bill_date,

                subtotal,

                tax_amount,

                total_amount,

                currency,

                status,

                risk_level,

                risk_score,

                ocr_confidence,

                attachment_path,

                original_filename,

                mime_type,

                ai_analysis_json,

                verification_json

            )

            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )

        `, [

            data.submitted_by,

            data.expense_type || null,

            data.invoice_number || null,

            data.vendor_name || null,

            data.vendor_gstin || null,

            data.bill_date || null,

            Number(
                data.subtotal || 0
            ),

            Number(
                data.tax_amount || 0
            ),

            Number(
                data.total_amount || 0
            ),

            data.currency || "INR",

            data.status || "Pending",

            data.risk_level ||
                "Review Required",

            Number(
                data.risk_score || 50
            ),

            Number(
                data.ocr_confidence || 0
            ),

            data.attachment_path ||
                null,

            data.original_filename ||
                null,

            data.mime_type ||
                null,

            JSON.stringify(
                data.ai_analysis || {}
            ),

            JSON.stringify(
                data.verification || {}
            )
        ]);


        // mysql2 ResultSetHeader
        // contains insertId.

        return result.insertId;
    },


    // ==================================================
    // ADD EXPENSE ITEMS
    // ==================================================

    async addItems(
        expenseId,
        items = []
    ) {

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return;
        }


        for (
            const item of items
        ) {

            await db.query(`

                INSERT INTO expense_items (

                    expense_id,

                    description,

                    quantity,

                    unit_price,

                    tax_rate,

                    tax_amount,

                    line_total

                )

                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )

            `, [

                expenseId,

                item.description || "",

                Number(
                    item.quantity || 1
                ),

                Number(
                    item.unit_price || 0
                ),

                Number(
                    item.tax_rate || 0
                ),

                Number(
                    item.tax_amount || 0
                ),

                Number(
                    item.line_total || 0
                )
            ]);
        }
    },


    // ==================================================
    // ADD EXPENSE CHECKS
    // ==================================================

    async addChecks(
        expenseId,
        checks = []
    ) {

        if (
            !Array.isArray(checks) ||
            checks.length === 0
        ) {
            return;
        }


        for (
            const check of checks
        ) {

            await db.query(`

                INSERT INTO expense_checks (

                    expense_id,

                    check_type,

                    check_status,

                    score,

                    details_json

                )

                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )

            `, [

                expenseId,

                check.check_type ||
                    "Unknown",

                check.check_status ||
                    "Pending",

                Number(
                    check.score || 0
                ),

                JSON.stringify(
                    check.details || {}
                )
            ]);
        }
    },


    // ==================================================
    // UPDATE REVIEW
    // ==================================================

    async updateReview(
        id,
        reviewerId,
        status,
        reason = null
    ) {

        await db.query(`

            UPDATE expenses

            SET

                status = ?,

                rejection_reason = ?,

                reviewed_by = ?,

                reviewed_at = NOW()

            WHERE id = ?

        `, [

            status,

            reason,

            reviewerId,

            id
        ]);
    },


    // ==================================================
    // GET EXPENSE TYPES
    // ==================================================

    async getTypes() {

        // db.query() already returns rows.

        const rows = await db.query(`

            SELECT DISTINCT
                expense_type

            FROM expenses

            WHERE expense_type IS NOT NULL

              AND expense_type <> ''

            ORDER BY expense_type

        `);


        if (
            !Array.isArray(rows)
        ) {
            return [];
        }


        return rows.map(
            row =>
                row.expense_type
        );
    }
};


// ======================================================
// SAFE JSON PARSER
// ======================================================

function safeJson(
    value,
    fallback
) {

    try {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return fallback;
        }


        // Already an object
        if (
            typeof value === "object"
        ) {
            return value;
        }


        return JSON.parse(value);

    } catch {

        return fallback;
    }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = Expense;
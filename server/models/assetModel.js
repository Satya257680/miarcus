const db = require("../config/db");

const TABLES = {
    marketing: "marketing_assets",
    legal: "legal_assets",
};

const clean = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === "" ? null : text;
};

const numberOrNull = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const number = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(number) ? number : null;
};

const jsonOrEmpty = (value, fallback = []) => {
    if (Array.isArray(value)) return value;
    if (!value) return fallback;
    try {
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

const normalizeAttachments = (value) => jsonOrEmpty(value, []);

const createTables = async (callback) => {
    const marketingSql = `
        CREATE TABLE IF NOT EXISTS marketing_assets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            department_id INT NULL,
            department_name VARCHAR(255) NULL,
            store_id INT NULL,
            store_name VARCHAR(255) NULL,
            particular_name VARCHAR(255) NOT NULL,
            category VARCHAR(150) NULL,
            type VARCHAR(150) NULL,
            size VARCHAR(100) NULL,
            color VARCHAR(100) NULL,
            brand VARCHAR(150) NULL,
            rate DECIMAL(14,2) NULL,
            buy_date DATE NULL,
            expiry_date DATE NULL,
            location_address TEXT NULL,
            location_lat DECIMAL(10,7) NULL,
            location_lng DECIMAL(10,7) NULL,
            email VARCHAR(255) NULL,
            mobile VARCHAR(50) NULL,
            remark TEXT NULL,
            additional_fields JSON NULL,
            attachments JSON NULL,
            created_by INT NULL,
            updated_by INT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_marketing_store (store_id),
            INDEX idx_marketing_department (department_id),
            INDEX idx_marketing_category (category),
            INDEX idx_marketing_expiry (expiry_date),
            INDEX idx_marketing_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const legalSql = `
        CREATE TABLE IF NOT EXISTS legal_assets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            store_id INT NULL,
            store_name VARCHAR(255) NULL,
            department_id INT NULL,
            department_name VARCHAR(255) NULL,
            location_address TEXT NULL,
            location_lat DECIMAL(10,7) NULL,
            location_lng DECIMAL(10,7) NULL,
            remark TEXT NULL,
            short_description TEXT NULL,
            attachments JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            date_of_issue DATE NULL,
            status VARCHAR(80) NOT NULL DEFAULT 'Unresolved',
            custom_field_name VARCHAR(150) NULL,
            custom_field_value TEXT NULL,
            created_by INT NULL,
            updated_by INT NULL,
            INDEX idx_legal_store (store_id),
            INDEX idx_legal_department (department_id),
            INDEX idx_legal_status (status),
            INDEX idx_legal_issue (date_of_issue),
            INDEX idx_legal_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
        await db.query(marketingSql);
        await db.query(legalSql);
        if (typeof callback === "function") callback(null);
    } catch (error) {
        if (typeof callback === "function") callback(error);
        else throw error;
    }
};

const resolveNames = async (data) => {
    let departmentName = clean(data.department_name);
    let storeName = clean(data.store_name);

    if (data.department_id && !departmentName) {
        const rows = await db.query("SELECT department_name FROM departments WHERE id = ? LIMIT 1", [data.department_id]);
        departmentName = rows[0]?.department_name || null;
    }

    if (data.store_id && !storeName) {
        const rows = await db.query("SELECT store_name FROM stores WHERE id = ? LIMIT 1", [data.store_id]);
        storeName = rows[0]?.store_name || null;
    }

    return { departmentName, storeName };
};

const parseRow = (type, row) => ({
    ...row,
    attachments: normalizeAttachments(row.attachments),
    additional_fields: jsonOrEmpty(row.additional_fields, []),
    rate: row.rate === null || row.rate === undefined ? null : Number(row.rate),
    days_to_expire:
        type === "marketing" && row.expiry_date
            ? Math.ceil((new Date(row.expiry_date).getTime() - Date.now()) / 86400000)
            : null,
});

const buildWhere = (type, filters = {}) => {
    const conditions = [];
    const params = [];
    const search = clean(filters.search);
    const column = clean(filters.column);
    const filterValue = clean(filters.filterValue);

    const searchable = type === "marketing"
        ? ["particular_name", "store_name", "category", "type", "brand", "department_name", "location_address", "email", "mobile", "remark"]
        : ["name", "store_name", "department_name", "location_address", "remark", "short_description", "status", "custom_field_name", "custom_field_value"];

    if (search) {
        const like = `%${search}%`;
        conditions.push(`(${searchable.map((field) => `${field} LIKE ?`).join(" OR ")})`);
        params.push(...searchable.map(() => like));
    }

    if (column && filterValue) {
        const allowed = new Set(type === "marketing" ? MARKETING_FILTER_COLUMNS : LEGAL_FILTER_COLUMNS);
        if (allowed.has(column)) {
            conditions.push(`${column} LIKE ?`);
            params.push(`%${filterValue}%`);
        }
    }

    return {
        where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
    };
};

const MARKETING_FILTER_COLUMNS = [
    "particular_name", "store_name", "category", "type", "rate", "size", "color", "brand", "department_name", "location_address", "email", "mobile", "remark"
];

const LEGAL_FILTER_COLUMNS = [
    "name", "store_name", "department_name", "location_address", "remark", "short_description", "date_of_issue", "status", "custom_field_name", "custom_field_value"
];

const list = async (type, filters = {}) => {
    const table = TABLES[type];
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));
    const offset = (page - 1) * pageSize;
    const { where, params } = buildWhere(type, filters);

    const [rows, countRows] = await Promise.all([
        db.query(`SELECT * FROM ${table} ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]),
        db.query(`SELECT COUNT(*) AS total FROM ${table} ${where}`, params),
    ]);

    return {
        rows: rows.map((row) => parseRow(type, row)),
        total: Number(countRows[0]?.total || 0),
        page,
        pageSize,
    };
};

const findById = async (type, id) => {
    const rows = await db.query(`SELECT * FROM ${TABLES[type]} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] ? parseRow(type, rows[0]) : null;
};

const create = async (type, data, userId) => {
    const { departmentName, storeName } = await resolveNames(data);

    if (type === "marketing") {
        const result = await db.query(
            `INSERT INTO marketing_assets
            (department_id, department_name, store_id, store_name, particular_name, category, type, size, color, brand, rate, buy_date, expiry_date, location_address, location_lat, location_lng, email, mobile, remark, additional_fields, attachments, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                numberOrNull(data.department_id), departmentName, numberOrNull(data.store_id), storeName,
                clean(data.particular_name), clean(data.category), clean(data.type), clean(data.size), clean(data.color), clean(data.brand),
                numberOrNull(data.rate), clean(data.buy_date), clean(data.expiry_date), clean(data.location_address), numberOrNull(data.location_lat), numberOrNull(data.location_lng),
                clean(data.email), clean(data.mobile), clean(data.remark), JSON.stringify(jsonOrEmpty(data.additional_fields, [])), JSON.stringify(normalizeAttachments(data.attachments)), userId || null, userId || null,
            ]
        );
        return findById(type, result.insertId);
    }

    const result = await db.query(
        `INSERT INTO legal_assets
        (name, store_id, store_name, department_id, department_name, location_address, location_lat, location_lng, remark, short_description, attachments, date_of_issue, status, custom_field_name, custom_field_value, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            clean(data.name), numberOrNull(data.store_id), storeName, numberOrNull(data.department_id), departmentName,
            clean(data.location_address), numberOrNull(data.location_lat), numberOrNull(data.location_lng), clean(data.remark), clean(data.short_description),
            JSON.stringify(normalizeAttachments(data.attachments)), clean(data.date_of_issue), clean(data.status) || "Unresolved", clean(data.custom_field_name), clean(data.custom_field_value), userId || null, userId || null,
        ]
    );
    return findById(type, result.insertId);
};

const update = async (type, id, data, userId) => {
    const existing = await findById(type, id);
    if (!existing) return null;

    const { departmentName, storeName } = await resolveNames({
        ...existing,
        ...data,
        department_name: data.department_name || existing.department_name,
        store_name: data.store_name || existing.store_name,
    });

    let attachmentList = data.attachmentsProvided
        ? normalizeAttachments(data.attachments)
        : existing.attachments;

    if (type === "marketing") {
        await db.query(
            `UPDATE marketing_assets SET
                department_id=?, department_name=?, store_id=?, store_name=?, particular_name=?, category=?, type=?, size=?, color=?, brand=?, rate=?, buy_date=?, expiry_date=?, location_address=?, location_lat=?, location_lng=?, email=?, mobile=?, remark=?, additional_fields=?, attachments=?, updated_by=?
             WHERE id=?`,
            [
                numberOrNull(data.department_id ?? existing.department_id), departmentName, numberOrNull(data.store_id ?? existing.store_id), storeName,
                clean(data.particular_name ?? existing.particular_name), clean(data.category ?? existing.category), clean(data.type ?? existing.type), clean(data.size ?? existing.size), clean(data.color ?? existing.color), clean(data.brand ?? existing.brand),
                numberOrNull(data.rate ?? existing.rate), clean(data.buy_date ?? existing.buy_date), clean(data.expiry_date ?? existing.expiry_date), clean(data.location_address ?? existing.location_address), numberOrNull(data.location_lat ?? existing.location_lat), numberOrNull(data.location_lng ?? existing.location_lng),
                clean(data.email ?? existing.email), clean(data.mobile ?? existing.mobile), clean(data.remark ?? existing.remark), JSON.stringify(data.additional_fields ?? existing.additional_fields ?? []), JSON.stringify(attachmentList), userId || null, id,
            ]
        );
    } else {
        await db.query(
            `UPDATE legal_assets SET
                name=?, store_id=?, store_name=?, department_id=?, department_name=?, location_address=?, location_lat=?, location_lng=?, remark=?, short_description=?, attachments=?, date_of_issue=?, status=?, custom_field_name=?, custom_field_value=?, updated_by=?
             WHERE id=?`,
            [
                clean(data.name ?? existing.name), numberOrNull(data.store_id ?? existing.store_id), storeName, numberOrNull(data.department_id ?? existing.department_id), departmentName,
                clean(data.location_address ?? existing.location_address), numberOrNull(data.location_lat ?? existing.location_lat), numberOrNull(data.location_lng ?? existing.location_lng), clean(data.remark ?? existing.remark), clean(data.short_description ?? existing.short_description), JSON.stringify(attachmentList), clean(data.date_of_issue ?? existing.date_of_issue), clean(data.status ?? existing.status) || "Unresolved", clean(data.custom_field_name ?? existing.custom_field_name), clean(data.custom_field_value ?? existing.custom_field_value), userId || null, id,
            ]
        );
    }

    return findById(type, id);
};

const remove = async (type, id) => {
    const result = await db.query(`DELETE FROM ${TABLES[type]} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
};

const getOptions = async () => {
    const [departments, stores] = await Promise.all([
        db.query("SELECT id, department_name FROM departments ORDER BY department_name ASC"),
        db.query("SELECT id, store_name FROM stores ORDER BY store_name ASC"),
    ]);

    return { departments, stores };
};

const exportRows = async (type, filters = {}) => {
    const { where, params } = buildWhere(type, filters);
    const rows = await db.query(`SELECT * FROM ${TABLES[type]} ${where} ORDER BY updated_at DESC, id DESC`, params);
    return rows.map((row) => parseRow(type, row));
};

const importRows = async (type, rows, userId) => {
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
        try {
            const required = type === "marketing" ? row.particular_name : row.name;
            if (!clean(required)) {
                skipped += 1;
                continue;
            }
            await create(type, row, userId);
            imported += 1;
        } catch (error) {
            console.error("Asset CSV row import failed:", error.message);
            skipped += 1;
        }
    }

    return { imported, skipped };
};

module.exports = {
    TABLES,
    createTables,
    list,
    findById,
    create,
    update,
    remove,
    getOptions,
    exportRows,
    importRows,
    normalizeAttachments,
};

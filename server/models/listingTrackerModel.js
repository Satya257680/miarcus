const db = require("../config/db");

const TABLE = "listing_tracker_products";

const normalizeText = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === "" ? null : text;
};

const normalizeBoolean = (value) => {
    if (value === true || value === 1) return 1;
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["1", "true", "yes", "y", "done", "complete", "completed"].includes(
        normalized
    )
        ? 1
        : 0;
};

const normalizeNumber = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
        return null;
    }

    const number = Number(String(value).replace(/,/g, "").replace(/[₹$]/g, ""));
    return Number.isFinite(number) ? number : null;
};

const createTables = async (callback) => {
    const sql = `
        CREATE TABLE IF NOT EXISTS ${TABLE} (
            id INT AUTO_INCREMENT PRIMARY KEY,

            ppk_code VARCHAR(120) NOT NULL,
            shopify_handle VARCHAR(255) NULL,
            product_name VARCHAR(255) NULL,
            category VARCHAR(120) NULL,
            barcode VARCHAR(120) NULL,
            sku VARCHAR(160) NOT NULL,
            mrp DECIMAL(14,2) NULL,
            season VARCHAR(100) NULL,
            collection_name VARCHAR(120) NULL,
            image_link TEXT NULL,

            photoshoot TINYINT(1) NOT NULL DEFAULT 0,
            product_listed TINYINT(1) NOT NULL DEFAULT 0,

            photoshoot_at DATETIME NULL,
            listed_at DATETIME NULL,

            remark TEXT NULL,

            created_by INT NULL,
            updated_by INT NULL,

            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_listing_ppk (ppk_code),
            INDEX idx_listing_sku (sku),
            INDEX idx_listing_barcode (barcode),
            INDEX idx_listing_collection (collection_name),
            INDEX idx_listing_category (category),
            INDEX idx_listing_status (photoshoot, product_listed),
            INDEX idx_listing_updated (updated_at)
        )
        ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
    `;

    try {
        await db.query(sql);
        if (typeof callback === "function") callback(null);
    } catch (error) {
        if (typeof callback === "function") callback(error);
        else throw error;
    }
};

const buildWhere = (filters = {}) => {
    const conditions = [];
    const params = [];

    const search = String(filters.search || "").trim();
    const collection = String(filters.collection || "").trim();
    const category = String(filters.category || "").trim();
    const photoshoot = String(filters.photoshoot || "").trim().toLowerCase();
    const listed = String(filters.listed || "").trim().toLowerCase();

    if (search) {
        const like = `%${search}%`;
        conditions.push(`
            (
                ppk_code LIKE ?
                OR shopify_handle LIKE ?
                OR product_name LIKE ?
                OR category LIKE ?
                OR barcode LIKE ?
                OR sku LIKE ?
                OR collection_name LIKE ?
                OR remark LIKE ?
            )
        `);
        params.push(
            like, like, like, like,
            like, like, like, like
        );
    }

    if (collection) {
        conditions.push("collection_name = ?");
        params.push(collection);
    }

    if (category) {
        conditions.push("category = ?");
        params.push(category);
    }

    if (photoshoot === "yes" || photoshoot === "no") {
        conditions.push("photoshoot = ?");
        params.push(photoshoot === "yes" ? 1 : 0);
    }

    if (listed === "yes" || listed === "no") {
        conditions.push("product_listed = ?");
        params.push(listed === "yes" ? 1 : 0);
    }

    return {
        where: conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "",
        params,
    };
};

const normalizeRow = (row) => ({
    ...row,
    photoshoot: Boolean(row.photoshoot),
    product_listed: Boolean(row.product_listed),
    mrp:
        row.mrp === null || row.mrp === undefined
            ? null
            : Number(row.mrp),
});

const list = async (filters = {}) => {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(
        100,
        Math.max(1, Number(filters.pageSize) || 10)
    );
    const offset = (page - 1) * pageSize;

    const { where, params } = buildWhere(filters);

    const [rows, countRows] = await Promise.all([
        db.query(
            `
            SELECT
                id,
                ppk_code,
                shopify_handle,
                product_name,
                category,
                barcode,
                sku,
                mrp,
                season,
                collection_name,
                image_link,
                photoshoot,
                product_listed,
                photoshoot_at,
                listed_at,
                remark,
                created_by,
                updated_by,
                created_at,
                updated_at
            FROM ${TABLE}
            ${where}
            ORDER BY updated_at DESC, id DESC
            LIMIT ? OFFSET ?
            `,
            [...params, pageSize, offset]
        ),
        db.query(
            `
            SELECT COUNT(*) AS total
            FROM ${TABLE}
            ${where}
            `,
            params
        ),
    ]);

    return {
        rows: rows.map(normalizeRow),
        total: Number(countRows[0]?.total || 0),
        page,
        pageSize,
    };
};

const summary = async (filters = {}) => {
    const { where, params } = buildWhere(filters);

    const [totals, collections, categories] = await Promise.all([
        db.query(
            `
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(photoshoot = 1), 0) AS photoshoot_yes,
                COALESCE(SUM(photoshoot = 0), 0) AS photoshoot_no,
                COALESCE(SUM(product_listed = 1), 0) AS listed_yes,
                COALESCE(SUM(product_listed = 0), 0) AS listed_no,
                MAX(updated_at) AS last_updated
            FROM ${TABLE}
            ${where}
            `,
            params
        ),
        db.query(
            `
            SELECT
                COALESCE(NULLIF(collection_name, ''), 'Unassigned') AS collection_name,
                COUNT(*) AS total,
                COALESCE(SUM(product_listed = 1), 0) AS listed_yes,
                COALESCE(SUM(photoshoot = 1), 0) AS photoshoot_yes
            FROM ${TABLE}
            ${where}
            GROUP BY COALESCE(NULLIF(collection_name, ''), 'Unassigned')
            ORDER BY total DESC, collection_name ASC
            LIMIT 50
            `,
            params
        ),
        db.query(
            `
            SELECT
                COALESCE(NULLIF(category, ''), 'Unassigned') AS category,
                COUNT(*) AS total
            FROM ${TABLE}
            ${where}
            GROUP BY COALESCE(NULLIF(category, ''), 'Unassigned')
            ORDER BY category ASC
            LIMIT 100
            `,
            params
        ),
    ]);

    return {
        total: Number(totals[0]?.total || 0),
        photoshootYes: Number(totals[0]?.photoshoot_yes || 0),
        photoshootNo: Number(totals[0]?.photoshoot_no || 0),
        listedYes: Number(totals[0]?.listed_yes || 0),
        listedNo: Number(totals[0]?.listed_no || 0),
        lastUpdated: totals[0]?.last_updated || null,
        collections: collections.map((item) => ({
            collection_name: item.collection_name,
            total: Number(item.total || 0),
            listed_yes: Number(item.listed_yes || 0),
            photoshoot_yes: Number(item.photoshoot_yes || 0),
            listed_percent: item.total
                ? (Number(item.listed_yes || 0) / Number(item.total)) * 100
                : 0,
            photoshoot_percent: item.total
                ? (Number(item.photoshoot_yes || 0) / Number(item.total)) * 100
                : 0,
        })),
        categories: categories.map((item) => ({
            category: item.category,
            total: Number(item.total || 0),
        })),
    };
};

const findById = async (id) => {
    const rows = await db.query(
        `SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows[0] ? normalizeRow(rows[0]) : null;
};

const create = async (payload, userId) => {
    const photoshoot = normalizeBoolean(payload.photoshoot);
    const productListed = normalizeBoolean(payload.product_listed);

    const result = await db.query(
        `
        INSERT INTO ${TABLE} (
            ppk_code,
            shopify_handle,
            product_name,
            category,
            barcode,
            sku,
            mrp,
            season,
            collection_name,
            image_link,
            photoshoot,
            product_listed,
            photoshoot_at,
            listed_at,
            remark,
            created_by,
            updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            normalizeText(payload.ppk_code),
            normalizeText(payload.shopify_handle),
            normalizeText(payload.product_name),
            normalizeText(payload.category),
            normalizeText(payload.barcode),
            normalizeText(payload.sku),
            normalizeNumber(payload.mrp),
            normalizeText(payload.season),
            normalizeText(payload.collection_name),
            normalizeText(payload.image_link),
            photoshoot,
            productListed,
            photoshoot ? new Date() : null,
            productListed ? new Date() : null,
            normalizeText(payload.remark),
            userId || null,
            userId || null,
        ]
    );

    return findById(result.insertId);
};

const update = async (id, payload, userId) => {
    const existing = await findById(id);

    if (!existing) return null;

    const photoshoot = normalizeBoolean(payload.photoshoot);
    const productListed = normalizeBoolean(payload.product_listed);

    const photoshootAt =
        photoshoot
            ? existing.photoshoot_at || new Date()
            : null;

    const listedAt =
        productListed
            ? existing.listed_at || new Date()
            : null;

    await db.query(
        `
        UPDATE ${TABLE}
        SET
            ppk_code = ?,
            shopify_handle = ?,
            product_name = ?,
            category = ?,
            barcode = ?,
            sku = ?,
            mrp = ?,
            season = ?,
            collection_name = ?,
            image_link = ?,
            photoshoot = ?,
            product_listed = ?,
            photoshoot_at = ?,
            listed_at = ?,
            remark = ?,
            updated_by = ?
        WHERE id = ?
        `,
        [
            normalizeText(payload.ppk_code),
            normalizeText(payload.shopify_handle),
            normalizeText(payload.product_name),
            normalizeText(payload.category),
            normalizeText(payload.barcode),
            normalizeText(payload.sku),
            normalizeNumber(payload.mrp),
            normalizeText(payload.season),
            normalizeText(payload.collection_name),
            normalizeText(payload.image_link),
            photoshoot,
            productListed,
            photoshootAt,
            listedAt,
            normalizeText(payload.remark),
            userId || null,
            id,
        ]
    );

    return findById(id);
};

const remove = async (id) => {
    const result = await db.query(
        `DELETE FROM ${TABLE} WHERE id = ?`,
        [id]
    );
    return result.affectedRows > 0;
};

const removeAll = async () => {
    const result = await db.query(`DELETE FROM ${TABLE}`);
    return Number(result.affectedRows || 0);
};

const importRows = async (rows, userId) => {
    if (!rows.length) {
        return { imported: 0, skipped: 0 };
    }

    const connection = await db.getConnection();
    let imported = 0;
    let skipped = 0;

    try {
        await connection.beginTransaction();

        const batchSize = 500;

        for (let start = 0; start < rows.length; start += batchSize) {
            const batch = rows.slice(start, start + batchSize);

            const values = [];
            const placeholders = [];

            for (const row of batch) {
                const ppk = normalizeText(row.ppk_code);
                const sku = normalizeText(row.sku);

                if (!ppk || !sku) {
                    skipped += 1;
                    continue;
                }

                const photo = normalizeBoolean(row.photoshoot);
                const listed = normalizeBoolean(row.product_listed);

                placeholders.push(
                    "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                );

                values.push(
                    ppk,
                    normalizeText(row.shopify_handle),
                    normalizeText(row.product_name),
                    normalizeText(row.category),
                    normalizeText(row.barcode),
                    sku,
                    normalizeNumber(row.mrp),
                    normalizeText(row.season),
                    normalizeText(row.collection_name),
                    normalizeText(row.image_link),
                    photo,
                    listed,
                    photo ? new Date() : null,
                    listed ? new Date() : null,
                    normalizeText(row.remark),
                    userId || null,
                    userId || null
                );
            }

            if (placeholders.length) {
                await connection.query(
                    `
                    INSERT INTO ${TABLE} (
                        ppk_code,
                        shopify_handle,
                        product_name,
                        category,
                        barcode,
                        sku,
                        mrp,
                        season,
                        collection_name,
                        image_link,
                        photoshoot,
                        product_listed,
                        photoshoot_at,
                        listed_at,
                        remark,
                        created_by,
                        updated_by
                    )
                    VALUES ${placeholders.join(",")}
                    `,
                    values
                );

                imported += placeholders.length;
            }
        }

        await connection.commit();

        return { imported, skipped };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const exportRows = async (filters = {}) => {
    const { where, params } = buildWhere(filters);

    const rows = await db.query(
        `
        SELECT
            ppk_code,
            shopify_handle,
            product_name,
            category,
            barcode,
            sku,
            mrp,
            season,
            collection_name,
            image_link,
            photoshoot,
            product_listed,
            remark,
            created_at,
            updated_at
        FROM ${TABLE}
        ${where}
        ORDER BY updated_at DESC, id DESC
        `,
        params
    );

    return rows.map(normalizeRow);
};

module.exports = {
    TABLE,
    createTables,
    list,
    summary,
    create,
    update,
    remove,
    removeAll,
    importRows,
    exportRows,
};

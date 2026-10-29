// ======================================================
// N/A REGISTER — DATA
// ------------------------------------------------------
// Every checklist answer submitted as "N/A" (the item the question
// asks about is not present at the store). These answers never raise
// an Action Point — they are reviewed here instead.
//
// Source: checklist_submission_answers (answer = N/A)
//         + checklist_submissions / questions / checklist_types /
//           stores / users
// ======================================================

const db = require("../config/db");
const { SQL_NA_VALUES } = require("../utils/notApplicable");

const MAX_EXPORT_ROWS = 20000;

let photosColumn = null;

// checklist_submission_answers.photos is added on first use by the
// submission model; tolerate older databases that do not have it yet.
const hasPhotosColumn = async () => {
    if (photosColumn !== null) return photosColumn;
    try {
        const rows = await db.query("SHOW COLUMNS FROM checklist_submission_answers LIKE 'photos'");
        photosColumn = rows.length > 0;
    } catch {
        photosColumn = false;
    }
    return photosColumn;
};

const toPositiveInt = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

// ------------------------------------------------------
// WHERE CLAUSE
// filters: { search, store_id, checklist_type_id, question_id,
//            from, to }
// scope:   { all, storeIds }
// ------------------------------------------------------
const buildWhere = (filters = {}, scope = { all: true, storeIds: [] }) => {
    const where = ["LOWER(TRIM(csa.answer)) IN (?)"];
    const params = [SQL_NA_VALUES];

    if (!scope.all) {
        const ids = (scope.storeIds || []).map(Number).filter((n) => n > 0);
        if (!ids.length) {
            where.push("1 = 0");
        } else {
            where.push("cs.store_id IN (?)");
            params.push(ids);
        }
    }

    const storeId = toPositiveInt(filters.store_id);
    if (storeId) {
        where.push("cs.store_id = ?");
        params.push(storeId);
    }

    const typeId = toPositiveInt(filters.checklist_type_id);
    if (typeId) {
        where.push("cs.checklist_type_id = ?");
        params.push(typeId);
    }

    const questionId = toPositiveInt(filters.question_id);
    if (questionId) {
        where.push("csa.question_id = ?");
        params.push(questionId);
    }

    if (isDate(filters.from)) {
        where.push("cs.submission_date >= ?");
        params.push(`${filters.from} 00:00:00`);
    }

    if (isDate(filters.to)) {
        where.push("cs.submission_date <= ?");
        params.push(`${filters.to} 23:59:59`);
    }

    const search = String(filters.search || "").trim().slice(0, 100);
    if (search) {
        const like = `%${search}%`;
        where.push(`(
            q.question LIKE ?
            OR s.store_name LIKE ?
            OR s.city LIKE ?
            OR ct.checklist_name LIKE ?
            OR u.name LIKE ?
            OR u.employee_id LIKE ?
            OR csa.remarks LIKE ?
        )`);
        params.push(like, like, like, like, like, like, like);
    }

    return { sql: where.join("\n AND "), params };
};

const FROM_SQL = `
    FROM checklist_submission_answers csa
    INNER JOIN checklist_submissions cs ON cs.id = csa.submission_id
    LEFT JOIN questions q ON q.id = csa.question_id
    LEFT JOIN checklist_types ct ON ct.id = cs.checklist_type_id
    LEFT JOIN stores s ON s.id = cs.store_id
    LEFT JOIN users u ON u.id = cs.submitted_by
`;

const selectSql = (withPhotos) => `
    SELECT
        csa.id AS answer_id,
        csa.submission_id,
        csa.question_id,
        csa.answer,
        csa.remarks,
        ${withPhotos ? "csa.photos," : "NULL AS photos,"}
        DATE_FORMAT(cs.submission_date, '%Y-%m-%d %H:%i:%s') AS submission_date,
        DATE_FORMAT(cs.created_at, '%Y-%m-%d %H:%i:%s') AS submitted_at,
        cs.store_id,
        cs.checklist_type_id,
        s.store_name,
        s.city,
        s.state,
        ct.checklist_name,
        q.question,
        q.answer_type,
        (
            SELECT GROUP_CONCAT(DISTINCT d.department_name ORDER BY d.department_name SEPARATOR ', ')
            FROM question_departments qd
            INNER JOIN departments d ON d.id = qd.department_id
            WHERE qd.question_id = csa.question_id
        ) AS department_name,
        u.name AS employee_name,
        u.employee_id
    ${FROM_SQL}
`;

const parsePhotos = (value) => {
    if (!value) return [];
    try {
        const list = JSON.parse(value);
        return Array.isArray(list) ? list.filter(Boolean) : [];
    } catch {
        return [];
    }
};

const mapRow = (row) => ({ ...row, photos: parsePhotos(row.photos) });

// Department lookup is optional (older databases may not have the
// question_departments table) — retry without it.
const runSelect = async (sql, params) => {
    try {
        return await db.query(sql, params);
    } catch (error) {
        if (error?.code === "ER_NO_SUCH_TABLE" && /question_departments|departments/.test(error.message)) {
            const fallback = sql.replace(
                /\(\s*SELECT GROUP_CONCAT\(DISTINCT d\.department_name[\s\S]*?\) AS department_name,/,
                "NULL AS department_name,"
            );
            return db.query(fallback, params);
        }
        throw error;
    }
};

// ------------------------------------------------------
// LIST (paginated) + SUMMARY
// ------------------------------------------------------
const list = async (filters = {}, scope) => {
    const page = Math.max(1, toPositiveInt(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, toPositiveInt(filters.limit) || 25));
    const offset = (page - 1) * limit;

    const withPhotos = await hasPhotosColumn();
    const { sql: whereSql, params } = buildWhere(filters, scope);

    const rows = await runSelect(
        `${selectSql(withPhotos)}
         WHERE ${whereSql}
         ORDER BY cs.submission_date DESC, csa.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [summary] = await db.query(
        `SELECT
            COUNT(*) AS total,
            COUNT(DISTINCT cs.store_id) AS stores,
            COUNT(DISTINCT csa.question_id) AS questions,
            COUNT(DISTINCT cs.id) AS submissions
         ${FROM_SQL}
         WHERE ${whereSql}`,
        params
    );

    const topQuestions = await db.query(
        `SELECT csa.question_id, q.question, COUNT(*) AS total,
                COUNT(DISTINCT cs.store_id) AS stores
         ${FROM_SQL}
         WHERE ${whereSql}
         GROUP BY csa.question_id, q.question
         ORDER BY total DESC
         LIMIT 5`,
        params
    );

    const total = Number(summary?.total || 0);

    return {
        data: (rows || []).map(mapRow),
        summary: {
            total,
            stores: Number(summary?.stores || 0),
            questions: Number(summary?.questions || 0),
            submissions: Number(summary?.submissions || 0),
            top_questions: (topQuestions || []).map((row) => ({
                question_id: row.question_id,
                question: row.question,
                total: Number(row.total || 0),
                stores: Number(row.stores || 0)
            }))
        },
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    };
};

// ------------------------------------------------------
// EXPORT (all matching rows, capped)
// ------------------------------------------------------
const exportRows = async (filters = {}, scope) => {
    const withPhotos = await hasPhotosColumn();
    const { sql: whereSql, params } = buildWhere(filters, scope);
    const rows = await runSelect(
        `${selectSql(withPhotos)}
         WHERE ${whereSql}
         ORDER BY cs.submission_date DESC, csa.id DESC
         LIMIT ${MAX_EXPORT_ROWS}`,
        params
    );
    return (rows || []).map(mapRow);
};

// ------------------------------------------------------
// FILTER OPTIONS (stores + checklist types the user can see)
// ------------------------------------------------------
const filterOptions = async (scope) => {
    const storeWhere = [];
    const storeParams = [];
    if (!scope.all) {
        const ids = (scope.storeIds || []).map(Number).filter((n) => n > 0);
        if (!ids.length) return { stores: [], checklist_types: [] };
        storeWhere.push("id IN (?)");
        storeParams.push(ids);
    }

    const stores = await db.query(
        `SELECT id, store_name, city FROM stores
         ${storeWhere.length ? `WHERE ${storeWhere.join(" AND ")}` : ""}
         ORDER BY store_name`,
        storeParams
    );

    const types = await db.query(
        "SELECT id, checklist_name FROM checklist_types ORDER BY checklist_name"
    );

    return { stores: stores || [], checklist_types: types || [] };
};

module.exports = {
    list,
    exportRows,
    filterOptions,
    buildWhere,
    MAX_EXPORT_ROWS
};

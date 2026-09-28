// ======================================================
// EMPLOYEE LOCATION REPORTS
// Store-wise day / week / month / year reports built from
// location_records. Every row keeps the exact captured
// timestamp (to the second) plus latitude / longitude.
// ======================================================

const db = require("../config/db");
const Location = require("../models/locationModel");

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseDate = (value) => {
    const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
};

// Returns { from, to } as "YYYY-MM-DD 00:00:00" strings (to is exclusive).
const resolveRange = ({ period = "day", date, from, to } = {}) => {
    const anchor = parseDate(date) || new Date();
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    let end;

    switch (String(period).toLowerCase()) {
        case "all":
            return null;
        case "week": {
            const day = (start.getDay() + 6) % 7; // Monday = 0
            start.setDate(start.getDate() - day);
            end = new Date(start);
            end.setDate(end.getDate() + 7);
            break;
        }
        case "month":
            start.setDate(1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
            break;
        case "year":
            start.setMonth(0, 1);
            end = new Date(start.getFullYear() + 1, 0, 1);
            break;
        case "custom": {
            const f = parseDate(from) || start;
            const t = parseDate(to) || f;
            const e = new Date(t);
            e.setDate(e.getDate() + 1);
            return { from: `${ymd(f)} 00:00:00`, to: `${ymd(e)} 00:00:00`, label: `${ymd(f)} → ${ymd(t)}` };
        }
        case "day":
        default:
            end = new Date(start);
            end.setDate(end.getDate() + 1);
            break;
    }

    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    return {
        from: `${ymd(start)} 00:00:00`,
        to: `${ymd(end)} 00:00:00`,
        label: ymd(start) === ymd(last) ? ymd(start) : `${ymd(start)} → ${ymd(last)}`,
    };
};

// Builds the shared WHERE clause for list / summary / delete.
const buildWhere = (query = {}, alias = "r") => {
    const where = [];
    const params = [];
    const range = resolveRange(query);

    if (range) {
        where.push(`${alias}.captured_at >= ? AND ${alias}.captured_at < ?`);
        params.push(range.from, range.to);
    }

    const storeId = Number(query.storeId || query.store_id || 0);
    if (storeId > 0) {
        where.push(`EXISTS (SELECT 1 FROM user_stores us WHERE us.user_id = ${alias}.employee_id AND us.store_id = ?)`);
        params.push(storeId);
    }

    const employeeId = Number(query.employeeId || query.employee_id || 0);
    if (employeeId > 0) {
        where.push(`${alias}.employee_id = ?`);
        params.push(employeeId);
    }

    const source = String(query.source || "").trim();
    if (source) {
        where.push(`${alias}.source = ?`);
        params.push(source);
    }

    const search = String(query.search || "").trim();
    if (search) {
        where.push(`EXISTS (
            SELECT 1 FROM users su
            WHERE su.id = ${alias}.employee_id
              AND (su.name LIKE ? OR su.employee_id LIKE ? OR su.email LIKE ?)
        )`);
        const like = `%${search}%`;
        params.push(like, like, like);
    }

    // One point per employee per minute / hour when requested.
    const granularity = String(query.granularity || "second").toLowerCase();
    const fmt = granularity === "minute" ? "%Y-%m-%d %H:%i" : granularity === "hour" ? "%Y-%m-%d %H" : null;
    if (fmt) {
        const inner = [];
        const innerParams = [];
        if (range) {
            inner.push("captured_at >= ? AND captured_at < ?");
            innerParams.push(range.from, range.to);
        }
        where.push(`${alias}.id IN (
            SELECT id FROM (
                SELECT MAX(id) AS id FROM location_records
                ${inner.length ? `WHERE ${inner.join(" AND ")}` : ""}
                GROUP BY employee_id, DATE_FORMAT(captured_at, '${fmt}')
            ) g
        )`);
        params.push(...innerParams);
    }

    return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params, range };
};

const STORE_NAMES_SQL = `(
    SELECT GROUP_CONCAT(DISTINCT s.store_name ORDER BY s.store_name SEPARATOR ', ')
    FROM user_stores us
    INNER JOIN stores s ON s.id = us.store_id
    WHERE us.user_id = r.employee_id
)`;

// GET /api/location/reports/options
const getOptions = async (req, res) => {
    try {
        const stores = await db.query(
            `SELECT id, store_name, store_code, city, state FROM stores ORDER BY store_name ASC`
        );
        const employees = await db.query(
            `SELECT DISTINCT u.id, u.name, u.employee_id AS employee_code
             FROM users u
             INNER JOIN location_records r ON r.employee_id = u.id
             ORDER BY u.name ASC`
        );
        const sources = await db.query(`SELECT DISTINCT source FROM location_records ORDER BY source`);
        res.json({ success: true, data: { stores, employees, sources: sources.map((s) => s.source) } });
    } catch (error) {
        console.error("Location report options error:", error);
        res.status(500).json({ success: false, message: "Unable to load report filters." });
    }
};

// GET /api/location/reports
const getReports = async (req, res) => {
    try {
        const exportAll = String(req.query.all || "") === "1";
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = exportAll ? 20000 : Math.min(200, Math.max(5, Number(req.query.limit) || 25));
        const offset = exportAll ? 0 : (page - 1) * limit;

        const { sql, params, range } = buildWhere(req.query);

        const rows = await db.query(
            `SELECT r.id, r.employee_id, r.latitude, r.longitude, r.accuracy, r.source,
                    DATE_FORMAT(r.captured_at, '%Y-%m-%d %H:%i:%s') AS captured_at,
                    u.name, u.employee_id AS employee_code, u.email,
                    d.department_name AS department,
                    dg.designation_name AS designation,
                    ${STORE_NAMES_SQL} AS store_names
             FROM location_records r
             INNER JOIN users u ON u.id = r.employee_id
             LEFT JOIN departments d ON d.id = u.department_id
             LEFT JOIN designations dg ON dg.id = u.designation_id
             ${sql}
             ORDER BY r.captured_at DESC, r.id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const totals = await db.query(
            `SELECT COUNT(*) AS points,
                    COUNT(DISTINCT r.employee_id) AS employees,
                    DATE_FORMAT(MIN(r.captured_at), '%Y-%m-%d %H:%i:%s') AS first_seen,
                    DATE_FORMAT(MAX(r.captured_at), '%Y-%m-%d %H:%i:%s') AS last_seen,
                    ROUND(AVG(r.accuracy), 1) AS avg_accuracy
             FROM location_records r
             ${sql}`,
            params
        );

        const storeSummary = await db.query(
            `SELECT s.id AS store_id, s.store_name, s.city, s.state,
                    COUNT(DISTINCT r.employee_id) AS employees,
                    COUNT(r.id) AS points,
                    DATE_FORMAT(MIN(r.captured_at), '%Y-%m-%d %H:%i:%s') AS first_seen,
                    DATE_FORMAT(MAX(r.captured_at), '%Y-%m-%d %H:%i:%s') AS last_seen
             FROM location_records r
             INNER JOIN user_stores us ON us.user_id = r.employee_id
             INNER JOIN stores s ON s.id = us.store_id
             ${sql}
             GROUP BY s.id, s.store_name, s.city, s.state
             ORDER BY points DESC
             LIMIT 100`,
            params
        );

        const total = Number(totals[0]?.points || 0);

        await Location.logAccess({
            accessedBy: req.user.id,
            action: exportAll ? "EXPORT_LOCATION_REPORT" : "VIEW_LOCATION_REPORT",
            metadata: { period: req.query.period || "day", range, total },
        }).catch(() => {});

        res.json({
            success: true,
            data: rows,
            summary: { ...(totals[0] || {}), stores: storeSummary.length, range },
            storeSummary,
            pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
        });
    } catch (error) {
        console.error("Location report error:", error);
        res.status(500).json({ success: false, message: "Unable to load location report." });
    }
};

// PUT /api/location/reports/:id
const updateRecord = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);

        if (!id) return res.status(400).json({ success: false, message: "Invalid record." });
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            return res.status(400).json({ success: false, message: "Enter a valid latitude and longitude." });
        }

        const accuracyRaw = req.body?.accuracy;
        const accuracy = accuracyRaw === "" || accuracyRaw === null || accuracyRaw === undefined
            ? null
            : Number(accuracyRaw);
        const capturedAt = String(req.body?.captured_at || "").replace("T", " ").trim();
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(capturedAt)) {
            return res.status(400).json({ success: false, message: "Enter a valid date and time." });
        }
        const source = String(req.body?.source || "website").trim().slice(0, 50) || "website";

        const result = await db.query(
            `UPDATE location_records
             SET latitude = ?, longitude = ?, accuracy = ?, captured_at = ?, source = ?
             WHERE id = ?`,
            [latitude, longitude, Number.isFinite(accuracy) ? accuracy : null,
             capturedAt.length === 16 ? `${capturedAt}:00` : capturedAt, source, id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: "Location record not found." });
        }

        await Location.logAccess({
            accessedBy: req.user.id,
            action: "EDIT_LOCATION_RECORD",
            metadata: { id, latitude, longitude },
        }).catch(() => {});

        res.json({ success: true, message: "Location record updated." });
    } catch (error) {
        console.error("Location record update error:", error);
        res.status(500).json({ success: false, message: "Unable to update location record." });
    }
};

// DELETE /api/location/reports/:id
const deleteRecord = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await db.query(`DELETE FROM location_records WHERE id = ?`, [id]);
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: "Location record not found." });
        }
        await Location.logAccess({
            accessedBy: req.user.id,
            action: "DELETE_LOCATION_RECORD",
            metadata: { id },
        }).catch(() => {});
        res.json({ success: true, message: "Location record deleted." });
    } catch (error) {
        console.error("Location record delete error:", error);
        res.status(500).json({ success: false, message: "Unable to delete location record." });
    }
};

// POST /api/location/reports/delete-all
//   { scope: "all" }                → every location record
//   { scope: "filtered", filters }  → only rows matching the filters
//   { ids: [..] }                   → the given rows
const deleteAll = async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids)
            ? [...new Set(req.body.ids.map(Number).filter((n) => n > 0))]
            : [];

        let result;
        if (ids.length) {
            result = await db.query(`DELETE FROM location_records WHERE id IN (?)`, [ids]);
        } else if (req.body?.scope === "all") {
            result = await db.query(`DELETE FROM location_records`);
        } else {
            const { sql, params } = buildWhere(req.body?.filters || {});
            if (!sql) {
                return res.status(400).json({ success: false, message: "No filter supplied." });
            }
            // MySQL cannot select from the table being deleted in a subquery,
            // so resolve the ids first.
            const matches = await db.query(`SELECT r.id FROM location_records r ${sql}`, params);
            const matchIds = matches.map((m) => Number(m.id));
            result = { affectedRows: 0 };
            for (let i = 0; i < matchIds.length; i += 1000) {
                const chunk = matchIds.slice(i, i + 1000);
                const r = await db.query(`DELETE FROM location_records WHERE id IN (?)`, [chunk]);
                result.affectedRows += Number(r.affectedRows || 0);
            }
        }

        await Location.logAccess({
            accessedBy: req.user.id,
            action: "DELETE_LOCATION_RECORDS",
            metadata: { scope: ids.length ? "ids" : req.body?.scope || "filtered", deleted: result.affectedRows },
        }).catch(() => {});

        res.json({
            success: true,
            deleted: Number(result.affectedRows || 0),
            message: `${Number(result.affectedRows || 0)} location record(s) deleted.`,
        });
    } catch (error) {
        console.error("Location delete-all error:", error);
        res.status(500).json({ success: false, message: "Unable to delete location records." });
    }
};

module.exports = { getOptions, getReports, updateRecord, deleteRecord, deleteAll, resolveRange };

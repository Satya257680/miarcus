// ======================================================
// COMPLETED ACTION POINTS — HTTP HANDLERS
// Base: /api/action-points/completed   (routes/actionpointRoutes.js)
//
// Permissions follow the Action Points module:
//   View  -> list, view, export
//   Edit  -> edit
//   Full  -> delete, delete all
// Filter Access scope (store / department / designation / checklist
// type) narrows every list, export and delete exactly like Action Points.
// ======================================================

const { Parser } = require("json2csv");
const filterAccess = require("../utils/filterAccess");
const service = require("../services/completedActionPointService");

const scopeFilters = (req) => {
    const { sql, params } = filterAccess.buildScopeSql(req.filterScope);
    return { scope_sql: sql || null, scope_params: params };
};

const FILTER_KEYS = [
    "search",
    "store_id",
    "department_id",
    "checklist_type_id",
    "checklist_kind",
    "designation_id",
    "priority",
    "start_date",
    "end_date"
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ["Opening", "Closing", "Other", "Manual"];

// Reads only known filters and drops malformed values (never passed to SQL
// unparameterised; this just keeps junk out of the WHERE clause).
const readFilters = (source = {}) => {
    const filters = {};
    for (const key of FILTER_KEYS) {
        const raw = source[key];
        if (raw === undefined || raw === null || String(raw).trim() === "") continue;
        const value = String(raw).trim();

        if (key.endsWith("_id")) {
            const id = Number(value);
            if (Number.isInteger(id) && id > 0) filters[key] = id;
        } else if (key.endsWith("_date")) {
            if (DATE_RE.test(value)) filters[key] = value;
        } else if (key === "priority") {
            if (service.PRIORITIES.includes(value)) filters[key] = value;
        } else if (key === "checklist_kind") {
            if (KINDS.includes(value)) filters[key] = value;
        } else if (key === "search") {
            filters[key] = value.slice(0, 200);
        }
    }
    return filters;
};

const sendError = (res, error, fallback) => {
    if (!error.statusCode) console.error(`${fallback.toUpperCase()}:`, error);
    return res.status(error.statusCode || 500).json({
        success: false,
        code: error.code || undefined,
        message: error.statusCode ? error.message : fallback
    });
};

// GET /api/action-points/completed
exports.getCompletedActionPoints = async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100000);
        const result = await service.list({
            ...readFilters(req.query),
            ...scopeFilters(req),
            offset: (page - 1) * limit,
            limit
        });
        return res.status(200).json({ success: true, data: result.rows, pagination: result.pagination });
    } catch (error) {
        return sendError(res, error, "Unable to fetch completed Action Points.");
    }
};

// GET /api/action-points/completed/export
exports.exportCompletedActionPoints = async (req, res) => {
    try {
        const rows = await service.exportRows({ ...readFilters(req.query), ...scopeFilters(req) });
        const csv = new Parser({ fields: service.EXPORT_FIELDS }).parse(rows);

        require("../models/auditModel").create({
            module_name: "Action Points",
            reference_id: null,
            action: "COMPLETED_EXPORT",
            old_data: null,
            new_data: { total: rows.length },
            changed_by: req.user.id
        }, () => {});

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=CompletedActionPoints.csv");
        return res.status(200).send(csv);
    } catch (error) {
        return sendError(res, error, "Unable to export completed Action Points.");
    }
};

// GET /api/action-points/completed/:id
exports.getCompletedActionPoint = async (req, res) => {
    try {
        const data = await service.getById(req.params.id);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return sendError(res, error, "Unable to load completed Action Point.");
    }
};

// PUT /api/action-points/completed/:id
exports.updateCompletedActionPoint = async (req, res) => {
    try {
        const data = await service.update(req.params.id, req.body || {}, req.user.id);
        return res.status(200).json({ success: true, message: "Completed Action Point updated successfully.", data });
    } catch (error) {
        return sendError(res, error, "Unable to update completed Action Point.");
    }
};

// DELETE /api/action-points/completed/:id
exports.deleteCompletedActionPoint = async (req, res) => {
    try {
        const result = await service.remove(req.params.id, req.user.id);
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error, "Unable to delete completed Action Point.");
    }
};

// DELETE /api/action-points/completed
// body: { confirm: "DELETE", expected_count: <number shown in the dialog>,
//         filters: { ...same filters as the list } }
exports.deleteAllCompletedActionPoints = async (req, res) => {
    try {
        const body = req.body || {};
        if (String(body.confirm || "") !== "DELETE") {
            return res.status(400).json({
                success: false,
                code: "CONFIRM_REQUIRED",
                message: "Delete All must be confirmed."
            });
        }

        const filters = readFilters(body.filters || {});
        const result = await service.removeAll(
            {
                ...filters,
                ...scopeFilters(req),
                __filtered: Object.keys(filters).length > 0 || Boolean(req.filterScope?.restricted)
            },
            body.expected_count,
            req.user.id
        );
        return res.status(200).json(result);
    } catch (error) {
        return sendError(res, error, "Unable to delete completed Action Points.");
    }
};

module.exports = {
    readFilters,
    getCompletedActionPoints: exports.getCompletedActionPoints,
    exportCompletedActionPoints: exports.exportCompletedActionPoints,
    getCompletedActionPoint: exports.getCompletedActionPoint,
    updateCompletedActionPoint: exports.updateCompletedActionPoint,
    deleteCompletedActionPoint: exports.deleteCompletedActionPoint,
    deleteAllCompletedActionPoints: exports.deleteAllCompletedActionPoints
};

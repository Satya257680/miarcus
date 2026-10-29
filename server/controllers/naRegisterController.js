// ======================================================
// N/A REGISTER
// /api/na-register
// ------------------------------------------------------
// Lists checklist answers submitted as "N/A" (item not present at the
// store). Access: see utils/naRegisterAccess.js.
// ======================================================

const naRegisterService = require("../services/naRegisterService");
const {
    getStoreScopeFor,
    isAdministrator
} = require("../utils/naRegisterAccess");

const scopeOf = (req) => getStoreScopeFor(req.user?.id, isAdministrator(req.user));

const pickFilters = (query = {}) => ({
    search: query.search,
    store_id: query.store_id,
    checklist_type_id: query.checklist_type_id,
    question_id: query.question_id,
    department_id: query.department_id,
    designation_id: query.designation_id,
    new_store_opening_id: query.new_store_opening_id,
    from: query.from,
    to: query.to,
    page: query.page,
    limit: query.limit
});

// GET /api/na-register
exports.list = async (req, res) => {
    try {
        const scope = await scopeOf(req);
        const result = await naRegisterService.list(pickFilters(req.query), scope);
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            level: req.naRegisterLevel || "View",
            all_stores: scope.all,
            ...result
        });
    } catch (error) {
        console.error("N/A REGISTER LIST ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load the N/A Register." });
    }
};

// GET /api/na-register/export
exports.exportAll = async (req, res) => {
    try {
        const scope = await scopeOf(req);
        const rows = await naRegisterService.exportRows(pickFilters(req.query), scope);
        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            data: rows,
            truncated: rows.length >= naRegisterService.MAX_EXPORT_ROWS
        });
    } catch (error) {
        console.error("N/A REGISTER EXPORT ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to export the N/A Register." });
    }
};

// GET /api/na-register/filters
exports.filters = async (req, res) => {
    try {
        const scope = await scopeOf(req);
        const options = await naRegisterService.filterOptions(scope);
        return res.json({ success: true, ...options });
    } catch (error) {
        console.error("N/A REGISTER FILTERS ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load filters." });
    }
};

// GET /api/na-register/:id
exports.getOne = async (req, res) => {
    try {
        const scope = await scopeOf(req);
        const row = await naRegisterService.getById(req.params.id, scope);
        if (!row) {
            return res.status(404).json({ success: false, message: "N/A record not found." });
        }
        res.set("Cache-Control", "no-store");
        return res.json({ success: true, data: row });
    } catch (error) {
        console.error("N/A REGISTER VIEW ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load the N/A record." });
    }
};

// PUT /api/na-register/:id   body: { answer?, remarks? }
exports.update = async (req, res) => {
    try {
        const scope = await scopeOf(req);
        const row = await naRegisterService.update(
            req.params.id,
            { answer: req.body?.answer, remarks: req.body?.remarks },
            scope
        );
        if (!row) {
            return res.status(404).json({ success: false, message: "N/A record not found." });
        }
        return res.json({ success: true, message: "N/A record updated successfully.", data: row });
    } catch (error) {
        if (error?.status === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("N/A REGISTER UPDATE ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to update the N/A record." });
    }
};

// DELETE /api/na-register/:id
exports.remove = async (req, res) => {
    try {
        const scope = await scopeOf(req);
        const deleted = await naRegisterService.remove(req.params.id, scope);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "N/A record not found." });
        }
        return res.json({ success: true, message: "N/A record deleted successfully.", deleted });
    } catch (error) {
        console.error("N/A REGISTER DELETE ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to delete the N/A record." });
    }
};

// DELETE /api/na-register
//   body: {}                                 → every N/A answer the user can see
//   body: { scope: "filtered", ids: [..] }   → only those rows
//   body: { scope: "filtered", filters: {} } → rows matching the filters
exports.removeAll = async (req, res) => {
    try {
        const scope = await scopeOf(req);
        const body = req.body || {};
        const filtered = body.scope === "filtered";

        if (filtered && !Array.isArray(body.ids) && !body.filters) {
            return res.status(400).json({ success: false, message: "No filtered records were sent." });
        }

        const deleted = await naRegisterService.removeMany(
            filtered
                ? { ids: Array.isArray(body.ids) ? body.ids : undefined, filters: pickFilters(body.filters || {}) }
                : {},
            scope
        );

        return res.json({
            success: true,
            deleted,
            message: filtered
                ? `${deleted} filtered N/A record(s) deleted successfully.`
                : `${deleted} N/A record(s) deleted successfully.`
        });
    } catch (error) {
        console.error("N/A REGISTER DELETE ALL ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to delete N/A records." });
    }
};

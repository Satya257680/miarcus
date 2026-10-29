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

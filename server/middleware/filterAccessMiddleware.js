// ======================================================
// FILTER ACCESS MIDDLEWARE
// ======================================================
// Always mounted AFTER authMiddleware + permissionMiddleware, so RBAC
// decides first whether the module may be used at all. These only
// narrow what an already-permitted user can see or touch.
// ======================================================

const filterAccess = require("../utils/filterAccess");

// Loads the signed-in user's scope for `moduleName` into req.filterScope.
const attachFilterScope = (moduleName) => async (req, res, next) => {
    try {
        req.filterScope = await filterAccess.resolveScope(req, moduleName);
        return next();
    } catch (error) {
        console.error(`Filter access lookup failed (${moduleName}):`, error);
        return res.status(500).json({ success: false, message: "Unable to verify filter access." });
    }
};

// Rejects filter values (query string and body) outside the user's scope,
// e.g. a store_id typed into the URL by hand.
const validateFilterValues = (req, res, next) => {
    const violations = filterAccess.findViolations(req.filterScope, req.query, req.body);
    if (violations.length) {
        const labels = [...new Set(violations.map((v) => filterAccess.FILTER_LABELS[v.key]))];
        return res.status(403).json({
            success: false,
            code: "FILTER_ACCESS_DENIED",
            message: `You do not have access to the selected ${labels.join(", ")}.`,
        });
    }
    return next();
};

// Single Action Point routes (/:id ...): 404 when the record is outside the
// user's scope, so the response does not reveal that it exists.
const requireActionPointInScope = (param = "id") => async (req, res, next) => {
    try {
        const scope = req.filterScope;
        if (!scope || !scope.restricted) return next();
        const ok = await filterAccess.isActionPointInScope(scope, req.params[param]);
        if (!ok) {
            return res.status(404).json({ success: false, message: "Action Point not found." });
        }
        return next();
    } catch (error) {
        console.error("Filter access record check failed:", error);
        return res.status(500).json({ success: false, message: "Unable to verify filter access." });
    }
};

// Module-wide maintenance operations (e.g. re-check every answer) are
// only for users whose filter access is not narrowed.
const requireUnrestrictedScope = (req, res, next) => {
    if (req.filterScope?.restricted) {
        return res.status(403).json({
            success: false,
            code: "FILTER_ACCESS_DENIED",
            message: "This action affects records outside your filter access.",
        });
    }
    return next();
};

module.exports = {
    attachFilterScope,
    validateFilterValues,
    requireActionPointInScope,
    requireUnrestrictedScope,
};

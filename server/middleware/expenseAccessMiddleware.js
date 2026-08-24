const db = require("../config/db");

const LEVEL = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };

function isAdministrator(user) {
    return Number(user?.is_admin) === 1;
}

async function getExpensePermission(userId) {
    const rows = await db.query(
        `SELECT permission FROM user_permissions WHERE user_id = ? AND LOWER(module_name) = LOWER('Expenses') LIMIT 1`,
        [userId]
    );
    return rows?.[0]?.permission || "None";
}

function hasManagementAccess(permission) {
    return permission === "Edit" || permission === "Full";
}

async function scopeExpenseList(req, res, next) {
    try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });

        if (isAdministrator(req.user)) return next();

        const permission = await getExpensePermission(req.user.id);
        if (!hasManagementAccess(permission)) req.query.userId = String(req.user.id);
        return next();
    } catch (error) {
        console.error("Expense ownership scope error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify expense access." });
    }
}

async function scopeExpenseRecord(req, res, next) {
    try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (isAdministrator(req.user)) return next();

        const permission = await getExpensePermission(req.user.id);
        if (hasManagementAccess(permission)) return next();

        const rows = await db.query(
            `SELECT id FROM expenses WHERE id = ? AND submitted_by = ? LIMIT 1`,
            [Number(req.params.id), req.user.id]
        );

        if (!rows?.length) return res.status(404).json({ success: false, message: "Expense not found." });
        return next();
    } catch (error) {
        console.error("Expense record access error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify expense access." });
    }
}

function requireExpensePermission(required = "View") {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
            if (isAdministrator(req.user)) return next();

            const permission = await getExpensePermission(req.user.id);
            if ((LEVEL[permission] || 0) >= (LEVEL[required] || 0)) return next();

            return res.status(403).json({ success: false, message: "Insufficient Expenses permission." });
        } catch (error) {
            console.error("Expense permission check failed:", error);
            return res.status(500).json({ success: false, message: "Permission check failed." });
        }
    };
}

module.exports = {
    scopeExpenseList,
    scopeExpenseRecord,
    requireExpensePermission,
    isAdministrator,
    getExpensePermission,
};

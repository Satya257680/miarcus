const db = require("../config/db");

function isAdministrator(user) {
    return (
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        user?.is_admin === "1" ||
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.administrator === "1"
    );
}

async function getExpensePermission(userId) {
    const rows = await db.query(
        `SELECT permission FROM user_permissions WHERE user_id = ? AND module_name = 'Expenses' LIMIT 1`,
        [userId]
    );
    return rows?.[0]?.permission || "None";
}

function hasManagementAccess(permission) {
    return permission === "Edit" || permission === "Full";
}

/**
 * Expense data visibility:
 * - Administrator: all expenses
 * - Expenses Edit/Full: all expenses
 * - Expenses View/Add: only expenses submitted by the logged-in user
 */
async function scopeExpenseList(req, res, next) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (isAdministrator(req.user)) return next();

        const permission = await getExpensePermission(req.user.id);
        if (!hasManagementAccess(permission)) {
            req.query.userId = String(req.user.id);
        }

        return next();
    } catch (error) {
        console.error("Expense ownership scope error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify expense access." });
    }
}

/**
 * Single expense visibility. A normal user can open only their own expense.
 */
async function scopeExpenseRecord(req, res, next) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (isAdministrator(req.user)) return next();

        const permission = await getExpensePermission(req.user.id);
        if (hasManagementAccess(permission)) return next();

        const rows = await db.query(
            `SELECT id FROM expenses WHERE id = ? AND submitted_by = ? LIMIT 1`,
            [Number(req.params.id), req.user.id]
        );

        if (!rows?.length) {
            return res.status(404).json({ success: false, message: "Expense not found." });
        }

        return next();
    } catch (error) {
        console.error("Expense record access error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify expense access." });
    }
}

module.exports = {
    scopeExpenseList,
    scopeExpenseRecord,
    isAdministrator,
    getExpensePermission
};

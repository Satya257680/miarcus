const db = require("../config/db");

const LEVEL = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };

function isAdmin(user) {
    return user?.is_admin === true || user?.is_admin === 1 || user?.is_admin === "1" ||
        user?.administrator === true || user?.administrator === 1 || user?.administrator === "1";
}

module.exports = function pettyCashPermission(required = "View") {
    return async (req, res, next) => {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (isAdmin(req.user)) return next();

        try {
            const rows = await db.query(`
                SELECT module_name, permission
                FROM user_permissions
                WHERE user_id = ?
                  AND module_name IN ('Petty Cash', 'Expenses')
            `, [req.user.id]);

            const map = {};
            rows.forEach((r) => { map[r.module_name] = r.permission; });

            // Prefer the new Petty Cash permission. Expenses is only a temporary
            // fallback so existing users do not suddenly lose access after deploy.
            const current = map["Petty Cash"] || map["Expenses"] || "None";
            if ((LEVEL[current] || 0) < (LEVEL[required] || 0)) {
                return res.status(403).json({ success: false, message: "You do not have permission to access Petty Cash." });
            }

            next();
        } catch (error) {
            console.error("Petty Cash permission check failed:", error);
            res.status(500).json({ success: false, message: "Permission check failed." });
        }
    };
};

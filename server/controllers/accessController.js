const db = require("../config/db");
const PagePermission = require("../models/pagePermissionModel");

// ==========================================================
// GET /api/users/me/access
// ==========================================================
//
// Returns the signed-in user's CURRENT access straight from the
// database, so the frontend can refresh the sidebar and page
// guards without a logout after an admin changes permissions.
//
// {
//   success: true,
//   administrator: false,
//   permissions: { "Quiz": "Add", "Expenses": "View", ... },
//   pageAccess:  { "quiz.setup": false, ... }
// }
// ==========================================================

const getMyAccess = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const administrator = Number(req.user?.is_admin) === 1 || req.user?.is_admin === true;

        const rows = await db.query(
            "SELECT module_name, permission FROM user_permissions WHERE user_id = ?",
            [userId]
        );

        const permissions = {};

        (rows || []).forEach((row) => {
            permissions[row.module_name] = administrator ? "Full" : row.permission;
        });

        let pageAccess = {};

        if (!administrator) {
            try {
                pageAccess = await PagePermission.getForUser(userId);
            } catch (pageError) {
                console.error("Page access lookup failed:", pageError.message);
            }
        }

        res.set("Cache-Control", "no-store");

        return res.json({
            success: true,
            administrator,
            permissions,
            pageAccess,
        });
    } catch (error) {
        console.error("Load my access failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load access",
        });
    }
};

module.exports = { getMyAccess };

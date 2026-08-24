const db = require("../config/db");

// Never trust administrator state supplied by the client.
// authMiddleware already loads current DB state into req.user.
const adminOnly = (req, res, next) => {
    if (!req.user?.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    db.query(
        "SELECT is_admin FROM users WHERE id = ? AND status = 'Active' AND is_activated = 1 LIMIT 1",
        [req.user.id],
        (err, rows) => {
            if (err) {
                console.error("Admin authorization check failed:", err.message);
                return res.status(500).json({ success: false, message: "Authorization check failed" });
            }

            if (!rows?.[0] || Number(rows[0].is_admin) !== 1) {
                return res.status(403).json({ success: false, message: "Administrator access required" });
            }

            next();
        }
    );
};

module.exports = adminOnly;

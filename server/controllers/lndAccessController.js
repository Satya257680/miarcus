const db = require("../config/db");
const lnd = require("../utils/lndAccess");

let auditReady = null;
const ensureAudit = () => {
    if (!auditReady) {
        auditReady = db
            .query(`
                CREATE TABLE IF NOT EXISTS lnd_access_audit (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    changed_by INT NOT NULL,
                    target_user_id INT NOT NULL,
                    old_level VARCHAR(10) NOT NULL,
                    new_level VARCHAR(10) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    KEY idx_lnd_audit_target (target_user_id)
                )
            `)
            .catch((error) => {
                auditReady = null;
                throw error;
            });
    }
    return auditReady;
};

// GET /api/lnd-access/users  → every active user + current L&D level
const listUsers = async (req, res) => {
    try {
        const rows = await db.query(
            `
            SELECT u.id, u.name, u.email, u.employee_id, u.is_admin,
                   dg.designation_name AS designation,
                   p.permission AS lnd_level
            FROM users u
            LEFT JOIN designations dg ON dg.id = u.designation_id
            LEFT JOIN user_permissions p
                   ON p.user_id = u.id AND p.module_name = ?
            WHERE u.status = 'Active'
            ORDER BY u.name ASC
            `,
            [lnd.MODULE_NAME]
        );

        const users = (rows || []).map((row) => {
            const owner = lnd.isOwnerRow(row);
            return {
                id: row.id,
                name: row.name,
                email: row.email,
                employeeId: row.employee_id || "",
                designation: row.designation || "",
                administrator: Number(row.is_admin) === 1,
                isOwner: owner,
                level: owner ? "Full" : lnd.RANK[row.lnd_level] !== undefined ? row.lnd_level : "None",
            };
        });

        res.set("Cache-Control", "no-store");
        return res.json({ success: true, levels: lnd.LEVELS, users });
    } catch (error) {
        console.error("L&D list users failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load users" });
    }
};

// PUT /api/lnd-access/users/:id   { level: "None|View|Add|Edit|Full" }
const setUserAccess = async (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const level = String(req.body?.level || "");

        if (!Number.isInteger(targetId) || targetId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid user" });
        }

        if (!lnd.LEVELS.includes(level)) {
            return res.status(400).json({ success: false, message: "Invalid access level" });
        }

        const targets = await db.query(
            "SELECT id, email FROM users WHERE id = ? AND status = 'Active' LIMIT 1",
            [targetId]
        );

        if (!targets?.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (lnd.isOwnerRow(targets[0])) {
            return res.status(400).json({
                success: false,
                message: "The owner always has full access and cannot be changed.",
            });
        }

        const oldLevel = await lnd.getGrantedLevel(targetId);

        await db.query(
            "DELETE FROM user_permissions WHERE user_id = ? AND module_name = ?",
            [targetId, lnd.MODULE_NAME]
        );

        if (level !== "None") {
            await db.query(
                "INSERT INTO user_permissions (user_id, module_name, permission) VALUES (?, ?, ?)",
                [targetId, lnd.MODULE_NAME, level]
            );
        }

        try {
            await ensureAudit();
            await db.query(
                "INSERT INTO lnd_access_audit (changed_by, target_user_id, old_level, new_level) VALUES (?, ?, ?, ?)",
                [req.user.id, targetId, oldLevel, level]
            );
        } catch (auditError) {
            console.error("L&D audit write failed:", auditError.message);
        }

        return res.json({ success: true, userId: targetId, level });
    } catch (error) {
        console.error("L&D set access failed:", error);
        return res.status(500).json({ success: false, message: "Unable to update access" });
    }
};

// GET /api/lnd-access/audit → last 50 changes
const listAudit = async (req, res) => {
    try {
        await ensureAudit();
        const rows = await db.query(
            `
            SELECT a.id, a.old_level, a.new_level, a.created_at,
                   t.name AS target_name, c.name AS changed_by_name
            FROM lnd_access_audit a
            LEFT JOIN users t ON t.id = a.target_user_id
            LEFT JOIN users c ON c.id = a.changed_by
            ORDER BY a.id DESC LIMIT 50
            `
        );
        return res.json({ success: true, audit: rows || [] });
    } catch (error) {
        console.error("L&D audit failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load history" });
    }
};

module.exports = { listUsers, setUserAccess, listAudit };

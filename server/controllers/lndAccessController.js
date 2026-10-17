const db = require("../config/db");
const lnd = require("../utils/lndAccess");

// ==========================================================
// L&D ACCESS CONTROL (owner only — see routes/lndAccessRoutes.js)
// ==========================================================
// Per user: "Cannot see" (None) / Learner (View) / Manager (Edit) /
// Full. Bulk: Everyone / No one / Specific users (lndAccess MODES).
// Every change is written to lnd_access_audit.
// ==========================================================

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

const writeAudit = async (changedBy, targetUserId, oldLevel, newLevel) => {
    try {
        await ensureAudit();
        await db.query(
            "INSERT INTO lnd_access_audit (changed_by, target_user_id, old_level, new_level) VALUES (?, ?, ?, ?)",
            [changedBy, targetUserId, String(oldLevel).slice(0, 10), String(newLevel).slice(0, 10)]
        );
    } catch (auditError) {
        console.error("L&D audit write failed:", auditError.message);
    }
};

const MAX_BULK = 2000;

// ----------------------------------------------------------
// Apply one level to one (non-owner, active) user under `mode`.
// Returns { oldLevel, newLevel } (effective levels).
// ----------------------------------------------------------
const applyUserLevel = async (target, level, mode, changedBy) => {
    const explicit = await lnd.getExplicitLevel(target.id);
    const deniedRows = await db.query("SELECT user_id FROM lnd_access_denies WHERE user_id = ? LIMIT 1", [target.id]);
    const oldLevel = lnd.resolveLevel({ mode, explicit, denied: Boolean(deniedRows?.length) });

    await db.query("DELETE FROM user_permissions WHERE user_id = ? AND module_name = ?", [target.id, lnd.MODULE_NAME]);
    await db.query("DELETE FROM lnd_access_denies WHERE user_id = ?", [target.id]);

    if (mode === "everyone") {
        // Everyone can view by default: "Cannot see" is an explicit deny,
        // "Learner" needs no row, Manager / Full are explicit grants.
        if (level === "None") {
            await db.query("INSERT INTO lnd_access_denies (user_id, created_by) VALUES (?, ?)", [target.id, changedBy]);
        } else if (level !== "View") {
            await db.query("INSERT INTO user_permissions (user_id, module_name, permission) VALUES (?, ?, ?)", [target.id, lnd.MODULE_NAME, level]);
        }
    } else if (level !== "None") {
        await db.query("INSERT INTO user_permissions (user_id, module_name, permission) VALUES (?, ?, ?)", [target.id, lnd.MODULE_NAME, level]);
    }

    const newLevel = lnd.resolveLevel({ mode, explicit: mode === "everyone" && level === "View" ? "None" : level, denied: mode === "everyone" && level === "None" });
    if (oldLevel !== newLevel) await writeAudit(changedBy, target.id, oldLevel, newLevel);
    return { oldLevel, newLevel };
};

// GET /api/lnd-access/users  → mode + every active user with their access
const listUsers = async (req, res) => {
    try {
        await lnd.ensureAccessTables();
        const mode = await lnd.getAccessMode();

        const rows = await db.query(
            `
            SELECT u.id, u.name, u.email, u.employee_id, u.is_admin,
                   dg.designation_name AS designation,
                   dp.department_name AS department,
                   (SELECT GROUP_CONCAT(DISTINCT s.store_name ORDER BY s.store_name SEPARATOR ', ')
                      FROM user_stores us JOIN stores s ON s.id = us.store_id
                     WHERE us.user_id = u.id) AS stores,
                   (SELECT MAX(CASE p.permission WHEN 'Full' THEN 4 WHEN 'Edit' THEN 3 WHEN 'Add' THEN 2 WHEN 'View' THEN 1 ELSE 0 END)
                      FROM user_permissions p
                     WHERE p.user_id = u.id AND p.module_name = ?) AS explicit_rank,
                   (SELECT COUNT(*) FROM lnd_access_denies dn WHERE dn.user_id = u.id) AS denied
            FROM users u
            LEFT JOIN designations dg ON dg.id = u.designation_id
            LEFT JOIN departments dp ON dp.id = u.department_id
            WHERE u.status = 'Active'
            ORDER BY u.name ASC
            `,
            [lnd.MODULE_NAME]
        );

        const rankToLevel = (rank) => lnd.LEVELS[Number(rank) || 0] || "None";

        const users = (rows || []).map((row) => {
            const owner = lnd.isOwnerRow(row);
            const explicit = rankToLevel(row.explicit_rank);
            const denied = Number(row.denied) > 0;
            return {
                id: row.id,
                name: row.name,
                email: row.email,
                employeeId: row.employee_id || "",
                designation: row.designation || "",
                department: row.department || "",
                stores: row.stores || "",
                administrator: Number(row.is_admin) === 1,
                isOwner: owner,
                explicitLevel: explicit,
                denied,
                level: owner ? "Full" : lnd.resolveLevel({ mode, explicit, denied }),
            };
        });

        res.set("Cache-Control", "no-store");
        return res.json({ success: true, mode, levels: lnd.LEVELS, users });
    } catch (error) {
        console.error("L&D list users failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load users" });
    }
};

const loadTargets = async (ids) => {
    if (!ids.length) return [];
    return db.query(
        `SELECT id, email FROM users WHERE status = 'Active' AND id IN (${ids.map(() => "?").join(", ")})`,
        ids
    );
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

        await lnd.ensureAccessTables();
        const mode = await lnd.getAccessMode();
        if (mode === "nobody") {
            return res.status(409).json({
                success: false,
                message: "Access is set to “No one”. Switch to “Specific users” or “Everyone” to give individual access.",
            });
        }

        const targets = await loadTargets([targetId]);
        if (!targets?.length) return res.status(404).json({ success: false, message: "User not found" });
        if (lnd.isOwnerRow(targets[0])) {
            return res.status(400).json({ success: false, message: "The owner always has full access and cannot be changed." });
        }

        const result = await applyUserLevel(targets[0], level, mode, req.user.id);
        return res.json({ success: true, userId: targetId, level: result.newLevel, mode });
    } catch (error) {
        console.error("L&D set access failed:", error);
        return res.status(500).json({ success: false, message: "Unable to update access" });
    }
};

// PUT /api/lnd-access/users   { ids: [..], level }  → bulk grant / remove
const bulkSetAccess = async (req, res) => {
    try {
        const level = String(req.body?.level || "");
        const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : [])
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0))].slice(0, MAX_BULK);

        if (!lnd.LEVELS.includes(level)) return res.status(400).json({ success: false, message: "Invalid access level" });
        if (!ids.length) return res.status(400).json({ success: false, message: "Select at least one user." });

        await lnd.ensureAccessTables();
        const mode = await lnd.getAccessMode();
        if (mode === "nobody") {
            return res.status(409).json({
                success: false,
                message: "Access is set to “No one”. Switch to “Specific users” or “Everyone” to give individual access.",
            });
        }

        const targets = await loadTargets(ids);
        let changed = 0;
        let skippedOwner = 0;
        for (const target of targets) {
            if (lnd.isOwnerRow(target)) { skippedOwner += 1; continue; }
            const result = await applyUserLevel(target, level, mode, req.user.id);
            if (result.oldLevel !== result.newLevel) changed += 1;
        }

        return res.json({
            success: true,
            mode,
            updated: changed,
            unchanged: targets.length - changed - skippedOwner,
            skippedOwner,
            notFound: ids.length - targets.length,
        });
    } catch (error) {
        console.error("L&D bulk access failed:", error);
        return res.status(500).json({ success: false, message: "Unable to update access" });
    }
};

// PUT /api/lnd-access/mode  { mode: "everyone|nobody|selected", keepCurrent?: true }
//   everyone → every active user can see L&D (previous "Cannot see"
//              exceptions are cleared — Everyone means everyone).
//   nobody   → nobody but the owner. Individual grants are KEPT, so
//              switching back to "Specific users" restores them.
//   selected → only individually granted users. When switching from
//              "Everyone", keepCurrent (default) saves the users who can
//              see L&D right now as individual grants, so nobody loses
//              access by surprise; remove individuals afterwards.
const setMode = async (req, res) => {
    try {
        const mode = String(req.body?.mode || "");
        if (!lnd.MODES.includes(mode)) return res.status(400).json({ success: false, message: "Invalid access mode" });

        await lnd.ensureAccessTables();
        const previous = await lnd.getAccessMode();
        const keepCurrent = req.body?.keepCurrent !== false;
        let materialized = 0;

        if (mode === "everyone") {
            await db.query("DELETE FROM lnd_access_denies");
        }

        if (mode === "selected" && previous === "everyone" && keepCurrent) {
            const result = await db.query(
                `INSERT INTO user_permissions (user_id, module_name, permission)
                 SELECT u.id, ?, 'View' FROM users u
                 WHERE u.status = 'Active'
                   AND NOT EXISTS (SELECT 1 FROM user_permissions p WHERE p.user_id = u.id AND p.module_name = ?)
                   AND NOT EXISTS (SELECT 1 FROM lnd_access_denies dn WHERE dn.user_id = u.id)`,
                [lnd.MODULE_NAME, lnd.MODULE_NAME]
            );
            materialized = Number(result?.affectedRows || 0);
            await db.query("DELETE FROM lnd_access_denies");
        }

        await lnd.setAccessModeValue(mode, req.user.id);
        if (previous !== mode) await writeAudit(req.user.id, 0, previous, mode);

        const messages = {
            everyone: "Everyone can now see Learning & Development.",
            nobody: "Learning & Development is now hidden from everyone except the owner. Individual grants are kept.",
            selected: materialized
                ? `Specific users mode: ${materialized} user(s) who could see L&D were kept as individual grants.`
                : "Specific users mode: only individually granted users can see Learning & Development.",
        };
        return res.json({ success: true, mode, previous, materialized, message: messages[mode] });
    } catch (error) {
        console.error("L&D set mode failed:", error);
        return res.status(500).json({ success: false, message: "Unable to change access mode" });
    }
};

// GET /api/lnd-access/audit → last 50 changes
const listAudit = async (req, res) => {
    try {
        await ensureAudit();
        const rows = await db.query(
            `
            SELECT a.id, a.target_user_id, a.old_level, a.new_level, a.created_at,
                   t.name AS target_name, c.name AS changed_by_name
            FROM lnd_access_audit a
            LEFT JOIN users t ON t.id = a.target_user_id
            LEFT JOIN users c ON c.id = a.changed_by
            ORDER BY a.id DESC LIMIT 50
            `
        );
        return res.json({
            success: true,
            audit: (rows || []).map((row) => ({
                ...row,
                target_name: Number(row.target_user_id) === 0 ? "Access mode" : row.target_name,
            })),
        });
    } catch (error) {
        console.error("L&D audit failed:", error);
        return res.status(500).json({ success: false, message: "Unable to load history" });
    }
};

module.exports = { listUsers, setUserAccess, bulkSetAccess, setMode, listAudit };

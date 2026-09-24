const db = require("../config/db");

// ==========================================================
// PAGE (SUB-MODULE) PERMISSIONS
// ==========================================================
//
// Module-level access (None / View / Add / Edit / Full) still
// lives in `user_permissions`. This table only stores which PAGES
// inside a module have been switched ON or OFF for a user, e.g.
//
//     user 12 | quiz.take   | 1
//     user 12 | quiz.setup  | 0
//     user 12 | quiz.report | 0
//
// Rules:
//   • No row for a page  → allowed (so existing users keep every
//     page they had before this feature was deployed).
//   • Administrators never get rows — they see everything.
//
// The table is created automatically on first use; no manual
// migration is required.
// ==========================================================

const PAGE_KEY_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const MAX_PAGES = 200;

let tableReady = null;

const ensureTable = () => {
    if (!tableReady) {
        tableReady = db
            .query(`
                CREATE TABLE IF NOT EXISTS user_page_permissions (
                    user_id INT NOT NULL,
                    page_key VARCHAR(120) NOT NULL,
                    allowed TINYINT(1) NOT NULL DEFAULT 1,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, page_key),
                    KEY idx_user_page_permissions_user (user_id)
                )
            `)
            .then(() => true)
            .catch((error) => {
                tableReady = null;
                throw error;
            });
    }

    return tableReady;
};

// ----------------------------------------------------------
// Clean whatever the client sent into { "quiz.setup": true|false }
// ----------------------------------------------------------

const sanitizePageAccess = (input) => {
    const clean = {};

    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return clean;
    }

    Object.entries(input)
        .slice(0, MAX_PAGES)
        .forEach(([key, value]) => {
            const pageKey = String(key || "").trim().toLowerCase();

            if (!PAGE_KEY_PATTERN.test(pageKey) || pageKey.length > 120) {
                return;
            }

            clean[pageKey] =
                value === true ||
                value === 1 ||
                value === "1" ||
                value === "true";
        });

    return clean;
};

// ----------------------------------------------------------
// Read one user's page access → { key: boolean }
// ----------------------------------------------------------

const getForUser = async (userId) => {
    await ensureTable();

    const rows = await db.query(
        "SELECT page_key, allowed FROM user_page_permissions WHERE user_id = ?",
        [userId]
    );

    return (rows || []).reduce((acc, row) => {
        acc[row.page_key] = Number(row.allowed) === 1;
        return acc;
    }, {});
};

// ----------------------------------------------------------
// Read every user's page access → { userId: { key: boolean } }
// ----------------------------------------------------------

const getForAllUsers = async () => {
    await ensureTable();

    const rows = await db.query(
        "SELECT user_id, page_key, allowed FROM user_page_permissions"
    );

    return (rows || []).reduce((acc, row) => {
        if (!acc[row.user_id]) acc[row.user_id] = {};
        acc[row.user_id][row.page_key] = Number(row.allowed) === 1;
        return acc;
    }, {});
};

// ----------------------------------------------------------
// Replace one user's page access.
// Administrators: rows are cleared (they always see everything).
// `pageAccess` undefined → leave existing rows untouched (older
// clients that don't send the field keep working).
// ----------------------------------------------------------

const saveForUser = async (userId, pageAccess, administrator = false) => {
    if (!userId) return;

    await ensureTable();

    if (administrator) {
        await db.query("DELETE FROM user_page_permissions WHERE user_id = ?", [userId]);
        return;
    }

    if (pageAccess === undefined) {
        return;
    }

    const clean = sanitizePageAccess(pageAccess);

    await db.query("DELETE FROM user_page_permissions WHERE user_id = ?", [userId]);

    const values = Object.entries(clean).map(([pageKey, allowed]) => [
        userId,
        pageKey,
        allowed ? 1 : 0,
    ]);

    if (values.length) {
        await db.query(
            "INSERT INTO user_page_permissions (user_id, page_key, allowed) VALUES ?",
            [values]
        );
    }
};

const deleteForUser = async (userId) => {
    await ensureTable();
    await db.query("DELETE FROM user_page_permissions WHERE user_id = ?", [userId]);
};

module.exports = {
    ensureTable,
    sanitizePageAccess,
    getForUser,
    getForAllUsers,
    saveForUser,
    deleteForUser,
};

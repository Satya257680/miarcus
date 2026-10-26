const db = require("../config/db");

// ======================================================
// ACTION POINTS – TAKE ACTION PHOTO RULE
// ======================================================
//
// One global switch, controlled by Administrators only:
//
//   photo_mandatory = 0  -> Photo is OPTIONAL in "Take Action"
//                           (default – nothing changes for users).
//   photo_mandatory = 1  -> At least one photo MUST be attached.
//
//   mandatory_scope:
//     "close" -> photo required only when the Action Point is
//                moved to "Close / Completed" (default).
//     "all"   -> photo required for every Take Action save
//                (Open / In Progress / Close).
//
// Users with Edit / Full access to Action Points can always ADD
// photos; only an Administrator can change this rule.
// ======================================================

const SCOPES = ["close", "all"];

const DEFAULT_SETTINGS = {
    photo_mandatory: 0,
    mandatory_scope: "close",
    max_photos: 5
};

let ensured = false;

const ensureTable = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS action_point_photo_settings (
            id INT NOT NULL PRIMARY KEY,
            photo_mandatory TINYINT(1) NOT NULL DEFAULT 0,
            mandatory_scope VARCHAR(20) NOT NULL DEFAULT 'close',
            updated_by INT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
        INSERT INTO action_point_photo_settings (id, photo_mandatory, mandatory_scope)
        VALUES (1, 0, 'close')
        ON DUPLICATE KEY UPDATE id = id
    `);

    ensured = true;
};

const normalize = (row = {}) => ({
    photo_mandatory: Number(row.photo_mandatory) === 1 ? 1 : 0,
    mandatory_scope: SCOPES.includes(String(row.mandatory_scope)) ? String(row.mandatory_scope) : "close",
    max_photos: DEFAULT_SETTINGS.max_photos,
    updated_at: row.updated_at || null,
    updated_by_name: row.updated_by_name || null
});

const getSettings = async () => {
    try {
        if (!ensured) await ensureTable();
        const rows = await db.query(`
            SELECT s.photo_mandatory, s.mandatory_scope, s.updated_at, u.name AS updated_by_name
            FROM action_point_photo_settings s
            LEFT JOIN users u ON u.id = s.updated_by
            WHERE s.id = 1
            LIMIT 1
        `);
        return normalize(rows?.[0] || DEFAULT_SETTINGS);
    } catch (error) {
        // Never block Take Action because the rule could not be read –
        // fall back to "photo optional".
        console.error("ACTION POINT PHOTO SETTINGS READ ERROR:", error.message);
        return normalize(DEFAULT_SETTINGS);
    }
};

const saveSettings = async (input = {}, userId = null) => {
    if (!ensured) await ensureTable();

    const current = await getSettings();

    const photoMandatory = input.photo_mandatory === undefined
        ? current.photo_mandatory
        : ([1, "1", true, "true", "on"].includes(input.photo_mandatory) ? 1 : 0);

    const scope = input.mandatory_scope === undefined
        ? current.mandatory_scope
        : String(input.mandatory_scope);

    if (!SCOPES.includes(scope)) {
        const err = new Error("Invalid photo rule. Use 'close' or 'all'.");
        err.statusCode = 400;
        throw err;
    }

    await db.query(`
        UPDATE action_point_photo_settings
        SET photo_mandatory = ?, mandatory_scope = ?, updated_by = ?
        WHERE id = 1
    `, [photoMandatory, scope, userId || null]);

    return getSettings();
};

// Is a photo required for this Take Action / status change?
const isPhotoRequired = (settings, nextStatus) => {
    if (!settings || Number(settings.photo_mandatory) !== 1) return false;
    if (settings.mandatory_scope === "all") return true;
    return nextStatus === "Closed";
};

module.exports = {
    ensureTable,
    getSettings,
    saveSettings,
    isPhotoRequired,
    DEFAULT_SETTINGS
};

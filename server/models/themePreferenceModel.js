const db = require("../config/db");

// ======================================================================
// MIARCUS — APPEARANCE / THEME PREFERENCES
//
// Two appearance-only tables (no business data lives here):
//   user_theme_preferences          one row per user ("Save as my default")
//   miarcus_global_theme_settings   single row (id = 1) managed by admins
//
// Global modes
//   enabled = 0                        -> off, everyone uses their own choice
//   enabled = 1, allow_personal = 1    -> organisation DEFAULT: applies to
//                                         users who have not saved their own
//   enabled = 1, allow_personal = 0    -> ENFORCED for every non-admin user
//                                         (this is the original behaviour of
//                                         "Apply to All Users", so existing
//                                         rows keep working unchanged)
//
// Every new column is added in place with a safe default, so existing
// installations keep their saved preferences after deployment.
// ======================================================================

const DEFAULT_PREFERENCES = Object.freeze({
    theme: "miarcus-original",
    accentColor: "purple",
    fontSize: "medium",
    fontFamily: "default",
    sidebarStyle: "comfortable",
    tableDensity: "comfortable",
    cornerStyle: "rounded",
    motion: "system"
});

const VALID_THEMES = new Set([
    "miarcus-original",
    "neon-glass",
    "professional",
    "dark",
    "minimal",
    "classic-blue",
    "high-contrast",
    "auto",
    "sunset",
    "ocean",
    "forest",
    "rose",
    "midnight",
    "sepia",
    "lavender",
    "emerald",
    "royal",
    "nord",
    "coffee",
    "aurora",
    "cherry",
    "slate"
]);

const VALID_ACCENTS = new Set([
    // "theme" = use the selected theme's own accent colour.
    "theme",
    "purple",
    "blue",
    "teal",
    "green",
    "orange",
    "red",
    "pink",
    "indigo",
    "amber",
    "cyan",
    "violet",
    "lime",
    "gold",
    "slate",
    "magenta"
]);

const VALID_FONT_SIZES = new Set(["small", "medium", "large"]);

const VALID_FONT_FAMILIES = new Set([
    "default",
    "rounded",
    "serif",
    "mono",
    "modern",
    "system"
]);

const VALID_SIDEBAR_STYLES = new Set(["comfortable", "compact"]);
const VALID_TABLE_DENSITIES = new Set(["comfortable", "compact"]);
const VALID_CORNER_STYLES = new Set(["rounded", "soft", "sharp"]);
const VALID_MOTION = new Set(["system", "full", "reduced"]);

const pick = (set, value, fallback) =>
    typeof value === "string" && set.has(value) ? value : fallback;

// Drops unknown keys / values so tampered input can never be stored.
const normalize = (value) => {
    const input = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};

    return {
        theme: pick(VALID_THEMES, input.theme, DEFAULT_PREFERENCES.theme),
        accentColor: pick(VALID_ACCENTS, input.accentColor, DEFAULT_PREFERENCES.accentColor),
        fontSize: pick(VALID_FONT_SIZES, input.fontSize, DEFAULT_PREFERENCES.fontSize),
        fontFamily: pick(VALID_FONT_FAMILIES, input.fontFamily, DEFAULT_PREFERENCES.fontFamily),
        sidebarStyle: pick(VALID_SIDEBAR_STYLES, input.sidebarStyle, DEFAULT_PREFERENCES.sidebarStyle),
        tableDensity: pick(VALID_TABLE_DENSITIES, input.tableDensity, DEFAULT_PREFERENCES.tableDensity),
        cornerStyle: pick(VALID_CORNER_STYLES, input.cornerStyle, DEFAULT_PREFERENCES.cornerStyle),
        motion: pick(VALID_MOTION, input.motion, DEFAULT_PREFERENCES.motion)
    };
};

const fromRow = (row = {}) =>
    normalize({
        theme: row.theme,
        accentColor: row.accent_color,
        fontSize: row.font_size,
        fontFamily: row.font_family,
        sidebarStyle: row.sidebar_style,
        tableDensity: row.table_density,
        cornerStyle: row.corner_style,
        motion: row.motion
    });

// ----------------------------------------------------------------------
// Schema helpers
// ----------------------------------------------------------------------

const columnExists = async (table, column) => {
    const rows = await db.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
        [table, column]
    );

    return Number(rows[0]?.count || 0) > 0;
};

// Table / column names below are fixed literals from this file only —
// never user input.
const addColumnIfMissing = async (table, column, definition) => {
    if (await columnExists(table, column)) return;

    try {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (error) {
        // Another app instance may have added it a moment earlier.
        if (error?.code !== "ER_DUP_FIELDNAME" && Number(error?.errno) !== 1060) {
            throw error;
        }
    }
};

const APPEARANCE_COLUMNS = [
    ["font_family", "VARCHAR(20) NOT NULL DEFAULT 'default' AFTER font_size"],
    ["table_density", "VARCHAR(20) NOT NULL DEFAULT 'comfortable' AFTER sidebar_style"],
    ["corner_style", "VARCHAR(20) NOT NULL DEFAULT 'rounded' AFTER table_density"],
    ["motion", "VARCHAR(20) NOT NULL DEFAULT 'system' AFTER corner_style"]
];

const ensureTable = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_theme_preferences (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            theme VARCHAR(50) NOT NULL DEFAULT 'miarcus-original',
            accent_color VARCHAR(30) NOT NULL DEFAULT 'purple',
            font_size VARCHAR(20) NOT NULL DEFAULT 'medium',
            font_family VARCHAR(20) NOT NULL DEFAULT 'default',
            sidebar_style VARCHAR(20) NOT NULL DEFAULT 'comfortable',
            table_density VARCHAR(20) NOT NULL DEFAULT 'comfortable',
            corner_style VARCHAR(20) NOT NULL DEFAULT 'rounded',
            motion VARCHAR(20) NOT NULL DEFAULT 'system',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_user_theme_preferences_user_id (user_id),
            INDEX idx_user_theme_preferences_user_id (user_id)
        )
    `);

    // Existing installs created the table before these columns existed -
    // add them in place so saved preferences aren't lost.
    for (const [column, definition] of APPEARANCE_COLUMNS) {
        await addColumnIfMissing("user_theme_preferences", column, definition);
    }

    await ensureGlobalTable();
};

// ----------------------------------------------------------------------
// Personal preferences
// ----------------------------------------------------------------------

const PERSONAL_SELECT = `
    SELECT theme, accent_color, font_size, font_family, sidebar_style,
           table_density, corner_style, motion, updated_at
    FROM user_theme_preferences
    WHERE user_id = ?
    LIMIT 1
`;

// { preferences, isCustom, updatedAt } — isCustom tells the client whether
// the user saved their own default or should follow the organisation one.
const getPersonal = async (userId) => {
    const rows = await db.query(PERSONAL_SELECT, [userId]);

    if (!rows.length) {
        return { preferences: { ...DEFAULT_PREFERENCES }, isCustom: false, updatedAt: null };
    }

    return {
        preferences: fromRow(rows[0]),
        isCustom: true,
        updatedAt: rows[0].updated_at || null
    };
};

// Kept for backward compatibility with existing callers.
const getByUserId = async (userId) => (await getPersonal(userId)).preferences;

const saveForUser = async (userId, preferences) => {
    const normalized = normalize(preferences);

    await db.query(
        `
        INSERT INTO user_theme_preferences
        (
            user_id, theme, accent_color, font_size, font_family,
            sidebar_style, table_density, corner_style, motion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            theme = VALUES(theme),
            accent_color = VALUES(accent_color),
            font_size = VALUES(font_size),
            font_family = VALUES(font_family),
            sidebar_style = VALUES(sidebar_style),
            table_density = VALUES(table_density),
            corner_style = VALUES(corner_style),
            motion = VALUES(motion)
        `,
        [
            userId,
            normalized.theme,
            normalized.accentColor,
            normalized.fontSize,
            normalized.fontFamily,
            normalized.sidebarStyle,
            normalized.tableDensity,
            normalized.cornerStyle,
            normalized.motion
        ]
    );

    return normalized;
};

// "Reset to default": forget the user's own choice so they follow the
// organisation default (or the built-in MIARCUS default) again.
const deleteForUser = async (userId) => {
    await db.query("DELETE FROM user_theme_preferences WHERE user_id = ?", [userId]);
    return true;
};

// ----------------------------------------------------------------------
// Organisation-wide (admin) appearance
// ----------------------------------------------------------------------

let globalTableReady = null;

const ensureGlobalTable = async () => {
    if (!globalTableReady) {
        globalTableReady = (async () => {
            await db.query(`
                CREATE TABLE IF NOT EXISTS miarcus_global_theme_settings (
                    id TINYINT NOT NULL PRIMARY KEY,
                    enabled TINYINT(1) NOT NULL DEFAULT 0,
                    allow_personal TINYINT(1) NOT NULL DEFAULT 0,
                    theme VARCHAR(50) NOT NULL DEFAULT 'miarcus-original',
                    accent_color VARCHAR(30) NOT NULL DEFAULT 'purple',
                    font_size VARCHAR(20) NOT NULL DEFAULT 'medium',
                    font_family VARCHAR(20) NOT NULL DEFAULT 'default',
                    sidebar_style VARCHAR(20) NOT NULL DEFAULT 'comfortable',
                    table_density VARCHAR(20) NOT NULL DEFAULT 'comfortable',
                    corner_style VARCHAR(20) NOT NULL DEFAULT 'rounded',
                    motion VARCHAR(20) NOT NULL DEFAULT 'system',
                    updated_by INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // allow_personal defaults to 0 so a global theme that was already
            // active before this upgrade stays ENFORCED exactly as before.
            await addColumnIfMissing(
                "miarcus_global_theme_settings",
                "allow_personal",
                "TINYINT(1) NOT NULL DEFAULT 0 AFTER enabled"
            );

            for (const [column, definition] of APPEARANCE_COLUMNS) {
                await addColumnIfMissing("miarcus_global_theme_settings", column, definition);
            }
        })().catch((error) => {
            // Allow a retry on the next request instead of caching a failure.
            globalTableReady = null;
            throw error;
        });
    }

    return globalTableReady;
};

const DISABLED_GLOBAL = () => ({
    enabled: false,
    allowPersonal: true,
    mode: "off",
    preferences: { ...DEFAULT_PREFERENCES },
    updatedAt: null
});

const describeMode = (enabled, allowPersonal) => {
    if (!enabled) return "off";
    return allowPersonal ? "default" : "enforced";
};

const getGlobal = async () => {
    await ensureGlobalTable();

    const rows = await db.query(`
        SELECT enabled, allow_personal, theme, accent_color, font_size,
               font_family, sidebar_style, table_density, corner_style,
               motion, updated_at
        FROM miarcus_global_theme_settings
        WHERE id = 1
        LIMIT 1
    `);

    if (!rows.length) return DISABLED_GLOBAL();

    const enabled = Number(rows[0].enabled) === 1;
    const allowPersonal = Number(rows[0].allow_personal) === 1;

    return {
        enabled,
        allowPersonal,
        mode: describeMode(enabled, allowPersonal),
        preferences: fromRow(rows[0]),
        updatedAt: rows[0].updated_at || null
    };
};

const saveGlobal = async ({
    enabled = true,
    allowPersonal = false,
    preferences = {},
    updatedBy = null
} = {}) => {
    await ensureGlobalTable();

    const normalized = normalize(preferences);
    const isEnabled = Boolean(enabled);
    const isAllowPersonal = Boolean(allowPersonal);

    await db.query(
        `
        INSERT INTO miarcus_global_theme_settings
            (id, enabled, allow_personal, theme, accent_color, font_size,
             font_family, sidebar_style, table_density, corner_style,
             motion, updated_by)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            enabled = VALUES(enabled),
            allow_personal = VALUES(allow_personal),
            theme = VALUES(theme),
            accent_color = VALUES(accent_color),
            font_size = VALUES(font_size),
            font_family = VALUES(font_family),
            sidebar_style = VALUES(sidebar_style),
            table_density = VALUES(table_density),
            corner_style = VALUES(corner_style),
            motion = VALUES(motion),
            updated_by = VALUES(updated_by)
        `,
        [
            isEnabled ? 1 : 0,
            isAllowPersonal ? 1 : 0,
            normalized.theme,
            normalized.accentColor,
            normalized.fontSize,
            normalized.fontFamily,
            normalized.sidebarStyle,
            normalized.tableDensity,
            normalized.cornerStyle,
            normalized.motion,
            updatedBy
        ]
    );

    return {
        enabled: isEnabled,
        allowPersonal: isAllowPersonal,
        mode: describeMode(isEnabled, isAllowPersonal),
        preferences: normalized,
        updatedAt: new Date().toISOString()
    };
};

module.exports = {
    DEFAULT_PREFERENCES,
    normalize,
    ensureTable,
    ensureGlobalTable,
    getPersonal,
    getByUserId,
    saveForUser,
    deleteForUser,
    getGlobal,
    saveGlobal
};

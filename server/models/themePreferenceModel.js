const db = require("../config/db");

const DEFAULT_PREFERENCES = {
    theme: "miarcus-original",
    accentColor: "purple",
    fontSize: "medium",
    fontFamily: "default",
    sidebarStyle: "comfortable"
};

const VALID_THEMES = new Set([
    "miarcus-original",
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
    "sepia"
]);

const VALID_ACCENTS = new Set([
    "purple",
    "blue",
    "teal",
    "green",
    "orange",
    "red",
    "pink",
    "indigo",
    "amber",
    "cyan"
]);

const VALID_FONT_SIZES = new Set([
    "small",
    "medium",
    "large"
]);

const VALID_FONT_FAMILIES = new Set([
    "default",
    "rounded",
    "serif",
    "mono"
]);

const VALID_SIDEBAR_STYLES = new Set([
    "comfortable",
    "compact"
]);

const normalize = (value = {}) => ({
    theme: VALID_THEMES.has(value.theme)
        ? value.theme
        : DEFAULT_PREFERENCES.theme,

    accentColor: VALID_ACCENTS.has(
        value.accentColor
    )
        ? value.accentColor
        : DEFAULT_PREFERENCES.accentColor,

    fontSize: VALID_FONT_SIZES.has(
        value.fontSize
    )
        ? value.fontSize
        : DEFAULT_PREFERENCES.fontSize,

    fontFamily: VALID_FONT_FAMILIES.has(
        value.fontFamily
    )
        ? value.fontFamily
        : DEFAULT_PREFERENCES.fontFamily,

    sidebarStyle:
        VALID_SIDEBAR_STYLES.has(
            value.sidebarStyle
        )
            ? value.sidebarStyle
            : DEFAULT_PREFERENCES.sidebarStyle
});

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

const addColumnIfMissing = async (
    table,
    column,
    definition
) => {
    if (!(await columnExists(table, column))) {
        await db.query(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
        );
    }
};

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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_user_theme_preferences_user_id (user_id),
            INDEX idx_user_theme_preferences_user_id (user_id)
        )
    `);

    // Existing installs created the table before "font_family" existed -
    // add it in place so saved preferences aren't lost.
    await addColumnIfMissing(
        "user_theme_preferences",
        "font_family",
        "VARCHAR(20) NOT NULL DEFAULT 'default' AFTER font_size"
    );
};

const getByUserId = async (userId) => {
    const rows = await db.query(
        `
        SELECT
            theme,
            accent_color,
            font_size,
            font_family,
            sidebar_style
        FROM user_theme_preferences
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
    );

    if (!rows.length) {
        return DEFAULT_PREFERENCES;
    }

    return normalize({
        theme: rows[0].theme,
        accentColor: rows[0].accent_color,
        fontSize: rows[0].font_size,
        fontFamily: rows[0].font_family,
        sidebarStyle: rows[0].sidebar_style
    });
};

const saveForUser = async (
    userId,
    preferences
) => {
    const normalized =
        normalize(preferences);

    await db.query(
        `
        INSERT INTO user_theme_preferences
        (
            user_id,
            theme,
            accent_color,
            font_size,
            font_family,
            sidebar_style
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            theme = VALUES(theme),
            accent_color = VALUES(accent_color),
            font_size = VALUES(font_size),
            font_family = VALUES(font_family),
            sidebar_style = VALUES(sidebar_style)
        `,
        [
            userId,
            normalized.theme,
            normalized.accentColor,
            normalized.fontSize,
            normalized.fontFamily,
            normalized.sidebarStyle
        ]
    );

    return normalized;
};

module.exports = {
    DEFAULT_PREFERENCES,
    ensureTable,
    getByUserId,
    saveForUser
};

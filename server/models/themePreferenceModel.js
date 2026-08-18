const db = require("../config/db");

const DEFAULT_PREFERENCES = {
    theme: "miarcus-original",
    mode: "light",
    accentColor: "purple",
    fontSize: "medium",
    sidebarStyle: "comfortable",
    layoutMode: "default",
    animations: true,
    rememberPreference: true
};

const VALID_THEMES = new Set([
    "miarcus-original", "professional", "dark", "minimal",
    "classic-blue", "high-contrast", "royal-purple", "ocean",
    "emerald", "sunset", "midnight", "sky"
]);

const VALID_MODES = new Set(["light", "dark"]);
const VALID_ACCENTS = new Set([
    "purple", "blue", "teal", "green", "orange", "red", "pink", "cyan"
]);
const VALID_FONT_SIZES = new Set(["small", "medium", "large"]);
const VALID_SIDEBAR_STYLES = new Set(["comfortable", "compact"]);
const VALID_LAYOUT_MODES = new Set(["default", "wide"]);

const normalize = (value = {}) => ({
    theme: VALID_THEMES.has(value.theme) ? value.theme : DEFAULT_PREFERENCES.theme,
    mode: VALID_MODES.has(value.mode) ? value.mode : DEFAULT_PREFERENCES.mode,
    accentColor: VALID_ACCENTS.has(value.accentColor) ? value.accentColor : DEFAULT_PREFERENCES.accentColor,
    fontSize: VALID_FONT_SIZES.has(value.fontSize) ? value.fontSize : DEFAULT_PREFERENCES.fontSize,
    sidebarStyle: VALID_SIDEBAR_STYLES.has(value.sidebarStyle) ? value.sidebarStyle : DEFAULT_PREFERENCES.sidebarStyle,
    layoutMode: VALID_LAYOUT_MODES.has(value.layoutMode) ? value.layoutMode : DEFAULT_PREFERENCES.layoutMode,
    animations: typeof value.animations === "boolean" ? value.animations : DEFAULT_PREFERENCES.animations,
    rememberPreference: typeof value.rememberPreference === "boolean" ? value.rememberPreference : DEFAULT_PREFERENCES.rememberPreference
});

const ensureTable = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_theme_preferences (
            id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            theme VARCHAR(50) NOT NULL DEFAULT 'miarcus-original',
            mode VARCHAR(20) NOT NULL DEFAULT 'light',
            accent_color VARCHAR(30) NOT NULL DEFAULT 'purple',
            font_size VARCHAR(20) NOT NULL DEFAULT 'medium',
            sidebar_style VARCHAR(20) NOT NULL DEFAULT 'comfortable',
            layout_mode VARCHAR(20) NOT NULL DEFAULT 'default',
            animations TINYINT(1) NOT NULL DEFAULT 1,
            remember_preference TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_user_theme_preferences_user_id (user_id),
            INDEX idx_user_theme_preferences_user_id (user_id)
        )
    `);

    // Existing installations may already have the original five columns.
    // Add only the new appearance columns; failures are ignored when a
    // column already exists.
    const migrations = [
        "ALTER TABLE user_theme_preferences ADD COLUMN mode VARCHAR(20) NOT NULL DEFAULT 'light'",
        "ALTER TABLE user_theme_preferences ADD COLUMN layout_mode VARCHAR(20) NOT NULL DEFAULT 'default'",
        "ALTER TABLE user_theme_preferences ADD COLUMN animations TINYINT(1) NOT NULL DEFAULT 1",
        "ALTER TABLE user_theme_preferences ADD COLUMN remember_preference TINYINT(1) NOT NULL DEFAULT 1"
    ];

    for (const sql of migrations) {
        try {
            await db.query(sql);
        } catch (error) {
            if (!/duplicate column|already exists/i.test(error.message || "")) {
                console.warn("Theme preference migration:", error.message);
            }
        }
    }
};

const getByUserId = async (userId) => {
    const rows = await db.query(`
        SELECT theme, mode, accent_color, font_size, sidebar_style,
               layout_mode, animations, remember_preference
        FROM user_theme_preferences
        WHERE user_id = ?
        LIMIT 1
    `, [userId]);

    if (!rows.length) return DEFAULT_PREFERENCES;

    return normalize({
        theme: rows[0].theme,
        mode: rows[0].mode,
        accentColor: rows[0].accent_color,
        fontSize: rows[0].font_size,
        sidebarStyle: rows[0].sidebar_style,
        layoutMode: rows[0].layout_mode,
        animations: Boolean(rows[0].animations),
        rememberPreference: Boolean(rows[0].remember_preference)
    });
};

const saveForUser = async (userId, preferences) => {
    const normalized = normalize(preferences);

    await db.query(`
        INSERT INTO user_theme_preferences
        (user_id, theme, mode, accent_color, font_size, sidebar_style,
         layout_mode, animations, remember_preference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            theme = VALUES(theme),
            mode = VALUES(mode),
            accent_color = VALUES(accent_color),
            font_size = VALUES(font_size),
            sidebar_style = VALUES(sidebar_style),
            layout_mode = VALUES(layout_mode),
            animations = VALUES(animations),
            remember_preference = VALUES(remember_preference)
    `, [
        userId,
        normalized.theme,
        normalized.mode,
        normalized.accentColor,
        normalized.fontSize,
        normalized.sidebarStyle,
        normalized.layoutMode,
        normalized.animations ? 1 : 0,
        normalized.rememberPreference ? 1 : 0
    ]);

    return normalized;
};

module.exports = {
    DEFAULT_PREFERENCES,
    ensureTable,
    getByUserId,
    saveForUser
};

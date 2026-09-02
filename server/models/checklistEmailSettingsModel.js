const db = require("../config/db");

const DEFAULT_SETTINGS = {
    checklist_submitted_enabled: 1,
    action_point_created_enabled: 1,
    action_point_status_enabled: 1,
    action_point_completed_enabled: 1,
    admin_recipients_enabled: 1,
    store_manager_recipients_enabled: 1
};

const ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS checklist_email_settings (
            id INT NOT NULL PRIMARY KEY,
            checklist_submitted_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_created_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_status_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_completed_enabled TINYINT(1) NOT NULL DEFAULT 1,
            admin_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1,
            store_manager_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.query(`
        INSERT INTO checklist_email_settings
            (id, checklist_submitted_enabled, action_point_created_enabled,
             action_point_status_enabled, action_point_completed_enabled,
             admin_recipients_enabled, store_manager_recipients_enabled)
        VALUES (1, 1, 1, 1, 1, 1, 1)
        ON DUPLICATE KEY UPDATE id=id
    `);
};

const getSettings = async () => {
    const rows = await db.query(`
        SELECT checklist_submitted_enabled,
               action_point_created_enabled,
               action_point_status_enabled,
               action_point_completed_enabled,
               admin_recipients_enabled,
               store_manager_recipients_enabled
        FROM checklist_email_settings
        WHERE id = 1
        LIMIT 1
    `);

    return { ...DEFAULT_SETTINGS, ...(rows?.[0] || {}) };
};

const saveSettings = async (payload = {}) => {
    const bool = (value, fallback) =>
        value === undefined || value === null ? fallback : (value ? 1 : 0);

    const settings = {
        checklist_submitted_enabled: bool(payload.checklist_submitted_enabled, 1),
        action_point_created_enabled: bool(payload.action_point_created_enabled, 1),
        action_point_status_enabled: bool(payload.action_point_status_enabled, 1),
        action_point_completed_enabled: bool(payload.action_point_completed_enabled, 1),
        admin_recipients_enabled: bool(payload.admin_recipients_enabled, 1),
        store_manager_recipients_enabled: bool(payload.store_manager_recipients_enabled, 1)
    };

    await db.query(`
        UPDATE checklist_email_settings
        SET checklist_submitted_enabled = ?,
            action_point_created_enabled = ?,
            action_point_status_enabled = ?,
            action_point_completed_enabled = ?,
            admin_recipients_enabled = ?,
            store_manager_recipients_enabled = ?
        WHERE id = 1
    `, [
        settings.checklist_submitted_enabled,
        settings.action_point_created_enabled,
        settings.action_point_status_enabled,
        settings.action_point_completed_enabled,
        settings.admin_recipients_enabled,
        settings.store_manager_recipients_enabled
    ]);

    return getSettings();
};

module.exports = { DEFAULT_SETTINGS, ensureTables, getSettings, saveSettings };

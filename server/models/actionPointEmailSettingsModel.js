const db = require("../config/db");

// ======================================================
// ACTION POINTS – EMAIL ROUTING
// ======================================================
//
// Separate from Checklist email routing. Checklist routing only
// controls the "Checklist submitted" email; everything about Action
// Points (generated / status changed / completed) is routed here:
//
//   1. Its own contact list (Role / Name / Email) with per-event
//      switches – Generated, Status, Completed.
//
//   2. The manager of THAT store only (never other stores).
//
//   3. Optionally the person who submitted the checklist and the
//      person the Action Point is assigned to.
//
//   4. "One email per store" – when a checklist submission raises
//      several Action Points, the store gets ONE Action Point email
//      listing all of them (like the single Checklist email), instead
//      of one email per Action Point.
// ======================================================

const DEFAULT_SETTINGS = {
    action_point_created_enabled: 1,
    action_point_status_enabled: 1,
    action_point_completed_enabled: 1,
    store_manager_recipients_enabled: 1,
    submitter_recipients_enabled: 1,
    assignee_recipients_enabled: 1,
    one_email_per_store: 1
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

const RECIPIENT_EVENT_FIELDS = {
    ACTION_POINT_CREATED: "send_on_ap_created",
    ACTION_POINT_STATUS: "send_on_ap_status",
    ACTION_POINT_COMPLETED: "send_on_ap_completed"
};

const tableExists = async (table) => {
    const rows = await db.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
    `, [table]);
    return Number(rows?.[0]?.total || 0) > 0;
};

const columnExists = async (table, column) => {
    const rows = await db.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    `, [table, column]);
    return Number(rows?.[0]?.total || 0) > 0;
};

const ensureTables = async () => {
    const settingsTableExisted = await tableExists("action_point_email_settings");

    await db.query(`
        CREATE TABLE IF NOT EXISTS action_point_email_settings (
            id INT NOT NULL PRIMARY KEY,
            action_point_created_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_status_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_completed_enabled TINYINT(1) NOT NULL DEFAULT 1,
            store_manager_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1,
            submitter_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1,
            assignee_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1,
            one_email_per_store TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const column of ["assignee_recipients_enabled", "one_email_per_store"]) {
        if (!(await columnExists("action_point_email_settings", column))) {
            await db.query(`ALTER TABLE action_point_email_settings ADD COLUMN ${column} TINYINT(1) NOT NULL DEFAULT 1`);
        }
    }

    // First run: start from what the old (shared) Checklist routing had
    // for Action Points, so nothing changes until the admin edits it.
    let seed = { ...DEFAULT_SETTINGS };
    if (!settingsTableExisted) {
        try {
            if (await tableExists("checklist_email_settings")) {
                const rows = await db.query(`
                    SELECT action_point_created_enabled, action_point_status_enabled,
                           action_point_completed_enabled, store_manager_recipients_enabled,
                           submitter_recipients_enabled
                    FROM checklist_email_settings WHERE id = 1 LIMIT 1
                `);
                if (rows?.[0]) seed = { ...seed, ...rows[0] };
            }
        } catch (error) {
            console.warn("Action Point email: could not copy checklist settings:", error.message);
        }
    }

    await db.query(`
        INSERT INTO action_point_email_settings
            (id, ${SETTING_KEYS.join(", ")})
        VALUES (1, ${SETTING_KEYS.map(() => "?").join(", ")})
        ON DUPLICATE KEY UPDATE id = id
    `, SETTING_KEYS.map((key) => (Number(seed[key]) === 1 ? 1 : 0)));

    const recipientsTableExisted = await tableExists("action_point_email_recipients");

    await db.query(`
        CREATE TABLE IF NOT EXISTS action_point_email_recipients (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            role_key VARCHAR(80) NOT NULL UNIQUE,
            role_label VARCHAR(120) NOT NULL,
            contact_name VARCHAR(160) NULL,
            email VARCHAR(255) NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            send_on_ap_created TINYINT(1) NOT NULL DEFAULT 1,
            send_on_ap_status TINYINT(1) NOT NULL DEFAULT 1,
            send_on_ap_completed TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ap_email_enabled (enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed ONCE from the Checklist contact list (same people, same
    // on/off state) so the admin only has to adjust. After that the two
    // lists are completely independent.
    if (!recipientsTableExisted) {
        try {
            if (await tableExists("checklist_email_recipients")) {
                const rows = await db.query(`
                    SELECT role_key, role_label, contact_name, email, enabled,
                           send_on_ap_created, send_on_ap_status, send_on_ap_completed
                    FROM checklist_email_recipients
                    ORDER BY id ASC
                `);
                for (const row of rows || []) {
                    await db.query(`
                        INSERT INTO action_point_email_recipients
                            (role_key, role_label, contact_name, email, enabled,
                             send_on_ap_created, send_on_ap_status, send_on_ap_completed)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE role_label = VALUES(role_label)
                    `, [
                        row.role_key,
                        row.role_label,
                        row.contact_name || null,
                        row.email || null,
                        Number(row.enabled) === 1 ? 1 : 0,
                        Number(row.send_on_ap_created) === 1 ? 1 : 0,
                        Number(row.send_on_ap_status) === 1 ? 1 : 0,
                        Number(row.send_on_ap_completed) === 1 ? 1 : 0
                    ]);
                }
            }
        } catch (error) {
            console.warn("Action Point email: could not copy checklist contacts:", error.message);
        }
    }
};

const getRecipientsList = async () => db.query(`
    SELECT id, role_key, role_label, contact_name, email, enabled,
           send_on_ap_created, send_on_ap_status, send_on_ap_completed
    FROM action_point_email_recipients
    ORDER BY id ASC
`);

const getSettings = async () => {
    let row = {};
    try {
        const rows = await db.query(`
            SELECT ${SETTING_KEYS.join(", ")}
            FROM action_point_email_settings
            WHERE id = 1
            LIMIT 1
        `);
        row = rows?.[0] || {};
    } catch (error) {
        console.error("Action Point email settings load failed:", error.message);
    }

    let recipients = [];
    try {
        recipients = await getRecipientsList();
    } catch (error) {
        console.error("Action Point email recipients load failed:", error.message);
    }

    return { ...DEFAULT_SETTINGS, ...row, recipients };
};

const cleanEmail = (value) => String(value || "").trim().toLowerCase().slice(0, 255);
const flag = (value, fallback = 1) =>
    value === undefined || value === null ? fallback : (value === true || Number(value) === 1 || value === "1" ? 1 : 0);

const saveSettings = async (payload = {}) => {
    const values = SETTING_KEYS.map((key) => flag(payload[key], DEFAULT_SETTINGS[key]));

    await db.query(`
        UPDATE action_point_email_settings
        SET ${SETTING_KEYS.map((key) => `${key} = ?`).join(", ")}
        WHERE id = 1
    `, values);

    if (Array.isArray(payload.recipients)) {
        const keep = [];

        for (const item of payload.recipients) {
            if (!item) continue;
            const roleKey = String(item.role_key || "").trim().slice(0, 80);
            if (!roleKey) continue;

            const email = cleanEmail(item.email);
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                const err = new Error(`Invalid email address: ${email}`);
                err.statusCode = 400;
                throw err;
            }

            keep.push(roleKey);

            await db.query(`
                INSERT INTO action_point_email_recipients
                    (role_key, role_label, contact_name, email, enabled,
                     send_on_ap_created, send_on_ap_status, send_on_ap_completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    role_label = VALUES(role_label),
                    contact_name = VALUES(contact_name),
                    email = VALUES(email),
                    enabled = VALUES(enabled),
                    send_on_ap_created = VALUES(send_on_ap_created),
                    send_on_ap_status = VALUES(send_on_ap_status),
                    send_on_ap_completed = VALUES(send_on_ap_completed)
            `, [
                roleKey,
                String(item.role_label || item.contact_name || "Recipient").trim().slice(0, 120),
                String(item.contact_name || "").trim().slice(0, 160) || null,
                email || null,
                flag(item.enabled),
                flag(item.send_on_ap_created),
                flag(item.send_on_ap_status),
                flag(item.send_on_ap_completed)
            ]);
        }

        // Rows removed in the UI are removed here too.
        if (keep.length) {
            await db.query(
                `DELETE FROM action_point_email_recipients WHERE role_key NOT IN (${keep.map(() => "?").join(",")})`,
                keep
            );
        } else {
            await db.query(`DELETE FROM action_point_email_recipients`);
        }
    }

    return getSettings();
};

// Contacts that should receive a given Action Point event.
const getContactsForEvent = async (event) => {
    const field = RECIPIENT_EVENT_FIELDS[event];
    if (!field) return [];
    const rows = await getRecipientsList();
    return (rows || []).filter((row) =>
        Number(row.enabled) === 1 &&
        Number(row[field]) === 1 &&
        String(row.email || "").trim()
    );
};

module.exports = {
    DEFAULT_SETTINGS,
    RECIPIENT_EVENT_FIELDS,
    ensureTables,
    getSettings,
    saveSettings,
    getContactsForEvent
};

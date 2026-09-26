const db = require("../config/db");

// ======================================================
// CHECKLIST & CONTROLS – EMAIL ROUTING
// ======================================================
//
// Recipients for Checklist / Action Point emails are now managed like
// the New Store Opening email routing:
//
//   1. A named contact list (Role / Name / Email) with per-event
//      switches — Submission, Action Point generated, Status changed,
//      Completed. No more "every administrator" broadcast.
//
//   2. The SPECIFIC store manager of the store the checklist belongs to
//      (never managers of other stores).
//
//   3. Optionally the person who submitted the checklist.
// ======================================================

const DEFAULT_SETTINGS = {
    checklist_submitted_enabled: 1,
    action_point_created_enabled: 1,
    action_point_status_enabled: 1,
    action_point_completed_enabled: 1,
    // Kept for backwards compatibility – no longer used for routing.
    admin_recipients_enabled: 0,
    store_manager_recipients_enabled: 1,
    submitter_recipients_enabled: 1
};

// Fallback defaults (used only when the NSO contact list is not
// available to copy from).
const DEFAULT_RECIPIENTS = [
    ["retail_head", "Retail Head", "Vijay Vyas", "retailhead@miarcus.com"],
    ["vm_head", "VM Head", "VM Head", "vmhead@miarcus.com"],
    ["offline_sales", "Offline Sales", "Garima", "offlinesales@miarcus.com"],
    ["hr", "HR", "Rakhi HR Delhi", "hr@miarcus.com"],
    ["inventory", "Inventory", "Rajesh", "inventory@miarcus.com"],
    ["it", "IT", "IT", "it@miarcus.com"]
];

const RECIPIENT_EVENT_FIELDS = {
    CHECKLIST_SUBMITTED: "send_on_submission",
    ACTION_POINT_CREATED: "send_on_ap_created",
    ACTION_POINT_STATUS: "send_on_ap_status",
    ACTION_POINT_COMPLETED: "send_on_ap_completed"
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

const tableExists = async (table) => {
    const rows = await db.query(`
        SELECT COUNT(*) AS total
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
    `, [table]);
    return Number(rows?.[0]?.total || 0) > 0;
};

const ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS checklist_email_settings (
            id INT NOT NULL PRIMARY KEY,
            checklist_submitted_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_created_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_status_enabled TINYINT(1) NOT NULL DEFAULT 1,
            action_point_completed_enabled TINYINT(1) NOT NULL DEFAULT 1,
            admin_recipients_enabled TINYINT(1) NOT NULL DEFAULT 0,
            store_manager_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1,
            submitter_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await columnExists("checklist_email_settings", "submitter_recipients_enabled"))) {
        await db.query(`
            ALTER TABLE checklist_email_settings
            ADD COLUMN submitter_recipients_enabled TINYINT(1) NOT NULL DEFAULT 1
        `);
    }

    await db.query(`
        INSERT INTO checklist_email_settings
            (id, checklist_submitted_enabled, action_point_created_enabled,
             action_point_status_enabled, action_point_completed_enabled,
             admin_recipients_enabled, store_manager_recipients_enabled,
             submitter_recipients_enabled)
        VALUES (1, 1, 1, 1, 1, 0, 1, 1)
        ON DUPLICATE KEY UPDATE id=id
    `);

    // The "all administrators" broadcast is replaced by the contact list.
    await db.query(`UPDATE checklist_email_settings SET admin_recipients_enabled = 0 WHERE id = 1`);

    await db.query(`
        CREATE TABLE IF NOT EXISTS checklist_email_recipients (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            role_key VARCHAR(80) NOT NULL UNIQUE,
            role_label VARCHAR(120) NOT NULL,
            contact_name VARCHAR(160) NULL,
            email VARCHAR(255) NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            send_on_submission TINYINT(1) NOT NULL DEFAULT 1,
            send_on_ap_created TINYINT(1) NOT NULL DEFAULT 1,
            send_on_ap_status TINYINT(1) NOT NULL DEFAULT 1,
            send_on_ap_completed TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_checklist_email_enabled (enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed once. After that the admin fully controls the list
    // (rows removed in the UI stay removed).
    const existing = await db.query(`SELECT COUNT(*) AS total FROM checklist_email_recipients`);
    if (Number(existing?.[0]?.total || 0) === 0) {
        let seed = [];

        try {
            if (await tableExists("nso_email_recipients")) {
                const nso = await db.query(`
                    SELECT role_key, role_label, contact_name, email
                    FROM nso_email_recipients
                    WHERE email IS NOT NULL AND TRIM(email) <> ''
                    ORDER BY id ASC
                `);
                seed = (nso || []).map((row) => [row.role_key, row.role_label, row.contact_name, row.email]);
            }
        } catch (error) {
            console.warn("Checklist email: could not copy NSO contacts:", error.message);
        }

        if (!seed.length) seed = DEFAULT_RECIPIENTS;

        for (const [roleKey, roleLabel, name, email] of seed) {
            await db.query(`
                INSERT INTO checklist_email_recipients
                    (role_key, role_label, contact_name, email, enabled,
                     send_on_submission, send_on_ap_created, send_on_ap_status, send_on_ap_completed)
                VALUES (?, ?, ?, ?, 1, 1, 1, 1, 1)
                ON DUPLICATE KEY UPDATE role_label = VALUES(role_label)
            `, [roleKey, roleLabel, name || null, email || null]);
        }
    }
};

const getRecipientsList = async () => db.query(`
    SELECT id, role_key, role_label, contact_name, email, enabled,
           send_on_submission, send_on_ap_created, send_on_ap_status, send_on_ap_completed
    FROM checklist_email_recipients
    ORDER BY id ASC
`);

const getSettings = async () => {
    const rows = await db.query(`
        SELECT checklist_submitted_enabled,
               action_point_created_enabled,
               action_point_status_enabled,
               action_point_completed_enabled,
               admin_recipients_enabled,
               store_manager_recipients_enabled,
               submitter_recipients_enabled
        FROM checklist_email_settings
        WHERE id = 1
        LIMIT 1
    `);

    let recipients = [];
    try {
        recipients = await getRecipientsList();
    } catch (error) {
        console.error("Checklist email recipients load failed:", error.message);
    }

    return { ...DEFAULT_SETTINGS, ...(rows?.[0] || {}), recipients };
};

const cleanEmail = (value) => String(value || "").trim().toLowerCase().slice(0, 255);
const flag = (value, fallback = 1) =>
    value === undefined || value === null ? fallback : (value === true || Number(value) === 1 || value === "1" ? 1 : 0);

const saveSettings = async (payload = {}) => {
    const settings = {
        checklist_submitted_enabled: flag(payload.checklist_submitted_enabled),
        action_point_created_enabled: flag(payload.action_point_created_enabled),
        action_point_status_enabled: flag(payload.action_point_status_enabled),
        action_point_completed_enabled: flag(payload.action_point_completed_enabled),
        store_manager_recipients_enabled: flag(payload.store_manager_recipients_enabled),
        submitter_recipients_enabled: flag(payload.submitter_recipients_enabled)
    };

    await db.query(`
        UPDATE checklist_email_settings
        SET checklist_submitted_enabled = ?,
            action_point_created_enabled = ?,
            action_point_status_enabled = ?,
            action_point_completed_enabled = ?,
            admin_recipients_enabled = 0,
            store_manager_recipients_enabled = ?,
            submitter_recipients_enabled = ?
        WHERE id = 1
    `, [
        settings.checklist_submitted_enabled,
        settings.action_point_created_enabled,
        settings.action_point_status_enabled,
        settings.action_point_completed_enabled,
        settings.store_manager_recipients_enabled,
        settings.submitter_recipients_enabled
    ]);

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
                INSERT INTO checklist_email_recipients
                    (role_key, role_label, contact_name, email, enabled,
                     send_on_submission, send_on_ap_created, send_on_ap_status, send_on_ap_completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    role_label = VALUES(role_label),
                    contact_name = VALUES(contact_name),
                    email = VALUES(email),
                    enabled = VALUES(enabled),
                    send_on_submission = VALUES(send_on_submission),
                    send_on_ap_created = VALUES(send_on_ap_created),
                    send_on_ap_status = VALUES(send_on_ap_status),
                    send_on_ap_completed = VALUES(send_on_ap_completed)
            `, [
                roleKey,
                String(item.role_label || item.contact_name || "Recipient").trim().slice(0, 120),
                String(item.contact_name || "").trim().slice(0, 160) || null,
                email || null,
                flag(item.enabled),
                flag(item.send_on_submission),
                flag(item.send_on_ap_created),
                flag(item.send_on_ap_status),
                flag(item.send_on_ap_completed)
            ]);
        }

        // Rows removed in the UI are removed here too.
        if (keep.length) {
            await db.query(
                `DELETE FROM checklist_email_recipients WHERE role_key NOT IN (${keep.map(() => "?").join(",")})`,
                keep
            );
        } else {
            await db.query(`DELETE FROM checklist_email_recipients`);
        }
    }

    return getSettings();
};

// Contacts that should receive a given workflow event.
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
    DEFAULT_RECIPIENTS,
    RECIPIENT_EVENT_FIELDS,
    ensureTables,
    getSettings,
    saveSettings,
    getContactsForEvent
};

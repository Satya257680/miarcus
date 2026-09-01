const db = require("../config/db");

const DEFAULT_RECIPIENTS = [
    ["hr", "HR", "Rakhi HR Delhi", "hr@miarcus.com"],
    ["retail_head", "Retail Head", "Retail Head", "retailhead@miarcus.com"],
    ["offline_sales", "Offline Sales", "Garima", "offlinesales@miarcus.com"],
    ["ea", "EA", "Harbinder", "ea@miarcus.com"],
    ["affinity", "Affinity", "Pooja", "affinity@miarcus.com"],
    ["inventory", "Inventory", "Rajesh", "inventory@miarcus.com"],
    ["offline", "Offline", "Sohit Mishra", "offline@miarcus.com"],
    ["sales3", "Sales 3", "Shubham", "sales3@miarcus.com"],
    ["sales1", "Sales 1", "Ashish", "sales1@miarcus.com"],
    ["sales", "Sales", "Naveen Sharma", "sales@miarcus.com"],
    ["accounts", "Accounts", "Accounts", "accounts@miarcus.com"],
    ["bd_north", "BD North", "Kamaldeep Sir", "bdnorth@miarcus.com"],
    ["it", "IT", "IT", "it@miarcus.com"],
    ["vm_head", "VM Head", "VM Head", "vmhead@miarcus.com"],
    ["owner", "Owner", "Owner", ""],
    ["admin", "Admin", "Admin", ""],
    ["super_admin", "Super Admin", "Super Admin", ""]
];

const ensureTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS nso_email_settings (
            id INT NOT NULL PRIMARY KEY,
            create_recipient_mode VARCHAR(20) NOT NULL DEFAULT 'all',
            update_recipient_mode VARCHAR(20) NOT NULL DEFAULT 'all',
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS nso_email_recipients (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            role_key VARCHAR(80) NOT NULL UNIQUE,
            role_label VARCHAR(120) NOT NULL,
            contact_name VARCHAR(160) NULL,
            email VARCHAR(255) NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            send_on_create TINYINT(1) NOT NULL DEFAULT 1,
            send_on_update TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nso_email_enabled (enabled)
        )
    `);
    await db.query(`
        INSERT INTO nso_email_settings (id, create_recipient_mode, update_recipient_mode)
        VALUES (1, 'all', 'all')
        ON DUPLICATE KEY UPDATE id=id
    `);
    for (const [roleKey, roleLabel, name, email] of DEFAULT_RECIPIENTS) {
        await db.query(`
            INSERT INTO nso_email_recipients
                (role_key, role_label, contact_name, email, enabled, send_on_create, send_on_update)
            VALUES (?, ?, ?, ?, 1, 1, 1)
            ON DUPLICATE KEY UPDATE role_label=VALUES(role_label)
        `, [roleKey, roleLabel, name, email || null]);
    }
};

const getSettings = async () => {
    const rows = await db.query(`SELECT create_recipient_mode, update_recipient_mode FROM nso_email_settings WHERE id=1 LIMIT 1`);
    const recipients = await db.query(`SELECT id, role_key, role_label, contact_name, email, enabled, send_on_create, send_on_update FROM nso_email_recipients ORDER BY id ASC`);
    return {
        create_recipient_mode: rows?.[0]?.create_recipient_mode || "all",
        update_recipient_mode: rows?.[0]?.update_recipient_mode || "all",
        recipients
    };
};

const saveSettings = async (payload = {}) => {
    const createMode = payload.create_recipient_mode === "specific" ? "specific" : "all";
    const updateMode = payload.update_recipient_mode === "specific" ? "specific" : "all";
    await db.query(`UPDATE nso_email_settings SET create_recipient_mode=?, update_recipient_mode=? WHERE id=1`, [createMode, updateMode]);
    for (const item of (Array.isArray(payload.recipients) ? payload.recipients : [])) {
        if (!item?.role_key) continue;
        const roleKey = String(item.role_key).trim().slice(0, 80);
        const roleLabel = String(item.role_label || item.contact_name || roleKey).trim().slice(0, 120);
        await db.query(`
            INSERT INTO nso_email_recipients
                (role_key, role_label, contact_name, email, enabled, send_on_create, send_on_update)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                role_label=VALUES(role_label),
                contact_name=VALUES(contact_name),
                email=VALUES(email),
                enabled=VALUES(enabled),
                send_on_create=VALUES(send_on_create),
                send_on_update=VALUES(send_on_update)
        `, [
            roleKey,
            roleLabel,
            String(item.contact_name || "").trim().slice(0, 160) || null,
            String(item.email || "").trim().toLowerCase().slice(0, 255) || null,
            item.enabled ? 1 : 0,
            item.send_on_create ? 1 : 0,
            item.send_on_update ? 1 : 0
        ]);
    }
    return getSettings();
};

const getRecipientsForEvent = async (event) => {
    const settings = await getSettings();
    const mode = event === "updated" ? settings.update_recipient_mode : settings.create_recipient_mode;
    return settings.recipients.filter(row =>
        Number(row.enabled) === 1 && String(row.email || "").trim() &&
        (mode === "all" || (event === "updated" ? Number(row.send_on_update) === 1 : Number(row.send_on_create) === 1))
    );
};

module.exports = { DEFAULT_RECIPIENTS, ensureTables, getSettings, saveSettings, getRecipientsForEvent };

const db = require("../config/db");

// ======================================================
// TRAVEL PLAN – EMAIL ROUTING
// ======================================================
//
// Same pattern as Petty Cash / Checklist / Action Point routing:
//
//   • master_enabled   – OFF = nobody receives any Travel Plan email
//                        (not the approvers, not the employee, not
//                        the contacts).
//   • per-event switches (plan submitted, approved, rejected, actual
//     stores updated, remark added, plan deleted).
//   • Specific contacts with a tick per event.
//   • The employee who filled the visit plan (and the person who
//     created it, when someone else created it for them).
//   • Approvers (reporting manager + administrators) for the
//     "submitted for approval" email.
// ======================================================

const EVENTS = [
    "plan_submitted",
    "plan_approved",
    "plan_rejected",
    "actual_updated",
    "remark_added",
    "plan_deleted"
];

const DEFAULT_SETTINGS = {
    master_enabled: 1,
    plan_submitted: 1,
    plan_approved: 1,
    plan_rejected: 1,
    actual_updated: 1,
    remark_added: 1,
    plan_deleted: 1,
    include_employee: 1,
    include_approvers: 1
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let ready = false;

const flag = (value, fallback = 1) =>
    value === undefined || value === null
        ? fallback
        : value === true || Number(value) === 1 || value === "1"
            ? 1
            : 0;

const ensureTables = async () => {
    if (ready) return;

    await db.query(`
        CREATE TABLE IF NOT EXISTS travel_plan_email_settings (
            id INT NOT NULL PRIMARY KEY,
            master_enabled TINYINT(1) NOT NULL DEFAULT 1,
            plan_submitted TINYINT(1) NOT NULL DEFAULT 1,
            plan_approved TINYINT(1) NOT NULL DEFAULT 1,
            plan_rejected TINYINT(1) NOT NULL DEFAULT 1,
            actual_updated TINYINT(1) NOT NULL DEFAULT 1,
            remark_added TINYINT(1) NOT NULL DEFAULT 1,
            plan_deleted TINYINT(1) NOT NULL DEFAULT 1,
            include_employee TINYINT(1) NOT NULL DEFAULT 1,
            include_approvers TINYINT(1) NOT NULL DEFAULT 1,
            updated_by INT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
        INSERT INTO travel_plan_email_settings (id) VALUES (1)
        ON DUPLICATE KEY UPDATE id = id
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS travel_plan_email_recipients (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            role_key VARCHAR(120) NOT NULL UNIQUE,
            role_label VARCHAR(150) NOT NULL DEFAULT 'Recipient',
            contact_name VARCHAR(160) NULL,
            email VARCHAR(255) NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            plan_submitted TINYINT(1) NOT NULL DEFAULT 1,
            plan_approved TINYINT(1) NOT NULL DEFAULT 1,
            plan_rejected TINYINT(1) NOT NULL DEFAULT 1,
            actual_updated TINYINT(1) NOT NULL DEFAULT 1,
            remark_added TINYINT(1) NOT NULL DEFAULT 1,
            plan_deleted TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_tper_enabled (enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    ready = true;
};

const getRecipientsList = async () => {
    await ensureTables();
    const rows = await db.query(`
        SELECT id, role_key, role_label, contact_name, email, enabled, ${EVENTS.join(", ")}
        FROM travel_plan_email_recipients
        ORDER BY id ASC
    `);
    return (rows || []).map((row) => {
        const out = { ...row, enabled: Number(row.enabled) === 1 };
        EVENTS.forEach((event) => { out[event] = Number(row[event]) === 1; });
        return out;
    });
};

const getSettings = async () => {
    await ensureTables();
    const rows = await db.query(`
        SELECT ${SETTING_KEYS.join(", ")}
        FROM travel_plan_email_settings
        WHERE id = 1
        LIMIT 1
    `);
    const row = rows?.[0] || {};
    const settings = {};
    SETTING_KEYS.forEach((key) => {
        settings[key] = row[key] === undefined ? Boolean(DEFAULT_SETTINGS[key]) : Number(row[key]) === 1;
    });
    return { ...settings, recipients: await getRecipientsList() };
};

const saveSettings = async (payload = {}, userId = null) => {
    await ensureTables();

    const values = SETTING_KEYS.map((key) => flag(payload[key], DEFAULT_SETTINGS[key]));
    await db.query(`
        UPDATE travel_plan_email_settings
        SET ${SETTING_KEYS.map((key) => `${key} = ?`).join(", ")}, updated_by = ?
        WHERE id = 1
    `, [...values, userId]);

    if (Array.isArray(payload.recipients)) {
        const keep = [];
        for (const item of payload.recipients) {
            if (!item) continue;
            const roleKey = String(item.role_key || "").trim().slice(0, 120);
            if (!roleKey) continue;
            const email = String(item.email || "").trim().toLowerCase().slice(0, 255);
            if (!email) continue;
            if (!EMAIL_RE.test(email)) {
                const err = new Error(`Invalid email address: ${email}`);
                err.statusCode = 400;
                throw err;
            }
            keep.push(roleKey);
            await db.query(`
                INSERT INTO travel_plan_email_recipients
                    (role_key, role_label, contact_name, email, enabled, ${EVENTS.join(", ")})
                VALUES (?, ?, ?, ?, ?, ${EVENTS.map(() => "?").join(", ")})
                ON DUPLICATE KEY UPDATE
                    role_label = VALUES(role_label),
                    contact_name = VALUES(contact_name),
                    email = VALUES(email),
                    enabled = VALUES(enabled),
                    ${EVENTS.map((event) => `${event} = VALUES(${event})`).join(",\n                    ")}
            `, [
                roleKey,
                String(item.role_label || "Recipient").trim().slice(0, 150) || "Recipient",
                String(item.contact_name || "").trim().slice(0, 160) || null,
                email,
                flag(item.enabled),
                ...EVENTS.map((event) => flag(item[event]))
            ]);
        }

        if (keep.length) {
            await db.query(
                `DELETE FROM travel_plan_email_recipients WHERE role_key NOT IN (${keep.map(() => "?").join(",")})`,
                keep
            );
        } else {
            await db.query(`DELETE FROM travel_plan_email_recipients`);
        }
    }

    return getSettings();
};

const getContactsForEvent = async (event) => {
    if (!EVENTS.includes(event)) return [];
    const rows = await getRecipientsList();
    return rows.filter((row) => row.enabled && row[event] && EMAIL_RE.test(String(row.email || "").trim()));
};

module.exports = {
    EVENTS,
    DEFAULT_SETTINGS,
    ensureTables,
    getSettings,
    saveSettings,
    getContactsForEvent
};

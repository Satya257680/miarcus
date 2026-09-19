// ==========================================================
// MIARCUS — PASSWORD VAULT MODEL
// ==========================================================
//
// Backs the admin-only "Password Management" screen:
//
// - Adds the extra columns it needs onto the existing
//   `users` table (safe/additive — never touches existing
//   columns or data).
// - Lists every user with their name, email and current
//   (decryptable) password for Administrators / Super Admins.
// - Lets an Administrator set/update a user's password.
// - Tracks who is allowed to use the "Forgot Password"
//   self-service flow (Super Admin only — see authController).
// ==========================================================

const db = require("../config/db");

// ==========================================================
// SCHEMA MIGRATION (additive — safe to run on every boot)
// ==========================================================

async function addColumnIfMissing(table, column, definition) {

    const rows = await db.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
        [table, column]
    );

    if (Number(rows?.[0]?.count || 0) === 0) {
        await db.query(
            `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
        );
    }
}

async function ensurePasswordVaultSchema() {

    // Encrypted, reversible copy of the user's current password —
    // separate from the one-way bcrypt hash used for login.
    await addColumnIfMissing("users", "password_vault", "TEXT NULL");

    // Marks the single account (the app creator / owner) that is still
    // allowed to use self-service "Forgot Password".
    await addColumnIfMissing("users", "is_super_admin", "TINYINT(1) NOT NULL DEFAULT 0");

    await addColumnIfMissing("users", "password_updated_at", "DATETIME NULL");
    await addColumnIfMissing("users", "password_updated_by", "INT NULL");
}

// ==========================================================
// DEFAULT / BOOTSTRAP SUPER ADMIN
// ==========================================================
//
// The application must always have exactly one guaranteed
// Super Admin so nobody can ever be permanently locked out of
// "Forgot Password". If no user currently has the flag set
// (fresh install, or it was accidentally revoked from
// everyone), this account is automatically (re)granted Super
// Admin on the next server start.
//
// Override with DEFAULT_SUPER_ADMIN_EMAIL if needed — defaults
// to Satyajit Nayak's account, the application's owner/creator.
// ==========================================================

const DEFAULT_SUPER_ADMIN_EMAIL = String(
    process.env.DEFAULT_SUPER_ADMIN_EMAIL ||
    "miarcus.notifications@gmail.com"
).trim().toLowerCase();

async function ensureDefaultSuperAdmin() {

    if (!DEFAULT_SUPER_ADMIN_EMAIL) {
        return;
    }

    const existing = await db.query(
        `SELECT COUNT(*) AS count FROM users WHERE is_super_admin = 1`
    );

    if (Number(existing?.[0]?.count || 0) > 0) {
        // A Super Admin already exists — never override it automatically.
        return;
    }

    const result = await db.query(
        `UPDATE users SET is_super_admin = 1 WHERE email = ? LIMIT 1`,
        [DEFAULT_SUPER_ADMIN_EMAIL]
    );

    if (Number(result?.affectedRows || 0) > 0) {
        console.log(
            `✅ Super Admin bootstrap: ${DEFAULT_SUPER_ADMIN_EMAIL} granted Super Admin access.`
        );
    } else {
        console.warn(
            `⚠️ Super Admin bootstrap: no user found with email ${DEFAULT_SUPER_ADMIN_EMAIL}. No Super Admin is set.`
        );
    }
}

// ==========================================================
// LIST ALL USERS FOR THE PASSWORD VAULT
// ==========================================================

async function listVaultUsers() {

    return db.query(`
        SELECT
            u.id,
            u.employee_id,
            u.name,
            u.email,
            u.is_admin,
            u.is_super_admin,
            u.status,
            u.is_activated,
            u.password_vault,
            u.password_updated_at,
            updater.name AS password_updated_by_name
        FROM users u
        LEFT JOIN users updater
            ON updater.id = u.password_updated_by
        ORDER BY u.name ASC
    `);
}

// ==========================================================
// GET A SINGLE USER (for validation before updating)
// ==========================================================

async function getVaultUserById(id) {

    const rows = await db.query(
        `SELECT id, employee_id, name, email, is_admin, is_super_admin
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows?.[0] || null;
}

// ==========================================================
// SET / UPDATE A USER'S PASSWORD
// ==========================================================
//
// - Stores the bcrypt hash used for real authentication.
// - Stores the encrypted, viewable copy for the vault screen.
// - Activates the account (so a brand-new user created with
//   an admin-supplied password can sign in immediately).
// - Bumps token_version so any existing session for that user
//   is forced to sign in again with the new password.
// ==========================================================

async function setUserPassword(userId, hashedPassword, encryptedPassword, updatedByUserId) {

    await db.query(
        `UPDATE users
         SET
            password = ?,
            password_vault = ?,
            password_updated_at = NOW(),
            password_updated_by = ?,
            is_activated = 1,
            token_version = COALESCE(token_version, 0) + 1
         WHERE id = ?`,
        [
            hashedPassword,
            encryptedPassword,
            updatedByUserId || null,
            userId
        ]
    );
}

// ==========================================================
// SUPER ADMIN CHECKS
// ==========================================================
//
// A Super Admin can be granted two ways:
//
// 1. Listed (by email) in the SUPER_ADMIN_EMAILS environment
//    variable — comma separated. This is the bootstrap path:
//    set it once to your own email so you always retain
//    "Forgot Password" access even before the database flag
//    has been set.
//
// 2. The `is_super_admin` flag on their user row, which an
//    existing Super Admin can grant from the Password
//    Management screen.
// ==========================================================

function isEnvSuperAdmin(email) {

    const list = String(process.env.SUPER_ADMIN_EMAILS || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    return list.includes(String(email || "").trim().toLowerCase());
}

async function isSuperAdminByEmail(email) {

    if (!email) return false;

    if (isEnvSuperAdmin(email)) {
        return true;
    }

    const rows = await db.query(
        `SELECT is_super_admin FROM users WHERE email = ? LIMIT 1`,
        [String(email).trim().toLowerCase()]
    );

    return Number(rows?.[0]?.is_super_admin || 0) === 1;
}

async function setSuperAdminFlag(userId, value) {

    await db.query(
        `UPDATE users SET is_super_admin = ? WHERE id = ?`,
        [value ? 1 : 0, userId]
    );
}

module.exports = {
    ensurePasswordVaultSchema,
    ensureDefaultSuperAdmin,
    listVaultUsers,
    getVaultUserById,
    setUserPassword,
    isEnvSuperAdmin,
    isSuperAdminByEmail,
    setSuperAdminFlag
};

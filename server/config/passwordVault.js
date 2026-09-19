// ==========================================================
// MIARCUS — PASSWORD VAULT ENCRYPTION
// ==========================================================
//
// The application authenticates users with a one-way bcrypt
// hash (see config/security.js) — that hash can never be
// reversed back into the original password, by design.
//
// The new admin-facing "Password Management" screen needs a
// way to let an Administrator / Super Admin look up and
// manage the *current* password of any user (set at account
// creation, or whenever an admin updates it). Because that
// requires the original value to be recoverable, it is kept
// separately from the login hash, encrypted at rest with
// AES-256-GCM using a server-only secret that never leaves
// this backend.
//
// IMPORTANT:
// Set PASSWORD_VAULT_KEY in the server environment to a long,
// random secret (32+ characters). If it is not set, the
// existing JWT_SECRET is reused so the feature still works
// out of the box, but a dedicated key is strongly recommended
// in production.
// ==========================================================

const crypto = require("crypto");

const rawSecret = String(
    process.env.PASSWORD_VAULT_KEY ||
    process.env.JWT_SECRET ||
    ""
).trim();

if (!rawSecret) {
    throw new Error(
        "FATAL: PASSWORD_VAULT_KEY (or JWT_SECRET) is required to encrypt stored passwords."
    );
}

// AES-256-GCM needs exactly a 32-byte key — derive one from
// whatever length secret is configured.
const ENCRYPTION_KEY = crypto
    .createHash("sha256")
    .update(rawSecret)
    .digest();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a plain-text password for storage in users.password_vault.
 * Returns a base64 string containing iv + authTag + ciphertext.
 */
function encryptPassword(plainText) {

    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        ENCRYPTION_KEY,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(String(plainText || ""), "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypt a value previously produced by encryptPassword().
 * Returns null if the value is missing or cannot be decrypted
 * (e.g. it was encrypted with a different key).
 */
function decryptPassword(payload) {

    if (!payload) {
        return null;
    }

    try {

        const raw = Buffer.from(String(payload), "base64");

        const iv = raw.subarray(0, IV_LENGTH);
        const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            ENCRYPTION_KEY,
            iv
        );

        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString("utf8");

    } catch (error) {

        console.error("Password vault decrypt failed:", error.message);
        return null;

    }
}

module.exports = {
    encryptPassword,
    decryptPassword
};

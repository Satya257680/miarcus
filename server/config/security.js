const crypto = require("crypto");

const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        "FATAL: JWT_SECRET is required and must be at least 32 characters long."
    );
}

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = String(process.env.JWT_ISSUER || "miarcus-api").trim();
const JWT_AUDIENCE = String(
    process.env.JWT_AUDIENCE || "miarcus-client"
).trim();

// Keep the authenticated work session available for a full workday.
const ACCESS_TOKEN_TTL = "8h";

// Short-lived token used for protected file access.
const FILE_TOKEN_TTL = "10m";

// Short-lived password-reset token.
const RESET_TOKEN_TTL = "10m";

const BCRYPT_ROUNDS = 12;

// OTP configuration.
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;

/**
 * Hash an OTP before storing/comparing it.
 */
function hashOtp(otp) {
    return crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");
}

/**
 * Generate a numeric OTP.
 */
function generateOtp() {
    const max = 10 ** OTP_LENGTH;

    return String(
        crypto.randomInt(0, max)
    ).padStart(OTP_LENGTH, "0");
}

/**
 * Generate a cryptographically random reset-token JTI.
 */
function generateResetJti() {
    return crypto.randomBytes(32).toString("hex");
}

/**
 * Normalize an email address.
 *
 * IMPORTANT:
 * Do NOT restrict the domain here.
 *
 * Supported examples:
 *   user@gmail.com
 *   user@jawandson.com
 *   user@miarcus.com
 *   user@miarcus.in
 *   user@company.in
 *   user@company.co.uk
 *   user@anything.com
 */
function normalizeEmail(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

/**
 * Validate an email address.
 *
 * This intentionally does NOT whitelist specific domains.
 * Any syntactically valid email domain is accepted.
 *
 * Examples accepted:
 *   abc@gmail.com
 *   abc@jawandson.com
 *   abc@miarcus.com
 *   abc@miarcus.in
 *   abc@company.co.in
 *   abc@company.co.uk
 */
function validateEmail(email) {
    const value = normalizeEmail(email);

    if (!value) {
        return "Email address is required.";
    }

    // Basic practical email validation.
    //
    // Local part:
    // - Allows letters, numbers and common email characters.
    //
    // Domain:
    // - Allows normal domain names and subdomains.
    // - Does NOT restrict .com, .in, .org, etc.
    //
    // Therefore domains such as:
    // gmail.com
    // jawandson.com
    // miarcus.com
    // miarcus.in
    // company.co.uk
    // are all allowed.
    const emailRegex =
        /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

    if (!emailRegex.test(value)) {
        return "Please enter a valid email address.";
    }

    // RFC-compatible practical maximum.
    if (value.length > 254) {
        return "Email address is too long.";
    }

    return null;
}

/**
 * Validate password requirements.
 */
function validatePassword(password) {
    const value = String(password || "");

    if (value.length < 8) {
        return "Password must be 8–10 characters long.";
    }

    if (value.length > 10) {
        return "Password must be 8–10 characters long.";
    }

    if (!/[A-Z]/.test(value)) {
        return "Password must contain at least one uppercase letter.";
    }

    if (!/[a-z]/.test(value)) {
        return "Password must contain at least one lowercase letter.";
    }

    if (!/[0-9]/.test(value)) {
        return "Password must contain at least one number.";
    }

    if (!/[^A-Za-z0-9]/.test(value)) {
        return "Password must contain at least one special character.";
    }

    return null;
}

module.exports = {
    JWT_SECRET,
    JWT_ALGORITHM,
    JWT_ISSUER,
    JWT_AUDIENCE,
    ACCESS_TOKEN_TTL,
    FILE_TOKEN_TTL,
    RESET_TOKEN_TTL,
    BCRYPT_ROUNDS,
    OTP_TTL_MS,
    OTP_LENGTH,
    hashOtp,
    generateOtp,
    generateResetJti,
    normalizeEmail,
    validateEmail,
    validatePassword,
};
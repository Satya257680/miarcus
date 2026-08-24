const crypto = require("crypto");

const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        "FATAL: JWT_SECRET is required and must be at least 32 characters long."
    );
}

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = String(process.env.JWT_ISSUER || "miarcus-api").trim();
const JWT_AUDIENCE = String(process.env.JWT_AUDIENCE || "miarcus-client").trim();
const ACCESS_TOKEN_TTL = "30m";
const FILE_TOKEN_TTL = "10m";
const RESET_TOKEN_TTL = "10m";
const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;

function hashOtp(otp) {
    return crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");
}

function generateOtp() {
    const max = 10 ** OTP_LENGTH;
    return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

function generateResetJti() {
    return crypto.randomBytes(32).toString("hex");
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function validatePassword(password) {
    const value = String(password || "");

    if (value.length < 12) {
        return "Password must contain at least 12 characters.";
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
    validatePassword,
};

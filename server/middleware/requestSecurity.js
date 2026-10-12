const crypto = require("crypto");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Single source of truth shared with the CORS config in server.js, so a
// browser origin that passes CORS is never rejected by originGuard.
const DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://rytual2.miarcus.com",
];

function getAllowedOrigins() {
    const fromEnv = [
        process.env.ALLOWED_ORIGINS,
        process.env.FRONTEND_URL,
    ]
        .filter(Boolean)
        .join(",")
        .split(",");

    return [...new Set(
        [...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]
            .map((value) => String(value || "").trim().replace(/\/+$/, ""))
            .filter(Boolean)
    )];
}

function isAllowedBrowserOrigin(origin) {
    if (!origin) return true;
    const normalized = String(origin).trim().replace(/\/+$/, "");
    const exact = getAllowedOrigins();
    if (exact.includes(normalized)) return true;

    return false;
}

const requestId = (req, res, next) => {
    const incoming = String(req.get("X-Request-ID") || "").trim();
    const id = /^[A-Za-z0-9._:-]{8,100}$/.test(incoming)
        ? incoming
        : crypto.randomUUID();

    req.requestId = id;
    res.setHeader("X-Request-ID", id);
    next();
};

const originGuard = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get("Origin");
    if (!origin || isAllowedBrowserOrigin(origin)) return next();

    return res.status(403).json({
        success: false,
        message: "Request origin is not allowed.",
        requestId: req.requestId,
    });
};

const contentTypeGuard = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const contentLength = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(contentLength) && contentLength > 10 * 1024 * 1024 && !String(req.headers["content-type"] || "").toLowerCase().includes("multipart/form-data")) {
        return res.status(413).json({
            success: false,
            message: "Request body is too large.",
            requestId: req.requestId,
        });
    }

    next();
};

module.exports = {
    requestId,
    originGuard,
    contentTypeGuard,
    isAllowedBrowserOrigin,
    getAllowedOrigins,
};

const { rateLimit } = require("express-rate-limit");

const standard = {
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        requestId: req.requestId,
    }),
};

// Conservative application-wide limit. Authentication has tighter limits
// in authRateLimit.js and is intentionally not replaced by this limiter.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    skip: (req) => req.path === "/health" || req.path === "/test",
    ...standard,
});

const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
    ...standard,
});

module.exports = { apiLimiter, writeLimiter };

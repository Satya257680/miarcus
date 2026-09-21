const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_ALGORITHM } = require("../config/security");

const standard = {
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        requestId: req.requestId,
    }),
};

// ======================================================
// PER-ACTOR KEY
// ======================================================
// Every logged-in browser tab in this app polls the API on its own
// (chat messages, notifications, live employee location, dashboard
// widgets, etc.), and many staff at the same store share one public
// IP address behind their router/NAT. Keying purely by IP means one
// busy store — or even a single user with a couple of tabs open —
// can burn through the whole bucket and lock out everyone else on
// that network with a false-positive 429.
//
// To fix that, the key is the signed-in user's id (from their Bearer
// token) when present, falling back to IP address only for requests
// that aren't authenticated yet. This keeps a meaningful per-identity
// ceiling without punishing an entire shared-IP office/store for
// normal, expected traffic.
// ======================================================

function actorKey(req) {
    const header = String(req.headers?.authorization || "");

    if (header.startsWith("Bearer ")) {
        try {
            const decoded = jwt.verify(header.slice(7).trim(), JWT_SECRET, {
                algorithms: [JWT_ALGORITHM],
            });

            const id = Number(decoded?.id || 0);

            if (Number.isInteger(id) && id > 0) {
                return `user:${id}`;
            }
        } catch {
            // Invalid/expired token — fall through to IP-based keying.
        }
    }

    // Falls back to express-rate-limit's own IPv6-safe helper so a single
    // IPv6 client can't be handed a fresh bucket per request by varying
    // the host part of its address.
    return `ip:${ipKeyGenerator(req.ip || req.socket?.remoteAddress || "unknown")}`;
}

// Conservative application-wide limit. Authentication has tighter limits
// in authRateLimit.js and is intentionally not replaced by this limiter.
//
// Raised from 300 -> 1500 per 15-minute window: the app's real-time
// features (chat polling every few seconds, notifications, live
// location, dashboard auto-refresh) can easily add up to several
// hundred GET requests per active user in that window on their own,
// so 300 was tripping for completely normal usage, not abuse.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1500,
    keyGenerator: actorKey,
    skip: (req) => req.path === "/health" || req.path === "/test",
    ...standard,
});

// Raised from 120 -> 600 per 15-minute window for the same reason —
// normal create/update/delete activity across modules (checklists,
// expenses, attendance, chat, etc.) from one active user was getting
// close to the old ceiling well before any abuse was happening.
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    keyGenerator: actorKey,
    skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
    ...standard,
});

module.exports = { apiLimiter, writeLimiter };

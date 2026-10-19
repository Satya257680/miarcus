// ======================================================
// MIARCUS — SHORT-LIVED, SINGLE-USE SSE STREAM TICKETS
// ------------------------------------------------------
// Browser EventSource cannot send an Authorization header, so the
// notification / chat streams used to receive the full 8-hour login JWT
// in the query string (?token=...). Query strings end up in IIS/ARR
// access logs, proxy logs, browser history and DevTools screenshots.
//
// A stream ticket replaces that:
//   • issued only to an already-authenticated request (Bearer header);
//   • bound to ONE user, ONE purpose ("notifications" | "chat") and the
//     user's current token_version;
//   • valid for STREAM_TICKET_TTL_MS (60 s by default) and usable ONCE;
//   • NOT a JWT — it is an HMAC-signed opaque string with its own derived
//     key, so it can never be replayed as an API Bearer token and an API
//     token can never be accepted as a ticket.
//
// On use, the user is re-checked in MySQL (still Active + activated and
// same token_version), so a revoked or deactivated session cannot open
// a stream.
//
// Single-use tracking is in-memory per Node process. MIARCUS runs one
// Node process behind IIS; if it is ever clustered, a ticket could be
// replayed once on a different process within its 60 s life — documented
// and acceptable for a read-only notification stream.
// ======================================================

const crypto = require("crypto");
const { JWT_SECRET } = require("../config/security");

const TICKET_VERSION = "st1";
const PURPOSES = new Set(["notifications", "chat"]);

const STREAM_TICKET_TTL_MS = Math.min(
    Math.max(Number(process.env.STREAM_TICKET_TTL_MS) || 60 * 1000, 10 * 1000),
    5 * 60 * 1000
);

// Separate key so a ticket signature can never be confused with a JWT
// signature made with JWT_SECRET.
const TICKET_KEY = crypto
    .createHmac("sha256", JWT_SECRET)
    .update("miarcus:sse-stream-ticket:v1")
    .digest();

const b64url = (input) => Buffer.from(input).toString("base64url");

const sign = (body) =>
    crypto.createHmac("sha256", TICKET_KEY).update(body).digest("base64url");

// jti -> expiry (ms). Bounded so a flood of tickets cannot grow memory.
const usedTickets = new Map();
const MAX_TRACKED_TICKETS = 50000;

const purgeUsed = (now = Date.now()) => {
    for (const [jti, expiresAt] of usedTickets) {
        if (expiresAt <= now) usedTickets.delete(jti);
    }
    // Hard bound: drop the oldest entries if still too large.
    while (usedTickets.size > MAX_TRACKED_TICKETS) {
        const oldest = usedTickets.keys().next().value;
        usedTickets.delete(oldest);
    }
};

const purgeTimer = setInterval(() => purgeUsed(), 60 * 1000);
purgeTimer.unref?.();

/**
 * Issue a ticket for an authenticated user.
 * @returns {{ ticket: string, expiresIn: number }}
 */
function issueStreamTicket({ userId, tokenVersion = 0, purpose }, now = Date.now()) {
    const uid = Number(userId);
    if (!Number.isSafeInteger(uid) || uid <= 0) {
        throw new Error("A valid user id is required for a stream ticket");
    }
    if (!PURPOSES.has(purpose)) {
        throw new Error("Unknown stream ticket purpose");
    }

    const payload = {
        v: TICKET_VERSION,
        uid,
        tv: Number(tokenVersion || 0),
        p: purpose,
        exp: now + STREAM_TICKET_TTL_MS,
        jti: crypto.randomBytes(16).toString("hex"),
    };

    const body = b64url(JSON.stringify(payload));
    return {
        ticket: `${body}.${sign(body)}`,
        expiresIn: Math.round(STREAM_TICKET_TTL_MS / 1000),
    };
}

/**
 * Verify signature, purpose, expiry and single use. No database access.
 * Returns the payload or null. Never throws.
 */
function verifyStreamTicket(ticket, purpose, now = Date.now()) {
    try {
        const value = String(ticket || "");
        if (!value || value.length > 1024) return null;

        const parts = value.split(".");
        if (parts.length !== 2) return null;

        const [body, signature] = parts;
        const expected = Buffer.from(sign(body));
        const given = Buffer.from(String(signature));
        if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
            return null;
        }

        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
        if (!payload || payload.v !== TICKET_VERSION) return null;
        if (payload.p !== purpose || !PURPOSES.has(purpose)) return null;

        const uid = Number(payload.uid);
        if (!Number.isSafeInteger(uid) || uid <= 0) return null;
        if (!Number.isFinite(payload.exp) || payload.exp <= now) return null;
        if (typeof payload.jti !== "string" || !/^[a-f0-9]{32}$/.test(payload.jti)) return null;

        // Single use.
        if (usedTickets.has(payload.jti)) return null;
        usedTickets.set(payload.jti, payload.exp);
        if (usedTickets.size > MAX_TRACKED_TICKETS) purgeUsed(now);

        return { ...payload, uid };
    } catch {
        return null;
    }
}

/**
 * Full check used by the stream endpoints: ticket + current user state.
 * Returns { user } (DB row) or null. Never throws.
 */
async function authenticateStreamTicket(ticket, purpose, loadUser) {
    const payload = verifyStreamTicket(ticket, purpose);
    if (!payload) return null;

    try {
        let user;
        if (typeof loadUser === "function") {
            user = await loadUser(payload.uid);
        } else {
            const db = require("../config/db");
            const rows = await db.query(
                `SELECT id, name, email, status, is_activated, is_admin,
                        COALESCE(token_version, 0) AS token_version
                   FROM users WHERE id = ? LIMIT 1`,
                [payload.uid]
            );
            user = rows?.[0];
        }

        if (!user || user.status !== "Active" || !user.is_activated) return null;
        if (Number(payload.tv || 0) !== Number(user.token_version || 0)) return null;

        return { user, payload };
    } catch (error) {
        console.error("Stream ticket user lookup failed:", error.message);
        return null;
    }
}

/**
 * Legacy path: accept the full login JWT in ?token= only when explicitly
 * enabled (rollback switch). Default: disabled.
 */
const legacyQueryTokenAllowed = () =>
    String(process.env.SSE_ALLOW_LOGIN_TOKEN || "false").toLowerCase() === "true";

module.exports = {
    STREAM_TICKET_TTL_MS,
    issueStreamTicket,
    verifyStreamTicket,
    authenticateStreamTicket,
    legacyQueryTokenAllowed,
    // test helper
    _resetUsedTickets: () => usedTickets.clear(),
};

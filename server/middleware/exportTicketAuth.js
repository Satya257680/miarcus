// ======================================================
// EXPORT DOWNLOAD TICKET
// ======================================================
//
// Large exports are streamed by the server straight into the browser's
// download manager (a normal file download), so the browser never holds
// the rows in memory. A browser download cannot send the
// "Authorization: Bearer …" header, so the page first asks for a
// short-lived DOWNLOAD TICKET (authenticated as usual) and then opens
// the download URL with that ticket.
//
// The ticket:
//   • is a JWT signed with the app secret, valid for 2 minutes,
//   • has its own audience ("…:export") and purpose, so it can never be
//     used as a login token, and a login token can never be used here,
//   • carries the user id + token version and the export filters.
//
// verifyExportTicket re-checks the user exactly like authMiddleware
// (exists, Active, activated, session not revoked) and then puts the
// user on req.user and the ticket's filters on req.query, so the normal
// permission and Filter Access middleware run unchanged after it.
// ======================================================

const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { JWT_SECRET, JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE } = require("../config/security");

const TICKET_AUDIENCE = `${JWT_AUDIENCE}:export`;
const TICKET_TTL_SECONDS = 120;

const signExportTicket = ({ user, purpose, query }) =>
    jwt.sign(
        {
            purpose,
            uid: user.id,
            tv: Number(user.tokenVersion || 0),
            q: query || {}
        },
        JWT_SECRET,
        {
            algorithm: JWT_ALGORITHM,
            issuer: JWT_ISSUER,
            audience: TICKET_AUDIENCE,
            expiresIn: TICKET_TTL_SECONDS
        }
    );

const fail = (res, status, message) =>
    res.status(status).type("text/plain; charset=utf-8").send(message);

const verifyExportTicket = (purpose) => (req, res, next) => {
    const ticket = String(req.query?.ticket || "");
    if (!ticket) return fail(res, 401, "Download link is missing its ticket. Please export again.");

    let decoded;
    try {
        decoded = jwt.verify(ticket, JWT_SECRET, {
            algorithms: [JWT_ALGORITHM],
            issuer: JWT_ISSUER,
            audience: TICKET_AUDIENCE
        });
    } catch {
        return fail(res, 401, "Download link has expired. Please export again.");
    }

    if (decoded.purpose !== purpose || !decoded.uid) {
        return fail(res, 401, "Download link is not valid for this export.");
    }

    db.query(
        "SELECT name, status, is_activated, is_admin, COALESCE(token_version, 0) AS token_version FROM users WHERE id = ? LIMIT 1",
        [decoded.uid],
        (err, rows) => {
            if (err) return fail(res, 500, "Database error. Please try again.");
            const user = rows?.[0];
            if (!user) return fail(res, 401, "User not found.");
            if (user.status !== "Active" || !user.is_activated) return fail(res, 401, "Your account is not active.");
            if (Number(user.token_version || 0) !== Number(decoded.tv || 0)) {
                return fail(res, 401, "Session revoked. Please login again.");
            }

            req.user = {
                id: decoded.uid,
                is_admin: Number(user.is_admin) === 1,
                tokenVersion: Number(user.token_version || 0)
            };

            // Express 5: req.query is a getter that re-parses the URL on
            // every access, so the ticket's filters are attached as an
            // own property (the "ticket" param itself is dropped).
            const query = {};
            Object.entries(decoded.q || {}).forEach(([key, value]) => {
                if (value !== undefined && value !== null && String(value) !== "") query[key] = String(value);
            });
            Object.defineProperty(req, "query", { value: query, writable: true, configurable: true, enumerable: true });

            return next();
        }
    );
};

module.exports = { signExportTicket, verifyExportTicket, TICKET_TTL_SECONDS };

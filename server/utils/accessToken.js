const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { JWT_SECRET, JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE } = require("../config/security");

// ======================================================
// LOGIN ACCESS-TOKEN CHECK (shared)
// ------------------------------------------------------
// The same rules as middleware/authMiddleware.js, for the places that
// cannot use that middleware because the token arrives in a query string
// (EventSource / SSE streams) or as an optional Bearer header (private
// file downloads):
//   • signature, algorithm, issuer, audience and expiry;
//   • a login token only (positive integer `id`, no `type` / `purpose`);
//   • the user still exists, is Active AND activated;
//   • the token version still matches (password change / "log out
//     everywhere" / role change revoke the session immediately).
//
// Returns { decoded, user } or null. Never throws.
// ======================================================

const verifyLoginToken = (token) => {
    try {
        const decoded = jwt.verify(String(token || ""), JWT_SECRET, {
            algorithms: [JWT_ALGORITHM],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        const id = Number(decoded?.id);
        if (!Number.isSafeInteger(id) || id <= 0) return null;
        if (decoded.type !== undefined || decoded.purpose !== undefined) return null;
        return { ...decoded, id };
    } catch {
        return null;
    }
};

const authenticateLoginToken = async (token) => {
    const decoded = verifyLoginToken(token);
    if (!decoded) return null;
    try {
        const rows = await db.query(
            `SELECT id, name, email, status, is_activated, is_admin,
                    COALESCE(token_version, 0) AS token_version
               FROM users WHERE id = ? LIMIT 1`,
            [decoded.id]
        );
        const user = rows?.[0];
        if (!user || user.status !== "Active" || !user.is_activated) return null;
        if (Number(decoded.tokenVersion || 0) !== Number(user.token_version || 0)) return null;
        return { decoded, user };
    } catch (error) {
        console.error("Access token user lookup failed:", error.message);
        return null;
    }
};

module.exports = { verifyLoginToken, authenticateLoginToken };

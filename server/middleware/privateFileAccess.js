const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_ALGORITHM, FILE_TOKEN_TTL } = require("../config/security");
const db = require("../config/db");
const { safeFilename, safeRelativePath } = require("../utils/pathSecurity");
const { UPLOAD_DIR } = require("../config/storage");

const uploadRoot = path.resolve(UPLOAD_DIR);


function verifyFileToken(token, filename) {
    const claims = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    if (claims?.type !== "file-access" || claims?.file !== filename) throw new Error("Invalid file token");
    return claims;
}

const sendPrivateFile = async (req, res) => {
    const filename = safeRelativePath(req.params.filename || req.query?.path);
    if (!filename) return res.status(400).json({ success: false, message: "Invalid file name" });

    const bearer = String(req.headers.authorization || "");
    const queryToken = String(req.query?.token || "");
    let authorized = false;

    try {
        if (bearer.startsWith("Bearer ")) {
            const claims = jwt.verify(bearer.slice(7), JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
            if (claims?.id) {
                const rows = await db.query(
                    "SELECT id, status, is_activated FROM users WHERE id = ? LIMIT 1",
                    [claims.id]
                );
                authorized = Boolean(rows?.[0] && rows[0].status === "Active" && rows[0].is_activated);
            }
        }
        if (!authorized && queryToken) {
            verifyFileToken(queryToken, filename);
            authorized = true;
        }
    } catch (_) {
        authorized = false;
    }

    if (!authorized) {
        return res.status(401).json({ success: false, message: "File authorization required" });
    }

    const target = path.resolve(path.join(uploadRoot, filename));
    if (target !== uploadRoot && !target.startsWith(`${uploadRoot}${path.sep}`)) {
        return res.status(400).json({ success: false, message: "Invalid file path" });
    }

    let real;
    try {
        real = fs.realpathSync(target);
    } catch (_) {
        return res.status(404).json({ success: false, message: "File not found" });
    }

    if (real !== uploadRoot && !real.startsWith(`${uploadRoot}${path.sep}`)) {
        return res.status(403).json({ success: false, message: "File access denied" });
    }

    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    return res.sendFile(real, { dotfiles: "deny", acceptRanges: false });
};

function createFileAccessToken(filename) {
    const clean = safeRelativePath(filename);
    if (!clean) throw new Error("Invalid file name");
    return jwt.sign(
        { type: "file-access", file: clean },
        JWT_SECRET,
        { algorithm: JWT_ALGORITHM, expiresIn: FILE_TOKEN_TTL }
    );
}

module.exports = { sendPrivateFile, createFileAccessToken, safeFilename, uploadRoot };

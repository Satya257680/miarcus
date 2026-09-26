const path = require("path");
const { UPLOAD_DIR } = require("../config/storage");

// ======================================================
// STORED UPLOAD PATH
// Saves an uploaded file's location as "uploads/<relative path>"
// instead of the server's absolute disk path
// (e.g. "C:/miarcus/server/uploads/123.pdf"), so the portal can
// always open it through the secure /api/files route.
// ======================================================

const storedUploadPath = (file) => {
    if (!file) return null;
    const absolute = path.resolve(file.path || path.join(UPLOAD_DIR, file.filename || ""));
    const root = path.resolve(UPLOAD_DIR);
    let relative = absolute.startsWith(`${root}${path.sep}`)
        ? path.relative(root, absolute)
        : path.basename(absolute);
    relative = relative.replace(/\\/g, "/");
    return `uploads/${relative}`;
};

module.exports = { storedUploadPath };

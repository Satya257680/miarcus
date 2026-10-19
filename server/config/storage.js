const path = require('path');
const fs = require('fs');

// Persistent storage root.
// - Explicit UPLOAD_DIR always wins.
// - Render persistent disks are mounted at /var/data when attached.
// - Local development falls back to the repository uploads directory.
//
// Announcement attachments are also persisted in MySQL, so the application
// does not depend on ephemeral Render storage for announcement data.
const configuredUploadDir = String(process.env.UPLOAD_DIR || "").trim();
const renderDiskDir =
  process.env.NODE_ENV === "production" &&
  fs.existsSync("/var/data")
    ? path.join("/var/data", "miarcus", "uploads")
    : null;

const UPLOAD_DIR = path.resolve(
  configuredUploadDir ||
  renderDiskDir ||
  path.join(process.cwd(), "uploads")
);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function uploadPath(...parts) {
  const target = path.resolve(UPLOAD_DIR, ...parts);
  if (target !== UPLOAD_DIR && !target.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
    throw new Error('Invalid upload path');
  }
  fs.mkdirSync(target, { recursive: true });
  return target;
}

// Resolve the location of an EXISTING stored file (read / stream / delete)
// without touching the filesystem.
//
// uploadPath() above is for DIRECTORIES: it always runs mkdirSync on the
// target. Passing it a file path is wrong — for a file that exists,
// mkdirSync throws EEXIST, and for a file that does not exist it silently
// creates an empty DIRECTORY with the file's name. That is what made every
// L&D media request fail with HTTP 500 "Unable to load file" and kept
// deleted L&D files on disk.
//
// Returns the absolute path, or null when the path would escape the
// directory or the file name is unsafe.
function resolveUploadFile(directory, fileName) {
  const name = String(fileName || "").trim();
  if (
    !name ||
    name.length > 255 ||
    name.includes("\0") ||
    name.includes("/") ||
    name.includes("\\") ||
    name === "." ||
    name === ".." ||
    name.startsWith(".")
  ) {
    return null;
  }
  const dir = path.resolve(UPLOAD_DIR, String(directory || ""));
  if (dir !== UPLOAD_DIR && !dir.startsWith(`${UPLOAD_DIR}${path.sep}`)) return null;
  const target = path.resolve(dir, name);
  if (path.dirname(target) !== dir) return null;
  return target;
}

module.exports = { UPLOAD_DIR, uploadPath, resolveUploadFile };

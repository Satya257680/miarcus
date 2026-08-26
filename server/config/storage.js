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

module.exports = { UPLOAD_DIR, uploadPath };

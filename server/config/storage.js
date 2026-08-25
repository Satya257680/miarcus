const path = require('path');
const fs = require('fs');

// Persistent storage root. In production set UPLOAD_DIR to a mounted disk or object-storage sync path.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
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

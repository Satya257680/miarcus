// ==========================================================
// MI ARCUS — SHARED "ANY FORMAT" BULK UPLOAD MIDDLEWARE
// ==========================================================
//
// One multer config, reusable by every bulk-upload route in the
// app (Users today; Departments/Designations/Announcements/etc.
// can switch to this the same way — see routes/userRoutes.js
// for the pattern). Accepts CSV, Excel, PDF, or a photo, and
// hands the file to utils/bulkFileParser.js to turn into rows
// regardless of which format it was.
// ==========================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOAD_DIR } = require("../config/storage");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1000000000) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const ALLOWED_EXTENSIONS = [
    ".csv", ".xlsx", ".xls", ".pdf",
    ".jpg", ".jpeg", ".png", ".webp",
    // Video is accepted so it is never bounced at the upload layer.
    // Row/table data cannot be extracted from a video, so
    // utils/bulkFileParser.js reports a clear, friendly message for it
    // instead of silently importing nothing — see VIDEO_EXTENSIONS there.
    ".mp4", ".mov", ".avi", ".mkv", ".webm"
];

const ALLOWED_MIME_TYPES = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream", // some browsers send this for .csv/.xls
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm"
];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(null, true);
    }

    return cb(
        new Error("Only CSV, Excel (.xlsx/.xls), PDF, photo (.jpg/.png/.webp), or video (.mp4/.mov/.avi/.mkv/.webm) files are allowed.")
    );
};

// UNLIMITED UPLOAD SIZE
//
// This used to cap out at 500 MB, which was already generous, but a
// genuinely large historical export (hundreds of thousands of
// Checklist Report rows) can still exceed that. `limits.fileSize` is
// intentionally left unset below — multer treats a missing fileSize
// limit as "no limit at all", so this middleware itself will never
// reject a file for being too big.
//
// Two other places can still cut a large upload off before it even
// gets here, and both have been raised to match:
//   - routes/checklistReportRoutes.js -> request timeout, raised to
//     60 minutes so a very large file has time to fully upload +
//     parse + import.
//   - web.config -> the IIS reverse-proxy in front of this app (see
//     that file for why, and how to deploy it) has its own request
//     size ceiling that lives completely outside this Node process;
//     it has been raised to the maximum IIS supports.
const bulkFileUpload = multer({
    storage,
    fileFilter
    // No `limits.fileSize` — uploads of any size are accepted here.
});

module.exports = bulkFileUpload;

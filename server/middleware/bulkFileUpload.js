// ==========================================================
// MI ARCUS — SHARED "ANY FORMAT" BULK UPLOAD MIDDLEWARE
// ==========================================================
//
// One multer config, reusable by every bulk-upload route in the
// app — every module's bulk-upload route uses it. Accepts Excel,
// CSV/TSV/TXT, Word (.docx/.doc), PDF, JSON or a photo, and
// hands the file to utils/bulkFileParser.js to turn into rows
// regardless of which format it was.
// ==========================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOAD_DIR } = require("../config/storage");
const { MAX_UPLOAD_SIZE } = require("./fileSecurity");

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
    ".csv", ".tsv", ".txt", ".json",
    ".xlsx", ".xlsm", ".xlsb", ".xls", ".ods",
    ".docx", ".doc",
    ".pdf",
    ".jpg", ".jpeg", ".png", ".webp",
    // Video is accepted so it is never bounced at the upload layer.
    // Row/table data cannot be extracted from a video, so
    // utils/bulkFileParser.js reports a clear, friendly message for it
    // instead of silently importing nothing — see VIDEO_EXTENSIONS there.
    ".mp4", ".mov", ".avi", ".mkv", ".webm"
];

const ALLOWED_MIME_TYPES = [
    "text/csv",
    "text/plain",
    "text/tab-separated-values",
    "application/json",
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
        new Error("Only Excel (.xlsx/.xls), CSV, Word (.docx/.doc), PDF, or a photo (.jpg/.png/.webp) of the list can be bulk uploaded.")
    );
};

// UPLOAD SIZE — matches the app-wide ceiling (100 GB by default; see
// MAX_UPLOAD_SIZE in middleware/fileSecurity.js).
//
// A single request this route receives directly (i.e. not sent
// through the chunked upload flow) still also has to pass through:
//   - routes/checklistReportRoutes.js / routes/actionpointRoutes.js
//     -> request timeout, raised to match UPLOAD_TIMEOUT_MS (4 hours
//     by default — see middleware/extendUploadTimeout.js) so a very
//     large file has time to fully upload + parse + import.
//   - web.config -> the IIS reverse-proxy in front of this app (see
//     that file for why, and how to deploy it) has its OWN separate
//     request size ceiling that lives completely outside this Node
//     process, hard-capped by IIS itself at ~4 GB no matter what this
//     number is set to. A file larger than that has to go through the
//     chunked upload flow instead — see middleware/chunkedUpload.js
//     and client/src/components/common/BulkUploadModal
//     (enableChunkedUpload) — which sends the file as many pieces
//     each safely under that ceiling and reassembles it here on the
//     server before this middleware/route ever sees it as a single
//     file again.
const bulkFileUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE
    }
});

module.exports = bulkFileUpload;

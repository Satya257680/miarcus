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

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf", ".jpg", ".jpeg", ".png", ".webp"];

const ALLOWED_MIME_TYPES = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream", // some browsers send this for .csv/.xls
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp"
];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(null, true);
    }

    return cb(
        new Error("Only CSV, Excel (.xlsx/.xls), PDF, or photo (.jpg/.png/.webp) files are allowed.")
    );
};

// Photos and PDFs run noticeably bigger than a spreadsheet, so the
// ceiling is higher than the old CSV-only 10 MB limit.
const bulkFileUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25 MB
    }
});

module.exports = bulkFileUpload;

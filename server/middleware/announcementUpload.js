const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { UPLOAD_DIR } = require("../config/storage");
const { validateUploadedFiles, MAX_UPLOAD_SIZE } = require("./fileSecurity");

// ======================================================
// ANNOUNCEMENT UPLOAD FOLDER
// ======================================================

const uploadFolder = UPLOAD_DIR;

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, {
        recursive: true
    });
}

// ======================================================
// STORAGE
// ======================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            uploadFolder
        );

    },

    filename: (req, file, cb) => {

        const extension = path.extname(file.originalname || "").toLowerCase();
        const uniqueName =
            Date.now() +
            "-" +
            crypto.randomBytes(18).toString("hex") +
            extension;

        cb(
            null,
            uniqueName
        );

    }

});

// ======================================================
// FILE FILTER
// ======================================================

const fileFilter = (req, file, cb) => {

    const extension =
        path
            .extname(file.originalname)
            .toLowerCase();

    // Announcements keep the uploaded binary exactly as supplied.
    // These formats are accepted as attachments; they are NOT parsed into
    // announcement fields and are NOT converted or rewritten.
    const allowedExtensions = [
        // Images
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg",

        // PDF
        ".pdf",

        // Documents
        ".doc", ".docx", ".txt",

        // Excel / spreadsheet files
        ".xls", ".xlsx", ".xlsm", ".xlt", ".xltx", ".xltm", ".ods",

        // Delimited data files
        ".csv", ".tsv",

        // Video
        ".mp4", ".webm", ".mov", ".avi", ".mkv"
    ];

    if (allowedExtensions.includes(extension)) {

        cb(
            null,
            true
        );

    } else {

        cb(
            new Error(
                "Only image, PDF, document, Excel, spreadsheet, CSV, TSV, text and video files are allowed."
            )
        );

    }

};

// ======================================================
// MULTER
// ======================================================
//
// IMPORTANT:
// No fileSize limit is configured here.
//
// This middleware is ONLY for Announcements,
// so other modules can continue using their own
// upload limits.
// ======================================================

const baseUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE,
        files: 1,
        parts: 20,
        fields: 15,
        fieldSize: 1024 * 1024
    }
});

const upload = {
    single: field => [baseUpload.single(field), validateUploadedFiles]
};

module.exports = upload;
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ======================================================
// ANNOUNCEMENT UPLOAD FOLDER
// ======================================================

const uploadFolder = "uploads";

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

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000000) +
            path.extname(file.originalname);

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

    const allowedExtensions = [

        // Images
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",

        // PDF
        ".pdf",

        // Documents
        ".doc",
        ".docx",

        // Excel
        ".xls",
        ".xlsx",

        // CSV
        ".csv",

        // Text
        ".txt"

    ];

    if (allowedExtensions.includes(extension)) {

        cb(
            null,
            true
        );

    } else {

        cb(
            new Error(
                "Only image, PDF, document, Excel, CSV and text files are allowed."
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

const upload = multer({

    storage,

    fileFilter

});

module.exports = upload;
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { uploadPath } = require("../config/storage");
const { validateUploadedFiles, MAX_UPLOAD_SIZE } = require("./fileSecurity");

// Allowed types → media "kind". The kind is derived from the file
// extension on the server (never trusted from the browser), and
// fileSecurity.validateUploadedFiles verifies the real file signature.
const KIND_BY_EXT = {
    ".mp4": "video", ".mov": "video", ".webm": "video",
    ".jpg": "image", ".jpeg": "image", ".png": "image", ".webp": "image", ".gif": "image",
    ".pdf": "pdf",
};

const MIME_BY_EXT = {
    ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf",
};

// validateUploadedFiles() rejects anything above MAX_UPLOAD_SIZE (1 GiB by
// default, MAX_UPLOAD_SIZE_BYTES). The L&D limit used to be 2 GiB, so a
// 1–2 GiB video was uploaded completely and only THEN refused. Never
// accept more than the security validator will keep.
const CONFIGURED_LND_MAX = Number(process.env.LND_MAX_VIDEO_BYTES) > 0 ? Number(process.env.LND_MAX_VIDEO_BYTES) : 2 * 1024 * 1024 * 1024;
const MAX_VIDEO = Math.min(CONFIGURED_LND_MAX, MAX_UPLOAD_SIZE);
const MAX_MB = Math.floor(MAX_VIDEO / (1024 * 1024));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath("lnd")),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`);
    },
});

const make = (allowedKinds) =>
    multer({
        storage,
        fileFilter: (req, file, cb) => {
            const ext = path.extname(file.originalname || "").toLowerCase();
            if (allowedKinds.includes(KIND_BY_EXT[ext])) return cb(null, true);
            cb(new Error("Unsupported file type. Allowed: MP4/MOV/WEBM video, JPG/PNG/WEBP/GIF images, PDF."));
        },
        limits: { fileSize: MAX_VIDEO, files: 20 },
    });

const mediaUpload = make(["video", "image", "pdf"]);
const imageUpload = make(["image"]);

const wrap = (handler) => (req, res, next) =>
    handler(req, res, (error) => {
        if (!error) return next();
        return res.status(400).json({
            success: false,
            message: error.code === "LIMIT_FILE_SIZE" ? `File is too large. The maximum size is ${MAX_MB} MB per file.` : error.message || "Upload failed",
        });
    });

module.exports = {
    MAX_VIDEO,
    KIND_BY_EXT,
    MIME_BY_EXT,
    uploadMedia: [wrap(mediaUpload.array("files", 20)), validateUploadedFiles],
    uploadImage: [wrap(imageUpload.single("file")), validateUploadedFiles],
};

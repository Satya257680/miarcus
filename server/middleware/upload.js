const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { validateUploadedFiles, MAX_UPLOAD_SIZE } = require("./fileSecurity");
const { UPLOAD_DIR } = require("../config/storage");

const uploadFolder = UPLOAD_DIR;
fs.mkdirSync(uploadFolder, { recursive: true });

const allowed = new Map([
    [".jpg", new Set(["image/jpeg"])],
    [".jpeg", new Set(["image/jpeg"])],
    [".png", new Set(["image/png"])],
    [".gif", new Set(["image/gif"])],
    [".webp", new Set(["image/webp"])],
    [".pdf", new Set(["application/pdf"])],
    [".doc", new Set(["application/msword", "application/octet-stream"])],
    [".docx", new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"])],
    [".xls", new Set(["application/vnd.ms-excel", "application/octet-stream"])],
    [".xlsx", new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"])],
    [".csv", new Set(["text/csv", "application/csv", "application/vnd.ms-excel", "application/octet-stream", "text/plain"])],
]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadFolder),
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(18).toString("hex")}${extension}`);
    }
});

const fileFilter = (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mimeTypes = allowed.get(extension);
    if (!mimeTypes || !mimeTypes.has(String(file.mimetype || "").toLowerCase())) {
        return cb(new Error("The uploaded file type is not allowed."));
    }
    cb(null, true);
};

const baseUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE,
        files: 10,
        parts: 30,
        fields: 20,
        fieldSize: 1024 * 1024
    }
});

const wrap = method => (...args) => [baseUpload[method](...args), validateUploadedFiles];

module.exports = {
    single: wrap("single"),
    array: wrap("array"),
    uploadFolder
};

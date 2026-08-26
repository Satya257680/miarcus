const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { validateUploadedFiles, MAX_UPLOAD_SIZE } = require("./fileSecurity");
const { UPLOAD_DIR } = require("../config/storage");

const root = path.join(UPLOAD_DIR, "gallery");

const commonAllowed = new Map([
    [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"],
    [".gif", "image/gif"], [".webp", "image/webp"],
    [".mp4", "video/mp4"], [".webm", "video/webm"], [".mov", "video/quicktime"],
    [".avi", "video/x-msvideo"], [".mkv", "video/x-matroska"],
    [".mp3", "audio/mpeg"], [".wav", new Set(["audio/wav", "audio/x-wav"])], [".m4a", new Set(["audio/mp4", "audio/x-m4a"])], [".ogg", "audio/ogg"],
    [".pdf", "application/pdf"],
    [".doc", "application/msword"], [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    [".xls", "application/vnd.ms-excel"], [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    [".ppt", "application/vnd.ms-powerpoint"], [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    [".csv", "text/csv"], [".txt", "text/plain"],
    [".zip", new Set(["application/zip", "application/x-zip-compressed", "application/octet-stream"])]
]);

const makeStorage = () => {
    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => {
            const now = new Date();
            const destination = path.join(
                root,
                String(now.getFullYear()),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0")
            );
            fs.mkdirSync(destination, { recursive: true });
            cb(null, destination);
        },
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname || "").toLowerCase();
            cb(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${ext}`);
        }
    });
    return storage;
};

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const expected = commonAllowed.get(ext);
    const mime = String(file.mimetype || "").toLowerCase();
    if (!expected || !(expected instanceof Set ? expected.has(mime) : expected === mime)) {
        return cb(new Error("This Gallery file type is not supported."));
    }
    cb(null, true);
};

const build = (maxFiles) => {
    const uploader = multer({
        storage: makeStorage(),
        limits: {
            fileSize: MAX_UPLOAD_SIZE,
            files: maxFiles,
            parts: 40,
            fields: 30,
            fieldSize: 1024 * 1024
        },
        fileFilter
    });

    return {
        single: (...args) => [uploader.single(...args), validateUploadedFiles],
        array: (...args) => [uploader.array(...args), validateUploadedFiles]
    };
};

const upload = build(1);
const uploadMany = build(20);

module.exports = { ...upload, uploadMany, destination: root, root, commonAllowed };

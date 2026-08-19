const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const root = path.join(process.cwd(), "uploads", "gallery");

const date = new Date();
const year = String(date.getFullYear());
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");
const destination = path.join(root, year, month, day);

fs.mkdirSync(destination, { recursive: true });

const allowed = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"]
]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
        const extension = allowed.get(file.mimetype) || path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!allowed.has(file.mimetype)) {
            return cb(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
        cb(null, true);
    }
});

const uploadMany = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024, files: 20 },
    fileFilter: (_req, file, cb) => {
        if (!allowed.has(file.mimetype)) {
            return cb(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
        cb(null, true);
    }
});

module.exports = { upload, uploadMany, destination, root };

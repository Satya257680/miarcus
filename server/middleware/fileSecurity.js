const fs = require("fs");
const path = require("path");

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

function readHeader(filePath, length = 16) {
    const fd = fs.openSync(filePath, "r");
    try {
        const buffer = Buffer.alloc(length);
        const bytes = fs.readSync(fd, buffer, 0, length, 0);
        return buffer.subarray(0, bytes);
    } finally {
        fs.closeSync(fd);
    }
}

function hasPrefix(buffer, bytes) {
    return buffer.length >= bytes.length && bytes.every((value, index) => buffer[index] === value);
}

function isValidSignature(filePath, extension) {
    const ext = String(extension || "").toLowerCase();
    const header = readHeader(filePath, 16);

    if ([".jpg", ".jpeg"].includes(ext)) return hasPrefix(header, [0xff, 0xd8, 0xff]);
    if (ext === ".png") return hasPrefix(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (ext === ".gif") return header.subarray(0, 6).toString("ascii") === "GIF87a" || header.subarray(0, 6).toString("ascii") === "GIF89a";
    if (ext === ".webp") return header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP";
    if (ext === ".pdf") return header.subarray(0, 5).toString("ascii") === "%PDF-";
    if ([".doc", ".xls"].includes(ext)) return hasPrefix(header, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    if ([".docx", ".xlsx"].includes(ext)) return header.subarray(0, 4).toString("binary") === "PK\x03\x04" || header.subarray(0, 4).toString("binary") === "PK\x05\x06";
    if ([".csv", ".txt"].includes(ext)) {
        const sample = fs.readFileSync(filePath).subarray(0, 8192);
        return !sample.includes(0);
    }

    return false;
}

function validateOne(file) {
    if (!file || !file.path) return null;
    if (file.size > MAX_UPLOAD_SIZE) return "Uploaded file exceeds the 25 MB security limit.";

    const ext = path.extname(file.originalname || file.filename || "").toLowerCase();
    if (!isValidSignature(file.path, ext)) {
        return "The uploaded file content does not match its declared file type.";
    }
    return null;
}

function validateUploadedFiles(req, res, next) {
    const files = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    else if (req.files && typeof req.files === "object") {
        Object.values(req.files).forEach(list => files.push(...(Array.isArray(list) ? list : [])));
    }

    try {
        for (const file of files) {
            const error = validateOne(file);
            if (error) {
                for (const uploaded of files) {
                    if (uploaded?.path) fs.unlink(uploaded.path, () => {});
                }
                return res.status(400).json({ success: false, message: error });
            }
        }
        return next();
    } catch (error) {
        for (const file of files) {
            if (file?.path) fs.unlink(file.path, () => {});
        }
        return res.status(400).json({ success: false, message: "Unable to validate the uploaded file." });
    }
}

module.exports = {
    MAX_UPLOAD_SIZE,
    validateUploadedFiles,
    isValidSignature
};

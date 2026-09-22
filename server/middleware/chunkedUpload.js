// ==========================================================
// MI ARCUS — CHUNKED "LARGE FILE" BULK UPLOAD MIDDLEWARE
// ==========================================================
//
// WHY THIS EXISTS
// -----------------
// IIS's own request-filtering module (see server/web.config) has a
// hard, unconfigurable ceiling of 4,294,967,295 bytes (~4 GB) for a
// single HTTP request — that number is IIS's own 32-bit limit, not a
// setting this app can raise any further. To let an admin genuinely
// bulk-upload a file up to the app's configured maximum (see
// MAX_UPLOAD_SIZE in middleware/fileSecurity.js — 100 GB by default),
// the browser has to send the file as many smaller pieces ("chunks"),
// each safely under IIS's per-request ceiling, and this middleware
// reassembles those pieces back into the original file on the server
// before handing it to the exact same controller code a normal
// single-request upload already used.
//
// FLOW
// -----
//   1. POST /api/uploads/init
//      body: { originalName, mimetype, totalSize, totalChunks }
//      -> { uploadId }
//
//   2. POST /api/uploads/:uploadId/chunk/:index   (repeated per chunk,
//      field name "chunk", multipart/form-data)
//      -> { received, totalChunks }
//
//   3. POST /api/uploads/:uploadId/complete
//      -> { file: { token, originalName, mimetype, size } }
//
//   4. The page's real bulk-upload route (e.g. POST
//      /api/checklist-reports/bulk-upload or
//      POST /api/action-points/bulk-upload) is then called with a
//      small JSON body { assembledFile: token } instead of a
//      multipart file. `resolveAssembledFile` below turns that back
//      into the same `req.file` shape multer would have produced for
//      a normal upload, so controllers/checklistReportController.js
//      and controllers/actionPointController.js need no changes at
//      all — they only ever look at req.file.path/originalname/
//      mimetype either way.
//
// Client-side counterpart: client/src/components/common/
// BulkUploadModal (enableChunkedUpload prop) automatically switches a
// file larger than its chunkThreshold prop to this flow; every other
// page keeps using the original single-request upload untouched.
// ==========================================================

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { UPLOAD_DIR, uploadPath } = require("../config/storage");
const { MAX_UPLOAD_SIZE } = require("./fileSecurity");
const registry = require("../utils/uploadRegistry");

// Same "any format" allow-list as middleware/bulkFileUpload.js — a
// chunked upload ultimately lands in one of the same bulk-upload
// routes, so it has to pass the same extension check.
const ALLOWED_EXTENSIONS = [
    ".csv", ".xlsx", ".xls", ".pdf",
    ".jpg", ".jpeg", ".png", ".webp",
    ".mp4", ".mov", ".avi", ".mkv", ".webm"
];

// A single chunk is capped well under IIS's own ~4 GB per-request
// ceiling, whatever chunk size the client is actually configured to
// send (BulkUploadModal defaults to 500 MB chunks). This is just a
// safety ceiling, not the expected chunk size.
const MAX_CHUNK_SIZE = 1024 * 1024 * 1024; // 1 GB

const CHUNK_TMP_ROOT = ".chunk-uploads";

function chunkDirFor(uploadId) {
    // uploadPath() both validates the path stays under UPLOAD_DIR and
    // creates it (recursive) — see config/storage.js.
    return uploadPath(CHUNK_TMP_ROOT, uploadId);
}

// ======================================================
// MULTER — RECEIVES ONE CHUNK PER REQUEST
// ======================================================

const chunkStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const pending = registry.getPendingUpload(req.params.uploadId);

        if (!pending || !pending.chunkDir) {
            return cb(new Error("Unknown or expired upload session. Start the upload again."));
        }

        cb(null, pending.chunkDir);
    },
    filename: (req, _file, cb) => {
        const index = Number(req.params.index);

        if (!Number.isInteger(index) || index < 0) {
            return cb(new Error("Invalid chunk index."));
        }

        cb(null, `${index}.part`);
    }
});

const chunkUpload = multer({
    storage: chunkStorage,
    limits: {
        fileSize: MAX_CHUNK_SIZE,
        files: 1
    }
});

// ======================================================
// INIT
// POST /api/uploads/init
// ======================================================

function initChunkedUpload(req, res) {
    const { originalName, mimetype, totalSize, totalChunks } = req.body || {};

    if (!originalName || typeof originalName !== "string") {
        return res.status(400).json({ success: false, message: "originalName is required." });
    }

    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({
            success: false,
            message: `Only ${ALLOWED_EXTENSIONS.join(", ")} files are allowed.`
        });
    }

    const size = Number(totalSize);
    const chunks = Number(totalChunks);

    if (!Number.isFinite(size) || size <= 0) {
        return res.status(400).json({ success: false, message: "totalSize must be a positive number." });
    }

    if (size > MAX_UPLOAD_SIZE) {
        return res.status(400).json({
            success: false,
            message: `Uploaded file exceeds the ${Math.round(MAX_UPLOAD_SIZE / (1024 * 1024 * 1024))} GB upload limit.`
        });
    }

    // A sane upper bound on chunk COUNT (not size) — protects against a
    // buggy/malicious client asking for millions of tiny chunks.
    if (!Number.isInteger(chunks) || chunks <= 0 || chunks > 100000) {
        return res.status(400).json({ success: false, message: "totalChunks is invalid." });
    }

    const uploadId = registry.createPendingUpload({
        userId: req.user?.id ?? null,
        originalName,
        mimetype: mimetype || "application/octet-stream",
        totalChunks: chunks,
        totalSize: size
    });

    const pending = registry.getPendingUpload(uploadId);
    pending.chunkDir = chunkDirFor(uploadId);

    return res.json({ success: true, uploadId });
}

// ======================================================
// RECEIVE ONE CHUNK
// POST /api/uploads/:uploadId/chunk/:index
// ======================================================

function receiveChunk(req, res) {
    const pending = registry.getPendingUpload(req.params.uploadId);

    if (!pending) {
        return res.status(404).json({ success: false, message: "Unknown or expired upload session. Start the upload again." });
    }

    if (req.user?.id !== pending.userId) {
        return res.status(403).json({ success: false, message: "This upload session does not belong to you." });
    }

    const index = Number(req.params.index);

    if (!Number.isInteger(index) || index < 0 || index >= pending.totalChunks) {
        return res.status(400).json({ success: false, message: "Invalid chunk index." });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No chunk data received." });
    }

    pending.receivedChunks.add(index);

    return res.json({
        success: true,
        received: pending.receivedChunks.size,
        totalChunks: pending.totalChunks
    });
}

// ======================================================
// COMPLETE — STITCH ALL CHUNKS BACK INTO ONE FILE
// POST /api/uploads/:uploadId/complete
// ======================================================

async function completeChunkedUpload(req, res) {
    const uploadId = req.params.uploadId;
    const pending = registry.getPendingUpload(uploadId);

    if (!pending) {
        return res.status(404).json({ success: false, message: "Unknown or expired upload session. Start the upload again." });
    }

    if (req.user?.id !== pending.userId) {
        return res.status(403).json({ success: false, message: "This upload session does not belong to you." });
    }

    if (pending.receivedChunks.size !== pending.totalChunks) {
        return res.status(400).json({
            success: false,
            message: `Only received ${pending.receivedChunks.size} of ${pending.totalChunks} chunks. Resend the missing chunk(s) before completing — nothing has been lost.`
        });
    }

    const ext = path.extname(pending.originalName).toLowerCase();
    const finalName = `${Date.now()}-${Math.round(Math.random() * 1000000000)}${ext}`;
    const finalPath = path.join(UPLOAD_DIR, finalName);

    try {
        await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(finalPath);
            writeStream.on("error", reject);

            (async () => {
                try {
                    for (let index = 0; index < pending.totalChunks; index += 1) {
                        const chunkPath = path.join(pending.chunkDir, `${index}.part`);

                        await new Promise((chunkResolve, chunkReject) => {
                            const readStream = fs.createReadStream(chunkPath);
                            readStream.on("error", chunkReject);
                            readStream.on("end", chunkResolve);
                            readStream.pipe(writeStream, { end: false });
                        });
                    }

                    writeStream.end();
                } catch (error) {
                    writeStream.destroy();
                    reject(error);
                }
            })();

            writeStream.on("finish", resolve);
        });

        const stats = fs.statSync(finalPath);

        if (stats.size !== pending.totalSize) {
            fs.unlink(finalPath, () => {});
            fs.rmSync(pending.chunkDir, { recursive: true, force: true });
            registry.deletePendingUpload(uploadId);

            return res.status(400).json({
                success: false,
                message: `The assembled file (${stats.size} bytes) does not match the expected size (${pending.totalSize} bytes). Please upload the file again.`
            });
        }

        registry.markCompleted(finalName, {
            userId: pending.userId,
            originalName: pending.originalName,
            mimetype: pending.mimetype,
            size: stats.size
        });

        fs.rmSync(pending.chunkDir, { recursive: true, force: true });
        registry.deletePendingUpload(uploadId);

        return res.json({
            success: true,
            file: {
                token: finalName,
                originalName: pending.originalName,
                mimetype: pending.mimetype,
                size: stats.size
            }
        });

    } catch (error) {
        console.error("❌ CHUNKED UPLOAD ASSEMBLY ERROR:", error);
        fs.unlink(finalPath, () => {});
        return res.status(500).json({ success: false, message: "Failed to assemble the uploaded file on the server." });
    }
}

// ======================================================
// ABORT — CLIENT GAVE UP / MODAL WAS CLOSED MID-UPLOAD
// DELETE /api/uploads/:uploadId
// ======================================================

function abortChunkedUpload(req, res) {
    const pending = registry.getPendingUpload(req.params.uploadId);

    if (pending && req.user?.id === pending.userId) {
        if (pending.chunkDir) {
            fs.rmSync(pending.chunkDir, { recursive: true, force: true });
        }
        registry.deletePendingUpload(req.params.uploadId);
    }

    return res.json({ success: true });
}

// ======================================================
// RESOLVE ASSEMBLED FILE
//
// Mounted on the real bulk-upload routes (see routes/
// checklistReportRoutes.js and routes/actionpointRoutes.js) directly
// after the existing multer middleware. If a normal single-request
// multipart upload already populated req.file, this is a no-op. If
// instead the request is the small JSON completion call the chunked
// upload flow sends — { assembledFile: "<token from /complete>" } —
// this builds the same req.file shape multer would have, so the
// controller downstream (bulkUploadChecklistReports /
// bulkUploadActionPoints) behaves identically either way.
// ======================================================

function resolveAssembledFile(req, res, next) {
    if (req.file) return next();

    const token = req.body?.assembledFile;

    if (!token) return next(); // neither path used — controller reports "no file uploaded" as before

    if (typeof token !== "string" || token.includes("/") || token.includes("\\") || token.includes("..")) {
        return res.status(400).json({ success: false, message: "Invalid uploaded file reference." });
    }

    const entry = registry.claimCompleted(token);

    if (!entry) {
        return res.status(400).json({
            success: false,
            message: "This uploaded file reference has expired or was already used. Please upload the file again."
        });
    }

    if (req.user?.id !== entry.userId) {
        return res.status(403).json({ success: false, message: "This uploaded file does not belong to you." });
    }

    const finalPath = path.join(UPLOAD_DIR, token);

    if (!fs.existsSync(finalPath)) {
        return res.status(400).json({
            success: false,
            message: "The uploaded file could not be found on the server. Please upload it again."
        });
    }

    req.file = {
        path: finalPath,
        filename: token,
        originalname: entry.originalName,
        mimetype: entry.mimetype,
        size: entry.size
    };

    next();
}

// ======================================================
// BACKGROUND CLEANUP
//
// Releases abandoned upload sessions (closed tab, crashed browser,
// network gone for good mid-transfer) and their temp chunk
// directories so a 100 GB transfer that never finishes doesn't sit on
// disk forever.
// ======================================================

setInterval(() => {
    registry.cleanupExpired((expiredEntry) => {
        try {
            if (expiredEntry.chunkDir) {
                fs.rmSync(expiredEntry.chunkDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.error("❌ CHUNKED UPLOAD CLEANUP ERROR:", error.message);
        }
    });
}, 15 * 60 * 1000).unref();

module.exports = {
    chunkUpload,
    initChunkedUpload,
    receiveChunk,
    completeChunkedUpload,
    abortChunkedUpload,
    resolveAssembledFile,
    MAX_CHUNK_SIZE,
    ALLOWED_EXTENSIONS
};

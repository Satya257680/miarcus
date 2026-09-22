const express = require("express");

const router = express.Router();

// ======================================================
// LARGE FILE ("CHUNKED") UPLOAD ROUTES
// BASE URL: /api/uploads
//
// See middleware/chunkedUpload.js for the full explanation of why
// this exists (IIS's own ~4 GB per-request ceiling) and how the
// pieces fit together. Every route here requires a logged-in user —
// an upload session belongs to exactly the user who started it.
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");
const extendUploadTimeout = require("../middleware/extendUploadTimeout");

const {
    chunkUpload,
    initChunkedUpload,
    receiveChunk,
    completeChunkedUpload,
    abortChunkedUpload
} = require("../middleware/chunkedUpload");

router.use(extendUploadTimeout);
router.use(authMiddleware);

// ======================================================
// START A CHUNKED UPLOAD SESSION
// POST /api/uploads/init
// ======================================================

router.post("/init", initChunkedUpload);

// ======================================================
// RECEIVE ONE CHUNK
// POST /api/uploads/:uploadId/chunk/:index
// ======================================================

router.post(
    "/:uploadId/chunk/:index",
    chunkUpload.single("chunk"),
    receiveChunk
);

// ======================================================
// FINISH — REASSEMBLE ALL RECEIVED CHUNKS
// POST /api/uploads/:uploadId/complete
// ======================================================

router.post("/:uploadId/complete", completeChunkedUpload);

// ======================================================
// ABORT / CANCEL
// DELETE /api/uploads/:uploadId
// ======================================================

router.delete("/:uploadId", abortChunkedUpload);

module.exports = router;

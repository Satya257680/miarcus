// ==========================================================
// MI ARCUS — IN-MEMORY CHUNKED UPLOAD REGISTRY
// ==========================================================
//
// Tracks in-progress and just-finished chunked uploads (see
// middleware/chunkedUpload.js) so a very large bulk-upload file (up
// to the app's configured MAX_UPLOAD_SIZE — see middleware/
// fileSecurity.js, default 100 GB) can reach the server as many
// small pieces instead of one giant HTTP request. That is the only
// way to get a file bigger than IIS's own hard ~4 GB per-request
// ceiling through the reverse proxy in front of this app — see
// server/web.config for exactly why that ceiling exists and cannot
// be configured any higher.
//
// IMPORTANT — SINGLE PROCESS ONLY:
// This is a plain in-memory Map, not a shared/external store. It
// assumes the Node app runs as a single process behind the IIS
// reverse proxy, exactly as documented in server/web.config and
// client/src/axiosConfig.js (one IIS site proxying to one
// 127.0.0.1:5000 process). If this app is ever scaled out to
// multiple Node instances/load-balanced processes, this registry
// must move to a shared store (Redis, a database table, etc.) so
// every instance can see the same in-progress uploads — a chunk can
// otherwise land on an instance that never saw the matching /init
// call.
// ==========================================================

const crypto = require("crypto");

// uploadId -> {
//   userId, originalName, mimetype, totalChunks, totalSize, chunkDir,
//   receivedChunks: Set<number>, createdAt
// }
const pendingUploads = new Map();

// token (the final assembled filename saved under UPLOAD_DIR) -> {
//   userId, originalName, mimetype, size, createdAt
// }
const completedUploads = new Map();

// Generous — a 100 GB transfer can legitimately take hours on a slow
// or unreliable office/store connection, and chunks may be retried.
const PENDING_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// An assembled file must be claimed by the real bulk-upload route
// (resolveAssembledFile in middleware/chunkedUpload.js) shortly after
// /complete returns its token — the frontend does this immediately,
// so this window only needs to cover normal request latency plus
// some slack, not the transfer itself.
const COMPLETED_TTL_MS = 60 * 60 * 1000; // 1 hour

function createPendingUpload({ userId, originalName, mimetype, totalChunks, totalSize }) {
    const uploadId = crypto.randomUUID();

    pendingUploads.set(uploadId, {
        userId,
        originalName,
        mimetype,
        totalChunks,
        totalSize,
        chunkDir: null,
        receivedChunks: new Set(),
        createdAt: Date.now()
    });

    return uploadId;
}

function getPendingUpload(uploadId) {
    return pendingUploads.get(String(uploadId || "")) || null;
}

function deletePendingUpload(uploadId) {
    pendingUploads.delete(String(uploadId || ""));
}

function markCompleted(token, meta) {
    completedUploads.set(token, { ...meta, createdAt: Date.now() });
}

// Single-use: the first successful claim removes the entry so the
// same assembled file token cannot be replayed into a second bulk
// upload.
function claimCompleted(token) {
    const entry = completedUploads.get(token);
    if (!entry) return null;
    completedUploads.delete(token);
    return entry;
}

// Called periodically (see middleware/chunkedUpload.js) to release
// abandoned uploads — e.g. a browser tab closed mid-transfer — and
// their temp chunk directories. `onExpirePending` is given the full
// pending-upload entry so the caller can remove its chunkDir from
// disk.
function cleanupExpired(onExpirePending) {
    const now = Date.now();

    for (const [uploadId, entry] of pendingUploads.entries()) {
        if (now - entry.createdAt > PENDING_TTL_MS) {
            pendingUploads.delete(uploadId);
            if (typeof onExpirePending === "function") onExpirePending(entry);
        }
    }

    for (const [token, entry] of completedUploads.entries()) {
        if (now - entry.createdAt > COMPLETED_TTL_MS) {
            completedUploads.delete(token);
        }
    }
}

module.exports = {
    createPendingUpload,
    getPendingUpload,
    deletePendingUpload,
    markCompleted,
    claimCompleted,
    cleanupExpired
};

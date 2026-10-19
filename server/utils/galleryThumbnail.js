// ======================================================
// MIARCUS — GALLERY THUMBNAILS
// ------------------------------------------------------
// WHY THIS EXISTS (root cause of the Gallery DevTools errors)
// The Gallery grid used to download the FULL ORIGINAL file for every
// card — 24 cards per page, each 200 KB–1+ MB, all at once, every page.
// Each one also pulled the full BLOB out of MySQL, holding one of the
// (10 by default) pool connections. On a store/factory connection that
// saturated the single HTTP/2 connection to rytual2.miarcus.com; Chrome's
// HTTP/2 PING then timed out (ERR_HTTP2_PING_FAILED) and Chrome reset the
// whole connection, which failed every request riding on it at that
// moment — heartbeat, location update, notification-center and the SSE
// stream (ERR_CONNECTION_RESET) — and the service worker then logged
// "FetchEvent ... network error response" for the page navigation.
//
// Thumbnails are ~15–40 KB WebP (≈10× smaller) and are kept in a small,
// bounded in-memory LRU so repeat views do not touch the MySQL BLOB.
//
// `sharp` is already a server dependency (photo OCR). If it is missing
// or cannot decode a file, callers fall back to the original file, so
// nothing breaks.
// ======================================================

let sharp = null;
try {
    // eslint-disable-next-line global-require
    sharp = require("sharp");
} catch {
    sharp = null;
}

const THUMB_WIDTH = Math.min(Math.max(Number(process.env.GALLERY_THUMB_WIDTH) || 480, 120), 1280);
const THUMB_QUALITY = Math.min(Math.max(Number(process.env.GALLERY_THUMB_QUALITY) || 70, 30), 90);
// Total bytes kept in memory for thumbnails (default 32 MB).
const CACHE_MAX_BYTES = Math.max(Number(process.env.GALLERY_THUMB_CACHE_BYTES) || 32 * 1024 * 1024, 0);
// Never try to decode enormous originals in-process (default 40 MB).
const MAX_SOURCE_BYTES = Math.max(Number(process.env.GALLERY_THUMB_MAX_SOURCE_BYTES) || 40 * 1024 * 1024, 1);
// Limit concurrent sharp jobs so a burst of thumbnails cannot starve the CPU.
const MAX_CONCURRENT = Math.min(Math.max(Number(process.env.GALLERY_THUMB_CONCURRENCY) || 2, 1), 8);

const THUMBNAIL_MIME = "image/webp";

// Raster formats sharp can decode safely. SVG is deliberately excluded
// (active content) — those keep using the original-file path.
const THUMBNAILABLE = new Set([
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/heic",
    "image/heif",
    "image/tiff",
]);

const isThumbnailable = (mime) =>
    Boolean(sharp) && THUMBNAILABLE.has(String(mime || "").toLowerCase().split(";")[0].trim());

// ------------------------------------------------------
// Bounded LRU (Map keeps insertion order)
// ------------------------------------------------------
class ByteLru {
    constructor(maxBytes) {
        this.maxBytes = maxBytes;
        this.bytes = 0;
        this.map = new Map();
    }

    get(key) {
        const value = this.map.get(key);
        if (!value) return null;
        this.map.delete(key);
        this.map.set(key, value);
        return value;
    }

    set(key, buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) return;
        if (buffer.length > this.maxBytes) return;
        this.delete(key);
        this.map.set(key, buffer);
        this.bytes += buffer.length;
        while (this.bytes > this.maxBytes && this.map.size) {
            const oldestKey = this.map.keys().next().value;
            this.delete(oldestKey);
        }
    }

    delete(key) {
        const existing = this.map.get(key);
        if (existing) {
            this.bytes -= existing.length;
            this.map.delete(key);
        }
    }

    clear() {
        this.map.clear();
        this.bytes = 0;
    }

    get size() {
        return this.map.size;
    }
}

const cache = new ByteLru(CACHE_MAX_BYTES);

// ------------------------------------------------------
// Tiny semaphore for sharp jobs
// ------------------------------------------------------
let running = 0;
const waiting = [];

const acquire = () =>
    new Promise((resolve) => {
        if (running < MAX_CONCURRENT) {
            running += 1;
            resolve();
        } else {
            waiting.push(resolve);
        }
    });

const release = () => {
    const next = waiting.shift();
    if (next) next();
    else running = Math.max(0, running - 1);
};

const cacheKey = (id, fileSize) => `${Number(id)}:${Number(fileSize) || 0}`;

/** Cached thumbnail for this record, or null. */
function getCachedThumbnail(id, fileSize) {
    return cache.get(cacheKey(id, fileSize));
}

/**
 * Build (and cache) a WebP thumbnail from the original bytes.
 * Returns a Buffer, or null when a thumbnail cannot be produced.
 */
async function buildThumbnail(id, fileSize, sourceBuffer, mime) {
    if (!isThumbnailable(mime)) return null;
    if (!Buffer.isBuffer(sourceBuffer) || sourceBuffer.length === 0) return null;
    if (sourceBuffer.length > MAX_SOURCE_BYTES) return null;

    await acquire();
    try {
        const output = await sharp(sourceBuffer, {
            failOn: "none",
            limitInputPixels: 100 * 1000 * 1000,
            animated: false,
        })
            .rotate() // honour EXIF orientation from phone cameras
            .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH, fit: "inside", withoutEnlargement: true })
            .webp({ quality: THUMB_QUALITY })
            .toBuffer();

        cache.set(cacheKey(id, fileSize), output);
        return output;
    } catch (error) {
        console.warn("Gallery thumbnail failed:", Number(id), error.message);
        return null;
    } finally {
        release();
    }
}

/** Drop cached thumbnails for a record (after delete). */
function forgetThumbnail(id) {
    const prefix = `${Number(id)}:`;
    for (const key of [...cache.map.keys()]) {
        if (key.startsWith(prefix)) cache.delete(key);
    }
}

module.exports = {
    THUMBNAIL_MIME,
    isThumbnailable,
    getCachedThumbnail,
    buildThumbnail,
    forgetThumbnail,
    // exported for tests
    ByteLru,
    _cache: cache,
    _hasSharp: () => Boolean(sharp),
};

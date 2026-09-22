// ======================================================
// SHARED "LONGER TIMEOUT FOR BULK UPLOAD" MIDDLEWARE
//
// Node's default HTTP server timeout (2 minutes) — and some reverse
// proxies' default gateway timeout — can be shorter than a very large
// bulk-upload file (tens/hundreds of thousands of rows, or a single
// multi-gigabyte chunk of a 100 GB upload — see
// middleware/chunkedUpload.js) legitimately needs to upload + parse +
// import, even after the byte-size ceiling itself has been raised to
// the app's configured maximum (see MAX_UPLOAD_SIZE in
// middleware/fileSecurity.js, and middleware/bulkFileUpload.js /
// middleware/csvUpload.js). Mount this on a bulk-upload (or chunked
// upload) route so a big transfer is never cut off mid-request;
// small/normal requests are unaffected since they finish long before
// the old limit anyway.
//
// Every route that mounts this middleware relies on it matching (or
// being shorter than) the reverse-proxy timeout configured in
// server/web.config's <proxy timeout="..."> and the Node server-level
// httpServer.requestTimeout set in server.js — all three are kept in
// sync at 4 hours so nothing has a shorter, silently-conflicting
// ceiling than this one.
//
// Configurable via UPLOAD_TIMEOUT_MS so an operator can raise it
// further for an especially slow link without a code change.
// ======================================================

const UPLOAD_TIMEOUT_MS =
    Number(process.env.UPLOAD_TIMEOUT_MS) > 0
        ? Number(process.env.UPLOAD_TIMEOUT_MS)
        : 4 * 60 * 60 * 1000; // 4 hours

const extendUploadTimeout = (req, res, next) => {
    req.setTimeout(UPLOAD_TIMEOUT_MS);
    res.setTimeout(UPLOAD_TIMEOUT_MS);
    next();
};

module.exports = extendUploadTimeout;
module.exports.UPLOAD_TIMEOUT_MS = UPLOAD_TIMEOUT_MS;

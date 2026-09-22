// ======================================================
// SHARED "LONGER TIMEOUT FOR BULK UPLOAD" MIDDLEWARE
//
// Node's default HTTP server timeout (2 minutes) — and some reverse
// proxies' default gateway timeout — can be shorter than a very large
// bulk-upload file (tens/hundreds of thousands of rows) legitimately
// needs to upload + parse + import, even after the byte-size ceiling
// itself has been removed (see middleware/bulkFileUpload.js and
// middleware/csvUpload.js). Mount this on a bulk-upload route so a
// big file is never cut off mid-request; small/normal files are
// unaffected since they finish long before the old limit anyway.
//
// Mirrors the timeout already used on the Checklist Reports bulk
// upload route (routes/checklistReportRoutes.js) so every bulk-import
// feature in the app gets the same treatment.
// ======================================================

const ONE_HOUR_MS = 60 * 60 * 1000;

const extendUploadTimeout = (req, res, next) => {
    req.setTimeout(ONE_HOUR_MS);
    res.setTimeout(ONE_HOUR_MS);
    next();
};

module.exports = extendUploadTimeout;

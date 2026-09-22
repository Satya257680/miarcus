const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

// ======================================================
// BULK UPLOAD MULTER CONFIGURATION
//
// Shared "any format" bulk-upload middleware (CSV/XLSX/XLS/PDF/
// photo/video, disk storage, 100 MB limit) — see
// middleware/bulkFileUpload.js. Disk storage (rather than the
// previous in-memory buffer) is required so the shared
// utils/bulkFileParser.js can read the file the same way it does
// for every other bulk-upload route in the app.
// ======================================================

const upload = require("../middleware/bulkFileUpload");

// ======================================================
// LONGER TIMEOUT FOR BULK UPLOAD
//
// Shared middleware — see middleware/extendUploadTimeout.js. Node's
// default HTTP server timeout (2 minutes), and some reverse proxies'
// default gateway timeout, can be far shorter than a very large file
// (tens/hundreds of thousands of rows, or a multi-gigabyte chunk of a
// 100 GB upload) legitimately needs to upload + parse + import.
// ======================================================

const extendUploadTimeout = require("../middleware/extendUploadTimeout");

// ======================================================
// RESOLVE A CHUNKED-UPLOAD FILE
//
// Mounted directly after `upload.single("file")` below. When the
// browser used the large-file chunked upload flow instead of a normal
// single-request multipart upload (see middleware/chunkedUpload.js
// and client/src/components/common/BulkUploadModal), this turns the
// small JSON { assembledFile } completion body back into the same
// req.file shape multer would have produced, so
// bulkUploadChecklistReports below needs no changes either way.
// ======================================================

const { resolveAssembledFile } = require("../middleware/chunkedUpload");

// ======================================================
// CONTROLLER
// ======================================================

const {

    getAllReports,

    getReportById,

    updateReport,

    deleteReport,

    deleteAllReports,

    bulkUploadChecklistReports,

    exportReports

} = require("../controllers/checklistReportController");

// ======================================================
// BASE URL
// /api/checklist-reports
// ======================================================

// ======================================================
// GET ALL REPORTS
// GET /api/checklist-reports
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "View"

    ),

    getAllReports

);

// ======================================================
// EXPORT REPORTS
// GET /api/checklist-reports/export
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "View"

    ),

    exportReports

);

// ======================================================
// BULK UPLOAD REPORTS
// POST /api/checklist-reports/bulk-upload
// ======================================================

router.post(

    "/bulk-upload",

    extendUploadTimeout,

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "Add"

    ),

    upload.single("file"),

    resolveAssembledFile,

    bulkUploadChecklistReports

);

// ======================================================
// DELETE ALL REPORTS
// DELETE /api/checklist-reports/all
// IMPORTANT: must be before /:id.
// ======================================================

router.delete(
    "/all",
    authMiddleware,
    permissionMiddleware(
        "Checklist Reports",
        "Full"
    ),
    deleteAllReports
);


// ======================================================
// GET REPORT BY ID
// GET /api/checklist-reports/:id
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "View"

    ),

    getReportById

);

// ======================================================
// UPDATE REPORT
// PUT /api/checklist-reports/:id
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "Edit"

    ),

    updateReport

);

// ======================================================
// DELETE REPORT
// DELETE /api/checklist-reports/:id
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "Full"

    ),

    deleteReport

);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
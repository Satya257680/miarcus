const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const upload = require("../middleware/upload");
// Shared "any format" bulk-upload middleware (CSV/XLSX/XLS/PDF/photo/
// video, disk storage, 100 MB limit) — used only for the dedicated
// bulk-upload route below so the shared utils/bulkFileParser.js can
// read the uploaded file the same way every other bulk-upload route
// in the app does.
const bulkFileUpload = require("../middleware/bulkFileUpload");
const syncGalleryAttachment = require("../middleware/galleryAttachmentSync");
const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

// A large bulk-upload file needs more processing time than Express's/
// Node's default request timeout allows — shared middleware, kept in
// sync with the Checklist Reports bulk-upload route (see
// middleware/extendUploadTimeout.js). Previously this route used its
// own, much shorter 15-minute timeout instead of the 60 (now 4 hour)
// value the Checklist Reports route used — that mismatch could cut a
// genuinely large Action Points import off mid-request even though
// the same-size file would have succeeded on the other route.
const extendUploadTimeout = require("../middleware/extendUploadTimeout");

// See routes/checklistReportRoutes.js for what this does — turns a
// completed chunked upload's { assembledFile } token back into a
// normal req.file so bulkUploadActionPoints needs no changes either
// way.
const { resolveAssembledFile } = require("../middleware/chunkedUpload");

// ======================================================
// CONTROLLER
// ======================================================

const {
    getAllActionPoints,
    getActionPointById,
    getActionPointsByNSO,
    exportActionPointsCSV,
    bulkUploadActionPoints,
    getActionPointBulkUploadStatus,
    createActionPoint,
    updateActionPoint,
    takeAction,
    getActionPointHistory,
    changeActionPointStatus,
    deleteActionPoint,
    deleteAllActionPoints,
    getAssignees
} = require("../controllers/actionPointController");

// ======================================================
// BASE URL
// /api/action-points
// ======================================================


// ======================================================
// GET ALL ACTION POINTS
// GET /api/action-points
//
// Permission:
// View
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "View"
    ),
    getAllActionPoints
);


// ======================================================
// EXPORT ACTION POINTS CSV
// GET /api/action-points/export
//
// IMPORTANT:
// This route MUST remain before /:id
//
// Permission:
// View
// ======================================================

router.get(
    "/export",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "View"
    ),
    exportActionPointsCSV
);


// ======================================================
// GET ACTION POINTS BY NEW STORE OPENING
// GET /api/action-points/nso/:newStoreOpeningId
//
// IMPORTANT: keep this route before /:id.
// ======================================================

router.get(
    "/nso/:newStoreOpeningId",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "View"
    ),
    getActionPointsByNSO
);


// ======================================================
// BULK UPLOAD ACTION POINT STATUS
// GET /api/action-points/bulk-upload/status/:jobId
// ======================================================

router.get(
    "/bulk-upload/status/:jobId",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Add"
    ),
    getActionPointBulkUploadStatus
);

// ======================================================
// BULK UPLOAD ACTION POINTS
// POST /api/action-points/bulk-upload
//
// Permission:
// Add
// ======================================================

router.post(
    "/bulk-upload",
    extendUploadTimeout,
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Add"
    ),
    bulkFileUpload.single("file"),
    resolveAssembledFile,
    bulkUploadActionPoints
);


// ======================================================
// SUMMARY (KPI cards) + RE-CHECK CLASSIFICATION
// Keep these before /:id.
// ======================================================

const {
    getActionPointSummary,
    reclassifyActionPoints
} = require("../controllers/actionPointInsightsController");

// Users for the "Assigned To" dropdown — keep before /:id.
router.get(
    "/assignees",
    authMiddleware,
    permissionMiddleware("Action Points", "View"),
    getAssignees
);

router.get(
    "/summary",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "View"
    ),
    getActionPointSummary
);

router.post(
    "/reclassify",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Full"
    ),
    reclassifyActionPoints
);


// ======================================================
// GET ACTION POINT BY ID
// GET /api/action-points/:id
//
// Permission:
// View
// ======================================================

router.get(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "View"
    ),
    getActionPointById
);


// ======================================================
// CREATE ACTION POINT
// POST /api/action-points
//
// Content-Type:
// multipart/form-data
//
// Attachment field:
// attachment
//
// Permission:
// Add
// ======================================================

router.post(
    "/",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Add"
    ),
    upload.single("attachment"),
    syncGalleryAttachment("Action Points", "attachment"),
    createActionPoint
);


// ======================================================
// HISTORY
// GET /api/action-points/:id/history
// Must stay before /:id.
// ======================================================

router.get(
    "/:id/history",
    authMiddleware,
    permissionMiddleware("Action Points", "View"),
    getActionPointHistory
);

// ======================================================
// NEXT ACTION STATUS
// PUT /api/action-points/:id/status
// ======================================================

router.put(
    "/:id/status",
    authMiddleware,
    permissionMiddleware("Action Points", "Edit"),
    changeActionPointStatus
);

// ======================================================
// TAKE ACTION
// PUT /api/action-points/:id/take-action
//
// IMPORTANT:
// This route MUST be BEFORE the generic
// PUT /:id route.
//
// Otherwise Express may match:
// /:id
//
// with:
// id = "123/take-action"
// or incorrectly route the request.
//
// Permission:
// Edit
// ======================================================

router.put(
    "/:id/take-action",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Edit"
    ),
    takeAction
);


// ======================================================
// UPDATE ACTION POINT
// PUT /api/action-points/:id
//
// Content-Type:
// multipart/form-data
//
// Attachment field:
// attachment
//
// Permission:
// Edit
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Edit"
    ),
    upload.single("attachment"),
    syncGalleryAttachment("Action Points", "attachment"),
    updateActionPoint
);


// ======================================================
// DELETE ACTION POINT
// DELETE /api/action-points/:id
//
// Permission:
// Full
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Full"
    ),
    deleteActionPoint
);


// ======================================================
// DELETE ALL ACTION POINTS
// DELETE /api/action-points
//
// IMPORTANT:
// This route is separate from DELETE /:id.
//
// Permission:
// Full
// ======================================================

router.delete(
    "/",
    authMiddleware,
    permissionMiddleware(
        "Action Points",
        "Full"
    ),
    deleteAllActionPoints
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
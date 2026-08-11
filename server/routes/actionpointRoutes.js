const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const upload = require("../middleware/upload");

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

// ======================================================
// CONTROLLER
// ======================================================

const {
    getAllActionPoints,
    getActionPointById,
    getActionPointsByNSO,
    exportActionPointsCSV,
    createActionPoint,
    updateActionPoint,
    takeAction,
    deleteActionPoint,
    deleteAllActionPoints
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
    createActionPoint
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
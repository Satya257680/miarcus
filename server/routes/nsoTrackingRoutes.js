const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

// ======================================================
// CONTROLLER
// ======================================================

const {
    getAllNSOTracking,
    getNSOTrackingById,
    getByStoreOpening,
    createNSOTracking,
    updateNSOTracking,
    updateStatus,
    deleteNSOTracking,
    deleteAllNSOTracking,
    exportNSOTracking
} = require("../controllers/nsoTrackingController");

// ======================================================
// BASE URL
// ======================================================
// /api/nso-tracking
//
// Available endpoints:
//
// GET     /api/nso-tracking
// GET     /api/nso-tracking/export
// GET     /api/nso-tracking/store/:id
// GET     /api/nso-tracking/:id
// POST    /api/nso-tracking
// PUT     /api/nso-tracking/:id
// PATCH   /api/nso-tracking/status/:id
// DELETE  /api/nso-tracking/:id
// DELETE  /api/nso-tracking/delete-all
// ======================================================


// ======================================================
// EXPORT CSV
// IMPORTANT:
// This route MUST come before /:id
// ======================================================

router.get(
    "/export",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),
    exportNSOTracking
);


// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),
    getAllNSOTracking
);


// ======================================================
// GET TRACKING BY NEW STORE OPENING ID
// ======================================================
//
// Example:
// GET /api/nso-tracking/store/39
//
// This MUST remain before /:id
// ======================================================

router.get(
    "/store/:id",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),
    getByStoreOpening
);


// ======================================================
// CREATE NSO TRACKING
// ======================================================
//
// Permission:
// Add
//
// The controller should receive the authenticated
// user information from authMiddleware.
// ======================================================

router.post(
    "/",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "Add"
    ),
    createNSOTracking
);


// ======================================================
// DELETE ALL NSO TRACKING
// ======================================================
//
// Permission:
// Full
//
// This is a destructive operation.
// ======================================================

router.delete(
    "/delete-all",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "Full"
    ),
    deleteAllNSOTracking
);


// ======================================================
// UPDATE TRACKING STATUS
// ======================================================
//
// Example:
// PATCH /api/nso-tracking/status/10
//
// Permission:
// Edit
// ======================================================

router.patch(
    "/status/:id",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "Edit"
    ),
    updateStatus
);


// ======================================================
// GET NSO TRACKING BY ID
// ======================================================
//
// Example:
// GET /api/nso-tracking/10
//
// IMPORTANT:
// Keep this AFTER /store/:id and /export
// ======================================================

router.get(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),
    getNSOTrackingById
);


// ======================================================
// UPDATE NSO TRACKING
// ======================================================
//
// Example:
// PUT /api/nso-tracking/10
//
// Permission:
// Edit
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "Edit"
    ),
    updateNSOTracking
);


// ======================================================
// DELETE NSO TRACKING
// ======================================================
//
// Example:
// DELETE /api/nso-tracking/10
//
// Permission:
// Full
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "NSO Tracking",
        "Full"
    ),
    deleteNSOTracking
);


// ======================================================
// MODULE EXPORT
// ======================================================

module.exports = router;
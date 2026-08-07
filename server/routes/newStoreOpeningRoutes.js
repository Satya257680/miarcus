const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");

// ======================================================
// CONTROLLER
// ======================================================

const {
    getAllNewStoreOpenings,
    getNewStoreOpeningById,
    createNewStoreOpening,
    updateNewStoreOpening,
    deleteNewStoreOpening,
    deleteAllNewStoreOpenings,
    exportNewStoreOpeningsCSV,
    bulkUploadNewStoreOpenings
} = require("../controllers/newStoreOpeningController");

// ======================================================
// HEALTH
// ======================================================

router.get(
    "/health",
    (req, res) => {
        res.json({
            success: true,
            message: "New Store Opening API is running."
        });
    }
);

// ======================================================
// EXPORT
// ======================================================

router.get(
    "/export",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "View"
    ),
    exportNewStoreOpeningsCSV
);

// ======================================================
// BULK UPLOAD
// ======================================================

router.post(
    "/bulk-upload",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "Add"
    ),
    upload.single("file"),
    bulkUploadNewStoreOpenings
);

// ======================================================
// DELETE ALL
// IMPORTANT: BEFORE /:id
// ======================================================

router.delete(
    "/delete-all",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "Full"
    ),
    deleteAllNewStoreOpenings
);

// ======================================================
// GET ALL
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "View"
    ),
    getAllNewStoreOpenings
);

// ======================================================
// CREATE
// ======================================================

router.post(
    "/",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "Add"
    ),
    upload.single("attachment"),
    createNewStoreOpening
);

// ======================================================
// GET BY ID
// ======================================================

router.get(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "View"
    ),
    getNewStoreOpeningById
);

// ======================================================
// UPDATE
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "Edit"
    ),
    upload.single("attachment"),
    updateNewStoreOpening
);

// ======================================================
// DELETE SINGLE
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "Full"
    ),
    deleteNewStoreOpening
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;
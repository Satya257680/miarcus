const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");
const syncGalleryAttachment = require("../middleware/galleryAttachmentSync");
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
    bulkUploadNewStoreOpenings,
    downloadNewStoreOpeningsSample
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
// BULK UPLOAD — SAMPLE FILE
// ======================================================
//
// BUG FIX: the "Download Sample File" button in the Bulk Upload
// modal (client/src/pages/NewStoreOpenings.jsx) has always pointed
// at this exact path, but the route never existed on the server, so
// every click 404'd. Registered here — before the "/:id" route below
// — so "/sample" isn't swallowed as an :id lookup.
// ======================================================

router.get(
    "/sample",
    authMiddleware,
    permissionMiddleware(
        "New Store Openings",
        "View"
    ),
    downloadNewStoreOpeningsSample
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
    syncGalleryAttachment("New Store Openings", "attachment"),
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
    syncGalleryAttachment("New Store Openings", "attachment"),
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
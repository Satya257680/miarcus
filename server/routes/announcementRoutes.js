const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const permissionMiddleware = require(
    "../middleware/permissionMiddleware"
);

const upload = require(
    "../middleware/upload"
);

// ======================================================
// CONTROLLER
// ======================================================

const {
    getAnnouncements,
    getUsers,
    createAnnouncement,
    updateAnnouncement,
    getRecipientUsers,
    markRead,
    getCounts,
    markEmailDelivered,
    deleteAnnouncement,
    bulkUploadAnnouncements,
    exportAnnouncements,
    deleteAllAnnouncements
} = require(
    "../controllers/announcementController"
);

// ======================================================
// GET ALL ANNOUNCEMENTS
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "View"
    ),
    getAnnouncements
);

// ======================================================
// GET USERS
// ======================================================

router.get(
    "/users",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Add"
    ),
    getUsers
);

// ======================================================
// BULK UPLOAD
//
// Uses the same upload middleware.
// No file-size limit.
// ======================================================

router.post(
    "/bulk-upload",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Add"
    ),
    upload.single("file"),
    bulkUploadAnnouncements
);

// ======================================================
// EXPORT
// ======================================================

router.get(
    "/export",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "View"
    ),
    exportAnnouncements
);

// ======================================================
// DELETE ALL
// ======================================================

router.delete(
    "/delete-all",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Full"
    ),
    deleteAllAnnouncements
);

// ======================================================
// CREATE ANNOUNCEMENT
//
// Attachment field:
// attachment
//
// No file-size limit.
// ======================================================

router.post(
    "/",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Add"
    ),
    upload.single("attachment"),
    createAnnouncement
);

// ======================================================
// UPDATE ANNOUNCEMENT
//
// Supports:
// - title
// - message/content
// - audience
// - pin/unpin
// - attachment replacement
// - attachment removal
//
// No file-size limit.
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Edit"
    ),
    upload.single("attachment"),
    updateAnnouncement
);

// ======================================================
// GET RECIPIENT USERS
// ======================================================

router.get(
    "/:id/recipients",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Edit"
    ),
    getRecipientUsers
);

// ======================================================
// MARK AS READ
// ======================================================

router.put(
    "/:id/read",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "View"
    ),
    markRead
);

// ======================================================
// GET COUNTS
// ======================================================

router.get(
    "/:id/counts",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "View"
    ),
    getCounts
);

// ======================================================
// MARK EMAIL DELIVERED
// ======================================================

router.put(
    "/email/:recipientId/delivered",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Edit"
    ),
    markEmailDelivered
);

// ======================================================
// DELETE SINGLE ANNOUNCEMENT
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware(
        "Announcements",
        "Full"
    ),
    deleteAnnouncement
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
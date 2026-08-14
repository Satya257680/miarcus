const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");

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
} = require("../controllers/announcementController");

router.get(
    "/",
    authMiddleware,
    permissionMiddleware("Announcements", "View"),
    getAnnouncements
);

router.get(
    "/users",
    authMiddleware,
    permissionMiddleware("Announcements", "Add"),
    getUsers
);

router.post(
    "/bulk-upload",
    authMiddleware,
    permissionMiddleware("Announcements", "Add"),
    upload.single("file"),
    bulkUploadAnnouncements
);

router.get(
    "/export",
    authMiddleware,
    permissionMiddleware("Announcements", "View"),
    exportAnnouncements
);

router.delete(
    "/delete-all",
    authMiddleware,
    permissionMiddleware("Announcements", "Full"),
    deleteAllAnnouncements
);

router.post(
    "/",
    authMiddleware,
    permissionMiddleware("Announcements", "Add"),
    upload.single("attachment"),
    createAnnouncement
);

// Edit announcement, including pin/unpin and optional attachment replacement.
router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware("Announcements", "Edit"),
    upload.single("attachment"),
    updateAnnouncement
);

router.get(
    "/:id/recipients",
    authMiddleware,
    permissionMiddleware("Announcements", "Edit"),
    getRecipientUsers
);

router.put(
    "/:id/read",
    authMiddleware,
    permissionMiddleware("Announcements", "View"),
    markRead
);

router.get(
    "/:id/counts",
    authMiddleware,
    permissionMiddleware("Announcements", "View"),
    getCounts
);

router.put(
    "/email/:recipientId/delivered",
    authMiddleware,
    permissionMiddleware("Announcements", "Edit"),
    markEmailDelivered
);

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware("Announcements", "Full"),
    deleteAnnouncement
);

module.exports = router;

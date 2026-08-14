const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");

const {
    getAnnouncements,
    getUsers,
    createAnnouncement,
    markRead,
    getCounts,
    markEmailDelivered,
    deleteAnnouncement
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
    "/",
    authMiddleware,
    permissionMiddleware("Announcements", "Add"),
    upload.single("attachment"),
    createAnnouncement
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

// This endpoint is for a future email-provider webhook/manual delivery confirmation.
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

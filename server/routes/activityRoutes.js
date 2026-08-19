const express = require("express");

const router = express.Router();

const activityController = require("../controllers/activityController");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const activityAccessMiddleware = require("../middleware/activityAccessMiddleware");
const upload = require("../middleware/upload");
const syncGalleryAttachment = require("../middleware/galleryAttachmentSync");
// ======================================================
// GET ALL ACTIVITIES
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getAllActivities

);

// ======================================================
// GET ACTIVITY DETAILS
// ======================================================

router.get(

    "/:id/details",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityAccessMiddleware,

    activityController.getActivityDetails

);

// ======================================================
// GET ACTIVITY COMMENTS
// ======================================================

router.get(

    "/:id/comments",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityAccessMiddleware,

    activityController.getActivityComments

);

// ======================================================
// ADD ACTIVITY COMMENT
// ======================================================

router.post(

    "/:id/comments",

    authMiddleware,

    permissionMiddleware("Activity Center", "Edit"),

    activityAccessMiddleware,

    activityController.addComment

);

// ======================================================
// GET ACTIVITY FILES
// ======================================================

router.get(

    "/:id/files",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityAccessMiddleware,

    activityController.getActivityFiles

);

// ======================================================
// UPLOAD ACTIVITY FILE
// ======================================================

router.post(

    "/:id/files",

    authMiddleware,

    permissionMiddleware("Activity Center", "Edit"),

    activityAccessMiddleware,

    upload.single("file"),

    syncGalleryAttachment("Activity Center", "file"),

    activityController.uploadActivityFile

);

// ======================================================
// DELETE ACTIVITY FILE
// ======================================================

router.delete(

    "/files/:fileId",

    authMiddleware,

    permissionMiddleware("Activity Center", "Edit"),

    activityAccessMiddleware,

    activityController.deleteActivityFile

);

// ======================================================
// GET ACTIVITY NOTIFICATIONS
// ======================================================

router.get(

    "/:id/notifications",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityAccessMiddleware,

    activityController.getActivityNotifications

);

// ======================================================
// GET ACTIVITY MENTIONS
// ======================================================

router.get(

    "/:id/mentions",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityAccessMiddleware,

    activityController.getActivityMentions

);

// ======================================================
// GET ACTIVITY TIMELINE
// ======================================================

router.get(

    "/:id/timeline",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityAccessMiddleware,

    activityController.getActivityTimeline

);

// ======================================================
// GET ACTIVITY BY ID
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityAccessMiddleware,

    activityController.getActivityById

);

module.exports = router;
const express = require("express");

const router = express.Router();

const activityController = require("../controllers/activityController");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");

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
// IMPORTANT: Place this BEFORE "/:id"
// ======================================================

router.get(

    "/:id/details",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getActivityDetails

);

// ======================================================
// GET ACTIVITY COMMENTS
// ======================================================

router.get(

    "/:id/comments",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getActivityComments

);

// ======================================================
// ADD ACTIVITY COMMENT
// ======================================================

router.post(

    "/:id/comments",

    authMiddleware,

    permissionMiddleware("Activity Center", "Edit"),

    activityController.addComment

);

// ======================================================
// GET ACTIVITY FILES
// ======================================================

router.get(

    "/:id/files",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getActivityFiles

);

// ======================================================
// UPLOAD ACTIVITY FILE
// ======================================================

router.post(

    "/:id/files",

    authMiddleware,

    permissionMiddleware("Activity Center", "Edit"),

    upload.single("file"),

    activityController.uploadActivityFile

);

// ======================================================
// DELETE ACTIVITY FILE
// ======================================================

router.delete(

    "/files/:fileId",

    authMiddleware,

    permissionMiddleware("Activity Center", "Edit"),

    activityController.deleteActivityFile

);

// ======================================================
// GET ACTIVITY NOTIFICATIONS
// ======================================================

router.get(

    "/:id/notifications",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getActivityNotifications

);

// ======================================================
// GET ACTIVITY MENTIONS
// ======================================================

router.get(

    "/:id/mentions",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getActivityMentions

);

// ======================================================
// GET ACTIVITY TIMELINE
// ======================================================

router.get(

    "/:id/timeline",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getActivityTimeline

);

// ======================================================
// GET ACTIVITY BY ID
// KEEP THIS LAST
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware("Activity Center", "View"),

    activityController.getActivityById

);

module.exports = router;
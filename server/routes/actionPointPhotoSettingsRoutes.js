const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/actionPointPhotoSettingsController");

// ======================================================
// TAKE ACTION PHOTO RULE
// Base: /api/action-point-photo-settings
//
// GET -> anyone with Action Points "View" (needed by the form)
// PUT -> Administrators ONLY (not "Full" access users)
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware("Action Points", "View"),
    controller.getSettings
);

router.put(
    "/",
    authMiddleware,
    adminOnly,
    controller.updateSettings
);

module.exports = router;

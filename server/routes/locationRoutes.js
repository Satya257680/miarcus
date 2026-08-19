const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const controller = require("../controllers/locationController");

router.use(authMiddleware);

router.get(
    "/config",
    permissionMiddleware("Employee Location", "View"),
    controller.getConfig
);

router.get(
    "/live",
    permissionMiddleware("Employee Location", "View"),
    controller.getLive
);

router.get(
    "/history/:employeeId",
    permissionMiddleware("Employee Location", "View"),
    controller.getHistory
);

router.get(
    "/access-logs",
    permissionMiddleware("Employee Location", "Full"),
    controller.getAccessLogs
);

module.exports = router;

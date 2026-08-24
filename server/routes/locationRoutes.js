const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const controller = require("../controllers/locationController");
const adminOnlyLocation = (req, res, next) => {
    const isAdmin = Number(req.user?.is_admin) === 1;
    if (!isAdmin) return res.status(403).json({ success: false, message: "Employee Location is restricted to administrators." });
    next();
};


router.use(authMiddleware);

// Employee self-service: only the logged-in employee can register/update their own device.
router.get("/my-status", controller.getMyStatus);
router.post("/device/register", controller.registerDevice);
router.post("/update", controller.submitLocation);

// Admin/authorized location console: Full permission is required.
router.get("/config", adminOnlyLocation, permissionMiddleware("Employee Location", "Full"), controller.getConfig);
router.get("/live", adminOnlyLocation, permissionMiddleware("Employee Location", "Full"), controller.getLive);
router.get("/history/:employeeId", adminOnlyLocation, permissionMiddleware("Employee Location", "Full"), controller.getHistory);
router.get("/access-logs", adminOnlyLocation, permissionMiddleware("Employee Location", "Full"), controller.getAccessLogs);

module.exports = router;

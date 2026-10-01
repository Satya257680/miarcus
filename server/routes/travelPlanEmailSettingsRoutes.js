const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/travelPlanEmailSettingsController");

router.get("/", authMiddleware, adminOnly, controller.getSettings);
router.put("/", authMiddleware, adminOnly, controller.updateSettings);
router.post("/test", authMiddleware, adminOnly, controller.sendTest);

module.exports = router;

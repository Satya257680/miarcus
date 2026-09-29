const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/storePresenceController");

const router = express.Router();

// Every logged-in user pings this while the website is open.
router.post("/heartbeat", authMiddleware, controller.heartbeat);

// Called when the user logs out / closes the tab.
router.post("/offline", authMiddleware, controller.offline);

// Administrator-only store Online / Offline board.
router.get("/stores", authMiddleware, adminOnly, controller.getStoreStatus);

module.exports = router;

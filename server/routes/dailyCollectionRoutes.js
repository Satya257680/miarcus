const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const adminOnly = require("../middleware/adminOnly");
const upload = require("../middleware/upload");
const controller = require("../controllers/dailyCollectionController");

const canViewBilling = permissionMiddleware("Daily Collection", "View");
const canAddBilling = permissionMiddleware("Daily Collection", "Add");

router.get("/", authMiddleware, canViewBilling, controller.getDailyCollection);
router.get("/stores", authMiddleware, canViewBilling, controller.getDailyCollectionStores);

router.get("/blocked", authMiddleware, adminOnly, controller.getBlockedDailyCollections);
router.get("/email-settings", authMiddleware, adminOnly, controller.getDailyCollectionEmailSettings);
router.put("/email-settings", authMiddleware, adminOnly, controller.updateDailyCollectionEmailSettings);
router.post("/blocked", authMiddleware, adminOnly, controller.blockDailyCollection);
router.post("/blocked/:controlId/unblock", authMiddleware, adminOnly, controller.unblockDailyCollection);

router.post("/bulk-upload", authMiddleware, canAddBilling, upload.single("file"), controller.bulkUploadDailyCollections);
router.delete("/delete-all", authMiddleware, adminOnly, controller.deleteAllDailyCollections);

router.post("/", authMiddleware, canAddBilling, controller.submitDailyCollection);

// The dynamic record routes stay after every static route above.
router.get("/:id", authMiddleware, canViewBilling, controller.getDailyCollectionById);
router.delete("/:id", authMiddleware, adminOnly, controller.deleteDailyCollection);

module.exports = router;

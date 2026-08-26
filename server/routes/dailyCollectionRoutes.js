const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/dailyCollectionController");

const canViewBilling = permissionMiddleware("Daily Collection", "View");
const canAddBilling = permissionMiddleware("Daily Collection", "Add");

router.get(
    "/",
    authMiddleware,
    canViewBilling,
    controller.getDailyCollection
);

router.get(
    "/stores",
    authMiddleware,
    canViewBilling,
    controller.getDailyCollectionStores
);

router.post(
    "/",
    authMiddleware,
    canAddBilling,
    controller.submitDailyCollection
);

router.get(
    "/blocked",
    authMiddleware,
    adminOnly,
    controller.getBlockedDailyCollections
);

router.get(
    "/email-settings",
    authMiddleware,
    adminOnly,
    controller.getDailyCollectionEmailSettings
);

router.put(
    "/email-settings",
    authMiddleware,
    adminOnly,
    controller.updateDailyCollectionEmailSettings
);

router.post(
    "/blocked",
    authMiddleware,
    adminOnly,
    controller.blockDailyCollection
);

router.post(
    "/blocked/:controlId/unblock",
    authMiddleware,
    adminOnly,
    controller.unblockDailyCollection
);

module.exports = router;

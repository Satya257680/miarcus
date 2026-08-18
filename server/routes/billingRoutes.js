const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const controller = require("../controllers/billingController");

const view = permissionMiddleware("Billing", "View");
const add = permissionMiddleware("Billing", "Add");
const edit = permissionMiddleware("Billing", "Edit");

router.get("/reports/daily", authMiddleware, view, controller.dailyReport);
router.get("/audit/:billId", authMiddleware, view, controller.audit);
router.get("/", authMiddleware, view, controller.getBills);
router.get("/:id", authMiddleware, view, controller.getBillById);
router.post("/", authMiddleware, add, controller.createBill);
router.put("/:id", authMiddleware, edit, controller.updateBill);
router.post("/:id/cancel", authMiddleware, edit, controller.cancelBill);
module.exports = router;

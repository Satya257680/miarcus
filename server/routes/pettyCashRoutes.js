const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const pettyPermission = require("../middleware/pettyCashPermissionMiddleware");
const upload = require("../middleware/upload");
const controller = require("../controllers/pettyCashController");

const view = pettyPermission("View");
const add = pettyPermission("Add");
const edit = pettyPermission("Edit");

// Settings and collection routes must be declared before /:id.
router.get("/email-settings", authMiddleware, view, controller.emailSettings);
router.put("/email-settings", authMiddleware, view, controller.updateEmailSettings);
router.get("/options", authMiddleware, view, controller.options);
router.get("/summary", authMiddleware, view, controller.summary);
router.get("/audit/:id", authMiddleware, view, controller.audit);
router.post("/bulk-delete", authMiddleware, edit, controller.bulkCancel);
router.get("/", authMiddleware, view, controller.getAll);
router.get("/:id", authMiddleware, view, controller.getById);
router.post("/", authMiddleware, add, controller.create);
router.post("/:id/expenses", authMiddleware, edit, upload.single("bill"), controller.addExpense);
router.post("/:id/deposits", authMiddleware, edit, upload.single("receipt"), controller.addDeposit);
router.post("/:id/settle", authMiddleware, edit, controller.settle);
router.delete("/:id", authMiddleware, edit, controller.cancel);
router.patch("/:id/cancel", authMiddleware, edit, controller.cancel);

module.exports = router;

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const pettyPermission = require("../middleware/pettyCashPermissionMiddleware");
const upload = require("../middleware/upload");
const syncGalleryAttachment = require("../middleware/galleryAttachmentSync");
const controller = require("../controllers/pettyCashController");

const view = pettyPermission("View");
const add = pettyPermission("Add");
const edit = pettyPermission("Edit");

// Settings and collection routes must be declared before /:id.
router.get("/email-settings", authMiddleware, view, controller.emailSettings);
router.put("/email-settings", authMiddleware, view, controller.updateEmailSettings);
router.post("/email-settings/test", authMiddleware, view, controller.sendTestEmail);
router.get("/options", authMiddleware, view, controller.options);
router.get("/next-number", authMiddleware, view, controller.nextNumber);
router.get("/list/expenses", authMiddleware, view, controller.listExpenses);
router.get("/list/deposits", authMiddleware, view, controller.listDeposits);
router.get("/list/audit", authMiddleware, view, controller.auditLog);
router.post("/email-report", authMiddleware, view, controller.emailReport);
router.get("/summary", authMiddleware, view, controller.summary);
router.get("/audit/:id", authMiddleware, view, controller.audit);
router.post("/bulk-delete", authMiddleware, edit, controller.bulkCancel);
router.get("/", authMiddleware, view, controller.getAll);
router.get("/:id", authMiddleware, view, controller.getById);
router.post("/", authMiddleware, add, upload.single("attachment"), syncGalleryAttachment("Petty Cash", "attachment"), controller.create);
router.put("/:id", authMiddleware, edit, upload.single("attachment"), syncGalleryAttachment("Petty Cash", "attachment"), controller.update);
router.post("/:id/expenses", authMiddleware, edit, upload.single("bill"), syncGalleryAttachment("Petty Cash", "bill"), controller.addExpense);
router.post("/:id/deposits", authMiddleware, edit, upload.single("receipt"), syncGalleryAttachment("Petty Cash", "receipt"), controller.addDeposit);
router.post("/:id/settle", authMiddleware, edit, controller.settle);
router.delete("/:id", authMiddleware, edit, controller.cancel);
router.patch("/:id/cancel", authMiddleware, edit, controller.cancel);

module.exports = router;

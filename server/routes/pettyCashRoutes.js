const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const pettyPermission = require("../middleware/pettyCashPermissionMiddleware");
const upload = require("../middleware/upload");
const syncGalleryAttachment = require("../middleware/galleryAttachmentSync");
const controller = require("../controllers/pettyCashController");

// Filter Access (per-user store scope), after the Petty Cash permission
// check so it only narrows access. /:id routes are advance IDs.
const {
    attachFilterScope,
    validateFilterValues,
    requireRecordStoreInScope
} = require("../middleware/filterAccessMiddleware");
const pcScope = attachFilterScope("Petty Cash");
const advanceInScope = requireRecordStoreInScope(
    "SELECT store_id FROM petty_cash_advances WHERE id = ? LIMIT 1",
    "id",
    "Petty cash advance"
);

const view = pettyPermission("View");
const add = pettyPermission("Add");
const edit = pettyPermission("Edit");

// Settings and collection routes must be declared before /:id.
router.get("/email-settings", authMiddleware, view, controller.emailSettings);
router.put("/email-settings", authMiddleware, view, controller.updateEmailSettings);
router.post("/email-settings/test", authMiddleware, view, controller.sendTestEmail);
router.get("/options", authMiddleware, view, pcScope, controller.options);
router.get("/next-number", authMiddleware, view, controller.nextNumber);
router.get("/list/expenses", authMiddleware, view, pcScope, validateFilterValues, controller.listExpenses);
router.get("/list/deposits", authMiddleware, view, pcScope, validateFilterValues, controller.listDeposits);
router.get("/list/audit", authMiddleware, view, pcScope, controller.auditLog);
router.post("/email-report", authMiddleware, view, pcScope, validateFilterValues, controller.emailReport);
router.get("/summary", authMiddleware, view, pcScope, validateFilterValues, controller.summary);
router.get("/audit/:id", authMiddleware, view, pcScope, advanceInScope, controller.audit);
router.post("/bulk-delete", authMiddleware, edit, pcScope, controller.bulkCancel);
router.get("/", authMiddleware, view, pcScope, validateFilterValues, controller.getAll);
router.get("/:id", authMiddleware, view, pcScope, advanceInScope, controller.getById);
router.post("/", authMiddleware, add, pcScope, upload.single("attachment"), syncGalleryAttachment("Petty Cash", "attachment"), validateFilterValues, controller.create);
router.put("/:id", authMiddleware, edit, pcScope, advanceInScope, upload.single("attachment"), syncGalleryAttachment("Petty Cash", "attachment"), validateFilterValues, controller.update);
router.post("/:id/expenses", authMiddleware, edit, pcScope, advanceInScope, upload.single("bill"), syncGalleryAttachment("Petty Cash", "bill"), controller.addExpense);
router.post("/:id/deposits", authMiddleware, edit, pcScope, advanceInScope, upload.single("receipt"), syncGalleryAttachment("Petty Cash", "receipt"), controller.addDeposit);
router.post("/:id/settle", authMiddleware, edit, pcScope, advanceInScope, controller.settle);
router.delete("/:id", authMiddleware, edit, pcScope, advanceInScope, controller.cancel);
router.patch("/:id/cancel", authMiddleware, edit, pcScope, advanceInScope, controller.cancel);

module.exports = router;

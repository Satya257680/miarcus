const express = require("express");

const router = express.Router();

// ======================================================
// CONTROLLER
// ======================================================

const expenseController = require(
    "../controllers/expenseController"
);

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const {
    scopeExpenseList,
    scopeExpenseRecord,
    requireExpensePermission,
} = require("../middleware/expenseAccessMiddleware");

// ======================================================
// MULTER / UPLOAD
// ======================================================

const upload = require(
    "../middleware/upload"
);

const syncGalleryAttachment = require(
    "../middleware/galleryAttachmentSync"
);

// ======================================================
// EXPENSE ROUTES
// ======================================================

// ------------------------------------------------------
// CREATE / SUBMIT EXPENSE
// POST /api/expenses
// ------------------------------------------------------

router.post(
    "/",
    authMiddleware,
    upload.single("bill"),
    syncGalleryAttachment("Expenses", "bill"),
    expenseController.submitExpense
);

// ------------------------------------------------------
// GET ALL EXPENSES
// GET /api/expenses
// ------------------------------------------------------

router.get(
    "/",
    authMiddleware,
    scopeExpenseList,
    expenseController.getExpenses
);

// ------------------------------------------------------
// GET EXPENSE TYPES
// GET /api/expenses/types
//
// IMPORTANT:
// This MUST come before /:id
// ------------------------------------------------------

router.get(
    "/types",
    authMiddleware,
    expenseController.getExpenseTypes
);

// ------------------------------------------------------
// DELETE ALL EXPENSES
// DELETE /api/expenses/delete-all
//
// IMPORTANT:
// This MUST come before /:id
// ------------------------------------------------------

router.delete(
    "/delete-all",
    authMiddleware,
    requireExpensePermission("Full"),
    expenseController.deleteAllExpenses
);

// ------------------------------------------------------
// GET SINGLE EXPENSE
// GET /api/expenses/:id
// ------------------------------------------------------

router.get(
    "/:id",
    authMiddleware,
    scopeExpenseRecord,
    expenseController.getExpenseById
);

// ------------------------------------------------------
// REVIEW EXPENSE
// PATCH /api/expenses/:id/review
//
// Frontend uses PATCH.
// ------------------------------------------------------

router.patch(
    "/:id/review",
    authMiddleware,
    requireExpensePermission("Edit"),
    expenseController.reviewExpense
);

// ------------------------------------------------------
// LEGACY REVIEW EXPENSE
// PUT /api/expenses/:id/review
//
// Keep PUT also supported so older clients/integrations
// continue working.
// ------------------------------------------------------

router.put(
    "/:id/review",
    authMiddleware,
    requireExpensePermission("Edit"),
    expenseController.reviewExpense
);

// ------------------------------------------------------
// DELETE SINGLE EXPENSE
// DELETE /api/expenses/:id
// ------------------------------------------------------

router.delete(
    "/:id",
    authMiddleware,
    requireExpensePermission("Full"),
    scopeExpenseRecord,
    expenseController.deleteExpense
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;
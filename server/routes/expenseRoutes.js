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
    expenseController.deleteAllExpenses
);

// ------------------------------------------------------
// GET SINGLE EXPENSE
// GET /api/expenses/:id
// ------------------------------------------------------

router.get(
    "/:id",
    authMiddleware,
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
    expenseController.reviewExpense
);

// ------------------------------------------------------
// DELETE SINGLE EXPENSE
// DELETE /api/expenses/:id
// ------------------------------------------------------

router.delete(
    "/:id",
    authMiddleware,
    expenseController.deleteExpense
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const {
    scopeExpenseList,
    scopeExpenseRecord
} = require("../middleware/expenseAccessMiddleware");

const {
    submitExpense,
    getExpenses,
    getExpenseById,
    reviewExpense,
    getExpenseTypes,
    deleteExpense,
    deleteAllExpenses
} = require("../controllers/expenseController");

const router = express.Router();
const uploadFolder = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadFolder),
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeBase = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9-_]/g, "-")
            .slice(0, 80);
        cb(null, `expense-${Date.now()}-${safeBase}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error("Only JPG, PNG, WEBP and PDF bills are supported."));
    }
});

router.get(
    "/types",
    authMiddleware,
    permissionMiddleware("Expenses", "View"),
    getExpenseTypes
);

// Normal users see only their own expenses.
// Administrators and Expenses Edit/Full users see all expenses.
router.get(
    "/",
    authMiddleware,
    permissionMiddleware("Expenses", "View"),
    scopeExpenseList,
    getExpenses
);

// Finance / Manager review queue is deliberately separate from Track Expenses.
// Only Administrator, Expenses Edit or Expenses Full users can access it.
// Keep this before /:id.
router.get(
    "/review-queue",
    authMiddleware,
    permissionMiddleware("Expenses", "Edit"),
    getExpenses
);

// Delete All is administrator / Full only.
// Keep this before /:id.
router.delete(
    "/delete-all",
    authMiddleware,
    permissionMiddleware("Expenses", "Full"),
    deleteAllExpenses
);

// A normal user can open only their own expense.
router.get(
    "/:id",
    authMiddleware,
    permissionMiddleware("Expenses", "View"),
    scopeExpenseRecord,
    getExpenseById
);

// Individual delete is Full only.
router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware("Expenses", "Full"),
    deleteExpense
);

router.post(
    "/",
    authMiddleware,
    permissionMiddleware("Expenses", "Add"),
    upload.single("bill"),
    submitExpense
);

router.patch(
    "/:id/review",
    authMiddleware,
    permissionMiddleware("Expenses", "Edit"),
    reviewExpense
);

module.exports = router;

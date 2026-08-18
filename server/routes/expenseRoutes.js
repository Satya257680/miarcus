const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const {
    submitExpense,
    getExpenses,
    getExpenseById,
    reviewExpense,
    getExpenseTypes
} = require("../controllers/expenseController");

const router = express.Router();

const uploadFolder = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadFolder),

    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const safeBase = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9-_]/g, "-")
            .slice(0, 80);

        cb(
            null,
            `expense-${Date.now()}-${safeBase}${extension}`
        );
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 1
    },

    fileFilter: (_req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ];

        if (allowed.includes(file.mimetype)) {
            return cb(null, true);
        }

        cb(
            new Error(
                "Only JPG, PNG, WEBP and PDF bills are supported."
            )
        );
    }
});

// IMPORTANT: /types must stay before /:id.
router.get(
    "/types",
    authMiddleware,
    permissionMiddleware("Expenses", "View"),
    getExpenseTypes
);

router.get(
    "/",
    authMiddleware,
    permissionMiddleware("Expenses", "View"),
    getExpenses
);

router.get(
    "/:id",
    authMiddleware,
    permissionMiddleware("Expenses", "View"),
    getExpenseById
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

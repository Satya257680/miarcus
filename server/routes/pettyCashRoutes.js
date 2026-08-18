const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");
const controller = require("../controllers/pettyCashController");

const view = permissionMiddleware("Expenses", "View");
const add = permissionMiddleware("Expenses", "Add");
const edit = permissionMiddleware("Expenses", "Edit");

router.get("/options", authMiddleware, view, controller.options);
router.get("/summary", authMiddleware, view, controller.summary);
router.get("/audit/:id", authMiddleware, view, controller.audit);
router.get("/", authMiddleware, view, controller.getAll);
router.get("/:id", authMiddleware, view, controller.getById);

router.post("/", authMiddleware, add, controller.create);

router.post(
    "/:id/expenses",
    authMiddleware,
    edit,
    upload.single("bill"),
    controller.addExpense
);

router.post(
    "/:id/deposits",
    authMiddleware,
    edit,
    upload.single("receipt"),
    controller.addDeposit
);

router.post("/:id/settle", authMiddleware, edit, controller.settle);
router.patch("/:id/cancel", authMiddleware, edit, controller.cancel);

module.exports = router;

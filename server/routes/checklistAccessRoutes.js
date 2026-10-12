const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const controller = require("../controllers/checklistAccessController");

// /api/checklist-access
// Management endpoints are Administrator-only and enforced here on the
// server (hiding the sidebar link is NOT the security control).
router.get("/me", authMiddleware, controller.getMine);
router.get("/meta", authMiddleware, adminOnly, controller.getMeta);
router.get("/users", authMiddleware, adminOnly, controller.listUsers);
router.put("/users/:id", authMiddleware, adminOnly, controller.saveUser);
router.post("/bulk", authMiddleware, adminOnly, controller.bulkSave);
router.post("/reset", authMiddleware, adminOnly, controller.reset);

module.exports = router;

const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const {
    getRules,
    createRule,
    updateRule,
    deleteRule,
} = require("../controllers/nsoRuleController");

// ==========================================
// Get All Rules
// Permission: View
// ==========================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware("NSO Rules", "View"),
    getRules
);

// ==========================================
// Create Rule
// Permission: Add
// ==========================================

router.post(
    "/",
    authMiddleware,
    permissionMiddleware("NSO Rules", "Add"),
    createRule
);

// ==========================================
// Update Rule
// Permission: Edit
// ==========================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware("NSO Rules", "Edit"),
    updateRule
);

// ==========================================
// Delete Rule
// Permission: Full
// ==========================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware("NSO Rules", "Full"),
    deleteRule
);

module.exports = router;
const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const upload = require("../middleware/upload");

const {
    getRules,
    createRule,
    bulkUploadRules,
    updateRule,
    deleteRule,
    deleteAllRules,
    exportRules
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
// Export Rules
// Permission: View
// ==========================================

router.get(
    "/export",
    authMiddleware,
    permissionMiddleware("NSO Rules", "View"),
    exportRules
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
// Bulk Upload Rules
// Permission: Add
// ==========================================

router.post(
    "/bulk-upload",
    authMiddleware,
    permissionMiddleware("NSO Rules", "Add"),
    upload.single("file"),
    bulkUploadRules
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
// Delete All Rules
// Permission: Full
// ==========================================

router.delete(
    "/delete-all",
    authMiddleware,
    permissionMiddleware("NSO Rules", "Full"),
    deleteAllRules
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
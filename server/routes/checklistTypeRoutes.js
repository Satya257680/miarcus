const express = require("express");
const multer = require("multer");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
});

const {
  getChecklistTypes,
  getChecklistTypeById,
  createChecklistType,
  updateChecklistType,
  deleteChecklistType,
  deleteAllChecklistTypes,
  exportChecklistTypes,
  importChecklistTypes,
} = require("../controllers/checklistTypeController");

// ======================================
// Get All Checklist Types
// ======================================

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("Checklist Types", "View"),
  getChecklistTypes
);

// ======================================
// Export Checklist Types
// ======================================

router.get(
  "/export",
  authMiddleware,
  permissionMiddleware("Checklist Types", "View"),
  exportChecklistTypes
);

// ======================================
// Create Checklist Type
// ======================================

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("Checklist Types", "Add"),
  createChecklistType
);

// ======================================
// Import Checklist Types
// ======================================

router.post(
  "/import",
  authMiddleware,
  permissionMiddleware("Checklist Types", "Add"),
  upload.single("file"),
  importChecklistTypes
);

// ======================================
// Delete All Checklist Types
// ======================================

router.delete(
  "/delete-all",
  authMiddleware,
  permissionMiddleware("Checklist Types", "Full"),
  deleteAllChecklistTypes
);

// ======================================
// Get Single Checklist Type
// ======================================

router.get(
  "/:id",
  authMiddleware,
  permissionMiddleware("Checklist Types", "View"),
  getChecklistTypeById
);

// ======================================
// Update Checklist Type
// ======================================

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("Checklist Types", "Edit"),
  updateChecklistType
);

// ======================================
// Delete Checklist Type
// ======================================

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("Checklist Types", "Full"),
  deleteChecklistType
);

module.exports = router;
const express = require("express");
const multer = require("multer");

const router = express.Router();

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
router.get("/", getChecklistTypes);

// ======================================
// Export Checklist Types
// ======================================
router.get("/export", exportChecklistTypes);

// ======================================
// Create Checklist Type
// ======================================
router.post("/", createChecklistType);

// ======================================
// Import Checklist Types
// ======================================
router.post(
  "/import",
  upload.single("file"),
  importChecklistTypes
);

// ======================================
// Delete All Checklist Types
// ======================================
router.delete("/delete-all", deleteAllChecklistTypes);

// ======================================
// Get Single Checklist Type
// ======================================
router.get("/:id", getChecklistTypeById);

// ======================================
// Update Checklist Type
// ======================================
router.put("/:id", updateChecklistType);

// ======================================
// Delete Checklist Type
// ======================================
router.delete("/:id", deleteChecklistType);

module.exports = router;
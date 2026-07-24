const express = require("express");
const router = express.Router();
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const upload = multer({
  dest: "uploads/",
});

const {
  getReports,
  createReport,
  bulkUploadReports,
  editReport,
  removeReport,
} = require("../controllers/reportsToController");

// ===============================
// Get All Managers
// ===============================

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("Reports To", "View"),
  getReports
);

// ===============================
// Add Manager
// ===============================

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("Reports To", "Add"),
  createReport
);

// ===============================
// Bulk Upload Managers
// ===============================

router.post(
  "/bulk-upload",
  authMiddleware,
  permissionMiddleware("Reports To", "Add"),
  upload.single("file"),
  bulkUploadReports
);

// ===============================
// Update Manager
// ===============================

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("Reports To", "Edit"),
  editReport
);

// ===============================
// Delete Manager
// ===============================

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("Reports To", "Full"),
  removeReport
);

module.exports = router;
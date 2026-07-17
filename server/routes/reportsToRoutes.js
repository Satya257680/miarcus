const express = require("express");
const router = express.Router();
const multer = require("multer");

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
router.get("/", getReports);

// ===============================
// Add Manager
// ===============================
router.post("/", createReport);

// ===============================
// Bulk Upload Managers
// ===============================
router.post(
  "/bulk-upload",
  upload.single("file"),
  bulkUploadReports
);

// ===============================
// Update Manager
// ===============================
router.put("/:id", editReport);

// ===============================
// Delete Manager
// ===============================
router.delete("/:id", removeReport);

module.exports = router;
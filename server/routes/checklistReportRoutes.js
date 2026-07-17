const express = require("express");
const multer = require("multer");

const router = express.Router();

// Upload configuration
const upload = multer({
  dest: "uploads/",
});

const {
  getReports,
  addReport,
  deleteReport,
  exportCSV,
  importCSV,
} = require("../controllers/checklistReportController");

// Get Reports
router.get("/", getReports);

// Add Report
router.post("/", addReport);

// Delete Report
router.delete("/:id", deleteReport);

// Export CSV
router.get("/export", exportCSV);

// Import CSV
router.post(
  "/import",
  upload.single("file"),
  importCSV
);

module.exports = router;
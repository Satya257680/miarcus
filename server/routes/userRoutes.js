const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getUsers,
  createUser,
  bulkUploadUsers,
  deleteAllUsers,
} = require("../controllers/userController");

// ===========================
// Multer Configuration
// ===========================

const upload = multer({
  dest: "uploads/",
});

// ===========================
// Get All Users
// ===========================

router.get("/", getUsers);

// ===========================
// Add User
// ===========================

router.post("/", createUser);

// ===========================
// Bulk Upload Users
// ===========================

router.post(
  "/bulk-upload",
  upload.single("file"),
  bulkUploadUsers
);

// ===========================
// Delete All Users
// ===========================

router.delete(
  "/delete-all",
  deleteAllUsers
);

module.exports = router;
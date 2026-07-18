const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
    getUsers,
    createUser,
    bulkUploadUsers,
    updateUser,
    disableUser,
    deleteUser,
    deleteAllUsers,
    getUserNames,
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
// Get User Names (Reports To)
// ===========================

router.get("/names", getUserNames);

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
// Update User
// ===========================

router.put("/:id", updateUser);

// ===========================
// Disable User
// ===========================

router.put("/disable/:id", disableUser);

// ===========================
// Delete User
// ===========================

router.delete("/:id", deleteUser);

// ===========================
// Delete All Users
// ===========================

router.delete("/delete-all", deleteAllUsers);

module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
    getUsers,
    createUser,
    bulkUploadUsers,
    deleteAllUsers,
    updateUser,
    getUserNames,
} = require("../controllers/userController");

const User = require("../models/userModel");

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

router.put("/disable/:id", (req, res) => {

    User.disableUser(req.params.id, (err) => {

        if (err) {

            return res.status(500).json({
                success: false,
                message: "Unable to disable user",
            });

        }

        res.json({
            success: true,
            message: "User Disabled Successfully",
        });

    });

});

// ===========================
// Delete User
// ===========================

router.delete("/:id", (req, res) => {

    User.deleteUser(req.params.id, (err) => {

        if (err) {

            return res.status(500).json({
                success: false,
                message: "Unable to delete user",
            });

        }

        res.json({
            success: true,
            message: "User Deleted Successfully",
        });

    });

});

// ===========================
// Delete All Users
// ===========================

router.delete("/delete-all", deleteAllUsers);

module.exports = router;
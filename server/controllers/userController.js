const fs = require("fs");
const XLSX = require("xlsx");

const User = require("../models/userModel");

// ==========================
// Get All Users
// ==========================

const getUsers = (req, res) => {

    User.getAllUsers((err, result) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: "Database Error",
            });
        }

        res.json({
            success: true,
            users: result,
        });

    });

};

// ==========================
// Add User
// ==========================

const createUser = (req, res) => {

    console.log("========== CREATE USER ==========");
    console.log(req.body);

    User.addUser(req.body, (err, result) => {

        if (err) {

            console.log("DATABASE ERROR:");
            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Unable to add user",
                error: err,
            });

        }

        console.log("USER INSERTED SUCCESSFULLY");

        res.status(201).json({
            success: true,
            message: "User added successfully",
        });

    });

};

// ==========================
// Bulk Upload Users
// ==========================

const bulkUploadUsers = (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });

        }

        const workbook = XLSX.readFile(req.file.path);

        const sheetName = workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];

        const users = XLSX.utils.sheet_to_json(sheet);

        User.bulkInsertUsers(users, (err) => {

            fs.unlinkSync(req.file.path);

            if (err) {

                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Bulk upload failed",
                });

            }

            res.json({
                success: true,
                message: "Users uploaded successfully",
            });

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Upload Error",
        });

    }

};

// ==========================
// Delete All Users
// ==========================

const deleteAllUsers = (req, res) => {

    User.deleteAllUsers((err) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Unable to delete users",
            });

        }

        res.json({
            success: true,
            message: "All users deleted successfully",
        });

    });

};

// ==========================
// Export
// ==========================

module.exports = {
    getUsers,
    createUser,
    bulkUploadUsers,
    deleteAllUsers,
};
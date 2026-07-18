const fs = require("fs");
const XLSX = require("xlsx");

const User = require("../models/userModel");

// ==========================
// Get All Users
// ==========================

const getUsers = (req, res) => {

    User.getAllUsers((err, result) => {

        if (err) {
            console.log(err);

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

    User.addUser(req.body, (err) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Unable to add user",
                error: err,
            });

        }

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

        const users = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            blankrows: false,
        });

        const filteredUsers = users.filter((user) => {

            return (
                String(user["Employee ID"] || "").trim() !== "" ||
                String(user["Name"] || "").trim() !== "" ||
                String(user["Email"] || "").trim() !== ""
            );

        });

        if (filteredUsers.length === 0) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                success: false,
                message: "No valid users found in file.",
            });

        }

        User.bulkInsertUsers(filteredUsers, (err, result) => {

            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            if (err) {

                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Bulk upload failed",
                    error: err.sqlMessage,
                });

            }

            res.json({
                success: true,
                message: `${result.affectedRows} users uploaded successfully`,
            });

        });

    } catch (err) {

        console.log(err);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: "Upload Error",
        });

    }

};

// ==========================
// Update User
// ==========================

const updateUser = (req, res) => {

    User.updateUser(req.params.id, req.body, (err) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Update Failed",
            });

        }

        res.json({
            success: true,
            message: "User Updated Successfully",
        });

    });

};

// ==========================
// Disable User
// ==========================

const disableUser = (req, res) => {

    User.disableUser(req.params.id, (err) => {

        if (err) {

            console.log(err);

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

};

// ==========================
// Delete User
// ==========================

const deleteUser = (req, res) => {

    User.deleteUser(req.params.id, (err) => {

        if (err) {

            console.log(err);

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
// Get User Names
// ==========================

const getUserNames = (req, res) => {

    User.getUserNames((err, result) => {

        if (err) {

            console.log(err);

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
// Export
// ==========================

module.exports = {
    getUsers,
    createUser,
    bulkUploadUsers,
    updateUser,
    disableUser,
    deleteUser,
    deleteAllUsers,
    getUserNames,
};
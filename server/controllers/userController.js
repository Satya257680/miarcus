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

// ==========================
// Add User
// ==========================

const createUser = (req, res) => {

    User.addUser(req.body, (err, result) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Unable to add user",
            });
        }

        res.json({
            success: true,
            message: "User added successfully",
        });

    });

};

// ==========================
// Export
// ==========================

module.exports = {
    getUsers,
    createUser,
};
const express = require("express");
const router = express.Router();

const {
  getUsers,
  createUser,
} = require("../controllers/userController");

// ===========================
// Get All Users
// ===========================
router.get("/", getUsers);

// ===========================
// Add User
// ===========================
router.post("/", createUser);

module.exports = router;
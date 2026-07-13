const express = require("express");
const router = express.Router();

const {
    loginUser,
    forgotPassword,
    resetPassword,
} = require("../controllers/authController");

// ================= Login =================
router.post("/login", loginUser);

// ================= Forgot Password =================
router.post("/forgot-password", forgotPassword);

// ================= Reset Password =================
router.post("/reset-password", resetPassword);

module.exports = router;
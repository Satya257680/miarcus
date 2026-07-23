const express = require("express");
const router = express.Router();

// ======================================================
// CONTROLLERS
// ======================================================

const {
    loginUser,
    forgotPassword,
    verifyOTP,
    resetPassword,
} = require("../controllers/authController");


// ======================================================
// LOGIN
// POST : /api/auth/login
// ======================================================

router.post("/login", loginUser);


// ======================================================
// FORGOT PASSWORD (SEND OTP)
// POST : /api/auth/forgot-password
// ======================================================

router.post("/forgot-password", forgotPassword);


// ======================================================
// VERIFY OTP
// POST : /api/auth/verify-otp
// ======================================================

router.post("/verify-otp", verifyOTP);


// ======================================================
// RESET PASSWORD
// POST : /api/auth/reset-password
// ======================================================

router.post("/reset-password", resetPassword);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
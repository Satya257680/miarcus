const express = require("express");

const router = express.Router();

// ======================================================
// CONTROLLERS
// ======================================================

const {
    loginUser,
    signupUser,
    forgotPassword,
    verifyOTP,
    resetPassword,
    getSignupData,
} = require("../controllers/authController");

// ======================================================
// LOGIN
// POST : /api/auth/login
// ======================================================

router.post(
    "/login",
    loginUser
);

// ======================================================
// SIGN UP
// POST : /api/auth/signup
// ======================================================

router.post(
    "/signup",
    signupUser
);

// ======================================================
// SIGNUP PAGE DATA
// GET : /api/auth/signup-data
//
// PUBLIC ROUTE
// No login token required.
//
// Used by Signup page to load:
// - Reports To
// - Departments
// - Designations
// - Stores
// ======================================================

router.get(
    "/signup-data",
    getSignupData
);

// ======================================================
// FORGOT PASSWORD
// POST : /api/auth/forgot-password
// ======================================================

router.post(
    "/forgot-password",
    forgotPassword
);

// ======================================================
// VERIFY OTP
// POST : /api/auth/verify-otp
// ======================================================

router.post(
    "/verify-otp",
    verifyOTP
);

// ======================================================
// RESET PASSWORD
// POST : /api/auth/reset-password
// ======================================================

router.post(
    "/reset-password",
    resetPassword
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
const express = require("express");
const {
    loginLimiter,
    loginIpLimiter,
    passwordResetLimiter,
    otpVerifyLimiter,
    signupLimiter,
    publicSignupGate,
} = require("../middleware/authRateLimit");

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
    loginIpLimiter,
    loginLimiter,
    loginUser
);

// ======================================================
// SIGN UP
// POST : /api/auth/signup
// ======================================================

router.post(
    "/signup",
    signupLimiter,
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
    publicSignupGate,
    getSignupData
);

// ======================================================
// FORGOT PASSWORD
// POST : /api/auth/forgot-password
// ======================================================

router.post(
    "/forgot-password",
    passwordResetLimiter,
    forgotPassword
);

// ======================================================
// VERIFY OTP
// POST : /api/auth/verify-otp
// ======================================================

router.post(
    "/verify-otp",
    otpVerifyLimiter,
    verifyOTP
);

// ======================================================
// RESET PASSWORD
// POST : /api/auth/reset-password
// ======================================================

router.post(
    "/reset-password",
    passwordResetLimiter,
    resetPassword
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
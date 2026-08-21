const express = require("express");

const router = express.Router();



// ======================================================
// AUTH MIDDLEWARE
// ======================================================

const authMiddleware = require(
    "../middleware/authMiddleware"
);



// ======================================================
// CONTROLLER
// ======================================================

const {

    getDashboardStats,

    getRecentActivities,

    getChecklistSummary,

    getActionPointSummary,
    getNSOSummary,
    getAnalytics

} = require(
    "../controllers/dashboardController"
);







// ======================================================
// BASE URL
// /api/dashboard
// ======================================================







// ======================================================
// DASHBOARD STATS
// GET /api/dashboard/stats
// ======================================================


router.get(
    "/nso-summary",
    authMiddleware,
    getNSOSummary
);

router.get(
    "/analytics",
    authMiddleware,
    getAnalytics
);

router.get(

    "/stats",

    authMiddleware,

    getDashboardStats

);









// ======================================================
// RECENT ACTIVITIES
// GET /api/dashboard/recent-activities
// ======================================================


router.get(

    "/recent-activities",

    authMiddleware,

    getRecentActivities

);









// ======================================================
// CHECKLIST SUMMARY
// GET /api/dashboard/checklist-summary
// ======================================================


router.get(

    "/checklist-summary",

    authMiddleware,

    getChecklistSummary

);









// ======================================================
// ACTION POINT SUMMARY
// GET /api/dashboard/action-summary
// ======================================================


router.get(

    "/action-summary",

    authMiddleware,

    getActionPointSummary

);









// ======================================================
// EXPORT ROUTER
// ======================================================


module.exports = router;
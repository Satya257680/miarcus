const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {

    getDashboardStats,

    getRecentActivities

} = require("../controllers/dashboardController");

// ==========================================
// DASHBOARD STATS
// ==========================================

router.get(

    "/stats",

    authMiddleware,

    getDashboardStats

);

// ==========================================
// RECENT ACTIVITIES
// ==========================================

router.get(

    "/recent-activities",

    authMiddleware,

    getRecentActivities

);

module.exports = router;
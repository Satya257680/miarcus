const Dashboard = require("../models/dashboardModel");

// ======================================================
// GET DASHBOARD STATS
// ======================================================

const getDashboardStats = (req, res) => {

    Dashboard.getStats((err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Failed to fetch dashboard statistics."

            });

        }

        res.status(200).json({

            success: true,

            data: results[0]

        });

    });

};

// ======================================================
// GET RECENT ACTIVITIES
// ======================================================

const getRecentActivities = (req, res) => {

    Dashboard.getRecentActivities((err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Failed to fetch recent activities."

            });

        }

        res.status(200).json({

            success: true,

            data: results

        });

    });

};

module.exports = {

    getDashboardStats,

    getRecentActivities

};
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

module.exports = {

    getDashboardStats

};
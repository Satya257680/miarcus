const Dashboard = require(
    "../models/dashboardModel"
);
const db = require("../config/db");




// ======================================================
// GET DASHBOARD STATS
// GET /api/dashboard/stats
// ======================================================


const getDashboardStats = (req,res)=>{


    Dashboard.getStats(


        (err,results)=>{


            if(err){


                console.error(

                    "DASHBOARD STATS ERROR:",

                    err

                );



                return res.status(500).json({


                    success:false,


                    message:

                    "Failed to fetch dashboard statistics.",


                    error:

                    err.message



                });


            }







            return res.status(200).json({



                success:true,



                data:

                results[0] || {}



            });



        }


    );


};









// ======================================================
// GET ALL-MODULE BUSINESS ANALYTICS
// GET /api/dashboard/analytics
// ======================================================

// Short-lived cache: the analytics page polls in real time, so many
// open dashboards must not each re-run every module query.
let analyticsCache = { at: 0, data: null, pending: null };
const ANALYTICS_CACHE_MS = 8000;

const getAnalytics = (req, res) => {
    const fresh = String(req.query.fresh || "") === "1";
    if (!fresh && analyticsCache.data && Date.now() - analyticsCache.at < ANALYTICS_CACHE_MS) {
        return res.status(200).json({ success: true, data: analyticsCache.data, cached: true, generated_at: new Date(analyticsCache.at).toISOString() });
    }

    Dashboard.getAnalytics((err, results) => {
        if (!err) analyticsCache = { at: Date.now(), data: results || [], pending: null };
        if (err) {
            console.error("DASHBOARD ANALYTICS ERROR:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch dashboard analytics.",
                error: err.message
            });
        }

        return res.status(200).json({
            success: true,
            data: results || [],
            generated_at: new Date().toISOString()
        });
    });
};

// ======================================================
// LIVE PULSE
// GET /api/dashboard/pulse
// Very cheap "has anything changed?" signal for the real-time
// analytics page. Every create / update / delete in MIARCUS is
// written to the activities table (see activityAuditMiddleware),
// so the latest activity id + count changes whenever data changes.
// ======================================================

const getPulse = async (req, res) => {
    try {
        const rows = await db.query(`
            SELECT
                COALESCE(MAX(id), 0) AS last_id,
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN created_at >= CURDATE() THEN 1 ELSE 0 END), 0) AS today,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL 1 HOUR THEN 1 ELSE 0 END), 0) AS last_hour
            FROM activities
        `);
        const row = rows?.[0] || {};
        const lastId = Number(row.last_id || 0);
        const total = Number(row.total || 0);

        let latest = null;
        // Only administrators get the live feed titles (Activity Center
        // is RBAC filtered for everyone else).
        if (lastId && req.user?.is_admin) {
            const latestRows = await db.query(
                `SELECT a.id, a.title, a.module_name, a.created_at, u.name AS created_by_name
                 FROM activities a
                 LEFT JOIN users u ON u.id = a.created_by
                 WHERE a.module_name <> 'Employee Location'
                 ORDER BY a.id DESC
                 LIMIT 5`
            );
            latest = latestRows || [];
        }

        return res.status(200).json({
            success: true,
            data: {
                signature: `${lastId}:${total}`,
                last_id: lastId,
                total,
                today: Number(row.today || 0),
                last_hour: Number(row.last_hour || 0),
                latest: latest || [],
                server_time: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("DASHBOARD PULSE ERROR:", error.message);
        return res.status(500).json({ success: false, message: "Failed to read live pulse." });
    }
};



// ======================================================
// GET RECENT ACTIVITIES
// GET /api/dashboard/activities
// ======================================================


const getRecentActivities = (req,res)=>{



    Dashboard.getRecentActivities(



        (err,results)=>{



            if(err){



                console.error(

                    "RECENT ACTIVITY ERROR:",

                    err

                );



                return res.status(500).json({


                    success:false,


                    message:

                    "Failed to fetch recent activities.",


                    error:

                    err.message



                });



            }






            return res.status(200).json({



                success:true,



                data:

                results || []



            });



        }


    );



};










// ======================================================
// GET NSO BUSINESS SUMMARY
// GET /api/dashboard/nso-summary
// ======================================================

const getNSOSummary = (req, res) => {

    Dashboard.getNSOSummary((err, results) => {

        if (err) {
            console.error("NSO SUMMARY ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch NSO summary.",
                error: err.message
            });
        }

        return res.status(200).json({
            success: true,
            data: results[0] || {}
        });
    });
};

// ======================================================
// GET CHECKLIST SUMMARY
// GET /api/dashboard/checklist-summary
// ======================================================


const getChecklistSummary = (req,res)=>{



    Dashboard.getChecklistSummary(



        (err,results)=>{



            if(err){



                console.error(

                    "CHECKLIST SUMMARY ERROR:",

                    err

                );



                return res.status(500).json({



                    success:false,


                    message:

                    "Failed to fetch checklist summary.",


                    error:

                    err.message



                });



            }








            return res.status(200).json({



                success:true,



                data:

                results || []



            });



        }


    );



};









// ======================================================
// GET ACTION POINT SUMMARY
// GET /api/dashboard/action-summary
// ======================================================


const getActionPointSummary = (req,res)=>{



    Dashboard.getActionPointSummary(



        (err,results)=>{



            if(err){



                console.error(

                    "ACTION POINT SUMMARY ERROR:",

                    err

                );



                return res.status(500).json({



                    success:false,


                    message:

                    "Failed to fetch action point summary.",


                    error:

                    err.message



                });



            }








            return res.status(200).json({



                success:true,



                data:

                results || []



            });



        }


    );



};









// ======================================================
// EXPORT CONTROLLER
// ======================================================


module.exports = {


    getDashboardStats,


    getRecentActivities,


    getChecklistSummary,
    getNSOSummary,
    getAnalytics,
    getPulse,

    getActionPointSummary


};
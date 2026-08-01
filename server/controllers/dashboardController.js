const Dashboard = require(
    "../models/dashboardModel"
);




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


    getActionPointSummary


};
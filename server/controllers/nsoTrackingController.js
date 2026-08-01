const NSOTracking = require("../models/nsoTrackingModel");

const Audit = require("../models/auditModel");

const { Parser } = require("json2csv");

const { logActivity } = require("../utils/activityLogger");


// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

exports.getAllNSOTracking = (req, res) => {


    try {


        const page = parseInt(req.query.page) || 1;

        const limit = parseInt(req.query.limit) || 10;

        const offset = (page - 1) * limit;



        const filters = {


            search: req.query.search || "",

            offset,

            limit


        };



        NSOTracking.getAll(

            filters,

            (err, data) => {


                if(err){

                    return res.status(500).json({

                        success:false,

                        message:err.message

                    });

                }




                NSOTracking.count(

                    filters,

                    (err,count)=>{


                        if(err){

                            return res.status(500).json({

                                success:false,

                                message:err.message

                            });

                        }




                        const total = count[0]?.total || 0;



                        res.json({

                            success:true,

                            page,

                            limit,

                            total,

                            totalPages:Math.ceil(total / limit),

                            data

                        });



                    }

                );


            }

        );



    }

    catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};







// ======================================================
// GET BY ID
// ======================================================

exports.getNSOTrackingById = (req,res)=>{


    NSOTracking.getById(

        req.params.id,

        (err,result)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }



            if(result.length===0){

                return res.status(404).json({

                    success:false,

                    message:"Tracking not found"

                });

            }



            res.json({

                success:true,

                data:result[0]

            });


        }

    );


};








// ======================================================
// GET BY STORE OPENING
// ======================================================

exports.getByStoreOpening = (req,res)=>{


    NSOTracking.getByStoreOpening(

        req.params.id,

        (err,result)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }



            res.json({

                success:true,

                data:result

            });


        }

    );


};








// ======================================================
// CREATE NSO TRACKING
// ======================================================

exports.createNSOTracking = (req,res)=>{


    try{


        const data={


            ...req.body,


            created_by:req.user.id,

            updated_by:req.user.id


        };




        NSOTracking.create(

            data,

            async(err,result)=>{


                if(err){

                    return res.status(500).json({

                        success:false,

                        message:err.message

                    });

                }




                // Activity Center
await logActivity({

    activity_type:"CREATE",

    reference_id:result.insertId,

    title:"NSO Tracking Created",

    description:
    "Created NSO Tracking",

    module_name:"NSO Tracking",

    created_by:req.user.id

});


await Audit.create({

    module_name:"NSO Tracking",

    reference_id:result.insertId,

    action:"CREATE",

    old_data:null,

    new_data:data,

    changed_by:req.user.id

});




                res.status(201).json({

                    success:true,

                    message:"NSO Tracking Created Successfully",

                    id:result.insertId

                });


            }

        );



    }

    catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};









// ======================================================
// UPDATE NSO TRACKING
// ======================================================

exports.updateNSOTracking=(req,res)=>{


    const data={


        ...req.body,


        updated_by:req.user.id


    };



    NSOTracking.update(

        req.params.id,

        data,

        async(err,result)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }




            if(result.affectedRows===0){

                return res.status(404).json({

                    success:false,

                    message:"Tracking not found"

                });

            }





           await logActivity({

    activity_type:"UPDATE",

    reference_id:req.params.id,

    title:"NSO Tracking Updated",

    description:
    "Updated NSO Tracking",

    module_name:"NSO Tracking",

    created_by:req.user.id

});


await Audit.create({

    module_name:"NSO Tracking",

    reference_id:req.params.id,

    action:"UPDATE",

    old_data:null,

    new_data:data,

    changed_by:req.user.id

});




            res.json({

                success:true,

                message:"NSO Tracking Updated Successfully"

            });



        }

    );


};









// ======================================================
// UPDATE STATUS
// ======================================================

exports.updateStatus=(req,res)=>{


    NSOTracking.updateStatus(

        req.params.id,

        req.body.status,

        async(err)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }




await logActivity({

    activity_type:"STATUS UPDATE",

    reference_id:req.params.id,

    title:"NSO Tracking Status Changed",

    description:
    `Status changed to ${req.body.status}`,

    module_name:"NSO Tracking",

    created_by:req.user.id

});


await Audit.create({

    module_name:"NSO Tracking",

    reference_id:req.params.id,

    action:"STATUS UPDATE",

    new_data:{
        status:req.body.status
    },

    changed_by:req.user.id

});





            res.json({

                success:true,

                message:"Status Updated Successfully"

            });



        }

    );


};









// ======================================================
// DELETE
// ======================================================

exports.deleteNSOTracking=(req,res)=>{


    NSOTracking.delete(

        req.params.id,

        async(err)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }




           await logActivity({

    activity_type:"DELETE",

    reference_id:req.params.id,

    title:"NSO Tracking Deleted",

    description:
    "Deleted NSO Tracking",

    module_name:"NSO Tracking",

    created_by:req.user.id

});


await Audit.create({

    module_name:"NSO Tracking",

    reference_id:req.params.id,

    action:"DELETE",

    changed_by:req.user.id

});




            res.json({

                success:true,

                message:"Deleted Successfully"

            });



        }

    );


};









// ======================================================
// DELETE ALL
// ======================================================

exports.deleteAllNSOTracking=(req,res)=>{


    NSOTracking.deleteAll(

        async(err)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }




           await logActivity({

    activity_type:"DELETE ALL",

    title:"All NSO Tracking Deleted",

    description:
    "Deleted all NSO Tracking records",

    module_name:"NSO Tracking",

    created_by:req.user.id

});


await Audit.create({

    module_name:"NSO Tracking",

    action:"DELETE ALL",

    changed_by:req.user.id

});




            res.json({

                success:true,

                message:"All Tracking Deleted"

            });


        }

    );


};









// ======================================================
// EXPORT CSV
// ======================================================

exports.exportNSOTracking=(req,res)=>{


    NSOTracking.export(

        (err,data)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }




            const parser=new Parser();


            const csv=parser.parse(data);



            res.header(

                "Content-Type",

                "text/csv"

            );


            res.attachment(

                "nso_tracking.csv"

            );


            res.send(csv);



        }

    );


};
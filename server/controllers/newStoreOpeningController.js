const NewStoreOpening = require("../models/newStoreOpeningModel");

const NSOTracking = require("../models/nsoTrackingModel");

const { Parser } = require("json2csv");

const XLSX = require("xlsx");

const logActivity = require("../utils/activityLogger");




// ======================================================
// GET ALL NEW STORE OPENINGS
// SEARCH + PAGINATION
// ======================================================

exports.getAllNewStoreOpenings = (req,res)=>{


    try{


        const page =
        parseInt(req.query.page) || 1;


        const limit =
        parseInt(req.query.limit) || 10;


        const offset =
        (page - 1) * limit;




        const filters = {


            search:
            req.query.search || "",


            offset,


            limit


        };





        NewStoreOpening.getAll(

            filters,


            (err,data)=>{


                if(err){


                    return res.status(500).json({

                        success:false,

                        message:
                        "Unable to fetch records",

                        error:
                        err.message

                    });


                }





                NewStoreOpening.count(

                    filters,


                    (err,count)=>{


                        if(err){


                            return res.status(500).json({

                                success:false,

                                error:
                                err.message

                            });


                        }





                        const total =
                        count[0]?.total || 0;





                        return res.json({


                            success:true,


                            page,


                            limit,


                            total,


                            totalPages:
                            Math.ceil(total / limit),



                            data



                        });



                    }



                );



            }


        );



    }


    catch(error){


        return res.status(500).json({


            success:false,


            message:
            error.message


        });


    }


};









// ======================================================
// GET BY ID
// ======================================================

exports.getNewStoreOpeningById = (req,res)=>{


    const id =
    req.params.id;



    NewStoreOpening.getById(


        id,


        (err,result)=>{


            if(err){


                return res.status(500).json({


                    success:false,


                    message:
                    err.message


                });


            }





            if(result.length===0){


                return res.status(404).json({


                    success:false,


                    message:
                    "Record not found"


                });


            }





            return res.json({


                success:true,


                data:
                result[0]


            });



        }



    );


};









// ======================================================
// EXPORT CSV
// ======================================================

exports.exportNewStoreOpeningsCSV = (req,res)=>{


    const filters = {


        search:
        req.query.search || "",


        offset:0,


        limit:100000


    };





    NewStoreOpening.getAll(


        filters,


        (err,data)=>{


            if(err){


                return res.status(500).json({


                    success:false,


                    message:
                    err.message


                });


            }





            try{


                const parser =
                new Parser();



                const csv =
                parser.parse(data);





                res.header(

                    "Content-Type",

                    "text/csv"

                );



                res.attachment(

                    "new_store_openings.csv"

                );



                return res.send(csv);



            }


            catch(error){


                return res.status(500).json({


                    success:false,


                    message:
                    error.message


                });


            }



        }



    );


};
// ======================================================
// CREATE NEW STORE OPENING
// ACTIVITY + TRACKING CREATION
// ======================================================

exports.createNewStoreOpening = (req,res)=>{


    try{


        const data = {


            ...req.body,


            attachment:
            req.file
            ?
            req.file.path.replace(/\\/g,"/")
            :
            null,



            created_by:
            req.user.id,



            updated_by:
            req.user.id



        };






        NewStoreOpening.create(


            data,


            async(err,result)=>{


                if(err){


                    console.error(
                        "CREATE ERROR:",
                        err
                    );



                    return res.status(500).json({


                        success:false,


                        message:
                        "Unable to create record",


                        error:
                        err.message


                    });


                }





const nsoId =
result.insertId;



// ==================================================
// CREATE NSO TRACKING ENTRY
// ==================================================

const trackingData = {


    new_store_opening_id:
    nsoId,


    rule_id:
    req.body.rule_id || null,


    department_id:
    req.body.department_id || null,


    trigger_column:
    req.body.trigger_column ||
    "New Store Created",


    status:
    "Pending",


    due_date:
    req.body.due_date || null,


    remarks:
    "Auto created from New Store Opening",


    created_by:
    req.user.id,


    updated_by:
    req.user.id


};





if(

    trackingData.department_id &&

    trackingData.trigger_column

){


    NSOTracking.create(


        trackingData,


        (trackingError)=>{


            if(trackingError){


                console.error(

                    "NSO Tracking Creation Error:",

                    trackingError

                );


            }


        }


    );


}







                // ==================================================
                // ACTIVITY CENTER
                // ==================================================


                await logActivity({


                    activity_type:
                    "CREATE",



                    reference_id:
                    nsoId,



                    title:
                    "New Store Opening Created",



                    description:
                    `New Store Opening #${nsoId} created`,



                    module_name:
                    "New Store Opening",



                    status:
                    "Open",



                    priority:
                    "Medium",



                    created_by:
                    req.user.id



                });








                // ==================================================
                // RESPONSE
                // ==================================================


                return res.status(201).json({


                    success:true,


                    message:
                    "New Store Opening Created Successfully",



                    id:
                    nsoId



                });





            }



        );



    }


    catch(error){



        return res.status(500).json({


            success:false,


            message:
            error.message



        });



    }


};
// ======================================================
// UPDATE NEW STORE OPENING
// ACTIVITY + TIMELINE
// ======================================================

exports.updateNewStoreOpening = (req,res)=>{


    const id =
    req.params.id;



    const data = {


        ...req.body,



        attachment:

        req.file

        ?

        req.file.path.replace(/\\/g,"/")

        :

        req.body.attachment,



        updated_by:

        req.user.id



    };






    NewStoreOpening.update(


        id,


        data,



        async(err,result)=>{



            if(err){


                return res.status(500).json({


                    success:false,


                    message:
                    err.message


                });


            }







            if(result.affectedRows===0){


                return res.status(404).json({


                    success:false,


                    message:
                    "Record not found"


                });


            }








            // ==================================================
            // ACTIVITY CENTER
            // ==================================================


            await logActivity({



                activity_type:

                "UPDATE",



                reference_id:

                id,



                title:

                "New Store Opening Updated",



                description:

                `New Store Opening #${id} updated`,



                module_name:

                "New Store Opening",



                status:

                "Open",



                priority:

                "Medium",



                created_by:

                req.user.id



            });









            return res.json({



                success:true,



                message:

                "New Store Opening Updated Successfully"



            });




        }



    );



};











// ======================================================
// DELETE NEW STORE OPENING
// ACTIVITY + TIMELINE
// ======================================================

exports.deleteNewStoreOpening = (req,res)=>{


    const id =

    req.params.id;





    NewStoreOpening.delete(


        id,



        async(err,result)=>{



            if(err){


                return res.status(500).json({


                    success:false,


                    message:
                    err.message


                });


            }






            if(result.affectedRows===0){


                return res.status(404).json({


                    success:false,


                    message:
                    "Record not found"


                });


            }








            // ==================================================
            // ACTIVITY CENTER
            // ==================================================


            await logActivity({



                activity_type:

                "DELETE",



                reference_id:

                id,



                title:

                "New Store Opening Deleted",



                description:

                `New Store Opening #${id} deleted`,



                module_name:

                "New Store Opening",



                status:

                "Closed",



                priority:

                "Medium",



                created_by:

                req.user.id



            });








            return res.json({


                success:true,


                message:

                "New Store Opening Deleted Successfully"



            });




        }



    );



};
// ======================================================
// BULK IMPORT NEW STORE OPENINGS
// EXCEL UPLOAD
// ======================================================

exports.bulkUploadNewStoreOpenings = (req,res)=>{


    try{


        if(!req.file){


            return res.status(400).json({


                success:false,


                message:
                "Please upload Excel file"


            });


        }






        const workbook =

        XLSX.readFile(

            req.file.path

        );





        const sheet =

        workbook.Sheets[

            workbook.SheetNames[0]

        ];






        const rows =

        XLSX.utils.sheet_to_json(sheet);








        if(rows.length===0){


            return res.status(400).json({


                success:false,


                message:
                "Excel file is empty"


            });


        }






        const records = rows.map(row=>({


            location:
            row["Location"],



            city:
            row["City"],



            sb_area:
            row["SB Area"],



            carpet_area:
            row["Carpet Area"],



            broker_name:
            row["Broker Name"],



            operation_head_assigned:
            row["Operation Head"],



            asm_assigned:
            row["ASM"],



            remarks:
            row["Remarks"],



            created_by:
            req.user.id,



            updated_by:
            req.user.id



        }));








        NewStoreOpening.bulkCreate(


            records,


            async(err,result)=>{



                if(err){


                    return res.status(500).json({


                        success:false,


                        message:
                        err.message


                    });


                }








                await logActivity({



                    activity_type:

                    "IMPORT",



                    reference_id:

                    null,



                    title:

                    "New Store Opening Bulk Import",



                    description:

                    `${records.length} New Store Openings imported`,



                    module_name:

                    "New Store Opening",



                    status:

                    "Open",



                    priority:

                    "Medium",



                    created_by:

                    req.user.id



                });







                return res.json({


                    success:true,


                    message:

                    "Bulk Upload Completed Successfully"



                });



            }



        );



    }


    catch(error){



        return res.status(500).json({


            success:false,


            message:
            error.message



        });



    }



};
// ======================================================
// DELETE ALL NEW STORE OPENINGS
// ACTIVITY CENTER
// ======================================================

exports.deleteAllNewStoreOpenings = (req,res)=>{


    NewStoreOpening.deleteAll(

        async(err,result)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }



            await logActivity({

                activity_type:"DELETE ALL",

                reference_id:null,

                title:"All New Store Openings Deleted",

                description:"All New Store Opening records deleted",

                module_name:"New Store Opening",

                status:"Closed",

                priority:"High",

                created_by:req.user.id

            });



            return res.json({

                success:true,

                message:
                "All New Store Openings Deleted Successfully"

            });



        }

    );


};
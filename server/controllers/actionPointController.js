const ActionPoint = require(
    "../models/actionPointModel"
);


const { Parser } = require(
    "json2csv"
);



// ======================================================
// ACTIVITY CENTER
// ======================================================

const Activity = require(
    "../models/activityModel"
);



// ======================================================
// AUDIT TRAIL
// ======================================================

const Audit = require(
    "../models/auditModel"
);







// ======================================================
// GET ALL ACTION POINTS
// SEARCH + FILTER + PAGINATION
// ======================================================


exports.getAllActionPoints = (req,res)=>{


    try{


        const page =

        Number(req.query.page) || 1;



        const limit =

        Number(req.query.limit) || 10;



        const offset =

        (page - 1) * limit;







        const filters = {



            store_id:

            req.query.store_id || null,



            department_id:

            req.query.department_id || null,



            status:

            req.query.status || null,



            checklist_type_id:

            req.query.checklist_type_id || null,



            start_date:

            req.query.start_date || null,



            end_date:

            req.query.end_date || null,



            search:

            req.query.search || null,



            offset,


            limit



        };








        ActionPoint.getAll(


            filters,


            (err,data)=>{



                if(err){


                    console.error(

                        "GET ACTION POINT ERROR:",

                        err

                    );



                    return res.status(500).json({


                        success:false,


                        message:

                        "Unable to fetch action points",


                        error:

                        err.message


                    });


                }









                ActionPoint.count(


                    filters,


                    (countErr,count)=>{



                        if(countErr){


                            return res.status(500).json({


                                success:false,


                                message:

                                "Unable to count action points",


                                error:

                                countErr.message


                            });


                        }








                        const total =

                        count[0]?.total || 0;








                        return res.status(200).json({



                            success:true,



                            page,



                            limit,



                            total,



                            totalPages:

                            Math.ceil(

                                total /

                                limit

                            ),



                            data:

                            data || []



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

            "Internal Server Error",


            error:

            error.message



        });


    }


};












// ======================================================
// EXPORT ACTION POINTS CSV
// ======================================================


exports.exportActionPointsCSV = (req,res)=>{



    const filters = {



        store_id:

        req.query.store_id || null,



        department_id:

        req.query.department_id || null,



        status:

        req.query.status || null,



        checklist_type_id:

        req.query.checklist_type_id || null,



        search:

        req.query.search || null,



        offset:0,



        limit:100000



    };








    ActionPoint.getAll(


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

                parser.parse(

                    data || []

                );







                Activity.create({



                    title:

                    "Action Points Exported",



                    description:

                    "Action points exported as CSV",



                    module_name:

                    "Action Points",



                    status:

                    "Closed",



                    priority:

                    "Low",



                    created_by:

                    req.user.id,



                    assigned_to:

                    null



                },()=>{});








                res.setHeader(

                    "Content-Type",

                    "text/csv"

                );





                res.setHeader(

                    "Content-Disposition",

                    "attachment; filename=action_points.csv"

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
// CREATE ACTION POINT
// POST /api/action-points
// ======================================================


exports.createActionPoint = (req,res)=>{


    try{


        const {


            submission_id,


            question_id,


            answer,


            remarks,


            store_id,


            department_id,


            sla



        } = req.body;







        // ======================================
        // VALIDATION
        // ======================================


        if(

            !submission_id ||

            !question_id

        ){


            return res.status(400).json({


                success:false,


                message:

                "Submission ID and Question ID required."



            });


        }








        // ======================================
        // ATTACHMENT
        // ======================================


        const attachment =


        req.file

        ?

        req.file.path.replace(/\\/g,"/")

        :

        null;









        const actionPointData = {



            submission_id,


            question_id,


            answer:

            answer || "",



            remarks:

            remarks || "",



            store_id:


            store_id || null,



            department_id:


            department_id || null,



            sla:


            sla || null,



            attachment



        };









        // ======================================
        // CREATE
        // ======================================


        ActionPoint.create(


            actionPointData,


            (err,result)=>{



                if(err){



                    console.error(

                        "CREATE ACTION POINT ERROR:",

                        err

                    );



                    return res.status(500).json({



                        success:false,



                        message:

                        "Create Action Point Failed.",



                        error:

                        err.message



                    });


                }









                const actionPointId =

                result.insertId;









                // ======================================
                // ACTIVITY CENTER
                // ======================================


                Activity.create({



                    title:

                    "Action Point Created",



                    description:

                    `Action Point ${actionPointId} created`,



                    module_name:

                    "Action Points",



                    status:

                    "Open",



                    priority:

                    "Medium",



                    created_by:

                    req.user.id,



                    assigned_to:

                    null



                },()=>{});









                // ======================================
                // AUDIT TRAIL
                // ======================================


                Audit.create({



                    module_name:

                    "Action Points",



                    reference_id:

                    actionPointId,



                    action:

                    "CREATE",



                    old_data:

                    null,



                    new_data:

                    actionPointData,



                    changed_by:

                    req.user.id



                },()=>{});









                return res.status(201).json({



                    success:true,



                    message:

                    "Action Point Created Successfully",



                    id:

                    actionPointId



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
// UPDATE ACTION POINT
// PUT /api/action-points/:id
// ======================================================


exports.updateActionPoint = (req,res)=>{


    const id = req.params.id;



    const {


        answer,


        remarks



    } = req.body;







    const attachment =


    req.file

    ?

    req.file.path.replace(/\\/g,"/")

    :

    null;








    // ======================================
    // GET OLD DATA
    // ======================================


    ActionPoint.getById = undefined;





    const updateData = {



        answer:

        answer || "",



        remarks:

        remarks || "",



        attachment



    };









    ActionPoint.update(


        id,


        updateData,



        (err,result)=>{



            if(err){



                console.error(

                    "UPDATE ACTION POINT ERROR:",

                    err

                );



                return res.status(500).json({


                    success:false,


                    message:

                    "Update Failed",


                    error:

                    err.message



                });


            }








            if(

                result.affectedRows===0

            ){



                return res.status(404).json({


                    success:false,


                    message:

                    "Action Point not found"



                });


            }









            // ======================================
            // ACTIVITY CENTER
            // ======================================


            Activity.create({



                title:

                "Action Point Updated",




                description:

                `Action Point ${id} updated`,




                module_name:

                "Action Points",




                status:

                "Open",




                priority:

                "Medium",




                created_by:

                req.user.id,




                assigned_to:

                null



            },()=>{});









            // ======================================
            // AUDIT TRAIL
            // ======================================


            Audit.create({



                module_name:

                "Action Points",




                reference_id:

                id,




                action:

                "UPDATE",




                old_data:

                null,




                new_data:

                updateData,




                changed_by:

                req.user.id



            },()=>{});









            return res.status(200).json({



                success:true,



                message:

                "Action Point Updated Successfully"



            });



        }


    );



};









// ======================================================
// TAKE ACTION
// PUT /api/action-points/take-action/:id
// ======================================================


exports.takeAction = (req,res)=>{



    const id = req.params.id;



    const {


        action_taken,


        remarks,


        completion_date



    } = req.body;








    ActionPoint.takeAction(


        id,


        {



            action_taken,


            remarks,


            completion_date



        },



        (err,result)=>{



            if(err){



                console.error(

                    "TAKE ACTION ERROR:",

                    err

                );



                return res.status(500).json({



                    success:false,


                    error:

                    err.message



                });


            }








            if(

                result.affectedRows===0

            ){



                return res.status(404).json({


                    success:false,


                    message:

                    "Action Point not found"



                });


            }









            // ======================================
            // ACTIVITY CENTER
            // ======================================


            Activity.create({



                title:

                "Action Taken",




                description:

                `Action completed for Action Point ${id}`,




                module_name:

                "Action Points",




                status:

                "Closed",




                priority:

                "High",




                created_by:

                req.user.id,




                assigned_to:

                null



            },()=>{});









            // ======================================
            // AUDIT TRAIL
            // ======================================


            Audit.create({



                module_name:

                "Action Points",




                reference_id:

                id,




                action:

                "TAKE_ACTION",




                old_data:

                null,




                new_data:{



                    action_taken,


                    remarks,


                    completion_date



                },




                changed_by:

                req.user.id



            },()=>{});









            return res.status(200).json({



                success:true,



                message:

                "Action Saved Successfully"



            });



        }


    );



};
// ======================================================
// DELETE ACTION POINT
// DELETE /api/action-points/:id
// ======================================================


exports.deleteActionPoint = (req,res)=>{


    const id = req.params.id;








    ActionPoint.delete(


        id,


        (err,result)=>{



            if(err){



                console.error(

                    "DELETE ACTION POINT ERROR:",

                    err

                );



                return res.status(500).json({



                    success:false,



                    message:

                    "Delete Failed",



                    error:

                    err.message



                });



            }








            if(

                result.affectedRows === 0

            ){



                return res.status(404).json({



                    success:false,



                    message:

                    "Action Point not found"



                });



            }









            // ======================================
            // ACTIVITY CENTER
            // ======================================


            Activity.create({



                title:

                "Action Point Deleted",




                description:

                `Action Point ${id} deleted`,




                module_name:

                "Action Points",




                status:

                "Closed",




                priority:

                "High",




                created_by:

                req.user.id,




                assigned_to:

                null



            },()=>{});









            // ======================================
            // AUDIT TRAIL
            // ======================================


            Audit.create({



                module_name:

                "Action Points",




                reference_id:

                id,




                action:

                "DELETE",




                old_data:

                null,




                new_data:

                null,




                changed_by:

                req.user.id



            },()=>{});









            return res.status(200).json({



                success:true,



                message:

                "Action Point Deleted Successfully"



            });



        }



    );



};











// ======================================================
// MODULE EXPORT
// ======================================================


module.exports = {

    getAllActionPoints:
    exports.getAllActionPoints,


    exportActionPointsCSV:
    exports.exportActionPointsCSV,


    createActionPoint:
    exports.createActionPoint,


    updateActionPoint:
    exports.updateActionPoint,


    takeAction:
    exports.takeAction,


    deleteActionPoint:
    exports.deleteActionPoint

};
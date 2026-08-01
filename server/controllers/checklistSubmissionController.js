const ChecklistSubmission = require(
    "../models/checklistSubmissionModel"
);


// ======================================================
// ACTIVITY + AUDIT
// ======================================================

const Activity = require(
    "../models/activityModel"
);


const Audit = require(
    "../models/auditModel"
);



// ======================================================
// CREATE CHECKLIST SUBMISSION
// POST /api/checklist-submissions
// ======================================================

exports.createSubmission = (req,res)=>{


    try{


        const {

            checklist_type_id,

            store_id,

            submission_date,

            latitude,

            longitude,

            device

        } = req.body;



        let answers = [];



        try{


            answers = JSON.parse(

                req.body.answers || "[]"

            );


        }

        catch(error){


            answers = [];


        }





        const attachment =

        req.file

        ?

        req.file.path

        :

        null;





        const finalDevice =


        device ||

        req.headers["user-agent"] ||

        "Unknown Device";






        // ======================================
        // VALIDATION
        // ======================================


        if(!checklist_type_id){


            return res.status(400).json({

                success:false,

                message:
                "Checklist Type is required."

            });


        }





        if(!store_id){


            return res.status(400).json({

                success:false,

                message:
                "Store is required."

            });


        }






        if(!submission_date){


            return res.status(400).json({

                success:false,

                message:
                "Submission date is required."

            });


        }







        const validAnswers =

        answers.filter(

            item =>

            item &&

            item.question_id

        );






        if(validAnswers.length===0){


            return res.status(400).json({

                success:false,

                message:
                "Checklist answers required."

            });


        }






        const submissionData = {


            checklist_type_id,


            store_id,



            submitted_by:

            req.user.id,



            submission_date,



            latitude:

            latitude || null,



            longitude:

            longitude || null,



            device:

            finalDevice,



            attachment,



            status:

            "Submitted"


        };







        ChecklistSubmission.create(


            submissionData,


            validAnswers,



            (err,result)=>{



                if(err){


                    console.error(err);



                    return res.status(500).json({

                        success:false,

                        message:
                        "Checklist submission failed."

                    });


                }







                const submissionId =

                result.submissionId;






                // ======================================
                // ACTIVITY CENTER
                // ======================================


                Activity.create({


                    title:

                    "Checklist Submitted",



                    description:

                    `Checklist submitted for store ${store_id}`,



                    module_name:

                    "Checklist Submission",



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

                    "Checklist Submission",



                    reference_id:

                    submissionId,



                    action:

                    "CREATE",



                    old_data:

                    null,



                    new_data:

                    submissionData,



                    changed_by:

                    req.user.id



                },()=>{});








                return res.status(201).json({

                    success:true,

                    message:
                    "Checklist submitted successfully.",


                    data:{


                        submission_id:

                        submissionId


                    }


                });



            }


        );



    }


    catch(error){


        console.error(error);



        res.status(500).json({

            success:false,

            message:
            "Internal Server Error"

        });


    }


};
// ======================================================
// GET ALL CHECKLIST SUBMISSIONS
// SEARCH + PAGINATION
// GET /api/checklist-submissions
// ======================================================


exports.getAllSubmissions = (req,res)=>{


    const filters = {


        search:

        req.query.search || "",



        page:

        Number(req.query.page) || 1,



        limit:

        Number(req.query.limit) || 10



    };





    ChecklistSubmission.getAll(


        filters,


        (err,results)=>{



            if(err){


                console.error(

                    "GET SUBMISSIONS ERROR:",

                    err

                );



                return res.status(500).json({

                    success:false,

                    message:
                    err.message

                });


            }





            ChecklistSubmission.countAll(


                filters,


                (countErr,countResult)=>{



                    if(countErr){


                        console.error(

                            "COUNT ERROR:",

                            countErr

                        );



                        return res.status(500).json({

                            success:false,

                            message:
                            countErr.message

                        });


                    }





                    const total =

                    countResult[0].total;





                    return res.status(200).json({


                        success:true,



                        data:results,



                        pagination:{


                            page:

                            filters.page,



                            limit:

                            filters.limit,



                            total,



                            totalPages:

                            Math.ceil(

                                total /

                                filters.limit

                            )


                        }



                    });



                }


            );



        }


    );


};
// ======================================================
// GET SINGLE CHECKLIST SUBMISSION
// GET /api/checklist-submissions/:id
// ======================================================


exports.getSubmissionById = (req,res)=>{


    const id = req.params.id;





    ChecklistSubmission.getById(


        id,


        (err,submission)=>{



            if(err){


                console.error(

                    "GET SUBMISSION ERROR:",

                    err

                );



                return res.status(500).json({

                    success:false,

                    message:
                    err.message

                });


            }







            if(

                !submission ||

                submission.length === 0

            ){


                return res.status(404).json({

                    success:false,

                    message:
                    "Checklist submission not found."

                });


            }







            ChecklistSubmission.getAnswers(


                id,


                (answerErr,answers)=>{



                    if(answerErr){


                        console.error(

                            "GET ANSWERS ERROR:",

                            answerErr

                        );



                        return res.status(500).json({

                            success:false,

                            message:
                            answerErr.message

                        });


                    }







                    return res.status(200).json({


                        success:true,



                        data:{


                            ...submission[0],



                            answers



                        }



                    });



                }


            );




        }


    );



};
// ======================================================
// UPDATE CHECKLIST SUBMISSION STATUS
// PUT /api/checklist-submissions/:id/status
// ======================================================


exports.updateStatus = (req,res)=>{


    const id = req.params.id;



    const {

        status

    } = req.body;





    if(!status){


        return res.status(400).json({

            success:false,

            message:
            "Status is required."

        });


    }







    ChecklistSubmission.getById(


        id,


        (oldErr,oldData)=>{



            if(oldErr){


                console.error(oldErr);



                return res.status(500).json({

                    success:false,

                    message:
                    oldErr.message

                });


            }







            if(

                !oldData ||

                oldData.length===0

            ){


                return res.status(404).json({

                    success:false,

                    message:
                    "Submission not found."

                });


            }








            ChecklistSubmission.updateStatus(


                id,


                status,


                (err)=>{



                    if(err){


                        console.error(err);



                        return res.status(500).json({

                            success:false,

                            message:
                            err.message

                        });


                    }







                    // ======================================
                    // ACTIVITY CENTER
                    // ======================================


                    Activity.create({



                        title:

                        "Checklist Status Updated",




                        description:

                        `Checklist submission ${id} status changed to ${status}`,




                        module_name:

                        "Checklist Submission",




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

                        "Checklist Submission",




                        reference_id:

                        id,




                        action:

                        "UPDATE_STATUS",




                        old_data:

                        oldData[0],




                        new_data:

                        {

                            status

                        },




                        changed_by:

                        req.user.id




                    },()=>{});









                    return res.status(200).json({


                        success:true,



                        message:

                        "Checklist status updated successfully."



                    });





                }


            );



        }


    );



};
// ======================================================
// EXPORT CHECKLIST SUBMISSIONS
// GET /api/checklist-submissions/export
// ======================================================


exports.exportSubmissions = (req,res)=>{


    ChecklistSubmission.exportData(


        (err,results)=>{



            if(err){


                console.error(

                    "EXPORT ERROR:",

                    err

                );



                return res.status(500).json({

                    success:false,

                    message:
                    err.message

                });


            }







            let csv =

            "ID,Checklist Type,Store,Submitted By,Submission Date,Status,Created At\n";







            results.forEach((item)=>{


                csv +=

                `"${item.id}",`+

                `"${item.checklist_type}",`+

                `"${item.store_name}",`+

                `"${item.submitted_by}",`+

                `"${item.submission_date}",`+

                `"${item.status}",`+

                `"${item.created_at}"\n`;



            });








            res.setHeader(

                "Content-Type",

                "text/csv"

            );



            res.setHeader(

                "Content-Disposition",

                "attachment; filename=Checklist_Submissions.csv"

            );





            return res.status(200).send(csv);



        }


    );


};





// ======================================================
// CONTROLLER EXPORT
// ======================================================


module.exports.createSubmission = exports.createSubmission;

module.exports.getAllSubmissions = exports.getAllSubmissions;

module.exports.getSubmissionById = exports.getSubmissionById;

module.exports.updateStatus = exports.updateStatus;

module.exports.exportSubmissions = exports.exportSubmissions;
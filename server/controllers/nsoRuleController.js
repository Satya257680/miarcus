const NSORule = require("../models/nsoRuleModel");

const XLSX = require("xlsx");


// ======================================================
// ACTIVITY + AUDIT
// ======================================================

const Activity = require("../models/activityModel");

const Audit = require("../models/auditModel");



// ======================================================
// GET ALL RULES
// SEARCH + PAGINATION
// ======================================================

exports.getRules = (req,res)=>{


    const filters = {


        search:
        req.query.search || "",


        page:
        Number(req.query.page) || 1,


        limit:
        Number(req.query.limit) || 10


    };



    NSORule.getAllRules(

        filters,

        (err,results)=>{


            if(err){


                console.error(err);


                return res.status(500).json({

                    success:false,

                    message:err.message

                });


            }




            NSORule.countRules(

                filters,

                (countErr,countResult)=>{


                    if(countErr){


                        return res.status(500).json({

                            success:false,

                            message:countErr.message

                        });


                    }



                    const total =

                    countResult[0].total;



                    res.status(200).json({


                        success:true,


                        data:results,


                        pagination:{


                            page:filters.page,


                            limit:filters.limit,


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
// CREATE RULE
// ACTIVITY + AUDIT
// ======================================================

exports.createRule = (req,res)=>{


    const {

        trigger_column,

        departments

    } = req.body;



    if(!trigger_column){


        return res.status(400).json({

            success:false,

            message:
            "Trigger Column is required."

        });


    }



    if(

        !departments ||

        departments.length === 0

    ){


        return res.status(400).json({

            success:false,

            message:
            "Select at least one department."

        });


    }




    NSORule.checkDuplicateTriggerColumn(


        trigger_column,


        (err,rows)=>{


            if(err){


                console.error(err);


                return res.status(500).json({

                    success:false,

                    message:err.message

                });


            }




            if(rows.length > 0){


                return res.status(400).json({

                    success:false,

                    message:
                    "Trigger Column already exists."

                });


            }




            NSORule.createRuleWithDepartments(


                {


                    trigger_column,


                    departments,


                    created_by:

                    req.user.id


                },



                (err,result)=>{


                    if(err){


                        console.error(err);


                        return res.status(500).json({

                            success:false,

                            message:err.message

                        });


                    }




                    const ruleId =

                    result.insertId;





                    // ======================================
                    // ACTIVITY CENTER
                    // ======================================

                    Activity.create({


                        title:

                        "NSO Rule Created",



                        description:

                        `${trigger_column} rule created`,



                        module_name:

                        "NSO Rules",



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

                        "NSO Rules",



                        reference_id:

                        ruleId,



                        action:

                        "CREATE",



                        old_data:

                        null,



                        new_data:{


                            trigger_column,


                            departments


                        },



                        changed_by:

                        req.user.id



                    },()=>{});







                    res.status(201).json({


                        success:true,


                        message:

                        "Rule created successfully."



                    });



                }


            );



        }


    );


};
// ======================================================
// BULK UPLOAD RULES
// ACTIVITY + AUDIT
// ======================================================

exports.bulkUploadRules = (req,res)=>{


    if(!req.file){


        return res.status(400).json({

            success:false,

            message:
            "Please upload an Excel file."

        });


    }



    try{


        const workbook = XLSX.readFile(

            req.file.path

        );



        const sheet = workbook.Sheets[

            workbook.SheetNames[0]

        ];



        const rows = XLSX.utils.sheet_to_json(sheet);




        const rules = rows.map(row=>({


            trigger_column:

            row["Trigger Column"],



            department_ids:

            String(

                row["Department IDs"]

            )

            .split(",")

            .map(

                id=>Number(

                    id.trim()

                )

            )


        }));





        NSORule.bulkCreateRules(


            rules,


            req.user.id,



            (err)=>{


                if(err){


                    console.error(err);


                    return res.status(500).json({

                        success:false,

                        message:err.message

                    });


                }




                // ======================================
                // ACTIVITY
                // ======================================


                Activity.create({


                    title:

                    "NSO Rules Bulk Uploaded",



                    description:

                    `${rules.length} NSO Rules uploaded`,



                    module_name:

                    "NSO Rules",



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
                // AUDIT
                // ======================================


                Audit.create({


                    module_name:

                    "NSO Rules",



                    reference_id:

                    null,



                    action:

                    "BULK_UPLOAD",



                    old_data:

                    null,



                    new_data:

                    rules,



                    changed_by:

                    req.user.id



                },()=>{});







                res.status(200).json({


                    success:true,


                    message:

                    "Rules uploaded successfully."



                });



            }


        );



    }

    catch(err){


        console.error(err);


        res.status(500).json({

            success:false,

            message:
            "Invalid Excel file."

        });


    }


};
// ======================================================
// DELETE RULE
// ACTIVITY + AUDIT
// ======================================================

exports.deleteRule = (req,res)=>{


    const id = req.params.id;

    



    // ======================================
    // GET OLD DATA FOR AUDIT
    // ======================================

    NSORule.getRuleById(

        id,

        (oldErr,oldData)=>{


            if(oldErr){


                console.error(oldErr);


                return res.status(500).json({

                    success:false,

                    message:oldErr.message

                });


            }




            NSORule.deleteRule(


                id,


                (err)=>{


                    if(err){


                        console.error(err);


                        return res.status(500).json({

                            success:false,

                            message:err.message

                        });


                    }




                    // ======================================
                    // ACTIVITY CENTER
                    // ======================================


                    Activity.create({


                        title:

                        "NSO Rule Deleted",



                        description:

                        "NSO Rule deleted",



                        module_name:

                        "NSO Rules",



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

                        "NSO Rules",



                        reference_id:

                        id,



                        action:

                        "DELETE",



                        old_data:

                        oldData[0],



                        new_data:

                        null,



                        changed_by:

                        req.user.id



                    },()=>{});






                    res.status(200).json({


                        success:true,


                        message:

                        "Rule deleted successfully."



                    });



                }


            );



        }


    );


};

// ======================================================
// DELETE ALL RULES
// ======================================================

exports.deleteAllRules = (req,res)=>{

    NSORule.getAllRules(

        {},

        (fetchErr, oldRules)=>{


            if(fetchErr){

                console.error(fetchErr);

                return res.status(500).json({

                    success:false,

                    message:fetchErr.message

                });

            }


            NSORule.deleteAllRules(

                (err)=>{


                    if(err){

                        console.error(err);

                        return res.status(500).json({

                            success:false,

                            message:err.message

                        });

                    }



                    Activity.create({

                        title:
                        "All NSO Rules Deleted",

                        description:
                        `${oldRules.length} NSO rules deleted`,

                        module_name:
                        "NSO Rules",

                        status:
                        "Closed",

                        priority:
                        "High",

                        created_by:
                        req.user.id,

                        assigned_to:
                        null


                    },()=>{});




                    Audit.create({

                        module_name:
                        "NSO Rules",

                        reference_id:
                        null,

                        action:
                        "DELETE_ALL",

                        old_data:
                        oldRules,

                        new_data:
                        null,

                        changed_by:
                        req.user.id


                    },()=>{});




                    res.status(200).json({

                        success:true,

                        message:
                        "All rules deleted successfully."

                    });



                }

            );


        }

    );


};

// ======================================================
// UPDATE RULE
// ACTIVITY + AUDIT
// ======================================================

exports.updateRule = (req,res)=>{

    const id = req.params.id;

    const {
        trigger_column,
        departments
    } = req.body;


    if(!trigger_column){

        return res.status(400).json({

            success:false,
            message:"Trigger Column is required."

        });

    }


    if(!departments || departments.length === 0){

        return res.status(400).json({

            success:false,
            message:"Select at least one department."

        });

    }



    NSORule.getRuleById(

        id,

        (oldErr,oldData)=>{


            if(oldErr){

                return res.status(500).json({

                    success:false,
                    message:oldErr.message

                });

            }



            NSORule.updateRuleWithDepartments(

                id,

                trigger_column,

                departments,

                (err)=>{


                    if(err){

                        console.error(err);

                        return res.status(500).json({

                            success:false,
                            message:err.message

                        });

                    }



                    Activity.create({

                        title:"NSO Rule Updated",

                        description:
                        `${trigger_column} rule updated`,

                        module_name:"NSO Rules",

                        status:"Open",

                        priority:"Medium",

                        created_by:req.user.id,

                        assigned_to:null


                    },()=>{});




                    Audit.create({

                        module_name:"NSO Rules",

                        reference_id:id,

                        action:"UPDATE",

                        old_data:oldData[0],

                        new_data:{
                            trigger_column,
                            departments
                        },

                        changed_by:req.user.id


                    },()=>{});





                    res.status(200).json({

                        success:true,

                        message:
                        "Rule updated successfully."

                    });


                }


            );


        }


    );


};
// ======================================================
// EXPORT RULES (CSV)
// ======================================================

exports.exportRules = (req,res)=>{


    NSORule.exportRules(

        (err,results)=>{


            if(err){


                console.error(err);


                return res.status(500).json({

                    success:false,

                    message:err.message

                });


            }



            let csv =

            "Trigger Column,Departments\n";



            results.forEach((rule)=>{


                csv +=

                `"${rule.trigger_column}","${rule.departments}"\n`;


            });




            // ======================================
            // ACTIVITY CENTER
            // ======================================

            Activity.create({


                title:

                "NSO Rules Exported",



                description:

                "NSO Rules exported as CSV",



                module_name:

                "NSO Rules",



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

                "attachment; filename=NSO_Rules.csv"

            );



            res.status(200).send(csv);



        }

    );


};

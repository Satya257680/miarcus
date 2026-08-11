const ChecklistReport = require(
    "../models/checklistReportModel"
);

const csv = require(
    "csv-parser"
);

const { Readable } = require(
    "stream"
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
// DATE FORMAT HELPER
// ======================================================

const formatDate = (dateValue) => {

    if (!dateValue) {

        return null;

    }

    if (

        typeof dateValue === "string"

        &&

        dateValue.includes("T")

    ) {

        return dateValue.split("T")[0];

    }

    return dateValue;

};


// ======================================================
// GET ALL REPORTS
// SEARCH + FILTER + PAGINATION
// GET /api/checklist-reports
// ======================================================


exports.getAllReports = (req,res)=>{


    const filters = {


        store_id:

        req.query.store_id || null,



        checklist_type_id:

        req.query.checklist_type_id || null,

        new_store_opening_id:

        req.query.new_store_opening_id || null,



        employee_id:

        req.query.employee_id || null,



        from_date:

        req.query.from_date || null,



        to_date:

        req.query.to_date || null,



        search:

        req.query.search || "",



        page:

        Number(req.query.page) || 1,



        limit:

        Number(req.query.limit) || 10


    };







    ChecklistReport.getAll(

        filters,


        (err,reports)=>{


            if(err){


                console.error(

                    "GET REPORT ERROR:",

                    err

                );



                return res.status(500).json({

                    success:false,

                    message:

                    "Unable to fetch checklist reports.",

                    error:

                    err.message

                });


            }







            ChecklistReport.countAll(

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

                    countResult[0]?.total || 0;







                    return res.status(200).json({



                        success:true,



                        data:

                        reports || [],




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
// GET REPORT DETAILS
// GET /api/checklist-reports/:id
// ======================================================


exports.getReportById = (req,res)=>{


    const reportId = req.params.id;





    ChecklistReport.getById(


        reportId,


        (err,reports)=>{



            if(err){


                console.error(

                    "GET REPORT DETAILS ERROR:",

                    err

                );



                return res.status(500).json({

                    success:false,

                    message:

                    "Unable to fetch report details.",

                    error:

                    err.message

                });


            }







            if(

                !reports ||

                reports.length === 0

            ){


                return res.status(404).json({

                    success:false,

                    message:

                    "Checklist report not found."

                });


            }








            // ======================================
            // AUDIT HISTORY
            // ======================================


            Audit.getByReference(


                "Checklist Reports",


                reportId,


                (auditErr,auditLogs)=>{



                    if(auditErr){


                        console.error(

                            "AUDIT ERROR:",

                            auditErr

                        );



                        auditLogs = [];

                    }








                    return res.status(200).json({


                        success:true,



                        data:{


                            report:

                            reports,



                            audit:

                            auditLogs || []



                        }



                    });



                }


            );



        }


    );


};









// ======================================================
// UPDATE REPORT
// PUT /api/checklist-reports/:id
// ======================================================


exports.updateReport = (req,res)=>{


    const reportId = req.params.id;



    const {


        status,

        submission_date,

        device,

        answer,

        remarks



    } = req.body;








    if(!status){


        return res.status(400).json({


            success:false,


            message:

            "Status is required."



        });


    }









    // ======================================
    // GET OLD DATA
    // ======================================


    ChecklistReport.getById(


        reportId,


        (oldErr,oldData)=>{



            if(oldErr){


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

                    "Checklist report not found."



                });


            }









            const updateData = {



                status,

                submission_date:

                formatDate(submission_date),


                device,

                answer,

                remarks



            };









            ChecklistReport.update(


                reportId,


                updateData,


                (err,result)=>{



                    if(err){



                        console.error(

                            "UPDATE REPORT ERROR:",

                            err

                        );



                        return res.status(500).json({


                            success:false,


                            message:

                            "Unable to update checklist report.",


                            error:

                            err.message



                        });


                    }









                    // ======================================
                    // ACTIVITY CENTER
                    // ======================================


                    Activity.create({



                        title:

                        "Checklist Report Updated",




                        description:

                        `Checklist report ${reportId} updated`,




                        module_name:

                        "Checklist Reports",




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

                        "Checklist Reports",




                        reference_id:

                        reportId,




                        action:

                        "UPDATE",




                        old_data:

                        oldData,




                        new_data:

                        updateData,




                        changed_by:

                        req.user.id



                    },()=>{});









                    return res.status(200).json({



                        success:true,



                        message:

                        "Checklist report updated successfully."



                    });



                }


            );



        }


    );


};
// ======================================================
// DELETE REPORT
// DELETE /api/checklist-reports/:id
// ======================================================


exports.deleteReport = (req,res)=>{


    const reportId = req.params.id;






    // ======================================
    // GET OLD DATA
    // ======================================


    ChecklistReport.getById(


        reportId,


        (oldErr,oldData)=>{



            if(oldErr){


                console.error(

                    "FETCH DELETE DATA ERROR:",

                    oldErr

                );



                return res.status(500).json({


                    success:false,


                    message:

                    oldErr.message


                });


            }








            if(

                !oldData ||

                oldData.length === 0

            ){


                return res.status(404).json({


                    success:false,


                    message:

                    "Checklist report not found."


                });


            }








            // ======================================
            // DELETE
            // ======================================


            ChecklistReport.delete(


                reportId,


                (err,result)=>{



                    if(err){



                        console.error(

                            "DELETE ERROR:",

                            err

                        );



                        return res.status(500).json({


                            success:false,


                            message:

                            "Unable to delete checklist report.",


                            error:

                            err.message


                        });


                    }









                    // ======================================
                    // ACTIVITY
                    // ======================================


                    Activity.create({



                        title:

                        "Checklist Report Deleted",




                        description:

                        `Checklist report ${reportId} deleted`,




                        module_name:

                        "Checklist Reports",




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
                    // AUDIT
                    // ======================================


                    Audit.create({



                        module_name:

                        "Checklist Reports",




                        reference_id:

                        reportId,




                        action:

                        "DELETE",




                        old_data:

                        oldData,




                        new_data:

                        null,




                        changed_by:

                        req.user.id



                    },()=>{});









                    return res.status(200).json({



                        success:true,



                        message:

                        "Checklist report deleted successfully."



                    });



                }


            );



        }


    );


};









// ======================================================
// IMPORT CSV REPORTS
// POST /api/checklist-reports/bulk-upload
// ======================================================

exports.bulkUploadChecklistReports = (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "CSV file is required."

        });

    }

    const records = [];

    Readable.from(req.file.buffer)

        .pipe(csv())

        .on(

            "data",

            (row) => {

                records.push(row);

            }

        )

        .on(

            "end",

            async () => {

                try {

                    if (records.length === 0) {

                        return res.status(400).json({

                            success: false,

                            message: "CSV file is empty."

                        });

                    }

                    let importedCount = 0;

                    let failedCount = 0;

                    // ======================================
                    // CSV INSERT LOGIC
                    // ======================================
                    //
                    // Keep your existing insert logic here
                    //
                    // Success:
                    // importedCount++
                    //
                    // Failed:
                    // failedCount++
                    //

                    // ======================================
                    // ACTIVITY CENTER
                    // ======================================

                    Activity.create(

                        {

                            title:

                                "Checklist Reports Imported",

                            description:

                                `${importedCount} checklist reports imported from CSV`,

                            module_name:

                                "Checklist Reports",

                            status:

                                "Closed",

                            priority:

                                "Medium",

                            created_by:

                                req.user.id,

                            assigned_to:

                                null

                        },

                        () => {}

                    );

                    // ======================================
                    // AUDIT TRAIL
                    // ======================================

                    Audit.create(

                        {

                            module_name:

                                "Checklist Reports",

                            reference_id:

                                null,

                            action:

                                "IMPORT",

                            old_data:

                                null,

                            new_data: {

                                imported:

                                    importedCount,

                                failed:

                                    failedCount

                            },

                            changed_by:

                                req.user.id

                        },

                        () => {}

                    );

                    return res.status(200).json({

                        success: true,

                        message: "CSV import completed.",

                        imported:

                            importedCount,

                        failed:

                            failedCount

                    });

                }

                catch (error) {

                    console.error(

                        "IMPORT ERROR:",

                        error

                    );

                    return res.status(500).json({

                        success: false,

                        message:

                            error.message

                    });

                }

            }

        )

        .on(

            "error",

            (error) => {

                console.error(

                    "CSV PARSE ERROR:",

                    error

                );

                return res.status(500).json({

                    success: false,

                    message:

                        error.message

                });

            }

        );

};
// ======================================================
// EXPORT CHECKLIST REPORTS CSV
// GET /api/checklist-reports/export
// ======================================================


exports.exportReports = (req,res)=>{


    ChecklistReport.exportReports(


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








            let csvData =

            "Checklist,Store,Employee,Employee ID,Department,Date,Status,Question,Answer,Remarks\n";








            results.forEach((row)=>{



                csvData +=


                `"${row.checklist_name || ""}",` +


                `"${row.store_name || ""}",` +


                `"${row.employee_name || ""}",` +


                `"${row.employee_id || ""}",` +


                `"${row.department_name || ""}",` +


                `"${row.submission_date || ""}",` +


                `"${row.status || ""}",` +


                `"${row.question || ""}",` +


                `"${row.answer || ""}",` +


                `"${row.remarks || ""}"\n`;



            });









            // ======================================
            // ACTIVITY CENTER
            // ======================================


            Activity.create({



                title:

                "Checklist Reports Exported",




                description:

                "Checklist reports exported as CSV",




                module_name:

                "Checklist Reports",




                status:

                "Closed",




                priority:

                "Low",




                created_by:

                req.user.id,




                assigned_to:

                null



            },()=>{});









            // ======================================
            // RESPONSE
            // ======================================


            res.setHeader(

                "Content-Type",

                "text/csv"

            );



            res.setHeader(

                "Content-Disposition",

                "attachment; filename=Checklist_Reports.csv"

            );





            return res.send(csvData);



        }


    );


};








// ======================================================
// CONTROLLER EXPORT
// ======================================================


module.exports = {

    getAllReports: exports.getAllReports,

    getReportById: exports.getReportById,

    updateReport: exports.updateReport,

    deleteReport: exports.deleteReport,

    bulkUploadChecklistReports:
        exports.bulkUploadChecklistReports,

    exportReports: exports.exportReports

};
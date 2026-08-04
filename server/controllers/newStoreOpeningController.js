const NewStoreOpening = require("../models/newStoreOpeningModel");

const NSOTracking = require("../models/nsoTrackingModel");

const { Parser } = require("json2csv");

const XLSX = require("xlsx");

const { logActivity } = require("../utils/activityLogger");




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

        console.log("========== CREATE ==========");
console.log("req.body =", req.body);
console.log("data =", data);
console.log("req.file =", req.file);
console.log("============================");






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

exports.updateNewStoreOpening = (req, res) => {

    const id = req.params.id;

    // ==========================================
    // DATE FORMATTER
    // ==========================================

    const formatDate = (value) => {

        if (!value) return null;

        const date = new Date(value);

        if (isNaN(date.getTime())) return null;

        return date.toISOString().split("T")[0];

    };

    const data = {

        ...req.body,

        possession_date_loi: formatDate(req.body.possession_date_loi),

        possession_date_broker: formatDate(req.body.possession_date_broker),

        actual_possession_date: formatDate(req.body.actual_possession_date),

        approval_deadline: formatDate(req.body.approval_deadline),

        gst_deadline: formatDate(req.body.gst_deadline),

        hr_hiring_deadline: formatDate(req.body.hr_hiring_deadline),

        team_training_deadline: formatDate(req.body.team_training_deadline),

        visit_by_nso_team_deadline: formatDate(req.body.visit_by_nso_team_deadline),

        plan_of_stock_deadline: formatDate(req.body.plan_of_stock_deadline),

        plan_of_collaterals_deadline: formatDate(req.body.plan_of_collaterals_deadline),

        on_field_training_deadline: formatDate(req.body.on_field_training_deadline),

        dispatch_stock_deadline: formatDate(req.body.dispatch_stock_deadline),

        nso_handover_deadline: formatDate(req.body.nso_handover_deadline),

        vm_handover_deadline: formatDate(req.body.vm_handover_deadline),

        scanning_deadline: formatDate(req.body.scanning_deadline),

        billing_start_date: formatDate(req.body.billing_start_date),

        attachment: req.file
            ? req.file.path.replace(/\\/g, "/")
            : req.body.attachment,

        updated_by: req.user.id

    };

    NewStoreOpening.update(

        id,

        data,

        async (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Record not found"

                });

            }

            try {

                await logActivity({

                    activity_type: "UPDATE",

                    reference_id: id,

                    title: "New Store Opening Updated",

                    description: `New Store Opening #${id} updated`,

                    module_name: "New Store Opening",

                    status: "Open",

                    priority: "Medium",

                    created_by: req.user.id

                });

            } catch (activityError) {

                console.error("Activity Log Error:", activityError);

            }

            return res.json({

                success: true,

                message: "New Store Opening Updated Successfully"

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
// CSV / EXCEL UPLOAD
// ======================================================

exports.bulkUploadNewStoreOpenings = (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please upload a CSV, XLSX or XLS file"

            });

        }

        const workbook = XLSX.readFile(req.file.path);

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {

            return res.status(400).json({

                success: false,

                message: "Uploaded file is empty"

            });

        }

        // ==========================================
// DATE FORMATTER
// ==========================================

const formatDate = (value) => {

    if (!value) return null;

    const date = new Date(value);

    if (isNaN(date.getTime())) return null;

    return date.toISOString().split("T")[0];

};

        const records = rows.map((row) => ({

    location: row.location,

    city: row.city,

    sb_area: row.sb_area,

    carpet_area: row.carpet_area,

    cam: row.cam,

    mg: row.mg,

    electricity_kva: row.electricity_kva,

    revenue_share: row.revenue_share,

    escalation: row.escalation,

    expected_sale: row.expected_sale,

    possession_date_loi: formatDate(row.possession_date_loi),

    possession_date_broker: formatDate(row.possession_date_broker),

    broker_name: row.broker_name,

    operation_head_assigned: row.operation_head_assigned,

    asm_assigned: row.asm_assigned,

    deal_days: row.deal_days,

    actual_possession_date: formatDate(row.actual_possession_date),

    remarks: row.remarks,

    attachment: row.attachment,

    delay_loi_vs_broker: row.delay_loi_vs_broker,

    possession_delay: row.possession_delay,

   received_by_nso: formatDate(row.received_by_nso),

layout_by_nso: formatDate(row.layout_by_nso),

revised_layout_by_nso: formatDate(row.revised_layout_by_nso),

    approval_deadline: formatDate(row.approval_deadline),

    approver_name: row.approver_name,

    construction_vendor: row.construction_vendor,

    project_taken_by: row.project_taken_by,

    visit_by_op_team: formatDate(row.visit_by_op_team),

    gst_deadline: formatDate(row.gst_deadline),

    hr_hiring_deadline: formatDate(row.hr_hiring_deadline),

    team_training_deadline: formatDate(row.team_training_deadline),

    visit_by_nso_team_deadline: formatDate(row.visit_by_nso_team_deadline),

    plan_of_stock_deadline: formatDate(row.plan_of_stock_deadline),

    plan_of_collaterals_deadline: formatDate(row.plan_of_collaterals_deadline),

    on_field_training_deadline: formatDate(row.on_field_training_deadline),

    dispatch_stock_deadline: formatDate(row.dispatch_stock_deadline),

    nso_handover_deadline: formatDate(row.nso_handover_deadline),

    vm_handover_deadline: formatDate(row.vm_handover_deadline),

    scanning_deadline: formatDate(row.scanning_deadline),

    billing_start_date: formatDate(row.billing_start_date),

    status: row.status,

    created_by: req.user.id,

    updated_by: req.user.id

}));
     let imported = 0;

const insertNext = (index) => {

    if (index >= records.length) {

        (async () => {

            try {

                await logActivity({

                    activity_type: "IMPORT",

                    reference_id: 0,

                    title: "New Store Opening Bulk Import",

                    description: `${imported} New Store Openings imported`,

                    module_name: "New Store Opening",

                    status: "Open",

                    priority: "Medium",

                    created_by: req.user.id,

                    assigned_to: null

                });

            } catch (activityError) {

                console.error("Activity Log Error:", activityError);

            }

            return res.json({

                success: true,

                message: "Bulk Upload Completed Successfully",

                imported

            });

        })();

        return;

    }

    NewStoreOpening.create(

        records[index],

        (err) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            imported++;

            insertNext(index + 1);

        }

    );

};

insertNext(0);

} catch (error) {

    console.error(error);

    return res.status(500).json({

        success: false,

        message: error.message

    });

}

};
// ======================================================
// DELETE ALL NEW STORE OPENINGS
// ACTIVITY CENTER
// ======================================================

exports.deleteAllNewStoreOpenings = (req, res) => {

    NewStoreOpening.deleteAll(

        async (err, result) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            try {

                await logActivity({

                    activity_type: "DELETE ALL",

                    // reference_id cannot be NULL
                    reference_id: 0,

                    title: "All New Store Openings Deleted",

                    description: "All New Store Opening records deleted",

                    module_name: "New Store Opening",

                    status: "Closed",

                    priority: "High",

                    created_by: req.user.id,

                    assigned_to: null

                });

            } catch (activityError) {

                console.error(

                    "Activity Log Error:",

                    activityError

                );

                // Continue even if activity logging fails
            }

            return res.json({

                success: true,

                message: "All New Store Openings Deleted Successfully"

            });

        }

    );

};
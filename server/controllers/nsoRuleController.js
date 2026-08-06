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

exports.createRule = (req, res) => {

    let {

        trigger_column,

        expected_answer,

        priority,

        sla_days,

        create_action_point,

        mandatory,

        is_active,

        departments

    } = req.body;

    // ======================================
    // NORMALIZE DATA TYPES
    // ======================================

    sla_days = Number(sla_days);

    create_action_point = Number(create_action_point);

    mandatory = Number(mandatory);

    is_active = Number(is_active);

    // ======================================
    // VALIDATION
    // ======================================

    if (!trigger_column) {

        return res.status(400).json({

            success: false,

            message: "Trigger Column is required."

        });

    }

    if (

        !departments ||

        !Array.isArray(departments) ||

        departments.length === 0

    ) {

        return res.status(400).json({

            success: false,

            message: "Select at least one department."

        });

    }

    const validAnswers = [

        "Yes",

        "No",

        "NA"

    ];

    if (

        !expected_answer ||

        !validAnswers.includes(expected_answer)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Expected Answer."

        });

    }

    const validPriorities = [

        "Low",

        "Medium",

        "High",

        "Critical"

    ];

    if (

        !priority ||

        !validPriorities.includes(priority)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Priority."

        });

    }

    const sla = sla_days;

    if (

        Number.isNaN(sla) ||

        sla < 1 ||

        sla > 365

    ) {

        return res.status(400).json({

            success: false,

            message: "SLA Days must be between 1 and 365."

        });

    }

    if (

        ![0, 1].includes(create_action_point)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Create Action Point value."

        });

    }

    if (

        ![0, 1].includes(mandatory)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Mandatory value."

        });

    }

    if (

        ![0, 1].includes(is_active)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Status value."

        });

    }

    // ======================================
    // CHECK DUPLICATE
    // ======================================

    NSORule.checkDuplicateTriggerColumn(

        trigger_column,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length > 0) {

                return res.status(400).json({

                    success: false,

                    message: "Trigger Column already exists."

                });

            }

            // ======================================
            // CREATE RULE
            // ======================================

            NSORule.createRuleWithDepartments(

                {

                    trigger_column,

                    expected_answer,

                    priority,

                    sla_days: sla,

                    create_action_point,

                    mandatory,

                    is_active,

                    departments,

                    created_by: req.user.id

                },

                (err, result) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: err.message

                        });

                    }

                    const ruleId = result.insertId;

                    // ======================================
                    // ACTIVITY CENTER
                    // ======================================

                    Activity.create({

                        title: "NSO Rule Created",

                        description: `${trigger_column} rule created`,

                        module_name: "NSO Rules",

                        status: "Open",

                        priority: priority,

                        created_by: req.user.id,

                        assigned_to: null

                    }, () => {});

                    // ======================================
                    // AUDIT TRAIL
                    // ======================================

                    Audit.create({

                        module_name: "NSO Rules",

                        reference_id: ruleId,

                        action: "CREATE",

                        old_data: null,

                        new_data: {

                            trigger_column,

                            expected_answer,

                            priority,

                            sla_days: sla,

                            create_action_point,

                            mandatory,

                            is_active,

                            departments

                        },

                        changed_by: req.user.id

                    }, () => {});

                    // ======================================
                    // RESPONSE
                    // ======================================

                    res.status(201).json({

                        success: true,

                        message: "Rule created successfully."

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

exports.bulkUploadRules = (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "Please upload a CSV, XLSX or XLS file."

        });

    }

    try {

        const workbook = XLSX.readFile(req.file.path);

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(sheet);

        const db = require("../config/db");

        db.query(

            "SELECT id, department_name FROM departments",

            (err, departments) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: err.message

                    });

                }

                // ======================================
                // DEPARTMENT MAP
                // ======================================

                const departmentMap = {};

                departments.forEach((dept) => {

                    departmentMap[
                        dept.department_name
                            .trim()
                            .toLowerCase()
                    ] = dept.id;

                });

                // ======================================
                // PREPARE RULES
                // ======================================

                const rules = rows.map((row) => {

                    const departmentNames = String(

                        row["Departments"] || ""

                    )

                        .split(",")

                        .map(name => name.trim())

                        .filter(name => name !== "");

                    const department_ids = departmentNames

                        .map(name =>

                            departmentMap[
                                name.toLowerCase()
                            ]

                        )

                        .filter(Boolean);

                    return {

                        trigger_column:

                            String(
                                row["Trigger Column"] || ""
                            ).trim(),

                        expected_answer:

                            String(
                                row["Expected Answer"] || "No"
                            ).trim(),

                        priority:

                            String(
                                row["Priority"] || "Medium"
                            ).trim(),

                        sla_days:

                            Number(
                                row["SLA Days"]
                            ) || 3,

                        create_action_point:

                            String(

                                row["Create Action Point"] || ""

                            )

                                .trim()

                                .toLowerCase() === "no"

                                ? 0

                                : 1,

                        mandatory:

                            String(

                                row["Mandatory"] || ""

                            )

                                .trim()

                                .toLowerCase() === "no"

                                ? 0

                                : 1,

                        is_active:

                            String(

                                row["Status"] || ""

                            )

                                .trim()

                                .toLowerCase() === "inactive"

                                ? 0

                                : 1,

                        department_ids

                    };

                });

                // ======================================
                // SAVE RULES
                // ======================================

                NSORule.bulkCreateRules(

                    rules,

                    req.user.id,

                    (err) => {

                        if (err) {

                            console.error(err);

                            return res.status(500).json({

                                success: false,

                                message: err.message

                            });

                        }

                        // ======================================
                        // ACTIVITY CENTER
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

                        }, () => {});

                        // ======================================
                        // AUDIT TRAIL
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

                        }, () => {});

                        // ======================================
                        // RESPONSE
                        // ======================================

                        res.status(200).json({

                            success: true,

                            message: "Rules uploaded successfully."

                        });

                    }

                );

            }

        );

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: "Invalid CSV/XLS/XLSX file."

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

exports.updateRule = (req, res) => {

    const id = req.params.id;

    let {

        trigger_column,

        expected_answer,

        priority,

        sla_days,

        create_action_point,

        mandatory,

        is_active,

        departments

    } = req.body;

    // ======================================
    // NORMALIZE DATA TYPES
    // ======================================

    sla_days = Number(sla_days);

    create_action_point = Number(create_action_point);

    mandatory = Number(mandatory);

    is_active = Number(is_active);

    // ======================================
    // VALIDATION
    // ======================================

    if (!trigger_column) {

        return res.status(400).json({

            success: false,

            message: "Trigger Column is required."

        });

    }

    if (

        !departments ||

        !Array.isArray(departments) ||

        departments.length === 0

    ) {

        return res.status(400).json({

            success: false,

            message: "Select at least one department."

        });

    }

    const validAnswers = [

        "Yes",

        "No",

        "NA"

    ];

    if (

        !expected_answer ||

        !validAnswers.includes(expected_answer)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Expected Answer."

        });

    }

    const validPriorities = [

        "Low",

        "Medium",

        "High",

        "Critical"

    ];

    if (

        !priority ||

        !validPriorities.includes(priority)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Priority."

        });

    }

    const sla = sla_days;

    if (

        Number.isNaN(sla) ||

        sla < 1 ||

        sla > 365

    ) {

        return res.status(400).json({

            success: false,

            message: "SLA Days must be between 1 and 365."

        });

    }

    if (

        ![0, 1].includes(create_action_point)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Create Action Point value."

        });

    }

    if (

        ![0, 1].includes(mandatory)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Mandatory value."

        });

    }

    if (

        ![0, 1].includes(is_active)

    ) {

        return res.status(400).json({

            success: false,

            message: "Invalid Status value."

        });

    }

    // ======================================
    // CHECK DUPLICATE
    // ======================================

    NSORule.checkDuplicateForUpdate(

        id,

        trigger_column,

        (duplicateErr, duplicateRows) => {

            if (duplicateErr) {

                console.error(duplicateErr);

                return res.status(500).json({

                    success: false,

                    message: duplicateErr.message

                });

            }

            if (duplicateRows.length > 0) {

                return res.status(400).json({

                    success: false,

                    message: "Trigger Column already exists."

                });

            }

            // ======================================
            // GET OLD DATA
            // ======================================

            NSORule.getRuleById(

                id,

                (oldErr, oldData) => {

                    if (oldErr) {

                        console.error(oldErr);

                        return res.status(500).json({

                            success: false,

                            message: oldErr.message

                        });

                    }

                    // ======================================
                    // UPDATE RULE
                    // ======================================

                    NSORule.updateRuleWithDepartments(

                        id,

                        trigger_column,

                        expected_answer,

                        priority,

                        sla,

                        create_action_point,

                        mandatory,

                        is_active,

                        departments,

                        (err) => {

                            if (err) {

                                console.error(err);

                                return res.status(500).json({

                                    success: false,

                                    message: err.message

                                });

                            }

                            // ======================================
                            // ACTIVITY CENTER
                            // ======================================

                            Activity.create({

                                title: "NSO Rule Updated",

                                description: `${trigger_column} rule updated`,

                                module_name: "NSO Rules",

                                status: "Open",

                                priority: priority,

                                created_by: req.user.id,

                                assigned_to: null

                            }, () => {});

                            // ======================================
                            // AUDIT TRAIL
                            // ======================================

                            Audit.create({

                                module_name: "NSO Rules",

                                reference_id: id,

                                action: "UPDATE",

                                old_data: oldData[0],

                                new_data: {

                                    trigger_column,

                                    expected_answer,

                                    priority,

                                    sla_days: sla,

                                    create_action_point,

                                    mandatory,

                                    is_active,

                                    departments

                                },

                                changed_by: req.user.id

                            }, () => {});

                            // ======================================
                            // RESPONSE
                            // ======================================

                            res.status(200).json({

                                success: true,

                                message: "Rule updated successfully."

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// EXPORT RULES (CSV)
// ======================================================

exports.exportRules = (req, res) => {

    NSORule.exportRules(

        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // CSV HEADER
            // ======================================

            let csv =

                "Trigger Column,Expected Answer,Priority,SLA Days,Create Action Point,Mandatory,Status,Departments\n";

            // ======================================
            // CSV DATA
            // ======================================

            results.forEach((rule) => {

                csv +=

                    `"${rule.trigger_column}",` +

                    `"${rule.expected_answer}",` +

                    `"${rule.priority}",` +

                    `"${rule.sla_days}",` +

                    `"${rule.create_action_point ? "Yes" : "No"}",` +

                    `"${rule.mandatory ? "Yes" : "No"}",` +

                    `"${rule.is_active ? "Active" : "Inactive"}",` +

                    `"${rule.departments || ""}"\n`;

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

            }, () => {});

            // ======================================
            // DOWNLOAD
            // ======================================

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
const ActionPoint = require("../models/actionPointModel");

const { Parser } = require("json2csv");



// ======================================================
// ACTIVITY
// ======================================================

const Activity = require("../models/activityModel");



// ======================================================
// AUDIT
// ======================================================

const Audit = require("../models/auditModel");



// ======================================================
// GET ALL ACTION POINTS
// SEARCH + FILTER + PAGINATION
// ======================================================

exports.getAllActionPoints = (req, res) => {

    try {

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

            checklist_type_id:

                req.query.checklist_type_id || null,

            priority:

                req.query.priority || null,

            status:

                req.query.status || null,

            start_date:

                req.query.start_date || null,

            end_date:

                req.query.end_date || null,

            search:

                req.query.search || "",

            offset,

            limit

        };



        ActionPoint.getAll(

            filters,

            (err, rows) => {

                if (err) {

                    console.error(

                        "GET ACTION POINT ERROR:",

                        err

                    );

                    return res.status(500).json({

                        success: false,

                        message:

                            "Unable to fetch Action Points.",

                        error:

                            err.message

                    });

                }



                ActionPoint.count(

                    filters,

                    (countError, countResult) => {

                        if (countError) {

                            console.error(

                                countError

                            );

                            return res.status(500).json({

                                success: false,

                                message:

                                    "Unable to count Action Points.",

                                error:

                                    countError.message

                            });

                        }



                        const total =

                            countResult[0].total || 0;



                        return res.status(200).json({

                            success: true,

                            data: rows,

                            pagination: {

                                page,

                                limit,

                                total,

                                totalPages:

                                    Math.ceil(

                                        total /

                                        limit

                                    )

                            }

                        });

                    }

                );

            }

        );

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

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

exports.exportActionPointsCSV = (req, res) => {

    try {

        const filters = {

            store_id:

                req.query.store_id || null,

            department_id:

                req.query.department_id || null,

            checklist_type_id:

                req.query.checklist_type_id || null,

            priority:

                req.query.priority || null,

            status:

                req.query.status || null,

            start_date:

                req.query.start_date || null,

            end_date:

                req.query.end_date || null,

            search:

                req.query.search || "",

            offset: 0,

            limit: 100000

        };



        ActionPoint.exportData(

            filters,

            (err, rows) => {

                if (err) {

                    console.error(

                        "EXPORT ACTION POINT ERROR:",

                        err

                    );

                    return res.status(500).json({

                        success: false,

                        message:

                            "Unable to export Action Points.",

                        error:

                            err.message

                    });

                }



                const parser = new Parser({

                    fields: [

                        "id",

                        "submission_date",

                        "store_name",

                        "city",

                        "state",

                        "checklist_name",

                        "department_name",

                        "question",

                        "answer",

                        "priority",

                        "sla_days",

                        "status",

                        "remarks",

                        "submitted_by",

                        "assigned_to",

                        "completed_at",

                        "created_at"

                    ]

                });



                const csv = parser.parse(

                    rows || []

                );



                Activity.create({

                    title:

                        "Action Points Exported",

                    description:

                        "Action Points exported successfully.",

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

                }, () => {});



                Audit.create({

                    module_name:

                        "Action Points",

                    reference_id:

                        null,

                    action:

                        "EXPORT",

                    old_data:

                        null,

                    new_data: {

                        total:

                            rows.length

                    },

                    changed_by:

                        req.user.id

                }, () => {});



                res.setHeader(

                    "Content-Type",

                    "text/csv"

                );



                res.setHeader(

                    "Content-Disposition",

                    "attachment; filename=ActionPoints.csv"

                );



                return res.status(200).send(csv);

            }

        );

    }

    catch (error) {

        console.error(error);



        return res.status(500).json({

            success: false,

            message:

                "Export failed.",

            error:

                error.message

        });

    }

};
// ======================================================
// GET ACTION POINT BY ID
// GET /api/action-points/:id
// ======================================================

exports.getActionPointById = (req, res) => {

    try {

        const id = req.params.id;

        ActionPoint.getById(

            id,

            (err, result) => {

                if (err) {

                    console.error(

                        "GET ACTION POINT ERROR:",

                        err

                    );

                    return res.status(500).json({

                        success: false,

                        message:

                            "Unable to fetch Action Point.",

                        error:

                            err.message

                    });

                }



                if (

                    !result ||

                    result.length === 0

                ) {

                    return res.status(404).json({

                        success: false,

                        message:

                            "Action Point not found."

                    });

                }



                return res.status(200).json({

                    success: true,

                    data: result[0]

                });

            }

        );

    }

    catch (error) {

        console.error(error);



        return res.status(500).json({

            success: false,

            message:

                "Internal Server Error",

            error:

                error.message

        });

    }

};
// ======================================================
// CREATE ACTION POINT
// POST /api/action-points
// ======================================================

exports.createActionPoint = (req, res) => {

    try {

        const {

            submission_id,

            submission_answer_id,

            rule_id,

            store_id,

            department_id,

            question_id,

            assigned_to,

            priority,

            sla_days,

            remarks,

            status

        } = req.body;



        // ======================================
        // VALIDATION
        // ======================================

        if (!submission_id) {

            return res.status(400).json({

                success: false,

                message: "Submission is required."

            });

        }



        if (!submission_answer_id) {

            return res.status(400).json({

                success: false,

                message: "Submission Answer is required."

            });

        }



        if (!question_id) {

            return res.status(400).json({

                success: false,

                message: "Question is required."

            });

        }



        if (!store_id) {

            return res.status(400).json({

                success: false,

                message: "Store is required."

            });

        }



        const attachment =

            req.file

                ? req.file.path.replace(/\\/g, "/")

                : null;



        const actionPointData = {

            submission_id,

            submission_answer_id,

            rule_id: rule_id || null,

            store_id,

            department_id: department_id || null,

            question_id,

            assigned_to: assigned_to || null,

            priority: priority || "Medium",

            sla_days: Number(sla_days) || 0,

            status: status || "Open",

            remarks: remarks || "",

            attachment,

            created_by: req.user.id

        };



        ActionPoint.create(

            actionPointData,

            (err, result) => {

                if (err) {

                    console.error(

                        "CREATE ACTION POINT ERROR:",

                        err

                    );

                    return res.status(500).json({

                        success: false,

                        message:

                            "Unable to create Action Point.",

                        error: err.message

                    });

                }



                const actionPointId =

                    result.insertId;



                // ======================================
                // ACTIVITY
                // ======================================

                Activity.create({

                    title:

                        "Action Point Created",

                    description:

                        `Action Point #${actionPointId} created.`,

                    module_name:

                        "Action Points",

                    status:

                        "Open",

                    priority:

                        actionPointData.priority,

                    created_by:

                        req.user.id,

                    assigned_to:

                        assigned_to || null

                }, () => {});



                // ======================================
                // AUDIT
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

                }, () => {});



                return res.status(201).json({

                    success: true,

                    message:

                        "Action Point created successfully.",

                    data: {

                        id: actionPointId

                    }

                });

            }

        );

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:

                "Internal Server Error",

            error:

                error.message

        });

    }

};
// ======================================================
// UPDATE ACTION POINT
// PUT /api/action-points/:id
// ======================================================

exports.updateActionPoint = (req, res) => {

    try {

        const id = req.params.id;

        const {

            assigned_to,

            priority,

            sla_days,

            remarks,

            status

        } = req.body;



        const attachment =

            req.file

                ? req.file.path.replace(/\\/g, "/")

                : null;



        // ======================================
        // GET EXISTING ACTION POINT
        // ======================================

        ActionPoint.getById(

            id,

            (findError, rows) => {

                if (findError) {

                    console.error(findError);

                    return res.status(500).json({

                        success: false,

                        message: "Unable to fetch Action Point.",

                        error: findError.message

                    });

                }



                if (

                    !rows ||

                    rows.length === 0

                ) {

                    return res.status(404).json({

                        success: false,

                        message: "Action Point not found."

                    });

                }



                const oldData = rows[0];



                const updateData = {

                    assigned_to:

                        assigned_to || null,

                    priority:

                        priority || oldData.priority,

                    sla_days:

                        Number(sla_days) ||

                        oldData.sla_days,

                    remarks:

                        remarks || "",

                    attachment:

                        attachment ||

                        oldData.attachment

                };



                ActionPoint.update(

                    id,

                    updateData,

                    (updateError, result) => {

                        if (updateError) {

                            console.error(

                                updateError

                            );

                            return res.status(500).json({

                                success: false,

                                message:

                                    "Unable to update Action Point.",

                                error:

                                    updateError.message

                            });

                        }



                        if (

                            status &&

                            status !== oldData.status

                        ) {

                            ActionPoint.updateStatus(

                                id,

                                status,

                                () => {}

                            );

                        }



                        // ======================================
                        // ACTIVITY
                        // ======================================

                        Activity.create({

                            title:

                                "Action Point Updated",

                            description:

                                `Action Point #${id} updated.`,

                            module_name:

                                "Action Points",

                            status:

                                "Open",

                            priority:

                                updateData.priority,

                            created_by:

                                req.user.id,

                            assigned_to:

                                updateData.assigned_to

                        }, () => {});



                        // ======================================
                        // AUDIT
                        // ======================================

                        Audit.create({

                            module_name:

                                "Action Points",

                            reference_id:

                                id,

                            action:

                                "UPDATE",

                            old_data:

                                oldData,

                            new_data:

                                {

                                    ...oldData,

                                    ...updateData,

                                    status:

                                        status ||

                                        oldData.status

                                },

                            changed_by:

                                req.user.id

                        }, () => {});



                        return res.status(200).json({

                            success: true,

                            message:

                                "Action Point updated successfully."

                        });

                    }

                );

            }

        );

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:

                "Internal Server Error",

            error:

                error.message

        });

    }

};
// ======================================================
// TAKE ACTION
// PUT /api/action-points/take-action/:id
// ======================================================

exports.takeAction = (req, res) => {

    try {

        const id = req.params.id;

        const {

            action_taken,

            remarks,

            status

        } = req.body;



        // ======================================
        // VALIDATION
        // ======================================

        if (!action_taken) {

            return res.status(400).json({

                success: false,

                message:

                    "Action Taken is required."

            });

        }



        // ======================================
        // GET EXISTING ACTION POINT
        // ======================================

        ActionPoint.getById(

            id,

            (findError, rows) => {

                if (findError) {

                    console.error(findError);

                    return res.status(500).json({

                        success: false,

                        message:

                            "Unable to fetch Action Point.",

                        error:

                            findError.message

                    });

                }



                if (

                    !rows ||

                    rows.length === 0

                ) {

                    return res.status(404).json({

                        success: false,

                        message:

                            "Action Point not found."

                    });

                }



                const oldData = rows[0];



                // ======================================
                // TAKE ACTION
                // ======================================

                ActionPoint.takeAction(

                    id,

                    {

                        action_taken,

                        remarks,

                        status:

                            status || "Closed"

                    },

                    (actionError) => {

                        if (actionError) {

                            console.error(actionError);

                            return res.status(500).json({

                                success: false,

                                message:

                                    "Unable to complete Action Point.",

                                error:

                                    actionError.message

                            });

                        }



                        // ======================================
                        // ACTIVITY CENTER
                        // ======================================

                        Activity.create({

                            title:

                                "Action Point Closed",

                            description:

                                `Action Point #${id} completed.`,

                            module_name:

                                "Action Points",

                            status:

                                "Closed",

                            priority:

                                oldData.priority,

                            created_by:

                                req.user.id,

                            assigned_to:

                                oldData.assigned_to

                        }, () => {});



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

                                oldData,

                            new_data: {

                                action_taken,

                                remarks,

                                status:

                                    "Closed"

                            },

                            changed_by:

                                req.user.id

                        }, () => {});



                        return res.status(200).json({

                            success: true,

                            message:

                                "Action Point completed successfully."

                        });

                    }

                );

            }

        );

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:

                "Internal Server Error",

            error:

                error.message

        });

    }

};
// ======================================================
// DELETE ACTION POINT
// DELETE /api/action-points/:id
// ======================================================

exports.deleteActionPoint = (req, res) => {

    try {

        const id = req.params.id;

        ActionPoint.getById(

            id,

            (findError, rows) => {

                if (findError) {

                    return res.status(500).json({

                        success: false,

                        message: "Unable to fetch Action Point.",

                        error: findError.message

                    });

                }



                if (

                    !rows ||

                    rows.length === 0

                ) {

                    return res.status(404).json({

                        success: false,

                        message: "Action Point not found."

                    });

                }



                const oldData = rows[0];



                ActionPoint.delete(

                    id,

                    (deleteError, result) => {

                        if (deleteError) {

                            return res.status(500).json({

                                success: false,

                                message: "Unable to delete Action Point.",

                                error: deleteError.message

                            });

                        }



                        if (

                            result.affectedRows === 0

                        ) {

                            return res.status(404).json({

                                success: false,

                                message: "Action Point not found."

                            });

                        }



                        // ======================================
                        // ACTIVITY
                        // ======================================

                        Activity.create({

                            title:

                                "Action Point Deleted",

                            description:

                                `Action Point #${id} deleted.`,

                            module_name:

                                "Action Points",

                            status:

                                "Closed",

                            priority:

                                oldData.priority,

                            created_by:

                                req.user.id,

                            assigned_to:

                                oldData.assigned_to

                        }, () => {});



                        // ======================================
                        // AUDIT
                        // ======================================

                        Audit.create({

                            module_name:

                                "Action Points",

                            reference_id:

                                id,

                            action:

                                "DELETE",

                            old_data:

                                oldData,

                            new_data:

                                null,

                            changed_by:

                                req.user.id

                        }, () => {});



                        return res.status(200).json({

                            success: true,

                            message:

                                "Action Point deleted successfully."

                        });

                    }

                );

            }

        );

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message:

                "Internal Server Error",

            error:

                error.message

        });

    }

};



// ======================================================
// DELETE ALL ACTION POINTS
// DELETE /api/action-points
// ======================================================

exports.deleteAllActionPoints = (req, res) => {

    try {

        ActionPoint.deleteAll(

            (err, result) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:

                            "Unable to delete Action Points.",

                        error:

                            err.message

                    });

                }



                Activity.create({

                    title:

                        "All Action Points Deleted",

                    description:

                        "All Action Points removed.",

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

                }, () => {});



                Audit.create({

                    module_name:

                        "Action Points",

                    reference_id:

                        null,

                    action:

                        "DELETE_ALL",

                    old_data:

                        null,

                    new_data:

                        {

                            affectedRows:

                                result.affectedRows

                        },

                    changed_by:

                        req.user.id

                }, () => {});



                return res.status(200).json({

                    success: true,

                    message:

                        "All Action Points deleted successfully."

                });

            }

        );

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message:

                "Internal Server Error",

            error:

                error.message

        });

    }

};



// ======================================================
// MODULE EXPORT
// ======================================================

module.exports = {

    getAllActionPoints:

        exports.getAllActionPoints,

    exportActionPointsCSV:

        exports.exportActionPointsCSV,

    getActionPointById:

        exports.getActionPointById,

    createActionPoint:

        exports.createActionPoint,

    updateActionPoint:

        exports.updateActionPoint,

    takeAction:

        exports.takeAction,

    deleteActionPoint:

        exports.deleteActionPoint,

    deleteAllActionPoints:

        exports.deleteAllActionPoints

};

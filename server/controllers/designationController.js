const designationModel = require("../models/designationModel");

const { logActivity } = require("../utils/activityLogger");

// ======================================================
// GET ALL DESIGNATIONS
// ======================================================

exports.getAllDesignations = (req, res) => {

    designationModel.getAllDesignations(

        (err, results) => {

            if (err) {

                console.error(

                    "Get Designations Error:",

                    err

                );

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch designations"

                });

            }

            return res.status(200).json({

                success: true,

                count: results.length,

                data: results

            });

        }

    );

};
// ======================================================
// CREATE DESIGNATION
// ======================================================

exports.createDesignation = (req, res) => {

    let {

        department_id,

        designation_name,

        description,

        status,

        users

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    designation_name = designation_name?.trim();

    if (

        !department_id ||

        !designation_name

    ) {

        return res.status(400).json({

            success: false,

            message: "Department and Designation Name are required."

        });

    }

    description = description?.trim() || "";

    status = status || "Active";

    users = users || [];

    // ======================================
    // CHECK DUPLICATE DESIGNATION
    // ======================================

    designationModel.checkDesignationExists(

        designation_name,

        department_id,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            if (result.length > 0) {

                return res.status(409).json({

                    success: false,

                    message: "Designation already exists in this department."

                });

            }

            // ======================================
            // CREATE DESIGNATION
            // ======================================

            designationModel.createDesignation(

                {

                    department_id,

                    designation_name,

                    description,

                    status

                },
                                (err, insertResult) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: "Failed to create designation"

                        });

                    }

                    // ======================================
                    // ASSIGN USERS
                    // ======================================

                    designationModel.assignUsers(

                        insertResult.insertId,

                        users,

                        (assignErr) => {

                            if (assignErr) {

                                console.error(assignErr);

                                return res.status(500).json({

                                    success: false,

                                    message: "Designation created but employee assignment failed."

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Designation",

                                reference_id: insertResult.insertId,

                                title: "Designation Created",

                                description: `${designation_name} designation was created`,

                                module_name: "Designations",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(201).json({

                                success: true,

                                message: "Designation created successfully",

                                id: insertResult.insertId

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// UPDATE DESIGNATION
// ======================================================

exports.updateDesignation = (req, res) => {

    const { id } = req.params;

    let {

        department_id,

        designation_name,

        description,

        status,

        users

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    designation_name = designation_name?.trim();

    if (

        !department_id ||

        !designation_name

    ) {

        return res.status(400).json({

            success: false,

            message: "Department and Designation Name are required."

        });

    }

    description = description?.trim() || "";

    status = status || "Active";

    users = users || [];

    // ======================================
    // UPDATE DESIGNATION
    // ======================================

    designationModel.updateDesignation(

        id,

        {

            department_id,

            designation_name,

            description,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to update designation"

                });

            }

            // ======================================
            // REMOVE OLD USER MAPPING
            // ======================================

            designationModel.removeAssignedUsers(

                id,

                (removeErr) => {

                    if (removeErr) {

                        console.error(removeErr);

                        return res.status(500).json({

                            success: false,

                            message: "Failed to remove assigned employees"

                        });

                    }

                    // ======================================
                    // ASSIGN NEW USERS
                    // ======================================

                    designationModel.assignUsers(

                        id,

                        users,

                        (assignErr) => {

                            if (assignErr) {

                                console.error(assignErr);

                                return res.status(500).json({

                                    success: false,

                                    message: "Failed to assign employees"

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Designation",

                                reference_id: id,

                                title: "Designation Updated",

                                description: `${designation_name} designation was updated`,

                                module_name: "Designations",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Designation updated successfully"

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// DELETE DESIGNATION
// ======================================================

exports.deleteDesignation = (req, res) => {

    const { id } = req.params;

    // ======================================
    // GET DESIGNATION DETAILS
    // ======================================

    designationModel.getDesignationById(

        id,

        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch designation"

                });

            }

            if (results.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Designation not found."

                });

            }

            const designation = results[0];

            // ======================================
            // REMOVE ASSIGNED USERS
            // ======================================

            designationModel.removeAssignedUsers(

                id,

                (removeErr) => {

                    if (removeErr) {

                        console.error(removeErr);

                        return res.status(500).json({

                            success: false,

                            message: "Failed to remove assigned employees"

                        });

                    }

                    // ======================================
                    // DELETE DESIGNATION
                    // ======================================

                    designationModel.deleteDesignation(

                        id,

                        (deleteErr) => {

                            if (deleteErr) {

                                console.error(deleteErr);

                                return res.status(500).json({

                                    success: false,

                                    message: "Failed to delete designation"

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Designation",

                                reference_id: id,

                                title: "Designation Deleted",

                                description: `${designation.designation_name} designation was deleted`,

                                module_name: "Designations",

                                status: "Closed",

                                priority: "High",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Designation deleted successfully"

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================
exports.getAllDesignations = exports.getAllDesignations;

exports.createDesignation = exports.createDesignation;

exports.updateDesignation = exports.updateDesignation;

exports.deleteDesignation = exports.deleteDesignation;
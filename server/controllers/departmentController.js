const Department = require("../models/departmentModel");

const { logActivity } = require("../utils/activityLogger");

// ======================================================
// GET ALL DEPARTMENTS
// ======================================================

exports.getDepartments = (req, res) => {

    Department.getAllDepartments(

        (err, results) => {

            if (err) {

                console.error(

                    "Get Departments Error:",

                    err

                );

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch departments"

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
// CREATE DEPARTMENT
// ======================================================

exports.createDepartment = (req, res) => {

    let {

        department_name,

        description,

        status,

        users

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    department_name = department_name?.trim();

    if (!department_name) {

        return res.status(400).json({

            success: false,

            message: "Department name is required."

        });

    }

    description = description?.trim() || "";

    status = status || "Active";

    users = users || [];

    // ======================================
    // CHECK DUPLICATE DEPARTMENT
    // ======================================

    Department.checkDepartmentExists(

        department_name,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error",

                    error: err.message

                });

            }

            if (result.length > 0) {

                return res.status(409).json({

                    success: false,

                    message: "Department already exists."

                });

            }

            // ======================================
            // CREATE DEPARTMENT
            // ======================================

            Department.createDepartment(

                {

                    department_name,

                    description,

                    status

                },
                                (err, data) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: "Unable to create department",

                            error: err.message

                        });

                    }

                    // ======================================
                    // ASSIGN USERS
                    // ======================================

                    Department.assignUsers(

                        data.insertId,

                        users,

                        (assignErr) => {

                            if (assignErr) {

                                console.error(assignErr);

                                return res.status(500).json({

                                    success: false,

                                    message: assignErr.sqlMessage || assignErr.message,

                                    error: assignErr

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Department",

                                reference_id: data.insertId,

                                title: "Department Created",

                                description: `${department_name} department was created`,

                                module_name: "Departments",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(201).json({

                                success: true,

                                message: "Department created successfully.",

                                id: data.insertId

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// UPDATE DEPARTMENT
// ======================================================

exports.updateDepartment = (req, res) => {

    const id = req.params.id;

    let {

        department_name,

        description,

        status,

        users

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    department_name = department_name?.trim();

    if (!department_name) {

        return res.status(400).json({

            success: false,

            message: "Department name is required."

        });

    }

    description = description?.trim() || "";

    status = status || "Active";

    users = users || [];

    // ======================================
    // UPDATE DEPARTMENT
    // ======================================

    Department.updateDepartment(

        id,

        {

            department_name,

            description,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to update department",

                    error: err.message

                });

            }

            // ======================================
            // REMOVE OLD USER MAPPING
            // ======================================

            Department.removeAssignedUsers(

                id,

                (removeErr) => {

                    if (removeErr) {

                        console.error(removeErr);

                        return res.status(500).json({

                            success: false,

                            message: "Unable to update employee mapping.",

                            error: removeErr.message

                        });

                    }

                    // ======================================
                    // ASSIGN NEW USERS
                    // ======================================

                    Department.assignUsers(

                        id,

                        users,

                        (assignErr) => {

                            if (assignErr) {

                                console.error(assignErr);

                                return res.status(500).json({

                                    success: false,

                                    message: assignErr.sqlMessage || assignErr.message,

                                    error: assignErr

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Department",

                                reference_id: id,

                                title: "Department Updated",

                                description: `${department_name} department was updated`,

                                module_name: "Departments",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Department updated successfully."

                            });

                        }

                    );

                }

            );

        }

    );

};

// ======================================================
// GET ASSIGNED USERS
// ======================================================

exports.getAssignedUsers = (req, res) => {

    const departmentId = req.params.id;

    Department.getAssignedUsers(

        departmentId,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to fetch assigned users.",

                    error: err.message

                });

            }

            return res.status(200).json({

                success: true,

                users: result

            });

        }

    );

};
// ======================================================
// DELETE DEPARTMENT
// ======================================================

exports.deleteDepartment = (req, res) => {

    const id = req.params.id;

    // ======================================
    // GET DEPARTMENT DETAILS
    // ======================================

    Department.getDepartmentById(

        id,

        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to fetch department",

                    error: err.message

                });

            }

            if (results.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Department not found."

                });

            }

            const department = results[0];

            // ======================================
            // REMOVE ASSIGNED USERS
            // ======================================

            Department.removeAssignedUsers(

                id,

                (removeErr) => {

                    if (removeErr) {

                        console.error(removeErr);

                        return res.status(500).json({

                            success: false,

                            message: "Unable to remove assigned users.",

                            error: removeErr.message

                        });

                    }

                    // ======================================
                    // DELETE DEPARTMENT
                    // ======================================

                    Department.deleteDepartment(

                        id,

                        (deleteErr) => {

                            if (deleteErr) {

                                console.error(deleteErr);

                                return res.status(500).json({

                                    success: false,

                                    message: "Unable to delete department",

                                    error: deleteErr.message

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Department",

                                reference_id: id,

                                title: "Department Deleted",

                                description: `${department.department_name} department was deleted`,

                                module_name: "Departments",

                                status: "Closed",

                                priority: "High",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(200).json({

                                success: true,

                                message: "Department deleted successfully."

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


// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================
exports.getDepartments = exports.getDepartments;

exports.createDepartment = exports.createDepartment;

exports.updateDepartment = exports.updateDepartment;

exports.getAssignedUsers = exports.getAssignedUsers;

exports.deleteDepartment = exports.deleteDepartment;
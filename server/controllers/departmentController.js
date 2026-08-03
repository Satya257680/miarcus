const Department = require("../models/departmentModel");

const { logActivity } = require("../utils/activityLogger");

const XLSX = require("xlsx");
const fs = require("fs");

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
// GET DEPARTMENT BY ID
// ======================================================

exports.getDepartmentById = (req, res) => {

    const id = req.params.id;

    Department.getDepartmentById(id, (err, results) => {

        if (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Unable to fetch department."

            });

        }

        if (results.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Department not found."

            });

        }

        const department = results[0];

        Department.getAssignedUsers(id, (err, users) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to fetch assigned users."

                });

            }

            department.users = users.map(user => user.user_id);

            return res.status(200).json({

                success: true,

                data: department

            });

        });

    });

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

    Department.getDepartmentById(id, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch department"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Department not found."
            });
        }

        const department = results[0];

        const db = require("../config/db");

        // ==========================================
        // CHECK WHETHER DEPARTMENT IS USED
        // ==========================================

        const checks = [

            {
                table: "users",
                column: "department_id",
                message: "Department is assigned to one or more users."
            },

            {
                table: "designations",
                column: "department_id",
                message: "Department is assigned to one or more designations."
            },

            {
                table: "question_departments",
                column: "department_id",
                message: "Department is mapped to questions."
            },

            {
                table: "checklist_type_departments",
                column: "department_id",
                message: "Department is mapped to checklist types."
            },

            {
                table: "nso_rule_departments",
                column: "department_id",
                message: "Department is mapped to NSO Rules."
            }

        ];

        const checkNext = (index) => {

            if (index >= checks.length) {

                Department.removeAssignedUsers(id, (removeErr) => {

                    if (removeErr) {

                        return res.status(500).json({
                            success: false,
                            message: "Unable to remove department users."
                        });

                    }

                    Department.deleteDepartment(id, (deleteErr) => {

                        if (deleteErr) {

                            console.error(deleteErr);

                            return res.status(500).json({
                                success: false,
                                message: "Unable to delete department."
                            });

                        }

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

                    });

                });

                return;
            }

            const check = checks[index];

            db.query(

                `SELECT COUNT(*) AS total FROM ${check.table} WHERE ${check.column} = ?`,

                [id],

                (err, rows) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: "Database error."

                        });

                    }

                    if (rows[0].total > 0) {

                        return res.status(400).json({

                            success: false,

                            message: check.message

                        });

                    }

                    checkNext(index + 1);

                }

            );

        };

        checkNext(0);

    });


};
// ======================================================
// EXPORT DEPARTMENTS
// ======================================================

exports.exportDepartments = (req, res) => {

    Department.exportDepartments(

        (err, results) => {

            if (err) {

                console.error("Export Departments Error:", err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to export departments."

                });

            }

            return res.status(200).json({

                success: true,

                count: results.length,

                data: results

            });

        }

    );

};// ======================================================
// BULK UPLOAD DEPARTMENTS
// ======================================================

exports.bulkUploadDepartments = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please upload an Excel file."

            });

        }

        // ======================================
        // Read Excel File
        // ======================================

        const workbook = XLSX.readFile(req.file.path);

        const sheetName = workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(sheet);

        if (!rows.length) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({

                success: false,

                message: "Excel file is empty."

            });

        }

        // ======================================
        // Prepare Data
        // ======================================

        const departments = rows.map((row) => ({

            department_name:
                row.department_name ||
                row.Department ||
                "",

            description:
                row.description ||
                row.Description ||
                "",

            status:
                row.status ||
                row.Status ||
                "Active"

        }));

        // Remove Empty Rows

        const validDepartments = departments.filter(

            (item) => item.department_name.trim() !== ""

        );

        if (!validDepartments.length) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({

                success: false,

                message: "No valid departments found."

            });

        }

        // ======================================
        // Insert Into Database
        // ======================================

        Department.bulkInsertDepartments(

            validDepartments,

            (err) => {

                fs.unlinkSync(req.file.path);

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: "Bulk upload failed.",

                        error: err.message

                    });

                }

                logActivity({

                    activity_type: "Department",

                    reference_id: 0,

                    title: "Bulk Upload",

                    description:
                        `${validDepartments.length} departments uploaded`,

                    module_name: "Departments",

                    status: "Closed",

                    priority: "Medium",

                    created_by: req.user.id,

                    assigned_to: null

                });

                return res.status(200).json({

                    success: true,

                    message:
                        `${validDepartments.length} departments uploaded successfully.`

                });

            }

        );

    } catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: "Bulk upload failed.",

            error: err.message

        });

    }

};// ======================================================
// DELETE ALL DEPARTMENTS
// ======================================================

exports.deleteAllDepartments = (req, res) => {

    const db = require("../config/db");

    // ======================================
    // REMOVE DEPENDENT RECORDS
    // ======================================

    db.query("DELETE FROM department_users", (err) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Unable to delete department users."
            });
        }

        db.query("DELETE FROM question_departments", (err) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    success: false,
                    message: "Unable to delete question mappings."
                });
            }

            db.query("DELETE FROM checklist_type_departments", (err) => {

                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        success: false,
                        message: "Unable to delete checklist mappings."
                    });
                }

                db.query("DELETE FROM nso_rule_departments", (err) => {

                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            success: false,
                            message: "Unable to delete NSO Rule mappings."
                        });
                    }

                    db.query(
                        "UPDATE users SET department_id = NULL, designation_id = NULL",
                        (err) => {

                            if (err) {
                                console.error(err);
                                return res.status(500).json({
                                    success: false,
                                    message: "Unable to update users."
                                });
                            }

                            db.query("DELETE FROM designations", (err) => {

                                if (err) {
                                    console.error(err);
                                    return res.status(500).json({
                                        success: false,
                                        message: "Unable to delete designations."
                                    });
                                }

                                Department.deleteAllDepartments((err) => {

                                    if (err) {
                                        console.error(err);
                                        return res.status(500).json({
                                            success: false,
                                            message: "Unable to delete all departments."
                                        });
                                    }

                                    logActivity({
                                        activity_type: "Department",
                                        reference_id: 0,
                                        title: "Delete All Departments",
                                        description: "All departments deleted.",
                                        module_name: "Departments",
                                        status: "Closed",
                                        priority: "High",
                                        created_by: req.user.id,
                                        assigned_to: null
                                    });

                                    return res.status(200).json({
                                        success: true,
                                        message: "All departments deleted successfully."
                                    });

                                });

                            });

                        }
                    );

                });

            });

        });

    });

};
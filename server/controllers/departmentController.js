const { readDeleteScope, sendFilteredResult } = require("../utils/deleteScope");
const Department = require("../models/departmentModel");

const { logActivity } = require("../utils/activityLogger");

const fs = require("fs");
const { runBulkUpload, call: bulkCall } = require("../utils/bulkUploadEngine");

// ======================================================
// BULK UPLOAD — COLUMN NAMES THIS MODULE UNDERSTANDS
// ======================================================
//
// Any of these header spellings (case/spacing-insensitive) map
// onto the canonical name on the left. Passed into
// utils/bulkFileParser.js so it also finds the real header row
// even if the sheet has a title/banner row above it, or a note
// row below the data — see that file for how detection works.
// ======================================================

const DEPARTMENT_COLUMN_ALIASES = {
    "Department Name": ["departmentname", "department", "dept", "name"],
    "Description": ["description", "desc", "details"],
    "Status": ["status", "active"],
    "Employee ID": ["employeeid", "empid", "employee id", "staffid"]
};

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

};

// ======================================================
// BULK UPLOAD DEPARTMENTS  (global bulk-upload engine)
// ======================================================
//
// Existing department (same name) -> updated; new name -> created.
// Every row on its own: a bad row is reported (row / column / value /
// reason) and the other rows are still saved. Extra columns are kept
// with the department (bulk_extra_data).
// ======================================================

exports.bulkUploadDepartments = (req, res) =>
    runBulkUpload({
        req,
        res,
        module: "departments",

        validateRow: async (row, ctx) => {
            const status = ctx.text("Status");
            if (status && !["active", "inactive"].includes(status.toLowerCase())) {
                ctx.fail("Status", status, "Status must be Active or Inactive.");
            }

            const employeeId = ctx.text("Employee ID");
            ctx.employee = null;
            if (employeeId) {
                const users = await bulkCall(Department.getUserByEmployeeId, employeeId);
                if (!users.length) {
                    ctx.fail("Employee ID", employeeId, "Employee does not exist.");
                } else {
                    ctx.employee = users[0];
                }
            }
        },

        duplicateKey: (row, ctx) => ({
            key: ctx.text("Department Name").toLowerCase(),
            column: "Department Name",
            value: ctx.text("Department Name")
        }),

        processRow: async (row, ctx) => {
            const department = {
                department_name: ctx.text("Department Name"),
                description: ctx.text("Description"),
                status: ctx.text("Status") ? (ctx.text("Status").toLowerCase() === "inactive" ? "Inactive" : "Active") : "Active"
            };

            const existing = await bulkCall(Department.checkDepartmentExists, department.department_name);
            let departmentId;
            let updated = false;

            if (existing.length) {
                departmentId = existing[0].id;
                await bulkCall(Department.updateDepartment, departmentId, department);
                updated = true;
            } else {
                const result = await bulkCall(Department.createDepartment, department);
                departmentId = result.insertId;
            }

            if (ctx.employee) {
                if (updated) await bulkCall(Department.removeAssignedUsers, departmentId);
                await bulkCall(Department.assignUsers, departmentId, [ctx.employee.id]);
            }

            return { id: departmentId, updated };
        },

        finalize: async (ctx) => {
            if (!ctx.report.uploaded) return;
            logActivity({
                activity_type: "Department",
                reference_id: 0,
                title: "Bulk Upload",
                description: `${ctx.report.created} department(s) created, ${ctx.report.updated} updated`,
                module_name: "Departments",
                status: "Closed",
                priority: "Medium",
                created_by: req.user.id,
                assigned_to: null
            });
        }
    });

// ======================================================
// DELETE ALL DEPARTMENTS
// ======================================================

exports.deleteAllDepartments = (req, res) => {

    const db = require("../config/db");

    // ======================================
    // FILTERED DELETE
    // Search / filters applied on the page -> the client sends the ids of
    // the matching departments. The same clean-up as Delete All runs, but
    // only for those departments.
    // ======================================

    const scope = readDeleteScope(req);

    if (scope.filtered) {
        const ids = scope.ids || [];
        if (!ids.length) {
            return sendFilteredResult(res, { deleted: 0, failed: [] }, "department(s)");
        }
        const marks = ids.map(() => "?").join(", ");
        (async () => {
            try {
                await db.query(`DELETE FROM department_users WHERE department_id IN (${marks})`, ids);
                await db.query(`DELETE FROM question_departments WHERE department_id IN (${marks})`, ids);
                await db.query(`DELETE FROM checklist_type_departments WHERE department_id IN (${marks})`, ids);
                await db.query(`DELETE FROM nso_rule_departments WHERE department_id IN (${marks})`, ids);
                await db.query(
                    `UPDATE users SET department_id = NULL, designation_id = NULL
                     WHERE department_id IN (${marks})
                        OR designation_id IN (SELECT id FROM (SELECT id FROM designations WHERE department_id IN (${marks})) d)`,
                    [...ids, ...ids]
                );
                await db.query(`DELETE FROM designations WHERE department_id IN (${marks})`, ids);
                const result = await db.query(`DELETE FROM departments WHERE id IN (${marks})`, ids);
                const deleted = Number(result?.affectedRows || 0);

                logActivity({
                    activity_type: "Department",
                    reference_id: 0,
                    title: "Delete Filtered Departments",
                    description: `${deleted} filtered department(s) deleted.`,
                    module_name: "Departments",
                    status: "Closed",
                    priority: "High",
                    created_by: req.user.id,
                    assigned_to: null
                });

                return sendFilteredResult(res, { deleted, failed: [] }, "department(s)");
            } catch (error) {
                console.error(error);
                return res.status(500).json({
                    success: false,
                    message: "Unable to delete the filtered departments."
                });
            }
        })();
        return;
    }

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
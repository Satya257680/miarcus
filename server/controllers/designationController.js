const { readDeleteScope } = require("../utils/deleteScope");
const designationModel = require("../models/designationModel");

const { logActivity } = require("../utils/activityLogger");
const { runBulkUpload, call: bulkCall, sql: bulkSql } = require("../utils/bulkUploadEngine");

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

};// ======================================================
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
// CHECK DUPLICATE DESIGNATION
// ======================================

designationModel.checkDuplicateForUpdate(

    id,

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
};
// ======================================================
// GET DESIGNATION BY ID
// ======================================================

exports.getDesignationById = (req, res) => {

    const { id } = req.params;

    designationModel.getDesignationById(

        id,

        (err, results) => {

            if (err) {

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch designation"

                });

            }

            if (results.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Designation not found"

                });

            }

            const designation = results[0];

            designationModel.getAssignedUsers(

                id,

                (err, users) => {

                    if (err) {

                        return res.status(500).json({

                            success: false,

                            message: "Failed to fetch assigned users"

                        });

                    }

                    designation.users = users.map(

                        u => u.user_id

                    );

                    return res.status(200).json({

                        success: true,

                        data: designation

                    });

                }

            );

        }

    );

};

// ======================================================
// GET ASSIGNED USERS
// ======================================================

exports.getAssignedUsers = (req, res) => {

    const { id } = req.params;

    designationModel.getAssignedUsers(

        id,

        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to fetch assigned employees."

                });

            }

            return res.status(200).json({

                success: true,

                users: results.map(

                    (row) => row.user_id

                )

            });

        }

    );

};

// ======================================================
// EXPORT DESIGNATIONS
// ======================================================

exports.exportDesignations = (req, res) => {
designationModel.exportDesignations(

        (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to export designations."

                });

            }

            return res.status(200).json({

                success: true,

                data: results

            });

        }

    );

};
// ======================================================
// DELETE ALL DESIGNATIONS
// ======================================================

exports.deleteAllDesignations = (req, res) => {

    // Search applied on the page -> only the matching ids are deleted.
    const scope = readDeleteScope(req);
    const ids = scope.filtered ? (scope.ids || []) : null;

    designationModel.deleteAllDesignations(

        ids,

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Failed to delete all designations.",

                    error: err.message

                });

            }

            logActivity({

                activity_type: "Designation",

                reference_id: 0,

                title: ids ? "Delete Filtered Designations" : "Delete All Designations",

                description: ids
                    ? `${Number(result?.affectedRows || 0)} filtered designation(s) were deleted.`
                    : "All designations were deleted.",

                module_name: "Designations",

                status: "Closed",

                priority: "High",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.status(200).json({

                success: true,

                message: ids
                    ? `${Number(result?.affectedRows || 0)} filtered designation(s) deleted successfully.`
                    : "All designations deleted successfully."

            });

        }

    );

};


// ======================================================
// BULK UPLOAD DESIGNATIONS  (global bulk-upload engine)
// ======================================================
//
// Any format (Excel / CSV / Word / PDF / photo). Each row on its own:
// unknown department, duplicates etc. are reported with the exact row,
// column, value and reason while every valid row is saved. Extra
// columns are kept with the designation (bulk_extra_data).
// ======================================================

exports.bulkUploadDesignations = (req, res) =>
    runBulkUpload({
        req,
        res,
        module: "designations",

        prepare: async (ctx) => {
            const departments = await bulkSql("SELECT id, department_name FROM departments");
            ctx.data.byName = new Map(departments.map((d) => [String(d.department_name || "").trim().toLowerCase(), d]));
            ctx.data.byId = new Map(departments.map((d) => [String(d.id), d]));
        },

        validateRow: async (row, ctx) => {
            const value = ctx.text("Department");
            const department =
                ctx.data.byName.get(value.toLowerCase()) ||
                (/^\d+$/.test(value) ? ctx.data.byId.get(value) : null);

            if (value && !department) {
                ctx.fail("Department", value, "Department does not exist. Create it in Departments first.");
                return;
            }

            ctx.department = department;

            const status = ctx.text("Status");
            if (status && !["active", "inactive"].includes(status.toLowerCase())) {
                ctx.fail("Status", status, "Status must be Active or Inactive.");
            }

            if (department) {
                const exists = await bulkCall(
                    designationModel.checkDesignationExists,
                    ctx.text("Designation Name"),
                    department.id
                );
                if (exists.length) {
                    ctx.duplicate(
                        "Designation Name",
                        ctx.text("Designation Name"),
                        `"${ctx.text("Designation Name")}" already exists in ${department.department_name}.`
                    );
                }
            }
        },

        duplicateKey: (row, ctx) => ({
            key: `${ctx.department?.id}|${ctx.text("Designation Name").toLowerCase()}`,
            column: "Designation Name",
            value: ctx.text("Designation Name")
        }),

        processRow: async (row, ctx) => {
            const result = await bulkCall(designationModel.createDesignation, {
                department_id: ctx.department.id,
                designation_name: ctx.text("Designation Name"),
                description: ctx.text("Description"),
                status: ctx.text("Status").toLowerCase() === "inactive" ? "Inactive" : "Active"
            });
            return { id: result.insertId };
        },

        finalize: async (ctx) => {
            if (!ctx.report.uploaded) return;
            logActivity({
                activity_type: "Designation",
                reference_id: 0,
                title: "Bulk Upload",
                description: `${ctx.report.uploaded} designations uploaded`,
                module_name: "Designations",
                status: "Closed",
                priority: "Medium",
                created_by: req.user.id,
                assigned_to: null
            });
        }
    });

// ======================================================
// DOWNLOAD SAMPLE FILE
// ======================================================

exports.downloadSampleFile = (req, res) => {

    const path = require("path");

    const filePath = path.join(
        __dirname,
        "../sample-files/designation_sample.xlsx"
    );

    return res.download(filePath);

};
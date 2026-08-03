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

    designationModel.deleteAllDesignations(

        (err) => {

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

                title: "Delete All Designations",

                description: "All designations were deleted.",

                module_name: "Designations",

                status: "Closed",

                priority: "High",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.status(200).json({

                success: true,

                message: "All designations deleted successfully."

            });

        }

    );

};


// ======================================================
// BULK UPLOAD DESIGNATIONS
// ======================================================

exports.bulkUploadDesignations = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "Please upload an Excel or CSV file."
            });

        }

        const XLSX = require("xlsx");
        const fs = require("fs");

        const workbook = XLSX.readFile(req.file.path);

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(sheet);

       // ======================================
// Get Department ID from Department Name
// ======================================


        console.log("Excel Data:", rows);

        fs.unlinkSync(req.file.path);

        if (rows.length === 0) {

            return res.status(400).json({
                success: false,
                message: "Excel file is empty."
            });

        }

        const newRows = [];

        let skipped = 0;

       for (const row of rows) {

    let department_id =
        row.department_id ??
        row.Department_ID ??
        row["Department ID"];

    if (!department_id && row.department_name) {

        const department = await new Promise((resolve, reject) => {

            designationModel.getDepartmentByName(

                row.department_name.trim(),

                (err, result) => {

                    if (err) return reject(err);

                    resolve(result);

                }

            );

        });

        if (department.length > 0) {
            department_id = department[0].id;
        }

    }
            const designation_name =
                (
                    row.designation_name ??
                    row.Designation ??
                    row["Designation Name"]
                )?.trim();

            const description =
                row.description ??
                row.Description ??
                "";

            const status =
                row.status ??
                row.Status ??
                "Active";

            if (!department_id || !designation_name) {

                skipped++;
                continue;

            }

            const exists = await new Promise((resolve, reject) => {

                designationModel.checkDesignationExists(

                    designation_name,

                    department_id,

                    (err, result) => {

                        if (err) return reject(err);

                        resolve(result);

                    }

                );

            });

            if (exists.length > 0) {

                skipped++;
                continue;

            }

            newRows.push({

                department_id,

                designation_name,

                description,

                status

            });

        }

        if (newRows.length === 0) {

            return res.status(400).json({

                success: false,

                message: "No valid new designations found."

            });

        }

        designationModel.bulkInsertDesignations(

            newRows,

            (err) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        success: false,

                        message: "Bulk upload failed."

                    });

                }

                logActivity({

                    activity_type: "Designation",

                    reference_id: 0,

                    title: "Bulk Upload",

                    description: `${newRows.length} designations uploaded`,

                    module_name: "Designations",

                    status: "Closed",

                    priority: "Medium",

                    created_by: req.user.id,

                    assigned_to: null

                });

                return res.status(200).json({

                    success: true,

                    message: `${newRows.length} designation(s) uploaded successfully. ${skipped} row(s) skipped.`

                });

            }

        );

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

};
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
const ChecklistType = require("../models/checklistTypeModel");
const ExcelJS = require("exceljs");
const db = require("../config/db");

const { logActivity } = require("../utils/activityLogger");

// ======================================================
// GET ALL CHECKLIST TYPES
// ======================================================

exports.getChecklistTypes = (req, res) => {

    ChecklistType.getAllChecklistTypes(

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            return res.status(200).json({

                success: true,

                count: rows.length,

                data: rows

            });

        }

    );

};
// ======================================================
// GET CHECKLIST TYPE BY ID
// ======================================================

exports.getChecklistTypeById = (req, res) => {

    const { id } = req.params;

    ChecklistType.getChecklistTypeById(

        id,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Checklist Type not found"

                });

            }

            const checklist = rows[0];

            checklist.departments =

                checklist.department_ids

                    ? checklist.department_ids

                          .split(",")

                          .map(Number)

                    : [];

            checklist.users =

                checklist.user_ids

                    ? checklist.user_ids

                          .split(",")

                          .map(Number)

                    : [];

            return res.status(200).json({

                success: true,

                data: checklist

            });

        }

    );

};
// ======================================================
// CREATE CHECKLIST TYPE
// ======================================================

exports.createChecklistType = (req, res) => {

    let {

        checklist_name,

        allow_past_submission,

        cutoff_time,

        status,

        departments = [],

        users = []

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    checklist_name = checklist_name?.trim();

    if (!checklist_name) {

        return res.status(400).json({

            success: false,

            message: "Checklist Name is required."

        });

    }

    status = status || "Active";

    // ======================================
    // CREATE CHECKLIST TYPE
    // ======================================

    ChecklistType.createChecklistType(

        {

            checklist_name,

            allow_past_submission,

            cutoff_time,

            status

        },
                (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            const checklistId = result.insertId;

            // ======================================
            // SAVE DEPARTMENTS
            // ======================================

            ChecklistType.saveDepartments(

                checklistId,

                departments,

                (deptErr) => {

                    if (deptErr) {

                        console.error(deptErr);

                        return res.status(500).json({

                            success: false,

                            message: deptErr.message

                        });

                    }

                    // ======================================
                    // SAVE USERS
                    // ======================================

                    ChecklistType.saveUsers(

                        checklistId,

                        users,

                        (userErr) => {

                            if (userErr) {

                                console.error(userErr);

                                return res.status(500).json({

                                    success: false,

                                    message: userErr.message

                                });

                            }

                            // ======================================
                            // LOG ACTIVITY
                            // ======================================

                            logActivity({

                                activity_type: "Checklist Type",

                                reference_id: checklistId,

                                title: "Checklist Type Created",

                                description: `${checklist_name} checklist type was created`,

                                module_name: "Checklist Types",

                                status: "Open",

                                priority: "Medium",

                                created_by: req.user.id,

                                assigned_to: null

                            });

                            return res.status(201).json({

                                success: true,

                                message: "Checklist Type created successfully.",

                                id: checklistId

                            });

                        }

                    );

                }

            );

        }

    );

};
// ======================================================
// UPDATE CHECKLIST TYPE
// ======================================================

exports.updateChecklistType = (req, res) => {

    const { id } = req.params;

    let {

        checklist_name,

        allow_past_submission,

        cutoff_time,

        status,

        departments = [],

        users = []

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    checklist_name = checklist_name?.trim();

    if (!checklist_name) {

        return res.status(400).json({

            success: false,

            message: "Checklist Name is required."

        });

    }

    status = status || "Active";

    // ======================================
    // UPDATE CHECKLIST TYPE
    // ======================================

    ChecklistType.updateChecklistType(

        id,

        {

            checklist_name,

            allow_past_submission,

            cutoff_time,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // DELETE OLD DEPARTMENTS
            // ======================================

            ChecklistType.deleteDepartments(

                id,

                (deptDeleteErr) => {

                    if (deptDeleteErr) {

                        console.error(deptDeleteErr);

                        return res.status(500).json({

                            success: false,

                            message: deptDeleteErr.message

                        });

                    }

                    // ======================================
                    // SAVE NEW DEPARTMENTS
                    // ======================================

                    ChecklistType.saveDepartments(

                        id,

                        departments,

                        (deptSaveErr) => {

                            if (deptSaveErr) {

                                console.error(deptSaveErr);

                                return res.status(500).json({

                                    success: false,

                                    message: deptSaveErr.message

                                });

                            }

                            // ======================================
                            // DELETE OLD USERS
                            // ======================================

                            ChecklistType.deleteUsers(

                                id,

                                (userDeleteErr) => {

                                    if (userDeleteErr) {

                                        console.error(userDeleteErr);

                                        return res.status(500).json({

                                            success: false,

                                            message: userDeleteErr.message

                                        });

                                    }

                                    // ======================================
                                    // SAVE NEW USERS
                                    // ======================================

                                    ChecklistType.saveUsers(

                                        id,

                                        users,

                                        (userSaveErr) => {

                                            if (userSaveErr) {

                                                console.error(userSaveErr);

                                                return res.status(500).json({

                                                    success: false,

                                                    message: userSaveErr.message

                                                });

                                            }

                                            // ======================================
                                            // LOG ACTIVITY
                                            // ======================================

                                            logActivity({

                                                activity_type: "Checklist Type",

                                                reference_id: id,

                                                title: "Checklist Type Updated",

                                                description: `${checklist_name} checklist type was updated`,

                                                module_name: "Checklist Types",

                                                status: "Open",

                                                priority: "Medium",

                                                created_by: req.user.id,

                                                assigned_to: null

                                            });

                                            return res.status(200).json({

                                                success: true,

                                                message: "Checklist Type updated successfully."

                                            });

                                        }

                                    );

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
// DELETE CHECKLIST TYPE
// ======================================================

exports.deleteChecklistType = (req, res) => {

    const { id } = req.params;

    // ======================================
    // GET CHECKLIST TYPE DETAILS
    // ======================================

    ChecklistType.getChecklistTypeById(

        id,

        (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Checklist Type not found."

                });

            }

            const checklist = rows[0];

            // ======================================
            // DELETE DEPARTMENTS
            // ======================================

            ChecklistType.deleteDepartments(

                id,

                (deptDeleteErr) => {

                    if (deptDeleteErr) {

                        console.error(deptDeleteErr);

                        return res.status(500).json({

                            success: false,

                            message: deptDeleteErr.message

                        });

                    }

                    // ======================================
                    // DELETE USERS
                    // ======================================

                    ChecklistType.deleteUsers(

                        id,

                        (userDeleteErr) => {

                            if (userDeleteErr) {

                                console.error(userDeleteErr);

                                return res.status(500).json({

                                    success: false,

                                    message: userDeleteErr.message

                                });

                            }

                            // ======================================
                            // DELETE CHECKLIST TYPE
                            // ======================================

                            ChecklistType.deleteChecklistType(

                                id,

                                (deleteErr) => {

                                    if (deleteErr) {

                                        console.error(deleteErr);

                                        return res.status(500).json({

                                            success: false,

                                            message: deleteErr.message

                                        });

                                    }

                                    // ======================================
                                    // LOG ACTIVITY
                                    // ======================================

                                    logActivity({

                                        activity_type: "Checklist Type",

                                        reference_id: id,

                                        title: "Checklist Type Deleted",

                                        description: `${checklist.checklist_name} checklist type was deleted`,

                                        module_name: "Checklist Types",

                                        status: "Closed",

                                        priority: "High",

                                        created_by: req.user.id,

                                        assigned_to: null

                                    });

                                    return res.status(200).json({

                                        success: true,

                                        message: "Checklist Type deleted successfully."

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
// DELETE ALL CHECKLIST TYPES
// ======================================================

exports.deleteAllChecklistTypes = (req, res) => {

    ChecklistType.deleteAllChecklistTypes(

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Checklist Type",

                reference_id: 0,

                title: "All Checklist Types Deleted",

                description: "All Checklist Types were deleted from the Checklist Types module",

                module_name: "Checklist Types",

                status: "Closed",

                priority: "High",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.status(200).json({

                success: true,

                message: "All Checklist Types deleted successfully."

            });

        }

    );

};
// ======================================================
// EXPORT CHECKLIST TYPES
// ======================================================

exports.exportChecklistTypes = (req, res) => {

    ChecklistType.getChecklistTypesForExport(

        async (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }

            const workbook = new ExcelJS.Workbook();

            const worksheet = workbook.addWorksheet(

                "Checklist Types"

            );

            worksheet.columns = [

                {

                    header: "Checklist Name",

                    key: "checklist_name",

                    width: 30

                },

                {

                    header: "Departments",

                    key: "departments",

                    width: 30

                },

                {

                    header: "Allow Past Submission",

                    key: "allow_past_submission",

                    width: 22

                },

                {

                    header: "Cutoff Time",

                    key: "cutoff_time",

                    width: 20

                },

                {

                    header: "Status",

                    key: "status",

                    width: 15

                }

            ];

            rows.forEach(

                (row) => {

                    worksheet.addRow({

                        checklist_name: row.checklist_name,

                        departments: row.departments || "",

                        allow_past_submission:

                            row.allow_past_submission

                                ? "Yes"

                                : "No",

                        cutoff_time:

                            row.cutoff_time || "",

                        status: row.status

                    });

                }

            );

            res.setHeader(

                "Content-Type",

                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

            );

            res.setHeader(

                "Content-Disposition",

                'attachment; filename="ChecklistTypes.xlsx"'

            );

            await workbook.xlsx.write(

                res

            );

            res.end();

        }

    );

};

// ======================================================
// IMPORT CHECKLIST TYPES
// ======================================================

exports.importChecklistTypes = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please upload an Excel file."

            });

        }

        const workbook = new ExcelJS.Workbook();

        // ======================================
        // LOAD EXCEL FROM MEMORY BUFFER
        // ======================================

        await workbook.xlsx.load(

            req.file.buffer

        );

        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {

            return res.status(400).json({

                success: false,

                message: "Worksheet not found."

            });

        }

        let imported = 0;

        for (

            let i = 2;

            i <= worksheet.rowCount;

            i++

        ) {

            const row = worksheet.getRow(i);

            const checklist_name =

                row.getCell(1).text.trim();

            const allow_past_submission =

                row.getCell(3).text.trim().toLowerCase() === "yes"

                    ? 1

                    : 0;

            const cutoff_time =

                row.getCell(4).text.trim() || null;

            const status =

                row.getCell(5).text.trim() || "Active";

            if (!checklist_name) {

                continue;

            }

            await new Promise(

                (resolve, reject) => {

                    db.query(

                        `

                        INSERT INTO checklist_types
                        (

                            checklist_name,

                            allow_past_submission,

                            cutoff_time,

                            status

                        )

                        VALUES (?, ?, ?, ?)

                        `,

                        [

                            checklist_name,

                            allow_past_submission,

                            cutoff_time,

                            status

                        ],

                        (err) => {

                            if (err) {

                                return reject(err);

                            }

                            imported++;

                            resolve();

                        }

                    );

                }

            );

        }

        // ======================================
        // LOG ACTIVITY
        // ======================================

        logActivity({

            activity_type: "Checklist Type",

            reference_id: 0,

            title: "Checklist Types Imported",

            description: `${imported} checklist types were imported`,

            module_name: "Checklist Types",

            status: "Completed",

            priority: "Medium",

            created_by: req.user.id,

            assigned_to: null

        });

        return res.status(200).json({

            success: true,

            message: `${imported} Checklist Types imported successfully.`

        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

};
// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

exports.getChecklistTypes = exports.getChecklistTypes;

exports.getChecklistTypeById = exports.getChecklistTypeById;

exports.createChecklistType = exports.createChecklistType;

exports.updateChecklistType = exports.updateChecklistType;

exports.deleteChecklistType = exports.deleteChecklistType;

exports.deleteAllChecklistTypes = exports.deleteAllChecklistTypes;

exports.exportChecklistTypes = exports.exportChecklistTypes;

exports.importChecklistTypes = exports.importChecklistTypes;
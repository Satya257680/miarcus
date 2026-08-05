const ChecklistType = require("../models/checklistTypeModel");
const ExcelJS = require("exceljs");
const db = require("../config/db");

const { logActivity } = require("../utils/activityLogger");

const XLSX = require("xlsx");
const csv = require("csv-parser");
const { Readable } = require("stream");
const path = require("path");

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
// BULK UPLOAD CHECKLIST TYPES
// CSV + XLSX + XLS
// ======================================================

exports.bulkUploadChecklistTypes = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please upload a CSV or Excel file."

            });

        }

        const extension = path
            .extname(req.file.originalname)
            .toLowerCase();

        let rows = [];

        // ======================================
        // CSV
        // ======================================

        if (extension === ".csv") {

            rows = await new Promise((resolve, reject) => {

                const result = [];

                Readable.from(req.file.buffer)

                    .pipe(csv())

                    .on("data", row => result.push(row))

                    .on("end", () => resolve(result))

                    .on("error", reject);

            });

        }

        // ======================================
        // XLS / XLSX
        // ======================================

        else {

            const workbook = XLSX.read(

                req.file.buffer,

                {

                    type: "buffer"

                }

            );

            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            rows = XLSX.utils.sheet_to_json(sheet);

        }

        if (!rows.length) {

            return res.status(400).json({

                success: false,

                message: "No data found."

            });

        }

        let imported = 0;

        for (const row of rows) {

            const checklist_name =

                row["Checklist Name"] ||

                row.checklist_name;

            if (!checklist_name) {

                continue;

            }

            const allow_past_submission =

                String(

                    row["Allow Past Submission"] ||

                    row.allow_past_submission ||

                    ""

                ).toLowerCase() === "yes"

                    ? 1

                    : 0;

            const cutoff_time =

                row["Cutoff Time"] ||

                row.cutoff_time ||

                null;

            const status =

                row.Status ||

                row.status ||

                "Active";

            // ======================================
            // INSERT CHECKLIST TYPE
            // ======================================

            const result = await new Promise(

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

                        (err, result) => {

                            if (err) {

                                return reject(err);

                            }

                            resolve(result);

                        }

                    );

                }

            );

            const checklistTypeId = result.insertId;

            imported++;

            // ======================================
            // SAVE DEPARTMENTS
            // ======================================

            const departments =

                row.Departments ||

                row.departments ||

                "";

            if (departments) {

                const departmentNames =

                    departments

                        .split(",")

                        .map(

                            d => d.trim()

                        );

                for (const departmentName of departmentNames) {

                    const department = await new Promise(

                        (resolve) => {

                            db.query(

                                `

                                SELECT id

                                FROM departments

                                WHERE department_name = ?

                                `,

                                [

                                    departmentName

                                ],

                                (err, rows) => {

                                    if (

                                        err ||

                                        rows.length === 0

                                    ) {

                                        return resolve(null);

                                    }

                                    resolve(rows[0]);

                                }

                            );

                        }

                    );

                    if (department) {

                        await new Promise(

                            (resolve, reject) => {

                                db.query(

                                    `

                                  INSERT INTO checklist_type_departments
(
    checklist_type_id,
    department_id
)
VALUES (?, ?)

                                    `,

                                    [

                                        checklistTypeId,

                                        department.id

                                    ],

                                    (err) => {

                                        if (err) {

                                            return reject(err);

                                        }

                                        resolve();

                                    }

                                );

                            }

                        );

                    }

                }

            }

        }

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

            message: `${imported} Checklist Types uploaded successfully.`

        });

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
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

exports.getChecklistTypes = exports.getChecklistTypes;

exports.getChecklistTypeById = exports.getChecklistTypeById;

exports.createChecklistType = exports.createChecklistType;

exports.updateChecklistType = exports.updateChecklistType;

exports.deleteChecklistType = exports.deleteChecklistType;

exports.deleteAllChecklistTypes = exports.deleteAllChecklistTypes;

exports.exportChecklistTypes = exports.exportChecklistTypes;

exports.bulkUploadChecklistTypes = exports.bulkUploadChecklistTypes;
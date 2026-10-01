const { readDeleteScope, eachId, cbToPromise, sendFilteredResult } = require("../utils/deleteScope");
const ChecklistType = require("../models/checklistTypeModel");
const ExcelJS = require("exceljs");
const db = require("../config/db");

const { logActivity } = require("../utils/activityLogger");
const { runBulkUpload, call: bulkCall, sql: bulkSql, isEmail, parseYesNo } = require("../utils/bulkUploadEngine");


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

exports.deleteAllChecklistTypes = async (req, res) => {

    // Filters applied on the page -> the client sends the ids of the
    // matching Checklist Types and only those are deleted.
    const scope = readDeleteScope(req);

    if (scope.filtered) {
        try {
            const result = await eachId(scope.ids || [], async (id) => {
                await cbToPromise(ChecklistType.deleteDepartments, id);
                await cbToPromise(ChecklistType.deleteUsers, id);
                await cbToPromise(ChecklistType.deleteChecklistType, id);
            });

            logActivity({
                activity_type: "Checklist Type",
                reference_id: 0,
                title: "Filtered Checklist Types Deleted",
                description: `${result.deleted} filtered Checklist Type(s) deleted from the Checklist Types module`,
                module_name: "Checklist Types",
                status: "Closed",
                priority: "High",
                created_by: req.user.id,
                assigned_to: null
            });

            return sendFilteredResult(res, result, "Checklist Type(s)");
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

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
// BULK UPLOAD CHECKLIST TYPES  (global bulk-upload engine)
// ======================================================

exports.bulkUploadChecklistTypes = (req, res) =>
    runBulkUpload({
        req,
        res,
        module: "checklist-types",

        prepare: async (ctx) => {
            const [departments, types] = await Promise.all([
                bulkSql("SELECT id, department_name FROM departments"),
                bulkSql("SELECT LOWER(TRIM(checklist_name)) AS n FROM checklist_types")
            ]);
            ctx.data.departments = new Map(departments.map((d) => [String(d.department_name || "").trim().toLowerCase(), d.id]));
            ctx.data.names = new Set(types.map((t) => t.n));
        },

        validateRow: (row, ctx) => {
            const name = ctx.text("Checklist Name");
            if (name && ctx.data.names.has(name.toLowerCase())) {
                ctx.duplicate("Checklist Name", name, `Checklist Type "${name}" already exists in the database.`);
            }

            const past = ctx.cell("Allow Past Submission");
            if (parseYesNo(past, false) === null) {
                ctx.fail("Allow Past Submission", past, "Allow Past Submission must be Yes or No.");
            }

            const cutoff = ctx.text("Cutoff Time");
            if (cutoff && !/^\d{1,2}:\d{2}(:\d{2})?(\s*(am|pm))?$/i.test(cutoff) && !/^0?\.\d+$/.test(cutoff)) {
                ctx.fail("Cutoff Time", cutoff, "Cutoff Time must look like 11:00 or 11:00 AM.");
            }

            const departments = ctx.text("Departments");
            ctx.departmentIds = [];
            if (departments) {
                departments.split(/[,;|]/).map((d) => d.trim()).filter(Boolean).forEach((name) => {
                    const id = ctx.data.departments.get(name.toLowerCase());
                    if (id) ctx.departmentIds.push(id);
                    else ctx.fail("Departments", name, `Department "${name}" does not exist.`);
                });
            }
        },

        duplicateKey: (row, ctx) => ({
            key: ctx.text("Checklist Name").toLowerCase(),
            column: "Checklist Name",
            value: ctx.text("Checklist Name")
        }),

        processRow: async (row, ctx) => {
            let cutoff = ctx.cell("Cutoff Time");
            if (typeof cutoff === "number" && cutoff < 1) {
                // Excel time fraction -> HH:MM
                const minutes = Math.round(cutoff * 24 * 60);
                cutoff = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
            } else {
                cutoff = ctx.text("Cutoff Time") || null;
                const ampm = cutoff && cutoff.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/i);
                if (ampm) {
                    let h = Number(ampm[1]) % 12;
                    if (ampm[3].toLowerCase() === "pm") h += 12;
                    cutoff = `${String(h).padStart(2, "0")}:${ampm[2]}`;
                }
            }

            const result = await bulkSql(
                `INSERT INTO checklist_types (checklist_name, allow_past_submission, cutoff_time, status) VALUES (?, ?, ?, ?)`,
                [
                    ctx.text("Checklist Name"),
                    parseYesNo(ctx.cell("Allow Past Submission"), false) ? 1 : 0,
                    cutoff,
                    ctx.text("Status").toLowerCase() === "inactive" ? "Inactive" : "Active"
                ]
            );

            for (const departmentId of [...new Set(ctx.departmentIds)]) {
                await bulkSql(
                    "INSERT INTO checklist_type_departments (checklist_type_id, department_id) VALUES (?, ?)",
                    [result.insertId, departmentId]
                );
            }

            return { id: result.insertId };
        },

        finalize: async (ctx) => {
            if (!ctx.report.uploaded) return;
            logActivity({
                activity_type: "Checklist Type",
                reference_id: 0,
                title: "Checklist Types Imported",
                description: `${ctx.report.uploaded} checklist types were imported`,
                module_name: "Checklist Types",
                status: "Completed",
                priority: "Medium",
                created_by: req.user.id,
                assigned_to: null
            });
        }
    });

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
const fs = require("fs");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");

const Report = require("../models/reportsToModel");
const { logActivity } = require("../utils/activityLogger");
const { runBulkUpload, call: bulkCall, sql: bulkSql } = require("../utils/bulkUploadEngine");

// ======================================================
// GET ALL REPORTS TO
// ======================================================

const getReports = (req, res) => {

    Report.getAllReports(

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            return res.json({

                success: true,

                reports: result

            });

        }

    );

};
// ======================================================
// ADD REPORT
// ======================================================

const createReport = (req, res) => {

    const {

        manager_name,

        department,

        designation,

        status

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if (

        !manager_name ||

        !manager_name.trim()

    ) {

        return res.status(400).json({

            success: false,

            message: "Manager Name is required."

        });

    }

    Report.addReport(

        {

            manager_name: manager_name.trim(),

            department,

            designation,

            status: status || "Active"

        },

        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Unable to add manager"

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Reports To",

                reference_id: result.insertId,

                title: "Manager Added",

                description: `${manager_name} was added to Reports To`,

                module_name: "Reports To",

                status: "Open",

                priority: "Medium",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.status(201).json({

                success: true,

                message: "Manager Added Successfully",

                id: result.insertId

            });

        }

    );

};
// ======================================================
// BULK UPLOAD REPORTS TO  (global bulk-upload engine)
// ======================================================

const bulkUploadReports = (req, res) =>
    runBulkUpload({
        req,
        res,
        module: "reports-to",

        validateRow: async (row, ctx) => {
            const status = ctx.text("Status");
            if (status && !["active", "inactive"].includes(status.toLowerCase())) {
                ctx.fail("Status", status, "Status must be Active or Inactive.");
            }

            const existing = await bulkSql(
                "SELECT id FROM reports_to WHERE LOWER(TRIM(manager_name)) = LOWER(TRIM(?)) AND LOWER(TRIM(COALESCE(department,''))) = LOWER(TRIM(?)) LIMIT 1",
                [ctx.text("Manager Name"), ctx.text("Department")]
            );
            if (existing.length) {
                ctx.duplicate("Manager Name", ctx.text("Manager Name"), `${ctx.text("Manager Name")} already exists${ctx.text("Department") ? ` in ${ctx.text("Department")}` : ""}.`);
            }
        },

        duplicateKey: (row, ctx) => ({
            key: `${ctx.text("Manager Name").toLowerCase()}|${ctx.text("Department").toLowerCase()}`,
            column: "Manager Name",
            value: ctx.text("Manager Name")
        }),

        processRow: async (row, ctx) => {
            const result = await bulkCall(Report.addReport, {
                manager_name: ctx.text("Manager Name"),
                department: ctx.text("Department"),
                designation: ctx.text("Designation"),
                status: ctx.text("Status").toLowerCase() === "inactive" ? "Inactive" : "Active"
            });
            return { id: result.insertId };
        },

        finalize: async (ctx) => {
            if (!ctx.report.uploaded) return;
            logActivity({
                activity_type: "Reports To",
                reference_id: 0,
                title: "Managers Imported",
                description: `${ctx.report.uploaded} managers imported`,
                module_name: "Reports To",
                status: "Closed",
                priority: "Medium",
                created_by: req.user.id,
                assigned_to: null
            });
        }
    });

// ======================================================
// UPDATE REPORT
// ======================================================

const editReport = (req, res) => {

    const id = req.params.id;

    const {

        manager_name,

        department,

        designation,

        status

    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if (

        !manager_name ||

        !manager_name.trim()

    ) {

        return res.status(400).json({

            success: false,

            message: "Manager Name is required."

        });

    }

    // ======================================
    // UPDATE REPORT
    // ======================================

    Report.updateReport(

        id,

        {

            manager_name: manager_name.trim(),

            department,

            designation,

            status

        },

        (err) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Update Failed"

                });

            }

            // ======================================
            // LOG ACTIVITY
            // ======================================

            logActivity({

                activity_type: "Reports To",

                reference_id: id,

                title: "Manager Updated",

                description: `${manager_name} was updated in Reports To`,

                module_name: "Reports To",

                status: "Open",

                priority: "Medium",

                created_by: req.user.id,

                assigned_to: null

            });

            return res.json({

                success: true,

                message: "Manager Updated Successfully"

            });

        }

    );

};
// ======================================================
// DELETE REPORT
// ======================================================

const removeReport = (req, res) => {

    const id = req.params.id;

    // ======================================
    // GET REPORT DETAILS
    // ======================================

    Report.getAllReports(

        (err, reports) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            const report = reports.find(

                (item) => item.id == id

            );

            if (!report) {

                return res.status(404).json({

                    success: false,

                    message: "Manager not found"

                });

            }

            // ======================================
            // DELETE REPORT
            // ======================================

            Report.deleteReport(

                id,

                (err) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({

                            success: false,

                            message: "Delete Failed"

                        });

                    }

                    // ======================================
                    // LOG ACTIVITY
                    // ======================================

                    logActivity({

                        activity_type: "Reports To",

                        reference_id: id,

                        title: "Manager Deleted",

                        description: `${report.manager_name} was removed from Reports To`,

                        module_name: "Reports To",

                        status: "Closed",

                        priority: "High",

                        created_by: req.user.id,

                        assigned_to: null

                    });

                    return res.json({

                        success: true,

                        message: "Manager Deleted Successfully"

                    });

                }

            );

        }

    );

};
// ======================================================
// EXPORT REPORTS TO (XLSX)
// ======================================================

const exportReports = (req, res) => {

    Report.getAllReports(

        async (err, rows) => {

            if (err) {

                console.error(err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error"

                });

            }

            try {

                const workbook = new ExcelJS.Workbook();

                const worksheet = workbook.addWorksheet(

                    "Reports To"

                );

                worksheet.columns = [

                    {

                        header: "Manager Name",

                        key: "manager_name",

                        width: 30

                    },

                    {

                        header: "Department",

                        key: "department",

                        width: 25

                    },

                    {

                        header: "Designation",

                        key: "designation",

                        width: 25

                    },

                    {

                        header: "Status",

                        key: "status",

                        width: 15

                    }

                ];

                (rows || []).forEach(

                    (row) => {

                        worksheet.addRow({

                            manager_name: row.manager_name || "",

                            department: row.department || "",

                            designation: row.designation || "",

                            status: row.status || ""

                        });

                    }

                );

                res.setHeader(

                    "Content-Type",

                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

                );

                res.setHeader(

                    "Content-Disposition",

                    'attachment; filename="ReportsTo.xlsx"'

                );

                await workbook.xlsx.write(

                    res

                );

                res.end();

            } catch (exportErr) {

                console.error(exportErr);

                return res.status(500).json({

                    success: false,

                    message: "Export Failed"

                });

            }

        }

    );

};

// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

module.exports = {

    getReports,

    createReport,

    bulkUploadReports,

    editReport,

    removeReport,

    exportReports

};
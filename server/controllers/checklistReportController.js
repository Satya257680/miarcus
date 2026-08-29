const { Parser } = require("json2csv");
const XLSX = require("xlsx");

const ChecklistReport = require("../models/checklistReportModel");
const Activity = require("../models/activityModel");
const Audit = require("../models/auditModel");

// ======================================================
// CHECKLIST REPORT CONTROLLER
//
// A report row represents one checklist answer that is
// currently reportable:
//   - no Action Point was raised, OR
//   - the related Action Point has been completed/closed.
//
// Open Action Points stay in Action Points and are not
// duplicated in Checklist Reports until they are closed.
// ======================================================

const getFilters = (req) => ({
    search: req.query.search || "",
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    store_id: req.query.store_id || null,
    checklist_type_id: req.query.checklist_type_id || null,
    new_store_opening_id: req.query.new_store_opening_id || null,
    employee_id: req.query.employee_id || null,
    from_date: req.query.from_date || null,
    to_date: req.query.to_date || null,
});

// ======================================================
// GET ALL REPORT ROWS
// GET /api/checklist-reports
// ======================================================
exports.getAllReports = (req, res) => {
    const filters = getFilters(req);

    ChecklistReport.getAll(filters, (err, rows) => {
        if (err) {
            console.error("GET CHECKLIST REPORTS ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch Checklist Reports.",
                error: err.message,
            });
        }

        ChecklistReport.countAll(filters, (countErr, countRows) => {
            if (countErr) {
                console.error("CHECKLIST REPORT COUNT ERROR:", countErr);
                return res.status(500).json({
                    success: false,
                    message: "Unable to count Checklist Reports.",
                    error: countErr.message,
                });
            }

            const total = Number(countRows?.[0]?.total || 0);
            const limit = Math.max(Number(filters.limit) || 10, 1);
            const page = Math.max(Number(filters.page) || 1, 1);

            return res.status(200).json({
                success: true,
                data: Array.isArray(rows) ? rows : [],
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        });
    });
};

// ======================================================
// GET ONE REPORT/SUBMISSION
// GET /api/checklist-reports/:id
// ======================================================
exports.getReportById = (req, res) => {
    ChecklistReport.getById(req.params.id, (err, rows) => {
        if (err) {
            console.error("GET CHECKLIST REPORT ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to load Checklist Report.",
                error: err.message,
            });
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Checklist Report not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0],
        });
    });
};

// ======================================================
// UPDATE REPORT
// PUT /api/checklist-reports/:id
// ======================================================
exports.updateReport = (req, res) => {
    const { status, answer, remarks } = req.body || {};

    ChecklistReport.update(
        req.params.id,
        {
            status: status || "Completed",
            answer,
            remarks,
        },
        (err) => {
            if (err) {
                console.error("UPDATE CHECKLIST REPORT ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Unable to update Checklist Report.",
                    error: err.message,
                });
            }

            Audit.create({
                module_name: "Checklist Reports",
                reference_id: req.params.id,
                action: "UPDATE",
                old_data: null,
                new_data: { status, answer, remarks },
                changed_by: req.user.id,
            }, () => {});

            return res.status(200).json({
                success: true,
                message: "Checklist Report updated successfully.",
            });
        }
    );
};

// ======================================================
// DELETE ONE REPORT/SUBMISSION
// DELETE /api/checklist-reports/:id
// ======================================================
exports.deleteReport = (req, res) => {
    ChecklistReport.delete(req.params.id, (err, result) => {
        if (err) {
            console.error("DELETE CHECKLIST REPORT ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to delete Checklist Report.",
                error: err.message,
            });
        }

        Audit.create({
            module_name: "Checklist Reports",
            reference_id: req.params.id,
            action: "DELETE",
            old_data: null,
            new_data: null,
            changed_by: req.user.id,
        }, () => {});

        return res.status(200).json({
            success: true,
            message: "Checklist Report deleted successfully.",
            affectedRows: result?.affectedRows || 0,
        });
    });
};

// ======================================================
// DELETE ALL REPORTS
// DELETE /api/checklist-reports/all
//
// Only submissions with no open Action Point are removed.
// Active Action Points are preserved.
// ======================================================
exports.deleteAllReports = (req, res) => {
    ChecklistReport.deleteAll((err, result) => {
        if (err) {
            console.error("DELETE ALL CHECKLIST REPORTS ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to delete Checklist Reports.",
                error: err.message,
            });
        }

        Activity.create({
            title: "Checklist Reports Deleted",
            description: `${Number(result?.affectedSubmissions || 0)} checklist submission(s) deleted from reports.`,
            module_name: "Checklist Reports",
            status: "Closed",
            priority: "Medium",
            created_by: req.user.id,
            assigned_to: null,
        }, () => {});

        Audit.create({
            module_name: "Checklist Reports",
            reference_id: null,
            action: "DELETE_ALL",
            old_data: null,
            new_data: result,
            changed_by: req.user.id,
        }, () => {});

        return res.status(200).json({
            success: true,
            message: `${Number(result?.affectedSubmissions || 0)} Checklist Report submission(s) deleted successfully.`,
            ...result,
        });
    });
};

// ======================================================
// EXPORT REPORTS
// GET /api/checklist-reports/export
// ======================================================
exports.exportReports = (req, res) => {
    ChecklistReport.exportReports((err, rows) => {
        if (err) {
            console.error("EXPORT CHECKLIST REPORTS ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to export Checklist Reports.",
                error: err.message,
            });
        }

        const parser = new Parser({
            fields: [
                "id",
                "checklist_name",
                "store_name",
                "employee_name",
                "employee_id",
                "department_name",
                "submission_date",
                "status",
                "question",
                "answer",
                "remarks",
            ],
        });

        const csv = parser.parse(rows || []);

        Audit.create({
            module_name: "Checklist Reports",
            reference_id: null,
            action: "EXPORT",
            old_data: null,
            new_data: { total: rows?.length || 0 },
            changed_by: req.user.id,
        }, () => {});

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=ChecklistReports.csv"
        );

        return res.status(200).send(csv);
    });
};

// ======================================================
// BULK UPLOAD
//
// Kept for compatibility with the existing UI route.
// The report is derived from checklist submissions, so
// bulk upload creates checklist submissions + answers.
// ======================================================
exports.bulkUploadChecklistReports = async (req, res) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({
                success: false,
                message: "Please upload a CSV or Excel file.",
            });
        }

        const workbook = XLSX.read(req.file.buffer, {
            type: "buffer",
            cellDates: false,
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!sheet) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file does not contain a worksheet.",
            });
        }

        const rows = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
        });

        // Reports are generated by Checklist Submission. We deliberately do
        // not silently manufacture incomplete database records from an
        // arbitrary report spreadsheet.
        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: "The uploaded file is empty.",
            });
        }

        return res.status(400).json({
            success: false,
            message:
                "Checklist Reports are generated automatically from Checklist Submission. Use Checklist Submission to create report records.",
        });
    } catch (error) {
        console.error("BULK CHECKLIST REPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Checklist Report bulk upload failed.",
            error: error.message,
        });
    }
};

module.exports = {
    getAllReports: exports.getAllReports,
    getReportById: exports.getReportById,
    updateReport: exports.updateReport,
    deleteReport: exports.deleteReport,
    deleteAllReports: exports.deleteAllReports,
    bulkUploadChecklistReports: exports.bulkUploadChecklistReports,
    exportReports: exports.exportReports,
};

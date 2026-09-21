const fs = require("fs");
const { Parser } = require("json2csv");

const ChecklistReport = require("../models/checklistReportModel");
const Activity = require("../models/activityModel");
const Audit = require("../models/auditModel");
const { parseBulkFile } = require("../utils/bulkFileParser");
const checklistReportService = require("../services/checklistReportService");

// ======================================================
// BULK UPLOAD — COLUMN ALIASES
//
// Every alias is lower-cased and stripped of non-alphanumeric
// characters before matching (see utils/bulkFileParser.js), so
// "Store Name", "store_name", "STORE-NAME" and "storename" all
// resolve to the same canonical "Store" column. This is what
// lets a spreadsheet with differently worded/ordered headers —
// or even a stray banner row above the real header — still be
// accepted instead of being rejected outright.
// ======================================================

const CHECKLIST_REPORT_COLUMN_ALIASES = {
    "Store": ["store", "storename", "store name", "outlet", "outletname", "location", "branch", "storecode", "store code"],
    "Checklist Type": ["checklisttype", "checklist type", "checklist", "checklistname", "type"],
    "Employee": ["employee", "employeename", "employee name", "submittedby", "submitted by", "staff", "staffname", "employeeid", "employee id"],
    "Department": ["department", "departments", "dept", "departmentname"],
    "Question": ["question", "questiontext", "question text", "checklistquestion"],
    "Answer": ["answer", "response", "answertext"],
    "Remarks": ["remarks", "comment", "comments", "notes"],
    // "Submission Date" also covers "Intended Date" (the export's target/
    // due-date column) — "Actual Submission Time" is matched separately
    // below and, when present, wins (see parseSubmissionDate in
    // services/checklistReportService.js) since it's the real submission
    // moment rather than a target date.
    "Submission Date": ["submissiondate", "submission date", "date", "reportdate", "submitteddate", "submitted date", "intendeddate", "intended date"],
    "Actual Submission Time": ["actualsubmissiontime", "actual submission time", "submissiontime", "submission time", "submittedtime", "submitted time"],
    "Device": ["device", "devicename"],
    "Latitude": ["latitude", "lat"],
    "Longitude": ["longitude", "lng", "long"],
    // Combined "lat, long" export column — see parseGeoLocation() in
    // services/checklistReportService.js.
    "Geo Location": ["geolocation", "geo location", "coordinates", "latlong", "lat long", "gpscoordinates", "gps coordinates"]
};

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
                "action_point_status",
                "action_point_priority",
                "action_point_sla_days",
                "action_taken",
                "action_remarks",
                "completion_date",
                "action_point_comment",
                "action_point_remarks",
                "action_point_completed_at",
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
// Accepts CSV, Excel (.xlsx/.xls), PDF, or a photo of a
// printed/handwritten list (see utils/bulkFileParser.js), and
// tolerates row/column layouts that don't exactly match the
// sample file — headers are matched by alias, a banner/title
// row above the real header is skipped automatically, and a
// row missing a non-essential column (Question/Answer/Device/
// coordinates) is still imported rather than rejected outright.
//
// Every row becomes a real checklist submission (+ answer, when
// the question could be matched) — see
// services/checklistReportService.js. Only Store and Checklist
// Type are hard requirements; everything else is best-effort so
// a messy real-world export still gets imported instead of the
// whole file being bounced.
// ======================================================
exports.bulkUploadChecklistReports = async (req, res) => {
    const uploadedPath = req.file?.path;

    try {
        if (!uploadedPath) {
            return res.status(400).json({
                success: false,
                message: "Please upload a CSV, Excel, PDF, or photo file.",
            });
        }

        let parsed;
        try {
            parsed = await parseBulkFile(
                uploadedPath,
                req.file.originalname,
                req.file.mimetype,
                CHECKLIST_REPORT_COLUMN_ALIASES
            );
        } catch (parseError) {
            return res.status(parseError.status || 400).json({
                success: false,
                message: parseError.message,
            });
        }

        const { rows, warnings: parseWarnings } = parsed;

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message:
                    "No recognizable rows were found in this file. Make sure it has a Store and Checklist Type column (any reasonable header wording is fine) and try again.",
                warnings: parseWarnings,
            });
        }

        const created = [];
        const warnings = [...parseWarnings];
        const errors = [];

        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const rowNumber = index + 2;

            try {
                const result = await checklistReportService.createFromRow(row, req.user.id);

                created.push({ row: rowNumber, submissionId: result.submissionId });

                if (!result.questionMatched && row["Question"]) {
                    warnings.push(
                        `Row ${rowNumber}: submission created, but the Question "${row["Question"]}" wasn't recognized — the answer was not saved. Check spelling or the Checklist Type.`
                    );
                }
            } catch (rowError) {
                errors.push(`Row ${rowNumber}: ${rowError.message}`);
            }
        }

        if (!created.length) {
            return res.status(400).json({
                success: false,
                message: "No Checklist Reports were created. See the row-by-row problems below.",
                warnings,
                errors,
            });
        }

        Activity.create({
            title: "Checklist Reports Bulk Uploaded",
            description: `${created.length} Checklist Report(s) created via bulk upload.`,
            module_name: "Checklist Reports",
            status: "Closed",
            priority: "Low",
            created_by: req.user.id,
            assigned_to: null,
        }, () => {});

        Audit.create({
            module_name: "Checklist Reports",
            reference_id: null,
            action: "BULK_UPLOAD",
            old_data: null,
            new_data: { created: created.length, errors: errors.length },
            changed_by: req.user.id,
        }, () => {});

        return res.status(201).json({
            success: true,
            message: `Bulk upload completed. ${created.length} Checklist Report(s) created${errors.length ? `, ${errors.length} row(s) skipped` : ""}.`,
            data: { created, errors, warnings },
        });
    } catch (error) {
        console.error("BULK CHECKLIST REPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Checklist Report bulk upload failed.",
            error: error.message,
        });
    } finally {
        // The bulk-upload middleware stores the temporary import file on
        // disk. Remove it after processing so repeated uploads do not
        // accumulate files.
        if (uploadedPath) {
            try {
                if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
            } catch (cleanupError) {
                console.warn("Unable to remove Checklist Report bulk-upload file:", cleanupError.message);
            }
        }
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

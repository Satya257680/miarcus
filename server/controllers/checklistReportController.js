const { storedUploadPath } = require("../utils/storedUploadPath");
const fs = require("fs");
const { Parser } = require("json2csv");

const ChecklistReport = require("../models/checklistReportModel");
const Activity = require("../models/activityModel");
const Audit = require("../models/auditModel");
const { parseBulkFile } = require("../utils/bulkFileParser");
const checklistReportService = require("../services/checklistReportService");
const { readDeleteScope } = require("../utils/deleteScope");

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

// ======================================================
// PAGE-SIZE CEILING
//
// BUG FIX: the frontend used to always ask for `?limit=10000` and then
// do every bit of filtering/searching/paging itself in the browser
// against that one fetch — which is *why* the report list silently
// stopped growing past 10,000 rows no matter how much more data
// existed. The list is now paged for real (see getAllReports below),
// so ordinary table requests only ever ask for one page (10-100 rows)
// at a time and there is no longer any reason for the frontend to
// request a huge `limit`. This ceiling is just a safety net against a
// stray/malicious `?limit=...` value forcing the report+action-point
// join (with its per-row GROUP_CONCAT/subqueries) to scan far more
// rows than any single page of the UI could ever show.
//
// `?all=true` (used only by the CSV/XLSX export buttons — see
// exportReports below and the `all` param handling in
// models/checklistReportModel.js) intentionally bypasses this ceiling
// so an export always contains every matching row, however many there
// now are — 10,000, 100,000, 1,000,000+.
// ======================================================

const MAX_PAGE_LIMIT = 500;

const getFilters = (req) => {
    const wantsAll = String(req.query.all || "").toLowerCase() === "true";

    const requestedLimit = Number(req.query.limit) || 10;

    return {
        search: req.query.search || "",
        page: Number(req.query.page) || 1,
        limit: wantsAll ? requestedLimit : Math.min(Math.max(requestedLimit, 1), MAX_PAGE_LIMIT),
        all: wantsAll,
        store_id: req.query.store_id || null,
        checklist_type_id: req.query.checklist_type_id || null,
        new_store_opening_id: req.query.new_store_opening_id || null,
        employee_id: req.query.employee_id || null,
        from_date: req.query.from_date || null,
        to_date: req.query.to_date || null,
    };
};

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
            // `all=true` (export) fetches every matching row in one shot with
            // no LIMIT/OFFSET — report the "limit" as the true row count so
            // pagination.totalPages comes out to 1 instead of implying a
            // second page of results exists that a client could try to fetch.
            const limit = filters.all
                ? Math.max(total, 1)
                : Math.max(Number(filters.limit) || 10, 1);
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
            answers: rows,
        });
    });
};

// ======================================================
// UPDATE REPORT
// PUT /api/checklist-reports/:id
// ======================================================
exports.updateReport = (req, res) => {
    // Every column of the report row can be edited (submission,
    // answer and its Action Point). A new attachment may be uploaded.
    const body = { ...(req.body || {}) };
    delete body.status;
    delete body.attachment;
    if (req.file) body.attachment = storedUploadPath(req.file);

    ChecklistReport.update(
        req.params.id,
        body,
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
                new_data: body,
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
    // No filters  -> every visible report is removed (previous behaviour).
    // Filters     -> only reports matching store / checklist type /
    //                employee / date range / search are removed.
    const scope = readDeleteScope(req);
    const allowed = ["store_id", "checklist_type_id", "employee_id", "new_store_opening_id", "from_date", "to_date", "search"];
    const filters = {};
    allowed.forEach((key) => {
        if (scope.filters[key] !== undefined) filters[key] = scope.filters[key];
    });

    if (scope.filtered && !Object.keys(filters).length) {
        return res.status(400).json({
            success: false,
            message: "No valid filter was supplied. Nothing was deleted.",
        });
    }

    ChecklistReport.deleteAll({ filters }, (err, result) => {
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
            description: `${Number(result?.affectedSubmissions || 0)} checklist submission(s) deleted from reports${scope.filtered ? " (filtered delete)" : ""}.`,
            module_name: "Checklist Reports",
            status: "Closed",
            priority: "Medium",
            created_by: req.user.id,
            assigned_to: null,
        }, () => {});

        Audit.create({
            module_name: "Checklist Reports",
            reference_id: null,
            action: scope.filtered ? "DELETE_FILTERED" : "DELETE_ALL",
            old_data: scope.filtered ? { filters } : null,
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

    if (!uploadedPath) {
        return res.status(400).json({
            success: false,
            message: "Please upload a CSV, Excel, PDF, or photo file."
        });
    }

    // IMPORTANT: do not parse/import inside this HTTP request.
    // A 407k-row CSV can legitimately take longer than IIS/ARR is
    // willing to keep a gateway request open. The job starts immediately
    // after the file is received; the browser polls the status endpoint.
    const { createJob, updateJob, getJob, publicJob, finishJob } =
        require("../utils/bulkImportJobManager");

    const job = createJob(
        "checklist-reports",
        req.user.id,
        req.file
    );

    const runImport = async () => {
        try {
            updateJob(job.id, {
                status: "processing",
                startedAt: new Date().toISOString(),
                message: "Reading your file and preparing the records…"
            });

            let parsed;
            try {
                parsed = await parseBulkFile(
                    uploadedPath,
                    req.file.originalname,
                    req.file.mimetype,
                    CHECKLIST_REPORT_COLUMN_ALIASES,
                    // Called every ~1000 rows while the file is being read
                    // (see utils/bulkFileParser.js). Reading a very large
                    // file is no longer a single blocking call, so the
                    // status the browser is polling can now actually move
                    // during this step instead of sitting on "Reading your
                    // file and preparing the records…" the whole time.
                    (rowsReadSoFar) => {
                        updateJob(job.id, {
                            message: `Reading your file… ${rowsReadSoFar.toLocaleString()} row(s) read so far`
                        });
                    }
                );
            } catch (parseError) {
                finishJob(job.id, {
                    success: false,
                    message: parseError.message || "Unable to read the uploaded file.",
                    errors: [parseError.message || "Unable to read the uploaded file."]
                });
                return;
            }

            const { rows, warnings: parseWarnings } = parsed;

            updateJob(job.id, {
                total: rows.length,
                warnings: Array.isArray(parseWarnings) ? parseWarnings : [],
                message: `Found ${rows.length.toLocaleString()} rows. Starting the import…`
            });

            if (!rows.length) {
                finishJob(job.id, {
                    success: false,
                    message: "No recognizable rows were found in this file. Make sure it has a Store and Checklist Type column."
                });
                return;
            }

            let createdCount = 0;
            const errors = [];
            const warnings = Array.isArray(parseWarnings) ? [...parseWarnings] : [];

            // Keep this below the MySQL pool size. Each row has its own
            // transaction and several lookup queries.
            const BULK_UPLOAD_CONCURRENCY = 8;

            for (let start = 0; start < rows.length; start += BULK_UPLOAD_CONCURRENCY) {
                const batch = rows.slice(start, start + BULK_UPLOAD_CONCURRENCY);

                const batchResults = await Promise.all(
                    batch.map(async (row, offset) => {
                        const rowNumber = start + offset + 2;

                        // Retry transient DB failures. These are especially
                        // important on very large imports where connection
                        // queueing/deadlocks can otherwise create a few
                        // seemingly random skipped rows.
                        let lastError = null;

                        for (let attempt = 1; attempt <= 3; attempt += 1) {
                            try {
                                const result = await checklistReportService.createFromRow(
                                    row,
                                    req.user.id
                                );
                                return { rowNumber, row, result };
                            } catch (rowError) {
                                lastError = rowError;
                                const text = String(rowError?.message || "").toLowerCase();
                                const transient =
                                    /deadlock|lock wait timeout|connection|econnreset|econnrefused|pool|too many connections|timeout/.test(text);

                                if (!transient || attempt === 3) break;

                                await new Promise(resolve =>
                                    setTimeout(resolve, 150 * attempt)
                                );
                            }
                        }

                        return { rowNumber, row, error: lastError };
                    })
                );

                batchResults.sort((a, b) => a.rowNumber - b.rowNumber);

                for (const item of batchResults) {
                    if (item.error) {
                        errors.push(
                            `Row ${item.rowNumber}: ${item.error.message || "Import failed."}`
                        );
                        continue;
                    }

                    createdCount += 1;

                    if (!item.result.questionMatched && item.row["Question"]) {
                        warnings.push(
                            `Row ${item.rowNumber}: Question "${item.row["Question"]}" was not recognized; the submission was still imported.`
                        );
                    }
                }

                updateJob(job.id, {
                    processed: Math.min(start + batch.length, rows.length),
                    created: createdCount,
                    skipped: errors.length,
                    errors,
                    warnings,
                    message: `Importing records… ${Math.min(start + batch.length, rows.length).toLocaleString()} of ${rows.length.toLocaleString()} processed`
                });
            }

            if (!createdCount) {
                finishJob(job.id, {
                    success: false,
                    processed: rows.length,
                    created: 0,
                    skipped: errors.length,
                    errors,
                    warnings,
                    message: "No Checklist Reports were created. See the row-by-row problems below."
                });
                return;
            }

            Activity.create({
                title: "Checklist Reports Bulk Uploaded",
                description: `${createdCount} Checklist Report(s) created via bulk upload.`,
                module_name: "Checklist Reports",
                status: "Closed",
                priority: "Low",
                created_by: req.user.id,
                assigned_to: null
            }, () => {});

            Audit.create({
                module_name: "Checklist Reports",
                reference_id: null,
                action: "BULK_UPLOAD",
                old_data: null,
                new_data: {
                    created: createdCount,
                    errors: errors.length
                },
                changed_by: req.user.id
            }, () => {});

            finishJob(job.id, {
                success: true,
                processed: rows.length,
                created: createdCount,
                skipped: errors.length,
                errors,
                warnings,
                message: `Bulk upload completed. ${createdCount.toLocaleString()} Checklist Report(s) created${errors.length ? `, ${errors.length.toLocaleString()} row(s) need review` : ""}.`
            });

        } catch (error) {
            console.error("BULK CHECKLIST REPORT ERROR:", error);

            finishJob(job.id, {
                success: false,
                message: "Checklist Report bulk upload failed.",
                errors: [error.message || "Unknown import error."]
            });
        } finally {
            if (uploadedPath) {
                try {
                    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
                } catch (cleanupError) {
                    console.warn(
                        "Unable to remove Checklist Report bulk-upload file:",
                        cleanupError.message
                    );
                }
            }
        }
    };

    // Start after the HTTP response has been returned.
    setImmediate(() => {
        runImport().catch((error) => {
            console.error("CHECKLIST BULK JOB UNHANDLED ERROR:", error);
        });
    });

    return res.status(202).json({
        success: true,
        processing: true,
        jobId: job.id,
        statusUrl: `/api/checklist-reports/bulk-upload/status/${job.id}`,
        message: "File received successfully. Import is now running in the background."
    });
};

exports.getChecklistBulkUploadStatus = (req, res) => {
    const { getJob, publicJob } = require("../utils/bulkImportJobManager");
    const job = getJob(req.params.jobId, req.user.id);

    if (!job) {
        return res.status(404).json({
            success: false,
            message: "Bulk upload job was not found or has expired."
        });
    }

    return res.json({
        success: true,
        job: publicJob(job)
    });
};

module.exports = {
    getAllReports: exports.getAllReports,
    getReportById: exports.getReportById,
    updateReport: exports.updateReport,
    deleteReport: exports.deleteReport,
    deleteAllReports: exports.deleteAllReports,
    bulkUploadChecklistReports: exports.bulkUploadChecklistReports,
    getChecklistBulkUploadStatus: exports.getChecklistBulkUploadStatus,
    exportReports: exports.exportReports,
};

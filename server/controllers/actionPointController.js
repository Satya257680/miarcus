const fs = require("fs");
const { Parser } = require("json2csv");

const actionPointService = require("../services/actionPointService");
const { parseBulkFile } = require("../utils/bulkFileParser");
const checklistReportService = require("../services/checklistReportService");

// ======================================================
// BULK UPLOAD — COLUMN ALIASES
//
// Every alias is lower-cased and stripped of non-alphanumeric
// characters before matching (see utils/bulkFileParser.js), so a
// real-world export that spells things differently from the
// sample file — "Outlet" instead of "Store", "Emp ID" instead
// of "Assigned To", extra spacing/casing, a banner row above the
// real header — still gets recognized instead of the entire
// file being rejected.
// ======================================================

const ACTION_POINT_COLUMN_ALIASES = {
    "Store": ["store", "storename", "store name", "storeid", "store id", "outlet", "outletname", "location", "branch", "storecode", "store code"],
    "Department": ["department", "dept", "departmentid", "department id", "departmentname"],
    "Checklist Type": ["checklisttype", "checklist type", "checklist", "checklistname"],
    "Question": ["question", "questiontext", "question text", "checklistquestion"],
    "Answer": ["answer", "response", "answertext"],
    "Submission ID": ["submissionid", "submission id"],
    "Answer ID": ["answerid", "submission answer id", "submissionanswerid"],
    "Assigned To": ["assignedto", "assigned to", "employeeid", "employee id", "owner", "assignee"],
    "Priority": ["priority"],
    "SLA Days": ["sladays", "sla days"],
    "SLA Value": ["slavalue", "sla value", "sla"],
    "Status": ["status"],
    "Remarks": ["remarks", "comment", "comments", "notes"],
    "Action Taken": ["actiontaken", "action taken", "actiontakennotes", "resolution"],
    "Submission Date": ["submissiondate", "submission date", "date", "reportdate"],
    "Device": ["device", "devicename"]
};

// ======================================================
// GET ALL ACTION POINTS
// SEARCH + FILTER + PAGINATION
// GET /api/action-points
// ======================================================

exports.getAllActionPoints = async (req, res) => {

    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const filters = {
            store_id: req.query.store_id || null,
            department_id: req.query.department_id || null,
            new_store_opening_id: req.query.new_store_opening_id || null,
            checklist_type_id: req.query.checklist_type_id || null,
            priority: req.query.priority || null,
            status: req.query.status || null,
            start_date: req.query.start_date || null,
            end_date: req.query.end_date || null,
            search: req.query.search || "",
            offset,
            limit
        };

        const { rows, pagination } = await actionPointService.getAll(filters);

        return res.status(200).json({
            success: true,
            data: rows,
            pagination
        });

    }
    catch (error) {
        console.error("GET ACTION POINTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch Action Points.",
            error: error.message
        });
    }

};

// ======================================================
// EXPORT ACTION POINTS CSV
// GET /api/action-points/export
// ======================================================

exports.exportActionPointsCSV = async (req, res) => {

    try {

        const filters = {
            store_id: req.query.store_id || null,
            department_id: req.query.department_id || null,
            new_store_opening_id: req.query.new_store_opening_id || null,
            checklist_type_id: req.query.checklist_type_id || null,
            priority: req.query.priority || null,
            status: req.query.status || null,
            start_date: req.query.start_date || null,
            end_date: req.query.end_date || null,
            search: req.query.search || "",
            offset: 0,
            limit: 100000
        };

        const rows = await actionPointService.exportData(filters);

        const parser = new Parser({
            fields: [
                "id",
                "submission_date",
                "store_name",
                "city",
                "state",
                "checklist_name",
                "department_name",
                "question",
                "answer",
                "priority",
                "sla_days",
                "status",
                "remarks",
                "comment",
                "submitted_by",
                "assigned_to",
                "completed_at",
                "created_at"
            ]
        });

        const csv = parser.parse(rows || []);

        const Activity = require("../models/activityModel");
        const Audit = require("../models/auditModel");

        Activity.create({
            title: "Action Points Exported",
            description: "Action Points exported successfully.",
            module_name: "Action Points",
            status: "Closed",
            priority: "Low",
            created_by: req.user.id,
            assigned_to: null
        }, () => {});

        Audit.create({
            module_name: "Action Points",
            reference_id: null,
            action: "EXPORT",
            old_data: null,
            new_data: { total: rows.length },
            changed_by: req.user.id
        }, () => {});

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=ActionPoints.csv");

        return res.status(200).send(csv);

    }
    catch (error) {
        console.error("EXPORT ACTION POINTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Export failed.",
            error: error.message
        });
    }

};


// ======================================================
// GET ACTION POINTS BY NEW STORE OPENING
// GET /api/action-points/nso/:newStoreOpeningId
// ======================================================

exports.getActionPointsByNSO = async (req, res) => {

    try {

        const data = await actionPointService.getByNSO(req.params.newStoreOpeningId);

        return res.status(200).json({
            success: true,
            data
        });

    }
    catch (error) {
        console.error("GET ACTION POINTS BY NSO ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch Action Points for the NSO project.",
            error: error.message
        });
    }

};

// ======================================================
// BULK UPLOAD ACTION POINTS
// POST /api/action-points/bulk-upload
// ======================================================

exports.bulkUploadActionPoints = async (req, res) => {

    const uploadedPath = req.file?.path;

    try {

        if (!uploadedPath) {
            return res.status(400).json({
                success: false,
                message: "Please upload a CSV, Excel, PDF, or photo file."
            });
        }

        // Accepts CSV/XLSX/XLS/PDF/photo, auto-detects the real header row
        // even when it isn't row 1, and matches columns by alias rather
        // than an exact string — a mismatched/reordered/renamed column
        // layout no longer fails the whole file. See utils/bulkFileParser.js.
        let parsed;
        try {
            parsed = await parseBulkFile(
                uploadedPath,
                req.file.originalname,
                req.file.mimetype,
                ACTION_POINT_COLUMN_ALIASES
            );
        } catch (parseError) {
            return res.status(parseError.status || 400).json({
                success: false,
                message: parseError.message
            });
        }

        const { rows, warnings: parseWarnings } = parsed;

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: "No recognizable rows were found in this file. Make sure it has at least a Store column (any reasonable header wording is fine) and try again.",
                warnings: parseWarnings
            });
        }

        const created = [];
        const movedToReports = [];
        const errors = [];
        const warnings = [...parseWarnings];

        for (let index = 0; index < rows.length; index += 1) {

            const row = rows[index];
            const rowNumber = index + 2;

            const normalized = {
                store_id: row["Store"],
                store_name: row["Store"],
                department_id: row["Department"],
                question: row["Question"],
                submission_id: row["Submission ID"],
                submission_answer_id: row["Answer ID"],
                assigned_to: row["Assigned To"],
                priority: row["Priority"] || "Medium",
                sla_days: row["SLA Days"] || 0,
                sla_value: row["SLA Value"],
                status: row["Status"] || "Open",
                remarks: row["Remarks"]
            };

            // Always try to create the row as an Action Point first — that
            // is what Bulk Upload Action Points is for, and every column
            // besides Store is optional (see actionPointService.createManual).
            try {
                const result = await actionPointService.createManual(
                    normalized,
                    null,
                    req.user.id
                );

                created.push({ row: rowNumber, id: result.id });
                continue;
            } catch (actionPointError) {

                // No Action Point could be taken/created from this row
                // (most often: the Store text couldn't be resolved to a
                // known store). Rather than dropping the row, try to file
                // it as a completed Checklist Report instead — the row's
                // data is still preserved and visible, just in the right
                // place — and only report it as an error if that also fails.

                // ==================================================
                // ACTION POINT CREATION FAILED —
                // FILE IT AS A CHECKLIST REPORT INSTEAD OF DROPPING IT.
                // ==================================================
                try {
                    const reportResult = await checklistReportService.createFromRow(
                        {
                            "Store": row["Store"],
                            "Checklist Type": row["Checklist Type"],
                            "Submission ID": row["Submission ID"],
                            "Employee": row["Assigned To"],
                            "Question": row["Question"],
                            "Answer": row["Answer"] || row["Remarks"],
                            "Remarks": row["Remarks"],
                            "Submission Date": row["Submission Date"],
                            "Device": row["Device"]
                        },
                        req.user.id
                    );

                    movedToReports.push({ row: rowNumber, submissionId: reportResult.submissionId });
                } catch (reportError) {
                    errors.push(
                        `Row ${rowNumber}: could not create an Action Point (${actionPointError.message}), and could not file it as a Checklist Report either (${reportError.message}).`
                    );
                }
            }
        }

        if (!created.length && !movedToReports.length) {
            return res.status(400).json({
                success: false,
                message: "No Action Points were created and no rows could be filed as Checklist Reports. See the row-by-row problems below.",
                warnings,
                errors
            });
        }

        const messageParts = [];
        if (created.length) messageParts.push(`${created.length} Action Point(s) created`);
        if (movedToReports.length) messageParts.push(`${movedToReports.length} row(s) had no action to take and were filed as Checklist Reports instead`);
        if (errors.length) messageParts.push(`${errors.length} row(s) skipped`);

        return res.status(201).json({
            success: true,
            message: `Bulk upload completed. ${messageParts.join(", ")}.`,
            data: {
                created,
                movedToReports,
                errors,
                warnings
            }
        });

    } catch (error) {

        console.error(
            "BULK ACTION POINT UPLOAD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to bulk upload Action Points.",
            error: error.message
        });

    } finally {
        // The upload middleware stores the temporary import file on disk.
        // Remove it after processing so repeated uploads do not accumulate files.
        if (uploadedPath) {
            try {
                if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
            } catch (cleanupError) {
                console.warn("Unable to remove Action Point bulk-upload file:", cleanupError.message);
            }
        }
    }

};

// ======================================================
// GET ACTION POINT BY ID
// GET /api/action-points/:id
// ======================================================

exports.getActionPointById = async (req, res) => {

    try {

        const data = await actionPointService.getById(req.params.id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Action Point not found."
            });
        }

        return res.status(200).json({ success: true, data });

    }
    catch (error) {
        console.error("GET ACTION POINT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// CREATE ACTION POINT
// POST /api/action-points
// ======================================================

exports.createActionPoint = async (req, res) => {

    try {

        const attachment = req.file
            ? req.file.path.replace(/\\/g, "/")
            : null;

        const result = await actionPointService.createManual(
            req.body,
            attachment,
            req.user.id
        );

        return res.status(201).json({
            success: true,
            message: "Action Point created successfully.",
            data: result
        });

    }
    catch (error) {
        console.error("CREATE ACTION POINT ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to create Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// UPDATE ACTION POINT
// PUT /api/action-points/:id
// ======================================================

exports.updateActionPoint = async (req, res) => {

    try {

        const attachment = req.file
            ? req.file.path.replace(/\\/g, "/")
            : null;

        const result = await actionPointService.update(
            req.params.id,
            req.body,
            attachment,
            req.user.id
        );

        return res.status(200).json(result);

    }
    catch (error) {
        console.error("UPDATE ACTION POINT ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to update Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// TAKE ACTION
// PUT /api/action-points/:id/take-action
// ======================================================

exports.takeAction = async (req, res) => {

    try {

        const result = await actionPointService.takeAction(
            req.params.id,
            req.body,
            req.user.id
        );

        return res.status(200).json(result);

    }
    catch (error) {
        console.error("TAKE ACTION ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to complete Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// GET ACTION POINT HISTORY
// GET /api/action-points/:id/history
// ======================================================

exports.getActionPointHistory = async (req, res) => {
    try {
        const actionPoint = await actionPointService.getById(req.params.id);
        if (!actionPoint) {
            return res.status(404).json({ success: false, message: "Action Point not found." });
        }

        const history = await actionPointService.getHistory(req.params.id);
        return res.status(200).json({ success: true, data: history || [] });
    } catch (error) {
        console.error("GET ACTION POINT HISTORY ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load Action Point history.", error: error.message });
    }
};

// ======================================================
// CHANGE NEXT ACTION STATUS
// PUT /api/action-points/:id/status
// ======================================================

exports.changeActionPointStatus = async (req, res) => {
    try {
        const result = await actionPointService.changeStatus(
            req.params.id,
            req.body?.status,
            req.body?.comment,
            req.user.id
        );
        return res.status(200).json(result);
    } catch (error) {
        console.error("CHANGE ACTION POINT STATUS ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to update Action Point status.",
            error: error.message
        });
    }
};

// ======================================================
// DELETE ACTION POINT
// DELETE /api/action-points/:id
// ======================================================

exports.deleteActionPoint = async (req, res) => {

    try {

        const result = await actionPointService.delete(req.params.id, req.user.id);
        return res.status(200).json(result);

    }
    catch (error) {
        console.error("DELETE ACTION POINT ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to delete Action Point.",
            error: error.message
        });
    }

};

// ======================================================
// DELETE ALL ACTION POINTS
// DELETE /api/action-points
// ======================================================

exports.deleteAllActionPoints = async (req, res) => {

    try {

        const result = await actionPointService.deleteAll(req.user.id);
        return res.status(200).json(result);

    }
    catch (error) {
        console.error("DELETE ALL ACTION POINTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete Action Points.",
            error: error.message
        });
    }

};

// ======================================================
// MODULE EXPORT
// ======================================================

module.exports = {
    getAllActionPoints: exports.getAllActionPoints,
    exportActionPointsCSV: exports.exportActionPointsCSV,
    getActionPointsByNSO: exports.getActionPointsByNSO,
    getActionPointById: exports.getActionPointById,
    bulkUploadActionPoints: exports.bulkUploadActionPoints,
    createActionPoint: exports.createActionPoint,
    updateActionPoint: exports.updateActionPoint,
    takeAction: exports.takeAction,
    getActionPointHistory: exports.getActionPointHistory,
    changeActionPointStatus: exports.changeActionPointStatus,
    deleteActionPoint: exports.deleteActionPoint,
    deleteAllActionPoints: exports.deleteAllActionPoints
};
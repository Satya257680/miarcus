const fs = require("fs");
const { Parser } = require("json2csv");

const actionPointService = require("../services/actionPointService");
const { parseBulkFile } = require("../utils/bulkFileParser");
const checklistReportService = require("../services/checklistReportService");
const { getDepartmentIdByName } = require("../models/userModel");

// ======================================================
// RESOLVE DEPARTMENT ID FROM NAME (bulk upload)
//
// Bulk files identify a Department by name ("IT", "Operations"...),
// not by numeric ID. Reuses the same exact -> fuzzy matcher already
// used for Users bulk upload (models/userModel.js) instead of passing
// the raw text straight into a numeric column.
// ======================================================

// A bulk row's Department text can be a comma-separated list — the
// Action Points export writes "Regional Head, ASM" etc. (several
// departments can be tied to one question/action) — but
// action_points.department_id is a single value. Try each
// comma-separated token in turn (in the order written) and use the
// first one that actually matches a configured Department, rather
// than passing the whole list straight into a single-name lookup
// (which would never match anything and silently leave Department
// blank, even though the text was right there in the file).
const resolveDepartmentId = (departmentText) =>
    new Promise((resolve) => {
        const raw = String(departmentText || "").trim();

        if (!raw) {
            resolve(null);
            return;
        }

        if (/^\d+$/.test(raw)) {
            resolve(Number(raw));
            return;
        }

        const candidates = raw
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);

        if (!candidates.length) {
            resolve(null);
            return;
        }

        const tryNext = (index) => {
            if (index >= candidates.length) {
                resolve(null);
                return;
            }

            getDepartmentIdByName(candidates[index], (err, rows) => {
                if (!err && rows && rows.length) {
                    resolve(rows[0].id);
                    return;
                }
                tryNext(index + 1);
            });
        };

        tryNext(0);
    });

// ======================================================
// SAFE INTEGER FOR A BULK-UPLOAD NUMERIC COLUMN
//
// sla_days / sla_value are INT columns. A spreadsheet cell can contain
// "NA", a blank, or descriptive text ("2 days") instead of a clean
// number — passing that straight through risks the exact class of
// "Incorrect [...] value" SQL error New Store Openings bulk upload
// hits for its decimal columns (see controllers/newStoreOpeningController.js).
// Extracts the first number found and returns `fallback` (default
// null) for anything with no digits at all.
// ======================================================

const toSafeInt = (value, fallback = null) => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : fallback;

    const text = String(value).trim();
    if (!text) return fallback;

    const match = text.match(/-?\d+(\.\d+)?/);
    if (!match) return fallback;

    const num = Number(match[0]);
    return Number.isFinite(num) ? Math.round(num) : fallback;
};

// ======================================================
// DOES THIS ROW ALREADY SAY "NO ACTION REQUIRED"?
//
// A bulk Action Point row that already carries a resolved/closed
// Status, or already has an Action Taken value filled in, is not a
// new open task — it is a record of something already handled. Those
// rows are filed straight into Checklist Reports (already Closed)
// instead of opening an Action Point that would just need to be
// closed again by hand.
// ======================================================

const NO_ACTION_STATUS_VALUES = new Set([
    "closed", "complete", "completed", "done", "resolved",
    "no action", "no action required", "no action needed",
    "not required", "n/a", "na", "ok", "okay", "pass", "passed",
    "compliant", "satisfactory"
]);

const isNoActionRequired = (row) => {
    const statusText = String(row["Status"] || "").trim().toLowerCase();
    const actionTakenText = String(row["Action Taken"] || "").trim();
    return NO_ACTION_STATUS_VALUES.has(statusText) || Boolean(actionTakenText);
};

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
    // "Action Department" (the export's "who should act" column) is
    // preferred over the generic "Department"/"Departments" header when
    // both are present — see resolveDepartmentId() above, which also
    // handles a comma-separated list like "Regional Head, ASM".
    "Department": ["department", "dept", "departmentid", "department id", "departmentname", "actiondepartment", "action department"],
    "Checklist Type": ["checklisttype", "checklist type", "checklist", "checklistname"],
    "Question": ["question", "questiontext", "question text", "checklistquestion"],
    // BUG FIX: the Action Points export's actual header is "Answer
    // Given", not "Answer" — it wasn't recognized at all before, so the
    // real filled-in value (e.g. "498056", "Yes") was silently dropped.
    "Answer": ["answer", "response", "answertext", "answergiven", "answer given"],
    "Submission ID": ["submissionid", "submission id"],
    "Answer ID": ["answerid", "submission answer id", "submissionanswerid"],
    "Assigned To": ["assignedto", "assigned to", "employeeid", "employee id", "owner", "assignee"],
    "Priority": ["priority"],
    "SLA Days": ["sladays", "sla days"],
    "SLA Value": ["slavalue", "sla value", "sla"],
    "SLA Unit": ["slaunit", "sla unit"],
    "Status": ["status"],
    "Remarks": ["remarks", "comment", "comments", "notes"],
    "Action Taken": ["actiontaken", "action taken", "actiontakennotes", "resolution"],
    "Submission Date": ["submissiondate", "submission date", "date", "reportdate", "intendeddate", "intended date"],
    "Actual Submission Time": ["actualsubmissiontime", "actual submission time", "submissiontime", "submission time", "submittedtime", "submitted time"],
    "Device": ["device", "devicename"],
    "City": ["city"],
    "State": ["state"]
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

            try {

                // ==================================================
                // STEP 1 — FILE THE ROW AS A CHECKLIST SUBMISSION/ANSWER
                //
                // Every bulk-uploaded Action Point row is anchored to a
                // real Checklist Report entry (see
                // services/checklistReportService.js). `allowSynthetic`
                // means a missing/unrecognized Checklist Type or Question
                // never drops the row — Store is still the only hard
                // requirement, same as before. This is what lets the row
                // (a) show up in Checklist Reports immediately when no
                // action is required, and (b) show up there automatically
                // once its Action Point is closed, exactly like a normal
                // checklist-triggered Action Point already does.
                // ==================================================

                const reportResult = await checklistReportService.createFromRow(
                    {
                        "Store": row["Store"],
                        "Checklist Type": row["Checklist Type"],
                        "Submission ID": row["Submission ID"],
                        "Employee": row["Assigned To"],
                        "Department": row["Department"],
                        "Question": row["Question"],
                        "Answer": row["Answer"] || row["Remarks"],
                        "Remarks": row["Remarks"],
                        "Submission Date": row["Submission Date"],
                        "Actual Submission Time": row["Actual Submission Time"],
                        "Device": row["Device"]
                    },
                    req.user.id,
                    { allowSynthetic: true }
                );

                if (!reportResult.questionMatched && row["Question"]) {
                    warnings.push(
                        `Row ${rowNumber}: the Question "${row["Question"]}" wasn't recognized as a configured checklist question — it was kept in Remarks instead.`
                    );
                }

                // ==================================================
                // STEP 2 — RESOLVE THE ACTION POINT FIELDS
                // ==================================================

                const departmentId = await resolveDepartmentId(row["Department"]);

                // BUG FIX: `assigned_to` is an INT column (a Users FK) —
                // it can't hold the raw "Rahul (40090)" text straight from
                // the spreadsheet (that used to risk the same class of
                // "Incorrect [...] value" SQL error as the New Store
                // Openings numeric columns). Reuse the same Employee
                // resolution already done for the linked Checklist Report
                // row above instead of re-parsing (or mis-typing) it here.
                const assignedToUserId = reportResult.submittedByUserId || null;

                const actionPointBody = {
                    submission_id: reportResult.submissionId,
                    submission_answer_id: reportResult.answerId,
                    department_id: departmentId,
                    assigned_to: assignedToUserId,
                    priority: row["Priority"] || "Medium",
                    sla_days: toSafeInt(row["SLA Days"], 0),
                    sla_value: toSafeInt(row["SLA Value"], null),
                    remarks: row["Remarks"] || ""
                };

                // ==================================================
                // STEP 3 — NO ACTION REQUIRED -> STRAIGHT TO REPORTS
                //
                // ELSE -> A NORMAL OPEN ACTION POINT, LINKED SO THAT
                // CLOSING IT LATER (Take Action) AUTOMATICALLY MOVES IT
                // INTO CHECKLIST REPORTS TOO (existing behavior — see
                // models/checklistReportModel.js / models/actionPointModel.js).
                // ==================================================

                if (isNoActionRequired(row)) {

                    const actionTakenText = String(row["Action Taken"] || "").trim() || "No action required.";

                    await actionPointService.createClosedFromImport(
                        {
                            ...actionPointBody,
                            comment: actionTakenText
                        },
                        req.user.id
                    );

                    movedToReports.push({ row: rowNumber, submissionId: reportResult.submissionId });

                } else {

                    const result = await actionPointService.createManual(
                        {
                            ...actionPointBody,
                            status: row["Status"] || "Open"
                        },
                        null,
                        req.user.id
                    );

                    created.push({ row: rowNumber, id: result.id });
                }

            } catch (rowError) {
                errors.push(`Row ${rowNumber}: ${rowError.message}`);
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
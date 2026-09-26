const { storedUploadPath } = require("../utils/storedUploadPath");
const fs = require("fs");
const { Parser } = require("json2csv");

const actionPointService = require("../services/actionPointService");
const { parseBulkFile } = require("../utils/bulkFileParser");
const { readDeleteScope } = require("../utils/deleteScope");
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
// "NO ACTION REQUIRED" STATUS VALUES
//
// A bulk Action Point row that already carries a resolved/closed
// Status, or already has an Action Taken value filled in with no
// explicit Open/In Progress Status to override it (see
// isNoActionRequired() below), is not a new open task — it is a
// record of something already handled. Those rows are filed straight
// into Checklist Reports (already Closed) instead of opening an
// Action Point that would just need to be closed again by hand.
// ======================================================

const NO_ACTION_STATUS_VALUES = new Set([
    "closed", "complete", "completed", "done", "resolved",
    "no action", "no action required", "no action needed",
    "not required", "n/a", "na", "ok", "okay", "pass", "passed",
    "compliant", "satisfactory"
]);

// ======================================================
// NORMALIZE A BULK ROW'S STATUS TEXT
//
// A real-world file spells "In Progress" every possible way —
// "in progress", "INPROGRESS", "In-Progress", "WIP", "Ongoing" — and
// the action_points.status column is a strict ENUM('Open','In
// Progress','Closed'). This maps any recognized spelling to the
// exact canonical value the column expects, and falls back to the
// caller-supplied default only when the text isn't recognized at all
// (rather than silently dropping an unusual-but-valid Open/In
// Progress spelling to the ENUM default of "Open").
// ======================================================

const STATUS_TEXT_ALIASES = {
    "open": "Open",
    "to do": "Open",
    "todo": "Open",
    "pending": "Open",
    "new": "Open",
    "not started": "Open",
    "in progress": "In Progress",
    "inprogress": "In Progress",
    "in-progress": "In Progress",
    "wip": "In Progress",
    "work in progress": "In Progress",
    "ongoing": "In Progress",
    "working": "In Progress",
    "started": "In Progress",
    "closed": "Closed",
    "close": "Closed",
    "completed": "Closed",
    "complete": "Closed",
    "done": "Closed",
    "resolved": "Closed"
};

const normalizeActionPointStatus = (value, fallback = "Open") => {
    const key = String(value || "").trim().toLowerCase();
    if (!key) return fallback;
    return STATUS_TEXT_ALIASES[key] || fallback;
};

// ======================================================
// DOES THIS ROW ALREADY SAY "NO ACTION REQUIRED"?
//
// BUG FIX ("In Progress doesn't stay In Progress"): this used to
// force ANY row with a non-empty "Action Taken" cell straight to
// Closed, regardless of what its own Status column said. A row that
// had already been moved to "In Progress" — with a partial, still-
// in-flight Action Taken note attached, which is completely normal —
// silently flipped back to Closed (and vanished from Action Points,
// since Closed checklist-linked rows leave this list) the next time
// the same file was bulk-uploaded again. An explicit Open/In Progress
// Status now always wins and is trusted as-is; the Action Taken text
// is only used as a heuristic when the Status column is missing or
// doesn't itself already say the item is done.
// ======================================================

const isNoActionRequired = (row) => {
    const normalizedStatus = normalizeActionPointStatus(row["Status"], null);

    if (normalizedStatus === "Open" || normalizedStatus === "In Progress") {
        return false;
    }

    const statusText = String(row["Status"] || "").trim().toLowerCase();
    const actionTakenText = String(row["Action Taken"] || "").trim();
    return NO_ACTION_STATUS_VALUES.has(statusText) || Boolean(actionTakenText);
};

// ======================================================
// SLA — RESOLVE DAYS/HOURS/MINUTES FROM A BULK ROW
//
// A bulk file can express its SLA in several different shapes:
//   - separate "SLA Days"/"SLA Hours"/"SLA Minutes" columns
//   - a single "SLA Value" number plus an "SLA Unit" column
//     ("Days"/"Hours"/"Minutes")
//   - a single "SLA Value"/"SLA Days" number with no unit at all
//     (kept exactly as before: treated as days)
//   - only the already-rendered countdown/duration text (e.g. the
//     Action Points export's own "SLA Countdown" column, or a
//     hand-typed "5 days"/"4 hours")
//
// Returns { days, hours, minutes } (all in whole units), or null when
// the row genuinely has no SLA information at all — which is the only
// case "No SLA" should still be shown for.
// ======================================================

const SLA_HOUR_UNIT_RE = /^(h|hr|hrs|hour|hours)$/i;
const SLA_MIN_UNIT_RE = /^(m|min|mins|minute|minutes)$/i;

const parseDurationText = (text) => {
    const str = String(text ?? "").trim();
    if (!str) return null;

    const dMatch = str.match(/(-?\d+(?:\.\d+)?)\s*d(?:ay)?s?\b/i);
    const hMatch = str.match(/(-?\d+(?:\.\d+)?)\s*h(?:ou)?r?s?\b/i);
    const mMatch = str.match(/(-?\d+(?:\.\d+)?)\s*m(?:in(?:ute)?)?s?\b/i);

    if (dMatch || hMatch || mMatch) {
        return {
            days: dMatch ? Math.trunc(Number(dMatch[1])) || 0 : 0,
            hours: hMatch ? Math.trunc(Number(hMatch[1])) || 0 : 0,
            minutes: mMatch ? Math.trunc(Number(mMatch[1])) || 0 : 0
        };
    }

    // A plain number with no recognizable unit at all — same meaning
    // "SLA Days"/"SLA Value" always had: treated as days.
    const plainNumber = toSafeInt(str, null);
    if (plainNumber !== null) return { days: plainNumber, hours: 0, minutes: 0 };

    return null;
};

const resolveSlaParts = (row) => {
    const explicitDays = toSafeInt(row["SLA Days"], null);
    const explicitHours = toSafeInt(row["SLA Hours"], null);
    const explicitMinutes = toSafeInt(row["SLA Minutes"], null);

    if (explicitDays !== null || explicitHours !== null || explicitMinutes !== null) {
        return {
            days: explicitDays || 0,
            hours: explicitHours || 0,
            minutes: explicitMinutes || 0
        };
    }

    // "SLA Value" + optional "SLA Unit" pair. With no Unit column at all
    // this behaves exactly like the old code: the number is days.
    const numericValue = toSafeInt(row["SLA Value"], null);
    if (numericValue !== null) {
        const unit = String(row["SLA Unit"] || "").trim();

        if (SLA_HOUR_UNIT_RE.test(unit)) return { days: 0, hours: numericValue, minutes: 0 };
        if (SLA_MIN_UNIT_RE.test(unit)) return { days: 0, hours: 0, minutes: numericValue };
        return { days: numericValue, hours: 0, minutes: 0 };
    }

    // Last resort — a free-text duration/countdown column.
    const durationText = row["SLA Countdown"] || row["SLA Days"] || row["SLA Value"];
    return parseDurationText(durationText);
};

// ======================================================
// HISTORY — PARSE A BULK ROW'S OWN AUDIT-TRAIL COLUMN
//
// The "History" column (the export's audit-trail text, e.g. "No
// Action Taken by System Auto-generated at 8/31/2026, 10:15:24 PM;
// Opened by Ajay at 9/1/2026, 2:44:48 PM; Closed by Priya at
// 9/3/2026, 11:02:10 AM") already records exactly who did what and
// when. Parsed into individual entries here so every one of them can
// be re-created as a real action_point_history row (see
// seedHistoryFromFile below) instead of that information being
// thrown away on import and replaced with "by <whoever ran the bulk
// upload>".
// ======================================================

const HISTORY_ENTRY_PATTERN =
    /^(.*?)\s+by\s+(.+?)\s+at\s+(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/;

const pad2 = (value) => String(value).padStart(2, "0");

const parseHistoryColumn = (historyText) => {
    const text = String(historyText || "").trim();
    if (!text) return [];

    return text
        .split(/;\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const match = part.match(HISTORY_ENTRY_PATTERN);

            if (!match) {
                return { actionText: part, actorName: null, timestamp: null };
            }

            let [, actionText, actorName, month, day, year, hour, minute, second, meridiem] = match;
            hour = Number(hour);
            minute = Number(minute);
            second = Number(second || 0);

            const isPM = /pm/i.test(meridiem);
            if (hour === 12) hour = isPM ? 12 : 0;
            else if (isPM) hour += 12;

            const timestamp =
                `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;

            return {
                actionText: actionText.trim(),
                actorName: actorName.trim(),
                timestamp
            };
        })
        .filter((entry) => entry.actionText);
};

const inferHistoryStatus = (actionText) => {
    const text = String(actionText || "").toLowerCase();
    if (/(close|complete|resolved|done)/.test(text)) return "Closed";
    if (/(progress|working|wip)/.test(text)) return "In Progress";
    if (/(open|no action)/.test(text)) return "Open";
    return null;
};

const inferHistoryActionType = (actionText) => {
    const text = String(actionText || "").toLowerCase();
    if (/(close|complete|resolved|done)/.test(text)) return "COMPLETED";
    if (/(progress|open|working)/.test(text)) return "STATUS_CHANGED";
    return "IMPORTED";
};

// Resolves a History-entry actor name (e.g. "Ajay", "System") to a real
// Users row when possible (reusing the same Employee/name matcher already
// used for the linked Checklist Report row), returning free text only —
// never the uploading admin — when it doesn't match anyone.
const resolveHistoryActor = async (actorName) => {
    const name = String(actorName || "").trim();
    if (!name) return { userId: null, name: null };
    if (/^system(\s|$)/i.test(name)) return { userId: null, name };

    try {
        const match = await checklistReportService.resolveUserId({ "Employee": name });
        return { userId: match?.userId || null, name: match?.userId ? null : name };
    } catch (_error) {
        return { userId: null, name };
    }
};

// Re-creates every entry from a bulk row's own History column as a real
// action_point_history row, with its own real actor and timestamp — this
// is what makes the History panel show "whatever the file actually said"
// instead of only the moment the row was imported.
const seedHistoryFromFile = async (actionPointId, historyEntries) => {
    for (const entry of historyEntries) {
        const actor = await resolveHistoryActor(entry.actorName);

        await actionPointService.addHistoryEntry({
            action_point_id: actionPointId,
            action_type: inferHistoryActionType(entry.actionText),
            status: inferHistoryStatus(entry.actionText),
            comment: entry.actionText,
            changed_by: actor.userId,
            changed_by_name: actor.name,
            created_at: entry.timestamp || null
        });
    }
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
    // Broadened so a re-uploaded export — the Action Points export's own
    // "sla_days" header, the Checklist Reports export's
    // "action_point_sla_days" header, or a hand-typed "SLA (Days)"/"SLA in
    // Days" column — is recognized instead of silently landing on nothing
    // and showing "No SLA" for every row. See resolveSlaParts() below.
    "SLA Days": [
        "sladays", "sla days", "sla(days)", "sla in days", "numberofdays",
        "noofdays", "actionpointsladays", "action point sla days"
    ],
    "SLA Value": ["slavalue", "sla value", "sla"],
    "SLA Hours": ["slahours", "sla hours", "sla(hours)", "sla in hours"],
    "SLA Minutes": ["slaminutes", "sla minutes", "sla(minutes)", "sla in minutes"],
    "SLA Unit": ["slaunit", "sla unit", "slatype", "sla type"],
    // Fallback source when a file only carries the already-rendered
    // countdown text (e.g. "5d 03h 00m", "Overdue (5 days)") rather than a
    // clean number — see parseDurationText()/resolveSlaParts() below.
    "SLA Countdown": ["slacountdown", "sla countdown"],
    "Status": ["status"],
    // BUG FIX: "Remarks" and "Comment" used to share one canonical
    // column ("comment"/"comments" were listed as Remarks aliases), so
    // a file with BOTH a "Comment" column and a separate "Remarks"
    // column (the Action Points export itself is exactly this shape)
    // had one silently overwrite the other — whichever header came
    // later in the row won, and the other column's text was dropped
    // entirely. They are genuinely different action_points columns
    // (see models/actionPointModel.js's `ap.remarks` / `ap.comment`),
    // so they now get their own canonical fields and are both kept.
    "Remarks": ["remarks", "notes"],
    "Comment": ["comment", "comments"],
    // "History" (the export's audit-trail column, e.g. "No Action
    // Taken by System Auto-generated at 8/31/2026, 10:15:24 PM; ...")
    // carries the row's real original timestamp even on files that
    // have no dedicated Submission Date/Actual Submission Time column
    // — see checklistReportService.parseSubmissionDate's History
    // fallback.
    "History": ["history", "audittrail", "audit trail"],
    "Attachment": ["attachment", "attachments", "attachmenturl", "attachment url", "file", "fileurl", "file url"],
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

        // "sla days required, if overdue then wrote as overdue" — the raw
        // sla_days column alone doesn't say whether a row is actually
        // overdue right now, so compute the same OVERDUE state the live
        // Action Points table already shows (client/src/pages/
        // ActionPoints.jsx's getSlaMeta: deadline = created_at +
        // sla_minutes, overdue once that deadline has passed and the
        // row isn't Closed) and write that into the exported SLA Days
        // column instead of a bare number.
        const nowMs = Date.now();

        const exportRows = (rows || []).map((row) => {
            const status = String(row.status || "").toLowerCase();
            const rawDays = row.sla_days;
            const hasDays = rawDays !== null && rawDays !== undefined && rawDays !== "";

            let slaDisplay = hasDays ? String(rawDays) : "-";
            let overdue = "No";

            if (status !== "closed") {
                let totalMinutes = Number(row.sla_minutes) || 0;
                if (!totalMinutes && hasDays) {
                    totalMinutes = Number(rawDays) * 24 * 60;
                }

                if (totalMinutes > 0 && row.created_at) {
                    const createdAt = new Date(row.created_at).getTime();
                    if (Number.isFinite(createdAt) && createdAt + totalMinutes * 60 * 1000 <= nowMs) {
                        slaDisplay = hasDays
                            ? `Overdue (${rawDays} day${Number(rawDays) === 1 ? "" : "s"})`
                            : "Overdue";
                        overdue = "Yes";
                    }
                }
            }

            // Dedicated "Overdue" column (Yes/No), alongside the sla_days
            // column above — mirrors the Action Points table's own
            // Overdue column (client/src/pages/ActionPoints.jsx) so the
            // export reads the same way the live page does.
            return { ...row, sla_days: slaDisplay, overdue };
        });

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
                "overdue",
                "status",
                "remarks",
                "comment",
                "submitted_by",
                "assigned_to",
                "completed_at",
                "created_at"
            ]
        });

        const csv = parser.parse(exportRows);

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

    if (!uploadedPath) {
        return res.status(400).json({
            success: false,
            message: "Please upload a CSV, Excel, PDF, or photo file."
        });
    }

    const { createJob, updateJob, getJob, publicJob, finishJob } =
        require("../utils/bulkImportJobManager");

    const job = createJob(
        "action-points",
        req.user.id,
        req.file
    );

    const runImport = async () => {
        try {
            updateJob(job.id, {
                status: "processing",
                startedAt: new Date().toISOString(),
                message: "Reading your Action Points file and preparing the records…"
            });

            let parsed;
            try {
                parsed = await parseBulkFile(
                    uploadedPath,
                    req.file.originalname,
                    req.file.mimetype,
                    ACTION_POINT_COLUMN_ALIASES
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
                    message: "No recognizable rows were found in this file. Make sure it has a Store column."
                });
                return;
            }

            const created = [];
            const movedToReports = [];
            const errors = [];
            const warnings = Array.isArray(parseWarnings) ? [...parseWarnings] : [];

            // Keep below the MySQL pool's connectionLimit (10).
            const BULK_UPLOAD_CONCURRENCY = 8;

            const processRow = async (row, rowNumber) => {

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
                        // BUG FIX: this used to fall back to
                        // row["Remarks"] whenever Answer was blank, which
                        // made the Answer column show the same free-text
                        // Remarks/comment instead of "not filled" — the
                        // Answer should reflect only what the file's own
                        // Answer column actually says.
                        "Answer": row["Answer"],
                        "Remarks": row["Remarks"],
                        // "Comment" and "History" are no longer folded into
                        // Remarks (see ACTION_POINT_COLUMN_ALIASES above) —
                        // History in particular is what lets
                        // parseSubmissionDate() recover the row's real
                        // original date/time on a file that has no
                        // dedicated Submission Date/Actual Submission Time
                        // column at all (the Action Points export's own
                        // shape).
                        "Comment": row["Comment"],
                        "History": row["History"],
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

                // ==================================================
                // SLA — DAYS / HOURS / MINUTES
                //
                // BUG FIX ("SLA Countdown / SLA (Days) / Overdue always
                // show No SLA / '-' after bulk upload"): the old code only
                // ever looked at a literal "SLA Days"/"SLA Value" column,
                // so any file that expressed its SLA differently — split
                // across Days/Hours/Minutes columns, a value + separate
                // unit column, or only the already-rendered countdown text
                // — silently lost that data on import. resolveSlaParts()
                // (see above) tries every shape the file might use before
                // giving up. sla_value is kept as a rounded day-equivalent
                // purely for the "SLA (Days)" display column — the exact
                // countdown/Overdue state is always computed from the
                // precise day/hour/minute total below.
                // ==================================================

                const slaParts = resolveSlaParts(row);

                let slaBody = { sla_days: null, sla_hours: null, sla_minutes: null, sla_value: null };

                if (slaParts) {
                    const totalMinutes =
                        (slaParts.days * 24 * 60) +
                        (slaParts.hours * 60) +
                        slaParts.minutes;

                    slaBody = {
                        sla_days: slaParts.days || 0,
                        sla_hours: slaParts.hours || 0,
                        sla_minutes: slaParts.minutes || 0,
                        sla_value: totalMinutes > 0 ? Math.max(1, Math.round(totalMinutes / 1440)) : 0
                    };
                }

                // ==================================================
                // HISTORY — WHO THE FILE SAYS ACTUALLY TOUCHED THIS ROW
                //
                // BUG FIX ("History always shows the uploading admin, not
                // Satyajit Nayak / whoever the file actually names"): the
                // row's own History column (when present) already records
                // exactly who did what and when — that is used to
                // attribute the CREATED entry, and seedHistoryFromFile()
                // below re-creates every one of its entries as real
                // history rows after the Action Point exists. Falls back
                // to the row's own "Assigned To" name when there's no
                // History column at all, and only ever falls back to the
                // uploading admin (the default in models/
                // actionPointModel.js) when the file names no one.
                // ==================================================

                const historyEntries = parseHistoryColumn(row["History"]);
                const latestHistoryEntry = historyEntries[historyEntries.length - 1] || null;

                let historyActorId = null;
                let historyActorName = null;

                if (latestHistoryEntry?.actorName) {
                    const actor = await resolveHistoryActor(latestHistoryEntry.actorName);
                    historyActorId = actor.userId;
                    historyActorName = actor.name;
                }

                if (!historyActorId && !historyActorName) {
                    const assignedToRaw = String(row["Assigned To"] || "").trim();
                    if (assignedToRaw) {
                        historyActorId = assignedToUserId;
                        historyActorName = assignedToUserId ? null : assignedToRaw;
                    }
                }

                const actionPointBody = {
                    submission_id: reportResult.submissionId,
                    submission_answer_id: reportResult.answerId,
                    department_id: departmentId,
                    assigned_to: assignedToUserId,
                    priority: row["Priority"] || "Medium",
                    ...slaBody,
                    remarks: row["Remarks"] || "",
                    // BUG FIX: a file's own "Comment" column used to never
                    // reach an open Action Point at all — only the Closed/
                    // "no action required" path below ever set `comment`
                    // (and only to the Action Taken text). Any Comment text
                    // the row actually had was silently dropped.
                    comment: row["Comment"] || "",
                    history_changed_by: historyActorId,
                    history_changed_by_name: historyActorName
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

                    const actionTakenText = String(row["Action Taken"] || "").trim();
                    const rowCommentText = String(row["Comment"] || "").trim();

                    // Keep the row's own Comment text instead of discarding
                    // it whenever an Action Taken value is also present —
                    // both are shown (Action Taken first, since that's the
                    // resolution), only falling back to a generic note when
                    // the row genuinely has neither.
                    const closedComment = [actionTakenText, rowCommentText]
                        .filter(Boolean)
                        .join(" | ") || "No action required.";

                    const closedResult = await actionPointService.createClosedFromImport(
                        {
                            ...actionPointBody,
                            comment: closedComment
                        },
                        req.user.id
                    );

                    if (historyEntries.length) {
                        await seedHistoryFromFile(closedResult.id, historyEntries);
                    }

                    return {
                        rowNumber,
                        movedToReport: { row: rowNumber, submissionId: reportResult.submissionId }
                    };

                } else {

                    const result = await actionPointService.createManual(
                        {
                            ...actionPointBody,
                            // BUG FIX: raw file text like "in progress" or
                            // "WIP" never matched the strict status ENUM
                            // and fell back to "Open" — see
                            // normalizeActionPointStatus() above.
                            status: normalizeActionPointStatus(row["Status"], "Open")
                        },
                        row["Attachment"] || null,
                        req.user.id,
                        { sendEmail: false }
                    );

                    if (historyEntries.length) {
                        await seedHistoryFromFile(result.id, historyEntries);
                    }

                    return {
                        rowNumber,
                        created: { row: rowNumber, id: result.id }
                    };
                }

            } catch (rowError) {
                return { rowNumber, error: `Row ${rowNumber}: ${rowError.message}` };
            }
        };


            for (let start = 0; start < rows.length; start += BULK_UPLOAD_CONCURRENCY) {
                const batch = rows.slice(start, start + BULK_UPLOAD_CONCURRENCY);

                const batchResults = await Promise.all(
                    batch.map((row, offset) => processRow(row, start + offset + 2))
                );

                batchResults.sort((a, b) => a.rowNumber - b.rowNumber);

                for (const result of batchResults) {
                    if (result.error) errors.push(result.error);
                    if (result.created) created.push(result.created);
                    if (result.movedToReport) movedToReports.push(result.movedToReport);
                }

                updateJob(job.id, {
                    processed: Math.min(start + batch.length, rows.length),
                    created: created.length,
                    movedToReports: movedToReports.length,
                    skipped: errors.length,
                    errors,
                    warnings,
                    message: `Importing Action Points… ${Math.min(start + batch.length, rows.length).toLocaleString()} of ${rows.length.toLocaleString()} processed`
                });
            }

            if (!created.length && !movedToReports.length) {
                finishJob(job.id, {
                    success: false,
                    processed: rows.length,
                    created: 0,
                    movedToReports: 0,
                    skipped: errors.length,
                    errors,
                    warnings,
                    message: "No Action Points were created and no rows could be filed as Checklist Reports."
                });
                return;
            }

            const messageParts = [];
            if (created.length) messageParts.push(`${created.length.toLocaleString()} Action Point(s) created`);
            if (movedToReports.length) {
                messageParts.push(
                    `${movedToReports.length.toLocaleString()} row(s) filed as Checklist Reports`
                );
            }
            if (errors.length) {
                messageParts.push(`${errors.length.toLocaleString()} row(s) need review`);
            }

            finishJob(job.id, {
                success: true,
                processed: rows.length,
                created: created.length,
                movedToReports: movedToReports.length,
                skipped: errors.length,
                errors,
                warnings,
                message: `Bulk upload completed. ${messageParts.join(", ")}.`
            });

        } catch (error) {
            console.error("BULK ACTION POINT UPLOAD ERROR:", error);

            finishJob(job.id, {
                success: false,
                message: "Unable to bulk upload Action Points.",
                errors: [error.message || "Unknown import error."]
            });
        } finally {
            if (uploadedPath) {
                try {
                    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
                } catch (cleanupError) {
                    console.warn(
                        "Unable to remove Action Point bulk-upload file:",
                        cleanupError.message
                    );
                }
            }
        }
    };

    setImmediate(() => {
        runImport().catch((error) => {
            console.error("ACTION POINT BULK JOB UNHANDLED ERROR:", error);
        });
    });

    return res.status(202).json({
        success: true,
        processing: true,
        jobId: job.id,
        statusUrl: `/api/action-points/bulk-upload/status/${job.id}`,
        message: "File received successfully. Import is now running in the background."
    });
};

exports.getActionPointBulkUploadStatus = (req, res) => {
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
            ? storedUploadPath(req.file)
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
            ? storedUploadPath(req.file)
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
// ASSIGNEES (users for the "Assigned To" dropdown)
// GET /api/action-points/assignees
// ======================================================

exports.getAssignees = async (req, res) => {
    try {
        const ActionPointModel = require("../models/actionPointModel");
        const rows = await ActionPointModel.getAssignees();
        return res.json({ success: true, data: rows || [] });
    } catch (error) {
        console.error("ACTION POINT ASSIGNEES ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to load users." });
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

        // Filters applied on the page -> the client sends the matching ids
        // and only those Action Points are deleted. No filters -> all.
        const scope = readDeleteScope(req);
        const result = await actionPointService.deleteAll(
            req.user.id,
            scope.filtered ? (scope.ids || []) : null
        );
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
    getActionPointBulkUploadStatus: exports.getActionPointBulkUploadStatus,
    createActionPoint: exports.createActionPoint,
    updateActionPoint: exports.updateActionPoint,
    getAssignees: exports.getAssignees,
    takeAction: exports.takeAction,
    getActionPointHistory: exports.getActionPointHistory,
    changeActionPointStatus: exports.changeActionPointStatus,
    deleteActionPoint: exports.deleteActionPoint,
    deleteAllActionPoints: exports.deleteAllActionPoints
};
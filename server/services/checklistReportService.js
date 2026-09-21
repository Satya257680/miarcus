// ==========================================================
// CHECKLIST REPORT SERVICE
// ==========================================================
//
// Shared "create one Checklist Report row from a loosely
// structured bulk-upload row" helper.
//
// A Checklist Report is really a checklist submission (+ one
// answer) under the hood (see models/checklistReportModel.js
// and models/checklistSubmissionModel.js). This service
// resolves the human-readable text a spreadsheet/PDF/photo
// row actually contains (Store name, Checklist Type name,
// Employee name/ID/email, Question text, ...) into the
// numeric IDs the database needs, tolerating case differences,
// extra whitespace, and partial matches rather than requiring
// an exact match.
//
// Used by:
//   - controllers/checklistReportController.js  (direct bulk upload)
//   - controllers/actionPointController.js       (every bulk-uploaded
//     Action Point row is filed here too, so it is preserved and
//     visible in Checklist Reports — either immediately, when the row
//     says no action is required, or automatically once its linked
//     Action Point is closed. See createFromRow's `allowSynthetic`
//     option below.)
// ==========================================================

const db = require("../config/db");
const ChecklistSubmission = require("../models/checklistSubmissionModel");
const { resolveStoreIdFuzzy } = require("../utils/storeMatcher");

const queryOne = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows?.[0] || null);
        });
    });

const runQuery = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });

const hasValue = (value) =>
    value !== undefined && value !== null && String(value).trim() !== "";

// ======================================================
// SYNTHETIC CHECKLIST TYPE / QUESTION
// ======================================================
//
// Checklist Reports are, under the hood, always a checklist
// submission + answer (see models/checklistSubmissionModel.js —
// `checklist_submission_answers.question_id` is NOT NULL). A bulk
// Action Point upload very often has no "Checklist Type"/"Question"
// column at all — it is describing a one-off finding, not a
// configured checklist. Rather than dropping that row (or refusing
// to file it as a report), a single reusable "Action Points (Bulk
// Import)" checklist type/question is created on first use and
// reused after that, purely so the row has somewhere real to live.
// The original uploaded Question text (if any) is never discarded —
// it is preserved in the answer's Remarks.
// ======================================================

const SYNTHETIC_CHECKLIST_TYPE_NAME = "Action Points (Bulk Import)";
const SYNTHETIC_QUESTION_TEXT = "Action Point Item (Bulk Import)";

async function ensureSyntheticChecklistType() {

    const existing = await queryOne(
        `SELECT id FROM checklist_types WHERE checklist_name = ? LIMIT 1`,
        [SYNTHETIC_CHECKLIST_TYPE_NAME]
    );

    if (existing?.id) return existing.id;

    const result = await runQuery(
        `INSERT INTO checklist_types (checklist_name, allow_past_submission, cutoff_time, status)
         VALUES (?, 1, NULL, 'Active')`,
        [SYNTHETIC_CHECKLIST_TYPE_NAME]
    );

    return result.insertId;
}

async function ensureSyntheticQuestion(checklistTypeId) {

    const existing = await queryOne(
        `SELECT id FROM questions WHERE checklist_type_id = ? AND question = ? LIMIT 1`,
        [checklistTypeId, SYNTHETIC_QUESTION_TEXT]
    );

    if (existing?.id) return existing.id;

    const result = await runQuery(
        `INSERT INTO questions
            (checklist_type_id, question, sequence_no, answer_type, sla_value, sla_unit, answer_required, status)
         VALUES (?, ?, 0, 'Text', NULL, NULL, 0, 'Active')`,
        [checklistTypeId, SYNTHETIC_QUESTION_TEXT]
    );

    return result.insertId;
}

// ======================================================
// STORE
// ======================================================

async function resolveStoreId(row) {
    const raw = String(row["Store"] || "").trim();
    if (!raw) return null;

    // Shared with Action Points (see utils/storeMatcher.js) so a store
    // recognized here is recognized the same way in every other bulk
    // upload — including composite exported labels like
    // "MRPL - MVN DEHRADUN (589)" that a plain substring match misses.
    return resolveStoreIdFuzzy(raw);
}

// ======================================================
// CHECKLIST TYPE
// ======================================================

async function resolveChecklistTypeId(row) {
    const raw = String(row["Checklist Type"] || "").trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) return Number(raw);

    let type = await queryOne(
        `SELECT id FROM checklist_types WHERE LOWER(checklist_name) = LOWER(?) LIMIT 1`,
        [raw]
    );

    if (!type) {
        type = await queryOne(
            `SELECT id FROM checklist_types WHERE checklist_name LIKE ? LIMIT 1`,
            [`%${raw}%`]
        );
    }

    return type?.id || null;
}

// ======================================================
// EMPLOYEE / SUBMITTED BY
// ======================================================
//
// Real-world exports (see the Checklist Reports "Employee" column)
// commonly write the employee as "Rahul (40090)" — Name followed by
// the Employee ID in parentheses — rather than a bare name or a bare
// ID. The previous version of this matcher only tried the raw string
// as-is against employee_id/email/name, which never matches that
// combined format, so the row's employee could never be resolved and
// silently fell back to whoever ran the bulk upload (see
// createFromRow below — that fallback has been removed for exactly
// this reason).
//
// Returns both the resolved user id (when found) AND the raw
// name/employee-code text that was in the spreadsheet, so the caller
// can store the raw text as an "exact as Excel" fallback even when no
// matching Users record exists (see submitted_by_name /
// submitted_by_employee_code — models/checklistSubmissionModel.js).
// ======================================================

async function resolveUserId(row) {
    const raw = String(row["Employee"] || row["Assigned To"] || "").trim();
    if (!raw) {
        return { userId: null, rawName: null, rawEmployeeCode: null };
    }

    if (/^\d+$/.test(raw)) {
        return { userId: Number(raw), rawName: null, rawEmployeeCode: null };
    }

    // "Name (ID)" / "Name (Employee Code)", e.g. "Rahul (40090)".
    const parenMatch = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const namePart = (parenMatch ? parenMatch[1] : raw).trim();
    const idPart = parenMatch ? parenMatch[2].trim() : null;

    // Employee ID (from the parentheses) is the most reliable anchor
    // when present — try it before falling back to a name match.
    let user = null;

    if (idPart) {
        user = await queryOne(
            `SELECT id FROM users WHERE employee_id = ? LIMIT 1`,
            [idPart]
        );
    }

    if (!user) {
        user = await queryOne(
            `SELECT id FROM users
             WHERE employee_id = ? OR email = ? OR LOWER(name) = LOWER(?)
             LIMIT 1`,
            [raw, raw, namePart || raw]
        );
    }

    return {
        userId: user?.id || null,
        rawName: namePart || raw,
        rawEmployeeCode: idPart
    };
}

// ======================================================
// QUESTION
// ======================================================

async function resolveQuestionId(row, checklistTypeId) {
    const raw = String(row["Question"] || "").trim();
    if (!raw) return null;

    if (row["Question ID"] && /^\d+$/.test(String(row["Question ID"]).trim())) {
        return Number(row["Question ID"]);
    }

    let question = null;

    if (checklistTypeId) {
        question = await queryOne(
            `SELECT id FROM questions
             WHERE checklist_type_id = ? AND LOWER(question) = LOWER(?)
             LIMIT 1`,
            [checklistTypeId, raw]
        );

        if (!question) {
            question = await queryOne(
                `SELECT id FROM questions
                 WHERE checklist_type_id = ? AND question LIKE ?
                 LIMIT 1`,
                [checklistTypeId, `%${raw}%`]
            );
        }
    }

    if (!question) {
        question = await queryOne(
            `SELECT id FROM questions WHERE LOWER(question) = LOWER(?) LIMIT 1`,
            [raw]
        );
    }

    return question?.id || null;
}

// ======================================================
// "TODAY", IN THE BUSINESS'S OWN TIMEZONE (Asia/Kolkata)
// ======================================================
//
// BUG FIX — bulk-upload timing was not "real time":
// `new Date().toISOString().slice(0, 10)` reads the calendar date in
// UTC. The server/DB run in UTC while the business operates in IST
// (UTC+5:30), so any bulk-upload row uploaded between 12:00 AM and
// 5:29 AM IST — a normal window for an overnight batch upload — was
// silently stamped with the PREVIOUS day's date. That's the same
// class of bug already fixed for Daily Collection/Attendance (see
// controllers/dailyCollectionController.js's `indiaToday()` and
// controllers/locationController.js) — this brings bulk-upload
// Submission Date defaulting in line with the same fix.
// ======================================================

const indiaToday = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

function parseSubmissionDate(row) {
    // "Actual Submission Time" (e.g. "8/31/2026, 12:37:52 PM") is the real
    // moment the checklist was submitted and is preferred over "Submission
    // Date"/"Intended Date" (a target/due date, which can differ from when
    // the row was actually submitted) when both are present.
    const raw = hasValue(row["Actual Submission Time"])
        ? row["Actual Submission Time"]
        : row["Submission Date"];

    if (!hasValue(raw)) {
        return indiaToday();
    }

    // A plain "YYYY-MM-DD" (or "DD/MM/YYYY", "DD-MM-YYYY") date-only value
    // has no timezone of its own — use it exactly as written instead of
    // routing it through `new Date(...)`, which would otherwise treat it
    // as UTC midnight and can shift it by a day once reformatted.
    const text = String(raw).trim();

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const dmyMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    const asDate = new Date(raw);

    if (Number.isNaN(asDate.getTime())) {
        return indiaToday();
    }

    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(asDate);
}

// ======================================================
// GEO LOCATION (combined "lat, long" export column)
// ======================================================
//
// The Checklist Reports export writes a single "Geo Location" column
// as "31.63772454868624, 74.87554918696547" rather than separate
// Latitude/Longitude columns. Explicit Latitude/Longitude columns
// (when a file has them) always win; this is only a fallback so the
// combined format re-imports cleanly too.
// ======================================================

function parseGeoLocation(row) {
    const raw = String(row["Geo Location"] || "").trim();
    if (!raw) return { latitude: null, longitude: null };

    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return { latitude: null, longitude: null };

    const latitude = Number(parts[0]);
    const longitude = Number(parts[1]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return { latitude: null, longitude: null };
    }

    return { latitude, longitude };
}

// ======================================================
// CREATE ONE REPORT ROW (checklist submission + answer)
// FROM A BULK-UPLOAD ROW
//
// Only Store and Checklist Type are hard requirements — a row
// missing either of those genuinely cannot be filed anywhere,
// so it throws with a message identifying exactly what
// couldn't be recognised (surfaced back to the admin as the
// per-row "problem").
//
// Question/Answer are optional: if the question text in the
// row doesn't match any configured question, the submission is
// still created (so the store/date/employee data isn't lost)
// but without an answer row, and `questionMatched: false` is
// returned so the caller can report that as a warning rather
// than a hard failure.
//
// options.allowSynthetic (used by the Action Points bulk uploader —
// see controllers/actionPointController.js): when true, a missing/
// unrecognized Checklist Type or Question never fails the row. A
// shared "Action Points (Bulk Import)" checklist type/question is
// used instead (created once, reused after that), and the row's own
// Question text (if any) is preserved in the answer's Remarks rather
// than being dropped. This guarantees every row gets a real answer
// row — and therefore an `answerId` — to attach an Action Point to.
// ======================================================

async function createFromRow(row, fallbackUserId, options = {}) {
    const { allowSynthetic = false } = options;

    const storeRaw = row["Store"];
    const checklistRaw = row["Checklist Type"];

    let storeId = await resolveStoreId(row);
    let checklistTypeId = await resolveChecklistTypeId(row);

    // A row that references an existing checklist Submission ID (e.g. a
    // fallback row coming from the Action Points bulk upload, which may
    // not have its own Checklist Type column) can borrow Store/Checklist
    // Type from that submission instead of failing outright.
    const submissionRef = row["Submission ID"];
    if ((!storeId || !checklistTypeId) && hasValue(submissionRef) && /^\d+$/.test(String(submissionRef).trim())) {
        const submission = await queryOne(
            `SELECT store_id, checklist_type_id FROM checklist_submissions WHERE id = ? LIMIT 1`,
            [Number(submissionRef)]
        );

        if (submission) {
            if (!storeId && submission.store_id) storeId = submission.store_id;
            if (!checklistTypeId && submission.checklist_type_id) checklistTypeId = submission.checklist_type_id;
        }
    }

    if (!storeId) {
        const err = new Error(
            hasValue(storeRaw)
                ? `Store "${storeRaw}" was not recognized.`
                : "No Store was provided."
        );
        err.code = "STORE_NOT_FOUND";
        throw err;
    }

    let usedSyntheticType = false;

    if (!checklistTypeId) {
        if (allowSynthetic) {
            checklistTypeId = await ensureSyntheticChecklistType();
            usedSyntheticType = true;
        } else {
            const err = new Error(
                hasValue(checklistRaw)
                    ? `Checklist Type "${checklistRaw}" was not recognized.`
                    : "No Checklist Type was provided."
            );
            err.code = "CHECKLIST_TYPE_NOT_FOUND";
            throw err;
        }
    }

    // ======================================================
    // EMPLOYEE — NO SILENT FALLBACK TO THE UPLOADER
    // ======================================================
    //
    // BUG FIX: this used to fall back to `fallbackUserId` (the admin
    // running the bulk upload) whenever the row's own Employee value
    // didn't resolve to a Users record — which made every unmatched
    // row look like it was submitted by whoever clicked "Bulk Upload".
    // Now: a matched employee is used as-is; an unmatched one leaves
    // submitted_by NULL and instead preserves the row's own text in
    // submitted_by_name/submitted_by_employee_code so the report still
    // shows exactly what the spreadsheet said (see
    // models/checklistReportModel.js's COALESCE) instead of someone
    // else's name.
    // ======================================================

    const employeeMatch = await resolveUserId(row);
    const submittedBy = employeeMatch.userId || null;

    let questionId = await resolveQuestionId(row, checklistTypeId);
    let usedSyntheticQuestion = false;

    if (!questionId && allowSynthetic) {
        questionId = await ensureSyntheticQuestion(checklistTypeId);
        usedSyntheticQuestion = true;
    }

    const answers = [];
    if (questionId) {

        // Never lose the row's own wording just because it couldn't be
        // matched to a configured question — keep it in Remarks instead.
        const remarksParts = [];
        if (usedSyntheticQuestion && hasValue(row["Question"])) {
            remarksParts.push(`Question: ${String(row["Question"]).trim()}`);
        }
        if (hasValue(row["Remarks"])) {
            remarksParts.push(String(row["Remarks"]).trim());
        }

        answers.push({
            question_id: questionId,
            answer: row["Answer"] || "",
            remarks: remarksParts.join(" | ")
        });
    }

    const geo = parseGeoLocation(row);
    const departmentRaw = String(row["Department"] || row["Departments"] || "").trim();

    const submission = {
        checklist_type_id: checklistTypeId,
        store_id: storeId,
        submitted_by: submittedBy,
        // Only ever displayed when submitted_by has no matching Users
        // record — see COALESCE in models/checklistReportModel.js.
        submitted_by_name: submittedBy ? null : employeeMatch.rawName,
        submitted_by_employee_code: submittedBy ? null : employeeMatch.rawEmployeeCode,
        department_override: departmentRaw || null,
        submission_date: parseSubmissionDate(row),
        latitude: hasValue(row["Latitude"]) ? Number(row["Latitude"]) : geo.latitude,
        longitude: hasValue(row["Longitude"]) ? Number(row["Longitude"]) : geo.longitude,
        device: row["Device"] || "Bulk Import",
        status: "Submitted"
    };

    const result = await new Promise((resolve, reject) => {
        ChecklistSubmission.create(submission, answers, (err, created) => {
            if (err) return reject(err);
            resolve(created);
        });
    });

    // Exactly zero or one answer is ever created per row here, so the most
    // recently inserted answer for this submission (if any) is unambiguous.
    let answerId = null;
    if (answers.length) {
        const answerRow = await queryOne(
            `SELECT id FROM checklist_submission_answers WHERE submission_id = ? ORDER BY id DESC LIMIT 1`,
            [result.submissionId]
        );
        answerId = answerRow?.id || null;
    }

    return {
        submissionId: result.submissionId,
        answerId,
        // Resolved Users.id for the row's Employee/Assigned To text (or
        // null when it didn't match anyone) — reused by the Action
        // Points bulk uploader so `assigned_to` (an INT column) is never
        // handed the raw "Rahul (40090)" text directly. See
        // controllers/actionPointController.js.
        submittedByUserId: submittedBy,
        questionMatched: Boolean(questionId) && !usedSyntheticQuestion,
        usedSyntheticType
    };
}

module.exports = {
    createFromRow,
    resolveStoreId,
    resolveChecklistTypeId,
    resolveUserId,
    resolveQuestionId
};

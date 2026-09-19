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
//   - controllers/actionPointController.js       (fallback: a bulk
//     Action Point row that isn't actionable — no action actually
//     taken/assigned — is recorded here instead of being dropped)
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

const hasValue = (value) =>
    value !== undefined && value !== null && String(value).trim() !== "";

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

async function resolveUserId(row) {
    const raw = String(row["Employee"] || row["Assigned To"] || "").trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) return Number(raw);

    const user = await queryOne(
        `SELECT id FROM users
         WHERE employee_id = ? OR email = ? OR LOWER(name) = LOWER(?)
         LIMIT 1`,
        [raw, raw, raw]
    );

    return user?.id || null;
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

function parseSubmissionDate(row) {
    const raw = row["Submission Date"];

    if (!hasValue(raw)) {
        return new Date().toISOString().slice(0, 10);
    }

    const asDate = new Date(raw);

    if (Number.isNaN(asDate.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }

    return asDate.toISOString().slice(0, 10);
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
// ======================================================

async function createFromRow(row, fallbackUserId) {
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

    if (!checklistTypeId) {
        const err = new Error(
            hasValue(checklistRaw)
                ? `Checklist Type "${checklistRaw}" was not recognized.`
                : "No Checklist Type was provided."
        );
        err.code = "CHECKLIST_TYPE_NOT_FOUND";
        throw err;
    }

    const submittedBy = (await resolveUserId(row)) || fallbackUserId || null;
    const questionId = await resolveQuestionId(row, checklistTypeId);

    const answers = [];
    if (questionId) {
        answers.push({
            question_id: questionId,
            answer: row["Answer"] || "",
            remarks: row["Remarks"] || ""
        });
    }

    const submission = {
        checklist_type_id: checklistTypeId,
        store_id: storeId,
        submitted_by: submittedBy,
        submission_date: parseSubmissionDate(row),
        latitude: hasValue(row["Latitude"]) ? Number(row["Latitude"]) : null,
        longitude: hasValue(row["Longitude"]) ? Number(row["Longitude"]) : null,
        device: row["Device"] || "Bulk Import",
        status: "Submitted"
    };

    const result = await new Promise((resolve, reject) => {
        ChecklistSubmission.create(submission, answers, (err, created) => {
            if (err) return reject(err);
            resolve(created);
        });
    });

    return {
        submissionId: result.submissionId,
        questionMatched: Boolean(questionId)
    };
}

module.exports = {
    createFromRow,
    resolveStoreId,
    resolveChecklistTypeId,
    resolveUserId,
    resolveQuestionId
};

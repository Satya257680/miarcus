// ======================================================
// N/A (NOT APPLICABLE) ANSWERS
// ------------------------------------------------------
// A checklist answer of "N/A" means the item / feature the question
// asks about is not present at the store. Such an answer:
//   • never creates an Action Point (inspection + Re-check),
//   • never needs photo evidence,
//   • is listed in the "N/A Register" module.
//
// The same spellings are recognised by utils/answerClassifier.js and
// utils/issueRuleEvaluator.js. SQL_NA_VALUES is used to find these
// answers in checklist_submission_answers.
// ======================================================

const NA_VALUES = [
    "n/a",
    "na",
    "n.a",
    "n.a.",
    "n a",
    "not applicable",
    "not-applicable",
    "notapplicable"
];

const normalize = (value) =>
    String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

const isNotApplicableAnswer = (value) => {
    const text = normalize(value).replace(/[!]+$/, "").trim();
    if (!text) return false;
    return NA_VALUES.includes(text);
};

// For  LOWER(TRIM(csa.answer)) IN (?)
const SQL_NA_VALUES = NA_VALUES;

module.exports = {
    NA_VALUES,
    SQL_NA_VALUES,
    isNotApplicableAnswer
};

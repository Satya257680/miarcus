// ======================================================
// EXPECTED (NORMAL) ANSWER FOR YES / NO QUESTIONS
// ------------------------------------------------------
// questions.expected_answer = 'Yes' | 'No'
//
// With Photo Evidence = Auto, Checklist Submission makes a
// photo mandatory only when the user picks the OTHER
// (unexpected) answer:
//
//   "Are there any paint issues?"         expected No  → Yes needs a photo
//   "Is the fire extinguisher available?" expected Yes → No needs a photo
//
// suggestExpectedAnswer() only gives a starting value from the
// wording; the admin can always change it in Questions.
// Same logic lives in client/src/config/checklistPhotoRules.js.
// ======================================================

const isYesNoType = (answerType) => {
    const key = String(answerType || "").toLowerCase().replace(/[^a-z]/g, "");
    return key === "yesno" || key === "boolean";
};

const normalizeExpectedAnswer = (value) => {
    const text = String(value ?? "").trim().toLowerCase();
    if (["yes", "y", "true", "1"].includes(text)) return "Yes";
    if (["no", "n", "false", "0"].includes(text)) return "No";
    return "";
};

const PROBLEM_WORDS = new RegExp(
    "\\b(" +
        [
            "issues?", "problems?", "damaged?", "damages", "broken", "breakage",
            "leak(s|age|ing)?", "seepage", "cracks?", "cracked", "blocked", "blockage",
            "missing", "complaints?", "dirty", "dust(y)?", "pests?", "rats?", "rodents?",
            "cockroach(es)?", "insects?", "termites?", "expired", "defects?", "defective",
            "faulty", "faults?", "stains?", "stained", "spills?", "theft", "shortages?",
            "errors?", "hazards?", "smell(s|ing)?", "odou?r", "fungus", "mou?ld",
            "peeling", "loose", "discrepanc(y|ies)", "mismatch(es)?", "unauthori[sz]ed",
            "pending", "overdue", "out of stock", "not working", "not clean",
            "not available", "not functional", "malfunction(ing)?", "short circuit",
            "water logging", "tampered", "torn", "rust(y)?", "garbage", "litter"
        ].join("|") +
    ")\\b",
    "i"
);

const suggestExpectedAnswer = (questionText) =>
    PROBLEM_WORDS.test(String(questionText || "")) ? "No" : "Yes";

module.exports = {
    isYesNoType,
    normalizeExpectedAnswer,
    suggestExpectedAnswer
};

// ======================================================
// CHECKLIST QUESTIONS THAT NEED A PHOTO
// ------------------------------------------------------
// From "Store Checklist Opening.xlsx" and
// "Store Closing Checklist.xlsx" – every question whose
// Remarks column says "Required" must be answered with
// photo evidence in Checklist Submission.
//
// Same list as server/config/checklistPhotoRules.js.
// An administrator can still override any question in
// Questions → Photo Evidence (Optional / None / …).
// ======================================================

export const PHOTO_REQUIRED_QUESTIONS = [
    // ---------------- Store Checklist (Opening) ----------------
    "Are there any paint issues?",
    "Are there any tile issues?",
    "Are there any facade issues?",
    "Clean the Facade",
    "Jiffy the stock?",
    "Has the stock from stock room taken and placed in the store?",
    "Are facade lights working?",
    "Any issues in store branding outside or inside the store",

    // ---------------- Store Closing Checklist ----------------
    "Share stock room picture",
    "Share closing store picture",
];

export const normalizeQuestion = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const PHOTO_REQUIRED_SET = new Set(PHOTO_REQUIRED_QUESTIONS.map(normalizeQuestion));

export const isPhotoRequiredQuestion = (text) =>
    PHOTO_REQUIRED_SET.has(normalizeQuestion(text));

// ======================================================
// EXPECTED (NORMAL) ANSWER FOR YES / NO QUESTIONS
// ------------------------------------------------------
// Every Yes / No question has a normal answer, chosen by the
// admin in Questions → "Expected / Normal Answer".
// With Photo Evidence = Auto, a photo becomes mandatory only
// when the user picks the OTHER (unexpected) answer:
//
//   "Are there any paint issues?"      expected No  → Yes needs a photo
//   "Is the fire extinguisher available?" expected Yes → No needs a photo
//
// suggestExpectedAnswer() is only a starting suggestion from the
// wording — the admin can always change it.
// Same logic lives in server/config/checklistExpectedAnswer.js.
// ======================================================

export const isYesNoType = (answerType) => {
    const key = String(answerType || "").toLowerCase().replace(/[^a-z]/g, "");
    return key === "yesno" || key === "boolean";
};

export const normalizeExpectedAnswer = (value) => {
    const text = String(value ?? "").trim().toLowerCase();
    if (["yes", "y", "true", "1"].includes(text)) return "Yes";
    if (["no", "n", "false", "0"].includes(text)) return "No";
    return "";
};

// Words that describe a problem being present. If the question asks
// whether a problem exists, the normal answer is "No".
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

export const suggestExpectedAnswer = (questionText) =>
    PROBLEM_WORDS.test(String(questionText || "")) ? "No" : "Yes";

export const expectedAnswerOf = (question = {}) =>
    normalizeExpectedAnswer(question.expected_answer) ||
    suggestExpectedAnswer(question.question || question.question_text || question.title);

export const unexpectedAnswerOf = (question = {}) =>
    expectedAnswerOf(question) === "Yes" ? "No" : "Yes";

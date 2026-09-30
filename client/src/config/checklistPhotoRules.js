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

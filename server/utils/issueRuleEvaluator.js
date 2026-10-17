// ======================================================
// ISSUE CONTROL CENTER — RULE EVALUATOR (single source of truth)
// ======================================================
//
// Decides, for ONE submitted checklist answer and the ONE active Issue
// Control Center rule of its question, whether the answer is an issue
// (→ Action Point) or not (→ Checklist Reports).
//
// Used by BOTH new checklist submissions (inspectionService) and the
// historical Re-check (actionPointReclassifyService) so equivalent
// answers and rules always give the same result.
//
// Rule options
//   Expected / no-issue answer : Yes | No | N/A | <exact text>
//   Issue-trigger answer       : Yes | No | Any non-empty answer |
//                                Blank answer | <exact text>
//
// Meaning
//   • Expected "N/A"            → ANY non-empty response is acceptable
//                                 ("No", "Yes", "10", written text …).
//                                 The user never has to type "N/A".
//   • Trigger  "Blank answer"   → only an unanswered / blank / whitespace
//                                 response is an issue.
//   • Trigger  "Any non-empty answer" → a non-empty answer that is NOT the
//                                 configured no-issue answer is an issue.
//                                 It never overrides the no-issue answer
//                                 (so it never applies with "N/A").
//   • A blank answer is an issue ONLY when the trigger is "Blank answer".
//   • A literal "N/A" answer is never an issue unless the trigger itself
//     is "N/A" (existing ICC rule: "N/A should not create an Action
//     Point").
//   • An answer matching neither the no-issue nor the issue-trigger
//     answer is NOT an issue (only the configured trigger raises one).
//   • No rule → no decision (the caller skips the answer).
//
// Comparison normalises case and whitespace; the original submitted
// answer is never modified.
// ======================================================

const ISSUE_ANY_NON_EMPTY = "Any non-empty answer";
const ISSUE_BLANK = "Blank answer";
const EXPECTED_NA = "N/A";

const EXPECTED_OPTIONS = ["Yes", "No", EXPECTED_NA];
const ISSUE_OPTIONS = ["Yes", "No", ISSUE_ANY_NON_EMPTY, ISSUE_BLANK];

const YES_WORDS = new Set(["yes", "y", "yeah", "yep", "true", "haan", "ha", "han"]);
const NO_WORDS = new Set(["no", "n", "nope", "false", "nahi", "nhi"]);
const NA_WORDS = new Set(["n/a", "na", "n.a", "n.a.", "n a", "not applicable", "not-applicable", "notapplicable"]);
const ANY_WORDS = new Set(["any non-empty answer", "any non empty answer", "any nonempty answer", "any answer", "any non-empty"]);
const BLANK_WORDS = new Set(["blank answer", "blank", "no answer", "(blank)", "empty", "empty answer", "blank / no answer", "blank/no answer", "unanswered"]);

const normalize = (value) =>
    String(value ?? "")
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

const stripEnd = (text) => text.replace(/[.!]+$/, "").trim();

// Canonical form of a configured rule option.
const canonicalOption = (value) => {
    const text = stripEnd(normalize(value));
    if (!text) return { kind: "empty", text };
    if (YES_WORDS.has(text)) return { kind: "yes", text };
    if (NO_WORDS.has(text)) return { kind: "no", text };
    if (NA_WORDS.has(text)) return { kind: "na", text };
    if (ANY_WORDS.has(text)) return { kind: "any_non_empty", text };
    if (BLANK_WORDS.has(text)) return { kind: "blank", text };
    return { kind: "text", text };
};

// Canonical form of a submitted answer.
const canonicalAnswer = (value) => {
    const text = normalize(value);
    if (!text) return { kind: "blank", text, yn: null };

    const bare = stripEnd(text);
    if (NA_WORDS.has(bare) || /^(n\/a|not applicable)\b/.test(bare)) {
        return { kind: "na", text, yn: null };
    }

    // "Yes", "Yes, 9 pm", "No - all fine", "no gc today"
    const firstWord = bare.split(/[\s,;:\-/()]+/)[0];
    let yn = null;
    if (YES_WORDS.has(bare) || YES_WORDS.has(firstWord)) yn = "yes";
    else if (NO_WORDS.has(bare) || NO_WORDS.has(firstWord)) yn = "no";

    return { kind: yn ? "yesno" : "text", text, bare, yn };
};

const answerMatches = (option, answer) => {
    if (option.kind === "yes" || option.kind === "no") return answer.yn === option.kind;
    if (option.kind === "na") return answer.kind === "na";
    if (option.kind === "text") return answer.text === option.text || answer.bare === option.text;
    return false;
};

// ------------------------------------------------------
// evaluateAnswer(answerValue, rule)
//   → { issue: boolean, outcome, reason }
//   outcome: "no_rule" | "issue" | "no_issue" | "unmatched"
// ------------------------------------------------------
const evaluateAnswer = (answerValue, rule) => {
    if (!rule) {
        return { issue: false, outcome: "no_rule", reason: "No active Issue Control Center rule." };
    }

    const expected = canonicalOption(rule.expected_answer);
    const trigger = canonicalOption(rule.issue_answer);
    const answer = canonicalAnswer(answerValue);

    // 1. Blank answer — an issue only when blank is the configured trigger.
    if (answer.kind === "blank") {
        return trigger.kind === "blank"
            ? { issue: true, outcome: "issue", reason: "Blank answer is the configured issue trigger." }
            : { issue: false, outcome: "no_issue", reason: "Blank answer is not configured as an issue for this rule." };
    }

    // 2. "Blank answer" trigger — every non-empty response is fine.
    if (trigger.kind === "blank") {
        return { issue: false, outcome: "no_issue", reason: "Answered (any non-empty response is acceptable)." };
    }

    // 3. Expected "N/A" — every non-empty response is fine.
    if (expected.kind === "na") {
        return { issue: false, outcome: "no_issue", reason: "No-issue answer is N/A: any non-empty response is acceptable." };
    }

    // 4. A literal "N/A" answer never raises an Action Point unless
    //    N/A itself is the trigger.
    if (answer.kind === "na" && trigger.kind !== "na") {
        return { issue: false, outcome: "no_issue", reason: "N/A answer does not create an Action Point." };
    }

    // 5. The configured no-issue answer always wins.
    if (answerMatches(expected, answer)) {
        return { issue: false, outcome: "no_issue", reason: "Matches the configured no-issue answer." };
    }

    // 6. Any non-empty answer (other than the no-issue answer).
    if (trigger.kind === "any_non_empty") {
        return { issue: true, outcome: "issue", reason: "Non-empty answer other than the no-issue answer." };
    }

    // 7. Exact issue-trigger answer.
    if (answerMatches(trigger, answer)) {
        return { issue: true, outcome: "issue", reason: "Matches the configured issue-trigger answer." };
    }

    // 8. Legacy rule saved without a trigger: the opposite Yes/No answer.
    if (trigger.kind === "empty" && (expected.kind === "yes" || expected.kind === "no") && answer.yn && answer.yn !== expected.kind) {
        return { issue: true, outcome: "issue", reason: "Differs from the configured no-issue answer." };
    }

    return { issue: false, outcome: "unmatched", reason: "Matches neither the no-issue nor the issue-trigger answer." };
};

// ------------------------------------------------------
// validateRuleConfig({ expected_answer, issue_answer })
//   → array of human-readable problems (empty = valid)
// ------------------------------------------------------
const validateRuleConfig = (rule = {}) => {
    const errors = [];
    const expected = canonicalOption(rule.expected_answer);
    const trigger = canonicalOption(rule.issue_answer);

    if (expected.kind === "empty") errors.push("Choose the expected / no-issue answer.");
    if (trigger.kind === "empty") errors.push("Choose the issue-trigger answer.");
    if (expected.kind === "blank") errors.push("'Blank answer' can only be used as the issue-trigger answer.");
    if (expected.kind === "any_non_empty") errors.push("'Any non-empty answer' can only be used as the issue-trigger answer.");

    if (expected.kind !== "empty" && trigger.kind !== "empty" && expected.kind === trigger.kind &&
        (expected.kind !== "text" || expected.text === trigger.text)) {
        errors.push("The no-issue answer and the issue-trigger answer cannot be the same.");
    }

    if (expected.kind === "na" && trigger.kind !== "blank" && trigger.kind !== "empty") {
        errors.push("With no-issue answer 'N/A' every non-empty response is acceptable, so the issue-trigger answer must be 'Blank answer'.");
    }

    return errors;
};

// ------------------------------------------------------
// suggestedRepair(rule) → { issue_answer } | null
// Only the unambiguous legacy combination "N/A" + "Any non-empty
// answer" is repaired (the editor had no "Blank answer" option, and
// "N/A" means any non-empty response is fine).
// ------------------------------------------------------
const suggestedRepair = (rule = {}) => {
    const expected = canonicalOption(rule.expected_answer);
    const trigger = canonicalOption(rule.issue_answer);
    if (expected.kind === "na" && trigger.kind === "any_non_empty") {
        return { issue_answer: ISSUE_BLANK };
    }
    return null;
};

// Display-friendly canonical value for saving ("yes" → "Yes", …).
const canonicalLabel = (value, field = "issue") => {
    const option = canonicalOption(value);
    switch (option.kind) {
        case "yes": return "Yes";
        case "no": return "No";
        case "na": return EXPECTED_NA;
        case "any_non_empty": return ISSUE_ANY_NON_EMPTY;
        case "blank": return field === "issue" ? ISSUE_BLANK : String(value ?? "").trim();
        default: return String(value ?? "").replace(/\s+/g, " ").trim();
    }
};

module.exports = {
    ISSUE_ANY_NON_EMPTY,
    ISSUE_BLANK,
    EXPECTED_NA,
    EXPECTED_OPTIONS,
    ISSUE_OPTIONS,
    normalize,
    canonicalOption,
    canonicalAnswer,
    evaluateAnswer,
    validateRuleConfig,
    suggestedRepair,
    canonicalLabel
};

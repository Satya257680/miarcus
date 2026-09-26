// ======================================================
// CHECKLIST ANSWER CLASSIFIER
// ======================================================
//
// Decides whether a checklist answer means "something is wrong at the
// store" (→ Action Point) or "all good / not applicable" (→ straight to
// Checklist Reports).
//
// The old engine treated every "No" as a problem and every "Yes" as
// fine. That is only true for POSITIVE questions:
//
//     "Are the mannequins in good condition?"   Yes = OK,    No = issue
//     "Clean the shelf"                          Yes = OK,    No = issue
//
// It is backwards for NEGATIVE (problem-seeking) questions:
//
//     "Are there any paint issues?"              No  = OK,    Yes = issue
//     "Are there any tile issues?"               No  = OK,    Yes = issue
//     "Number of employees who have not worn
//      the uniform today"                         0   = OK,    2   = issue
//     "Name the employees who do not have a
//      uniform"                                   "all have"   = OK,
//                                                 "Ravi, Aman" = issue
//
// The classifier first works out the question's polarity, then reads
// the answer (yes/no, N/A, number or free text) in that light.
// ======================================================

const normalize = (value) =>
    String(value ?? "")
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

// ------------------------------------------------------
// WORD LISTS
// ------------------------------------------------------

// Nouns / adjectives that describe a problem. When a question asks
// whether one of these EXISTS, the question is negative.
const PROBLEM_TERMS = [
    "issue", "issues", "problem", "problems", "damage", "damaged", "damages",
    "defect", "defects", "defective", "fault", "faults", "faulty", "broken",
    "breakage", "leak", "leaks", "leakage", "leaking", "seepage", "crack",
    "cracks", "cracked", "peeling", "stain", "stains", "rust", "rusted",
    "dent", "dents", "scratch", "scratches", "torn", "tear", "missing",
    "shortage", "pest", "pests", "rodent", "rodents", "cockroach",
    "termite", "fungus", "cobweb", "cobwebs", "dust", "dirt", "dirty",
    "garbage", "clutter", "spill", "spillage", "odour", "odor", "smell",
    "complaint", "complaints", "error", "errors", "discrepancy",
    "discrepancies", "mismatch", "mismatches", "variance", "theft",
    "pilferage", "violation", "violations", "incident", "incidents",
    "expired", "expiry", "overdue", "pending", "delay", "delayed",
    "not working", "out of order", "out of stock", "flickering", "fused",
    "malfunction", "malfunctioning", "hazard", "hazards", "absent",
    "absentee", "late", "unhygienic", "untidy", "blocked", "blockage"
];

// Words that show an answer is reporting a problem.
const PROBLEM_ANSWER_TERMS = [
    ...PROBLEM_TERMS,
    "not available", "unavailable", "not found", "not there", "not present",
    "not displayed", "not installed", "not done", "not clean", "not ok",
    "not okay", "not proper", "not complete", "not completed", "incomplete",
    "unfinished", "partial", "partially", "in progress", "ongoing",
    "not started", "failed", "failure", "rejected", "require", "required",
    "requires", "need", "needs", "needed", "replace", "replacement", "repair",
    "fix", "poor", "bad", "worn out", "wrong"
];

// Phrases that clearly say "everything is fine".
const OK_PATTERNS = [
    /^(all )?(ok|okay|fine|good|clean|proper|perfect|done|completed?|working|available|present|satisfactory|excellent|in place|as per (the )?(standard|guideline|guidelines|sop|ho))\b/,
    /\ball\b( of them| the)?( are| is| were| have| has)?( been)? ?(ok|okay|fine|good|clean|working|available|present|proper|done|completed?|in uniform|wearing|wore|worn|have|has|having|following|followed)\b/,
    /\b(every ?one|everybody|all staff|all employees|all members)\b.*\b(wearing|wore|worn|have|has|present|in uniform|following)\b/,
    /\bno (issue|issues|problem|problems|damage|defect|defects|complaint|complaints|leak|leakage|concern|concerns|discrepanc(y|ies)|error|errors|pending|shortage)\b/,
    /\b(not required|no need|not needed)\b/,
    /\b(all good|looks good|well maintained|in good condition|good condition|up to date|up-to-date|on time)\b/
];

// Only mean "fine" when the question is looking for problems
// ("Name the employees without uniform" → "None").
const OK_NEGATIVE_ONLY_PATTERNS = [
    /^(nothing|none|nil|nobody|no one|no-one|zero|not found|not observed|not seen|no)\b/,
    /\b(nobody|no one|no-one|not found|not observed|not seen)\b/
];

// Words in the QUESTION that make it negative on their own
// ("who have NOT worn", "do NOT have", "WITHOUT name badge").
const NEGATION_IN_QUESTION = /\b(not|without|never|absent|missing)\b|n't\b/;

const YES_WORDS = new Set(["yes", "y", "yeah", "yep", "yes.", "true", "haan", "ha", "han"]);
const NO_WORDS = new Set(["no", "n", "nope", "no.", "false", "nahi", "nhi"]);
const NA_WORDS = new Set([
    "na", "n/a", "n.a", "n.a.", "n a", "not applicable", "not-applicable",
    "notapplicable", "nil applicable", "-", "--", "—"
]);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsTerm = (text, term) =>
    new RegExp(`(^|[^a-z])${escapeRegExp(term)}([^a-z]|$)`).test(text);

const containsAny = (text, terms) => terms.some((term) => containsTerm(text, term));

// Removes negated problem phrases so "no paint peeling / no issues
// observed" does not look like it is reporting "peeling" or "issues".
const stripNegatedProblems = (text) => {
    let result = ` ${text} `;
    const negators = "(?:no|not|without|zero|nil|never|free of|free from)";
    for (const term of PROBLEM_TERMS) {
        const pattern = new RegExp(
            `${negators}\\s+(?:[a-z/]+\\s+){0,3}?${escapeRegExp(term)}(?=[^a-z]|$)`,
            "g"
        );
        result = result.replace(pattern, " ");
    }
    return result.replace(/\s+/g, " ").trim();
};

// ------------------------------------------------------
// QUESTION POLARITY
// ------------------------------------------------------

const COUNT_OR_LIST_PREFIX =
    /^(number of|no\.? of|count of|total (number|no\.?) of|how many|name the|names of|name of|list (the|of|out)|mention the|specify the|which)\b/;

const isNegativeQuestion = (question) => {
    const q = normalize(question);
    if (!q) return false;

    // "Are there any tile issues?", "Is there any damage to the signage?"
    if (/\b(any|some|anything|anyone|anybody)\b/.test(q) && containsAny(q, PROBLEM_TERMS)) {
        return true;
    }

    // "Is the floor dirty?", "Are any lights not working?"
    if (/^(is|are|was|were|does|do|did|has|have|had)\b/.test(q) && containsAny(q, PROBLEM_TERMS)) {
        return true;
    }

    // "Number of employees who have not worn the uniform",
    // "Name the employees who do not have a uniform"
    if (COUNT_OR_LIST_PREFIX.test(q) && (NEGATION_IN_QUESTION.test(q) || containsAny(q, PROBLEM_TERMS))) {
        return true;
    }

    // Generic negation inside a question: "Are staff without ID cards?"
    if (NEGATION_IN_QUESTION.test(q) && /\?$/.test(q)) {
        return true;
    }

    return false;
};

// ------------------------------------------------------
// ANSWER PARSING
// ------------------------------------------------------

const parseAnswer = (answer) => {
    const text = normalize(answer);

    if (!text) return { kind: "blank", text };

    const bare = text.replace(/[.!]+$/, "").trim();

    if (NA_WORDS.has(bare) || /^(n\/a|na|not applicable)\b/.test(bare)) {
        return { kind: "na", text };
    }

    if (YES_WORDS.has(bare)) return { kind: "yesno", yn: "yes", text };
    if (NO_WORDS.has(bare)) return { kind: "yesno", yn: "no", text };

    // "Yes, 2 tiles broken" / "No - all fine"
    const firstWord = bare.split(/[\s,;:\-/]+/)[0];
    if (YES_WORDS.has(firstWord)) return { kind: "yesno", yn: "yes", text, extra: true };
    if (NO_WORDS.has(firstWord) && !/^no (one|body|issue|issues|problem|problems)\b/.test(bare)) {
        return { kind: "yesno", yn: "no", text, extra: true };
    }

    const numberMatch = bare.match(/^(\d+(?:\.\d+)?)\b/);
    if (numberMatch) {
        return { kind: "number", value: Number(numberMatch[1]), text };
    }

    return { kind: "text", text };
};

const toYesNo = (value) => {
    const bare = normalize(value).replace(/[.!]+$/, "");
    if (YES_WORDS.has(bare)) return "yes";
    if (NO_WORDS.has(bare)) return "no";
    return null;
};

// ------------------------------------------------------
// FREE TEXT
// ------------------------------------------------------

const isOkText = (text, negativeQuestion) =>
    OK_PATTERNS.some((pattern) => pattern.test(text)) ||
    (negativeQuestion && OK_NEGATIVE_ONLY_PATTERNS.some((pattern) => pattern.test(text)));

const classifyText = (text, negativeQuestion) => {
    if (isOkText(text, negativeQuestion)) {
        // "All ok but 2 tiles broken" – a real problem after the "ok"
        const leftover = stripNegatedProblems(text);
        if (/\b(but|except|however|though|although)\b/.test(leftover) && containsAny(leftover, PROBLEM_ANSWER_TERMS)) {
            return { issue: true, confident: true, reason: "Answer mentions an exception to 'all OK'." };
        }
        return { issue: false, confident: true, reason: "Answer says everything is fine." };
    }

    const stripped = stripNegatedProblems(text);
    if (containsAny(stripped, PROBLEM_ANSWER_TERMS)) {
        return { issue: true, confident: true, reason: "Answer describes a problem." };
    }

    if (negativeQuestion) {
        // The question asks for names / details of the problem and the
        // answer supplies something that is not an "all fine" phrase.
        return { issue: true, confident: false, reason: "Details supplied for a problem-seeking question." };
    }

    return { issue: false, confident: false, reason: "No problem described." };
};

// ------------------------------------------------------
// MAIN ENTRY
// ------------------------------------------------------
//
// classifyAnswer({ question, answer, remarks, answer_type })
//   → { issue, kind, negativeQuestion, confident, reason, expectedAnswer }
// ------------------------------------------------------

const classifyAnswer = ({ question, answer, remarks } = {}) => {
    const negativeQuestion = isNegativeQuestion(question);
    const parsed = parseAnswer(answer);
    const expectedAnswer = negativeQuestion ? "No" : "Yes";

    const base = { kind: parsed.kind, negativeQuestion, expectedAnswer };

    if (parsed.kind === "blank") {
        return { ...base, issue: false, confident: true, reason: "Blank answer." };
    }

    if (parsed.kind === "na") {
        return { ...base, issue: false, confident: true, reason: "Not applicable." };
    }

    if (parsed.kind === "yesno") {
        const issue = negativeQuestion ? parsed.yn === "yes" : parsed.yn === "no";
        return {
            ...base,
            yn: parsed.yn,
            issue,
            confident: true,
            reason: issue
                ? `Answer "${parsed.yn}" means a problem for this question.`
                : `Answer "${parsed.yn}" means everything is fine for this question.`
        };
    }

    if (parsed.kind === "number") {
        if (negativeQuestion) {
            const issue = parsed.value > 0;
            return {
                ...base,
                expectedAnswer: "0",
                issue,
                confident: true,
                reason: issue ? `${parsed.value} problem(s) reported.` : "Zero problems reported."
            };
        }
        return { ...base, issue: false, confident: false, reason: "Numeric answer." };
    }

    // Free text – use the answer first, fall back to remarks only when
    // the answer itself says nothing either way.
    const textResult = classifyText(parsed.text, negativeQuestion);
    if (!textResult.confident && !negativeQuestion) {
        const remarkText = normalize(remarks);
        if (remarkText) {
            const stripped = stripNegatedProblems(remarkText);
            if (containsAny(stripped, PROBLEM_ANSWER_TERMS) && !isOkText(remarkText, false)) {
                return { ...base, issue: true, confident: false, reason: "Remarks describe a problem." };
            }
        }
    }

    return { ...base, ...textResult };
};

// ------------------------------------------------------
// RULE-AWARE DECISION
// ------------------------------------------------------
//
// An NSO rule may exist for the question. Manually configured rules are
// respected, EXCEPT the legacy auto-generated ones that always expected
// "Yes" – even for problem-seeking questions where "Yes" is the bad
// answer. Those are detected and ignored (and can be repaired).
// ------------------------------------------------------

const isLegacyWrongRule = (rule, classification) => {
    if (!rule) return false;
    const expected = toYesNo(rule.expected_answer);
    return Boolean(classification.negativeQuestion && expected === "yes");
};

const decideIssue = (answerRow, rule = null) => {
    const classification = classifyAnswer(answerRow);

    // Blank / N/A never create an Action Point.
    if (classification.kind === "blank" || classification.kind === "na") {
        return { ...classification, issue: false, ruleUsed: false, legacyRule: false };
    }

    if (!rule) {
        return { ...classification, ruleUsed: false, legacyRule: false };
    }

    const legacyRule = isLegacyWrongRule(rule, classification);
    if (legacyRule) {
        return { ...classification, ruleUsed: false, legacyRule: true };
    }

    const expectedRaw = normalize(rule.expected_answer);
    const expectedYn = toYesNo(rule.expected_answer);

    // Yes/No rule + Yes/No answer → honour the rule exactly.
    if (expectedYn && classification.kind === "yesno") {
        return {
            ...classification,
            issue: classification.yn !== expectedYn,
            ruleUsed: true,
            legacyRule: false,
            reason: classification.yn !== expectedYn
                ? `Expected "${rule.expected_answer}", received "${classification.yn}".`
                : "Matches the configured expected answer."
        };
    }

    // Free-text rule ("Completed", "0" …) → exact match is OK.
    if (expectedRaw && normalize(answerRow.answer) === expectedRaw) {
        return { ...classification, issue: false, ruleUsed: true, legacyRule: false, reason: "Matches the configured expected answer." };
    }

    // Otherwise let the semantic reading decide (numbers, sentences).
    return { ...classification, ruleUsed: true, legacyRule: false };
};

module.exports = {
    normalize,
    isNegativeQuestion,
    parseAnswer,
    classifyAnswer,
    decideIssue,
    isLegacyWrongRule,
    toYesNo
};

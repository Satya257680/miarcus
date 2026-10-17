// ======================================================
// ISSUE CONTROL CENTER — client mirror of the server rule evaluator
// (server/utils/issueRuleEvaluator.js). Used only to validate the rule
// editor and to show "what will happen" before saving. The server is
// authoritative and validates again on save.
// ======================================================

export const ISSUE_ANY_NON_EMPTY = "Any non-empty answer";
export const ISSUE_BLANK = "Blank answer";
export const EXPECTED_NA = "N/A";

export const EXPECTED_OPTIONS = [
  { value: "Yes", hint: "“Yes” is fine." },
  { value: "No", hint: "“No” is fine." },
  { value: EXPECTED_NA, hint: "Any non-empty response is fine (Yes, No, a number or text). Use with “Blank answer”." },
];

export const ISSUE_OPTIONS = [
  { value: "Yes", hint: "Only “Yes” raises an Action Point." },
  { value: "No", hint: "Only “No” raises an Action Point." },
  { value: ISSUE_ANY_NON_EMPTY, hint: "Any answer other than the no-issue answer raises an Action Point. Blank answers do not." },
  { value: ISSUE_BLANK, hint: "Only an unanswered / blank response raises an Action Point." },
];

const YES = new Set(["yes", "y", "yeah", "yep", "true", "haan", "ha", "han"]);
const NO = new Set(["no", "n", "nope", "false", "nahi", "nhi"]);
const NA = new Set(["n/a", "na", "n.a", "n.a.", "n a", "not applicable", "not-applicable", "notapplicable"]);
const ANY = new Set(["any non-empty answer", "any non empty answer", "any nonempty answer", "any answer", "any non-empty"]);
const BLANK = new Set(["blank answer", "blank", "no answer", "(blank)", "empty", "empty answer", "blank / no answer", "blank/no answer", "unanswered"]);

const normalize = (v) => String(v ?? "").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const stripEnd = (t) => t.replace(/[.!]+$/, "").trim();

export const canonicalOption = (value) => {
  const text = stripEnd(normalize(value));
  if (!text) return { kind: "empty", text };
  if (YES.has(text)) return { kind: "yes", text };
  if (NO.has(text)) return { kind: "no", text };
  if (NA.has(text)) return { kind: "na", text };
  if (ANY.has(text)) return { kind: "any_non_empty", text };
  if (BLANK.has(text)) return { kind: "blank", text };
  return { kind: "text", text };
};

const canonicalAnswer = (value) => {
  const text = normalize(value);
  if (!text) return { kind: "blank", text, yn: null };
  const bare = stripEnd(text);
  if (NA.has(bare) || /^(n\/a|not applicable)\b/.test(bare)) return { kind: "na", text, yn: null };
  const first = bare.split(/[\s,;:\-/()]+/)[0];
  let yn = null;
  if (YES.has(bare) || YES.has(first)) yn = "yes";
  else if (NO.has(bare) || NO.has(first)) yn = "no";
  return { kind: yn ? "yesno" : "text", text, bare, yn };
};

const matches = (option, answer) => {
  if (option.kind === "yes" || option.kind === "no") return answer.yn === option.kind;
  if (option.kind === "na") return answer.kind === "na";
  if (option.kind === "text") return answer.text === option.text || answer.bare === option.text;
  return false;
};

export const evaluateAnswer = (answerValue, rule) => {
  if (!rule) return { issue: false, reason: "No rule" };
  const expected = canonicalOption(rule.expected_answer);
  const trigger = canonicalOption(rule.issue_answer);
  const answer = canonicalAnswer(answerValue);
  if (answer.kind === "blank") return { issue: trigger.kind === "blank", reason: trigger.kind === "blank" ? "Blank is the issue trigger" : "Blank is not an issue for this rule" };
  if (trigger.kind === "blank") return { issue: false, reason: "Answered" };
  if (expected.kind === "na") return { issue: false, reason: "N/A: any response is fine" };
  if (answer.kind === "na" && trigger.kind !== "na") return { issue: false, reason: "N/A never raises an Action Point" };
  if (matches(expected, answer)) return { issue: false, reason: "No-issue answer" };
  if (trigger.kind === "any_non_empty") return { issue: true, reason: "Not the no-issue answer" };
  if (matches(trigger, answer)) return { issue: true, reason: "Issue-trigger answer" };
  if (trigger.kind === "empty" && (expected.kind === "yes" || expected.kind === "no") && answer.yn && answer.yn !== expected.kind) return { issue: true, reason: "Differs from the no-issue answer" };
  return { issue: false, reason: "Matches neither answer" };
};

export const validateRuleConfig = (rule = {}) => {
  const errors = [];
  const expected = canonicalOption(rule.expected_answer);
  const trigger = canonicalOption(rule.issue_answer);
  if (expected.kind === "empty") errors.push("Choose the expected / no-issue answer.");
  if (trigger.kind === "empty") errors.push("Choose the issue-trigger answer.");
  if (expected.kind === "blank") errors.push("'Blank answer' can only be used as the issue-trigger answer.");
  if (expected.kind === "any_non_empty") errors.push("'Any non-empty answer' can only be used as the issue-trigger answer.");
  if (expected.kind !== "empty" && trigger.kind !== "empty" && expected.kind === trigger.kind && (expected.kind !== "text" || expected.text === trigger.text)) {
    errors.push("The no-issue answer and the issue-trigger answer cannot be the same.");
  }
  if (expected.kind === "na" && trigger.kind !== "blank" && trigger.kind !== "empty") {
    errors.push("With no-issue answer 'N/A' every non-empty response is acceptable, so the issue-trigger answer must be 'Blank answer'.");
  }
  return errors;
};

// Sample answers shown in the editor's "What happens" preview.
export const SAMPLE_ANSWERS = [
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" },
  { label: "Written text / number", value: "Visited at 4 pm" },
  { label: "N/A", value: "N/A" },
  { label: "Blank (not answered)", value: "" },
];

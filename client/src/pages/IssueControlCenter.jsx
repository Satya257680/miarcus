import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft, FaArrowRight, FaCheckCircle, FaChevronLeft, FaChevronRight, FaDownload, FaEdit,
  FaExclamationTriangle, FaFilter, FaInfoCircle, FaListAlt, FaPlus, FaPowerOff, FaQuestionCircle,
  FaSearch, FaSlidersH, FaTrash,
} from "react-icons/fa";
import {
  getIssueRules, getIssueRuleQuestions, createIssueRule, updateIssueRule, setIssueRuleStatus,
  deleteIssueRule, deleteAllIssueRules,
} from "../services/issueControlService";
import {
  EXPECTED_OPTIONS, ISSUE_OPTIONS, SAMPLE_ANSWERS, evaluateAnswer, validateRuleConfig, canonicalOption,
} from "../utils/issueRuleConfig";
import "../styles/IssueControlCenter.css";
import confirmWithGlass from "../components/common/ConfirmDialog/confirmWithGlass.jsx";

// ======================================================
// ISSUE CONTROL CENTER
// Rule library + per-question controls + rule editor.
// The server (issueControlRuleController) is authoritative: it takes
// the question text / checklist type from the selected question,
// validates the answer combination and blocks duplicate rules.
// ======================================================

const empty = { question_id: "", expected_answer: "No", issue_answer: "Yes", priority: "Medium", sla_days: 3, departments: "", is_active: 1 };
const ALL_TYPES = "All checklist types";
const unwrap = (value, key) => (Array.isArray(value) ? value : Array.isArray(value?.[key]) ? value[key] : Array.isArray(value?.data) ? value.data : []);
const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const isActive = (r) => Number(r?.is_active) === 1;
const needsAttention = (r) => (r?.config_errors?.length || 0) > 0 || r?.question_state === "missing";

function downloadCsv(rows) {
  const columns = [
    ["Checklist", "checklist_type"], ["Question", "question_text"], ["No-Issue Answer", "expected_answer"],
    ["Issue Answer", "issue_answer"], ["Priority", "priority"], ["SLA Days", "sla_days"],
    ["Department", "departments"], ["Status", "is_active"], ["Question Status", "question_state"], ["Needs Attention", "config_errors"],
  ];
  const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cell = (row, key) => {
    if (key === "is_active") return isActive(row) ? "Active" : "Inactive";
    if (key === "config_errors") return (row.config_errors || []).join(" | ");
    return row[key];
  };
  const content = [columns.map(([label]) => quote(label)).join(","), ...rows.map((row) => columns.map(([, key]) => quote(cell(row, key))).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", content], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `miarcus-issue-control-rules-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const RuleStateBadge = ({ state }) => (
  <span className={`icc-pill state-${state}`}>
    {state === "active" ? "Active rule" : state === "inactive" ? "Inactive rule" : "No rule"}
  </span>
);

export default function IssueControlCenter() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isFormRoute = window.location.pathname.endsWith("/new") || Boolean(id);

  const [rules, setRules] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("rules");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [ruleStateFilter, setRuleStateFilter] = useState("All questions");
  const [formTypeFilter, setFormTypeFilter] = useState(ALL_TYPES);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState([]);
  const [notice, setNotice] = useState("");

  // ---------------- load ----------------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ruleResponse, questionResponse] = await Promise.all([getIssueRules(), getIssueRuleQuestions()]);
      setRules(unwrap(ruleResponse, "rules"));
      setQuestions(unwrap(questionResponse, "questions"));
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load Issue Control Center.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const questionById = useMemo(() => new Map(questions.map((q) => [String(q.id), q])), [questions]);
  const ruleById = useMemo(() => new Map(rules.map((r) => [String(r.id), r])), [rules]);

  // ---------------- editor: open / prefill ----------------
  useEffect(() => {
    if (!isFormRoute || loading) return;
    setFormErrors([]);
    if (id) {
      const rule = ruleById.get(String(id));
      if (!rule) { setError("This issue rule could not be found."); return; }
      setEditing(rule.id);
      setForm({
        question_id: rule.linked_question_id ? String(rule.linked_question_id) : (rule.question_id ? String(rule.question_id) : "__legacy__"),
        expected_answer: rule.expected_answer || "",
        issue_answer: rule.issue_answer || "",
        priority: rule.priority || "Medium",
        sla_days: rule.sla_days ?? 3,
        departments: rule.departments || "",
        is_active: Number(rule.is_active ?? 1),
      });
      return;
    }
    setEditing(null);
    const preset = searchParams.get("question_id");
    setForm({ ...empty, question_id: preset && questionById.has(String(preset)) ? String(preset) : "" });
    if (preset && questionById.has(String(preset))) setFormTypeFilter(questionById.get(String(preset)).checklist_name || ALL_TYPES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormRoute, id, loading, ruleById, questionById]);

  // ---------------- derived lists ----------------
  const checklistTypes = useMemo(() => {
    const set = new Set();
    questions.forEach((q) => q.checklist_name && set.add(q.checklist_name));
    rules.forEach((r) => r.checklist_type && set.add(r.checklist_type));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [questions, rules]);

  const stats = useMemo(() => {
    const activeQuestions = questions.filter((q) => norm(q.status || "Active") === "active");
    return {
      total: rules.length,
      active: rules.filter(isActive).length,
      inactive: rules.filter((r) => !isActive(r)).length,
      attention: rules.filter(needsAttention).length,
      uncovered: activeQuestions.filter((q) => q.rule_state !== "active").length,
      activeQuestions: activeQuestions.length,
    };
  }, [rules, questions]);

  const filteredRules = useMemo(() => rules.filter((r) => {
    const textMatch = !search || `${r.question_text || ""} ${r.checklist_type || ""} ${r.departments || ""} ${r.expected_answer || ""} ${r.issue_answer || ""}`.toLowerCase().includes(search.toLowerCase());
    const typeMatch = typeFilter === ALL_TYPES || r.checklist_type === typeFilter;
    const statusMatch = statusFilter === "All statuses" ||
      (statusFilter === "Needs attention" ? needsAttention(r) : (isActive(r) ? "Active" : "Inactive") === statusFilter);
    const priorityMatch = priorityFilter === "All priorities" || r.priority === priorityFilter;
    return textMatch && typeMatch && statusMatch && priorityMatch;
  }), [rules, search, typeFilter, statusFilter, priorityFilter]);

  const filteredQuestions = useMemo(() => questions.filter((q) => {
    const textMatch = !search || `${q.question || ""} ${q.checklist_name || ""}`.toLowerCase().includes(search.toLowerCase());
    const typeMatch = typeFilter === ALL_TYPES || q.checklist_name === typeFilter;
    const stateMatch = ruleStateFilter === "All questions" ||
      (ruleStateFilter === "Active rule" && q.rule_state === "active") ||
      (ruleStateFilter === "Inactive rule" && q.rule_state === "inactive") ||
      (ruleStateFilter === "No rule" && q.rule_state === "none");
    return textMatch && typeMatch && stateMatch;
  }), [questions, search, typeFilter, ruleStateFilter]);

  const list = tab === "rules" ? filteredRules : filteredQuestions;
  useEffect(() => setPage(1), [tab, search, typeFilter, statusFilter, priorityFilter, ruleStateFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ---------------- editor derived ----------------
  const selectedQuestion = form.question_id && form.question_id !== "__legacy__" ? questionById.get(String(form.question_id)) : null;
  const editingRule = editing ? ruleById.get(String(editing)) : null;
  const conflictRule = selectedQuestion?.rule && String(selectedQuestion.rule.id) !== String(editing) ? selectedQuestion.rule : null;
  const liveErrors = useMemo(() => validateRuleConfig(form), [form]);
  const formQuestions = useMemo(() => questions
    .filter((q) => norm(q.status || "Active") === "active" || String(q.id) === String(form.question_id))
    .filter((q) => formTypeFilter === ALL_TYPES || q.checklist_name === formTypeFilter || String(q.id) === String(form.question_id)),
  [questions, formTypeFilter, form.question_id]);
  const groupedQuestions = useMemo(() => {
    const groups = new Map();
    formQuestions.forEach((q) => {
      const key = q.checklist_name || "Other checklist";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(q);
    });
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [formQuestions]);
  const optionList = (options, current) => {
    const values = options.map((o) => o.value);
    const known = values.some((v) => canonicalOption(v).kind === canonicalOption(current).kind && (canonicalOption(current).kind !== "text" || norm(v) === norm(current)));
    return current && !known ? [...values, current] : values;
  };
  const expectedHint = EXPECTED_OPTIONS.find((o) => canonicalOption(o.value).kind === canonicalOption(form.expected_answer).kind)?.hint || "Exact answer that means no issue.";
  const issueHint = ISSUE_OPTIONS.find((o) => canonicalOption(o.value).kind === canonicalOption(form.issue_answer).kind)?.hint || "Exact answer that raises an Action Point.";

  // ---------------- actions ----------------
  const backToList = () => { setEditing(null); setForm(empty); setFormErrors([]); setError(""); navigate("/issue-control-center"); };

  const save = async (event) => {
    event.preventDefault();
    setError(""); setNotice("");
    const errors = [...liveErrors];
    if (!form.question_id) errors.unshift("Select a checklist question.");
    if (conflictRule) errors.unshift("This question already has a rule. Edit that rule instead.");
    const sla = Number(form.sla_days);
    if (!Number.isInteger(sla) || sla < 0 || sla > 365) errors.push("SLA (days) must be a whole number from 0 to 365.");
    setFormErrors(errors);
    if (errors.length) return;

    setBusy(true);
    try {
      const payload = {
        question_id: form.question_id === "__legacy__" ? null : Number(form.question_id),
        expected_answer: form.expected_answer,
        issue_answer: form.issue_answer,
        priority: form.priority,
        sla_days: sla,
        departments: String(form.departments || "").trim(),
        is_active: Number(form.is_active),
      };
      const response = editing ? await updateIssueRule(editing, payload) : await createIssueRule(payload);
      await load();
      navigate("/issue-control-center");
      setNotice(response?.message || (editing ? "Issue rule updated." : "Issue rule created."));
    } catch (e) {
      const data = e.response?.data;
      setFormErrors(data?.errors?.length ? data.errors : [data?.message || e.message || "Could not save rule."]);
    } finally {
      setBusy(false);
    }
  };

  const toggleRule = async (rule) => {
    if (!rule) return;
    const activate = !isActive(rule);
    if (!activate && !await confirmWithGlass({
      title: "Deactivate rule",
      message: `New submissions of “${rule.question_text}” will no longer raise Action Points. Existing Action Points are not changed.`,
      confirmText: "Deactivate",
      danger: true,
    })) return;
    setRowBusy(rule.id); setError(""); setNotice("");
    try {
      const response = await setIssueRuleStatus(rule.id, activate);
      await load();
      setNotice(response?.message || (activate ? "Rule activated." : "Rule deactivated."));
    } catch (e) {
      setError(e.response?.data?.message || "Could not change the rule status.");
    } finally {
      setRowBusy(null);
    }
  };

  const remove = async (rule) => {
    if (!await confirmWithGlass({
      title: "Delete rule",
      message: `Delete the rule for “${rule.question_text}”? Existing Action Points are not changed.`,
      confirmText: "Delete rule",
      danger: true,
    })) return;
    try {
      const response = await deleteIssueRule(rule.id);
      setNotice(response?.message || "Issue rule deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Delete failed.");
    }
  };

  const removeAll = async () => {
    if (!await confirmWithGlass({
      title: "Delete ALL rules",
      message: `Delete all ${rules.length} Issue Control Center rules? New submissions will raise no Action Points until rules are added again. Existing Action Points are not deleted.`,
      confirmText: "Delete all rules",
      danger: true,
    })) return;
    try {
      const response = await deleteAllIssueRules();
      setNotice(response?.message || "All issue rules deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Delete all failed.");
    }
  };

  const clearFilters = () => {
    setSearch(""); setTypeFilter(ALL_TYPES); setStatusFilter("All statuses"); setPriorityFilter("All priorities"); setRuleStateFilter("All questions"); setPage(1);
  };

  // ---------------- render helpers ----------------
  const ruleBadges = (r) => (
    <>
      {r.question_state === "inactive" && <span className="icc-flag muted" title="The checklist question is inactive">Question inactive</span>}
      {r.question_state === "missing" && <span className="icc-flag warn" title="No checklist question matches this rule">Question not found</span>}
      {(r.config_errors || []).length > 0 && <span className="icc-flag warn" title={(r.config_errors || []).join("\n")}><FaExclamationTriangle /> Needs correction</span>}
    </>
  );

  const header = (
    <section className="icc-heading icc-glass">
      <div className="icc-heading-icon"><FaSlidersH /></div>
      <div>
        <span className="icc-eyebrow">CHECKLIST GOVERNANCE · ADMIN WORKSPACE</span>
        <h1>Issue Control Center</h1>
        <p>Configure which checklist answers indicate a problem and create an Action Point.</p>
      </div>
      <span className="icc-heading-tag">ISSUE RULES</span>
    </section>
  );

  const alerts = (
    <>
      {error && <div className="icc-error" role="alert"><FaExclamationTriangle /> {error}</div>}
      {notice && <div className="icc-notice" role="status"><FaCheckCircle /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    </>
  );

  // ======================================================
  // EDITOR
  // ======================================================
  if (isFormRoute) {
    const allErrors = formErrors.length ? formErrors : [];
    return (
      <main className="icc-page">
        {header}
        {alerts}
        <section className="icc-form-shell icc-glass">
          <div className="icc-section-title">
            <button type="button" className="icc-back" onClick={backToList}><FaArrowLeft /> Back to rules</button>
            <div>
              <span className="icc-eyebrow">RULE CONFIGURATION</span>
              <h2>{editing ? "Edit issue rule" : "Create issue rule"}</h2>
              <p>Choose the exact checklist question and define which answer is fine and which answer raises an Action Point.</p>
            </div>
          </div>

          {loading ? <div className="icc-empty-block">Loading questions and rules…</div> : (
            <form className="icc-editor" onSubmit={save} noValidate>
              {/* 1. QUESTION */}
              <fieldset className="icc-group">
                <legend><span>1</span> Checklist question</legend>
                <div className="icc-grid two">
                  <label>Checklist type
                    <select value={formTypeFilter} onChange={(e) => setFormTypeFilter(e.target.value)} disabled={Boolean(editing)}>
                      <option>{ALL_TYPES}</option>
                      {checklistTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <small>Narrows the question list.</small>
                  </label>
                  <label>Question
                    <select required value={form.question_id} onChange={(e) => { setForm({ ...form, question_id: e.target.value }); setFormErrors([]); }}>
                      <option value="">Select question</option>
                      {form.question_id === "__legacy__" && editingRule && <option value="__legacy__">{editingRule.question_text} (existing rule — question not linked)</option>}
                      {groupedQuestions.map(([group, items]) => (
                        <optgroup key={group} label={group}>
                          {items.map((q) => (
                            <option key={q.id} value={String(q.id)}>
                              {q.question}{q.rule_state !== "none" && String(q.rule?.id) !== String(editing) ? "  • has rule" : ""}{norm(q.status || "Active") !== "active" ? "  • inactive" : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
                {(selectedQuestion || editingRule) && (
                  <div className="icc-selected">
                    <FaQuestionCircle />
                    <div>
                      <b>{selectedQuestion?.question || editingRule?.question_text}</b>
                      <span>Checklist type: <strong>{selectedQuestion?.checklist_name || editingRule?.checklist_type || "—"}</strong>{selectedQuestion ? ` · Question #${selectedQuestion.id}` : ""}</span>
                    </div>
                  </div>
                )}
                {conflictRule && (
                  <div className="icc-inline-warn">
                    <FaExclamationTriangle />
                    <span>This question already has a rule ({isActive(conflictRule) ? "active" : "inactive"}). Only one rule per question is allowed.</span>
                    <button type="button" onClick={() => navigate(`/issue-control-center/${conflictRule.id}/edit`)}>Edit that rule <FaArrowRight /></button>
                  </div>
                )}
              </fieldset>

              {/* 2. ANSWERS */}
              <fieldset className="icc-group">
                <legend><span>2</span> Answer behaviour</legend>
                <div className="icc-grid two">
                  <label>Expected / no-issue answer
                    <select value={form.expected_answer} onChange={(e) => { setForm({ ...form, expected_answer: e.target.value }); setFormErrors([]); }}>
                      <option value="">Select</option>
                      {optionList(EXPECTED_OPTIONS, form.expected_answer).map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <small>{expectedHint}</small>
                  </label>
                  <label>Issue-trigger answer
                    <select value={form.issue_answer} onChange={(e) => { setForm({ ...form, issue_answer: e.target.value }); setFormErrors([]); }}>
                      <option value="">Select</option>
                      {optionList(ISSUE_OPTIONS, form.issue_answer).map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <small>{issueHint}</small>
                  </label>
                </div>
                {liveErrors.length > 0 && <ul className="icc-validation">{liveErrors.map((m) => <li key={m}><FaExclamationTriangle /> {m}</li>)}</ul>}
                <div className="icc-preview">
                  <span className="icc-preview-title"><FaInfoCircle /> What happens when this question is answered</span>
                  <div className="icc-preview-grid">
                    {SAMPLE_ANSWERS.map((sample) => {
                      const result = liveErrors.length ? null : evaluateAnswer(sample.value, form);
                      return (
                        <div key={sample.label} className={`icc-preview-item ${result ? (result.issue ? "issue" : "ok") : "unknown"}`}>
                          <small>Answer</small>
                          <b>{sample.label}</b>
                          <span>{!result ? "—" : result.issue ? "Action Point" : "Checklist Reports"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </fieldset>

              {/* 3. ACTION POINT SETTINGS */}
              <fieldset className="icc-group">
                <legend><span>3</span> Action Point settings</legend>
                <div className="icc-grid three">
                  <label>Priority
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label>SLA (days)
                    <input type="number" min="0" max="365" step="1" value={form.sla_days} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} />
                  </label>
                  <label>Responsible department(s)
                    <input value={form.departments} maxLength={500} onChange={(e) => setForm({ ...form, departments: e.target.value })} placeholder="e.g. Operations, Maintenance" />
                  </label>
                </div>
              </fieldset>

              {/* 4. STATUS */}
              <fieldset className="icc-group">
                <legend><span>4</span> Status</legend>
                <div className="icc-status-choice" role="radiogroup" aria-label="Rule status">
                  <button type="button" role="radio" aria-checked={Number(form.is_active) === 1} className={Number(form.is_active) === 1 ? "on" : ""} onClick={() => setForm({ ...form, is_active: 1 })}>
                    <FaCheckCircle /> Active <small>Applies to new submissions after saving</small>
                  </button>
                  <button type="button" role="radio" aria-checked={Number(form.is_active) === 0} className={Number(form.is_active) === 0 ? "on off" : ""} onClick={() => setForm({ ...form, is_active: 0 })}>
                    <FaPowerOff /> Inactive <small>Saved, but not applied</small>
                  </button>
                </div>
              </fieldset>

              {allErrors.length > 0 && <div className="icc-error" role="alert"><FaExclamationTriangle /><ul>{allErrors.map((m) => <li key={m}>{m}</li>)}</ul></div>}

              <div className="icc-form-actions">
                <button type="submit" disabled={busy || Boolean(conflictRule)}>{busy ? "Saving…" : editing ? "Save changes" : <><FaPlus /> Add rule</>}</button>
                <button type="button" className="secondary" onClick={backToList}>Cancel</button>
              </div>
              <p className="icc-help"><FaInfoCircle /><span>Saving applies to <b>new</b> checklist submissions immediately. Existing Action Points are not changed automatically — use <b>Re-check Answers</b> on the Action Points page to preview and apply the change to past records.</span></p>
            </form>
          )}
        </section>
      </main>
    );
  }

  // ======================================================
  // LIST
  // ======================================================
  return (
    <main className="icc-page">
      {header}
      {alerts}

      <section className="icc-stats">
        <article className="icc-glass"><span className="icc-stat-icon violet"><FaListAlt /></span><div><small>Total rules</small><strong>{stats.total}</strong><span>Saved in Issue Control Center</span></div></article>
        <article className="icc-glass"><span className="icc-stat-icon green"><FaCheckCircle /></span><div><small>Active rules</small><strong>{stats.active}</strong><span>Used for new submissions</span></div></article>
        <article className="icc-glass"><span className="icc-stat-icon slate"><FaPowerOff /></span><div><small>Inactive rules</small><strong>{stats.inactive}</strong><span>Saved but not applied</span></div></article>
        <article className="icc-glass clickable" onClick={() => { setTab("rules"); setStatusFilter("Needs attention"); }} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && (setTab("rules"), setStatusFilter("Needs attention"))}><span className="icc-stat-icon amber"><FaExclamationTriangle /></span><div><small>Need attention</small><strong>{stats.attention}</strong><span>Invalid or unlinked rules</span></div></article>
        <article className="icc-glass clickable" onClick={() => { setTab("questions"); setRuleStateFilter("No rule"); }} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && (setTab("questions"), setRuleStateFilter("No rule"))}><span className="icc-stat-icon rose"><FaQuestionCircle /></span><div><small>No active rule</small><strong>{stats.uncovered}</strong><span>of {stats.activeQuestions} active questions</span></div></article>
      </section>

      <section className="icc-toolbar icc-glass">
        <div className="icc-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "rules"} className={tab === "rules" ? "on" : ""} onClick={() => setTab("rules")}>Rule library <span>{rules.length}</span></button>
          <button type="button" role="tab" aria-selected={tab === "questions"} className={tab === "questions" ? "on" : ""} onClick={() => setTab("questions")}>Questions <span>{questions.length}</span></button>
        </div>
        <div className="icc-search"><FaSearch /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "rules" ? "Search question, checklist, answer or department…" : "Search question or checklist…"} /></div>
        <label className="icc-filter"><span>Checklist type</span><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>{ALL_TYPES}</option>{checklistTypes.map((t) => <option key={t}>{t}</option>)}</select></label>
        {tab === "rules" ? (
          <>
            <label className="icc-filter"><span>Priority</span><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option>All priorities</option>{["Low", "Medium", "High", "Critical"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="icc-filter"><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All statuses</option><option>Active</option><option>Inactive</option><option>Needs attention</option></select></label>
          </>
        ) : (
          <label className="icc-filter"><span>Rule</span><select value={ruleStateFilter} onChange={(e) => setRuleStateFilter(e.target.value)}><option>All questions</option><option>Active rule</option><option>Inactive rule</option><option>No rule</option></select></label>
        )}
        <div className="icc-toolbar-actions">
          <button type="button" onClick={() => navigate("/issue-control-center/new")}><FaPlus /> Add rule</button>
          <button type="button" className="icc-outline" onClick={() => downloadCsv(filteredRules)}><FaDownload /> Export</button>
          <button type="button" className="icc-outline" onClick={clearFilters}><FaFilter /> Clear filters</button>
        </div>
      </section>

      <section className="icc-list-card icc-glass">
        <div className="icc-list-head">
          <div>
            <span className="icc-eyebrow">{tab === "rules" ? "RULE LIBRARY" : "PER-QUESTION CONTROLS"}</span>
            <h2>{tab === "rules" ? "Configured rules" : "Checklist questions"} <span>{list.length}</span></h2>
            <p>{tab === "rules" ? "The answer conditions that raise corrective Action Points." : "See every question's rule state and add, edit, activate or deactivate its rule."}</p>
          </div>
          {tab === "rules" && rules.length > 0 && <button type="button" className="icc-delete-all" onClick={removeAll}><FaTrash /> Delete all rules</button>}
        </div>

        <div className="icc-table-wrap">
          {tab === "rules" ? (
            <table className="icc-table">
              <thead><tr><th>Checklist / question</th><th>No-issue answer</th><th>Issue answer</th><th>Priority</th><th>SLA</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="8" className="icc-empty">Loading issue rules…</td></tr> : pageRows.map((r) => (
                  <tr key={r.id} className={needsAttention(r) ? "attention" : ""}>
                    <td className="icc-question-cell"><b>{r.question_text}</b><small>{r.checklist_type || "Checklist type not set"}</small><div className="icc-flags">{ruleBadges(r)}</div></td>
                    <td><span className="icc-answer good">{r.expected_answer || "—"}</span></td>
                    <td><span className="icc-answer issue">{r.issue_answer || "—"}</span></td>
                    <td><span className={`icc-priority ${String(r.priority || "medium").toLowerCase()}`}>{r.priority || "Medium"}</span></td>
                    <td>{r.sla_days} day(s)</td>
                    <td>{r.departments || "—"}</td>
                    <td><span className={`icc-status ${isActive(r) ? "active" : "inactive"}`}>{isActive(r) ? "Active" : "Inactive"}</span></td>
                    <td className="icc-actions-cell"><div className="icc-actions">
                      <button type="button" className="edit" onClick={() => navigate(`/issue-control-center/${r.id}/edit`)}><FaEdit /> Edit</button>
                      <button type="button" className={isActive(r) ? "toggle off" : "toggle on"} disabled={rowBusy === r.id} onClick={() => toggleRule(r)}><FaPowerOff /> {isActive(r) ? "Deactivate" : "Activate"}</button>
                      <button type="button" className="delete" onClick={() => remove(r)} aria-label={`Delete rule for ${r.question_text}`}><FaTrash /></button>
                    </div></td>
                  </tr>
                ))}
                {!loading && !pageRows.length && <tr><td colSpan="8" className="icc-empty">No rules match these filters.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="icc-table">
              <thead><tr><th>Checklist / question</th><th>Question</th><th>Rule</th><th>No-issue → Issue</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="5" className="icc-empty">Loading questions…</td></tr> : pageRows.map((q) => (
                  <tr key={q.id}>
                    <td className="icc-question-cell"><b>{q.question}</b><small>{q.checklist_name || "Checklist type not set"} · #{q.id}</small>{q.rule && <div className="icc-flags">{ruleBadges(q.rule)}</div>}</td>
                    <td><span className={`icc-status ${norm(q.status || "Active") === "active" ? "active" : "inactive"}`}>{q.status || "Active"}</span></td>
                    <td><RuleStateBadge state={q.rule_state} /></td>
                    <td>{q.rule ? <span className="icc-answers-inline"><span className="icc-answer good">{q.rule.expected_answer}</span><FaArrowRight /><span className="icc-answer issue">{q.rule.issue_answer}</span></span> : <span className="icc-muted">—</span>}</td>
                    <td className="icc-actions-cell"><div className="icc-actions">
                      {q.rule ? (
                        <>
                          <button type="button" className="edit" onClick={() => navigate(`/issue-control-center/${q.rule.id}/edit`)}><FaEdit /> Edit rule</button>
                          <button type="button" className={isActive(q.rule) ? "toggle off" : "toggle on"} disabled={rowBusy === q.rule.id} onClick={() => toggleRule(q.rule)}><FaPowerOff /> {isActive(q.rule) ? "Deactivate" : "Activate"}</button>
                        </>
                      ) : (
                        <button type="button" className="add" onClick={() => navigate(`/issue-control-center/new?question_id=${q.id}`)}><FaPlus /> Add rule for this question</button>
                      )}
                    </div></td>
                  </tr>
                ))}
                {!loading && !pageRows.length && <tr><td colSpan="5" className="icc-empty">No questions match these filters.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <div className="icc-pagination">
          <span>Showing <b>{list.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, list.length)}</b> of <b>{list.length}</b> {tab === "rules" ? "rules" : "questions"}</span>
          <label>Rows per page<select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
          <div className="icc-page-controls">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><FaChevronLeft /> Previous</button>
            <span>Page <b>{currentPage}</b> of <b>{totalPages}</b></span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <FaChevronRight /></button>
          </div>
        </div>
      </section>
    </main>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaChevronLeft, FaChevronRight, FaDownload, FaFilter, FaListAlt, FaPlus, FaSearch, FaSlidersH, FaTrash, FaEdit } from "react-icons/fa";
import { getQuestions } from "../services/questionService";
import { getIssueRules, createIssueRule, updateIssueRule, deleteIssueRule, deleteAllIssueRules } from "../services/issueControlService";
import Card from "../components/common/Card";
import "../styles/IssueControlCenter.css";

const empty = { question_id: "", question_text: "", checklist_type: "", expected_answer: "Yes", issue_answer: "No", priority: "Medium", sla_days: 3, departments: "", is_active: 1 };
const questionText = (q) => q?.question || q?.question_text || q?.name || "";
const questionId = (q) => q?.id ?? q?.question_id ?? "";
const checklistType = (q) => q?.checklist_type || q?.checklistType || q?.checklist_name || q?.checklist || q?.type || "";
const unwrap = (value) => value?.questions || value?.data || value?.rows || value || [];

function downloadCsv(rows) {
  const columns = [
    ["Checklist", "checklist_type"], ["Question", "question_text"], ["No-Issue Answer", "expected_answer"],
    ["Issue Answer", "issue_answer"], ["Priority", "priority"], ["SLA Days", "sla_days"],
    ["Department", "departments"], ["Status", "is_active"],
  ];
  const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const content = [columns.map(([label]) => quote(label)).join(","), ...rows.map((row) => columns.map(([, key]) => quote(key === "is_active" ? (Number(row[key]) ? "Active" : "Inactive") : row[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `miarcus-issue-control-rules-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
}

export default function IssueControlCenter() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isFormRoute = window.location.pathname.endsWith("/new") || Boolean(id);
  const [rules, setRules] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All checklist types");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ruleResponse, questionResponse] = await Promise.all([getIssueRules(), getQuestions()]);
      setRules(unwrap(ruleResponse));
      setQuestions(unwrap(questionResponse));
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load Issue Control Center.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!id || !rules.length) { if (!id) { setEditing(null); setForm(empty); } return; }
    const rule = rules.find((item) => String(item.id) === String(id));
    if (!rule) { setError("This issue rule could not be found."); return; }
    const matched = questions.find((q) => String(questionId(q)) === String(rule.question_id) || questionText(q).trim().toLowerCase() === String(rule.question_text || "").trim().toLowerCase());
    setEditing(rule.id);
    setForm({ question_id: String(rule.question_id || questionId(matched) || ""), question_text: rule.question_text || questionText(matched), checklist_type: rule.checklist_type || checklistType(matched), expected_answer: rule.expected_answer || "Yes", issue_answer: rule.issue_answer || "No", priority: rule.priority || "Medium", sla_days: rule.sla_days ?? 3, departments: rule.departments || "", is_active: Number(rule.is_active ?? 1) });
  }, [id, rules, questions]);

  const types = useMemo(() => [...new Set(rules.map((r) => r.checklist_type).filter(Boolean))].sort(), [rules]);
  const filtered = useMemo(() => rules.filter((r) => {
    const text = `${r.question_text || ""} ${r.checklist_type || ""} ${r.departments || ""}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (typeFilter === "All checklist types" || r.checklist_type === typeFilter) && (statusFilter === "All statuses" || (Number(r.is_active) ? "Active" : "Inactive") === statusFilter) && (priorityFilter === "All priorities" || r.priority === priorityFilter);
  }), [rules, search, typeFilter, statusFilter, priorityFilter]);
  useEffect(() => setPage(1), [search, typeFilter, statusFilter, priorityFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const clearForm = () => { setEditing(null); setForm(empty); setError(""); setNotice(""); navigate("/issue-control-center"); };
  const chooseQuestion = (value) => {
    const q = questions.find((item) => String(questionId(item)) === String(value));
    if (!q) { setForm((old) => ({ ...old, question_id: value })); return; }
    setForm((old) => ({ ...old, question_id: String(questionId(q)), question_text: questionText(q), checklist_type: checklistType(q) || old.checklist_type }));
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form, question_id: form.question_id && form.question_id !== "__legacy__" ? Number(form.question_id) : null, question_text: String(form.question_text || "").trim(), sla_days: Number(form.sla_days) || 0, is_active: Number(form.is_active) };
      if (!payload.question_text) throw new Error("Select a checklist question.");
      if (editing) await updateIssueRule(editing, payload); else await createIssueRule(payload);
      await load(); navigate("/issue-control-center"); setNotice(editing ? "Issue rule updated successfully." : "Issue rule created successfully.");
    } catch (e) { setError(e.response?.data?.message || e.message || "Could not save rule."); }
    finally { setBusy(false); }
  };
  const edit = (rule) => navigate(`/issue-control-center/${rule.id}/edit`);
  const remove = async (rule) => {
    if (!window.confirm(`Delete rule for “${rule.question_text}”?`)) return;
    try { await deleteIssueRule(rule.id); setNotice("Issue rule deleted."); await load(); }
    catch (e) { setError(e.response?.data?.message || "Delete failed."); }
  };
  const removeAll = async () => {
    if (!window.confirm("Delete ALL Issue Control Center rules? Existing Action Points will not be deleted.")) return;
    try { await deleteAllIssueRules(); setNotice("All issue rules deleted. Existing Action Points were preserved."); await load(); }
    catch (e) { setError(e.response?.data?.message || "Delete all failed."); }
  };
  const clearFilters = () => { setSearch(""); setTypeFilter("All checklist types"); setStatusFilter("All statuses"); setPriorityFilter("All priorities"); setPage(1); };

  return <main className="icc-page">
    <section className="icc-heading"><div className="icc-heading-icon"><FaSlidersH /></div><div><span className="icc-eyebrow">CHECKLIST GOVERNANCE · ADMIN WORKSPACE</span><h1>Issue Control Center</h1><p>Configure which checklist answers indicate a problem and create an Action Point.</p></div><span className="icc-heading-tag">ISSUE RULES</span></section>
    {error && <div className="icc-error" role="alert">{error}</div>}
    {notice && <div className="icc-notice" role="status"><FaCheckCircle />{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {isFormRoute ? <>
      <section className="icc-form-shell"><div className="icc-section-title"><button type="button" className="icc-back" onClick={clearForm}><FaArrowLeft /> Back to rules</button><div><span className="icc-eyebrow">RULE CONFIGURATION</span><h2>{editing ? "Edit issue rule" : "Create issue rule"}</h2><p>Choose the checklist question and define exactly which answer represents an issue.</p></div></div>
        <form className="icc-form" onSubmit={save}>
          <label>Checklist question<select required value={form.question_id || (editing && form.question_text ? "__legacy__" : "")} onChange={(e) => chooseQuestion(e.target.value)}><option value="">Select question</option>{editing && form.question_text && !questions.some((q) => String(questionId(q)) === String(form.question_id) || questionText(q).trim().toLowerCase() === form.question_text.trim().toLowerCase()) && <option value="__legacy__">{form.question_text} (existing rule)</option>}{questions.map((q) => <option key={questionId(q) || questionText(q)} value={questionId(q)}>{questionText(q)}</option>)}</select></label>
          <label>Checklist type<input value={form.checklist_type} onChange={(e) => setForm({ ...form, checklist_type: e.target.value })} placeholder="Checklist type" /></label>
          <label>Expected / no-issue answer<select value={form.expected_answer} onChange={(e) => setForm({ ...form, expected_answer: e.target.value })}><option>Yes</option><option>No</option><option>N/A</option></select></label>
          <label>Issue-trigger answer<select value={form.issue_answer} onChange={(e) => setForm({ ...form, issue_answer: e.target.value })}><option>Yes</option><option>No</option><option>Any non-empty answer</option></select></label>
          <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
          <label>SLA (days)<input type="number" min="0" value={form.sla_days} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} /></label>
          <label>Responsible department(s)<input value={form.departments} onChange={(e) => setForm({ ...form, departments: e.target.value })} placeholder="e.g. Operations, Maintenance" /></label>
          <label>Status<select value={Number(form.is_active)} onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}><option value={1}>Active</option><option value={0}>Inactive</option></select></label>
          <div className="icc-form-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : <><FaPlus /> Add rule</>}</button><button type="button" className="secondary" onClick={clearForm}>Cancel</button></div>
          <p className="icc-help">Correct answers go to Checklist Reports. Only the configured issue-trigger answer should create an Action Point. N/A should not create an Action Point.</p>
        </form>
      </section>
    </> : <>
      <section className="icc-stats"><article><span className="icc-stat-icon violet"><FaListAlt /></span><div><small>Total rules</small><strong>{rules.length}</strong><span>All configured questions</span></div></article><article><span className="icc-stat-icon green"><FaCheckCircle /></span><div><small>Active rules</small><strong>{rules.filter((r) => Number(r.is_active)).length}</strong><span>Used for new submissions</span></div></article><article><span className="icc-stat-icon amber"><FaSlidersH /></span><div><small>Inactive rules</small><strong>{rules.filter((r) => !Number(r.is_active)).length}</strong><span>Saved but not applied</span></div></article></section>
      <section className="icc-toolbar"><div className="icc-search"><FaSearch /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question, checklist or department…" /></div><label className="icc-filter"><span>Checklist type</span><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>All checklist types</option>{types.map((type) => <option key={type}>{type}</option>)}</select></label><label className="icc-filter"><span>Priority</span><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option>All priorities</option>{["Low", "Medium", "High", "Critical"].map((x) => <option key={x}>{x}</option>)}</select></label><label className="icc-filter"><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All statuses</option><option>Active</option><option>Inactive</option></select></label><div className="icc-toolbar-actions"><button type="button" onClick={() => navigate("/issue-control-center/new")}><FaPlus /> Add rule</button><button type="button" className="icc-outline" onClick={() => downloadCsv(filtered)}><FaDownload /> Export</button><button type="button" className="icc-outline" onClick={clearFilters}><FaFilter /> Clear filters</button></div></section>
      <section className="icc-list-card"><div className="icc-list-head"><div><span className="icc-eyebrow">RULE LIBRARY</span><h2>Configured questions <span>{filtered.length}</span></h2><p>Manage the answer conditions that raise corrective Action Points.</p></div><button type="button" className="icc-delete-all" onClick={removeAll}><FaTrash /> Delete all rules</button></div>
        <div className="icc-table-wrap"><table className="icc-table"><thead><tr><th>Checklist / question</th><th>No-issue answer</th><th>Issue answer</th><th>Priority</th><th>SLA</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="8" className="icc-empty">Loading issue rules…</td></tr> : pageRows.map((r) => <tr key={r.id}><td className="icc-question-cell"><b>{r.question_text}</b><small>{r.checklist_type || "Checklist"}</small></td><td><span className="icc-answer good">{r.expected_answer || "—"}</span></td><td><span className="icc-answer issue">{r.issue_answer || "—"}</span></td><td><span className={`icc-priority ${String(r.priority || "medium").toLowerCase()}`}>{r.priority || "Medium"}</span></td><td>{r.sla_days} day(s)</td><td>{r.departments || "—"}</td><td><span className={`icc-status ${Number(r.is_active) ? "active" : "inactive"}`}>{Number(r.is_active) ? "Active" : "Inactive"}</span></td><td className="icc-actions"><button type="button" className="edit" onClick={() => edit(r)}><FaEdit /> Edit</button><button type="button" className="delete" onClick={() => remove(r)}><FaTrash /> Delete</button></td></tr>)}{!loading && !pageRows.length && <tr><td colSpan="8" className="icc-empty">No rules match these filters.</td></tr>}</tbody></table></div>
        <div className="icc-pagination"><span>Showing <b>{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</b> of <b>{filtered.length}</b> rules</span><label>Rows per page<select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><div className="icc-page-controls"><button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><FaChevronLeft /> Previous</button><span>Page <b>{currentPage}</b> of <b>{totalPages}</b></span><button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <FaChevronRight /></button></div></div>
      </section>
    </>}
  </main>;
}

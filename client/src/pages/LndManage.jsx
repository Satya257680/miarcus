import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { lndApi, fullUrl, errorMessage } from "../services/lndApi";
import usePermission from "../hooks/usePermission";
import "../styles/pages/LearningDevelopment.css";
import "../styles/pages/LndManage.css";
import confirmWithGlass from "../components/common/ConfirmDialog/confirmWithGlass.jsx";

// =================================================================
// LEARNING & DEVELOPMENT — PROGRAM MANAGEMENT (Edit / Full)
//   Add  → create programs & modules
//   Edit → change content, upload media, questions, assignments
//   Full → delete programs / modules, load starter content
// The server re-checks every one of these levels.
// =================================================================

const EMPTY_PROGRAM = { title: "", description: "", audience: "Front End Staff", status: "Active" };
const EMPTY_MODULE = {
  title: "", description: "", highlights: "", durationMin: 15, mandatory: true, allowDownload: true,
  status: "Active", passMark: 70, examMinutes: 15, videoUrl: "",
};
const AUDIENCES = ["Front End Staff", "Sales Executive", "Store Manager", "All Staff"];
const blankQuestion = () => ({ question: "", options: ["", "", "", ""], correct: 0, explanation: "" });

const Modal = ({ title, onClose, wide, children }) => (
  <div className="lm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`lm-modal ${wide ? "lm-modal--wide" : ""}`} role="dialog" aria-modal="true">
      <header><h3>{title}</h3><button className="lm-x" onClick={onClose} aria-label="Close">×</button></header>
      <div className="lm-modal__body">{children}</div>
    </div>
  </div>
);

export default function LndManage() {
  const { canAdd, canEdit, canFull } = usePermission("Learning & Development");
  const [view, setView] = useState("programs");
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // program form
  const [toast, setToast] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedIds, setSelectedIds] = useState([]);
  const [insight, setInsight] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [importing, setImporting] = useState(false);

  // Stable identity so child effects that depend on it do not re-run.
  const flash = useCallback((type, text) => { setToast({ type, text }); window.setTimeout(() => setToast(null), 4000); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPrograms((await lndApi.adminPrograms()).programs); }
    catch (e) { flash("error", errorMessage(e, "Unable to load programs")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); lndApi.report().then((r) => setReportRows(r.rows || [])).catch(() => setReportRows([])); lndApi.lookups().then((r) => setAllUsers(r.users || [])).catch(() => setAllUsers([])); }, [load]);

  const seed = async () => {
    try { const r = await lndApi.seed(); flash("success", r.message); load(); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  const removeProgram = async (p) => {
    if (!await confirmWithGlass(`Delete "${p.title}" with all its modules, files and progress? This cannot be undone.`)) return;
    try { await lndApi.deleteProgram(p.id); flash("success", "Program deleted"); load(); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  const learners = allUsers.length || new Set(reportRows.map((r) => String(r.userId))).size;
  const moduleTotal = programs.reduce((sum, p) => sum + Number(p.moduleCount || 0), 0);
  const completionRate = reportRows.length ? Math.round(reportRows.reduce((sum, r) => sum + Number(r.percent || 0), 0) / reportRows.length) : 0;
  const filteredPrograms = programs.filter((p) => {
    const q = search.trim().toLowerCase();
    return (!q || `${p.title || ""} ${p.description || ""} ${p.audience || ""}`.toLowerCase().includes(q)) &&
      (statusFilter === "All Status" || p.status === statusFilter);
  });
  const pageCount = Math.max(1, Math.ceil(filteredPrograms.length / pageSize));
  const visiblePrograms = filteredPrograms.slice((page - 1) * pageSize, page * pageSize);
  const toggleProgram = (id) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const deleteSelected = async () => {
    const targets = programs.filter((p) => selectedIds.includes(p.id));
    if (!targets.length) return flash("error", "Select at least one program first");
    if (!await confirmWithGlass(`Delete ${targets.length} selected program(s), including modules and learner progress? This cannot be undone.`)) return;
    try {
      for (const p of targets) await lndApi.deleteProgram(p.id);
      setSelectedIds([]); flash("success", `${targets.length} program(s) deleted`); await load();
    } catch (e) { flash("error", errorMessage(e, "Some programs could not be deleted")); await load(); }
  };
  const exportPrograms = () => {
    const rows = filteredPrograms.map((p) => ({ Title: p.title, Description: p.description, Audience: p.audience, Status: p.status, Modules: p.moduleCount || 0, AssignmentRules: (p.assignments || []).length }));
    const keys = ["Title", "Description", "Audience", "Status", "Modules", "AssignmentRules"];
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "miarcus-training-programs.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const importPrograms = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
      const parse = (line) => { const cells = []; let cur = "", quoted = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"' && quoted && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { cells.push(cur.trim()); cur = ""; } else cur += c; } cells.push(cur.trim()); return cells; };
      if (lines.length < 2) throw new Error("CSV must include a header row and at least one program row");
      const headers = parse(lines[0]).map((h) => h.toLowerCase());
      const titleIndex = headers.findIndex((h) => ["title", "program title", "program"].includes(h));
      if (titleIndex < 0) throw new Error("CSV needs a Title or Program Title column");
      let created = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = parse(lines[i]); const title = cells[titleIndex]; if (!title) continue;
        const val = (...names) => { const idx = headers.findIndex((h) => names.includes(h)); return idx >= 0 ? cells[idx] || "" : ""; };
        await lndApi.createProgram({ title, description: val("description", "notes"), audience: val("audience", "audience label") || "All Staff", status: val("status") || "Active" }); created++;
      }
      flash("success", `Imported ${created} program(s)`); await load();
    } catch (e) { flash("error", errorMessage(e, "CSV import failed")); }
    finally { setImporting(false); }
  };

  if (selected) {
    return <ProgramContent program={selected} onBack={() => { setSelected(null); load(); }} flash={flash}
      perms={{ canAdd, canEdit, canFull }} toast={toast} />;
  }

  const stats = [
    { key: "programs", value: programs.length, label: "Total Programs", icon: "▤", tone: "violet", detail: programs.map((p) => `${p.title} · ${p.status}`) },
    { key: "learners", value: learners, label: "Total Learners", icon: "♟", tone: "mint", detail: allUsers.length ? allUsers.slice(0, 60).map((u) => `${u.name} · ${u.email}`) : [...new Set(reportRows.map((r) => r.name))].slice(0, 30) },
    { key: "modules", value: moduleTotal, label: "Total Modules", icon: "▶", tone: "blue", detail: programs.map((p) => `${p.title} · ${p.moduleCount || 0} modules`) },
    { key: "completion", value: `${completionRate}%`, label: "Completion Rate", icon: "▥", tone: "rose", detail: reportRows.slice(0, 30).map((r) => `${r.name} · ${r.program} · ${r.percent}%`) },
  ];

  return (
    <div className="lnd lm lm-premium">
      <section className="lm-hero">
        <div className="lm-hero__copy">
          <Link className="lnd-back lm-back-3d" to="/learning-development">← Back to Learning &amp; Development</Link>
          <h1 className="lnd-h1">Program Management</h1>
          <p>Create, organize and publish engaging training programs for your team.</p>
          <div className="lm-hero__steps"><span>✦ <b>Create</b><small>Build engaging programs</small></span><span>▧ <b>Manage</b><small>Organize modules &amp; content</small></span><span>♙ <b>Assign</b><small>Allocate to roles &amp; stores</small></span><span>▣ <b>Track</b><small>Monitor learner progress</small></span></div>
        </div>
        <img className="lm-hero__art" src="/lnd/learning-hero.png" alt="3D learning, training and achievement illustration" />
      </section>

      <div className="lm-stat-grid">
        {stats.map((stat) => <button key={stat.key} className={`lm-stat lm-stat--${stat.tone}`} onClick={() => setInsight(stat)} aria-label={`View details for ${stat.label}`}>
          <span className="lm-stat__icon">{stat.icon}</span><span className="lm-stat__text"><strong>{stat.value}</strong><small>{stat.label}</small></span><span className="lm-stat__spark" aria-hidden="true">{stat.key === "completion" ? "◌" : stat.key === "learners" ? "↗" : "▥"}</span>
        </button>)}
      </div>

      <div className="lm-toolbar">
        <label className="lm-search"><span>⌕</span><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search programs…" aria-label="Search programs" /></label>
        <select className="lm-filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter program status"><option>All Status</option><option>Active</option><option>Inactive</option></select>
        <div className="lm-toolbar__actions">
          <button className={`lnd-btn lnd-btn--ghost ${view === "programs" ? "lm-on" : ""}`} onClick={() => setView("programs")}>Programs</button>
          <button className={`lnd-btn lnd-btn--ghost ${view === "report" ? "lm-on" : ""}`} onClick={() => setView("report")}>Learner Report</button>
          {canAdd && <label className={`lnd-btn lnd-btn--ghost lm-upload ${importing ? "is-busy" : ""}`}>⇧ {importing ? "Importing…" : "Import / Bulk Upload"}<input type="file" accept=".csv,text/csv" disabled={importing} onChange={(e) => { importPrograms(e.target.files?.[0]); e.target.value = ""; }} /></label>}
          <button className="lnd-btn lnd-btn--ghost" onClick={exportPrograms}>⇩ Export</button>
          {canFull && <><button className="lnd-btn lnd-btn--ghost lm-danger" onClick={deleteSelected}>▤ Delete Selected{selectedIds.length ? ` (${selectedIds.length})` : ""}</button><button className="lnd-btn lnd-btn--ghost lm-danger" onClick={async () => { if (!programs.length) return flash("error", "There are no programs to delete"); if (!await confirmWithGlass(`Delete ALL ${programs.length} programs, including modules, media and learner progress? This cannot be undone.`)) return; try { for (const p of programs) await lndApi.deleteProgram(p.id); setSelectedIds([]); flash("success", `Deleted ${programs.length} programs`); await load(); } catch (e) { flash("error", errorMessage(e, "Delete all stopped because a program could not be deleted")); await load(); } }}>Delete All</button></>}
          {canAdd && <button className="lnd-btn lm-create" onClick={() => setEditing({ ...EMPTY_PROGRAM })}>＋ Create Program</button>}
        </div>
      </div>

      {view === "report" ? <Report canEdit={canEdit} canFull={canFull} flash={flash} /> : loading ? <div className="lnd-panel lnd-empty">Loading programs…</div> : filteredPrograms.length === 0 ? (
        <div className="lnd-panel lnd-empty"><p>{programs.length ? "No programs match your search." : "No programs yet."}</p>{canFull && programs.length === 0 && <button className="lnd-btn" onClick={seed}>Load starter programs from the L&amp;D deck</button>}</div>
      ) : <>
        <div className="lm-card-grid">
          {visiblePrograms.map((p, i) => {
            const fallback = `/lnd/program-${(i % 4) + 1}.jpg`;
            const report = reportRows.filter((r) => String(r.programId) === String(p.id));
            const percent = report.length ? Math.round(report.reduce((sum, r) => sum + Number(r.percent || 0), 0) / report.length) : 0;
            return <article className="lm-program-card" key={p.id}>
              <div className="lm-card-top"><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleProgram(p.id)} aria-label={`Select ${p.title}`} /><span className={`lm-status ${p.status === "Active" ? "on" : ""}`}><i />{p.status || "Active"}</span><button className="lm-card-menu" onClick={() => setEditing({ ...p })} aria-label={`Edit ${p.title}`}>•••</button></div>
              <div className="lm-card-image">{p.thumbUrl ? <img src={fullUrl(p.thumbUrl)} alt={`${p.title} thumbnail`} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallback; }} /> : <img src={fallback} alt="Training program illustration" />}</div>
              <h2>{p.title}</h2><p className="lm-card-desc">{p.description || "Build practical skills and knowledge through focused learning."}</p>
              <div className="lm-card-meta"><span>♟ <small>Audience</small></span><b>{p.audience || "All Staff"}</b><span>▦ <small>Modules</small></span><b>{p.moduleCount || 0} Modules</b><span>♟ <small>Enrolled</small></span><b>{report.length} Learners</b><span>▥ <small>Progress</small></span><b>{report.length ? `${Math.round(report.filter((r) => Number(r.percent) >= 100).length / report.length * 100)}% complete` : "No activity"}</b></div>
              <div className="lm-progress"><span><i style={{ width: `${percent}%` }} /></span><b>{percent}%</b></div>
              <div className="lm-card-actions">{canEdit && <button className="lnd-btn lnd-btn--ghost" onClick={() => setEditing({ ...p })}>✎ Edit</button>}<button className="lnd-btn lm-manage" onClick={() => setSelected(p)}>▱ Manage Modules</button>{canFull && <button className="lnd-btn lnd-btn--ghost lm-danger" onClick={() => removeProgram(p)}>♲ Delete</button>}</div>
            </article>;
          })}
        </div>
        <div className="lm-pagination"><span>Showing {Math.min((page - 1) * pageSize + 1, filteredPrograms.length)} to {Math.min(page * pageSize, filteredPrograms.length)} of {filteredPrograms.length} programs</span><div><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>‹</button>{Array.from({ length: pageCount }, (_, i) => i + 1).slice(Math.max(0, page - 2), Math.min(pageCount, Math.max(3, page + 1))).map((n) => <button key={n} className={page === n ? "active" : ""} onClick={() => setPage(n)}>{n}</button>)}<button disabled={page >= pageCount} onClick={() => setPage((v) => v + 1)}>›</button></div><label>Show <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={4}>4</option><option value={8}>8</option><option value={12}>12</option><option value={24}>24</option></select> per page</label></div>
      </>}

      {insight && <Modal title={insight.label} onClose={() => setInsight(null)}><div className="lm-insight-value">{insight.value}<span>{insight.label}</span></div><p className="lnd-small">Live summary based on the programs and learner report available to your account.</p><div className="lm-insight-list">{insight.detail.length ? insight.detail.map((line, i) => <div key={`${line}-${i}`}>{line}</div>) : <p>No matching report data is available yet.</p>}</div><button className="lnd-btn" onClick={() => { setInsight(null); if (["learners", "completion"].includes(insight.key)) setView("report"); }}>Open detailed report</button></Modal>}
      {editing && <ProgramForm initial={editing} canEdit={canEdit} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); flash("success", msg); load(); }} flash={flash} />}
      {toast && <div className={`lm-toast lm-toast--${toast.type}`}>{toast.text}</div>}
    </div>
  );
}

// ---------------- program create / edit ----------------

function ProgramForm({ initial, onClose, onSaved, flash }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [thumbFile, setThumbFile] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return flash("error", "Program title is required");
    setSaving(true);
    try {
      let saved = form;
      if (form.id) await lndApi.updateProgram(form.id, form);
      else { const result = await lndApi.createProgram(form); saved = { ...form, id: result.id || result.program?.id || result.programId }; setForm(saved); }
      if (thumbFile) { if (!saved.id) throw new Error("Program saved, but the server did not return its ID for thumbnail upload. Reopen Edit to upload the thumbnail."); const uploaded = await lndApi.uploadProgramThumb(saved.id, thumbFile); saved.thumbUrl = uploaded.thumbUrl; setForm(saved); setThumbFile(null); }
      onSaved(form.id ? "Program updated" : "Program created");
    } catch (e) { flash("error", errorMessage(e)); }
    finally { setSaving(false); }
  };

  const uploadThumb = async (file) => {
    if (!file) return;
    try { const r = await lndApi.uploadProgramThumb(form.id, file); set("thumbUrl", r.thumbUrl); flash("success", "Thumbnail updated"); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  return (
    <Modal title={form.id ? "Edit Program" : "Create Program"} onClose={onClose}>
      <label className="lm-f">Program title *<input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} /></label>
      <label className="lm-f">Description<textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
      <div className="lm-two">
        <label className="lm-f">Audience label
          <input list="lm-aud" value={form.audience} onChange={(e) => set("audience", e.target.value)} />
          <datalist id="lm-aud">{AUDIENCES.map((a) => <option key={a} value={a} />)}</datalist>
        </label>
        <label className="lm-f">Status
          <select value={form.status} onChange={(e) => set("status", e.target.value)}><option>Active</option><option>Inactive</option></select>
        </label>
      </div>
      <label className="lm-f">Program thumbnail (JPG / PNG / WEBP)
        {(form.thumbUrl || thumbFile) && <img className="lm-thumbprev" src={thumbFile ? URL.createObjectURL(thumbFile) : fullUrl(form.thumbUrl)} alt="Program thumbnail preview" />}
        <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => { const file = e.target.files?.[0]; if (form.id) uploadThumb(file); else setThumbFile(file || null); }} />
        <small className="lm-help">Choose an image now; new program thumbnails upload immediately after the program is saved.</small>
      </label>
      <div className="lnd-actions"><button className="lnd-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Program"}</button>
        <button className="lnd-btn lnd-btn--ghost" onClick={onClose}>Cancel</button></div>
    </Modal>
  );
}

// ---------------- program content: assignments + modules ----------------

function ProgramContent({ program, onBack, flash, perms, toast }) {
  const [modules, setModules] = useState([]);
  const [lookups, setLookups] = useState({ designations: [], stores: [], users: [] });
  const [assigned, setAssigned] = useState(() => new Set(program.assignments.map((a) => `${a.kind}:${a.refId ?? ""}`)));
  const [userSearch, setUserSearch] = useState("");
  const [moduleForm, setModuleForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l] = await Promise.all([lndApi.adminProgram(program.id), lndApi.lookups()]);
      setModules(m.modules); setLookups(l);
    } catch (e) { flash("error", errorMessage(e)); }
    finally { setLoading(false); }
  }, [program.id, flash]);

  useEffect(() => { load(); }, [load]);

  const toggle = (kind, ref = "") => setAssigned((prev) => {
    const next = new Set(prev); const key = `${kind}:${ref}`;
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const saveAssign = async () => {
    const list = [...assigned].map((k) => { const [kind, ref] = k.split(":"); return { kind, refId: ref ? Number(ref) : null }; });
    try { const r = await lndApi.saveAssignments(program.id, list); flash("success", `Assignments saved (${r.count} rule${r.count === 1 ? "" : "s"})`); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  const move = async (index, dir) => {
    const next = [...modules]; const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setModules(next);
    try { await lndApi.reorderModules(next.map((m) => m.id)); } catch (e) { flash("error", errorMessage(e)); load(); }
  };

  const removeModule = async (m) => {
    if (!await confirmWithGlass(`Delete module "${m.title}" with its files, questions and progress?`)) return;
    try { await lndApi.deleteModule(m.id); flash("success", "Module deleted"); load(); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return lookups.users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q)).slice(0, 60);
  }, [lookups.users, userSearch]);

  const renderChecks = (kind, items) => (
    <div className="lm-checks">
      {items.map((i) => (
        <label key={i.id}><input type="checkbox" checked={assigned.has(`${kind}:${i.id}`)} disabled={!perms.canEdit} onChange={() => toggle(kind, i.id)} />{i.name}</label>
      ))}
      {!items.length && <span className="lnd-small">None available</span>}
    </div>
  );

  return (
    <div className="lnd lm">
      <button className="lnd-back lm-linkbtn" onClick={onBack}>‹ Back to programs</button>
      <h1 className="lnd-h1">{program.title}</h1>

      <div className="lnd-panel">
        <h3>Assign this program</h3>
        <p className="lnd-small">Staff only see a program when it is assigned to them (by everyone, designation, store or individual).</p>
        <label className="lm-checks lm-all"><span><input type="checkbox" checked={assigned.has("all:")} disabled={!perms.canEdit} onChange={() => toggle("all")} /> All staff with L&amp;D access</span></label>
        <div className="lm-three">
          <div><h4>By role / designation</h4>{renderChecks("designation", lookups.designations)}</div>
          <div><h4>By store</h4>{renderChecks("store", lookups.stores)}</div>
          <div><h4>Individual users</h4>
            <input placeholder="Search users…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            {renderChecks("user", filteredUsers.map((u) => ({ id: u.id, name: `${u.name} (${u.email})` })))}
          </div>
        </div>
        {perms.canEdit && <button className="lnd-btn" onClick={saveAssign}>Save Assignments</button>}
      </div>

      <div className="lnd-panel">
        <div className="lm-head"><h3>Modules ({modules.length})</h3>
          {perms.canAdd && <button className="lnd-btn" onClick={() => setModuleForm({ ...EMPTY_MODULE, programId: program.id })}>+ Add Module</button>}</div>
        {loading ? <p className="lnd-empty">Loading…</p> : modules.length === 0 ? <p className="lnd-empty">No modules yet.</p> : (
          <div className="lnd-list">
            {modules.map((m, i) => (
              <div key={m.id} className="lnd-row">
                <span className="lnd-num">{i + 1}</span>
                <div className="lnd-row__main">
                  <h4>{m.title} {m.status === "Inactive" && <span className="lm-status">Inactive</span>}</h4>
                  <div className="lnd-meta"><span>{m.durationMin} min</span><span>{m.media.length} file(s)</span><span>{m.questionCount} question(s)</span>{m.mandatory && <span>Mandatory</span>}</div>
                </div>
                {perms.canEdit && <>
                  <button className="lnd-btn lnd-btn--sm lnd-btn--ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                  <button className="lnd-btn lnd-btn--sm lnd-btn--ghost" disabled={i === modules.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                  <button className="lnd-btn lnd-btn--sm" onClick={() => setModuleForm(m)}>Edit</button>
                </>}
                {perms.canFull && <button className="lnd-btn lnd-btn--sm lm-danger" onClick={() => removeModule(m)}>Delete</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {moduleForm && <ModuleEditor initial={moduleForm} programId={program.id} flash={flash} onClose={() => { setModuleForm(null); load(); }} />}
      {toast && <div className={`lm-toast lm-toast--${toast.type}`}>{toast.text}</div>}
    </div>
  );
}

// ---------------- module editor: details / media / assessment ----------------

function ModuleEditor({ initial, programId, onClose, flash }) {
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [moduleThumb, setModuleThumb] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveDetails = async () => {
    if (!form.title.trim()) return flash("error", "Module title is required");
    setSaving(true);
    try {
      let moduleId = form.id;
      if (form.id) { await lndApi.updateModule(form.id, form); }
      else {
        const r = await lndApi.createModule(form);
        moduleId = r.id || r.module?.id;
        setForm((f) => ({ ...f, id: moduleId, media: r.media || [] }));
      }
      if (moduleThumb && moduleId) await lndApi.uploadMedia(moduleId, [moduleThumb]);
      flash("success", form.id ? "Module saved" : "Module created — add files and an assessment in the other tabs.");
    } catch (e) { flash("error", errorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={form.id ? `Edit Module — ${form.title}` : "Add Module"} onClose={onClose} wide>
      <div className="lnd-tabs">
        {[["details", "Details"], ["media", "Videos / Images / PDFs"], ["exam", "Assessment"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} disabled={k !== "details" && !form.id} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "details" && (
        <>
          <label className="lm-f">Module title *<input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} /></label>
          <label className="lm-f">Description / notes<textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label className="lm-f">Key highlights (separate with |)<input value={form.highlights} onChange={(e) => set("highlights", e.target.value)} placeholder="Product Range|Size Guide|Key Features" /></label>
          <label className="lm-f">Module thumbnail / cover image (JPG / PNG / WEBP)
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setModuleThumb(e.target.files?.[0] || null)} />
            <small className="lm-help">Saved to the module's media library using the existing secure upload API.</small>
          </label>
          <label className="lm-f">External video link (optional, https://)<input value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtu.be/…" /></label>
          <div className="lm-three">
            <label className="lm-f">Duration (min)<input type="number" min={1} value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} /></label>
            <label className="lm-f">Pass mark (%)<input type="number" min={1} max={100} value={form.passMark} onChange={(e) => set("passMark", e.target.value)} /></label>
            <label className="lm-f">Exam time (min)<input type="number" min={1} value={form.examMinutes} onChange={(e) => set("examMinutes", e.target.value)} /></label>
          </div>
          <div className="lm-toggles">
            <label><input type="checkbox" checked={form.mandatory} onChange={(e) => set("mandatory", e.target.checked)} /> Mark as mandatory</label>
            <label><input type="checkbox" checked={form.allowDownload} onChange={(e) => set("allowDownload", e.target.checked)} /> Allow download</label>
            <label><input type="checkbox" checked={form.status === "Active"} onChange={(e) => set("status", e.target.checked ? "Active" : "Inactive")} /> Active</label>
          </div>
          <div className="lnd-actions"><button className="lnd-btn" disabled={saving} onClick={saveDetails}>{saving ? "Saving…" : "Save Module"}</button>
            <button className="lnd-btn lnd-btn--ghost" onClick={onClose}>Close</button></div>
        </>
      )}

      {tab === "media" && <MediaTab moduleId={form.id} programId={programId} initialMedia={form.media || []} flash={flash} />}
      {tab === "exam" && <ExamTab moduleId={form.id} flash={flash} />}
    </Modal>
  );
}

function MediaTab({ moduleId, programId, initialMedia, flash }) {
  const [media, setMedia] = useState(initialMedia);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(null);

  const refresh = async () => {
    try {
      const all = await lndApi.adminProgram(programId);
      const m = all.modules.find((x) => x.id === moduleId);
      if (m) setMedia(m.media);
    } catch (_) { /* parent refreshes on close */ }
  };

  const upload = async () => {
    if (!files.length) return;
    setProgress(0);
    try {
      await lndApi.uploadMedia(moduleId, files, setProgress);
      flash("success", `${files.length} file(s) uploaded`);
      setFiles([]);
      await refresh();
    } catch (e) { flash("error", errorMessage(e, "Upload failed")); }
    finally { setProgress(null); }
  };

  const remove = async (m) => {
    if (!await confirmWithGlass(`Delete "${m.name}"?`)) return;
    try { await lndApi.deleteMedia(m.id); setMedia((list) => list.filter((x) => x.id !== m.id)); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  return (
    <div>
      <div className="lm-drop">
        <strong>Upload video, images or PDFs</strong>
        <small>MP4 / MOV / WEBM · JPG / PNG / WEBP / GIF · PDF — files are checked on the server.</small>
        <input type="file" multiple accept=".mp4,.mov,.webm,.jpg,.jpeg,.png,.webp,.gif,.pdf" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        {files.length > 0 && <small>{files.length} file(s) selected ({(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB)</small>}
        {progress !== null && <div className="lnd-bar"><span style={{ width: `${progress}%` }} /></div>}
        <button className="lnd-btn" disabled={!files.length || progress !== null} onClick={upload}>{progress !== null ? `Uploading ${progress}%` : "Upload"}</button>
      </div>
      <div className="lnd-list" style={{ marginTop: 12 }}>
        {media.length === 0 && <p className="lnd-empty">No files uploaded yet.</p>}
        {media.map((m) => (
          <div key={m.id} className="lnd-row">
            {m.kind === "image" ? <img className="lm-mini" src={fullUrl(m.url)} alt="" /> : <span className="lnd-num">{m.kind === "video" ? "▶" : "PDF"}</span>}
            <div className="lnd-row__main"><h4>{m.name}</h4><div className="lnd-meta"><span>{m.kind}</span><span>{(m.size / 1024 / 1024).toFixed(1)} MB</span></div></div>
            <a className="lnd-btn lnd-btn--sm lnd-btn--ghost" href={fullUrl(m.url)} target="_blank" rel="noreferrer noopener">Preview</a>
            <button className="lnd-btn lnd-btn--sm lm-danger" onClick={() => remove(m)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamTab({ moduleId, flash }) {
  const [questions, setQuestions] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    lndApi.questions(moduleId).then((r) => setQuestions(r.questions)).catch((e) => flash("error", errorMessage(e)));
  }, [moduleId, flash]);

  if (!questions) return <p className="lnd-empty">Loading…</p>;

  const update = (i, patch) => setQuestions((qs) => qs.map((q, x) => (x === i ? { ...q, ...patch } : q)));
  const setOption = (i, j, value) => update(i, { options: questions[i].options.map((o, x) => (x === j ? value : o)) });

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = questions.map((q) => {
        const keep = q.options.map((o, idx) => ({ o: o.trim(), idx })).filter((x) => x.o);
        return { ...q, options: keep.map((x) => x.o), correct: Math.max(0, keep.findIndex((x) => x.idx === q.correct)) };
      });
      const r = await lndApi.saveQuestions(moduleId, cleaned);
      flash("success", `${r.count} question(s) saved`);
    } catch (e) { flash("error", errorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <p className="lnd-small">Learners are graded on the server — the correct answers are never sent to their browser. A module with no questions is completed with “Mark as Complete”.</p>
      {questions.map((q, i) => (
        <div key={i} className="lm-q">
          <div className="lm-q__head"><strong>Question {i + 1}</strong>
            <button className="lnd-btn lnd-btn--sm lm-danger" onClick={() => setQuestions((qs) => qs.filter((_, x) => x !== i))}>Remove</button></div>
          <textarea rows={2} placeholder="Question text" value={q.question} onChange={(e) => update(i, { question: e.target.value })} />
          {q.options.map((o, j) => (
            <label key={j} className="lm-opt">
              <input type="radio" name={`c${i}`} checked={q.correct === j} onChange={() => update(i, { correct: j })} title="Correct answer" />
              <input value={o} placeholder={`Option ${j + 1}`} onChange={(e) => setOption(i, j, e.target.value)} />
            </label>
          ))}
          <input placeholder="Explanation (shown after passing, optional)" value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} />
        </div>
      ))}
      <div className="lnd-actions">
        <button className="lnd-btn lnd-btn--ghost" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>+ Add Question</button>
        <button className="lnd-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Assessment"}</button>
      </div>
    </div>
  );
}

// ---------------- learner report ----------------

function Report({ canEdit, canFull, flash }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeRow, setActiveRow] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [certificateError, setCertificateError] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState("");
  const refresh = useCallback(() => {
    setError("");
    return lndApi.report().then((r) => setRows(r.rows || [])).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((r) => `${r.name || ""} ${r.email || ""} ${r.designation || ""} ${r.program || ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const openDetails = async (row) => {
    setActiveRow(row);
    setCertificate(null);
    setCertificateError("");
    if (row.certifiedAt) {
      try {
        const result = await lndApi.reportCertificate(row.userId, row.programId);
        setCertificate(result.certificate || null);
      } catch (e) { setCertificateError(errorMessage(e, "Certificate details could not be loaded.")); }
    }
  };

  const saveProgress = async () => {
    if (!editingRow) return;
    setSaving(true);
    try {
      const result = await lndApi.updateReportProgress(editingRow.userId, editingRow.programId, completed);
      flash("success", result.message || "Learner report updated.");
      setEditingRow(null);
      await refresh();
    } catch (e) { flash("error", errorMessage(e, "Unable to update learner progress.")); }
    finally { setSaving(false); }
  };

  const deleteRow = async (row) => {
    const key = `${row.userId}-${row.programId}`;
    if (!await confirmWithGlass(`Delete ${row.name}'s progress for ${row.program}? This also removes the certificate record, if issued.`)) return;
    setDeletingKey(key);
    try {
      const result = await lndApi.deleteReportProgress(row.userId, row.programId);
      flash("success", result.message || "Learner report deleted.");
      await refresh();
    } catch (e) { flash("error", errorMessage(e, "Unable to delete learner report.")); }
    finally { setDeletingKey(""); }
  };

  if (error) return <div className="lnd-state lnd-state--err">{error}</div>;
  if (!rows) return <div className="lnd-state">Loading learner reports…</div>;
  return <>
    <section className="lnd-panel lm-report-panel">
      <div className="lm-report-heading"><div><h2>Learner Report</h2><p>Review training progress, scores and issued certificates.</p></div><span className="lm-report-count">{filteredRows.length} learners</span></div>
      <label className="lm-report-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search learner, designation or program…" aria-label="Search learner report" /></label>
      <div className="lm-scroll"><table className="lm-table lm-report-table">
        <thead><tr><th>Learner</th><th>Designation</th><th>Program</th><th>Progress</th><th>Avg score</th><th>Certified</th><th className="lm-action-col">Actions</th></tr></thead>
        <tbody>{filteredRows.map((r) => {
          const key = `${r.userId}-${r.programId}`;
          return <tr key={key}>
            <td><strong>{r.name}</strong><div className="lnd-small">{r.email}</div></td>
            <td>{r.designation || "—"}</td><td>{r.program}</td>
            <td><div className="lm-report-progress"><span><i style={{ width: `${Math.min(100, Math.max(0, Number(r.percent) || 0))}%` }} /></span><b>{r.done}/{r.total} · {r.percent}%</b></div></td>
            <td>{r.avgScore === null ? "—" : `${r.avgScore}%`}</td>
            <td>{r.certifiedAt ? <span className="lm-cert-pill">Certified · {new Date(r.certifiedAt).toLocaleDateString()}</span> : <span className="lm-not-certified">Not yet</span>}</td>
            <td><div className="lm-report-actions"><button type="button" className="lm-action-view" onClick={() => openDetails(r)}>View</button>{canEdit && <button type="button" className="lm-action-edit" onClick={() => { setEditingRow(r); setCompleted(Number(r.percent) >= 100); }}>Edit</button>}{canFull && <button type="button" className="lm-action-delete" disabled={deletingKey === key} onClick={() => deleteRow(r)}>{deletingKey === key ? "Deleting…" : "Delete"}</button>}</div></td>
          </tr>;
        })}</tbody>
      </table></div>
      {!filteredRows.length && <div className="lm-report-empty">{rows.length ? "No learner reports match your search." : "No learner activity yet."}</div>}
    </section>

    {activeRow && <Modal title="Learner Report Details" wide onClose={() => { setActiveRow(null); setCertificate(null); }}>
      <div className="lm-detail-banner"><div className="lm-detail-avatar">{String(activeRow.name || "L").trim().charAt(0).toUpperCase()}</div><div><h2>{activeRow.name}</h2><p>{activeRow.email}</p><span>{activeRow.designation || "Designation not set"}</span></div><span className={`lm-detail-status ${Number(activeRow.percent) >= 100 ? "is-complete" : ""}`}>{Number(activeRow.percent) >= 100 ? "Completed" : "In progress"}</span></div>
      <div className="lm-detail-grid">
        <div><small>Program</small><strong>{activeRow.program}</strong></div><div><small>Modules completed</small><strong>{activeRow.done} of {activeRow.total}</strong></div><div><small>Completion</small><strong>{activeRow.percent}%</strong></div><div><small>Average assessment score</small><strong>{activeRow.avgScore === null ? "Not available" : `${activeRow.avgScore}%`}</strong></div><div><small>Certificate status</small><strong>{activeRow.certifiedAt ? "Issued" : "Not issued"}</strong></div><div><small>Certificate date</small><strong>{activeRow.certifiedAt ? new Date(activeRow.certifiedAt).toLocaleString() : "—"}</strong></div>
      </div>
      <div className="lm-detail-progress"><div><b>Overall progress</b><strong>{activeRow.percent}%</strong></div><span><i style={{ width: `${Math.min(100, Math.max(0, Number(activeRow.percent) || 0))}%` }} /></span></div>
      <div className="lm-certificate-section"><div className="lm-certificate-section-head"><div><h3>Certificate</h3><p>Certificate details associated with this learner and program.</p></div>{certificate?.code && <button type="button" className="lnd-btn lnd-btn--ghost" onClick={() => window.print()}>Print certificate</button>}</div>
        {certificateError ? <p className="lm-certificate-message">{certificateError}</p> : certificate?.code ? <div className="lm-certificate" id="lm-print-certificate"><div className="lm-certificate-inner"><span className="lm-certificate-kicker">MIARCUS · LEARNING &amp; DEVELOPMENT</span><div className="lm-certificate-medal">✦</div><h2>Certificate of Completion</h2><p>This certificate is proudly presented to</p><h3>{certificate.name || activeRow.name}</h3><p>for successfully completing the training program</p><h4>{certificate.program || activeRow.program}</h4><div className="lm-certificate-footer"><span><small>Certificate ID</small><b>{certificate.code}</b></span><span><small>Date issued</small><b>{new Date(certificate.issuedAt || activeRow.certifiedAt).toLocaleDateString()}</b></span></div></div></div> : <p className="lm-certificate-message">{activeRow.certifiedAt ? "The report indicates a certificate, but its details could not be found." : "A certificate has not been issued yet. It becomes available after the required modules are completed."}</p>}
      </div>
    </Modal>}

    {editingRow && <Modal title="Edit Learner Report" onClose={() => !saving && setEditingRow(null)}>
      <div className="lm-edit-learner"><strong>{editingRow.name}</strong><span>{editingRow.program}</span><p>Use this only to correct the completion status. Marking the learner complete updates all active modules for this program. Resetting progress removes any issued certificate for this program.</p></div>
      <label className="lm-f">Completion status<select value={completed ? "completed" : "incomplete"} onChange={(e) => setCompleted(e.target.value === "completed")}><option value="incomplete">In progress — reset module completion</option><option value="completed">Completed — mark all active modules complete</option></select></label>
      <div className="lnd-actions"><button className="lnd-btn" disabled={saving} onClick={saveProgress}>{saving ? "Saving…" : "Save Changes"}</button><button className="lnd-btn lnd-btn--ghost" disabled={saving} onClick={() => setEditingRow(null)}>Cancel</button></div>
    </Modal>}
  </>;
}

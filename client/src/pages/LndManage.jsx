import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { lndApi, fullUrl, errorMessage } from "../services/lndApi";
import usePermission from "../hooks/usePermission";
import "../styles/pages/LearningDevelopment.css";
import "../styles/pages/LndManage.css";

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

  // Stable identity so child effects that depend on it do not re-run.
  const flash = useCallback((type, text) => { setToast({ type, text }); window.setTimeout(() => setToast(null), 4000); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPrograms((await lndApi.adminPrograms()).programs); }
    catch (e) { flash("error", errorMessage(e, "Unable to load programs")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    try { const r = await lndApi.seed(); flash("success", r.message); load(); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  const removeProgram = async (p) => {
    if (!window.confirm(`Delete "${p.title}" with all its modules, files and progress? This cannot be undone.`)) return;
    try { await lndApi.deleteProgram(p.id); flash("success", "Program deleted"); load(); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  if (selected) {
    return <ProgramContent program={selected} onBack={() => { setSelected(null); load(); }} flash={flash}
      perms={{ canAdd, canEdit, canFull }} toast={toast} />;
  }

  return (
    <div className="lnd lm">
      <div className="lm-head">
        <div>
          <Link className="lnd-back" to="/learning-development">‹ Back to Learning &amp; Development</Link>
          <h1 className="lnd-h1">Program Management</h1>
          <p className="lnd-small">Create and manage training programs, modules, videos, images, assessments and assign them to roles, stores or people.</p>
        </div>
        <div className="lnd-actions">
          <button className={`lnd-btn lnd-btn--ghost ${view === "programs" ? "lm-on" : ""}`} onClick={() => setView("programs")}>Programs</button>
          <button className={`lnd-btn lnd-btn--ghost ${view === "report" ? "lm-on" : ""}`} onClick={() => setView("report")}>Learner Report</button>
          {canAdd && view === "programs" && <button className="lnd-btn" onClick={() => setEditing({ ...EMPTY_PROGRAM })}>+ Create Program</button>}
        </div>
      </div>

      {view === "report" ? <Report /> : (
        <div className="lnd-panel">
          {loading ? <p className="lnd-empty">Loading…</p> : programs.length === 0 ? (
            <div className="lnd-empty">
              <p>No programs yet.</p>
              {canFull && <button className="lnd-btn" onClick={seed}>Load starter programs from the L&amp;D deck</button>}
            </div>
          ) : (
            <div className="lm-scroll">
              <table className="lm-table">
                <thead><tr><th></th><th>Program</th><th>Audience</th><th>Modules</th><th>Assigned to</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.id}>
                      <td>{p.thumbUrl ? <img className="lm-mini" src={fullUrl(p.thumbUrl)} alt="" /> : <div className="lm-mini lm-mini--e">{p.title[0]}</div>}</td>
                      <td><strong>{p.title}</strong><div className="lnd-small">{p.description}</div></td>
                      <td>{p.audience}</td>
                      <td>{p.moduleCount}</td>
                      <td>{p.assignments.length ? `${p.assignments.length} rule${p.assignments.length > 1 ? "s" : ""}` : <span className="lm-warn">Not assigned</span>}</td>
                      <td><span className={`lm-status ${p.status === "Active" ? "on" : ""}`}>{p.status}</span></td>
                      <td className="lm-actions">
                        <button className="lnd-btn lnd-btn--sm" onClick={() => setSelected(p)}>Manage</button>
                        {canEdit && <button className="lnd-btn lnd-btn--sm lnd-btn--ghost" onClick={() => setEditing({ ...p })}>Edit</button>}
                        {canFull && <button className="lnd-btn lnd-btn--sm lm-danger" onClick={() => removeProgram(p)}>Delete</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && <ProgramForm initial={editing} canEdit={canEdit} onClose={() => setEditing(null)}
        onSaved={(msg) => { setEditing(null); flash("success", msg); load(); }} flash={flash} />}
      {toast && <div className={`lm-toast lm-toast--${toast.type}`}>{toast.text}</div>}
    </div>
  );
}

// ---------------- program create / edit ----------------

function ProgramForm({ initial, onClose, onSaved, flash }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return flash("error", "Program title is required");
    setSaving(true);
    try {
      if (form.id) await lndApi.updateProgram(form.id, form);
      else await lndApi.createProgram(form);
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
      {form.id ? (
        <label className="lm-f">Thumbnail image (JPG / PNG / WEBP)
          {form.thumbUrl && <img className="lm-thumbprev" src={fullUrl(form.thumbUrl)} alt="" />}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => uploadThumb(e.target.files?.[0])} />
        </label>
      ) : <p className="lnd-small">Save the program first, then edit it to add a thumbnail.</p>}
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
    if (!window.confirm(`Delete module "${m.title}" with its files, questions and progress?`)) return;
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
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveDetails = async () => {
    if (!form.title.trim()) return flash("error", "Module title is required");
    setSaving(true);
    try {
      if (form.id) { await lndApi.updateModule(form.id, form); flash("success", "Module saved"); }
      else {
        const r = await lndApi.createModule(form);
        setForm((f) => ({ ...f, id: r.id, media: [] }));
        flash("success", "Module created — now add files and an assessment.");
      }
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
    if (!window.confirm(`Delete "${m.name}"?`)) return;
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

function Report() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    lndApi.report().then((r) => setRows(r.rows)).catch((e) => setError(errorMessage(e)));
  }, []);
  if (error) return <div className="lnd-state lnd-state--err">{error}</div>;
  if (!rows) return <div className="lnd-state">Loading…</div>;
  if (!rows.length) return <div className="lnd-state">No learner activity yet.</div>;
  return (
    <div className="lnd-panel lm-scroll">
      <table className="lm-table">
        <thead><tr><th>Learner</th><th>Designation</th><th>Program</th><th>Progress</th><th>Avg score</th><th>Certified</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.userId}-${r.programId}`}>
              <td><strong>{r.name}</strong><div className="lnd-small">{r.email}</div></td>
              <td>{r.designation || "—"}</td><td>{r.program}</td>
              <td>{r.done}/{r.total} · {r.percent}%</td>
              <td>{r.avgScore === null ? "—" : `${r.avgScore}%`}</td>
              <td>{r.certifiedAt ? new Date(r.certifiedAt).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

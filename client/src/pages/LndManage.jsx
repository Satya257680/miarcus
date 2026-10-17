import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { lndApi, fullUrl, errorMessage } from "../services/lndApi";
import usePermission from "../hooks/usePermission";
import confirmWithGlass from "../components/common/ConfirmDialog/confirmWithGlass.jsx";
import LndArt from "../components/lnd/LndArt";
import "../styles/pages/LearningDevelopment.css";
import "../styles/pages/LndManage.css";

// =================================================================
// LEARNING & DEVELOPMENT — PROGRAM MANAGEMENT (Edit / Full)
//
//   1. Create Program  → saved as DRAFT (title, description, cover…)
//   2. Manage Program  → Modules · Assignment · Learners · Publish
//      • Add / Edit Module is ONE guided flow:
//        Details → Content (video / PDF / images) → Assessment → Review
//        and everything is saved together with one "Save Module".
//   3. Publish         → assigned learners get an email; later updates
//                        are announced with "Notify learners".
//
//   Add  → create programs & modules
//   Edit → change content, upload media, questions, assignments, publish
//   Full → delete programs / modules, load starter content
// The server re-checks every one of these levels.
// =================================================================

const PERM = "Learning & Development";
const AUDIENCES = ["Front End Staff", "Sales Executive", "Store Manager", "All Staff"];
const STATUS_LABEL = { Draft: "Draft", Active: "Published", Inactive: "Unpublished" };
const SAMPLE_COVERS = ["/lnd/program-1.jpg", "/lnd/program-2.jpg", "/lnd/program-3.jpg", "/lnd/program-4.jpg"];
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const MEDIA_ACCEPT = ".mp4,.mov,.webm,.jpg,.jpeg,.png,.webp,.gif,.pdf";
const MEDIA_EXT = /\.(mp4|mov|webm|jpe?g|png|webp|gif|pdf)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

const EMPTY_PROGRAM = { title: "", description: "", audience: "All Staff", highlights: "", status: "Draft" };
const EMPTY_MODULE = {
  title: "", description: "", highlights: "", durationMin: 15, mandatory: true, allowDownload: true,
  status: "Active", passMark: 70, examMinutes: 15, maxAttempts: 0, videoUrl: "", media: [], questionCount: 0,
};
const blankQuestion = () => ({ question: "", options: ["", "", "", ""], correct: 0, explanation: "" });

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtSize = (bytes) => `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`;
const fileKind = (name) => (/\.(mp4|mov|webm)$/i.test(name) ? "video" : /\.pdf$/i.test(name) ? "pdf" : "image");
const KIND_ICON = { video: "▶", pdf: "PDF", image: "▣", notes: "✎" };
const fallbackCover = (seed) => SAMPLE_COVERS[Math.abs(Number(seed) || 0) % SAMPLE_COVERS.length];

// Preview URL for a staged File, revoked automatically.
const useObjectUrl = (file) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) { setUrl(""); return undefined; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
};

const Modal = ({ title, sub, onClose, wide, children, footer }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="lm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`lm-modal ${wide ? "lm-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><h3>{title}</h3>{sub && <small>{sub}</small>}</div><button className="lm-x" onClick={onClose} aria-label="Close">×</button></header>
        <div className="lm-modal__body">{children}</div>
        {footer && <footer className="lm-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
};

const StatusPill = ({ status }) => (
  <span className={`lm-status lm-status--${String(status || "Draft").toLowerCase()}`}><i />{STATUS_LABEL[status] || status}</span>
);

const DropZone = ({ accept, multiple, onFiles, title, hint, test }) => {
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const take = (list) => {
    const files = Array.from(list || []).filter((f) => !test || test.test(f.name));
    if (files.length) onFiles(files);
  };
  return (
    <div
      className={`lm-drop ${over ? "is-over" : ""}`}
      role="button" tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
    >
      <span className="lm-drop__icon" aria-hidden="true">⇪</span>
      <strong>{title}</strong>
      <small>{hint}</small>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
    </div>
  );
};

// =================================================================
// PAGE
// =================================================================

export default function LndManage() {
  const { canAdd, canEdit, canFull } = usePermission(PERM);
  const [screen, setScreen] = useState({ name: "list" }); // list | form | manage
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(0);

  // Stable identity so child effects that depend on it do not re-run.
  const flash = useCallback((type, text) => {
    window.clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const perms = { canAdd, canEdit, canFull };

  return (
    <>
      {screen.name === "list" && (
        <ProgramList perms={perms} flash={flash}
          onCreate={() => setScreen({ name: "form", program: { ...EMPTY_PROGRAM } })}
          onEdit={(p) => setScreen({ name: "form", program: p, back: "list" })}
          onManage={(id) => setScreen({ name: "manage", id })} />
      )}
      {screen.name === "form" && (
        <ProgramForm initial={screen.program} perms={perms} flash={flash}
          onCancel={() => setScreen(screen.back === "manage" ? { name: "manage", id: screen.program.id } : { name: "list" })}
          onSaved={(id, created, warning) => {
            if (warning) flash("error", warning);
            else flash("success", created ? "Program saved as draft — now add modules, assign learners and publish." : "Program updated");
            setScreen({ name: "manage", id });
          }} />
      )}
      {screen.name === "manage" && (
        <ProgramManage id={screen.id} perms={perms} flash={flash}
          onBack={() => setScreen({ name: "list" })}
          onEdit={(p) => setScreen({ name: "form", program: p, back: "manage" })} />
      )}
      {toast && <div className={`lm-toast lm-toast--${toast.type}`} role="status">{toast.text}</div>}
    </>
  );
}

// =================================================================
// PROGRAM LIST
// =================================================================

function ProgramList({ perms, flash, onCreate, onEdit, onManage }) {
  const { canAdd, canEdit, canFull } = perms;
  const [view, setView] = useState("programs");
  const [programs, setPrograms] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await lndApi.adminPrograms();
      setPrograms(r.programs || []);
      setSummary(r.summary || null);
    } catch (e) { flash("error", errorMessage(e, "Unable to load programs")); }
    finally { setLoading(false); }
  }, [flash]);
  useEffect(() => { load(); }, [load]);

  const audiences = useMemo(() => [...new Set(programs.map((p) => p.audience).filter(Boolean))], [programs]);
  const filtered = programs.filter((p) => {
    const q = search.trim().toLowerCase();
    return (!q || `${p.title} ${p.description} ${p.audience}`.toLowerCase().includes(q)) &&
      (!statusFilter || p.status === statusFilter) && (!audienceFilter || p.audience === audienceFilter);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const removeProgram = async (p) => {
    if (!await confirmWithGlass({ title: "Delete Program", message: `Delete "${p.title}" with all its modules, files, learner progress and certificates? This cannot be undone.`, recordName: p.title, confirmText: "Delete Program" })) return;
    try { await lndApi.deleteProgram(p.id); flash("success", "Program deleted"); setSelectedIds((ids) => ids.filter((x) => x !== p.id)); load(); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  const deleteMany = async (targets, label) => {
    if (!targets.length) return flash("error", "Select at least one program first");
    if (!await confirmWithGlass({ title: label, message: `Delete ${targets.length} program(s), including modules, learner progress and certificates? This cannot be undone.`, confirmText: label })) return;
    let done = 0;
    try {
      for (const p of targets) { await lndApi.deleteProgram(p.id); done += 1; }
      flash("success", `${done} program(s) deleted`);
    } catch (e) { flash("error", `${done} deleted, then stopped: ${errorMessage(e)}`); }
    setSelectedIds([]);
    load();
  };

  const exportPrograms = () => {
    const keys = ["Title", "Description", "Audience", "Status", "Modules", "Learners", "Certificates", "Completion"];
    const rows = filtered.map((p) => [p.title, p.description, p.audience, STATUS_LABEL[p.status] || p.status, p.moduleCount, p.learnerCount, p.certificateCount, `${p.completionRate}%`]);
    const csv = [keys, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "miarcus-training-programs.csv"; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importPrograms = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.trim());
      const parse = (line) => { const cells = []; let cur = "", quoted = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"' && quoted && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { cells.push(cur.trim()); cur = ""; } else cur += c; } cells.push(cur.trim()); return cells; };
      if (lines.length < 2) throw new Error("CSV must include a header row and at least one program row");
      const headers = parse(lines[0]).map((h) => h.toLowerCase());
      const titleIndex = headers.findIndex((h) => ["title", "program title", "program"].includes(h));
      if (titleIndex < 0) throw new Error("CSV needs a Title or Program Title column");
      let created = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = parse(lines[i]); const title = cells[titleIndex]; if (!title) continue;
        const val = (...names) => { const idx = headers.findIndex((h) => names.includes(h)); return idx >= 0 ? cells[idx] || "" : ""; };
        await lndApi.createProgram({ title, description: val("description", "notes"), audience: val("audience", "audience label") || "All Staff", highlights: val("highlights", "key highlights") });
        created++;
      }
      flash("success", `Imported ${created} program(s) as drafts`);
      await load();
    } catch (e) { flash("error", errorMessage(e, "CSV import failed")); }
    finally { setImporting(false); }
  };

  const stats = [
    { key: "programs", value: summary?.programs ?? programs.length, label: "Total Programs", sub: `${summary?.published ?? 0} published`, icon: "▤", tone: "violet" },
    { key: "learners", value: summary?.learners ?? 0, label: "Total Learners", sub: "assigned to published programs", icon: "♟", tone: "mint" },
    { key: "modules", value: summary?.modules ?? 0, label: "Total Modules", sub: "across all programs", icon: "▶", tone: "blue" },
    { key: "completion", value: `${summary?.completionRate ?? 0}%`, label: "Completion Rate", sub: "certificates / learners", icon: "★", tone: "gold" },
  ];

  return (
    <div className="lnd lm">
      <section className="lm-hero lnd-glass">
        <span className="lm-hero__tile" aria-hidden="true"><LndArt kind="learning" /></span>
        <div className="lm-hero__copy">
          <Link className="lm-crumb" to="/learning-development">‹ Learning &amp; Development</Link>
          <h1>Program Management</h1>
          <p>Create, organize and publish engaging training programs for your team.</p>
          <ol className="lm-flow">
            <li><b>1</b><span>Create<small>Program as draft</small></span></li>
            <li><b>2</b><span>Manage<small>Modules &amp; content</small></span></li>
            <li><b>3</b><span>Assign<small>Roles, stores, people</small></span></li>
            <li><b>4</b><span>Publish<small>Learners get an email</small></span></li>
          </ol>
        </div>
        <div className="lm-hero__art"><LndArt kind="module" /></div>
      </section>

      <div className="lm-stat-grid">
        {stats.map((s) => (
          <div key={s.key} className={`lm-stat lm-stat--${s.tone} lnd-glass`}>
            <span className="lm-stat__icon" aria-hidden="true">{s.icon}</span>
            <span className="lm-stat__text"><strong>{s.value}</strong><small>{s.label}</small><em>{s.sub}</em></span>
          </div>
        ))}
      </div>

      <div className="lm-toolbar lnd-glass">
        <label className="lm-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search programs…" aria-label="Search programs" /></label>
        <select className="lm-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All Status</option><option value="Draft">Draft</option><option value="Active">Published</option><option value="Inactive">Unpublished</option>
        </select>
        <select className="lm-select" value={audienceFilter} onChange={(e) => { setAudienceFilter(e.target.value); setPage(1); }} aria-label="Filter by audience">
          <option value="">All Audience</option>{audiences.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="lm-seg" role="tablist">
          <button role="tab" aria-selected={view === "programs"} className={view === "programs" ? "on" : ""} onClick={() => setView("programs")}>Programs</button>
          <button role="tab" aria-selected={view === "report"} className={view === "report" ? "on" : ""} onClick={() => setView("report")}>Learner Report</button>
        </div>
        <div className="lm-toolbar__actions">
          {canAdd && <label className={`lnd-btn lnd-btn--ghost lnd-btn--sm lm-upload ${importing ? "is-busy" : ""}`} title="CSV with a Title column (Description, Audience, Highlights optional)">⇧ {importing ? "Importing…" : "Import CSV"}<input type="file" accept=".csv,text/csv" disabled={importing} onChange={(e) => { importPrograms(e.target.files?.[0]); e.target.value = ""; }} /></label>}
          <button className="lnd-btn lnd-btn--ghost lnd-btn--sm" onClick={exportPrograms}>⇩ Export</button>
          {canFull && selectedIds.length > 0 && <button className="lnd-btn lnd-btn--danger lnd-btn--sm" onClick={() => deleteMany(programs.filter((p) => selectedIds.includes(p.id)), "Delete Selected")}>Delete Selected ({selectedIds.length})</button>}
          {canFull && programs.length > 0 && <button className="lnd-btn lnd-btn--danger lnd-btn--sm" onClick={() => deleteMany(programs, "Delete All")}>Delete All</button>}
          {canAdd && <button className="lnd-btn" onClick={onCreate}>＋ Create Program</button>}
        </div>
      </div>

      {view === "report" ? <Report canEdit={canEdit} canFull={canFull} flash={flash} /> : loading ? (
        <div className="lnd-state"><span className="lnd-spinner" />Loading programs…</div>
      ) : filtered.length === 0 ? (
        <div className="lnd-empty lnd-glass">
          <div className="lnd-empty__art"><LndArt kind="learning" /></div>
          <h3>{programs.length ? "No programs match your filters" : "No programs yet"}</h3>
          <p>{programs.length ? "Clear the search or filters." : "Create your first program: add modules with video / PDF and an assessment, assign it, then publish."}</p>
          <div className="lnd-actions lnd-actions--center">
            {canAdd && !programs.length && <button className="lnd-btn" onClick={onCreate}>＋ Create Program</button>}
            {canFull && !programs.length && <button className="lnd-btn lnd-btn--ghost" onClick={async () => { try { const r = await lndApi.seed(); flash("success", r.message); load(); } catch (e) { flash("error", errorMessage(e)); } }}>Load starter programs</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="lm-card-grid">
            {visible.map((p) => (
              <article className="lm-card lnd-glass lnd-tilt" key={p.id}>
                <div className="lm-card__top">
                  {canFull && <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => setSelectedIds((ids) => ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id])} aria-label={`Select ${p.title}`} />}
                  <StatusPill status={p.status} />
                  {canEdit && <button className="lm-card__menu" onClick={() => onEdit(p)} aria-label={`Edit ${p.title}`} title="Edit details">•••</button>}
                </div>
                <button className="lm-card__image" onClick={() => onManage(p.id)} aria-label={`Manage ${p.title}`}>
                  <img src={p.thumbUrl ? fullUrl(p.thumbUrl) : fallbackCover(p.id)} alt="" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackCover(p.id); }} />
                </button>
                <h2>{p.title}</h2>
                <p className="lm-card__desc">{p.description || "Build practical skills through focused learning."}</p>
                <div className="lm-card__meta">
                  <span>♟ {p.audience || "All Staff"}</span>
                  <span>▤ {p.moduleCount} Module{p.moduleCount === 1 ? "" : "s"}</span>
                  <span>☺ {p.learnerCount} Learner{p.learnerCount === 1 ? "" : "s"}</span>
                  <span>★ {p.certificateCount} Certified</span>
                </div>
                <div className="lm-progress"><span><i style={{ width: `${p.completionRate}%` }} /></span><b>{p.completionRate}%</b></div>
                <div className="lm-card__actions">
                  {canEdit && <button className="lnd-btn lnd-btn--ghost lnd-btn--sm" onClick={() => onEdit(p)}>✎ Edit</button>}
                  <button className="lnd-btn lnd-btn--sm" onClick={() => onManage(p.id)}>▤ Manage Modules</button>
                  {canFull && <button className="lm-icon lm-icon--danger" onClick={() => removeProgram(p)} aria-label={`Delete ${p.title}`} title="Delete program">🗑</button>}
                </div>
              </article>
            ))}
          </div>
          <div className="lm-pagination lnd-glass">
            <span>Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}</span>
            <div>
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">‹</button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).filter((n) => Math.abs(n - safePage) <= 2).map((n) => <button key={n} className={safePage === n ? "on" : ""} onClick={() => setPage(n)}>{n}</button>)}
              <button disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} aria-label="Next page">›</button>
            </div>
            <label>Show <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[4, 8, 12, 24].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          </div>
        </>
      )}
    </div>
  );
}

// =================================================================
// CREATE / EDIT PROGRAM
// =================================================================

function ProgramForm({ initial, perms, flash, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_PROGRAM, ...initial }));
  const [cover, setCover] = useState(null);
  const [saving, setSaving] = useState(false);
  const coverUrl = useObjectUrl(cover);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const editing = Boolean(form.id);

  const pickSample = async (src) => {
    try {
      const blob = await (await fetch(src)).blob();
      setCover(new File([blob], src.split("/").pop(), { type: blob.type || "image/jpeg" }));
    } catch (_) { flash("error", "Could not load the sample image"); }
  };

  const save = async () => {
    if (!form.title.trim()) return flash("error", "Program title is required");
    setSaving(true);
    let id = form.id;
    try {
      if (id) {
        // Cover first: a refused publish (400) must not lose the new image.
        if (cover) { await lndApi.uploadProgramThumb(id, cover); setCover(null); }
        const r = await lndApi.updateProgram(id, form);
        if (r?.notify?.queued) flash("success", `Published — ${r.notify.queued} learner(s) will be emailed.`);
      } else {
        id = (await lndApi.createProgram(form)).id;
        setForm((f) => ({ ...f, id }));
        if (cover) { await lndApi.uploadProgramThumb(id, cover); setCover(null); }
      }
      onSaved(id, !editing);
    } catch (e) {
      // Created, but the cover upload failed → continue to Manage and say so.
      if (id && !editing) onSaved(id, true, `Program created as draft, but the cover image failed: ${errorMessage(e)}`);
      else flash("error", errorMessage(e));
    } finally { setSaving(false); }
  };

  const preview = coverUrl || (form.thumbUrl ? fullUrl(form.thumbUrl) : "");

  return (
    <div className="lnd lm">
      <button className="lm-crumb lm-crumb--btn" onClick={onCancel}>‹ Back to Program Management</button>
      <section className="lm-hero lm-hero--sm lnd-glass">
        <span className="lm-hero__tile" aria-hidden="true"><LndArt kind="learning" /></span>
        <div className="lm-hero__copy">
          <h1>{editing ? "Edit Program" : "Create Program"}</h1>
          <p>{editing ? "Update the program details. Learners keep their progress." : "Start with the basics. The program is saved as a draft — add modules and assign learners before publishing."}</p>
        </div>
        <div className="lm-hero__art"><LndArt kind="module" /></div>
      </section>

      <div className="lm-formcard lnd-glass">
        <div className="lm-formcard__main">
          <label className="lm-f"><span>Program title <em>*</em></span>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. Sales Executive Training" autoFocus />
          </label>
          <label className="lm-f">Description
            <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} placeholder="A short description of what learners will achieve…" />
          </label>
          <div className="lm-two">
            <label className="lm-f">Audience label
              <input list="lm-aud" value={form.audience} onChange={(e) => set("audience", e.target.value)} maxLength={80} placeholder="e.g. Store Manager" />
              <datalist id="lm-aud">{AUDIENCES.map((a) => <option key={a} value={a} />)}</datalist>
            </label>
            <label className="lm-f">Status
              {editing ? (
                <select value={form.status} onChange={(e) => set("status", e.target.value)} disabled={!perms.canEdit}>
                  <option value="Draft">Draft (hidden)</option>
                  <option value="Active">Published (visible + email)</option>
                  <option value="Inactive">Unpublished (hidden, progress kept)</option>
                </select>
              ) : <input value="Draft — publish from Manage Program" disabled />}
            </label>
          </div>
          <label className="lm-f"><span>Key highlights <small>(separate with |)</small></span>
            <input value={form.highlights} onChange={(e) => set("highlights", e.target.value)} maxLength={500} placeholder="Product Knowledge | Customer Engagement | Upselling" />
          </label>
          {form.highlights.trim() && <div className="lnd-highlights">{form.highlights.split("|").map((h) => h.trim()).filter(Boolean).map((h) => <div key={h}>✦ {h}</div>)}</div>}
        </div>

        <div className="lm-formcard__side">
          <span className="lm-f">Program cover image</span>
          {preview ? (
            <div className="lm-cover">
              <img src={preview} alt="Program cover preview" />
              {cover && <button className="lm-cover__x" onClick={() => setCover(null)} aria-label="Remove new image">×</button>}
            </div>
          ) : (
            <DropZone accept={IMAGE_ACCEPT} test={IMAGE_EXT} onFiles={(f) => setCover(f[0])} title="Drag & drop an image here" hint="or click to browse · JPG / PNG / WEBP (1280 × 720 recommended)" />
          )}
          {preview && <DropZone accept={IMAGE_ACCEPT} test={IMAGE_EXT} onFiles={(f) => setCover(f[0])} title="Change image" hint="Drop or click to choose another" />}
          <small className="lnd-small">Or pick a sample cover:</small>
          <div className="lm-samples">
            {SAMPLE_COVERS.map((src) => <button key={src} type="button" onClick={() => pickSample(src)} aria-label="Use sample cover"><img src={src} alt="" /></button>)}
          </div>
        </div>

        <div className="lm-formcard__foot">
          <button className="lnd-btn lnd-btn--ghost" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="lnd-btn" onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "＋ Create Program"}</button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// MANAGE PROGRAM
// =================================================================

const STEPS = [
  { key: "modules", label: "Modules", sub: "Create and organize" },
  { key: "assign", label: "Assignment", sub: "Assign to team" },
  { key: "learners", label: "Learners", sub: "Progress & certificates" },
  { key: "publish", label: "Publish", sub: "Make it live" },
];

function ProgramManage({ id, perms, flash, onBack, onEdit }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("modules");
  const [moduleForm, setModuleForm] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try { setData(await lndApi.adminProgram(id)); setError(""); }
    catch (e) { setError(errorMessage(e, "Unable to load program")); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="lnd lm"><button className="lm-crumb lm-crumb--btn" onClick={onBack}>‹ Back to Program Management</button><div className="lnd-state lnd-state--err">{error}<button className="lnd-btn lnd-btn--sm lnd-btn--ghost" onClick={load}>Retry</button></div></div>;
  if (!data) return <div className="lnd lm"><div className="lnd-state"><span className="lnd-spinner" />Loading program…</div></div>;

  const { program, modules } = data;
  const activeModules = modules.filter((m) => m.status === "Active").length;
  const done = {
    modules: activeModules > 0,
    assign: program.assignments.length > 0,
    learners: program.learnerCount > 0,
    publish: program.status === "Active",
  };

  const publish = async () => {
    setBusy("publish");
    try { const r = await lndApi.publishProgram(program.id); flash("success", r.message || "Published"); await load(); }
    catch (e) { flash("error", errorMessage(e)); }
    finally { setBusy(""); }
  };
  const unpublish = async () => {
    if (!await confirmWithGlass({ title: "Unpublish program?", message: "Learners will no longer see this program. Their progress and certificates are kept, and you can publish again any time.", confirmText: "Unpublish", danger: false })) return;
    setBusy("unpublish");
    try { const r = await lndApi.unpublishProgram(program.id); flash("success", r.message); await load(); }
    catch (e) { flash("error", errorMessage(e)); }
    finally { setBusy(""); }
  };

  return (
    <div className="lnd lm">
      <button className="lm-crumb lm-crumb--btn" onClick={onBack}>‹ Back to Program Management</button>

      <section className="lm-manage-head">
        <div className="lm-manage-head__title">
          <img src={program.thumbUrl ? fullUrl(program.thumbUrl) : fallbackCover(program.id)} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackCover(program.id); }} />
          <div>
            <h1>{program.title} <StatusPill status={program.status} /></h1>
            <p>{program.description || "No description yet."}</p>
            <div className="lnd-meta"><span>♟ {program.audience}</span><span>▤ {modules.length} module(s)</span><span>☺ {program.learnerCount} learner(s)</span><span>★ {program.certificateCount} certificate(s)</span>{program.publishedAt && <span>Published {fmtDate(program.publishedAt)}</span>}</div>
          </div>
        </div>
        <div className="lnd-actions">
          {perms.canEdit && <button className="lnd-btn lnd-btn--ghost lnd-btn--sm" onClick={() => onEdit(program)}>✎ Edit Details</button>}
          <Link className="lnd-btn lnd-btn--ghost lnd-btn--sm" to={`/learning-development/program/${program.id}`} title="Open the learner view">◉ Preview</Link>
          {perms.canEdit && (program.status === "Active"
            ? <button className="lnd-btn lnd-btn--danger lnd-btn--sm" disabled={!!busy} onClick={unpublish}>Unpublish</button>
            : <button className="lnd-btn lnd-btn--sm" disabled={!!busy} onClick={() => setStep("publish")}>🚀 Publish…</button>)}
        </div>
      </section>

      <nav className="lm-stepper lnd-glass" aria-label="Program setup steps">
        {STEPS.map((s, i) => (
          <button key={s.key} className={`${step === s.key ? "on" : ""} ${done[s.key] ? "done" : ""}`} onClick={() => setStep(s.key)} aria-current={step === s.key ? "step" : undefined}>
            <b>{done[s.key] && step !== s.key ? "✓" : i + 1}</b>
            <span>{s.label}<small>{s.sub}</small></span>
          </button>
        ))}
      </nav>

      {step === "modules" && <ModulesPanel program={program} modules={modules} perms={perms} flash={flash} reload={load} onOpen={setModuleForm} />}
      {step === "assign" && <AssignPanel program={program} perms={perms} flash={flash} reload={load} />}
      {step === "learners" && <LearnersPanel program={program} flash={flash} />}
      {step === "publish" && <PublishPanel program={program} perms={perms} flash={flash} reload={load} busy={busy} onPublish={publish} onUnpublish={unpublish} goTo={setStep} />}

      {moduleForm && (
        <ModuleWizard initial={moduleForm} programId={program.id} flash={flash}
          onClose={() => setModuleForm(null)}
          onSaved={async (message) => {
            setModuleForm(null);
            await load();
            flash("success", program.status === "Active" ? `${message} Learners see it now — use “Notify learners” on the Publish step to email them.` : message);
          }} />
      )}
    </div>
  );
}

// ---------------- modules ----------------

function ModulesPanel({ program, modules, perms, flash, reload, onOpen }) {
  const [list, setList] = useState(modules);
  useEffect(() => { setList(modules); }, [modules]);

  const move = async (index, dir) => {
    const next = [...list]; const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setList(next);
    try { await lndApi.reorderModules(next.map((m) => m.id)); }
    catch (e) { flash("error", errorMessage(e)); reload(); }
  };

  const remove = async (m) => {
    if (!await confirmWithGlass({ title: "Delete Module", message: `Delete module "${m.title}" with its files, questions and learner progress?`, recordName: m.title, confirmText: "Delete Module" })) return;
    try { await lndApi.deleteModule(m.id); flash("success", "Module deleted"); reload(); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  return (
    <section className="lm-panel lnd-glass">
      <div className="lm-panel__head">
        <div><h2>Modules ({list.length})</h2><p className="lnd-small">Learners take modules in this order. Each module can have a video, PDFs, images and an assessment.</p></div>
        {perms.canAdd && <button className="lnd-btn" onClick={() => onOpen({ ...EMPTY_MODULE, programId: program.id })}>＋ Add Module</button>}
      </div>
      {list.length === 0 ? (
        <div className="lnd-empty"><div className="lnd-empty__art"><LndArt kind="module" /></div><h3>No modules yet</h3><p>Add your first module — title, video or PDF, and an optional assessment — in one guided flow.</p></div>
      ) : (
        <div className="lm-modules">
          {list.map((m, i) => (
            <div key={m.id} className={`lm-module ${m.status !== "Active" ? "is-off" : ""}`}>
              <span className="lm-module__num">{i + 1}</span>
              <span className="lm-module__thumb">{m.thumbUrl ? <img src={fullUrl(m.thumbUrl)} alt="" loading="lazy" /> : <LndArt kind={m.questionCount ? "assessment" : "module"} />}</span>
              <div className="lm-module__main">
                <h4>{m.title}</h4>
                <div className="lm-chips">
                  <span>◷ {m.durationMin} min</span>
                  {m.contentTypes.map((t) => <span key={t} className={`lm-chip lm-chip--${t}`}>{KIND_ICON[t]} {t === "notes" ? "Notes" : t.toUpperCase()}</span>)}
                  {m.questionCount > 0 ? <span className="lm-chip lm-chip--exam">✎ {m.questionCount} question(s) · {m.passMark}%</span> : <span className="lm-chip lm-chip--muted">No assessment</span>}
                  <span className={`lm-chip ${m.mandatory ? "lm-chip--req" : "lm-chip--muted"}`}>{m.mandatory ? "Mandatory" : "Optional"}</span>
                  {m.status !== "Active" && <span className="lm-chip lm-chip--muted">Inactive</span>}
                </div>
              </div>
              <div className="lm-module__actions">
                {perms.canEdit && <>
                  <button className="lm-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${m.title} up`}>↑</button>
                  <button className="lm-icon" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${m.title} down`}>↓</button>
                  <button className="lnd-btn lnd-btn--ghost lnd-btn--sm" onClick={() => onOpen(m)}>✎ Edit</button>
                </>}
                {perms.canFull && <button className="lm-icon lm-icon--danger" onClick={() => remove(m)} aria-label={`Delete ${m.title}`}>🗑</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------- module wizard ----------------

const WIZ = [
  { key: "details", label: "Details", sub: "Basic information" },
  { key: "content", label: "Content", sub: "Video, PDF, images" },
  { key: "exam", label: "Assessment", sub: "Questions & pass mark" },
  { key: "review", label: "Review", sub: "Check & save" },
];

function ModuleWizard({ initial, programId, flash, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_MODULE, ...initial }));
  const [step, setStep] = useState("details");
  const [thumbFile, setThumbFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [media, setMedia] = useState(initial.media || []);
  const [examOn, setExamOn] = useState(Number(initial.questionCount || 0) > 0);
  const [questions, setQuestions] = useState(() => (initial.id && initial.questionCount ? null : [blankQuestion()]));
  const [hadQuestions] = useState(Number(initial.questionCount || 0) > 0);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const thumbUrl = useObjectUrl(thumbFile);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const editing = Boolean(form.id);

  // Existing assessment → load its questions.
  useEffect(() => {
    if (!initial.id || !initial.questionCount) return;
    lndApi.questions(initial.id)
      .then((r) => setQuestions(r.questions?.length ? r.questions.map((q) => ({ ...q, options: [...q.options] })) : [blankQuestion()]))
      .catch((e) => { setQuestions([blankQuestion()]); flash("error", errorMessage(e, "Could not load the questions")); });
  }, [initial.id, initial.questionCount, flash]);

  const updateQ = (i, patch) => setQuestions((qs) => qs.map((q, x) => (x === i ? { ...q, ...patch } : q)));
  const setOption = (i, j, value) => setQuestions((qs) => qs.map((q, x) => (x === i ? { ...q, options: q.options.map((o, y) => (y === j ? value : o)) } : q)));
  const addOption = (i) => setQuestions((qs) => qs.map((q, x) => (x === i && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q)));
  const removeOption = (i, j) => setQuestions((qs) => qs.map((q, x) => {
    if (x !== i || q.options.length <= 2) return q;
    const options = q.options.filter((_, y) => y !== j);
    const correct = q.correct === j ? 0 : q.correct > j ? q.correct - 1 : q.correct;
    return { ...q, options, correct };
  }));

  // Clean questions → { list, problem }
  const cleaned = useMemo(() => {
    if (!examOn || !questions) return { list: [], problem: "" };
    const list = [];
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const keep = q.options.map((o, idx) => ({ o: String(o || "").trim(), idx })).filter((x) => x.o);
      const correct = keep.findIndex((x) => x.idx === q.correct);
      if (!String(q.question || "").trim()) return { list, problem: `Question ${i + 1}: write the question.` };
      if (keep.length < 2) return { list, problem: `Question ${i + 1}: add at least 2 options.` };
      if (correct < 0) return { list, problem: `Question ${i + 1}: choose the correct answer (it cannot be an empty option).` };
      list.push({ question: q.question.trim(), options: keep.map((x) => x.o), correct, explanation: String(q.explanation || "").trim() });
    }
    if (!list.length) return { list, problem: "Add at least one question, or switch the assessment off." };
    return { list, problem: "" };
  }, [examOn, questions]);

  const contentCount = media.length + files.length + (form.videoUrl.trim() ? 1 : 0);
  const problems = [
    !form.title.trim() && "Module title is required (Details).",
    form.videoUrl.trim() && !/^https:\/\//i.test(form.videoUrl.trim()) && "Video link must start with https:// (Content).",
    examOn && questions && cleaned.problem && `${cleaned.problem} (Assessment)`,
    examOn && !questions && "Questions are still loading (Assessment).",
  ].filter(Boolean);

  const goNext = () => {
    const i = WIZ.findIndex((w) => w.key === step);
    if (step === "details" && !form.title.trim()) return flash("error", "Module title is required");
    if (i < WIZ.length - 1) setStep(WIZ[i + 1].key);
  };
  const goBack = () => { const i = WIZ.findIndex((w) => w.key === step); if (i > 0) setStep(WIZ[i - 1].key); };

  const removeExisting = async (m) => {
    if (!await confirmWithGlass({ title: "Delete file", message: `Delete "${m.name}" from this module?`, recordName: m.name, confirmText: "Delete File" })) return;
    try { await lndApi.deleteMedia(m.id); setMedia((list) => list.filter((x) => x.id !== m.id)); flash("success", "File deleted"); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  // ONE save for everything, in a safe order. If a later step fails the
  // earlier ones are kept (form.id is set), so "Save" again only retries.
  const save = async () => {
    if (problems.length) { flash("error", problems[0]); if (!form.title.trim()) setStep("details"); else if (problems[0].includes("(Assessment)")) setStep("exam"); else if (problems[0].includes("(Content)")) setStep("content"); return; }
    if (editing && hadQuestions && !examOn) {
      if (!await confirmWithGlass({ title: "Remove assessment?", message: "This module's questions will be deleted. Learners will complete it by finishing the lesson.", confirmText: "Remove Assessment" })) return;
    }
    setSaving(true);
    let id = form.id;
    let stage = "Module details";
    try {
      const body = { ...form, programId, videoUrl: form.videoUrl.trim() };
      if (id) await lndApi.updateModule(id, body);
      else { id = (await lndApi.createModule(body)).id; setForm((f) => ({ ...f, id })); }

      if (thumbFile) { stage = "Cover image"; await lndApi.uploadModuleThumb(id, thumbFile); setThumbFile(null); }
      if (files.length) {
        stage = "File upload";
        setProgress(0);
        await lndApi.uploadMedia(id, files, setProgress);
        setFiles([]);
      }
      if (examOn) { stage = "Assessment"; await lndApi.saveQuestions(id, cleaned.list); }
      else if (hadQuestions) { stage = "Assessment"; await lndApi.saveQuestions(id, []); }

      onSaved(editing ? "Module saved." : "Module created.");
    } catch (e) {
      flash("error", `${stage} could not be saved: ${errorMessage(e)}${id ? " — everything before this step is saved; press Save again to retry." : ""}`);
    } finally { setSaving(false); setProgress(null); }
  };

  const stepIndex = WIZ.findIndex((w) => w.key === step);

  return (
    <Modal wide onClose={() => !saving && onClose()}
      title={editing ? `Edit Module — ${initial.title}` : "Add Module"}
      sub="Details → Content → Assessment → Review · everything is saved together"
      footer={<>
        <button className="lnd-btn lnd-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <span className="lm-grow" />
        {stepIndex > 0 && <button className="lnd-btn lnd-btn--ghost" onClick={goBack} disabled={saving}>‹ Back</button>}
        {step !== "review" && <button className="lnd-btn lnd-btn--ghost" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Module"}</button>}
        {step !== "review"
          ? <button className="lnd-btn" onClick={goNext} disabled={saving}>Next: {WIZ[stepIndex + 1].label} →</button>
          : <button className="lnd-btn" onClick={save} disabled={saving}>{saving ? (progress !== null ? `Uploading ${progress}%…` : "Saving…") : editing ? "✓ Save Module" : "✓ Create Module"}</button>}
      </>}>

      <div className="lm-wizsteps">
        {WIZ.map((w, i) => (
          <button key={w.key} className={`${step === w.key ? "on" : ""} ${i < stepIndex ? "done" : ""}`} onClick={() => (w.key === "details" || form.title.trim() ? setStep(w.key) : flash("error", "Module title is required"))}>
            <b>{i < stepIndex ? "✓" : i + 1}</b><span>{w.label}<small>{w.sub}</small></span>
          </button>
        ))}
      </div>

      {step === "details" && (
        <div className="lm-wiz-grid">
          <div className="lm-wiz-main">
            <label className="lm-f"><span>Module title <em>*</em></span><input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. Customer Engagement & Upselling" autoFocus /></label>
            <label className="lm-f">Description / notes<textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} placeholder="What the learner will learn. Shown in the Notes tab." /></label>
            <div className="lm-two">
              <label className="lm-f">Duration (minutes)<input type="number" min={1} max={600} value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} /></label>
              <label className="lm-f"><span>Key highlights <small>(separate with |)</small></span><input value={form.highlights} onChange={(e) => set("highlights", e.target.value)} maxLength={500} placeholder="Open questions | Cross-selling" /></label>
            </div>
            <div className="lm-toggles">
              <label className="lm-switch"><input type="checkbox" checked={form.mandatory} onChange={(e) => set("mandatory", e.target.checked)} /><span />Mandatory <small>(needed for the certificate)</small></label>
              <label className="lm-switch"><input type="checkbox" checked={form.allowDownload} onChange={(e) => set("allowDownload", e.target.checked)} /><span />Allow download</label>
              <label className="lm-switch"><input type="checkbox" checked={form.status === "Active"} onChange={(e) => set("status", e.target.checked ? "Active" : "Inactive")} /><span />Active</label>
            </div>
          </div>
          <aside className="lm-wiz-side">
            <span className="lm-f">Module cover image</span>
            {thumbUrl || form.thumbUrl ? (
              <div className="lm-cover lm-cover--sm"><img src={thumbUrl || fullUrl(form.thumbUrl)} alt="Module cover preview" />{thumbFile && <button className="lm-cover__x" onClick={() => setThumbFile(null)} aria-label="Remove new image">×</button>}</div>
            ) : <div className="lm-cover lm-cover--sm lm-cover--art"><LndArt kind="module" /></div>}
            <DropZone accept={IMAGE_ACCEPT} test={IMAGE_EXT} onFiles={(f) => setThumbFile(f[0])} title={thumbUrl || form.thumbUrl ? "Change image" : "Add cover image"} hint="JPG / PNG / WEBP · 1280 × 720" />
            <div className="lm-tips"><b>Quick tips</b><span>Use a clear image for the module.</span><span>Shown to learners in My Training.</span></div>
          </aside>
        </div>
      )}

      {step === "content" && (
        <div className="lm-wiz-stack">
          <label className="lm-f"><span>External video link <small>(optional · YouTube / Vimeo / any https:// link)</small></span>
            <input value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtu.be/…" />
          </label>
          <DropZone accept={MEDIA_ACCEPT} multiple test={MEDIA_EXT}
            onFiles={(list) => setFiles((cur) => [...cur, ...list].slice(0, 20))}
            title="Upload video, PDF or images" hint="Drag & drop or click · MP4 / MOV / WEBM · PDF · JPG / PNG / WEBP / GIF · up to 20 files" />
          {(files.length > 0 || media.length > 0) && (
            <div className="lm-files">
              {media.map((m) => (
                <div key={`m${m.id}`} className="lm-file">
                  <span className={`lm-file__kind lm-file__kind--${m.kind}`}>{KIND_ICON[m.kind]}</span>
                  <div><strong>{m.name}</strong><small>{m.kind} · {fmtSize(m.size)} · saved</small></div>
                  <a className="lnd-btn lnd-btn--ghost lnd-btn--sm" href={fullUrl(m.url)} target="_blank" rel="noreferrer noopener">Preview</a>
                  <button className="lm-icon lm-icon--danger" onClick={() => removeExisting(m)} aria-label={`Delete ${m.name}`}>🗑</button>
                </div>
              ))}
              {files.map((f, i) => (
                <div key={`f${i}-${f.name}`} className="lm-file is-new">
                  <span className={`lm-file__kind lm-file__kind--${fileKind(f.name)}`}>{KIND_ICON[fileKind(f.name)]}</span>
                  <div><strong>{f.name}</strong><small>{fileKind(f.name)} · {fmtSize(f.size)} · uploads on save</small></div>
                  <button className="lm-icon lm-icon--danger" onClick={() => setFiles((cur) => cur.filter((_, x) => x !== i))} aria-label={`Remove ${f.name}`}>×</button>
                </div>
              ))}
            </div>
          )}
          {contentCount === 0 && <p className="lm-hint">No video or files? That is fine — learners will read the notes and press “Mark module as complete” (or go straight to the assessment).</p>}
        </div>
      )}

      {step === "exam" && (
        <div className="lm-wiz-stack">
          <label className="lm-switch lm-switch--big"><input type="checkbox" checked={examOn} onChange={(e) => { setExamOn(e.target.checked); if (e.target.checked && !questions) setQuestions([blankQuestion()]); }} /><span />This module has an assessment</label>
          {!examOn ? (
            <p className="lm-hint">Without an assessment the module is complete when the learner finishes the lesson.</p>
          ) : !questions ? <div className="lnd-state"><span className="lnd-spinner" />Loading questions…</div> : (
            <>
              <div className="lm-three">
                <label className="lm-f">Pass mark (%)<input type="number" min={1} max={100} value={form.passMark} onChange={(e) => set("passMark", e.target.value)} /></label>
                <label className="lm-f">Time limit (minutes)<input type="number" min={1} max={240} value={form.examMinutes} onChange={(e) => set("examMinutes", e.target.value)} /></label>
                <label className="lm-f">Attempts allowed<select value={form.maxAttempts} onChange={(e) => set("maxAttempts", Number(e.target.value))}>
                  <option value={0}>Unlimited</option>{[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select></label>
              </div>
              <p className="lm-hint">Answers are graded on the server; the correct answers are never sent to the learner's browser.</p>
              {questions.map((q, i) => (
                <div key={i} className="lm-q">
                  <div className="lm-q__head"><strong>Question {i + 1}</strong>
                    <button className="lm-icon lm-icon--danger" disabled={questions.length === 1} onClick={() => setQuestions((qs) => qs.filter((_, x) => x !== i))} aria-label={`Remove question ${i + 1}`}>🗑</button></div>
                  <textarea rows={2} placeholder="Question text" value={q.question} onChange={(e) => updateQ(i, { question: e.target.value })} />
                  {q.options.map((o, j) => (
                    <div key={j} className={`lm-opt ${q.correct === j ? "is-correct" : ""}`}>
                      <input type="radio" name={`c${i}`} checked={q.correct === j} onChange={() => updateQ(i, { correct: j })} aria-label={`Option ${j + 1} is correct`} title="Mark as the correct answer" />
                      <input value={o} placeholder={`Option ${j + 1}`} onChange={(e) => setOption(i, j, e.target.value)} />
                      <button className="lm-icon" disabled={q.options.length <= 2} onClick={() => removeOption(i, j)} aria-label={`Remove option ${j + 1}`}>×</button>
                    </div>
                  ))}
                  {q.options.length < 6 && <button className="lm-link" onClick={() => addOption(i)}>＋ Add option</button>}
                  <input placeholder="Explanation (shown after passing, optional)" value={q.explanation} onChange={(e) => updateQ(i, { explanation: e.target.value })} />
                </div>
              ))}
              <button className="lnd-btn lnd-btn--ghost" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>＋ Add Question</button>
              {cleaned.problem && <p className="lnd-note lnd-note--err">{cleaned.problem}</p>}
            </>
          )}
        </div>
      )}

      {step === "review" && (
        <div className="lm-review">
          <div className="lm-review__card">
            <span className="lm-review__icon">✎</span>
            <div><b>Details</b><span>{form.title || "—"} · {form.durationMin} min · {form.mandatory ? "Mandatory" : "Optional"} · {form.status}</span>{thumbFile && <small>New cover image will be uploaded</small>}</div>
            <button className="lm-link" onClick={() => setStep("details")}>Edit</button>
          </div>
          <div className="lm-review__card">
            <span className="lm-review__icon">▶</span>
            <div><b>Content</b><span>{form.videoUrl.trim() ? "Video link · " : ""}{media.length} saved file(s){files.length ? ` · ${files.length} new file(s) to upload` : ""}</span>{contentCount === 0 && <small>No lesson material — notes only</small>}</div>
            <button className="lm-link" onClick={() => setStep("content")}>Edit</button>
          </div>
          <div className="lm-review__card">
            <span className="lm-review__icon">✓</span>
            <div><b>Assessment</b><span>{examOn ? `${cleaned.list.length} question(s) · pass ${form.passMark}% · ${form.examMinutes} min · ${Number(form.maxAttempts) ? `${form.maxAttempts} attempt(s)` : "unlimited attempts"}` : "No assessment"}</span></div>
            <button className="lm-link" onClick={() => setStep("exam")}>Edit</button>
          </div>
          {problems.length > 0
            ? <div className="lnd-note lnd-note--err">{problems.map((p) => <div key={p}>• {p}</div>)}</div>
            : <div className="lnd-note">Everything looks good. Press <b>{editing ? "Save Module" : "Create Module"}</b> to save it all.</div>}
          {progress !== null && <div className="lnd-bar"><span style={{ width: `${progress}%` }} /></div>}
        </div>
      )}
    </Modal>
  );
}

// ---------------- assignment ----------------

const ASSIGN_TABS = [
  { kind: "designation", label: "By Role / Designation" },
  { kind: "department", label: "By Department" },
  { kind: "store", label: "By Store" },
  { kind: "user", label: "Individual Users" },
];

function AssignPanel({ program, perms, flash, reload }) {
  const [lookups, setLookups] = useState(null);
  const [assigned, setAssigned] = useState(() => new Set(program.assignments.map((a) => `${a.kind}:${a.refId ?? ""}`)));
  const [tab, setTab] = useState("designation");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    lndApi.lookups().then((r) => setLookups({ designations: r.designations || [], departments: r.departments || [], stores: r.stores || [], users: r.users || [] }))
      .catch((e) => flash("error", errorMessage(e, "Unable to load roles / stores / users")));
  }, [flash]);

  const toggle = (kind, ref = "") => {
    setDirty(true);
    setAssigned((prev) => {
      const next = new Set(prev); const key = `${kind}:${ref}`;
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const source = lookups ? {
    designation: lookups.designations, department: lookups.departments, store: lookups.stores,
    user: lookups.users.map((u) => ({ id: u.id, name: u.name, sub: u.email })),
  } : null;
  const nameOf = (kind, ref) => source?.[kind]?.find((x) => String(x.id) === String(ref))?.name || `#${ref}`;
  const items = (source?.[tab] || []).filter((i) => !query.trim() || `${i.name} ${i.sub || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const shown = items.slice(0, 300);
  const countOf = (kind) => [...assigned].filter((k) => k.startsWith(`${kind}:`)).length;

  const save = async () => {
    const list = [...assigned].map((k) => { const [kind, ref] = k.split(":"); return { kind, refId: ref ? Number(ref) : null }; });
    setSaving(true);
    try {
      const r = await lndApi.saveAssignments(program.id, list);
      const mail = r.notify?.queued ? ` ${r.notify.queued} newly assigned learner(s) will be emailed.` : "";
      flash("success", `Assignment saved — ${r.learnerCount} learner(s) can see this program${program.status === "Active" ? "" : " once it is published"}.${mail}`);
      setDirty(false);
      reload();
    } catch (e) { flash("error", errorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <section className="lm-panel lnd-glass">
      <div className="lm-panel__head">
        <div><h2>Program Assignment</h2><p className="lnd-small">A learner sees the program when ANY rule matches them (and they can open Learning &amp; Development).</p></div>
        {perms.canEdit && <button className="lnd-btn" onClick={save} disabled={saving || !lookups}>{saving ? "Saving…" : dirty ? "Save Assignment •" : "Save Assignment"}</button>}
      </div>

      <label className={`lm-everyone ${assigned.has("all:") ? "on" : ""}`}>
        <input type="checkbox" checked={assigned.has("all:")} disabled={!perms.canEdit} onChange={() => toggle("all")} />
        <span><b>Everyone</b><small>All staff who can open Learning &amp; Development</small></span>
      </label>

      <div className="lm-assign">
        <div className="lm-assign__pick">
          <div className="lm-seg lm-seg--wrap">
            {ASSIGN_TABS.map((t) => <button key={t.kind} className={tab === t.kind ? "on" : ""} onClick={() => { setTab(t.kind); setQuery(""); }}>{t.label}{countOf(t.kind) ? ` (${countOf(t.kind)})` : ""}</button>)}
          </div>
          <label className="lm-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${ASSIGN_TABS.find((t) => t.kind === tab).label.toLowerCase()}…`} /></label>
          {!lookups ? <div className="lnd-state"><span className="lnd-spinner" />Loading…</div> : (
            <div className="lm-checks">
              {shown.map((i) => (
                <label key={i.id} className={assigned.has(`${tab}:${i.id}`) ? "on" : ""}>
                  <input type="checkbox" checked={assigned.has(`${tab}:${i.id}`)} disabled={!perms.canEdit} onChange={() => toggle(tab, i.id)} />
                  <span>{i.name}{i.sub && <small>{i.sub}</small>}</span>
                </label>
              ))}
              {!items.length && <span className="lnd-small">Nothing found.</span>}
              {items.length > shown.length && <span className="lnd-small">Showing first {shown.length} of {items.length} — search to narrow down.</span>}
            </div>
          )}
        </div>
        <aside className="lm-assign__summary">
          <h4>Selected rules ({assigned.size})</h4>
          {assigned.size === 0 ? <p className="lnd-small">Nobody yet. Pick roles, departments, stores or users.</p> : (
            <div className="lm-rules">
              {[...assigned].map((k) => {
                const [kind, ref] = k.split(":");
                const label = kind === "all" ? "Everyone" : `${ASSIGN_TABS.find((t) => t.kind === kind)?.label.replace("By ", "").replace("Individual Users", "User")}: ${nameOf(kind, ref)}`;
                return <span key={k} className="lm-rule">{label}{perms.canEdit && <button onClick={() => toggle(kind, ref)} aria-label={`Remove ${label}`}>×</button>}</span>;
              })}
            </div>
          )}
          <div className="lm-assign__count"><strong>{program.learnerCount}</strong><span>learner(s) matched by the saved rules</span></div>
          {dirty && <p className="lnd-small">Unsaved changes — press Save Assignment.</p>}
        </aside>
      </div>
    </section>
  );
}

// ---------------- learners & certificates ----------------

const CertificateView = ({ c }) => (
  <div className="lnd-cert lm-cert" id="lnd-print-certificate">
    <div className="lnd-cert__ribbon" aria-hidden="true" />
    <div className="lnd-cert__inner">
      <div className="lnd-cert__brand">mi<span>arcus</span></div>
      <small className="lnd-cert__kicker">Learning &amp; Development</small>
      <h1>Certificate of Completion</h1>
      <div className="lnd-cert__rule" aria-hidden="true"><i /></div>
      <p>This is to certify that</p>
      <h2>{c.name}</h2>
      <p>has successfully completed the</p>
      <h3>{c.program}</h3>
      <p>on {new Date(c.issuedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
      <small className="lnd-cert__code">Certificate ID: {c.code}</small>
    </div>
  </div>
);

function LearnersPanel({ program, flash }) {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [cert, setCert] = useState(null);

  useEffect(() => {
    lndApi.programLearners(program.id).then(setData).catch((e) => { flash("error", errorMessage(e)); setData({ learners: [], summary: {} }); });
  }, [program.id, flash]);

  const openCert = async (row) => {
    try { setCert((await lndApi.reportCertificate(row.userId, program.id)).certificate); }
    catch (e) { flash("error", errorMessage(e)); }
  };

  if (!data) return <section className="lm-panel lnd-glass"><div className="lnd-state"><span className="lnd-spinner" />Loading learners…</div></section>;
  const q = query.trim().toLowerCase();
  const rows = data.learners.filter((r) => (!status || r.status === status) && (!q || `${r.name} ${r.email} ${r.designation}`.toLowerCase().includes(q)));
  const s = data.summary || {};

  return (
    <>
    <section className="lm-panel lnd-glass">
      <div className="lm-panel__head"><div><h2>Learners &amp; Certificates</h2><p className="lnd-small">Everyone the program is assigned to, plus anyone with earlier progress. Certificates are stored here automatically.</p></div></div>
      <div className="lm-mini-stats">
        <button className={!status ? "on" : ""} onClick={() => setStatus("")}><strong>{s.assigned ?? 0}</strong>Assigned</button>
        <button className={status === "Not Started" ? "on" : ""} onClick={() => setStatus("Not Started")}><strong>{s.notStarted ?? 0}</strong>Not started</button>
        <button className={status === "In Progress" ? "on" : ""} onClick={() => setStatus("In Progress")}><strong>{s.inProgress ?? 0}</strong>In progress</button>
        <button className={status === "Completed" ? "on" : ""} onClick={() => setStatus("Completed")}><strong>{s.completed ?? 0}</strong>Completed</button>
        <div><strong>{s.certificates ?? 0}</strong>Certificates</div>
      </div>
      <label className="lm-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search learner…" /></label>
      <div className="lm-scroll">
        <table className="lm-table">
          <thead><tr><th>Learner</th><th>Progress</th><th>Avg score</th><th>Status</th><th>Certificate</th><th>Email</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className={r.assigned ? "" : "is-former"}>
                <td><strong>{r.name}</strong><div className="lnd-small">{r.email}{r.designation ? ` · ${r.designation}` : ""}</div>{!r.assigned && <span className="lm-chip lm-chip--muted">No longer assigned</span>}</td>
                <td><div className="lm-progress lm-progress--sm"><span><i style={{ width: `${r.percent}%` }} /></span><b>{r.done}/{r.total}</b></div></td>
                <td>{r.avgScore === null ? "—" : `${r.avgScore}%`}</td>
                <td><span className={`lm-state lm-state--${r.status.replace(/\s/g, "").toLowerCase()}`}>{r.status}</span></td>
                <td>{r.certificate ? <button className="lm-link" onClick={() => openCert(r)}>★ {fmtDate(r.certificate.issuedAt)}</button> : <span className="lnd-small">Not yet</span>}</td>
                <td>{r.emailStatus ? <span className={`lm-mail lm-mail--${r.emailStatus}`}>{r.emailStatus === "sent" ? "✓ Sent" : r.emailStatus === "failed" ? "✕ Failed" : "… Queued"}</span> : <span className="lnd-small">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="lnd-empty"><p>{data.learners.length ? "No learners match." : "No learners yet — save an assignment first."}</p></div>}
      </div>
    </section>
      {/* Outside the glass section: backdrop-filter would trap a fixed modal. */}
      {cert && (
        <Modal wide title="Certificate" sub={`${cert.name} · ${cert.email}`} onClose={() => setCert(null)}
          footer={<><span className="lm-grow" /><button className="lnd-btn lnd-btn--ghost" onClick={() => setCert(null)}>Close</button><button className="lnd-btn" onClick={() => window.print()}>⇩ Print / Download</button></>}>
          <CertificateView c={cert} />
        </Modal>
      )}
    </>
  );
}

// ---------------- publish ----------------

function PublishPanel({ program, perms, flash, reload, busy, onPublish, onUnpublish, goTo }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const problems = program.publishProblems || [];
  const checks = [
    { ok: Boolean(program.title), label: "Program has a title", go: null },
    { ok: !problems.some((p) => p.includes("module")), label: "At least one active module", go: "modules" },
    { ok: !problems.some((p) => p.includes("Assign")), label: "Assigned to at least one role / department / store / user", go: "assign" },
  ];

  const notify = async () => {
    if (!await confirmWithGlass({ title: "Email learners?", message: `Send a “Training updated” email to the ${program.learnerCount} assigned learner(s)?`, confirmText: "Send Email", danger: false })) return;
    setSending(true);
    try { const r = await lndApi.notifyLearners(program.id, message); flash("success", r.message); setMessage(""); reload(); }
    catch (e) { flash("error", errorMessage(e)); }
    finally { setSending(false); }
  };

  return (
    <section className="lm-panel lnd-glass">
      <div className="lm-publish">
        <div className="lm-publish__art"><LndArt kind={program.status === "Active" ? "certificate" : "learning"} /></div>
        <div className="lm-publish__main">
          <h2>{program.status === "Active" ? "Program is live" : "Publish program"}</h2>
          <p className="lnd-small">{program.status === "Active"
            ? `Published ${fmtDate(program.publishedAt)}. Assigned learners see it in My Training.`
            : "Publishing makes the program visible to the assigned learners and emails each of them once."}</p>
          <ul className="lm-checklist">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? "ok" : ""}>
                <span>{c.ok ? "✓" : "!"}</span>{c.label}
                {!c.ok && c.go && <button className="lm-link" onClick={() => goTo(c.go)}>Fix →</button>}
              </li>
            ))}
          </ul>
          {perms.canEdit && (program.status === "Active"
            ? <button className="lnd-btn lnd-btn--danger" disabled={!!busy} onClick={onUnpublish}>Unpublish</button>
            : <button className="lnd-btn" disabled={!!busy || problems.length > 0} onClick={onPublish}>{busy === "publish" ? "Publishing…" : `🚀 Publish & email ${program.learnerCount} learner(s)`}</button>)}
        </div>
      </div>

      {program.status === "Active" && perms.canEdit && (
        <div className="lm-notify">
          <h3>Notify learners about an update</h3>
          <p className="lnd-small">Added a module, changed a video or the assessment? Send one email to the assigned learners. Small fixes need no email. {program.lastNotifiedAt ? `Last email: ${fmtDate(program.lastNotifiedAt)}.` : ""}</p>
          <textarea rows={3} maxLength={400} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What changed? e.g. New module “Handling combo offers” added." />
          <div className="lnd-actions"><button className="lnd-btn" disabled={sending} onClick={notify}>{sending ? "Sending…" : "✉ Notify learners"}</button></div>
        </div>
      )}
    </section>
  );
}

// =================================================================
// LEARNER REPORT (all programs)
// =================================================================

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
    setActiveRow(row); setCertificate(null); setCertificateError("");
    if (row.certifiedAt) {
      try { setCertificate((await lndApi.reportCertificate(row.userId, row.programId)).certificate || null); }
      catch (e) { setCertificateError(errorMessage(e, "Certificate details could not be loaded.")); }
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
    if (!await confirmWithGlass({ title: "Delete learner progress", message: `Delete ${row.name}'s progress for ${row.program}? This also removes the certificate, if issued.`, recordName: row.name, email: row.email, confirmText: "Delete Progress" })) return;
    setDeletingKey(key);
    try { const result = await lndApi.deleteReportProgress(row.userId, row.programId); flash("success", result.message || "Learner report deleted."); await refresh(); }
    catch (e) { flash("error", errorMessage(e, "Unable to delete learner report.")); }
    finally { setDeletingKey(""); }
  };

  if (error) return <div className="lnd-state lnd-state--err">{error}</div>;
  if (!rows) return <div className="lnd-state"><span className="lnd-spinner" />Loading learner reports…</div>;

  return (
    <>
      <section className="lm-panel lnd-glass">
        <div className="lm-panel__head"><div><h2>Learner Report</h2><p className="lnd-small">Training progress, scores and issued certificates across published programs.</p></div><span className="lm-count">{filteredRows.length} rows</span></div>
        <label className="lm-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search learner, designation or program…" aria-label="Search learner report" /></label>
        <div className="lm-scroll">
          <table className="lm-table">
            <thead><tr><th>Learner</th><th>Designation</th><th>Program</th><th>Progress</th><th>Avg score</th><th>Certified</th><th>Actions</th></tr></thead>
            <tbody>{filteredRows.map((r) => {
              const key = `${r.userId}-${r.programId}`;
              return (
                <tr key={key}>
                  <td><strong>{r.name}</strong><div className="lnd-small">{r.email}</div></td>
                  <td>{r.designation || "—"}</td><td>{r.program}</td>
                  <td><div className="lm-progress lm-progress--sm"><span><i style={{ width: `${Math.min(100, Math.max(0, Number(r.percent) || 0))}%` }} /></span><b>{r.done}/{r.total} · {r.percent}%</b></div></td>
                  <td>{r.avgScore === null ? "—" : `${r.avgScore}%`}</td>
                  <td>{r.certifiedAt ? <span className="lm-state lm-state--completed">★ {fmtDate(r.certifiedAt)}</span> : <span className="lnd-small">Not yet</span>}</td>
                  <td><div className="lm-row-actions">
                    <button className="lm-link" onClick={() => openDetails(r)}>View</button>
                    {canEdit && <button className="lm-link" onClick={() => { setEditingRow(r); setCompleted(Number(r.percent) >= 100); }}>Edit</button>}
                    {canFull && <button className="lm-link lm-link--danger" disabled={deletingKey === key} onClick={() => deleteRow(r)}>{deletingKey === key ? "Deleting…" : "Delete"}</button>}
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {!filteredRows.length && <div className="lnd-empty"><p>{rows.length ? "No learner reports match your search." : "No learner activity yet."}</p></div>}
      </section>

      {activeRow && (
        <Modal wide title="Learner Report Details" sub={`${activeRow.name} · ${activeRow.program}`} onClose={() => { setActiveRow(null); setCertificate(null); }}
          footer={certificate?.code ? <><span className="lm-grow" /><button className="lnd-btn" onClick={() => window.print()}>⇩ Print certificate</button></> : null}>
          <div className="lm-detail-grid">
            <div><small>Learner</small><strong>{activeRow.name}</strong><span>{activeRow.email}</span></div>
            <div><small>Designation</small><strong>{activeRow.designation || "—"}</strong></div>
            <div><small>Modules completed</small><strong>{activeRow.done} of {activeRow.total}</strong></div>
            <div><small>Completion</small><strong>{activeRow.percent}%</strong></div>
            <div><small>Average score</small><strong>{activeRow.avgScore === null ? "—" : `${activeRow.avgScore}%`}</strong></div>
            <div><small>Certificate</small><strong>{activeRow.certifiedAt ? `Issued ${fmtDate(activeRow.certifiedAt)}` : "Not issued"}</strong></div>
          </div>
          {certificateError ? <p className="lnd-note lnd-note--err">{certificateError}</p> : certificate?.code ? <CertificateView c={certificate} /> : (
            <p className="lnd-small">{activeRow.certifiedAt ? "Loading certificate…" : "The certificate is issued automatically when every required module is complete."}</p>
          )}
        </Modal>
      )}

      {editingRow && (
        <Modal title="Edit Learner Progress" sub={`${editingRow.name} · ${editingRow.program}`} onClose={() => !saving && setEditingRow(null)}
          footer={<><span className="lm-grow" /><button className="lnd-btn lnd-btn--ghost" disabled={saving} onClick={() => setEditingRow(null)}>Cancel</button><button className="lnd-btn" disabled={saving} onClick={saveProgress}>{saving ? "Saving…" : "Save Changes"}</button></>}>
          <p className="lnd-small">Use this only to correct a record. “Completed” marks every active module complete and issues the certificate. “Reset” clears module completion and removes the certificate.</p>
          <label className="lm-f">Completion status
            <select value={completed ? "completed" : "incomplete"} onChange={(e) => setCompleted(e.target.value === "completed")}>
              <option value="incomplete">Reset — module completion cleared</option>
              <option value="completed">Completed — all active modules complete</option>
            </select>
          </label>
        </Modal>
      )}
    </>
  );
}

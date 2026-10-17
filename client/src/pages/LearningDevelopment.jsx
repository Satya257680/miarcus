import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { fullUrl, lndApi, errorMessage } from "../services/lndApi";
import usePermission from "../hooks/usePermission";
import confirmWithGlass from "../components/common/ConfirmDialog/confirmWithGlass.jsx";
import LndArt from "../components/lnd/LndArt";
import "../styles/pages/LearningDevelopment.css";

// =================================================================
// LEARNING & DEVELOPMENT — learner side
//   /learning-development                 My Training (assigned programs)
//   /learning-development/program/:id     program + modules (in order)
//   /learning-development/module/:id      video / images / PDF / notes
//   /learning-development/exam/:id        assessment (graded on server)
//   /learning-development/certificate/:id printable certificate (own)
//   /learning-development/certificates    my certificates
//
// The server decides everything (visibility, locks, lesson-before-
// assessment, attempts, grading, certificates). These screens only
// show what the server returns.
// =================================================================

const BASE = "/learning-development";

// ---------------- helpers ----------------

const useLoad = (loader, deps) => {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      setState({ loading: false, error: "", data: await loader() });
    } catch (error) {
      setState({ loading: false, error: errorMessage(error, "Unable to load"), data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
};

const fmtMin = (min) => {
  const m = Number(min) || 0;
  return m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;
};
const fmtDate = (value, long = false) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, long ? { day: "numeric", month: "long", year: "numeric" } : { day: "2-digit", month: "2-digit", year: "numeric" });
};
const fallbackImage = (seed) => `/lnd/program-${(Math.abs(Number(seed) || 0) % 4) + 1}.jpg`;

const Bar = ({ value, tone = "" }) => (
  <div className={`lnd-bar ${tone}`}><span style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }} /></div>
);

const Ring = ({ value, size = "", label }) => (
  <div className={`lnd-ring ${size}`} style={{ "--p": `${Math.min(100, Math.max(0, value || 0))}%` }}>
    <span>{value || 0}%</span>
    {label && <small>{label}</small>}
  </div>
);

const State = ({ loading, error, onRetry, text = "Loading…" }) =>
  loading ? <div className="lnd-state"><span className="lnd-spinner" />{text}</div> :
  error ? <div className="lnd-state lnd-state--err">{error}{onRetry && <button className="lnd-btn lnd-btn--sm lnd-btn--ghost" onClick={onRetry}>Retry</button>}</div> : null;

// 3D glass "Back" card used on every inner page.
const BackCard = ({ to, title, sub, art = "learning", onClick }) => {
  const body = (
    <>
      <span className="lnd-backcard__arrow" aria-hidden="true">←</span>
      <span className="lnd-backcard__text"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      <span className="lnd-backcard__art"><LndArt kind={art} /></span>
    </>
  );
  return onClick
    ? <button type="button" className="lnd-backcard" onClick={onClick}>{body}</button>
    : <Link className="lnd-backcard" to={to}>{body}</Link>;
};

const STATUS_TONE = { "Completed": "done", "In Progress": "progress", "Not Started": "new" };
const StatusChip = ({ status }) => (
  <span className={`lnd-status lnd-status--${STATUS_TONE[status] || "new"}`}><i />{status}</span>
);

const Thumb = ({ url, seed, alt = "" }) => (
  <img
    className="lnd-thumb"
    src={url ? fullUrl(url) : fallbackImage(seed)}
    alt={alt}
    loading="lazy"
    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackImage(seed); }}
  />
);

// ---------------- My Training ----------------

function Catalog() {
  const { loading, error, data, reload } = useLoad(() => lndApi.overview(), []);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const { canEdit } = usePermission("Learning & Development");

  const programs = useMemo(() => data?.programs || [], [data]);
  const audiences = useMemo(() => ["All", ...new Set(programs.map((p) => p.audience).filter(Boolean))], [programs]);
  const counts = useMemo(() => ({
    total: programs.length,
    notStarted: programs.filter((p) => p.learnerStatus === "Not Started").length,
    inProgress: programs.filter((p) => p.learnerStatus === "In Progress").length,
    completed: programs.filter((p) => p.learnerStatus === "Completed").length,
  }), [programs]);

  const [statusFilter, setStatusFilter] = useState("");
  const q = query.trim().toLowerCase();
  const shown = programs.filter((p) =>
    (tab === "All" || p.audience === tab) &&
    (!statusFilter || p.learnerStatus === statusFilter) &&
    (!q || `${p.title} ${p.description} ${p.audience}`.toLowerCase().includes(q)));

  const stat = (key, label, value, art, tone) => (
    <button type="button" className={`lnd-stat lnd-stat--${tone} ${statusFilter === key ? "is-on" : ""}`}
      onClick={() => setStatusFilter((s) => (s === key ? "" : key))} aria-pressed={statusFilter === key}>
      <span className="lnd-stat__icon" aria-hidden="true">{art}</span>
      <span><small>{label}</small><strong>{value}</strong></span>
    </button>
  );

  return (
    <div className="lnd">
      <section className="lnd-hero lnd-glass">
        <div className="lnd-hero__copy">
          <span className="lnd-eyebrow">Learn · Practice · Get Certified · Grow</span>
          <h1>My Training</h1>
          <p>Your personalized learning journey to grow, improve and succeed. Finish each module in order, pass the assessment and earn your certificate.</p>
          <div className="lnd-actions">
            <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/certificates`}>★ My Certificates</Link>
            {canEdit && <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/manage`}>⚙ Program Management</Link>}
          </div>
        </div>
        <div className="lnd-hero__art"><LndArt kind="learning" label="Learning illustration" /></div>
      </section>

      <div className="lnd-stats">
        {stat("", "In Training", counts.total, "▶", "violet")}
        {stat("Not Started", "Not Started", counts.notStarted, "◷", "rose")}
        {stat("In Progress", "In Progress", counts.inProgress, "▲", "blue")}
        {stat("Completed", "Completed", counts.completed, "✓", "mint")}
        <label className="lnd-search lnd-glass">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search training, modules…" aria-label="Search training" />
        </label>
      </div>

      {audiences.length > 2 && (
        <div className="lnd-tabs">
          {audiences.map((a) => (
            <button key={a} className={tab === a ? "on" : ""} onClick={() => setTab(a)}>{a === "All" ? "All Programs" : a}</button>
          ))}
        </div>
      )}

      <State loading={loading} error={error} onRetry={reload} text="Loading your training…" />

      {!loading && !error && shown.length === 0 && (
        <div className="lnd-empty lnd-glass">
          <div className="lnd-empty__art"><LndArt kind="module" /></div>
          <h3>{programs.length ? "No training matches your filters" : "No training assigned yet"}</h3>
          <p>{programs.length ? "Clear the search or status filter to see all your programs." : "When a program is assigned to you, it appears here and you get an email."}</p>
          {canEdit && !programs.length && <Link className="lnd-btn" to={`${BASE}/manage`}>Open Program Management</Link>}
        </div>
      )}

      <div className="lnd-grid">
        {shown.map((p) => {
          const action = p.certificate
            ? { to: `${BASE}/certificate/${p.id}`, label: "View Certificate", ghost: true }
            : p.nextModuleId
              ? { to: `${BASE}/module/${p.nextModuleId}`, label: p.started ? "Continue" : "Start Learning" }
              : { to: `${BASE}/program/${p.id}`, label: "Open Program" };
          return (
            <article key={p.id} className="lnd-card lnd-glass lnd-tilt">
              <div className="lnd-card__media">
                <Thumb url={p.thumbUrl} seed={p.id} />
                <StatusChip status={p.learnerStatus} />
              </div>
              <div className="lnd-card__body">
                <h3><Link to={`${BASE}/program/${p.id}`}>{p.title}</Link></h3>
                <p>{p.description || "Build practical skills through short, focused modules."}</p>
                <div className="lnd-meta"><span>▤ {p.moduleCount} Modules</span><span>◷ {fmtMin(p.durationMin)}</span></div>
                <div className="lnd-card__progress"><Bar value={p.percent} tone={p.percent === 100 ? "is-done" : ""} /><b>{p.percent}%</b></div>
                <div className="lnd-card__actions">
                  <Link className={`lnd-btn lnd-btn--block ${action.ghost ? "lnd-btn--ghost" : ""}`} to={action.to}>{action.label} →</Link>
                  <Link className="lnd-btn lnd-btn--icon lnd-btn--ghost" to={`${BASE}/program/${p.id}`} aria-label={`Details of ${p.title}`} title="Program details">•••</Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Program ----------------

function Program() {
  const { id } = useParams();
  const { loading, error, data, reload } = useLoad(() => lndApi.program(id), [id]);
  const [tab, setTab] = useState("modules");

  if (loading || error) return <div className="lnd"><BackCard to={BASE} title="Back to My Training" sub="Return to your training list" /><State loading={loading} error={error} onRetry={reload} /></div>;

  const { program, modules, stats, learnerStatus, certificate } = data;
  const next = modules.find((m) => m.id === stats.nextModuleId);

  return (
    <div className="lnd">
      <BackCard to={BASE} title="Back to My Training" sub="Return to your training list" art="learning" />

      <section className="lnd-hero lnd-hero--dark">
        <div className="lnd-hero__copy">
          {program.audience && <span className="lnd-chip">{program.audience}</span>}
          <h1>{program.title}</h1>
          <p>{program.description}</p>
          <div className="lnd-meta lnd-meta--light">
            <span>▤ {stats.moduleCount} Modules</span><span>◷ {fmtMin(stats.durationMin)}</span><span>● {learnerStatus}</span>
          </div>
          <div className="lnd-actions">
            {next && <Link className="lnd-btn lnd-btn--light" to={`${BASE}/module/${next.id}`}>▶ {stats.started ? "Continue Learning" : "Start Learning"}</Link>}
            {certificate && <Link className="lnd-btn lnd-btn--light" to={`${BASE}/certificate/${program.id}`}>★ View Certificate</Link>}
            <button className="lnd-btn lnd-btn--glass" onClick={() => setTab("about")}>View Details</button>
          </div>
        </div>
        <div className="lnd-hero__side">
          <Ring value={stats.percent} size="lnd-ring--lg" label={`${stats.completedCount} of ${stats.moduleCount} done`} />
        </div>
      </section>

      <div className="lnd-tabs">
        {[["modules", `Modules (${modules.length})`], ["about", "About Program"], ["certificate", "Certificate"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "modules" && (
        <div className="lnd-modlist">
          {modules.length === 0 && <div className="lnd-empty lnd-glass"><p>No modules are published in this program yet.</p></div>}
          {modules.map((m, i) => {
            const state = m.completed ? "done" : m.locked ? "locked" : m.started ? "progress" : "open";
            return (
              <div key={m.id} className={`lnd-modrow lnd-glass is-${state}`}>
                <span className="lnd-modrow__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="lnd-modrow__art">{m.thumbUrl ? <img src={fullUrl(m.thumbUrl)} alt="" loading="lazy" /> : <LndArt kind={m.locked ? "lock" : m.hasExam ? "assessment" : "module"} />}</span>
                <div className="lnd-modrow__main">
                  <h4>{m.title}</h4>
                  <p>{m.description}</p>
                  <div className="lnd-meta">
                    <span>◷ {fmtMin(m.durationMin)}</span>
                    {m.hasContent && <span>▶ Lesson</span>}
                    {m.hasExam && <span>✎ Assessment · pass {m.passMark}%</span>}
                    {!m.mandatory && <span>Optional</span>}
                    {m.bestScore !== null && <span>Best {m.bestScore}%</span>}
                  </div>
                </div>
                {m.locked
                  ? <span className="lnd-pill lnd-pill--lock" title="Complete the previous module first">🔒 Locked</span>
                  : <Link className={`lnd-btn lnd-btn--sm ${m.completed ? "lnd-btn--ghost" : ""}`} to={`${BASE}/module/${m.id}`}>{m.completed ? "✓ Review" : m.started ? "Continue" : "Start"}</Link>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "about" && (
        <div className="lnd-panel lnd-glass">
          <h3>About this program</h3>
          <p className="lnd-pre">{program.description || "No description added."}</p>
          {program.highlights?.length > 0 && <><h4>What you will learn</h4><div className="lnd-highlights">{program.highlights.map((h) => <div key={h}>✦ {h}</div>)}</div></>}
          <h4>How it works</h4>
          <ol className="lnd-howto">
            <li>Modules unlock one after another — finish the current one to open the next.</li>
            <li>Watch / read the lesson, then press <b>“I have completed this lesson”</b>.</li>
            <li>Pass the assessment (when the module has one) to complete the module.</li>
            <li>Your certificate is issued automatically when every required module is complete.</li>
          </ol>
        </div>
      )}

      {tab === "certificate" && (
        <div className="lnd-panel lnd-glass lnd-certcta">
          <div className="lnd-certcta__art"><LndArt kind="certificate" /></div>
          <div>
            <h3>{certificate ? "Your certificate is ready" : "Earn your certificate"}</h3>
            <p>{certificate
              ? `Issued on ${fmtDate(certificate.issuedAt, true)} · ID ${certificate.code}`
              : `Complete ${stats.requiredCount - stats.requiredDone} more required module(s) to unlock your certificate.`}</p>
            {certificate ? <Link className="lnd-btn" to={`${BASE}/certificate/${program.id}`}>View Certificate →</Link> : <Bar value={stats.requiredCount ? Math.round((stats.requiredDone / stats.requiredCount) * 100) : 0} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Module ----------------

const youtubeEmbed = (url) => {
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url || "");
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = /vimeo\.com\/(\d+)/.exec(url || "");
  return vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : "";
};

function ModulePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data, reload } = useLoad(() => lndApi.module(id), [id]);
  const [tab, setTab] = useState("video");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const pickedFor = useRef(null);
  useEffect(() => { setTab("video"); setMsg(null); }, [id]);

  // Open the first tab that actually has something to show — only once
  // per module, so a reload (e.g. after "lesson completed") keeps the tab.
  useEffect(() => {
    if (!data || pickedFor.current === data.module.id) return;
    pickedFor.current = data.module.id;
    const media = data.media || [];
    if (media.some((m) => m.kind === "video") || data.module.videoUrl) setTab("video");
    else if (media.some((m) => m.kind === "pdf")) setTab("pdf");
    else if (media.some((m) => m.kind === "image")) setTab("images");
    else if (data.module.hasExam && !data.module.description) setTab("quiz");
    else setTab("notes");
  }, [data]);

  if (loading || error) return <div className="lnd"><BackCard to={BASE} title="Back to My Training" sub="Return to your training list" /><State loading={loading} error={error} onRetry={reload} /></div>;

  const { program, module: mod, media, modules, stats, position, certificate } = data;
  const videos = media.filter((m) => m.kind === "video");
  const images = media.filter((m) => m.kind === "image");
  const pdfs = media.filter((m) => m.kind === "pdf");
  const embed = youtubeEmbed(mod.videoUrl);
  const nextModule = modules.find((m) => m.id === data.nextModuleId);

  const tabs = [
    ["video", "Video Lesson"], ["images", `Images (${images.length})`], ["pdf", `PDF Materials (${pdfs.length})`],
    ...(mod.hasExam ? [["quiz", "Quiz / Assessment"]] : []), ["notes", "Notes"],
  ];

  const lessonDone = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await lndApi.contentDone(mod.id);
      if (r.certificateIssued) setMsg({ type: "ok", text: "🎉 Module complete — your certificate has been issued!" });
      else if (r.needsAssessment) { setMsg({ type: "ok", text: "Lesson complete. The assessment is now unlocked." }); setTab("quiz"); }
      else setMsg({ type: "ok", text: "Module completed. The next module is unlocked." });
      await reload();
    } catch (e) { setMsg({ type: "err", text: errorMessage(e) }); }
    finally { setBusy(false); }
  };

  // A module with an assessment but no lesson material goes straight to
  // the assessment (the server allows it: examReady).
  const needsLessonStep = mod.hasContent || !mod.hasExam;
  const steps = [
    ...(needsLessonStep ? [{ key: "learn", label: mod.hasContent ? "Watch / read the lesson" : "Read the notes", done: mod.contentDone }] : []),
    ...(mod.hasExam ? [{ key: "exam", label: `Pass the assessment (${mod.passMark}%)`, done: mod.passed || mod.completed }] : []),
    { key: "done", label: "Module complete", done: mod.completed },
  ];

  const attemptsText = mod.maxAttempts > 0 ? `${mod.attempts} of ${mod.maxAttempts} used` : `${mod.attempts} (unlimited)`;

  return (
    <div className="lnd">
      <BackCard to={`${BASE}/program/${program.id}`} title={`Back to ${program.title}`} sub="Return to module list" art="learning" />

      <section className="lnd-hero lnd-hero--dark">
        <div className="lnd-hero__copy">
          {program.audience && <span className="lnd-chip">{program.audience}</span>}
          <h1>{mod.title}</h1>
          <div className="lnd-meta lnd-meta--light">
            <span>Module {position.index} of {position.total}</span><span>◷ {fmtMin(mod.durationMin)}</span>
            <span>● {mod.completed ? "Completed" : "In Progress"}</span>
            {!mod.mandatory && <span>Optional</span>}
          </div>
          {mod.description && <p className="lnd-clamp">{mod.description}</p>}
        </div>
        <div className="lnd-hero__side">
          <Ring value={stats.percent} size="lnd-ring--lg" label={`${stats.completedCount} of ${stats.moduleCount} modules`} />
        </div>
      </section>

      <div className="lnd-tabs">
        {tabs.map(([key, label]) => <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      <div className="lnd-cols">
        <div className="lnd-main">
          {tab === "video" && (
            <div className="lnd-panel lnd-glass">
              {videos.length > 0 ? videos.map((v) => (
                <div key={v.id} className="lnd-video">
                  <video controls controlsList={v.allowDownload ? undefined : "nodownload"} preload="metadata" src={fullUrl(v.url)} />
                  <small>{v.name}</small>
                </div>
              )) : embed ? (
                <div className="lnd-video"><iframe title={mod.title} src={embed} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
              ) : mod.videoUrl ? (
                <a className="lnd-btn" href={mod.videoUrl} target="_blank" rel="noreferrer noopener">Open video link ↗</a>
              ) : (
                <div className="lnd-noitem"><LndArt kind="module" /><p>This module has no video. Use the other tabs for the lesson material.</p></div>
              )}
              {mod.highlights.length > 0 && (
                <>
                  <h3>Key Highlights</h3>
                  <div className="lnd-highlights">{mod.highlights.map((h) => <div key={h}>✦ {h}</div>)}</div>
                </>
              )}
            </div>
          )}

          {tab === "images" && (
            <div className="lnd-panel lnd-glass">
              {images.length ? <div className="lnd-gallery">{images.map((i) => (
                <a key={i.id} href={fullUrl(i.url)} target="_blank" rel="noreferrer noopener"><img src={fullUrl(i.url)} alt={i.name} loading="lazy" /></a>
              ))}</div> : <div className="lnd-noitem"><p>No images in this module.</p></div>}
            </div>
          )}

          {tab === "pdf" && (
            <div className="lnd-panel lnd-glass">
              {pdfs.length ? pdfs.map((p) => (
                <div key={p.id} className="lnd-file">
                  <span className="lnd-file__icon">PDF</span>
                  <div><strong>{p.name}</strong><small>{(p.size / 1024 / 1024).toFixed(1)} MB</small></div>
                  <a className="lnd-btn lnd-btn--sm" href={fullUrl(p.url)} target="_blank" rel="noreferrer noopener">Open</a>
                  {p.allowDownload && <a className="lnd-btn lnd-btn--sm lnd-btn--ghost" href={`${fullUrl(p.url)}&dl=1`}>Download</a>}
                </div>
              )) : <div className="lnd-noitem"><p>No PDF materials in this module.</p></div>}
            </div>
          )}

          {tab === "quiz" && mod.hasExam && (
            <div className="lnd-panel lnd-glass lnd-quizcard">
              <div className="lnd-quizcard__art"><LndArt kind="assessment" /></div>
              <div>
                <h3>Assessment</h3>
                <div className="lnd-meta"><span>{mod.questionCount} questions</span><span>Pass mark {mod.passMark}%</span><span>{mod.examMinutes} minutes</span><span>Attempts {attemptsText}</span></div>
                {mod.bestScore !== null && <p>Your best score: <strong>{mod.bestScore}%</strong>{mod.passed ? " — passed ✓" : ""}</p>}
                {mod.hasContent && !mod.contentDone && !mod.completed
                  ? <p className="lnd-note">Finish the lesson first (video / PDF / images), then press <b>“I have completed this lesson”</b> to unlock the assessment.</p>
                  : mod.attemptsBlocked && !mod.passed
                    ? <p className="lnd-note lnd-note--err">You have used all attempts for this assessment. Please contact your trainer.</p>
                    : null}
                <button className="lnd-btn" disabled={!mod.examReady || (mod.attemptsBlocked)} onClick={() => navigate(`${BASE}/exam/${mod.id}`)}>
                  {mod.passed ? "Retake Assessment" : "Start Assessment"} →
                </button>
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className="lnd-panel lnd-glass"><h3>About this module</h3><p className="lnd-pre">{mod.description || "No notes added."}</p></div>
          )}
        </div>

        <aside className="lnd-side">
          <div className="lnd-panel lnd-glass">
            <h3>Your progress</h3>
            <ol className="lnd-steps">
              {steps.map((s, i) => <li key={s.key} className={s.done ? "done" : ""}><span>{s.done ? "✓" : i + 1}</span>{s.label}</li>)}
            </ol>
            {msg && <p className={`lnd-note ${msg.type === "err" ? "lnd-note--err" : ""}`}>{msg.text}</p>}
            {!mod.completed && !mod.contentDone && needsLessonStep && (
              <button className="lnd-btn lnd-btn--block" disabled={busy} onClick={lessonDone}>
                {busy ? "Saving…" : mod.hasExam ? "✓ I have completed this lesson" : "✓ Mark module as complete"}
              </button>
            )}
            {!mod.completed && mod.hasExam && (mod.contentDone || !mod.hasContent) && (
              <button className="lnd-btn lnd-btn--block" disabled={!mod.examReady} onClick={() => navigate(`${BASE}/exam/${mod.id}`)}>Start Assessment →</button>
            )}
            {mod.completed && nextModule && !nextModule.locked && (
              <Link className="lnd-btn lnd-btn--block" to={`${BASE}/module/${nextModule.id}`}>Next Module →</Link>
            )}
            {mod.completed && !nextModule && !certificate && <p className="lnd-small">You reached the last module. Complete any remaining required modules to get your certificate.</p>}
          </div>

          <div className="lnd-panel lnd-glass">
            <h3>Module Lessons ({modules.length})</h3>
            <div className="lnd-lessons">
              {modules.map((m, i) => (
                m.locked ? <div key={m.id} className="lnd-lesson is-locked"><span>🔒 {i + 1}. {m.title}</span><small>{m.durationMin}m</small></div>
                : <Link key={m.id} to={`${BASE}/module/${m.id}`} className={`lnd-lesson ${m.id === mod.id ? "on" : ""} ${m.completed ? "done" : ""}`}>
                    <span>{m.completed ? "✓" : m.id === mod.id ? "▶" : "•"} {i + 1}. {m.title}</span><small>{m.durationMin}m</small>
                  </Link>
              ))}
            </div>
          </div>

          <div className="lnd-panel lnd-glass lnd-side-cert">
            <div className="lnd-side-cert__art"><LndArt kind="certificate" /></div>
            <h3>Certificate</h3>
            <p className="lnd-small">{certificate ? `Issued ${fmtDate(certificate.issuedAt, true)}` : "Complete all required modules and pass their assessments to get your certificate."}</p>
            {certificate
              ? <Link className="lnd-btn lnd-btn--block" to={`${BASE}/certificate/${program.id}`}>View Certificate</Link>
              : <button className="lnd-btn lnd-btn--block" disabled>🔒 Certificate locked</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------- Assessment ----------------

function Exam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [round, setRound] = useState(0);
  const submitted = useRef(false);
  const deadline = useRef(0);

  useEffect(() => {
    let alive = true;
    setExam(null); setError(""); setResult(null); setAnswers({}); setCurrent(0);
    submitted.current = false;
    lndApi.examStart(id)
      .then((d) => {
        if (!alive) return;
        // The server owns the clock: a refresh resumes the same attempt.
        deadline.current = Date.now() + Number(d.secondsLeft ?? d.minutes * 60) * 1000;
        setLeft(Math.max(0, Math.round((deadline.current - Date.now()) / 1000)));
        setExam(d);
      })
      .catch((e) => alive && setError(errorMessage(e, "Unable to start the assessment")));
    return () => { alive = false; };
  }, [id, round]);

  const submit = useCallback(async () => {
    if (!exam || submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try { setResult(await lndApi.examSubmit(exam.attemptId, answers)); }
    catch (e) {
      // 409 = already submitted (another tab / double click) → reload state.
      if (e?.response?.status === 409) setError("This attempt was already submitted. Open the module to see your result.");
      else { submitted.current = false; setError(errorMessage(e, "Unable to submit")); }
    }
    finally { setSubmitting(false); }
  }, [exam, answers]);

  useEffect(() => {
    if (!exam || result) return undefined;
    const t = window.setInterval(() => setLeft(Math.max(0, Math.round((deadline.current - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(t);
  }, [exam, result]);

  useEffect(() => { if (exam && !result && left <= 0) submit(); }, [left, exam, result, submit]);

  const back = <BackCard to={`${BASE}/module/${id}`} title={exam ? `Back to ${exam.title}` : "Back to module"} sub="Return to module details" art="assessment" />;

  if (error) return <div className="lnd">{back}<div className="lnd-state lnd-state--err">{error} <button className="lnd-btn lnd-btn--sm lnd-btn--ghost" onClick={() => navigate(`${BASE}/module/${id}`)}>Back to module</button></div></div>;
  if (!exam) return <div className="lnd">{back}<State loading text="Preparing assessment…" /></div>;

  if (result) {
    const canRetry = !result.passed && (result.attemptsLeft === null || result.attemptsLeft > 0);
    return (
      <div className="lnd">
        {back}
        <div className={`lnd-panel lnd-glass lnd-result ${result.passed ? "is-pass" : "is-fail"}`}>
          <div className="lnd-result__art"><LndArt kind={result.passed ? (result.certificateIssued ? "certificate" : "assessment") : "assessment"} /></div>
          <h1>{result.passed ? "🎉 Congratulations, you passed!" : result.timedOut ? "Time is up" : "Not passed yet"}</h1>
          <Ring value={result.score} size="lnd-ring--lg" />
          <p>{result.correct} of {result.total} correct · pass mark {result.passMark}%</p>
          {result.timedOut && <p className="lnd-note lnd-note--err">The time ran out before the answers were submitted.</p>}
          {result.certificateIssued && <p className="lnd-note">Your certificate has been issued and saved to <b>My Certificates</b>.</p>}
          {!result.passed && result.attemptsLeft !== null && <p className="lnd-small">{result.attemptsLeft} attempt(s) left.</p>}
          <div className="lnd-actions lnd-actions--center">
            {result.certificateIssued && <Link className="lnd-btn" to={`${BASE}/certificate/${result.programId}`}>★ View Certificate</Link>}
            {result.passed && result.nextModuleId && <Link className="lnd-btn" to={`${BASE}/module/${result.nextModuleId}`}>Next Module →</Link>}
            {canRetry && <button className="lnd-btn" onClick={() => setRound((r) => r + 1)}>Try Again</button>}
            <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/module/${id}`}>Back to Module</Link>
          </div>
          {result.passed && (
            <ol className="lnd-review">
              {exam.questions.map((q) => {
                const r = result.review.find((x) => x.id === q.id);
                return (
                  <li key={q.id} className={r?.correct ? "ok" : "no"}>
                    <strong>{q.question}</strong>
                    <span>Correct answer: {q.options[r?.correctIndex]}</span>
                    {r?.explanation && <em>{r.explanation}</em>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    );
  }

  const q = exam.questions[current];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const answered = exam.questions.filter((x) => answers[x.id] !== undefined).length;
  const answeredPct = Math.round((answered / exam.questions.length) * 100);
  const timePct = Math.round((left / Math.max(1, exam.minutes * 60)) * 100);
  const isLast = current === exam.questions.length - 1;

  const confirmSubmit = async () => {
    const missing = exam.questions.length - answered;
    const ok = await confirmWithGlass({
      title: "Submit assessment?",
      message: missing ? `You answered ${answered} of ${exam.questions.length}. Unanswered questions count as wrong. Submit anyway?` : "You answered every question. Submit your answers now?",
      confirmText: "Submit",
      danger: false,
    });
    if (ok) submit();
  };

  return (
    <div className="lnd">
      {back}
      <section className="lnd-examhead">
        <div>
          <span className="lnd-chip lnd-chip--soft">Assessment</span>
          <h1>{exam.title}</h1>
          <div className="lnd-meta"><span>▤ {exam.questions.length} Questions</span><span>✓ Pass Mark {exam.passMark}%</span><span>◷ {exam.minutes} Minutes</span>{exam.resumed && <span>↻ Resumed attempt</span>}</div>
        </div>
        <div className="lnd-examhead__art"><LndArt kind="assessment" /></div>
        <div className={`lnd-timer lnd-glass ${left < 60 ? "low" : ""}`} role="timer" aria-live="off">
          <small>Time Remaining</small><strong>{mm}:{ss}</strong>
          <Bar value={timePct} tone="is-rose" />
        </div>
      </section>

      <div className="lnd-exam">
        <nav className="lnd-panel lnd-glass lnd-exam__nav" aria-label="Questions">
          <h3>Questions</h3>
          {exam.questions.map((x, i) => (
            <button key={x.id} className={`${i === current ? "cur" : ""} ${answers[x.id] !== undefined ? "ans" : ""}`} onClick={() => setCurrent(i)}>
              <span>{i + 1}</span><em>{x.question}</em><i aria-hidden="true">{answers[x.id] !== undefined ? "✓" : ""}</i>
            </button>
          ))}
        </nav>

        <div className="lnd-panel lnd-glass lnd-exam__q">
          <span className="lnd-chip lnd-chip--soft">Question {current + 1} of {exam.questions.length}</span>
          <h2>{q.question}</h2>
          <div className="lnd-options" role="radiogroup">
            {q.options.map((opt, i) => (
              <label key={i} className={answers[q.id] === i ? "on" : ""}>
                <input type="radio" name={`q${q.id}`} checked={answers[q.id] === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          <div className="lnd-actions lnd-actions--split">
            <button className="lnd-btn lnd-btn--ghost" disabled={current === 0} onClick={() => setCurrent(current - 1)}>‹ Previous</button>
            {!isLast
              ? <button className="lnd-btn" onClick={() => setCurrent(current + 1)}>Next Question →</button>
              : <button className="lnd-btn" disabled={submitting} onClick={confirmSubmit}>{submitting ? "Submitting…" : "Submit Assessment ✓"}</button>}
          </div>
        </div>

        <aside className="lnd-panel lnd-glass lnd-exam__side">
          <h3>Assessment Progress</h3>
          <Ring value={answeredPct} size="lnd-ring--lg" label={`${answered} of ${exam.questions.length} answered`} />
          <dl className="lnd-info">
            <dt>Pass Mark</dt><dd>{exam.passMark}%</dd>
            <dt>Time Limit</dt><dd>{exam.minutes} min</dd>
            <dt>Attempt</dt><dd>{exam.attemptNumber}{exam.maxAttempts > 0 ? ` of ${exam.maxAttempts}` : ""}</dd>
          </dl>
          {answered === exam.questions.length && !isLast && <button className="lnd-btn lnd-btn--block" disabled={submitting} onClick={confirmSubmit}>Submit Assessment</button>}
        </aside>
      </div>

      <div className="lnd-tip lnd-glass">
        <b>Tip for Success</b>
        <span>Read each question carefully and choose the best answer. You need {exam.passMark}% to pass. Correct answers are shown after you pass.</span>
      </div>
    </div>
  );
}

// ---------------- Certificate (own only) ----------------

function Certificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data, reload } = useLoad(() => lndApi.certificate(id), [id]);
  if (loading || error) return <div className="lnd"><BackCard to={`${BASE}/certificates`} title="Back to My Certificates" /><State loading={loading} error={error} onRetry={reload} /></div>;
  const c = data.certificate;
  return (
    <div className="lnd lnd-certpage">
      <div className="lnd-actions no-print">
        <button className="lnd-btn lnd-btn--ghost" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`${BASE}/certificates`))}>← Back</button>
        <button className="lnd-btn" onClick={() => window.print()}>⇩ Download / Print Certificate</button>
      </div>
      <div className="lnd-cert-stage">
        <div className="lnd-cert" id="lnd-print-certificate">
          <div className="lnd-cert__ribbon" aria-hidden="true" />
          <div className="lnd-cert__medal no-print-hide" aria-hidden="true"><LndArt kind="certificate" /></div>
          <div className="lnd-cert__inner">
            <div className="lnd-cert__brand">mi<span>arcus</span></div>
            <small className="lnd-cert__kicker">Learning &amp; Development</small>
            <h1>Certificate of Completion</h1>
            <div className="lnd-cert__rule" aria-hidden="true"><i /></div>
            <p>This is to certify that</p>
            <h2>{c.name}</h2>
            <p>has successfully completed the</p>
            <h3>{c.program}</h3>
            <p>on {fmtDate(c.issuedAt, true)}</p>
            <small className="lnd-cert__code">Certificate ID: {c.code}</small>
          </div>
        </div>
        <div className="lnd-cert-podium no-print" aria-hidden="true" />
      </div>
    </div>
  );
}

function Certificates() {
  const { loading, error, data, reload } = useLoad(() => lndApi.certificates(), []);
  const list = data?.certificates || [];
  return (
    <div className="lnd">
      <BackCard to={BASE} title="Back to Learning & Development" sub="Continue exploring training programs, modules and certifications." />
      <section className="lnd-hero lnd-glass">
        <div className="lnd-hero__copy">
          <span className="lnd-eyebrow">Learning &amp; Development</span>
          <h1>My <span className="lnd-grad">Certificates</span></h1>
          <p>View and download your completed training certificates. Only you can see your certificates.</p>
        </div>
        <div className="lnd-hero__art"><LndArt kind="certificate" label="Certificate illustration" /></div>
      </section>

      <State loading={loading} error={error} onRetry={reload} text="Loading certificates…" />
      {data && list.length === 0 && (
        <div className="lnd-empty lnd-glass">
          <div className="lnd-empty__art"><LndArt kind="certificate" /></div>
          <h3>No certificates yet</h3>
          <p>Complete every required module of a program (and pass its assessments) — your certificate appears here automatically.</p>
          <Link className="lnd-btn" to={BASE}>Go to My Training</Link>
        </div>
      )}
      <div className="lnd-certlist">
        {list.map((c) => (
          <article key={c.code} className="lnd-certcard lnd-glass lnd-tilt">
            <div className="lnd-certcard__art"><LndArt kind="certificate" /></div>
            <div className="lnd-certcard__main">
              <StatusChip status="Completed" />
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <div className="lnd-certcard__facts">
                <span><small>Issued On</small><b>{fmtDate(c.issuedAt)}</b></span>
                <span><small>Certificate ID</small><b>{c.code}</b></span>
              </div>
            </div>
            <div className="lnd-certcard__side">
              <span className="lnd-verified"><i aria-hidden="true">✓</i>Verified Certificate</span>
              <Link className="lnd-btn" to={`${BASE}/certificate/${c.programId}`}>View Certificate →</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ---------------- router ----------------

export default function LearningDevelopment() {
  return (
    <Routes>
      <Route index element={<Catalog />} />
      <Route path="program/:id" element={<Program />} />
      <Route path="module/:id" element={<ModulePage />} />
      <Route path="exam/:id" element={<Exam />} />
      <Route path="certificate/:id" element={<Certificate />} />
      <Route path="certificates" element={<Certificates />} />
      <Route path="*" element={<Catalog />} />
    </Routes>
  );
}

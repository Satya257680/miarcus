import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { fullUrl, lndApi, errorMessage } from "../services/lndApi";
import usePermission from "../hooks/usePermission";
import "../styles/pages/LearningDevelopment.css";

// =================================================================
// LEARNING & DEVELOPMENT — learner side
//   /learning-development                 catalog
//   /learning-development/program/:id     modules of a program
//   /learning-development/module/:id      video / images / PDF / notes
//   /learning-development/exam/:id        assessment (graded on server)
//   /learning-development/certificate/:id printable certificate
//   /learning-development/certificates    my certificates
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

const fmtMin = (min) => (min >= 60 ? `${Math.floor(min / 60)} hr${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);

const Bar = ({ value }) => (
  <div className="lnd-bar"><span style={{ width: `${Math.min(100, value || 0)}%` }} /></div>
);

const Ring = ({ value }) => (
  <div className="lnd-ring" style={{ "--p": `${value || 0}%` }}><span>{value || 0}%</span></div>
);

const State = ({ loading, error, onRetry }) =>
  loading ? <div className="lnd-state">Loading…</div> :
  error ? <div className="lnd-state lnd-state--err">{error}{onRetry && <button onClick={onRetry}>Retry</button>}</div> : null;

const Thumb = ({ url, title, className = "" }) =>
  url ? <img className={`lnd-thumb ${className}`} src={fullUrl(url)} alt="" loading="lazy" />
      : <div className={`lnd-thumb lnd-thumb--empty ${className}`}>{title?.slice(0, 1) || "L"}</div>;

// ---------------- catalog ----------------

function Catalog() {
  const { loading, error, data, reload } = useLoad(() => lndApi.overview(), []);
  const [tab, setTab] = useState("All");
  const { canEdit } = usePermission("Learning & Development");

  const programs = data?.programs || [];
  const audiences = useMemo(() => ["All", ...new Set(programs.map((p) => p.audience))], [programs]);
  const shown = tab === "All" ? programs : programs.filter((p) => p.audience === tab);
  const overall = programs.length
    ? Math.round(programs.reduce((s, p) => s + p.percent, 0) / programs.length) : 0;

  return (
    <div className="lnd">
      <section className="lnd-hero">
        <div>
          <span className="lnd-chip">Learning &amp; Development</span>
          <h1>Grow Your Skills<br />Build a Better Store Experience</h1>
          <p>Role-based training programs to help you learn, execute and grow. Complete your modules and get certified.</p>
          <div className="lnd-actions">
            <a className="lnd-btn" href="#programs">Explore Programs</a>
            <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/certificates`}>My Certificates</Link>
            {canEdit && <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/manage`}>Manage Programs</Link>}
          </div>
        </div>
        <div className="lnd-hero__card"><Ring value={overall} /><span>Overall progress</span></div>
      </section>

      <div className="lnd-tabs" id="programs">
        {audiences.map((a) => (
          <button key={a} className={tab === a ? "on" : ""} onClick={() => setTab(a)}>{a === "All" ? "All Programs" : a}</button>
        ))}
      </div>

      <State loading={loading} error={error} onRetry={reload} />

      {!loading && !error && shown.length === 0 && (
        <div className="lnd-state">
          No training has been assigned to you yet.
          {canEdit && <> <Link to={`${BASE}/manage`}>Create or assign a program</Link></>}
        </div>
      )}

      <div className="lnd-grid">
        {shown.map((p) => (
          <Link key={p.id} to={`${BASE}/program/${p.id}`} className="lnd-card">
            <Thumb url={p.thumbUrl} title={p.title} />
            <div className="lnd-card__body">
              <span className="lnd-tag">{p.audience}</span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="lnd-meta"><span>{p.moduleCount} Modules</span><span>{fmtMin(p.durationMin)}</span><span>{p.percent}% Completed</span></div>
              <Bar value={p.percent} />
              <span className="lnd-btn lnd-btn--sm">{p.percent === 100 ? "Review" : p.started ? "Continue Learning →" : "Start Learning →"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------- program ----------------

function Program() {
  const { id } = useParams();
  const { loading, error, data, reload } = useLoad(() => lndApi.program(id), [id]);
  if (loading || error) return <div className="lnd"><State loading={loading} error={error} onRetry={reload} /></div>;

  const { program, modules, stats, certificateReady } = data;
  const next = modules.find((m) => m.id === stats.nextModuleId);

  return (
    <div className="lnd">
      <Link className="lnd-back" to={BASE}>‹ Back to Learning &amp; Development</Link>
      <section className="lnd-hero lnd-hero--sm">
        <div>
          <span className="lnd-chip">{program.audience}</span>
          <h1>{program.title}</h1>
          <p>{program.description}</p>
          <div className="lnd-actions">
            {next && <Link className="lnd-btn" to={`${BASE}/module/${next.id}`}>{stats.started ? "Continue Learning" : "Start Learning"}</Link>}
            {certificateReady && <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/certificate/${program.id}`}>View Certificate</Link>}
          </div>
        </div>
        <div className="lnd-hero__card"><Ring value={stats.percent} /><span>{stats.completedCount} of {stats.moduleCount} modules</span></div>
      </section>

      <div className="lnd-list">
        {modules.map((m, i) => (
          <div key={m.id} className={`lnd-row ${m.locked ? "is-locked" : ""}`}>
            <span className={`lnd-num ${m.completed ? "done" : ""}`}>{m.completed ? "✓" : i + 1}</span>
            <div className="lnd-row__main">
              <h4>{m.title}</h4>
              <p>{m.description}</p>
              <div className="lnd-meta"><span>{fmtMin(m.durationMin)}</span>{m.hasExam && <span>Assessment · pass {m.passMark}%</span>}{m.bestScore !== null && <span>Best score {m.bestScore}%</span>}</div>
            </div>
            {m.locked
              ? <span className="lnd-lock" title="Complete the previous module first">🔒 Locked</span>
              : <Link className="lnd-btn lnd-btn--sm" to={`${BASE}/module/${m.id}`}>{m.completed ? "Review" : m.started ? "Continue" : "Start"}</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- module ----------------

const youtubeEmbed = (url) => {
  const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/.exec(url || "");
  return m ? `https://www.youtube.com/embed/${m[1]}` : "";
};

function ModulePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data, reload } = useLoad(() => lndApi.module(id), [id]);
  const [tab, setTab] = useState("video");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { setTab("video"); setMsg(""); }, [id]);

  if (loading || error) return <div className="lnd"><State loading={loading} error={error} onRetry={reload} /></div>;

  const { program, module: mod, media, modules, stats, position, certificateReady } = data;
  const videos = media.filter((m) => m.kind === "video");
  const images = media.filter((m) => m.kind === "image");
  const pdfs = media.filter((m) => m.kind === "pdf");
  const embed = youtubeEmbed(mod.videoUrl);
  const index = modules.findIndex((m) => m.id === mod.id);
  const nextModule = modules[index + 1];

  const tabs = [
    ["video", "Video Lesson"], ["images", `Images (${images.length})`], ["pdf", `PDF Materials (${pdfs.length})`],
    ...(mod.hasExam ? [["quiz", "Quiz / Assessment"]] : []), ["notes", "Notes"],
  ];

  const markComplete = async () => {
    setBusy(true);
    try { await lndApi.complete(mod.id); setMsg("Module marked as complete."); await reload(); }
    catch (e) { setMsg(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="lnd">
      <Link className="lnd-back" to={`${BASE}/program/${program.id}`}>‹ Back to {program.title}</Link>

      <section className="lnd-hero lnd-hero--sm">
        <div>
          <span className="lnd-chip">{program.audience}</span>
          <h1>{mod.title}</h1>
          <div className="lnd-meta lnd-meta--light">
            <span>Module {position.index} of {position.total}</span><span>{fmtMin(mod.durationMin)}</span>
            <span>{mod.completed ? "Completed" : "In Progress"}</span>
          </div>
          <p>{mod.description}</p>
        </div>
        <div className="lnd-hero__card"><Ring value={stats.percent} /><span>{stats.completedCount} of {stats.moduleCount} lessons completed</span></div>
      </section>

      <div className="lnd-tabs">
        {tabs.map(([key, label]) => <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      <div className="lnd-cols">
        <div className="lnd-main">
          {tab === "video" && (
            <div className="lnd-panel">
              {videos.length > 0 ? videos.map((v) => (
                <div key={v.id} className="lnd-video">
                  <video controls controlsList={v.allowDownload ? undefined : "nodownload"} preload="metadata" src={fullUrl(v.url)} />
                  <small>{v.name}</small>
                </div>
              )) : embed ? (
                <div className="lnd-video"><iframe title={mod.title} src={embed} allowFullScreen /></div>
              ) : mod.videoUrl ? (
                <a className="lnd-btn" href={mod.videoUrl} target="_blank" rel="noreferrer noopener">Open video link ↗</a>
              ) : <p className="lnd-empty">No video has been added to this module yet.</p>}

              {mod.highlights.length > 0 && (
                <>
                  <h3>Key Highlights</h3>
                  <div className="lnd-highlights">{mod.highlights.map((h) => <div key={h}>{h}</div>)}</div>
                </>
              )}
            </div>
          )}

          {tab === "images" && (
            <div className="lnd-panel">
              {images.length ? <div className="lnd-gallery">{images.map((i) => (
                <a key={i.id} href={fullUrl(i.url)} target="_blank" rel="noreferrer noopener"><img src={fullUrl(i.url)} alt={i.name} loading="lazy" /></a>
              ))}</div> : <p className="lnd-empty">No images in this module.</p>}
            </div>
          )}

          {tab === "pdf" && (
            <div className="lnd-panel">
              {pdfs.length ? pdfs.map((p) => (
                <div key={p.id} className="lnd-file">
                  <div><strong>{p.name}</strong><small>{(p.size / 1024 / 1024).toFixed(1)} MB</small></div>
                  <a className="lnd-btn lnd-btn--sm" href={fullUrl(p.url)} target="_blank" rel="noreferrer noopener">Open</a>
                  {p.allowDownload && <a className="lnd-btn lnd-btn--sm lnd-btn--ghost" href={`${fullUrl(p.url)}&dl=1`}>Download</a>}
                </div>
              )) : <p className="lnd-empty">No PDF materials in this module.</p>}
            </div>
          )}

          {tab === "quiz" && mod.hasExam && (
            <div className="lnd-panel">
              <h3>Assessment</h3>
              <p>{mod.questionCount} questions · pass mark {mod.passMark}% · {mod.examMinutes} minutes.
                {mod.bestScore !== null && <> Your best score: <strong>{mod.bestScore}%</strong> ({mod.attempts} attempt{mod.attempts === 1 ? "" : "s"}).</>}</p>
              <button className="lnd-btn" onClick={() => navigate(`${BASE}/exam/${mod.id}`)}>{mod.completed ? "Retake Assessment" : "Start Assessment"}</button>
            </div>
          )}

          {tab === "notes" && (
            <div className="lnd-panel"><h3>About this module</h3><p style={{ whiteSpace: "pre-wrap" }}>{mod.description || "No notes added."}</p></div>
          )}
        </div>

        <aside className="lnd-side">
          <div className="lnd-panel">
            <h3>Module Lessons ({modules.length})</h3>
            {modules.map((m, i) => (
              m.locked ? <div key={m.id} className="lnd-lesson is-locked">🔒 {i + 1}. {m.title}</div>
              : <Link key={m.id} to={`${BASE}/module/${m.id}`} className={`lnd-lesson ${m.id === mod.id ? "on" : ""}`}>
                  <span>{m.completed ? "✓" : "•"} {i + 1}. {m.title}</span><small>{m.durationMin}m</small>
                </Link>
            ))}
          </div>

          <div className="lnd-panel">
            <h3>Module Information</h3>
            <dl className="lnd-info">
              <dt>Program</dt><dd>{program.title}</dd>
              <dt>Duration</dt><dd>{fmtMin(mod.durationMin)}</dd>
              <dt>Status</dt><dd>{mod.completed ? "Completed" : "In Progress"}</dd>
              <dt>Required</dt><dd>{mod.mandatory ? "Mandatory" : "Optional"}</dd>
            </dl>
            {msg && <p className="lnd-note">{msg}</p>}
            {mod.completed ? (
              nextModule && !nextModule.locked && <Link className="lnd-btn lnd-btn--block" to={`${BASE}/module/${nextModule.id}`}>Next Module →</Link>
            ) : mod.hasExam ? (
              <button className="lnd-btn lnd-btn--block" onClick={() => setTab("quiz")}>Take Assessment to Complete</button>
            ) : (
              <button className="lnd-btn lnd-btn--block" disabled={busy} onClick={markComplete}>{busy ? "Saving…" : "Mark as Complete"}</button>
            )}
          </div>

          <div className="lnd-panel">
            <h3>Certificate</h3>
            <p className="lnd-small">Complete all lessons and pass the assessments to get your certificate.</p>
            {certificateReady
              ? <Link className="lnd-btn lnd-btn--block" to={`${BASE}/certificate/${program.id}`}>View Certificate</Link>
              : <button className="lnd-btn lnd-btn--block" disabled>View Certificate</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------- exam ----------------

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
  const submitted = useRef(false);

  useEffect(() => {
    let alive = true;
    lndApi.examStart(id)
      .then((d) => { if (alive) { setExam(d); setLeft(d.minutes * 60); } })
      .catch((e) => alive && setError(errorMessage(e, "Unable to start the assessment")));
    return () => { alive = false; };
  }, [id]);

  const submit = useCallback(async () => {
    if (!exam || submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try { setResult(await lndApi.examSubmit(exam.attemptId, answers)); }
    catch (e) { submitted.current = false; setError(errorMessage(e, "Unable to submit")); }
    finally { setSubmitting(false); }
  }, [exam, answers]);

  useEffect(() => {
    if (!exam || result) return undefined;
    const t = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [exam, result]);

  useEffect(() => { if (exam && !result && left <= 0) submit(); }, [left, exam, result, submit]);

  if (error) return <div className="lnd"><div className="lnd-state lnd-state--err">{error} <button onClick={() => navigate(`${BASE}/module/${id}`)}>Back to module</button></div></div>;
  if (!exam) return <div className="lnd"><div className="lnd-state">Preparing assessment…</div></div>;

  if (result) {
    return (
      <div className="lnd">
        <div className="lnd-panel lnd-result">
          <h1>{result.passed ? "🎉 Passed!" : "Not passed yet"}</h1>
          <Ring value={result.score} />
          <p>{result.correct} of {result.total} correct · pass mark {result.passMark}%</p>
          {result.timedOut && <p className="lnd-note">Time ran out before submission.</p>}
          <div className="lnd-actions" style={{ justifyContent: "center" }}>
            {!result.passed && <button className="lnd-btn" onClick={() => window.location.reload()}>Try Again</button>}
            <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/module/${id}`}>Back to Module</Link>
          </div>
          {result.passed && (
            <ol className="lnd-review">
              {exam.questions.map((q, i) => {
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
  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, "0");
  const ss = String(Math.max(0, left % 60)).padStart(2, "0");
  const answered = Object.keys(answers).length;

  return (
    <div className="lnd">
      <div className="lnd-panel lnd-exam">
        <header>
          <div><h2>{exam.title}</h2><small>{exam.questions.length} questions · pass mark {exam.passMark}%</small></div>
          <span className={`lnd-timer ${left < 60 ? "low" : ""}`}>{mm}:{ss}</span>
        </header>
        <div className="lnd-exam__body">
          <nav>
            {exam.questions.map((x, i) => (
              <button key={x.id} className={`${i === current ? "cur" : ""} ${answers[x.id] !== undefined ? "ans" : ""}`} onClick={() => setCurrent(i)}>{i + 1}</button>
            ))}
          </nav>
          <div>
            <h3>Question {current + 1} of {exam.questions.length}</h3>
            <p className="lnd-q">{q.question}</p>
            {q.options.map((opt, i) => (
              <label key={i} className={answers[q.id] === i ? "on" : ""}>
                <input type="radio" name={`q${q.id}`} checked={answers[q.id] === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                {opt}
              </label>
            ))}
            <div className="lnd-actions">
              <button className="lnd-btn lnd-btn--ghost" disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous</button>
              {current < exam.questions.length - 1
                ? <button className="lnd-btn" onClick={() => setCurrent(current + 1)}>Next</button>
                : <button className="lnd-btn" disabled={submitting} onClick={() => {
                    if (answered < exam.questions.length && !window.confirm(`You answered ${answered} of ${exam.questions.length}. Submit anyway?`)) return;
                    submit();
                  }}>{submitting ? "Submitting…" : "Submit"}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- certificate ----------------

function Certificate() {
  const { id } = useParams();
  const { loading, error, data, reload } = useLoad(() => lndApi.certificate(id), [id]);
  if (loading || error) return <div className="lnd"><State loading={loading} error={error} onRetry={reload} /></div>;
  const c = data.certificate;
  return (
    <div className="lnd">
      <div className="lnd-actions no-print">
        <Link className="lnd-btn lnd-btn--ghost" to={`${BASE}/program/${id}`}>‹ Back</Link>
        <button className="lnd-btn" onClick={() => window.print()}>Download / Print Certificate</button>
      </div>
      <div className="lnd-cert">
        <div className="lnd-cert__inner">
          <b>MIARCUS</b><small>Learning &amp; Development</small>
          <h1>Certificate of Completion</h1>
          <p>This is to certify that</p>
          <h2>{c.name}</h2>
          <p>has successfully completed the</p>
          <h3>{c.program}</h3>
          <p>on {new Date(c.issuedAt).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}</p>
          <small>Certificate ID: {c.code}</small>
        </div>
      </div>
    </div>
  );
}

function Certificates() {
  const { loading, error, data, reload } = useLoad(() => lndApi.certificates(), []);
  return (
    <div className="lnd">
      <Link className="lnd-back" to={BASE}>‹ Back to Learning &amp; Development</Link>
      <h1 className="lnd-h1">My Certificates</h1>
      <State loading={loading} error={error} onRetry={reload} />
      {data && data.certificates.length === 0 && <div className="lnd-state">No certificates yet — complete a program to earn one.</div>}
      <div className="lnd-list">
        {data?.certificates.map((c) => (
          <div key={c.code} className="lnd-row">
            <span className="lnd-num done">★</span>
            <div className="lnd-row__main"><h4>{c.title}</h4><p>Issued {new Date(c.issuedAt).toLocaleDateString()} · {c.code}</p></div>
            <Link className="lnd-btn lnd-btn--sm" to={`${BASE}/certificate/${c.programId}`}>View</Link>
          </div>
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

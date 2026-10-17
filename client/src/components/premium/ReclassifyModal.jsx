import { useCallback, useEffect, useRef, useState } from "react";
import axios from "../../axiosConfig.js";
import { FaMagic, FaTimes, FaArrowRight, FaCheckCircle, FaExclamationTriangle, FaSyncAlt, FaInfoCircle } from "react-icons/fa";
import "../../styles/premium/ChecklistPremium.css";
import "../../styles/premium/RecheckModal.css";

// ======================================================
// RE-CHECK ANSWERS
// ======================================================
// Reconciles existing Action Points with the ACTIVE Issue Control
// Center rules (POST /api/action-points/reclassify, run as a background
// job and polled — large data never hits the HTTP timeout):
//   • open Action Points whose answer is the rule's no-issue answer
//                                         → Checklist Reports
//   • Action Points whose answer is the issue-trigger answer → kept
//   • no active rule / no reliable source answer / already worked on
//                                         → skipped (counted)
//   • optional, bounded by a date range: issue-trigger answers that
//     have no Action Point yet            → one Action Point each
// Preview never changes data. "Apply changes" re-computes and applies
// in small transactional batches; re-running is safe.
// ======================================================

const POLL_MS = 1500;
const isoDate = (d) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); };
const fmt = (n) => Number(n || 0).toLocaleString();

function Stat({ tone, label, value, help }) {
    return (
        <div className={`rck-stat tone-${tone}`}>
            <span>{label}</span>
            <strong>{fmt(value)}</strong>
            {help && <small>{help}</small>}
        </div>
    );
}

export default function ReclassifyModal({ isOpen, onClose, onApplied }) {
    const [includeMissing, setIncludeMissing] = useState(false);
    const [fromDate, setFromDate] = useState(daysAgo(6));
    const [toDate, setToDate] = useState(isoDate(new Date()));
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(null);   // "preview" | "apply" | null
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState("");
    const pollRef = useRef(null);
    const aliveRef = useRef(true);

    const stopPolling = () => {
        if (pollRef.current) clearTimeout(pollRef.current);
        pollRef.current = null;
    };

    useEffect(() => {
        aliveRef.current = true;
        return () => { aliveRef.current = false; stopPolling(); };
    }, []);

    const options = useCallback(() => ({
        include_missing: includeMissing,
        from_date: includeMissing ? fromDate : null,
        to_date: includeMissing ? toDate : null
    }), [includeMissing, fromDate, toDate]);

    const runJob = useCallback(async (mode) => {
        stopPolling();
        setError("");
        setRunning(mode);
        setProgress({ phase: mode === "apply" ? "Starting…" : "Preparing preview…", processed: 0, total: 0 });
        if (mode === "preview") { setPreview(null); setResult(null); }

        try {
            const { data } = await axios.post("/api/action-points/reclassify", {
                ...options(),
                dryRun: mode !== "apply",
                async: true
            });
            const jobId = data?.jobId;
            if (!jobId) throw new Error("The server did not start the re-check.");

            const poll = async () => {
                if (!aliveRef.current) return;
                try {
                    const { data: status } = await axios.get(`/api/action-points/reclassify/status/${jobId}`);
                    const job = status?.job || {};
                    setProgress({ phase: job.phase || job.message, processed: job.processed, total: job.total });

                    if (job.status === "completed" || job.status === "failed") {
                        setRunning(null);
                        const summary = status?.result || null;
                        if (mode === "apply") {
                            setResult(summary);
                            if (job.status === "failed") setError(job.message || "The re-check stopped with an error.");
                            if (summary) onApplied?.(summary);
                        } else if (job.status === "failed") {
                            setError(job.message || "Unable to prepare the preview.");
                        } else {
                            setPreview(summary);
                        }
                        return;
                    }
                    pollRef.current = setTimeout(poll, POLL_MS);
                } catch (pollError) {
                    setRunning(null);
                    setError(pollError.response?.data?.message || "Lost contact with the re-check job. Open Re-check again to see the current state — re-running is safe.");
                }
            };
            pollRef.current = setTimeout(poll, 600);
        } catch (startError) {
            setRunning(null);
            setError(startError.response?.data?.message || startError.message || "Unable to start the re-check.");
        }
    }, [options, onApplied]);

    // Preview automatically when the dialog opens.
    useEffect(() => {
        if (!isOpen) { stopPolling(); return; }
        setPreview(null); setResult(null); setError(""); setIncludeMissing(false);
        setFromDate(daysAgo(6)); setToDate(isoDate(new Date()));
        runJob("preview");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const e = preview?.existing || {};
    const m = preview?.missing || {};
    const changes = preview
        ? (e.moved_to_reports || 0) + (e.duplicates_removed || 0) + (m.to_create || 0) + (preview.rules_corrected || 0)
        : 0;
    const nothingToDo = preview && changes === 0;
    const percent = progress?.total ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : null;
    const busy = Boolean(running);

    const samples = preview ? [
        ...(preview.samples?.moved || []).map((r) => ({ ...r, move: "report" })),
        ...(preview.samples?.created || []).map((r) => ({ ...r, move: "action" }))
    ].slice(0, 12) : [];

    return (
        <div className="premium-modal-backdrop" onClick={busy ? undefined : onClose}>
            <div className="premium-modal rck-modal" onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="rck-title">
                <div className="premium-modal-head">
                    <div className="premium-modal-title">
                        <span className="premium-modal-icon"><FaMagic /></span>
                        <div>
                            <h3 id="rck-title">Re-check checklist answers</h3>
                            <p>Reconciles existing Action Points with each question's <b>active</b> Issue Control Center rule. Preview first — nothing changes until you apply.</p>
                        </div>
                    </div>
                    <button type="button" className="premium-modal-close" onClick={onClose} disabled={running === "apply"} aria-label="Close"><FaTimes /></button>
                </div>

                <div className="premium-modal-body">
                    {/* ---------- scope ---------- */}
                    {!result && (
                        <div className="rck-scope">
                            <label className="rck-check">
                                <input type="checkbox" checked={includeMissing} disabled={busy} onChange={(ev) => setIncludeMissing(ev.target.checked)} />
                                <span>Also look for <b>missing</b> Action Points (issue-trigger answers without one)</span>
                            </label>
                            {includeMissing && (
                                <div className="rck-dates">
                                    <label>From<input type="date" value={fromDate} max={toDate} disabled={busy} onChange={(ev) => setFromDate(ev.target.value)} /></label>
                                    <label>To<input type="date" value={toDate} min={fromDate} disabled={busy} onChange={(ev) => setToDate(ev.target.value)} /></label>
                                    <small>Submission dates, up to {preview?.scope?.max_range_days || 92} days per run.</small>
                                </div>
                            )}
                            <button type="button" className="premium-btn ghost rck-refresh" disabled={busy} onClick={() => runJob("preview")}><FaSyncAlt /> Update preview</button>
                        </div>
                    )}

                    {/* ---------- progress ---------- */}
                    {busy && (
                        <div className="rck-progress" aria-live="polite">
                            <div className="premium-modal-loading"><span className="premium-spinner" /> {progress?.phase || "Working…"}</div>
                            {percent !== null && (
                                <>
                                    <div className="rck-bar"><span style={{ width: `${percent}%` }} /></div>
                                    <small>{fmt(progress.processed)} of {fmt(progress.total)} change(s) · {percent}%</small>
                                </>
                            )}
                            {running === "apply" && <small>Keep this window open. Changes are saved in small batches; if anything fails, the failed batch is rolled back and running Re-check again is safe.</small>}
                        </div>
                    )}

                    {error && <div className="premium-modal-error"><FaExclamationTriangle /> {error}</div>}

                    {/* ---------- applied result ---------- */}
                    {result && (
                        <div className={`rck-result ${result.errors?.length ? "failed" : "ok"}`}>
                            {result.errors?.length ? <FaExclamationTriangle /> : <FaCheckCircle />}
                            <div>
                                <strong>{result.errors?.length ? "Re-check stopped — partially applied" : "Re-check applied"}</strong>
                                <div className="rck-grid">
                                    <Stat tone="green" label="Moved to Checklist Reports" value={result.applied?.moved} />
                                    <Stat tone="slate" label="Duplicates removed" value={result.applied?.duplicates_removed} />
                                    <Stat tone="red" label="Action Points created" value={result.applied?.created} />
                                    <Stat tone="violet" label="Rules corrected" value={result.rules_corrected} />
                                    <Stat tone="amber" label="Changed since preview (skipped)" value={(result.applied?.changed_since_preview || 0) + (result.missing?.already_exists || 0)} />
                                    <Stat tone="slate" label="Open Action Points now" value={result.after?.open_action_points} />
                                </div>
                                {(result.errors || []).map((er, i) => <p key={i} className="rck-error-line">{er.message} — {er.detail}</p>)}
                            </div>
                        </div>
                    )}

                    {/* ---------- preview ---------- */}
                    {preview && !result && !busy && (
                        <>
                            <h4 className="rck-h">Existing Action Points <span>{fmt(e.open_checklist_action_points)} open checklist Action Point(s) evaluated</span></h4>
                            <div className="rck-grid">
                                <Stat tone="green" label="Move to Checklist Reports" value={e.moved_to_reports} help="Answer is the rule's no-issue answer" />
                                <Stat tone="violet" label="Keep as Action Points" value={e.retained} help="Answer is the issue-trigger answer" />
                                <Stat tone="slate" label="Duplicates to remove" value={e.duplicates_removed} help="2nd+ Action Point for one answer" />
                                <Stat tone="amber" label="Skipped — no active rule" value={e.skipped_no_rule} help="Add / activate a rule in Issue Control Center" />
                                <Stat tone="amber" label="Skipped — no source answer" value={e.skipped_unmapped} help="Not linked to a checklist answer" />
                                <Stat tone="amber" label="Skipped — being worked on" value={e.skipped_in_progress} help="Commented / assigned / in progress" />
                            </div>
                            <p className={`rck-reconcile ${e.reconciled ? "ok" : "bad"}`}>
                                {e.reconciled ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                {fmt(e.moved_to_reports)} + {fmt(e.retained)} + {fmt(e.duplicates_removed)} + {fmt(e.skipped_no_rule)} + {fmt(e.skipped_unmapped)} + {fmt(e.skipped_in_progress)} = {fmt(e.open_checklist_action_points)} open checklist Action Points.
                                {" "}Not touched: {fmt(preview.other?.manual_open)} manual Action Point(s), {fmt(preview.other?.checklist_closed)} closed (already in Checklist Reports).
                            </p>

                            {preview.scope?.include_missing && (
                                <>
                                    <h4 className="rck-h">Missing Action Points <span>{preview.scope.from_date} → {preview.scope.to_date}</span></h4>
                                    <div className="rck-grid">
                                        <Stat tone="slate" label="Answers checked" value={m.evaluated} help="Questions with an active rule, no Action Point yet" />
                                        <Stat tone="red" label="Create Action Points" value={m.to_create} help="Confirmed issue-trigger answers" />
                                        <Stat tone="green" label="Already correct" value={m.already_correct} help="Not an issue — stay in Checklist Reports" />
                                    </div>
                                </>
                            )}

                            <h4 className="rck-h">Rules <span>{fmt(preview.active_rules)} active rule(s)</span></h4>
                            <div className="rck-grid">
                                <Stat tone="violet" label="Rules to correct" value={preview.rules_corrected} help="N/A + Any non-empty → N/A + Blank answer" />
                                <Stat tone="amber" label="Rules needing review" value={(preview.invalid_rules || []).length} help="Invalid answer combination — fix in Issue Control Center" />
                            </div>
                            {(preview.rule_repairs || []).length > 0 && (
                                <details className="rck-details">
                                    <summary>Show the {preview.rule_repairs.length} rule(s) that will be corrected</summary>
                                    <ul>{preview.rule_repairs.map((r) => <li key={r.id}><b>{r.question}</b> <small>{r.checklist_type}</small> — issue-trigger “{r.from.issue_answer}” → “{r.to.issue_answer}”</li>)}</ul>
                                </details>
                            )}
                            {(preview.invalid_rules || []).length > 0 && (
                                <details className="rck-details warn">
                                    <summary>Show the {preview.invalid_rules.length} rule(s) needing review</summary>
                                    <ul>{preview.invalid_rules.map((r) => <li key={r.id}><b>{r.question}</b> <small>{r.checklist_type}</small> — {r.problems[0]}</li>)}</ul>
                                </details>
                            )}

                            {(preview.warnings || []).map((w) => <p key={w} className="premium-reclass-note"><FaInfoCircle /> {w}</p>)}
                            {nothingToDo && <p className="premium-reclass-note ok">Everything is already reconciled. Nothing to change.</p>}

                            {samples.map((row, index) => (
                                <div className="premium-reclass-row" key={`${row.move}-${index}`}>
                                    <div className="premium-reclass-q">
                                        <b>{row.question || "(question not found)"}</b>
                                        <span>Answer: <em>{row.answer === "" || row.answer == null ? "(blank)" : row.answer}</em></span>
                                    </div>
                                    <span className={`premium-reclass-move ${row.move}`}>
                                        {row.move === "report" ? "Action Points" : "Reports"} <FaArrowRight /> {row.move === "report" ? "Checklist Reports" : "Action Points"}
                                    </span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="premium-modal-foot">
                    <button type="button" className="premium-btn ghost" onClick={onClose} disabled={running === "apply"}>{result ? "Close" : "Cancel"}</button>
                    {!result && (
                        <button
                            type="button"
                            className="premium-btn primary"
                            onClick={() => runJob("apply")}
                            disabled={busy || !preview || nothingToDo}
                        >
                            {running === "apply" ? "Applying…" : `Apply ${fmt(changes)} change(s)`}
                        </button>
                    )}
                    {result && result.errors?.length > 0 && (
                        <button type="button" className="premium-btn primary" onClick={() => { setResult(null); runJob("preview"); }}>Re-check again</button>
                    )}
                </div>
            </div>
        </div>
    );
}

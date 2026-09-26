import { useEffect, useState } from "react";
import axios from "../../axiosConfig.js";
import { FaMagic, FaTimes, FaArrowRight, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import "../../styles/premium/ChecklistPremium.css";

// ======================================================
// RE-CHECK ANSWERS
// ======================================================
// Previews and applies the polarity-aware re-classification of
// existing checklist answers (POST /api/action-points/reclassify):
//   • wrongly raised OPEN Action Points  → Checklist Reports
//   • missed problems (e.g. "Are there any tile issues?" → "Yes")
//                                         → new Action Points
// ======================================================

export default function ReclassifyModal({ isOpen, onClose, onApplied }) {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        setPreview(null);
        setDone(null);
        setError("");
        setLoading(true);
        axios.post("/api/action-points/reclassify", { dryRun: true })
            .then(({ data }) => setPreview(data?.data || null))
            .catch((err) => setError(err.response?.data?.message || "Unable to preview the re-check."))
            .finally(() => setLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    const apply = async () => {
        setApplying(true);
        setError("");
        try {
            const { data } = await axios.post("/api/action-points/reclassify", { dryRun: false });
            setDone(data?.data || {});
            onApplied?.(data?.data);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to apply the re-check.");
        } finally {
            setApplying(false);
        }
    };

    const nothingToDo = preview &&
        !preview.removed_action_points &&
        !preview.created_action_points &&
        !preview.repaired_rules;

    return (
        <div className="premium-modal-backdrop" onClick={onClose}>
            <div className="premium-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="premium-modal-head">
                    <div className="premium-modal-title">
                        <span className="premium-modal-icon"><FaMagic /></span>
                        <div>
                            <h3>Re-check checklist answers</h3>
                            <p>Understands the question: “Any paint issues?” → <b>No</b> is fine, “Any tile issues?” → <b>Yes</b> needs action.</p>
                        </div>
                    </div>
                    <button type="button" className="premium-modal-close" onClick={onClose} aria-label="Close"><FaTimes /></button>
                </div>

                <div className="premium-modal-body">
                    {loading && <div className="premium-modal-loading"><span className="premium-spinner" /> Scanning submitted answers…</div>}
                    {error && <div className="premium-modal-error"><FaExclamationTriangle /> {error}</div>}

                    {done && (
                        <div className="premium-modal-success">
                            <FaCheckCircle />
                            <div>
                                <strong>Re-check complete</strong>
                                <span>{done.removed_action_points || 0} answer(s) moved to Checklist Reports · {done.created_action_points || 0} new Action Point(s) raised · {done.repaired_rules || 0} rule(s) corrected.</span>
                            </div>
                        </div>
                    )}

                    {preview && !done && (
                        <>
                            <div className="premium-reclass-grid">
                                <div className="premium-reclass-card tone-green">
                                    <span>Move to Checklist Reports</span>
                                    <strong>{preview.removed_action_points}</strong>
                                    <small>Open Action Points whose answer is actually fine (No issue / N/A / 0)</small>
                                </div>
                                <div className="premium-reclass-card tone-red">
                                    <span>Raise as Action Points</span>
                                    <strong>{preview.created_action_points}</strong>
                                    <small>Answers that report a problem but had no Action Point</small>
                                </div>
                                <div className="premium-reclass-card tone-slate">
                                    <span>Rules corrected</span>
                                    <strong>{preview.repaired_rules}</strong>
                                    <small>Auto rules that expected the wrong answer</small>
                                </div>
                            </div>

                            {preview.skipped_in_progress > 0 && (
                                <p className="premium-reclass-note">
                                    {preview.skipped_in_progress} Action Point(s) already being worked on (In Progress / action recorded) are left untouched.
                                </p>
                            )}

                            {nothingToDo && <p className="premium-reclass-note ok">Everything is already classified correctly. Nothing to change.</p>}

                            {[...(preview.removed || []).map((r) => ({ ...r, move: "report" })), ...(preview.created || []).map((r) => ({ ...r, move: "action" }))]
                                .slice(0, 12)
                                .map((row, index) => (
                                    <div className="premium-reclass-row" key={`${row.move}-${index}`}>
                                        <div className="premium-reclass-q">
                                            <b>{row.question}</b>
                                            <span>Answer: <em>{row.answer || "-"}</em></span>
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
                    <button type="button" className="premium-btn ghost" onClick={onClose}>{done ? "Close" : "Cancel"}</button>
                    {!done && (
                        <button
                            type="button"
                            className="premium-btn primary"
                            onClick={apply}
                            disabled={loading || applying || !preview || nothingToDo}
                        >
                            {applying ? "Applying…" : "Apply changes"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

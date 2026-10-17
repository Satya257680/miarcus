import { useEffect, useState } from "react";
import axios from "../../axiosConfig.js";
import { FaMagic, FaTimes, FaArrowRight, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import "../../styles/premium/ChecklistPremium.css";

// ======================================================
// RE-CHECK ANSWERS
// ======================================================
// Previews and applies the re-check of existing checklist answers
// against the ACTIVE Issue Control Center rules
// (POST /api/action-points/reclassify):
//   • OPEN Action Points whose answer is the rule's no-issue answer
//                                         → Checklist Reports
//   • answers matching the rule's issue-trigger answer that have no
//     Action Point yet                    → one new Action Point
//   • questions with no active rule are not guessed — their Action
//     Points are only reported as "needs review".
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
                            <p>Follows each question's active Issue Control Center rule: the <b>no-issue</b> answer goes to Checklist Reports, the <b>issue-trigger</b> answer needs an Action Point.</p>
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
                                    <small>Existing open Action Points whose answer is the rule's no-issue answer</small>
                                </div>
                                <div className="premium-reclass-card tone-red">
                                    <span>Raise as Action Points</span>
                                    <strong>{preview.created_action_points}</strong>
                                    <small>Answers matching the rule's issue-trigger answer that have no Action Point yet</small>
                                </div>
                                <div className="premium-reclass-card tone-slate">
                                    <span>Rules corrected</span>
                                    <strong>{preview.repaired_rules}</strong>
                                    <small>Rules whose configuration was actually corrected</small>
                                </div>
                            </div>

                            {preview.skipped_in_progress > 0 && (
                                <p className="premium-reclass-note">
                                    {preview.skipped_in_progress} Action Point(s) already being worked on (In Progress / action recorded) are left untouched.
                                </p>
                            )}

                            {preview.needs_review_no_rule > 0 && (
                                <p className="premium-reclass-note">
                                    {preview.needs_review_no_rule} open Action Point(s) belong to questions with no active Issue Control Center rule. They are left unchanged — add a rule for those questions to have them re-checked.
                                </p>
                            )}

                            {typeof preview.evaluated_answers === "number" && (
                                <p className="premium-reclass-note">
                                    Checked {preview.evaluated_answers} answer(s) and {preview.evaluated_action_points || 0} existing Action Point(s) against {preview.active_rules || 0} active rule(s). {preview.answers_without_rule || 0} answer(s) have no active rule and were not evaluated.
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

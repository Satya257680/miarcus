
import { useEffect, useState } from "react";
import axios from "../../axiosConfig";
import {
    FaShieldAlt,
    FaFileInvoice,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
    FaRobot,
    FaSearch,
    FaCalculator,
    FaExternalLinkAlt
} from "react-icons/fa";

function CheckIcon({ status }) {
    if (status === "PASS") return <FaCheckCircle className="expense-status-pass" />;
    if (status === "FAIL") return <FaTimesCircle className="expense-status-fail" />;
    return <FaExclamationTriangle className="expense-status-review" />;
}

function ExpenseDetails({ id, onClose }) {
    const [expense, setExpense] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        axios.get(`/api/expenses/${id}`)
            .then(({ data }) => {
                if (active) setExpense(data.expense);
            })
            .catch(error => {
                console.error("Expense details error:", error);
                if (active) setExpense(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [id]);

    if (!id) return null;

    return (
        <div className="expense-modal-backdrop" onMouseDown={onClose}>
            <div className="expense-modal" onMouseDown={event => event.stopPropagation()}>
                <div className="expense-modal-header">
                    <div>
                        <div className="expense-eyebrow">Expense Verification</div>
                        <h2>{loading ? "Loading..." : `Expense #${expense?.id || id}`}</h2>
                    </div>
                    <button className="expense-close" onClick={onClose}>×</button>
                </div>

                {loading ? (
                    <div className="expense-empty">Loading verification report...</div>
                ) : !expense ? (
                    <div className="expense-empty">Unable to load this expense.</div>
                ) : (
                    <div className="expense-details-body">
                        <div className="expense-detail-grid">
                            <div><span>Vendor</span><strong>{expense.vendor_name || "Not detected"}</strong></div>
                            <div><span>Invoice #</span><strong>{expense.invoice_number || "Not detected"}</strong></div>
                            <div><span>Bill Date</span><strong>{expense.bill_date || "Not detected"}</strong></div>
                            <div><span>Amount</span><strong>₹{Number(expense.total_amount || 0).toFixed(2)}</strong></div>
                            <div><span>Submitted By</span><strong>{expense.submitted_by_name}</strong></div>
                            <div><span>Status</span><strong>{expense.status}</strong></div>
                        </div>

                        <div className={`expense-risk-card ${String(expense.risk_level || "").toLowerCase().replace(/\s+/g, "-")}`}>
                            <div className="expense-risk-icon"><FaShieldAlt /></div>
                            <div>
                                <span>Calculated Risk</span>
                                <strong>{expense.risk_level}</strong>
                                <small>Risk score: {Number(expense.risk_score || 0)}/100 · OCR confidence: {Number(expense.ocr_confidence || 0)}%</small>
                            </div>
                        </div>

                        <div className="expense-flow">
                            <div className="expense-flow-step done"><FaFileInvoice /><span>Bill Upload</span></div>
                            <div className="expense-flow-line" />
                            <div className="expense-flow-step done"><FaSearch /><span>OCR</span></div>
                            <div className="expense-flow-line" />
                            <div className="expense-flow-step done"><FaRobot /><span>AI Analysis</span></div>
                            <div className="expense-flow-line" />
                            <div className="expense-flow-step done"><FaShieldAlt /><span>Risk</span></div>
                            <div className="expense-flow-line" />
                            <div className={`expense-flow-step ${expense.status === "Approved" ? "done" : ""}`}><FaCheckCircle /><span>Review</span></div>
                        </div>

                        <section className="expense-section">
                            <div className="expense-section-title"><FaCalculator /> Automated Checks</div>
                            <div className="expense-check-grid">
                                {(expense.checks || []).map(check => (
                                    <div className="expense-check-card" key={check.id}>
                                        <CheckIcon status={check.check_status} />
                                        <div>
                                            <strong>{check.check_type}</strong>
                                            <span>{check.check_status}</span>
                                        </div>
                                        <small>{check.details_json ? "Evidence captured" : ""}</small>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="expense-section">
                            <div className="expense-section-title"><FaRobot /> AI / Image Findings</div>
                            <div className="expense-findings">
                                {[
                                    ["Manipulation signals", expense.ai_analysis?.manipulation_signals],
                                    ["AI-generated signals", expense.ai_analysis?.ai_generated_signals],
                                    ["Image inconsistencies", expense.ai_analysis?.image_inconsistencies]
                                ].map(([title, values]) => (
                                    <div className="expense-finding" key={title}>
                                        <strong>{title}</strong>
                                        {values?.length ? (
                                            <ul>{values.map((item, index) => <li key={index}>{item}</li>)}</ul>
                                        ) : (
                                            <span className="expense-clean">No signals detected</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="expense-section">
                            <div className="expense-section-title"><FaExternalLinkAlt /> External Verification</div>
                            <div className="expense-verification">
                                <strong>{expense.verification?.status || "PENDING"}</strong>
                                <span>{expense.verification?.message || "Verification result unavailable."}</span>
                            </div>
                        </section>

                        {expense.attachment_path && (
                            <a
                                className="expense-attachment-link"
                                href={`${axios.defaults.baseURL}${expense.attachment_path}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open original bill
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExpenseDetails;

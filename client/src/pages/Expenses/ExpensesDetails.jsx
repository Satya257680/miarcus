import { useEffect, useMemo, useState } from "react";
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
    FaExternalLinkAlt,
    FaCopy,
    FaCalendarAlt,
    FaRupeeSign
} from "react-icons/fa";

function CheckIcon({ status }) {
    if (status === "PASS") return <FaCheckCircle className="expense-status-pass" />;
    if (status === "FAIL") return <FaTimesCircle className="expense-status-fail" />;
    return <FaExclamationTriangle className="expense-status-review" />;
}

function parseDetails(value) {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function formatMoney(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function riskClass(value) {
    return String(value || "Review Required")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function ExpenseDetails({ id, onClose }) {
    const [expense, setExpense] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setExpense(null);

        axios.get(`/api/expenses/${id}`)
            .then(({ data }) => {
                if (active) setExpense(data.expense || null);
            })
            .catch((error) => {
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

    const checks = useMemo(() => expense?.checks || [], [expense]);
    const attachmentUrl = expense?.attachment_path
        ? `${axios.defaults.baseURL}${expense.attachment_path}`
        : "";

    if (!id) return null;

    return (
        <div className="expense-modal-backdrop" onMouseDown={onClose}>
            <div className="expense-modal" onMouseDown={(event) => event.stopPropagation()}>
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
                            <div><FaShieldAlt /><span>Vendor</span><strong>{expense.vendor_name || "Not detected"}</strong></div>
                            <div><FaFileInvoice /><span>Invoice #</span><strong>{expense.invoice_number || "Not detected"}</strong></div>
                            <div><FaCalendarAlt /><span>Bill Date</span><strong>{expense.bill_date || "Not detected"}</strong></div>
                            <div><FaRupeeSign /><span>Amount</span><strong>{formatMoney(expense.total_amount)}</strong></div>
                            <div><span>Submitted By</span><strong>{expense.submitted_by_name || "Unknown User"}</strong></div>
                            <div><span>Status</span><strong>{expense.status || "Review Required"}</strong></div>
                        </div>

                        <div className={`expense-risk-card ${riskClass(expense.risk_level)}`}>
                            <div className="expense-risk-icon"><FaShieldAlt /></div>
                            <div className="expense-risk-copy">
                                <span>Calculated Risk</span>
                                <strong>{expense.risk_level}</strong>
                                <small>
                                    Risk score: {Number(expense.risk_score || 0)}/100 · OCR confidence: {Number(expense.ocr_confidence || 0)}%
                                </small>
                            </div>
                            <div className="expense-risk-meter">
                                <span style={{ width: `${Math.min(100, Math.max(0, Number(expense.risk_score || 0)))}%` }} />
                            </div>
                        </div>

                        <div className="expense-flow expense-flow-detail">
                            {[
                                ["Bill Upload", FaFileInvoice, true],
                                ["OCR Reading", FaSearch, true],
                                ["Validation", FaCalculator, checks.length > 0],
                                ["AI / Image", FaRobot, true],
                                ["Risk", FaShieldAlt, true],
                                ["Review", FaCheckCircle, expense.status === "Approved"]
                            ].map(([label, Icon, done], index, array) => (
                                <div className="expense-flow-detail-wrap" key={label}>
                                    <div className={`expense-flow-step ${done ? "done" : ""}`}>
                                        <Icon />
                                        <span>{label}</span>
                                    </div>
                                    {index < array.length - 1 && <div className="expense-flow-line" />}
                                </div>
                            ))}
                        </div>

                        <section className="expense-section">
                            <div className="expense-section-title"><FaCalculator /> Automated Checks</div>
                            <div className="expense-check-grid">
                                {checks.length === 0 ? (
                                    <div className="expense-empty">No check results were stored.</div>
                                ) : checks.map((check) => {
                                    const evidence = parseDetails(check.details_json);
                                    return (
                                        <div className="expense-check-card" key={check.id || check.check_type}>
                                            <CheckIcon status={check.check_status} />
                                            <div>
                                                <strong>{check.check_type}</strong>
                                                <span>{check.check_status}</span>
                                                {evidence && (
                                                    <small>
                                                        {check.check_type === "Duplicate check"
                                                            ? `${Number(evidence.matching_records || 0)} matching record(s)`
                                                            : check.check_type === "OCR extraction"
                                                                ? `${Number(evidence.confidence || 0)}% confidence`
                                                                : `Score: ${Number(check.score || 0)}`}
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="expense-section">
                            <div className="expense-section-title"><FaFileInvoice /> Extracted Bill Data</div>
                            <div className="expense-detail-grid compact">
                                <div><span>Expense Type</span><strong>{expense.expense_type || "Other"}</strong></div>
                                <div><span>GSTIN</span><strong>{expense.vendor_gstin || "Not detected"}</strong></div>
                                <div><span>Subtotal</span><strong>{formatMoney(expense.subtotal)}</strong></div>
                                <div><span>Tax</span><strong>{formatMoney(expense.tax_amount)}</strong></div>
                            </div>

                            {Array.isArray(expense.items) && expense.items.length > 0 && (
                                <div className="expense-items-table-wrap">
                                    <table className="expense-items-table">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Qty</th>
                                                <th>Unit</th>
                                                <th>Tax</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expense.items.map((item) => (
                                                <tr key={item.id || `${item.description}-${item.line_total}`}>
                                                    <td>{item.description || "—"}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>{formatMoney(item.unit_price)}</td>
                                                    <td>{Number(item.tax_rate || 0).toFixed(2)}%</td>
                                                    <td>{formatMoney(item.line_total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
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
                                            <span className="expense-clean"><FaCheckCircle /> No signals detected</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="expense-section">
                            <div className="expense-section-title"><FaExternalLinkAlt /> External Verification</div>
                            <div className="expense-verification">
                                <strong>{expense.verification?.status || "PENDING"}</strong>
                                <span>
                                    {expense.verification?.message ||
                                        (expense.verification?.verified ? "Verified successfully." : "Verification result unavailable.")}
                                </span>
                            </div>
                        </section>

                        {expense.rejection_reason && (
                            <div className="expense-rejection-note">
                                <FaTimesCircle />
                                <div><strong>Rejection reason</strong><span>{expense.rejection_reason}</span></div>
                            </div>
                        )}

                        {attachmentUrl && (
                            <a
                                className="expense-attachment-link"
                                href={attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <FaExternalLinkAlt /> Open original bill
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExpenseDetails;


import { useEffect, useRef, useState } from "react";
import axios from "../../axiosConfig";
import {
    FaCloudUploadAlt,
    FaRobot,
    FaShieldAlt,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
    FaFileInvoice,
    FaCalculator,
    FaSearch,
    FaExternalLinkAlt
} from "react-icons/fa";
import ExpenseDetails from "./ExpenseDetails";
import "../../styles/pages/Expenses.css";

const defaultTypes = [
    "Travel",
    "Rent",
    "Food",
    "Office Supplies",
    "Utilities",
    "Marketing",
    "Maintenance",
    "Other"
];

function ExpenseEntry() {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [expenseType, setExpenseType] = useState("");
    const [types, setTypes] = useState(defaultTypes);
    const [loading, setLoading] = useState(false);
    const [expense, setExpense] = useState(null);
    const [error, setError] = useState("");
    const [detailsId, setDetailsId] = useState(null);

    useEffect(() => {
        axios.get("/api/expenses/types")
            .then(({ data }) => {
                const incoming = Array.isArray(data.types) ? data.types : [];
                setTypes([...new Set([...defaultTypes, ...incoming])]);
            })
            .catch(() => {});
    }, []);

    const handleFile = selected => {
        const next = selected?.[0];
        setError("");
        setExpense(null);

        if (!next) {
            setFile(null);
            return;
        }

        if (next.size > 20 * 1024 * 1024) {
            setError("Please upload a bill up to 20 MB.");
            setFile(null);
            return;
        }

        setFile(next);
    };

    const submit = async event => {
        event.preventDefault();
        setError("");

        if (!expenseType) {
            setError("Select an expense type.");
            return;
        }

        if (!file) {
            setError("Choose a JPG, PNG, WEBP or PDF bill.");
            return;
        }

        const formData = new FormData();
        formData.append("expense_type", expenseType);
        formData.append("bill", file);

        try {
            setLoading(true);
            const { data } = await axios.post("/api/expenses", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setExpense(data.expense);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to analyze this bill."
            );
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setExpense(null);
        setError("");
        if (fileRef.current) fileRef.current.value = "";
    };

    const riskClass = String(expense?.risk_level || "")
        .toLowerCase()
        .replace(/\s+/g, "-");

    return (
        <div className="expense-page">
            <div className="expense-page-heading">
                <div>
                    <div className="expense-eyebrow">Expenses</div>
                    <h1>Expense Entry</h1>
                    <p>Upload a bill and let MI ARCUS verify it before approval.</p>
                </div>
                <div className="expense-heading-badge"><FaShieldAlt /> AI-assisted verification</div>
            </div>

            <div className="expense-process-card">
                {[
                    [FaCloudUploadAlt, "Bill Upload"],
                    [FaSearch, "OCR Reading"],
                    [FaRobot, "AI / Image Analysis"],
                    [FaShieldAlt, "Risk Calculation"],
                    [FaCheckCircle, "Review"]
                ].map(([Icon, label], index) => (
                    <div className="expense-process-item" key={label}>
                        <div className="expense-process-icon"><Icon /></div>
                        <span>{label}</span>
                        {index < 4 && <div className="expense-process-connector" />}
                    </div>
                ))}
            </div>

            <div className="expense-entry-layout">
                <form className="expense-card expense-upload-card" onSubmit={submit}>
                    <div className="expense-card-title">
                        <div className="expense-card-icon"><FaFileInvoice /></div>
                        <div>
                            <h2>New Expense Entry</h2>
                            <p>Upload the original bill or invoice for automatic extraction.</p>
                        </div>
                    </div>

                    <label className="expense-field-label">Expense Type</label>
                    <select
                        className="expense-input"
                        value={expenseType}
                        onChange={e => setExpenseType(e.target.value)}
                    >
                        <option value="">Select a type</option>
                        {types.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>

                    <div
                        className={`expense-dropzone ${file ? "has-file" : ""}`}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            hidden
                            onChange={e => handleFile(e.target.files)}
                        />
                        <FaCloudUploadAlt />
                        <strong>{file ? file.name : "Choose bill / invoice"}</strong>
                        <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "JPG, PNG, WEBP or PDF · Max 20 MB"}</span>
                    </div>

                    {error && <div className="expense-error"><FaTimesCircle /> {error}</div>}

                    <button
                        type="submit"
                        className="expense-primary-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>Analyzing bill...</>
                        ) : (
                            <><FaRobot /> Upload & Analyze</>
                        )}
                    </button>

                    {loading && (
                        <div className="expense-progress">
                            <div className="expense-progress-bar" />
                            <span>OCR → validation → AI/image analysis → risk calculation → verification</span>
                        </div>
                    )}
                </form>

                <div className="expense-card expense-info-card">
                    <div className="expense-card-title">
                        <div className="expense-card-icon"><FaShieldAlt /></div>
                        <div>
                            <h2>What MI ARCUS checks</h2>
                            <p>Every uploaded bill goes through the same control chain.</p>
                        </div>
                    </div>

                    <div className="expense-control-list">
                        <div><FaSearch /><span><strong>OCR extraction</strong> Vendor, date, invoice number and amount.</span></div>
                        <div><FaCalculator /><span><strong>Arithmetic validation</strong> Items, subtotal, tax and total consistency.</span></div>
                        <div><FaTimesCircle /><span><strong>Duplicate detection</strong> Invoice number + vendor matching.</span></div>
                        <div><FaRobot /><span><strong>AI/image analysis</strong> Manipulation, synthetic and visual inconsistency signals.</span></div>
                        <div><FaExternalLinkAlt /><span><strong>External verification</strong> Optional configured verification gateway.</span></div>
                    </div>
                </div>
            </div>

            {expense && (
                <div className="expense-result-card">
                    <div className="expense-result-header">
                        <div>
                            <div className="expense-eyebrow">Verification Complete</div>
                            <h2>Bill analysis result</h2>
                        </div>
                        <span className={`expense-risk-pill ${riskClass}`}>
                            {expense.risk_level}
                        </span>
                    </div>

                    <div className="expense-summary-grid">
                        <div><span>Vendor</span><strong>{expense.vendor_name || "Not detected"}</strong></div>
                        <div><span>Invoice #</span><strong>{expense.invoice_number || "Not detected"}</strong></div>
                        <div><span>Date</span><strong>{expense.bill_date || "Not detected"}</strong></div>
                        <div><span>Total</span><strong>₹{Number(expense.total_amount || 0).toFixed(2)}</strong></div>
                    </div>

                    <div className="expense-risk-banner">
                        <div className="expense-risk-score">{Number(expense.risk_score || 0)}</div>
                        <div>
                            <strong>{expense.risk_level}</strong>
                            <span>Risk score out of 100 · OCR confidence {Number(expense.ocr_confidence || 0)}%</span>
                        </div>
                    </div>

                    <div className="expense-result-actions">
                        <button className="expense-secondary-btn" onClick={() => setDetailsId(expense.id)}>
                            View full verification
                        </button>
                        <button className="expense-secondary-btn" onClick={reset}>
                            Upload another bill
                        </button>
                    </div>
                </div>
            )}

            {detailsId && (
                <ExpenseDetails
                    id={detailsId}
                    onClose={() => setDetailsId(null)}
                />
            )}
        </div>
    );
}

export default ExpenseEntry;

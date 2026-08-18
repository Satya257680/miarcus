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
    FaExternalLinkAlt,
    FaCopy,
    FaCalendarAlt,
    FaRupeeSign
} from "react-icons/fa";
import ExpenseDetails from "./ExpensesDetails";
import "../../styles/pages/Expenses.css";

const DEFAULT_TYPES = [
    "Travel",
    "Rent",
    "Food",
    "Office Supplies",
    "Utilities",
    "Marketing",
    "Maintenance",
    "Training",
    "Equipment",
    "Other"
];

const FLOW = [
    { label: "Bill Upload", icon: FaCloudUploadAlt },
    { label: "OCR Reading", icon: FaSearch },
    { label: "Validation", icon: FaCalculator },
    { label: "AI / Image", icon: FaRobot },
    { label: "Risk", icon: FaShieldAlt },
    { label: "Review", icon: FaCheckCircle }
];

function riskClass(value) {
    return String(value || "Review Required")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function formatMoney(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function CheckBadge({ status }) {
    if (status === "PASS") {
        return <span className="expense-check-badge pass"><FaCheckCircle /> Passed</span>;
    }
    if (status === "FAIL") {
        return <span className="expense-check-badge fail"><FaTimesCircle /> Failed</span>;
    }
    return <span className="expense-check-badge review"><FaExclamationTriangle /> Review</span>;
}

function ExpenseEntry() {
    const fileRef = useRef(null);

    const [file, setFile] = useState(null);
    const [expenseType, setExpenseType] = useState("");
    const [types, setTypes] = useState(DEFAULT_TYPES);
    const [loading, setLoading] = useState(false);
    const [expense, setExpense] = useState(null);
    const [error, setError] = useState("");
    const [detailsId, setDetailsId] = useState(null);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        let active = true;

        axios.get("/api/expenses/types")
            .then(({ data }) => {
                if (!active) return;
                const incoming = Array.isArray(data.types) ? data.types : [];
                setTypes([...new Set([...DEFAULT_TYPES, ...incoming.filter(Boolean)])]);
            })
            .catch(() => {});

        return () => {
            active = false;
        };
    }, []);

    const acceptFile = (next) => {
        setError("");
        setExpense(null);

        if (!next) {
            setFile(null);
            return;
        }

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ];

        if (!allowed.includes(next.type)) {
            setFile(null);
            setError("Only JPG, PNG, WEBP and PDF bills are supported.");
            return;
        }

        if (next.size > 20 * 1024 * 1024) {
            setFile(null);
            setError("Please upload a bill up to 20 MB.");
            return;
        }

        setFile(next);
    };

    const handleFile = (files) => {
        acceptFile(files?.[0]);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        handleFile(event.dataTransfer.files);
    };

    const submit = async (event) => {
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

            const { data } = await axios.post(
                "/api/expenses",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            if (!data?.success || !data?.expense) {
                throw new Error(data?.message || "Unable to analyze this bill.");
            }

            setExpense(data.expense);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
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

    return (
        <div className="expense-page">
            <div className="expense-page-heading">
                <div>
                    <div className="expense-eyebrow">Expenses</div>
                    <h1>Expense Entry</h1>
                    <p>Upload a bill and let MI ARCUS verify it before approval.</p>
                </div>
                <div className="expense-heading-badge">
                    <FaShieldAlt /> AI-assisted verification
                </div>
            </div>

            <div className="expense-process-card">
                {FLOW.map(({ label, icon: Icon }, index) => (
                    <div className="expense-process-item" key={label}>
                        <div className="expense-process-icon">
                            <Icon />
                        </div>
                        <span>{label}</span>
                        {index < FLOW.length - 1 && (
                            <div className="expense-process-connector" />
                        )}
                    </div>
                ))}
            </div>

            <div className="expense-flow-note">
                <div>
                    <strong>Bill verification chain</strong>
                    <span>
                        OCR → duplicate check → arithmetic/GST validation → AI/image analysis
                        → risk calculation → external verification → finance/manager review
                    </span>
                </div>
                <div className="expense-risk-legend">
                    <span className="low"><i /> Low Risk</span>
                    <span className="review"><i /> Review Required</span>
                    <span className="high"><i /> High Risk</span>
                </div>
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
                        onChange={(e) => setExpenseType(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Select a type</option>
                        {types.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    <div
                        className={`expense-dropzone ${file ? "has-file" : ""} ${dragging ? "dragging" : ""}`}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(event) => {
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                fileRef.current?.click();
                            }
                        }}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            hidden
                            onChange={(e) => handleFile(e.target.files)}
                        />
                        <FaCloudUploadAlt />
                        <strong>{file ? file.name : "Choose or drag a bill / invoice"}</strong>
                        <span>
                            {file
                                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                : "JPG, PNG, WEBP or PDF · Max 20 MB"}
                        </span>
                    </div>

                    {error && (
                        <div className="expense-error">
                            <FaTimesCircle /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="expense-primary-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="expense-spinner" />
                                Analyzing bill...
                            </>
                        ) : (
                            <><FaRobot /> Upload & Analyze</>
                        )}
                    </button>

                    {loading && (
                        <div className="expense-progress">
                            <div className="expense-progress-bar" />
                            <span>
                                Reading bill → extracting fields → validating → analyzing image → calculating risk
                            </span>
                        </div>
                    )}
                </form>

                <div className="expense-card expense-info-card">
                    <div className="expense-card-title">
                        <div className="expense-card-icon"><FaShieldAlt /></div>
                        <div>
                            <h2>What MI ARCUS checks</h2>
                            <p>Every uploaded bill follows the same control chain.</p>
                        </div>
                    </div>

                    <div className="expense-control-list">
                        <div>
                            <FaSearch />
                            <span><strong>OCR extraction</strong> Vendor, date, invoice number and amount.</span>
                        </div>
                        <div>
                            <FaCopy />
                            <span><strong>Duplicate detection</strong> Invoice number + vendor matching.</span>
                        </div>
                        <div>
                            <FaCalculator />
                            <span><strong>Arithmetic validation</strong> Items, subtotal, GST/tax and total consistency.</span>
                        </div>
                        <div>
                            <FaRobot />
                            <span><strong>AI / image analysis</strong> Manipulation, synthetic and visual inconsistency signals.</span>
                        </div>
                        <div>
                            <FaExternalLinkAlt />
                            <span><strong>External verification</strong> Optional configured verification gateway.</span>
                        </div>
                        <div>
                            <FaShieldAlt />
                            <span><strong>Risk calculation</strong> Low Risk, Review Required or High Risk.</span>
                        </div>
                    </div>
                </div>
            </div>

            {expense && (
                <div className="expense-result-card">
                    <div className="expense-result-header">
                        <div>
                            <div className="expense-eyebrow">Verification Complete</div>
                            <h2>Bill analysis result</h2>
                            <p>Expense #{expense.id} is now available in Track Expenses.</p>
                        </div>
                        <span className={`expense-risk-pill ${riskClass(expense.risk_level)}`}>
                            {expense.risk_level}
                        </span>
                    </div>

                    <div className="expense-summary-grid">
                        <div><FaShieldAlt /><span>Vendor</span><strong>{expense.vendor_name || "Not detected"}</strong></div>
                        <div><FaFileInvoice /><span>Invoice #</span><strong>{expense.invoice_number || "Not detected"}</strong></div>
                        <div><FaCalendarAlt /><span>Date</span><strong>{expense.bill_date || "Not detected"}</strong></div>
                        <div><FaRupeeSign /><span>Total</span><strong>{formatMoney(expense.total_amount)}</strong></div>
                    </div>

                    <div className="expense-risk-banner">
                        <div className={`expense-risk-score ${riskClass(expense.risk_level)}`}>
                            {Number(expense.risk_score || 0)}
                        </div>
                        <div className="expense-risk-copy">
                            <strong>{expense.risk_level}</strong>
                            <span>
                                Risk score out of 100 · OCR confidence {Number(expense.ocr_confidence || 0)}%
                            </span>
                        </div>
                        <div className="expense-risk-meter">
                            <span style={{ width: `${Math.min(100, Math.max(0, Number(expense.risk_score || 0)))}%` }} />
                        </div>
                    </div>

                    <div className="expense-result-checks">
                        {(expense.checks || []).map((check) => (
                            <div className="expense-result-check" key={check.id || check.check_type}>
                                <strong>{check.check_type}</strong>
                                <CheckBadge status={check.check_status} />
                            </div>
                        ))}
                    </div>

                    <div className="expense-result-actions">
                        <button
                            className="expense-secondary-btn"
                            onClick={() => setDetailsId(expense.id)}
                        >
                            <FaShieldAlt /> View full verification
                        </button>
                        <button
                            className="expense-secondary-btn"
                            onClick={reset}
                        >
                            <FaCloudUploadAlt /> Upload another bill
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

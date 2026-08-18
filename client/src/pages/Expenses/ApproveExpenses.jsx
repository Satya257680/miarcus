import { useEffect, useMemo, useState } from "react";
import axios from "./expenseApi";
import {
    FaCheck,
    FaTimes,
    FaEye,
    FaShieldAlt,
    FaSearch,
    FaExclamationTriangle
} from "react-icons/fa";
import ExpenseDetails from "./ExpensesDetails";
import "../../styles/pages/Expenses.css";

function riskClass(value) {
    return String(value || "Review Required")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function ApproveExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");
    const [detailsId, setDetailsId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        try {
            setLoading(true);
            setError("");

            const { data } = await axios.get("/api/expenses/review-queue");
            const rows = (data.expenses || [])
                .filter((item) =>
                    ["Pending", "Review Required"].includes(item.status)
                )
                .sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );

            setExpenses(rows);
            setSelected([]);
        } catch (err) {
            console.error("Approve expenses error:", err);
            setError(err.response?.data?.message || "Unable to load review queue.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return expenses;

        return expenses.filter((item) =>
            [
                item.submitted_by_name,
                item.submitted_by_employee_id,
                item.invoice_number,
                item.vendor_name,
                item.expense_type
            ].some((value) =>
                String(value || "").toLowerCase().includes(q)
            )
        );
    }, [expenses, search]);

    const toggle = (id) => {
        setSelected((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    };

    const toggleAll = () => {
        const ids = filtered.map((item) => item.id);
        const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));

        setSelected((current) =>
            allSelected
                ? current.filter((id) => !ids.includes(id))
                : [...new Set([...current, ...ids])]
        );
    };

    const reviewSelected = async (status) => {
        if (!selected.length || busy) return;

        let reason = "";

        if (status === "Rejected") {
            reason = window.prompt("Enter rejection reason:") || "";
            if (!reason.trim()) return;
        }

        try {
            setBusy(true);
            setError("");

            await Promise.all(
                selected.map((id) =>
                    axios.patch(`/api/expenses/${id}/review`, {
                        status,
                        reason: reason.trim() || null
                    })
                )
            );

            await load();
        } catch (err) {
            console.error("Expense review error:", err);
            setError(
                err.response?.data?.message ||
                "Unable to update selected expenses."
            );
        } finally {
            setBusy(false);
        }
    };

    const highRisk = filtered.filter((item) => item.risk_level === "High Risk").length;
    const reviewRisk = filtered.filter((item) => item.risk_level === "Review Required").length;

    return (
        <div className="expense-page">
            <div className="expense-page-heading">
                <div>
                    <div className="expense-eyebrow">Expenses</div>
                    <h1>Approve Expenses</h1>
                    <p>Review verified bills before finance or manager approval.</p>
                </div>
                <div className="expense-heading-badge">
                    <FaShieldAlt /> Finance review queue
                </div>
            </div>

            <div className="expense-review-alerts">
                <div className="expense-review-alert warning">
                    <FaExclamationTriangle />
                    <span><strong>{reviewRisk}</strong> bills need review.</span>
                </div>
                <div className="expense-review-alert danger">
                    <FaShieldAlt />
                    <span><strong>{highRisk}</strong> bills are high risk.</span>
                </div>
            </div>

            <div className="expense-card expense-approval-toolbar">
                <div className="expense-search">
                    <FaSearch />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, ID, invoice or vendor..."
                    />
                </div>

                <div className="expense-bulk-actions">
                    <button
                        className="expense-approve-btn"
                        disabled={!selected.length || busy}
                        onClick={() => reviewSelected("Approved")}
                    >
                        <FaCheck /> {busy ? "Updating..." : "Approve Selected"}
                    </button>
                    <button
                        className="expense-reject-btn"
                        disabled={!selected.length || busy}
                        onClick={() => reviewSelected("Rejected")}
                    >
                        <FaTimes /> Reject Selected
                    </button>
                </div>
            </div>

            {error && <div className="expense-error page-error">{error}</div>}

            <div className="expense-card expense-table-card">
                <div className="expense-table-header">
                    <div>
                        <h2>Finance / Manager Queue</h2>
                        <p>Select one or more bills and approve or reject them.</p>
                    </div>
                    <span className="expense-selection-count">
                        {selected.length} selected
                    </span>
                </div>

                <div className="expense-table-wrap">
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={
                                            filtered.length > 0 &&
                                            filtered.every((item) => selected.includes(item.id))
                                        }
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th>Employee</th>
                                <th>Date</th>
                                <th>Invoice #</th>
                                <th>Vendor</th>
                                <th>Amount</th>
                                <th>Risk</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="expense-table-empty">Loading review queue...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="8" className="expense-table-empty">No expenses are waiting for review.</td></tr>
                            ) : filtered.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(item.id)}
                                            onChange={() => toggle(item.id)}
                                        />
                                    </td>
                                    <td>
                                        <strong>{item.submitted_by_name || "Unknown User"}</strong>
                                        <small>{item.submitted_by_employee_id || "—"}</small>
                                    </td>
                                    <td>{item.bill_date || "—"}</td>
                                    <td>{item.invoice_number || "—"}</td>
                                    <td>{item.vendor_name || "Not detected"}</td>
                                    <td><strong>₹{Number(item.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></td>
                                    <td>
                                        <span className={`expense-mini-risk ${riskClass(item.risk_level)}`}>
                                            <FaShieldAlt /> {item.risk_level || "Review Required"}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="expense-view-btn" onClick={() => setDetailsId(item.id)}>
                                            <FaEye /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="expense-table-footer">
                    <span>Awaiting review: <strong>{filtered.length}</strong></span>
                    <span>Selected: <strong>{selected.length}</strong></span>
                </div>
            </div>

            {detailsId && (
                <ExpenseDetails
                    id={detailsId}
                    onClose={() => setDetailsId(null)}
                />
            )}
        </div>
    );
}

export default ApproveExpenses;


import { useEffect, useMemo, useState } from "react";
import axios from "../../axiosConfig";
import {
    FaCheck,
    FaTimes,
    FaEye,
    FaShieldAlt,
    FaSearch
} from "react-icons/fa";
import ExpenseDetails from "./ExpensesDetails";
import "../../styles/pages/Expenses.css";

function ApproveExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState("");
    const [detailsId, setDetailsId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);

        Promise.all([
            axios.get("/api/expenses?status=Pending"),
            axios.get("/api/expenses?status=Review%20Required")
        ])
            .then(([pending, review]) => {
                const rows = [
                    ...(pending.data.expenses || []),
                    ...(review.data.expenses || [])
                ].sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );
                setExpenses(rows);
            })
            .catch(error => console.error("Approve expenses error:", error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return expenses;

        return expenses.filter(item =>
            [
                item.submitted_by_name,
                item.submitted_by_employee_id,
                item.invoice_number,
                item.vendor_name,
                item.expense_type
            ].some(value => String(value || "").toLowerCase().includes(q))
        );
    }, [expenses, search]);

    const toggle = id => {
        setSelected(current =>
            current.includes(id)
                ? current.filter(item => item !== id)
                : [...current, id]
        );
    };

    const toggleAll = () => {
        const ids = filtered.map(item => item.id);
        setSelected(current => current.length === ids.length ? [] : ids);
    };

    const reviewSelected = async status => {
        if (!selected.length) return;

        let reason = "";
        if (status === "Rejected") {
            reason = window.prompt("Enter rejection reason:") || "";
            if (!reason.trim()) return;
        }

        try {
            setBusy(true);
            await Promise.all(
                selected.map(id =>
                    axios.patch(`/api/expenses/${id}/review`, {
                        status,
                        reason
                    })
                )
            );

            setSelected([]);
            load();
        } catch (error) {
            alert(error.response?.data?.message || "Unable to update selected expenses.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="expense-page">
            <div className="expense-page-heading">
                <div>
                    <div className="expense-eyebrow">Expenses</div>
                    <h1>Approve Expenses</h1>
                    <p>Review low-risk and flagged bills before finance/manager approval.</p>
                </div>
                <div className="expense-heading-badge"><FaShieldAlt /> Finance review queue</div>
            </div>

            <div className="expense-card expense-approval-toolbar">
                <div className="expense-search">
                    <FaSearch />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, ID, invoice or vendor..."
                    />
                </div>

                <div className="expense-bulk-actions">
                    <button
                        className="expense-approve-btn"
                        disabled={!selected.length || busy}
                        onClick={() => reviewSelected("Approved")}
                    >
                        <FaCheck /> Approve Selected
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

            <div className="expense-card expense-table-card">
                <div className="expense-table-wrap">
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} /></th>
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
                            ) : filtered.map(item => (
                                <tr key={item.id}>
                                    <td><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></td>
                                    <td>{item.submitted_by_name}<small>{item.submitted_by_employee_id}</small></td>
                                    <td>{item.bill_date || "—"}</td>
                                    <td>{item.invoice_number || "—"}</td>
                                    <td>{item.vendor_name || "Not detected"}</td>
                                    <td>₹{Number(item.total_amount || 0).toFixed(2)}</td>
                                    <td>
                                        <span className={`expense-mini-risk ${String(item.risk_level || "").toLowerCase().replace(/\s+/g, "-")}`}>
                                            <FaShieldAlt /> {item.risk_level}
                                        </span>
                                    </td>
                                    <td><button className="expense-view-btn" onClick={() => setDetailsId(item.id)}><FaEye /> View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="expense-table-footer">
                    <span>Total awaiting review: <strong>{filtered.length}</strong></span>
                    <span>Selected: <strong>{selected.length}</strong></span>
                </div>
            </div>

            {detailsId && <ExpenseDetails id={detailsId} onClose={() => setDetailsId(null)} />}
        </div>
    );
}

export default ApproveExpenses;

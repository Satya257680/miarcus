import { useEffect, useMemo, useState } from "react";
import axios from "./expenseApi";
import {
    FaSearch,
    FaFileExport,
    FaEye,
    FaShieldAlt,
    FaFilter,
    FaReceipt,
    FaClock,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimesCircle,
    FaTrash
} from "react-icons/fa";
import ExpenseDetails from "./ExpensesDetails";
import "../../styles/pages/Expenses.css";

const statusClass = (value) =>
    String(value || "").toLowerCase().replace(/\s+/g, "-");

const riskClass = (value) =>
    String(value || "Review Required").toLowerCase().replace(/\s+/g, "-");

const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

function hasFullExpenseAccess() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const raw = JSON.parse(localStorage.getItem("permissions") || "{}");

        // Administrator is always FULL access in Miarcus.
        if (user?.administrator === true || user?.administrator === 1 || user?.administrator === "1" ||
            user?.is_admin === true || user?.is_admin === 1 || user?.is_admin === "1") {
            return true;
        }

        // Supported permission formats used by Miarcus:
        // 1. { Expenses: "Full" }
        // 2. { "Expenses": { permission: "Full" } }
        // 3. [{ module_name: "Expenses", permission: "Full" }]
        // 4. [{ moduleName: "Expenses", permission: "Full" }]
        if (raw && !Array.isArray(raw)) {
            if (raw.Expenses === "Full") return true;
            if (raw.Expenses?.permission === "Full") return true;
            if (raw.permissions?.Expenses === "Full") return true;
            if (raw.permissions?.Expenses?.permission === "Full") return true;
        }

        if (Array.isArray(raw)) {
            return raw.some((item) => {
                const moduleName = item?.module_name || item?.moduleName || item?.module;
                const permission = item?.permission || item?.access || item?.level;
                return String(moduleName || "").toLowerCase() === "expenses" &&
                    String(permission || "").toLowerCase() === "full";
            });
        }

        return false;
    } catch {
        return false;
    }
}

function TrackExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [status, setStatus] = useState("");
    const [type, setType] = useState("");
    const [risk, setRisk] = useState("");
    const [search, setSearch] = useState("");
    const [types, setTypes] = useState([]);
    const [detailsId, setDetailsId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingAll, setDeletingAll] = useState(false);
    const canDelete = hasFullExpenseAccess();

    const load = async () => {
        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();
            if (status) params.set("status", status);
            if (type) params.set("type", type);
            if (search.trim()) params.set("search", search.trim());

            const { data } = await axios.get(`/api/expenses?${params.toString()}`);
            setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        } catch (err) {
            console.error("Expense list error:", err);
            setError(err.response?.data?.message || "Unable to load expenses.");
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        axios.get("/api/expenses/types")
            .then(({ data }) => setTypes(Array.isArray(data.types) ? data.types : []))
            .catch(() => setTypes([]));
    }, []);

    useEffect(() => {
        const timer = setTimeout(load, 250);
        return () => clearTimeout(timer);
    }, [status, type, search]);

    const visible = useMemo(() => {
        if (!risk) return expenses;
        return expenses.filter((item) => item.risk_level === risk);
    }, [expenses, risk]);

    const summary = useMemo(() => expenses.reduce((acc, item) => {
        acc.count += 1;
        acc.amount += Number(item.total_amount || 0);
        if (item.status === "Pending") acc.pending += 1;
        if (item.status === "Review Required") acc.review += 1;
        if (item.status === "Approved") acc.approved += 1;
        if (item.status === "Rejected") acc.rejected += 1;
        return acc;
    }, { count: 0, amount: 0, pending: 0, review: 0, approved: 0, rejected: 0 }), [expenses]);

    const clearFilters = () => {
        setSearch("");
        setStatus("");
        setRisk("");
        setType("");
    };

    const deleteOne = async (item) => {
        if (!canDelete || !item?.id) return;

        const confirmed = window.confirm(
            `Delete Expense #${item.id}? This will permanently remove the expense, checks, items and uploaded bill.

This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            setError("");
            await axios.delete(`/api/expenses/${item.id}`);
            setExpenses((current) => current.filter((expense) => expense.id !== item.id));
            if (detailsId === item.id) setDetailsId(null);
        } catch (err) {
            console.error("Delete expense error:", err);
            setError(err.response?.data?.message || "Unable to delete this expense.");
        }
    };

    const deleteAll = async () => {
        if (!canDelete || deletingAll) return;

        const confirmed = window.confirm(
            `Delete ALL ${expenses.length} expense record(s)? This will also remove their checks, items and uploaded bill files. This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            setDeletingAll(true);
            setError("");
            await axios.delete("/api/expenses/delete-all");
            setDetailsId(null);
            await load();
        } catch (err) {
            console.error("Delete all expenses error:", err);
            setError(err.response?.data?.message || "Unable to delete all expenses.");
        } finally {
            setDeletingAll(false);
        }
    };

    const exportCsv = () => {
        const headers = [
            "Date", "Submitted By", "Employee ID", "Type", "Store",
            "Invoice #", "Vendor", "Amount", "Risk", "Risk Score", "Status"
        ];

        const rows = visible.map((item) => [
            item.bill_date || "",
            item.submitted_by_name || "",
            item.submitted_by_employee_id || "",
            item.expense_type || "",
            item.store_name || "",
            item.invoice_number || "",
            item.vendor_name || "",
            item.total_amount || 0,
            item.risk_level || "",
            item.risk_score || 0,
            item.status || ""
        ]);

        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `miarcus-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="expense-page">
            <div className="expense-page-heading">
                <div>
                    <div className="expense-eyebrow">Expenses</div>
                    <h1>Track Expenses</h1>
                    <p>Monitor submitted bills, verification results, risk and review status.</p>
                </div>
                <button className="expense-heading-action" onClick={load} disabled={loading}>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            <div className="expense-stat-grid">
                <div className="expense-stat-card"><div className="expense-stat-icon blue"><FaReceipt /></div><div><span>Total bills</span><strong>{summary.count}</strong></div></div>
                <div className="expense-stat-card"><div className="expense-stat-icon amber"><FaClock /></div><div><span>Pending</span><strong>{summary.pending}</strong></div></div>
                <div className="expense-stat-card"><div className="expense-stat-icon orange"><FaExclamationTriangle /></div><div><span>Review required</span><strong>{summary.review}</strong></div></div>
                <div className="expense-stat-card"><div className="expense-stat-icon green"><FaCheckCircle /></div><div><span>Approved</span><strong>{summary.approved}</strong></div></div>
                <div className="expense-stat-card amount"><div className="expense-stat-icon purple"><FaShieldAlt /></div><div><span>Total value</span><strong>{money(summary.amount)}</strong></div></div>
            </div>

            <div className="expense-card expense-filter-card">
                <div className="expense-filter-title"><FaFilter /> Filters</div>
                <div className="expense-filters">
                    <div className="expense-search">
                        <FaSearch />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, invoice, employee..." />
                    </div>
                    <select className="expense-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Review Required">Review Required</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <select className="expense-input" value={risk} onChange={(e) => setRisk(e.target.value)}>
                        <option value="">All risk levels</option>
                        <option value="Low Risk">Low Risk</option>
                        <option value="Review Required">Review Required</option>
                        <option value="High Risk">High Risk</option>
                    </select>
                    <select className="expense-input" value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="">All types</option>
                        {types.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <button className="expense-clear-btn" onClick={clearFilters}><FaTimesCircle /> Clear Filters</button>
                    <button className="expense-outline-btn" onClick={exportCsv}><FaFileExport /> Export CSV</button>
                </div>
            </div>

            {error && <div className="expense-error page-error"><FaTimesCircle /> {error}</div>}

            <div className="expense-card expense-table-card">
                <div className="expense-table-header">
                    <div>
                        <h2>Expense Register</h2>
                        <p>{visible.length} records match the current filters.</p>
                    </div>
                    <div className="expense-table-header-actions">
                        <span className="expense-table-total">{money(visible.reduce((sum, item) => sum + Number(item.total_amount || 0), 0))}</span>
                        {canDelete && (
                            <button className="expense-delete-all-btn" onClick={deleteAll} disabled={deletingAll}>
                                <FaTrash /> {deletingAll ? "Deleting..." : "Delete All"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="expense-table-wrap">
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Submitted By</th>
                                <th>Type</th>
                                <th>Store</th>
                                <th>Invoice #</th>
                                <th>Vendor</th>
                                <th>Amount</th>
                                <th>Risk</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="10" className="expense-table-empty">Loading expenses...</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan="10" className="expense-table-empty">No expenses found.</td></tr>
                            ) : visible.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.bill_date || "—"}</td>
                                    <td><strong>{item.submitted_by_name || "Unknown User"}</strong><small>{item.submitted_by_employee_id || "—"}</small></td>
                                    <td>{item.expense_type || "—"}</td>
                                    <td><strong>{item.store_name || "—"}</strong><small>{item.store_code || ""}</small></td>
                                    <td>{item.invoice_number || "—"}</td>
                                    <td>{item.vendor_name || "Not detected"}</td>
                                    <td><strong>{money(item.total_amount)}</strong></td>
                                    <td><span className={`expense-mini-risk ${riskClass(item.risk_level)}`}><FaShieldAlt /> {item.risk_level || "Review Required"}</span></td>
                                    <td><span className={`expense-status-pill ${statusClass(item.status)}`}>{item.status || "Review Required"}</span></td>
                                    <td>
                                        <div className="expense-row-actions">
                                            <button className="expense-view-btn" onClick={() => setDetailsId(item.id)}>
                                                <FaEye /> View
                                            </button>
                                            {canDelete && (
                                                <button
                                                    className="expense-row-delete-btn"
                                                    onClick={() => deleteOne(item)}
                                                    title={`Delete Expense #${item.id}`}
                                                >
                                                    <FaTrash /> Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="expense-table-footer">
                    <span>Total: <strong>{visible.length}</strong> entries</span>
                    <span>Approved: <strong>{summary.approved}</strong></span>
                    <span>Rejected: <strong>{summary.rejected}</strong></span>
                </div>
            </div>

            {detailsId && (
                <ExpenseDetails
                    id={detailsId}
                    onClose={() => setDetailsId(null)}
                    onDeleted={async () => {
                        setDetailsId(null);
                        await load();
                    }}
                />
            )}
        </div>
    );
}

export default TrackExpenses;

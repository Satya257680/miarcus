
import { useEffect, useState } from "react";
import axios from "../../axiosConfig";
import {
    FaSearch,
    FaFileExport,
    FaEye,
    FaShieldAlt,
    FaFilter
} from "react-icons/fa";
import ExpenseDetails from "./ExpensesDetails";
import "../../styles/pages/Expenses.css";

function TrackExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [status, setStatus] = useState("");
    const [type, setType] = useState("");
    const [search, setSearch] = useState("");
    const [types, setTypes] = useState([]);
    const [detailsId, setDetailsId] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (type) params.set("type", type);
        if (search.trim()) params.set("search", search.trim());

        axios.get(`/api/expenses?${params.toString()}`)
            .then(({ data }) => setExpenses(data.expenses || []))
            .catch(error => console.error("Expense list error:", error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        axios.get("/api/expenses/types")
            .then(({ data }) => setTypes(data.types || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const timer = setTimeout(load, 250);
        return () => clearTimeout(timer);
    }, [status, type, search]);

    const exportCsv = () => {
        const headers = ["Date", "Submitted By", "Type", "Invoice #", "Vendor", "Amount", "Risk", "Status"];
        const rows = expenses.map(item => [
            item.bill_date || "",
            item.submitted_by_name || "",
            item.expense_type || "",
            item.invoice_number || "",
            item.vendor_name || "",
            item.total_amount || 0,
            item.risk_level || "",
            item.status || ""
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `miarcus-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="expense-page">
            <div className="expense-page-heading">
                <div>
                    <div className="expense-eyebrow">Expenses</div>
                    <h1>Track Expenses</h1>
                    <p>Monitor submitted bills, risk scores and review status.</p>
                </div>
            </div>

            <div className="expense-card expense-filter-card">
                <div className="expense-filter-title"><FaFilter /> Filters</div>
                <div className="expense-filters">
                    <div className="expense-search">
                        <FaSearch />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search vendor, invoice, employee..."
                        />
                    </div>
                    <select className="expense-input" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">Status...</option>
                        <option value="Pending">Pending</option>
                        <option value="Review Required">Review Required</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <select className="expense-input" value={type} onChange={e => setType(e.target.value)}>
                        <option value="">Type...</option>
                        {types.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <button className="expense-outline-btn" onClick={exportCsv}><FaFileExport /> Export CSV</button>
                </div>
            </div>

            <div className="expense-card expense-table-card">
                <div className="expense-table-wrap">
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Submitted By</th>
                                <th>Type</th>
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
                                <tr><td colSpan="9" className="expense-table-empty">Loading expenses...</td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan="9" className="expense-table-empty">No expenses found.</td></tr>
                            ) : expenses.map(item => (
                                <tr key={item.id}>
                                    <td>{item.bill_date || "—"}</td>
                                    <td>{item.submitted_by_name}<small>{item.submitted_by_employee_id}</small></td>
                                    <td>{item.expense_type || "Other"}</td>
                                    <td>{item.invoice_number || "—"}</td>
                                    <td>{item.vendor_name || "Not detected"}</td>
                                    <td>₹{Number(item.total_amount || 0).toFixed(2)}</td>
                                    <td>
                                        <span className={`expense-mini-risk ${String(item.risk_level || "").toLowerCase().replace(/\s+/g, "-")}`}>
                                            <FaShieldAlt /> {item.risk_level || "Review Required"}
                                        </span>
                                    </td>
                                    <td><span className={`expense-status-pill ${String(item.status).toLowerCase().replace(/\s+/g, "-")}`}>{item.status}</span></td>
                                    <td><button className="expense-view-btn" onClick={() => setDetailsId(item.id)}><FaEye /> View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="expense-table-footer">
                    <span>Total: <strong>{expenses.length}</strong> entries</span>
                </div>
            </div>

            {detailsId && <ExpenseDetails id={detailsId} onClose={() => setDetailsId(null)} />}
        </div>
    );
}

export default TrackExpenses;

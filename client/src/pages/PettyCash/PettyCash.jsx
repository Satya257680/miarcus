import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
    FaWallet,
    FaArrowRight,
    FaMoneyBillWave,
    FaReceipt,
    FaUniversity,
    FaClipboardCheck,
    FaFilter,
    FaPlus,
    FaSearch,
    FaUpload,
    FaHistory,
    FaTimes,
    FaCheckCircle,
    FaExclamationCircle,
    FaUser,
    FaStore,
    FaCalendarAlt,
    FaFileInvoice,
    FaRupeeSign,
    FaUndo,
    FaArrowLeft,
    FaCalculator,
    FaDownload,
    FaTrash,
    FaBroom,
    FaEnvelope
} from "react-icons/fa";
import "./PettyCash.css";

const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

const today = () => new Date().toISOString().slice(0, 10);

function statusLabel(status) {
    return String(status || "OPEN")
        .replace("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClass(status) {
    return String(status || "OPEN").toLowerCase().replace("_", "-");
}

function getAccess() {
    let user = {};
    let permissions = {};
    try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch {}
    try { permissions = JSON.parse(localStorage.getItem("permissions") || "{}"); } catch {}

    const admin = user?.is_admin === true || user?.is_admin === 1 || user?.is_admin === "1" ||
        user?.administrator === true || user?.administrator === 1 || user?.administrator === "1";
    const level = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };
    const current = level[permissions?.["Petty Cash"] || permissions?.Expenses] || 0;
    const userId = Number(user?.id || user?.user_id || localStorage.getItem("userId") || 0);

    return {
        userId,
        admin,
        canAdd: admin || current >= level.Add,
        canEdit: admin || current >= level.Edit
    };
}


function Modal({ title, children, onClose }) {
    return (
        <div className="petty-modal-backdrop" onMouseDown={onClose}>
            <div className="petty-modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="petty-modal-header">
                    <div>
                        <span className="petty-eyebrow">Petty Cash</span>
                        <h2>{title}</h2>
                    </div>
                    <button className="petty-close" onClick={onClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function AdvanceForm({ options, onClose, onCreated }) {
    const [form, setForm] = useState({
        advance_no: "",
        store_id: "",
        paid_by: "",
        received_by: "",
        advance_amount: "",
        purpose: "",
        advance_date: today()
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

    const submit = async (e) => {
        e.preventDefault();
        setError("");

        if (Number(form.advance_amount) <= 0) {
            setError("Enter an advance amount greater than zero.");
            return;
        }

        try {
            setSaving(true);
            const { data } = await axios.post("/api/petty-cash", form);
            if (!data?.success) throw new Error(data?.message || "Unable to create advance.");
            onCreated(data.data.id);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Unable to create advance.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Create Petty Cash Advance" onClose={onClose}>
            <form className="petty-form" onSubmit={submit}>
                <div className="petty-form-grid">
                    <label>Advance No *
                        <input value={form.advance_no} onChange={(e) => update("advance_no", e.target.value)} placeholder="ADV-001" required />
                    </label>
                    <label>Store *
                        <select value={form.store_id} onChange={(e) => update("store_id", e.target.value)} required>
                            <option value="">Select store</option>
                            {options.stores.map((s) => <option key={s.id} value={s.id}>{s.store_name}{s.store_code ? ` (${s.store_code})` : ""}</option>)}
                        </select>
                    </label>
                    <label>Paid By (Manager) *
                        <select value={form.paid_by} onChange={(e) => update("paid_by", e.target.value)} required>
                            <option value="">Select giver</option>
                            {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.employee_id ? ` (${u.employee_id})` : ""}</option>)}
                        </select>
                    </label>
                    <label>Received By (Employee) *
                        <select value={form.received_by} onChange={(e) => update("received_by", e.target.value)} required>
                            <option value="">Select receiver</option>
                            {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.employee_id ? ` (${u.employee_id})` : ""}</option>)}
                        </select>
                    </label>
                    <label>Advance Amount *
                        <div className="petty-input-icon"><FaRupeeSign /><input type="number" min="0.01" step="0.01" value={form.advance_amount} onChange={(e) => update("advance_amount", e.target.value)} required /></div>
                    </label>
                    <label>Advance Date *
                        <input type="date" value={form.advance_date} onChange={(e) => update("advance_date", e.target.value)} required />
                    </label>
                    <label className="petty-field-full">Purpose
                        <textarea value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="Store maintenance, local purchase, travel advance..." rows="3" />
                    </label>
                </div>
                {error && <div className="petty-error"><FaExclamationCircle /> {error}</div>}
                <div className="petty-modal-actions">
                    <button type="button" className="petty-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="petty-btn primary" disabled={saving}>
                        {saving ? "Creating..." : <><FaPlus /> Create Advance</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function AddExpenseForm({ id, onClose, onSaved }) {
    const [form, setForm] = useState({ expense_type: "Stationery", description: "", amount: "", expense_date: today() });
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (Number(form.amount) <= 0) return setError("Enter a valid expense amount.");

        try {
            setSaving(true);
            const data = new FormData();
            Object.entries(form).forEach(([key, value]) => data.append(key, value));
            if (file) data.append("bill", file);
            const response = await axios.post(`/api/petty-cash/${id}/expenses`, data);
            if (!response.data?.success) throw new Error(response.data?.message || "Unable to add expense.");
            onSaved();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Unable to add expense.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Add Expense With Bill" onClose={onClose}>
            <form className="petty-form" onSubmit={submit}>
                <div className="petty-form-grid">
                    <label>Expense Type *
                        <select value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value })}>
                            {["Stationery", "Maintenance", "Travel", "Food", "Utilities", "Office Supplies", "Other"].map((x) => <option key={x}>{x}</option>)}
                        </select>
                    </label>
                    <label>Amount *
                        <div className="petty-input-icon"><FaRupeeSign /><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                    </label>
                    <label className="petty-field-full">Description
                        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Office files, pen, paper..." />
                    </label>
                    <label>Expense Date *
                        <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
                    </label>
                    <label>Bill / Receipt
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                </div>
                {error && <div className="petty-error"><FaExclamationCircle /> {error}</div>}
                <div className="petty-modal-actions">
                    <button type="button" className="petty-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="petty-btn primary" disabled={saving}>{saving ? "Saving..." : <><FaReceipt /> Save Expense</>}</button>
                </div>
            </form>
        </Modal>
    );
}

function AddDepositForm({ id, options, onClose, onSaved }) {
    const [form, setForm] = useState({ amount: "", deposited_by: "", received_by: "", deposit_date: today(), reference_no: "" });
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (Number(form.amount) <= 0) return setError("Enter a valid deposit amount.");
        try {
            setSaving(true);
            const data = new FormData();
            Object.entries(form).forEach(([key, value]) => data.append(key, value));
            if (file) data.append("receipt", file);
            const response = await axios.post(`/api/petty-cash/${id}/deposits`, data);
            if (!response.data?.success) throw new Error(response.data?.message || "Unable to record deposit.");
            onSaved();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Unable to record deposit.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Deposit Unused Cash" onClose={onClose}>
            <form className="petty-form" onSubmit={submit}>
                <div className="petty-form-grid">
                    <label>Deposited Amount *
                        <div className="petty-input-icon"><FaRupeeSign /><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                    </label>
                    <label>Deposited By *
                        <select value={form.deposited_by} onChange={(e) => setForm({ ...form, deposited_by: e.target.value })} required>
                            <option value="">Select employee</option>
                            {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </label>
                    <label>Received By *
                        <select value={form.received_by} onChange={(e) => setForm({ ...form, received_by: e.target.value })} required>
                            <option value="">Select manager</option>
                            {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </label>
                    <label>Deposit Date *
                        <input type="date" value={form.deposit_date} onChange={(e) => setForm({ ...form, deposit_date: e.target.value })} required />
                    </label>
                    <label>Reference No.
                        <input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} placeholder="DEP-001" />
                    </label>
                    <label>Deposit Receipt
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                </div>
                {error && <div className="petty-error"><FaExclamationCircle /> {error}</div>}
                <div className="petty-modal-actions">
                    <button type="button" className="petty-btn secondary" onClick={onClose}>Cancel</button>
                    <button className="petty-btn primary" disabled={saving}>{saving ? "Saving..." : <><FaUniversity /> Record Deposit</>}</button>
                </div>
            </form>
        </Modal>
    );
}

function PettyCash() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [advances, setAdvances] = useState([]);
    const [summary, setSummary] = useState({});
    const [options, setOptions] = useState({ stores: [], users: [] });
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [store, setStore] = useState("");
    const [viewMode, setViewMode] = useState("ALL");
    const [modal, setModal] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [audit, setAudit] = useState([]);
    const [showAudit, setShowAudit] = useState(false);
    const access = getAccess();

    const loadDashboard = async (override = null) => {
        const filters = override || { search, store, status, viewMode };
        try {
            setLoading(true);
            setError("");
            const [listResponse, summaryResponse, optionsResponse] = await Promise.all([
                axios.get("/api/petty-cash", { params: {
                    search: filters.search || undefined,
                    status: filters.status || undefined,
                    store_id: filters.store || undefined,
                    paid_by: filters.viewMode === "GIVEN_BY_ME" ? access.userId : undefined,
                    received_by: filters.viewMode === "RECEIVED_BY_ME" ? access.userId : undefined
                } }),
                axios.get("/api/petty-cash/summary"),
                axios.get("/api/petty-cash/options")
            ]);
            setAdvances(listResponse.data?.data || []);
            setSummary(summaryResponse.data?.data?.summary || {});
            setOptions(optionsResponse.data?.data || { stores: [], users: [] });
        } catch (err) {
            console.error("Petty Cash load error:", err);
            setError(err.response?.data?.message || "Unable to load petty cash.");
        } finally {
            setLoading(false);
        }
    };

    const loadDetail = async (advanceId = id) => {
        if (!advanceId) return;
        try {
            setLoading(true);
            const response = await axios.get(`/api/petty-cash/${advanceId}`);
            setDetail(response.data?.data || null);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load advance details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadDetail(id);
            axios.get("/api/petty-cash/options").then((response) => setOptions(response.data?.data || { stores: [], users: [] })).catch(() => {});
        } else {
            loadDashboard();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const visibleAdvances = useMemo(() => advances, [advances]);

    const refreshDetail = async () => {
        await loadDetail(id);
    };

    const createAdvance = async (advanceId) => {
        setModal("");
        navigate(`/petty-cash/${advanceId}`);
    };

    const settle = async () => {
        if (!detail) return;
        if (!window.confirm(`Settle ${detail.advance_no}? Expense + deposit must equal ${money(detail.advance_amount)}.`)) return;
        try {
            await axios.post(`/api/petty-cash/${detail.id}/settle`);
            await refreshDetail();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to settle this advance.");
        }
    };

    const openAudit = async () => {
        if (!detail) return;
        try {
            const response = await axios.get(`/api/petty-cash/audit/${detail.id}`);
            setAudit(response.data?.data || []);
            setShowAudit(true);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load audit history.");
        }
    };

    const cancelAdvance = async () => {
        if (!detail) return;
        if (!window.confirm(`Cancel ${detail.advance_no}?`)) return;
        try {
            await axios.patch(`/api/petty-cash/${detail.id}/cancel`);
            await refreshDetail();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to cancel this advance.");
        }
    };

    const deleteAdvance = async () => {
        if (!detail) return;
        if (!window.confirm(`Delete ${detail.advance_no}? The record will be marked CANCELLED and preserved in the audit trail.`)) return;
        try {
            await axios.delete(`/api/petty-cash/${detail.id}`);
            navigate("/petty-cash");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to delete this advance.");
        }
    };

    if (id) {
        if (loading && !detail) {
            return <div className="petty-page"><div className="petty-loading">Loading advance...</div></div>;
        }

        if (!detail) {
            return <div className="petty-page"><div className="petty-empty">Advance not found.</div></div>;
        }

        const balance = Number(detail.balance || 0);
        const settled = detail.status === "SETTLED";
        const isGiver = access.admin || Number(detail.paid_by) === access.userId;
        const isReceiver = access.admin || Number(detail.received_by) === access.userId;
        const canSettle = !settled && detail.status !== "CANCELLED" && access.canEdit && isGiver;
        const canDelete = !settled && detail.status !== "CANCELLED" && access.canEdit && isGiver;

        return (
            <div className="petty-page">
                <div className="petty-detail-header">
                    <button className="petty-back-btn" onClick={() => navigate("/petty-cash")}><FaArrowLeft /></button>
                    <div>
                        <span className="petty-eyebrow">Petty Cash Advance</span>
                        <h1>{detail.advance_no}</h1>
                        <p>{detail.store_name || "-"} · {detail.advance_date}</p>
                    </div>
                    <div className="petty-header-actions">
                        <span className={`petty-status ${statusClass(detail.status)}`}>{statusLabel(detail.status)}</span>
                        {!settled && detail.status !== "CANCELLED" && (
                            <>
                                {isReceiver && access.canEdit && <button className="petty-btn secondary" onClick={() => setModal("expense")}><FaPlus /> Add Expense</button>}
                                {isReceiver && access.canEdit && <button className="petty-btn secondary" onClick={() => setModal("deposit")}><FaUndo /> Deposit Cash</button>}
                                {canSettle && <button className="petty-btn primary" onClick={settle}><FaClipboardCheck /> Settle</button>}
                                {canDelete && <button className="petty-btn danger" onClick={deleteAdvance}><FaTrash /> Delete</button>}
                            </>
                        )}
                    </div>
                </div>

                {error && <div className="petty-error global"><FaExclamationCircle /> {error}</div>}

                <div className="petty-flow">
                    <div className="petty-flow-card advance">
                        <div className="petty-flow-icon"><FaMoneyBillWave /></div>
                        <span>1. ADVANCE GIVEN</span>
                        <strong>{money(detail.advance_amount)}</strong>
                        <small>{detail.paid_by_name || "-"} → {detail.received_by_name || "-"}</small>
                        <div className="petty-flow-meta"><b>Paid By</b><span>{detail.paid_by_name || "-"}</span><b>Received By</b><span>{detail.received_by_name || "-"}</span></div>
                    </div>
                    <FaArrowRight className="petty-flow-arrow" />
                    <div className="petty-flow-card expense">
                        <div className="petty-flow-icon"><FaReceipt /></div>
                        <span>2. EXPENSES (WITH BILLS)</span>
                        <strong>{money(detail.total_expense)}</strong>
                        <small>Actual expense recorded</small>
                        <div className="petty-flow-meta"><b>Items</b><span>{detail.expenses.length}</span><b>Control</b><span>Bills / receipts</span></div>
                    </div>
                    <FaArrowRight className="petty-flow-arrow" />
                    <div className="petty-flow-card deposit">
                        <div className="petty-flow-icon"><FaUniversity /></div>
                        <span>3. DEPOSIT UNUSED CASH</span>
                        <strong>{money(detail.total_deposit)}</strong>
                        <small>Cash returned to manager</small>
                        <div className="petty-flow-meta"><b>Deposits</b><span>{detail.deposits.length}</span><b>Remaining</b><span>{money(balance)}</span></div>
                    </div>
                    <FaArrowRight className="petty-flow-arrow" />
                    <div className="petty-flow-card settlement">
                        <div className="petty-flow-icon"><FaClipboardCheck /></div>
                        <span>4. SETTLEMENT</span>
                        <strong>{settled ? "SETTLED" : "OPEN"}</strong>
                        <small>{detail.settlement?.settled_at ? new Date(detail.settlement.settled_at).toLocaleString() : "Awaiting final settlement"}</small>
                    </div>
                </div>

                <div className="petty-summary-calculation">
                    <div><span>Advance Given</span><strong>{money(detail.advance_amount)}</strong></div>
                    <div><span>Total Expense</span><strong className="negative">- {money(detail.total_expense)}</strong></div>
                    <div><span>Cash To Return</span><strong className={balance === 0 ? "positive" : "warning"}>{money(Math.max(0, balance))}</strong></div>
                    <div className="petty-calculation-note">
                        Expense ({money(detail.total_expense)}) + Deposit ({money(detail.total_deposit)}) = {money(Number(detail.total_expense) + Number(detail.total_deposit))}
                    </div>
                    <div className={`petty-final-status ${settled ? "settled" : ""}`}>Status: {statusLabel(detail.status)}</div>
                </div>

                <div className="petty-detail-grid">
                    <section className="petty-card">
                        <div className="petty-card-title"><FaFileInvoice /><div><h2>ADVANCE DETAILS</h2><p>Original cash movement</p></div></div>
                        <div className="petty-definition-list">
                            <div><span>Advance No.</span><strong>{detail.advance_no}</strong></div>
                            <div><span>Store</span><strong>{detail.store_name || "-"}</strong></div>
                            <div><span>Paid By (Giver)</span><strong>{detail.paid_by_name || "-"}</strong></div>
                            <div><span>Received By (Receiver)</span><strong>{detail.received_by_name || "-"}</strong></div>
                            <div><span>Advance Amount</span><strong>{money(detail.advance_amount)}</strong></div>
                            <div><span>Purpose</span><strong>{detail.purpose || "-"}</strong></div>
                            <div><span>Advance Date</span><strong>{detail.advance_date}</strong></div>
                            <div><span>Status</span><span className={`petty-status ${statusClass(detail.status)}`}>{statusLabel(detail.status)}</span></div>
                        </div>
                    </section>

                    <section className="petty-card wide">
                        <div className="petty-card-title"><FaReceipt /><div><h2>EXPENSES (PART 1)</h2><p>Actual purchases backed by bills</p></div></div>
                        <div className="petty-table-wrap">
                            <table className="petty-table">
                                <thead><tr><th>#</th><th>Expense Type</th><th>Description</th><th>Amount (₹)</th><th>Bill / Receipt</th><th>Date</th><th>Entered By</th></tr></thead>
                                <tbody>
                                    {detail.expenses.length ? detail.expenses.map((e, index) => (
                                        <tr key={e.id}><td>{index + 1}</td><td>{e.expense_type}</td><td>{e.description || "-"}</td><td className="amount">{money(e.amount)}</td><td>{e.bill_path ? <a href={`${axios.defaults.baseURL || ""}${e.bill_path}`} target="_blank" rel="noreferrer"><FaFileInvoice /> {e.bill_filename || "View"}</a> : "—"}</td><td>{e.expense_date}</td><td>{e.entered_by_name || "-"}</td></tr>
                                    )) : <tr><td colSpan="7" className="empty-cell">No expenses recorded yet.</td></tr>}
                                </tbody>
                                <tfoot><tr><td colSpan="3">TOTAL EXPENSE</td><td className="amount">{money(detail.total_expense)}</td><td colSpan="3"></td></tr></tfoot>
                            </table>
                        </div>
                    </section>

                    <section className="petty-card wide">
                        <div className="petty-card-title"><FaUniversity /><div><h2>DEPOSIT (PART 2)</h2><p>Unused cash returned</p></div></div>
                        <div className="petty-table-wrap">
                            <table className="petty-table">
                                <thead><tr><th>#</th><th>Deposited Amount (₹)</th><th>Deposited By</th><th>Received By</th><th>Deposit Date</th><th>Reference No.</th></tr></thead>
                                <tbody>
                                    {detail.deposits.length ? detail.deposits.map((d, index) => (
                                        <tr key={d.id}><td>{index + 1}</td><td className="amount">{money(d.amount)}</td><td>{d.deposited_by_name || "-"}</td><td>{d.received_by_name || "-"}</td><td>{d.deposit_date}</td><td>{d.reference_no || "—"}</td></tr>
                                    )) : <tr><td colSpan="6" className="empty-cell">No cash deposit recorded yet.</td></tr>}
                                </tbody>
                                <tfoot><tr><td>TOTAL DEPOSIT</td><td className="amount">{money(detail.total_deposit)}</td><td colSpan="4"></td></tr></tfoot>
                            </table>
                        </div>
                    </section>

                    <section className="petty-card">
                        <div className="petty-card-title"><FaCalculator /><div><h2>SETTLEMENT OVERVIEW</h2><p>Final reconciliation</p></div></div>
                        <div className="petty-settlement-box">
                            <div><span>Advance Amount</span><strong>{money(detail.advance_amount)}</strong></div>
                            <div><span>Total Expense</span><strong>{money(detail.total_expense)}</strong></div>
                            <div><span>Total Deposit</span><strong>{money(detail.total_deposit)}</strong></div>
                            <div><span>Balance</span><strong className={balance === 0 ? "positive" : "warning"}>{money(balance)}</strong></div>
                            <div><span>Status</span><strong>{statusLabel(detail.status)}</strong></div>
                        </div>
                    </section>

                    <section className="petty-card">
                        <div className="petty-card-title"><FaUser /><div><h2>WHO PAID / WHO RECEIVED</h2><p>Accountability</p></div></div>
                        <div className="petty-people">
                            <div><FaUser /><span>Paid By (Giver)</span><strong>{detail.paid_by_name || "-"}</strong></div>
                            <div><FaUser /><span>Received By (Receiver)</span><strong>{detail.received_by_name || "-"}</strong></div>
                        </div>
                    </section>

                    <section className="petty-card">
                        <div className="petty-card-title"><FaUniversity /><div><h2>WHO DEPOSITED / WHO RECEIVED</h2><p>Return accountability</p></div></div>
                        {detail.deposits.length ? detail.deposits.map((d) => (
                            <div className="petty-people" key={d.id}>
                                <div><FaUser /><span>Deposited By</span><strong>{d.deposited_by_name || "-"}</strong></div>
                                <div><FaUser /><span>Received By</span><strong>{d.received_by_name || "-"}</strong></div>
                            </div>
                        )) : <div className="petty-empty-inline">No deposit recorded.</div>}
                    </section>
                </div>

                <div className="petty-detail-footer">
                    <div><FaHistory /> Every advance, expense, deposit and settlement action is audit logged.</div>
                    <div className="petty-footer-actions">
                        <button className="petty-btn secondary" onClick={openAudit}><FaHistory /> Audit Trail</button>
                        {canDelete && <button className="petty-btn danger" onClick={deleteAdvance}><FaTrash /> Delete Advance</button>}
                    </div>
                </div>

                {showAudit && (
                    <Modal title="Audit Trail" onClose={() => setShowAudit(false)}>
                        <div className="petty-audit-list">
                            {audit.length ? audit.map((item) => (
                                <div className="petty-audit-row" key={item.id}>
                                    <div>
                                        <strong>{String(item.action || "").replaceAll("_", " ")}</strong>
                                        <span>{item.changed_at || item.created_at ? new Date(item.changed_at || item.created_at).toLocaleString() : "—"}</span>
                                    </div>
                                    <span>Changed by user #{item.changed_by || "—"}</span>
                                </div>
                            )) : <div className="petty-empty-inline">No audit entries found.</div>}
                        </div>
                    </Modal>
                )}

                {modal === "expense" && <AddExpenseForm id={detail.id} onClose={() => setModal("")} onSaved={async () => { setModal(""); await refreshDetail(); }} />}
                {modal === "deposit" && <AddDepositForm id={detail.id} options={options} onClose={() => setModal("")} onSaved={async () => { setModal(""); await refreshDetail(); }} />}
            </div>
        );
    }

    return (
        <div className="petty-page">
            <div className="petty-page-header">
                <div>
                    <span className="petty-eyebrow">Cash Control</span>
                    <h1>Petty Cash Advance & Settlement</h1>
                    <p>Manager gives advance → expense with bills → return unused cash → settlement.</p>
                </div>
                {access.canAdd && <button className="petty-btn primary large" onClick={() => setModal("advance")}><FaPlus /> New Advance</button>}
            </div>

            {error && <div className="petty-error global"><FaExclamationCircle /> {error}</div>}

            <div className="petty-flow petty-dashboard-flow">
                <div className="petty-flow-card advance"><div className="petty-flow-icon"><FaMoneyBillWave /></div><span>1. ADVANCE GIVEN</span><strong>{money(summary.total_advanced)}</strong><small>Cash issued to employees</small></div>
                <FaArrowRight className="petty-flow-arrow" />
                <div className="petty-flow-card expense"><div className="petty-flow-icon"><FaReceipt /></div><span>2. EXPENSES WITH BILLS</span><strong>{money(summary.total_expense)}</strong><small>Verified purchase spend</small></div>
                <FaArrowRight className="petty-flow-arrow" />
                <div className="petty-flow-card deposit"><div className="petty-flow-icon"><FaUniversity /></div><span>3. UNUSED CASH RETURN</span><strong>{money(summary.total_deposit)}</strong><small>Cash returned to manager</small></div>
                <FaArrowRight className="petty-flow-arrow" />
                <div className="petty-flow-card settlement"><div className="petty-flow-icon"><FaClipboardCheck /></div><span>4. SETTLEMENT</span><strong>{summary.settled_amount ? money(summary.settled_amount) : "₹0.00"}</strong><small>{summary.total_advances || 0} advance(s) recorded</small></div>
            </div>

            <div className="petty-dashboard-grid">
                <div className="petty-card petty-summary-main">
                    <div className="petty-card-title"><FaCalculator /><div><h2>SUMMARY CALCULATION</h2><p>Live petty cash position</p></div></div>
                    <div className="petty-summary-lines">
                        <div><span>Total Advances</span><strong>{summary.total_advances || 0}</strong></div>
                        <div><span>Advance Given</span><strong>{money(summary.total_advanced)}</strong></div>
                        <div><span>Settled</span><strong className="positive">{money(summary.settled_amount)}</strong></div>
                        <div><span>Outstanding</span><strong className="warning">{money(summary.outstanding_balance)}</strong></div>
                    </div>
                </div>

                <div className="petty-card">
                    <div className="petty-card-title"><FaFilter /><div><h2>FILTERS</h2><p>Find an advance quickly</p></div></div>
                    <div className="petty-filter-grid">
                        <div className="petty-search"><FaSearch /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Advance, employee or purpose" onKeyDown={(e) => e.key === "Enter" && loadDashboard()} /></div>
                        <select value={store} onChange={(e) => setStore(e.target.value)}><option value="">All Stores</option>{options.stores.map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}</select>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Status</option><option value="OPEN">Open</option><option value="PARTIALLY_SETTLED">Partially Settled</option><option value="SETTLED">Settled</option><option value="CANCELLED">Cancelled</option></select>
                        <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}><option value="ALL">All Store Records</option><option value="GIVEN_BY_ME">Given By Me</option><option value="RECEIVED_BY_ME">Received By Me</option></select>
                        <button className="petty-btn secondary" onClick={loadDashboard}><FaFilter /> Apply</button>
                        <button className="petty-btn secondary" onClick={() => { setSearch(""); setStore(""); setStatus(""); setViewMode("ALL"); loadDashboard({ search: "", store: "", status: "", viewMode: "ALL" }); }}><FaBroom /> Clear Filters</button>
                    </div>
                </div>
            </div>

            <div className="petty-action-toolbar">
                <button className="petty-btn secondary" onClick={() => {
                    const rows = visibleAdvances;
                    if (!rows.length) return;
                    const headers = ["Advance No","Date","Store","Giver","Receiver","Advance","Expense","Deposit","Balance","Status"];
                    const csv = [headers, ...rows.map(a => [a.advance_no,a.advance_date,a.store_name,a.paid_by_name,a.received_by_name,Number(a.advance_amount||0).toFixed(2),Number(a.total_expense||0).toFixed(2),Number(a.total_deposit||0).toFixed(2),Number(a.balance||0).toFixed(2),a.status])].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
                    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
                    const a = document.createElement("a"); a.href=url; a.download=`petty-cash-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}><FaDownload /> Export</button>
                {access.canEdit && <button className="petty-btn danger" disabled={deleting || !visibleAdvances.length} onClick={async () => {
                    const scope = access.admin ? "ALL petty cash records in the system" : "ALL petty cash records given by you";
                    if (!window.confirm(`PERMANENT DELETE\n\nThis will permanently delete ${scope}, including their expenses, deposits and settlement records.\n\nThis cannot be undone. Continue?`)) return;
                    try {
                        setDeleting(true);
                        const response = await axios.post("/api/petty-cash/bulk-delete", { deleteAll: true });
                        if (!response.data?.success) throw new Error(response.data?.message || "Unable to delete records.");
                        setError("");
                        setSearch("");
                        setStore("");
                        setStatus("");
                        setViewMode("ALL");
                        await loadDashboard({ search: "", store: "", status: "", viewMode: "ALL" });
                    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to delete records."); } finally { setDeleting(false); }
                }}><FaTrash /> {deleting ? "Deleting..." : "Delete All"}</button>}
                <Link className="petty-btn secondary" to="/petty-cash/email-settings"><FaEnvelope /> Email Settings</Link>
            </div>

            <div className="petty-card">
                <div className="petty-card-title"><FaReceipt /><div><h2>RECENT ADVANCES</h2><p>Advance, expense, deposit and outstanding balance</p></div></div>
                <div className="petty-table-wrap">
                    <table className="petty-table advances-table">
                        <thead><tr><th>Advance No.</th><th>Date</th><th>Store</th><th>Received By</th><th>Advance (₹)</th><th>Expense (₹)</th><th>Deposit (₹)</th><th>Balance (₹)</th><th>Status</th><th className="petty-action-column">Action</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan="10" className="empty-cell">Loading petty cash...</td></tr> :
                                visibleAdvances.length ? visibleAdvances.map((a) => (
                                    <tr key={a.id}>
                                        <td><strong>{a.advance_no}</strong></td><td>{a.advance_date}</td><td>{a.store_name || "-"}</td><td>{a.received_by_name || "-"}</td>
                                        <td className="amount">{money(a.advance_amount)}</td><td className="amount">{money(a.total_expense)}</td><td className="amount">{money(a.total_deposit)}</td>
                                        <td className={`amount ${Number(a.balance) === 0 ? "positive" : "warning"}`}>{money(a.balance)}</td>
                                        <td><span className={`petty-status ${statusClass(a.status)}`}>{statusLabel(a.status)}</span></td>
                                        <td className="petty-row-actions petty-action-column">
                                            <Link className="petty-view-link" to={`/petty-cash/${a.id}`}>View <FaArrowRight /></Link>
                                            {(access.admin || Number(a.paid_by) === access.userId) && access.canEdit && (
                                                <button className="petty-icon-delete" title={`Permanently delete ${a.advance_no}`} onClick={async () => {
                                                    if (!window.confirm(`Permanently delete ${a.advance_no}? This will also delete its expenses, deposits and settlement record. This cannot be undone.`)) return;
                                                    try {
                                                        const response = await axios.delete(`/api/petty-cash/${a.id}`);
                                                        if (!response.data?.success) throw new Error(response.data?.message || "Unable to delete record.");
                                                        setError("");
                                                        await loadDashboard();
                                                    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to delete record."); }
                                                }}><FaTrash /></button>
                                            )}
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="10" className="empty-cell">No petty cash advances found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="petty-dashboard-bottom">
                <div className="petty-card">
                    <div className="petty-card-title"><FaStore /><div><h2>STORE WISE SUMMARY</h2><p>Cash movement by store</p></div></div>
                    <div className="petty-table-wrap">
                        <table className="petty-table compact-table">
                            <thead><tr><th>Store</th><th>Advances</th><th>Expenses</th><th>Deposits</th><th>Closing</th></tr></thead>
                            <tbody>{(summary.storeWise || []).map((s) => <tr key={s.store_name}><td>{s.store_name}</td><td>{money(s.advances_given)}</td><td>{money(s.total_expenses)}</td><td>{money(s.total_deposits)}</td><td>{money(Number(s.advances_given)-Number(s.total_expenses)-Number(s.total_deposits))}</td></tr>)}</tbody>
                        </table>
                    </div>
                </div>
                <div className="petty-card">
                    <div className="petty-card-title"><FaUser /><div><h2>PERSON WISE OUTSTANDING</h2><p>Employee accountability</p></div></div>
                    <div className="petty-table-wrap">
                        <table className="petty-table compact-table">
                            <thead><tr><th>Employee</th><th>Total Advance</th><th>Settled</th><th>Outstanding</th></tr></thead>
                            <tbody>{(summary.personWise || []).map((p) => <tr key={p.employee}><td>{p.employee}</td><td>{money(p.total_advance)}</td><td>{money(p.settled)}</td><td className={Number(p.total_advance)-Number(p.settled) > 0 ? "warning" : "positive"}>{money(Number(p.total_advance)-Number(p.settled))}</td></tr>)}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="petty-control-strip">
                <span><FaFilter /> Filters: Store, Date, Status, Paid By, Received By</span>
                <span><FaUpload /> Upload Bills / Receipts</span>
                <span><FaCalculator /> Export-ready summaries</span>
                <span><FaHistory /> Audit Trail (Who Did What & When)</span>
                <span><FaCheckCircle /> Secure Role Based Access</span>
            </div>

            {modal === "advance" && access.canAdd && <AdvanceForm options={options} onClose={() => setModal("")} onCreated={createAdvance} />}
        </div>
    );
}

export default PettyCash;

import PremiumLoader from "../../components/premium/PremiumLoader";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
    FaArrowLeft,
    FaArrowRight,
    FaMoneyBillWave,
    FaReceipt,
    FaUniversity,
    FaClipboardCheck,
    FaPlus,
    FaUndo,
    FaTrash,
    FaEdit,
    FaHistory,
    FaFileInvoice,
    FaCalculator,
    FaUser,
    FaRupeeSign,
    FaExclamationCircle,
    FaCheckCircle
} from "react-icons/fa";
import "../../styles/premium/PagePremium.css";
import "./PettyCashPremium.css";
import {
    money,
    today,
    dmy,
    dateTime,
    getAccess,
    apiError,
    PettyNav,
    PcModal,
    ConfirmModal,
    FileDrop,
    FileLink,
    Field,
    StatusPill,
    EXPENSE_TYPES,
    validateFile
} from "./pettyCashShared";

// ------------------------------------------------------
// ADD EXPENSE (all fields + bill mandatory)
// ------------------------------------------------------
function AddExpenseModal({ advance, onClose, onSaved }) {
    const [form, setForm] = useState({ expense_type: "", amount: "", description: "", expense_date: today() });
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const balance = Number(advance.balance || 0);

    const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

    const submit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!form.expense_type) errs.expense_type = "Select the expense type.";
        if (!(Number(form.amount) > 0)) errs.amount = "Enter a valid amount.";
        else if (Number(form.amount) > balance + 0.005) errs.amount = `Cannot exceed the balance ${money(balance)}.`;
        if (!form.description.trim()) errs.description = "Description is required.";
        if (!form.expense_date) errs.expense_date = "Expense date is required.";
        const fileError = validateFile(file);
        if (fileError) errs.file = fileError === "Please attach the supporting document." ? "Bill / receipt is required." : fileError;
        setErrors(errs);
        if (Object.keys(errs).length) { setError("All fields are mandatory."); return; }
        try {
            setSaving(true);
            setError("");
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => data.append(k, String(v).trim()));
            data.append("bill", file);
            const response = await axios.post(`/api/petty-cash/${advance.id}/expenses`, data);
            if (!response.data?.success) throw new Error(response.data?.message);
            onSaved("Expense saved.");
        } catch (err) {
            setError(apiError(err, "Unable to add expense."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <PcModal title="Add Expense With Bill" icon={FaReceipt} onClose={onClose}>
            <form className="pc-modal-body" onSubmit={submit} noValidate>
                <div className="pc-balance-strip">Available balance on <b>{advance.advance_no}</b>: <strong>{money(balance)}</strong></div>
                <div className="pc-form-grid">
                    <Field label="Expense Type" error={errors.expense_type}>
                        <select value={form.expense_type} onChange={(e) => set("expense_type", e.target.value)}>
                            <option value="">Select expense type</option>
                            {EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </Field>
                    <Field label="Amount (₹)" error={errors.amount}>
                        <div className="pc-input-icon"><FaRupeeSign /><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="Enter amount" /></div>
                    </Field>
                    <Field label="Description" full error={errors.description}>
                        <input value={form.description} maxLength={500} onChange={(e) => set("description", e.target.value)} placeholder="Enter description (e.g. Office files, pen, paper...)" />
                    </Field>
                    <Field label="Expense Date" error={errors.expense_date}>
                        <input type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} />
                    </Field>
                    <Field label="Bill / Receipt" error={errors.file}>
                        <FileDrop file={file} onChange={(f) => { setFile(f); setErrors((x) => ({ ...x, file: "" })); }} error={errors.file} label="Upload the bill or receipt" />
                    </Field>
                </div>
                {error && <div className="pc-alert pc-alert--error"><FaExclamationCircle /> {error}</div>}
                <div className="pc-modal-foot">
                    <button type="button" className="pc-btn pc-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="pc-btn pc-btn--primary" disabled={saving}><FaReceipt /> {saving ? "Saving..." : "Save Expense"}</button>
                </div>
            </form>
        </PcModal>
    );
}

// ------------------------------------------------------
// DEPOSIT UNUSED CASH (all fields + receipt mandatory)
// ------------------------------------------------------
function AddDepositModal({ advance, options, access, onClose, onSaved }) {
    const balance = Number(advance.balance || 0);
    const [form, setForm] = useState({
        amount: balance > 0 ? balance.toFixed(2) : "",
        deposited_by: String(advance.received_by || ""),
        received_by: String(advance.paid_by || ""),
        deposit_date: today(),
        reference_no: `DEP-${advance.advance_no || ""}-${(advance.deposits?.length || 0) + 1}`
    });
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

    const submit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!(Number(form.amount) > 0)) errs.amount = "Enter a valid amount.";
        else if (Number(form.amount) > balance + 0.005) errs.amount = `Cannot exceed the balance ${money(balance)}.`;
        if (!form.deposited_by) errs.deposited_by = "Select who deposits.";
        if (!form.received_by) errs.received_by = "Select who receives.";
        if (!form.deposit_date) errs.deposit_date = "Deposit date is required.";
        if (!form.reference_no.trim()) errs.reference_no = "Reference number is required.";
        const fileError = validateFile(file);
        if (fileError) errs.file = fileError === "Please attach the supporting document." ? "Deposit receipt is required." : fileError;
        setErrors(errs);
        if (Object.keys(errs).length) { setError("All fields are mandatory."); return; }
        try {
            setSaving(true);
            setError("");
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => data.append(k, String(v).trim()));
            data.append("receipt", file);
            const response = await axios.post(`/api/petty-cash/${advance.id}/deposits`, data);
            if (!response.data?.success) throw new Error(response.data?.message);
            onSaved("Deposit recorded.");
        } catch (err) {
            setError(apiError(err, "Unable to record deposit."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <PcModal title="Deposit Unused Cash" icon={FaUniversity} onClose={onClose}>
            <form className="pc-modal-body" onSubmit={submit} noValidate>
                <div className="pc-balance-strip">Cash to return on <b>{advance.advance_no}</b>: <strong>{money(balance)}</strong></div>
                <div className="pc-form-grid">
                    <Field label="Deposited Amount (₹)" error={errors.amount}>
                        <div className="pc-input-icon"><FaRupeeSign /><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="Enter amount" /></div>
                    </Field>
                    <Field label="Deposited By" error={errors.deposited_by}>
                        <select value={form.deposited_by} onChange={(e) => set("deposited_by", e.target.value)} disabled={!access.admin}>
                            <option value="">Select employee</option>
                            {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Received By" error={errors.received_by}>
                        <select value={form.received_by} onChange={(e) => set("received_by", e.target.value)} disabled={!access.admin}>
                            <option value="">Select manager</option>
                            {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Deposit Date" error={errors.deposit_date}>
                        <input type="date" value={form.deposit_date} onChange={(e) => set("deposit_date", e.target.value)} />
                    </Field>
                    <Field label="Reference No." error={errors.reference_no}>
                        <input value={form.reference_no} maxLength={150} onChange={(e) => set("reference_no", e.target.value)} placeholder="DEP-001" />
                    </Field>
                    <Field label="Deposit Receipt" error={errors.file}>
                        <FileDrop file={file} onChange={(f) => { setFile(f); setErrors((x) => ({ ...x, file: "" })); }} error={errors.file} label="Upload the deposit receipt" />
                    </Field>
                </div>
                {error && <div className="pc-alert pc-alert--error"><FaExclamationCircle /> {error}</div>}
                <div className="pc-modal-foot">
                    <button type="button" className="pc-btn pc-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="pc-btn pc-btn--primary" disabled={saving}><FaUniversity /> {saving ? "Saving..." : "Record Deposit"}</button>
                </div>
            </form>
        </PcModal>
    );
}

const AUDIT_LABEL = {
    CREATE_ADVANCE: "Advance created",
    UPDATE_ADVANCE: "Advance edited",
    ADD_EXPENSE: "Expense added",
    ADD_DEPOSIT: "Deposit recorded",
    SETTLE: "Advance settled",
    DELETE: "Advance deleted",
    DELETE_BULK: "Advance deleted (bulk)"
};

export const auditLabel = (action) => AUDIT_LABEL[action] || String(action || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// ======================================================
// ADVANCE DETAIL
// ======================================================
export default function PettyCashDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const access = getAccess();

    const [detail, setDetail] = useState(null);
    const [options, setOptions] = useState({ stores: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [modal, setModal] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [audit, setAudit] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const [d, o] = await Promise.all([
                axios.get(`/api/petty-cash/${id}`),
                axios.get("/api/petty-cash/options").catch(() => ({ data: {} }))
            ]);
            setDetail(d.data?.data || null);
            setOptions(o.data?.data || { stores: [], users: [] });
        } catch (err) {
            setError(apiError(err, "Unable to load advance details."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading && !detail) {
        return <div className="pc-page pp-premium"><div className="pc-card pc-center"><PremiumLoader title="Loading advance" /></div></div>;
    }
    if (!detail) {
        return (
            <div className="pc-page pp-premium">
                <PettyNav />
                <div className="pc-card pc-center">
                    {error || "Advance not found."}
                    <button type="button" className="pc-btn pc-btn--ghost" onClick={() => navigate("/petty-cash")}><FaArrowLeft /> Back to Petty Cash</button>
                </div>
            </div>
        );
    }

    const balance = Number(detail.balance || 0);
    const settled = detail.status === "SETTLED";
    const closed = settled || detail.status === "CANCELLED";
    const isGiver = access.admin || Number(detail.paid_by) === access.userId;
    const isReceiver = access.admin || Number(detail.received_by) === access.userId;
    const canChange = !closed && access.canEdit;
    const canSettle = canChange && isGiver;
    const canDelete = access.canEdit && isGiver;

    const settle = () =>
        setConfirm({
            title: `Settle ${detail.advance_no}?`,
            tone: "primary",
            confirmText: "Settle Advance",
            message: (
                <>
                    <p>Expense + deposit must equal the advance of <b>{money(detail.advance_amount)}</b>.</p>
                    <div className="pc-settle-check">
                        <span>Expense <b>{money(detail.total_expense)}</b></span>
                        <span>+ Deposit <b>{money(detail.total_deposit)}</b></span>
                        <span>= <b>{money(Number(detail.total_expense) + Number(detail.total_deposit))}</b></span>
                    </div>
                    {Math.abs(balance) > 0.005 && <p className="pc-confirm-warn">Balance of {money(balance)} is still open — add expenses or deposit the unused cash first.</p>}
                </>
            ),
            run: async () => {
                await axios.post(`/api/petty-cash/${detail.id}/settle`);
                setNotice(`${detail.advance_no} settled successfully.`);
                await load();
            }
        });

    const remove = () =>
        setConfirm({
            title: `Delete ${detail.advance_no}?`,
            confirmText: "Delete Advance",
            message: (
                <>
                    <p>This permanently deletes the advance with all its expenses, deposits and settlement record.</p>
                    <p className="pc-confirm-warn">This cannot be undone.</p>
                </>
            ),
            run: async () => {
                await axios.delete(`/api/petty-cash/${detail.id}`);
                navigate("/petty-cash");
            }
        });

    const runConfirm = async () => {
        try {
            setBusy(true);
            setError("");
            await confirm.run();
            setConfirm(null);
        } catch (err) {
            setConfirm(null);
            setError(apiError(err, "Action failed."));
        } finally {
            setBusy(false);
        }
    };

    const openAudit = async () => {
        try {
            const response = await axios.get(`/api/petty-cash/audit/${detail.id}`);
            setAudit(response.data?.data || []);
        } catch (err) {
            setError(apiError(err, "Unable to load audit history."));
        }
    };

    const saved = async (message) => {
        setModal("");
        setNotice(message);
        await load();
    };

    return (
        <div className="pc-page pp-premium">
            <section className="pc-detail-hero">
                <button type="button" className="pc-back" onClick={() => navigate("/petty-cash")} aria-label="Back"><FaArrowLeft /></button>
                <div className="pc-detail-title">
                    <span className="pc-eyebrow pc-eyebrow--light">Petty Cash Advance</span>
                    <h1>{detail.advance_no}</h1>
                    <p>{detail.store_name || "—"} · {dmy(detail.advance_date)} · {detail.paid_by_name || "—"} → {detail.received_by_name || "—"}</p>
                </div>
                <div className="pc-detail-actions">
                    <StatusPill status={detail.status} />
                    {canChange && isReceiver && <button type="button" className="pc-btn pc-btn--glass" onClick={() => setModal("expense")} disabled={balance <= 0}><FaPlus /> Add Expense</button>}
                    {canChange && isReceiver && <button type="button" className="pc-btn pc-btn--glass" onClick={() => setModal("deposit")} disabled={balance <= 0}><FaUndo /> Deposit Cash</button>}
                    {canSettle && <button type="button" className="pc-btn pc-btn--white" onClick={settle}><FaClipboardCheck /> Settle</button>}
                    {canChange && isGiver && <button type="button" className="pc-btn pc-btn--glass" onClick={() => navigate(`/petty-cash/${detail.id}/edit`)}><FaEdit /> Edit</button>}
                    {canDelete && <button type="button" className="pc-btn pc-btn--danger-solid" onClick={remove}><FaTrash /> Delete</button>}
                </div>
            </section>

            <PettyNav />

            {error && <div className="pc-alert pc-alert--error"><FaExclamationCircle /> {error}<button type="button" onClick={() => setError("")}>×</button></div>}
            {notice && <div className="pc-alert pc-alert--success"><FaCheckCircle /> {notice}<button type="button" onClick={() => setNotice("")}>×</button></div>}

            <div className="pc-flow">
                <div className="pc-flow-card pc-flow-card--violet">
                    <span className="pc-kpi-icon"><FaMoneyBillWave /></span>
                    <small>1. Advance Given</small>
                    <strong>{money(detail.advance_amount)}</strong>
                    <dl><div><dt>Paid By</dt><dd>{detail.paid_by_name || "—"}</dd></div><div><dt>Received By</dt><dd>{detail.received_by_name || "—"}</dd></div></dl>
                </div>
                <FaArrowRight className="pc-flow-arrow" />
                <div className="pc-flow-card pc-flow-card--blue">
                    <span className="pc-kpi-icon"><FaReceipt /></span>
                    <small>2. Expenses (With Bills)</small>
                    <strong>{money(detail.total_expense)}</strong>
                    <dl><div><dt>Items</dt><dd>{detail.expenses.length}</dd></div><div><dt>Control</dt><dd>Bills / receipts</dd></div></dl>
                </div>
                <FaArrowRight className="pc-flow-arrow" />
                <div className="pc-flow-card pc-flow-card--amber">
                    <span className="pc-kpi-icon"><FaUniversity /></span>
                    <small>3. Deposit Unused Cash</small>
                    <strong>{money(detail.total_deposit)}</strong>
                    <dl><div><dt>Deposits</dt><dd>{detail.deposits.length}</dd></div><div><dt>Remaining</dt><dd>{money(balance)}</dd></div></dl>
                </div>
                <FaArrowRight className="pc-flow-arrow" />
                <div className="pc-flow-card pc-flow-card--green">
                    <span className="pc-kpi-icon"><FaClipboardCheck /></span>
                    <small>4. Settlement</small>
                    <strong>{settled ? "SETTLED" : detail.status === "CANCELLED" ? "CANCELLED" : "OPEN"}</strong>
                    <dl><div><dt>Status</dt><dd>{detail.settlement?.settled_at ? dateTime(detail.settlement.settled_at) : "Awaiting final settlement"}</dd></div></dl>
                </div>
            </div>

            <div className="pc-calc">
                <div><small>Advance Given</small><strong>{money(detail.advance_amount)}</strong></div>
                <div><small>Total Expense</small><strong className="pc-neg">− {money(detail.total_expense)}</strong></div>
                <div><small>Total Deposit</small><strong className="pc-neg">− {money(detail.total_deposit)}</strong></div>
                <div><small>Cash To Return</small><strong className={Math.abs(balance) < 0.005 ? "pc-pos" : "pc-warn"}>{money(Math.max(0, balance))}</strong></div>
                <StatusPill status={detail.status} />
            </div>

            <div className="pc-detail-grid">
                <section className="pc-card">
                    <header className="pc-card-head">
                        <span className="pc-card-icon"><FaFileInvoice /></span>
                        <div><h2>Advance Details</h2><p>Original cash movement</p></div>
                    </header>
                    <dl className="pc-summary">
                        <div><dt>Advance No.</dt><dd>{detail.advance_no}</dd></div>
                        <div><dt>Store</dt><dd>{detail.store_name || "—"}</dd></div>
                        <div><dt>Paid By (Giver)</dt><dd>{detail.paid_by_name || "—"}</dd></div>
                        <div><dt>Received By (Receiver)</dt><dd>{detail.received_by_name || "—"}</dd></div>
                        <div><dt>Advance Amount</dt><dd>{money(detail.advance_amount)}</dd></div>
                        <div><dt>Advance Date</dt><dd>{dmy(detail.advance_date)}</dd></div>
                        <div><dt>Purpose</dt><dd>{detail.purpose || "—"}</dd></div>
                        <div><dt>Supporting Document</dt><dd><FileLink path={detail.attachment_path} name={detail.attachment_filename} /></dd></div>
                        <div><dt>Status</dt><dd><StatusPill status={detail.status} /></dd></div>
                    </dl>
                </section>

                <section className="pc-card pc-span-2">
                    <header className="pc-card-head">
                        <span className="pc-card-icon pc-card-icon--blue"><FaReceipt /></span>
                        <div><h2>Expenses (Part 1)</h2><p>Actual purchases backed by bills</p></div>
                        {canChange && isReceiver && balance > 0 && (
                            <div className="pc-card-tools"><button type="button" className="pc-btn pc-btn--primary pc-btn--sm" onClick={() => setModal("expense")}><FaPlus /> Add Expense</button></div>
                        )}
                    </header>
                    <div className="pc-table-wrap">
                        <table className="pc-table pc-table--compact">
                            <thead><tr><th>#</th><th>Expense Type</th><th>Description</th><th className="pc-num">Amount (₹)</th><th>Bill / Receipt</th><th>Date</th><th>Entered By</th></tr></thead>
                            <tbody>
                                {detail.expenses.length ? detail.expenses.map((e, i) => (
                                    <tr key={e.id}>
                                        <td className="pc-muted">{i + 1}</td>
                                        <td className="pc-strong">{e.expense_type}</td>
                                        <td>{e.description || "—"}</td>
                                        <td className="pc-num pc-strong">{money(e.amount)}</td>
                                        <td><FileLink path={e.bill_path} name={e.bill_filename} /></td>
                                        <td>{dmy(e.expense_date)}</td>
                                        <td>{e.entered_by_name || "—"}</td>
                                    </tr>
                                )) : <tr><td colSpan="7" className="pc-empty">No expenses recorded yet.</td></tr>}
                            </tbody>
                            <tfoot><tr><td colSpan="3">Total Expense</td><td className="pc-num">{money(detail.total_expense)}</td><td colSpan="3" /></tr></tfoot>
                        </table>
                    </div>
                </section>

                <section className="pc-card">
                    <header className="pc-card-head">
                        <span className="pc-card-icon pc-card-icon--teal"><FaUser /></span>
                        <div><h2>Who Paid / Who Received</h2><p>Accountability</p></div>
                    </header>
                    <div className="pc-people">
                        <div><FaUser /><span><small>Paid By (Giver)</small><strong>{detail.paid_by_name || "—"}</strong></span></div>
                        <div><FaUser /><span><small>Received By (Receiver)</small><strong>{detail.received_by_name || "—"}</strong></span></div>
                        {detail.deposits.map((d) => (
                            <div key={d.id}><FaUniversity /><span><small>Deposit {d.reference_no || ""}</small><strong>{d.deposited_by_name || "—"} → {d.received_by_name || "—"}</strong></span></div>
                        ))}
                    </div>
                </section>

                <section className="pc-card pc-span-2">
                    <header className="pc-card-head">
                        <span className="pc-card-icon pc-card-icon--amber"><FaUniversity /></span>
                        <div><h2>Deposit (Part 2)</h2><p>Unused cash returned</p></div>
                        {canChange && isReceiver && balance > 0 && (
                            <div className="pc-card-tools"><button type="button" className="pc-btn pc-btn--primary pc-btn--sm" onClick={() => setModal("deposit")}><FaUndo /> Deposit Cash</button></div>
                        )}
                    </header>
                    <div className="pc-table-wrap">
                        <table className="pc-table pc-table--compact">
                            <thead><tr><th>#</th><th className="pc-num">Deposited Amount (₹)</th><th>Deposited By</th><th>Received By</th><th>Deposit Date</th><th>Reference No.</th><th>Receipt</th></tr></thead>
                            <tbody>
                                {detail.deposits.length ? detail.deposits.map((d, i) => (
                                    <tr key={d.id}>
                                        <td className="pc-muted">{i + 1}</td>
                                        <td className="pc-num pc-strong">{money(d.amount)}</td>
                                        <td>{d.deposited_by_name || "—"}</td>
                                        <td>{d.received_by_name || "—"}</td>
                                        <td>{dmy(d.deposit_date)}</td>
                                        <td>{d.reference_no || "—"}</td>
                                        <td><FileLink path={d.receipt_path} name={d.receipt_filename} /></td>
                                    </tr>
                                )) : <tr><td colSpan="7" className="pc-empty">No cash deposit recorded yet.</td></tr>}
                            </tbody>
                            <tfoot><tr><td>Total Deposit</td><td className="pc-num">{money(detail.total_deposit)}</td><td colSpan="5" /></tr></tfoot>
                        </table>
                    </div>
                </section>

                <section className="pc-card pc-span-3">
                    <header className="pc-card-head">
                        <span className="pc-card-icon"><FaCalculator /></span>
                        <div><h2>Settlement Overview</h2><p>Final reconciliation</p></div>
                    </header>
                    <div className="pc-settle-grid">
                        <div><small>Advance Amount</small><strong>{money(detail.advance_amount)}</strong></div>
                        <div><small>Total Expense</small><strong>{money(detail.total_expense)}</strong></div>
                        <div><small>Total Deposit</small><strong>{money(detail.total_deposit)}</strong></div>
                        <div><small>Balance</small><strong className={Math.abs(balance) < 0.005 ? "pc-pos" : "pc-warn"}>{money(balance)}</strong></div>
                        <div><small>Settled By</small><strong>{detail.settlement?.settled_by_name || "—"}</strong></div>
                    </div>
                </section>
            </div>

            <div className="pc-detail-foot">
                <span><FaHistory /> Every advance, expense, deposit and settlement action is audit logged.</span>
                <div>
                    <button type="button" className="pc-btn pc-btn--ghost" onClick={openAudit}><FaHistory /> Audit Trail</button>
                    {canDelete && <button type="button" className="pc-btn pc-btn--danger-solid" onClick={remove}><FaTrash /> Delete Advance</button>}
                </div>
            </div>

            {audit && (
                <PcModal title="Audit Trail" icon={FaHistory} onClose={() => setAudit(null)} width={640}>
                    <div className="pc-modal-body">
                        {audit.length ? (
                            <ol className="pc-timeline">
                                {audit.map((item) => (
                                    <li key={item.id}>
                                        <span className="pc-timeline-dot" />
                                        <div>
                                            <strong>{auditLabel(item.action)}</strong>
                                            <small>{dateTime(item.changed_at || item.created_at)}</small>
                                        </div>
                                        <em>by {item.changed_by_name || (item.changed_by ? `User #${item.changed_by}` : "System")}</em>
                                    </li>
                                ))}
                            </ol>
                        ) : <div className="pc-empty">No audit entries found.</div>}
                    </div>
                </PcModal>
            )}

            {modal === "expense" && <AddExpenseModal advance={detail} onClose={() => setModal("")} onSaved={saved} />}
            {modal === "deposit" && <AddDepositModal advance={detail} options={options} access={access} onClose={() => setModal("")} onSaved={saved} />}

            {confirm && (
                <ConfirmModal
                    title={confirm.title}
                    message={confirm.message}
                    confirmText={confirm.confirmText}
                    tone={confirm.tone || "danger"}
                    busy={busy}
                    onConfirm={runConfirm}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}

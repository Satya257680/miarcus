import PremiumLoader from "../../components/premium/PremiumLoader";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    FaReceipt,
    FaUniversity,
    FaHistory,
    FaSearch,
    FaFilter,
    FaUndo,
    FaEye,
    FaExclamationCircle,
    FaPlus
} from "react-icons/fa";
import "../../styles/premium/PagePremium.css";
import "./PettyCashPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import ExportButton from "../../components/common/ExportButton";
import { exportTableData } from "../../utils/exportUtils.js";
import {
    money,
    dmy,
    dateTime,
    getAccess,
    apiError,
    PettyNav,
    FileLink,
    StatusPill,
    usePager,
    Pager,
    sortRows,
    SortTh,
    EXPENSE_TYPES
} from "./pettyCashShared";
import { auditLabel } from "./PettyCashDetail";

const EMPTY = { search: "", store: "", from: "", to: "", expense_type: "", action: "" };

const CONFIG = {
    expenses: {
        icon: FaReceipt,
        eyebrow: "Petty Cash · Manage Expenses",
        title: "Manage Expenses",
        subtitle: "Every expense recorded against a petty cash advance, with its bill or receipt.",
        url: "/api/petty-cash/list/expenses",
        card: "Expense Register",
        cardHint: "Open an advance to add a new expense with its bill.",
        amountKey: "amount"
    },
    deposits: {
        icon: FaUniversity,
        eyebrow: "Petty Cash · Manage Deposits",
        title: "Manage Deposits",
        subtitle: "Unused cash returned to managers, with reference numbers and receipts.",
        url: "/api/petty-cash/list/deposits",
        card: "Deposit Register",
        cardHint: "Open an advance to record a new deposit with its receipt.",
        amountKey: "amount"
    },
    audit: {
        icon: FaHistory,
        eyebrow: "Petty Cash · Audit Trail",
        title: "Audit Trail",
        subtitle: "Who did what and when — every advance, expense, deposit, settlement and delete.",
        url: "/api/petty-cash/list/audit",
        card: "Audit Log",
        cardHint: "Newest activity first."
    }
};

const ACTIONS = ["CREATE_ADVANCE", "UPDATE_ADVANCE", "ADD_EXPENSE", "ADD_DEPOSIT", "SETTLE", "DELETE", "DELETE_BULK"];

const parseJson = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return null; }
};

const auditSummary = (row) => {
    const data = parseJson(row.new_data) || parseJson(row.old_data) || {};
    const parts = [];
    if (data.advance_no) parts.push(data.advance_no);
    if (data.expense_type) parts.push(data.expense_type);
    if (data.amount) parts.push(money(data.amount));
    else if (data.advance_amount) parts.push(money(data.advance_amount));
    if (data.purpose) parts.push(data.purpose);
    if (data.reference_no) parts.push(`Ref ${data.reference_no}`);
    return parts.join(" · ") || "—";
};

function PettyCashRegister({ type }) {
    const cfg = CONFIG[type];
    const navigate = useNavigate();
    const access = getAccess();
    const [rows, setRows] = useState([]);
    const [stores, setStores] = useState([]);
    const [filters, setFilters] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sort, setSort] = useState({ key: "", dir: "asc" });

    const load = async (next = filters) => {
        try {
            setLoading(true);
            setError("");
            const { data } = await axios.get(cfg.url, {
                params: {
                    search: next.search || undefined,
                    store_id: next.store || undefined,
                    from: next.from || undefined,
                    to: next.to || undefined,
                    expense_type: next.expense_type || undefined,
                    action: next.action || undefined
                }
            });
            setRows(data?.data || []);
        } catch (err) {
            setError(apiError(err, "Unable to load records."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setFilters(EMPTY);
        load(EMPTY);
        axios.get("/api/petty-cash/options").then((r) => setStores(r.data?.data?.stores || [])).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
    const pager = usePager(sorted, 15);
    const total = useMemo(() => rows.reduce((s, r) => s + Number(r[cfg.amountKey] || 0), 0), [rows, cfg.amountKey]);

    const doExport = async (format = "csv") => {
        if (!sorted.length) return;
        const spec = type === "expenses"
            ? {
                headers: ["Date", "Advance No", "Store", "Expense Type", "Description", "Amount", "Entered By", "Bill"],
                rows: sorted.map((r) => [dmy(r.expense_date), r.advance_no, r.store_name, r.expense_type, r.description, Number(r.amount || 0).toFixed(2), r.entered_by_name, r.bill_filename || ""])
            }
            : type === "deposits"
                ? {
                    headers: ["Date", "Advance No", "Store", "Reference No", "Amount", "Deposited By", "Received By", "Receipt"],
                    rows: sorted.map((r) => [dmy(r.deposit_date), r.advance_no, r.store_name, r.reference_no, Number(r.amount || 0).toFixed(2), r.deposited_by_name, r.received_by_name, r.receipt_filename || ""])
                }
                : {
                    headers: ["Date & Time", "Action", "Advance", "Store", "Details", "Done By"],
                    rows: sorted.map((r) => [dateTime(r.changed_at || r.created_at), auditLabel(r.action), r.advance_no || "", r.store_name || "", auditSummary(r), r.changed_by_name || ""])
                };
        await exportTableData({ ...spec, filename: `petty-cash-${type}-${new Date().toISOString().slice(0, 10)}`, format, title: cfg.title });
    };

    const Icon = cfg.icon;

    return (
        <div className="pc-page pp-premium">
            <PremiumHero
                icon={Icon}
                eyebrow={cfg.eyebrow}
                title={cfg.title}
                subtitle={cfg.subtitle}
                meta={type === "audit"
                    ? [{ label: "Entries", value: String(rows.length) }]
                    : [{ label: "Records", value: String(rows.length) }, { label: "Total", value: money(total) }]}
                actions={access.canAdd && (
                    <button type="button" className="pp-hero-btn pp-hero-btn--solid" onClick={() => navigate("/petty-cash/new")}><FaPlus /> New Advance</button>
                )}
            />

            <PettyNav />

            {error && <div className="pc-alert pc-alert--error"><FaExclamationCircle /> {error}</div>}

            <form className="pc-card pc-filters" onSubmit={(e) => { e.preventDefault(); load(filters); }}>
                <label className="pc-filter pc-filter--search">
                    <span>Search</span>
                    <div className="pc-input-icon"><FaSearch /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder={type === "audit" ? "Advance, user, action..." : "Advance No, store, name, reference..."} /></div>
                </label>
                {type !== "audit" ? (
                    <>
                        <label className="pc-filter">
                            <span>Store</span>
                            <select value={filters.store} onChange={(e) => setFilters({ ...filters, store: e.target.value })}>
                                <option value="">All Stores</option>
                                {stores.map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
                            </select>
                        </label>
                        {type === "expenses" && (
                            <label className="pc-filter">
                                <span>Expense Type</span>
                                <select value={filters.expense_type} onChange={(e) => setFilters({ ...filters, expense_type: e.target.value })}>
                                    <option value="">All Types</option>
                                    {EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="pc-filter">
                            <span>From Date</span>
                            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                        </label>
                        <label className="pc-filter">
                            <span>To Date</span>
                            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                        </label>
                    </>
                ) : (
                    <label className="pc-filter">
                        <span>Action</span>
                        <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
                            <option value="">All Actions</option>
                            {ACTIONS.map((a) => <option key={a} value={a}>{auditLabel(a)}</option>)}
                        </select>
                    </label>
                )}
                <div className="pc-filter-actions">
                    <button type="submit" className="pc-btn pc-btn--primary"><FaFilter /> Apply</button>
                    <button type="button" className="pc-btn pc-btn--ghost" onClick={() => { setFilters(EMPTY); load(EMPTY); }}><FaUndo /> Clear</button>
                </div>
            </form>

            <section className="pc-card">
                <header className="pc-card-head">
                    <span className={`pc-card-icon ${type === "deposits" ? "pc-card-icon--amber" : type === "expenses" ? "pc-card-icon--blue" : ""}`}><Icon /></span>
                    <div><h2>{cfg.card}</h2><p>{cfg.cardHint}</p></div>
                    <div className="pc-card-tools"><ExportButton onExport={doExport} disabled={!sorted.length} /></div>
                </header>

                <div className="pc-table-wrap">
                    <table className="pc-table">
                        <thead>
                            {type === "expenses" && (
                                <tr>
                                    <th>#</th>
                                    <SortTh label="Date" k="expense_date" sort={sort} setSort={setSort} />
                                    <SortTh label="Advance No." k="advance_no" sort={sort} setSort={setSort} />
                                    <SortTh label="Store" k="store_name" sort={sort} setSort={setSort} />
                                    <SortTh label="Expense Type" k="expense_type" sort={sort} setSort={setSort} />
                                    <th>Description</th>
                                    <SortTh label="Amount (₹)" k="amount" sort={sort} setSort={setSort} className="pc-num" />
                                    <th>Bill / Receipt</th>
                                    <SortTh label="Entered By" k="entered_by_name" sort={sort} setSort={setSort} />
                                    <th>Advance Status</th>
                                    <th className="pc-col-actions">Action</th>
                                </tr>
                            )}
                            {type === "deposits" && (
                                <tr>
                                    <th>#</th>
                                    <SortTh label="Date" k="deposit_date" sort={sort} setSort={setSort} />
                                    <SortTh label="Advance No." k="advance_no" sort={sort} setSort={setSort} />
                                    <SortTh label="Store" k="store_name" sort={sort} setSort={setSort} />
                                    <SortTh label="Reference No." k="reference_no" sort={sort} setSort={setSort} />
                                    <SortTh label="Amount (₹)" k="amount" sort={sort} setSort={setSort} className="pc-num" />
                                    <SortTh label="Deposited By" k="deposited_by_name" sort={sort} setSort={setSort} />
                                    <SortTh label="Received By" k="received_by_name" sort={sort} setSort={setSort} />
                                    <th>Receipt</th>
                                    <th>Advance Status</th>
                                    <th className="pc-col-actions">Action</th>
                                </tr>
                            )}
                            {type === "audit" && (
                                <tr>
                                    <th>#</th>
                                    <SortTh label="Date & Time" k="id" sort={sort} setSort={setSort} />
                                    <SortTh label="Action" k="action" sort={sort} setSort={setSort} />
                                    <SortTh label="Advance" k="advance_no" sort={sort} setSort={setSort} />
                                    <SortTh label="Store" k="store_name" sort={sort} setSort={setSort} />
                                    <th>Details</th>
                                    <SortTh label="Done By" k="changed_by_name" sort={sort} setSort={setSort} />
                                    <th className="pc-col-actions">Action</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="11" className="pc-empty"><PremiumLoader compact title="Loading records" /></td></tr>
                            ) : !pager.slice.length ? (
                                <tr><td colSpan="11" className="pc-empty">No records found.</td></tr>
                            ) : pager.slice.map((r, i) => (
                                <tr key={r.id}>
                                    <td className="pc-muted">{pager.from + i}</td>
                                    {type === "expenses" && (
                                        <>
                                            <td>{dmy(r.expense_date)}</td>
                                            <td className="pc-strong">{r.advance_no}</td>
                                            <td>{r.store_name || "—"}</td>
                                            <td><span className="pc-chip pc-chip--blue">{r.expense_type}</span></td>
                                            <td className="pc-purpose" title={r.description || ""}>{r.description || "—"}</td>
                                            <td className="pc-num pc-strong">{money(r.amount)}</td>
                                            <td><FileLink path={r.bill_path} name={r.bill_filename} /></td>
                                            <td>{r.entered_by_name || "—"}</td>
                                            <td><StatusPill status={r.advance_status} /></td>
                                        </>
                                    )}
                                    {type === "deposits" && (
                                        <>
                                            <td>{dmy(r.deposit_date)}</td>
                                            <td className="pc-strong">{r.advance_no}</td>
                                            <td>{r.store_name || "—"}</td>
                                            <td>{r.reference_no || "—"}</td>
                                            <td className="pc-num pc-strong">{money(r.amount)}</td>
                                            <td>{r.deposited_by_name || "—"}</td>
                                            <td>{r.received_by_name || "—"}</td>
                                            <td><FileLink path={r.receipt_path} name={r.receipt_filename} /></td>
                                            <td><StatusPill status={r.advance_status} /></td>
                                        </>
                                    )}
                                    {type === "audit" && (
                                        <>
                                            <td>{dateTime(r.changed_at || r.created_at)}</td>
                                            <td><span className={`pc-chip ${String(r.action).startsWith("DELETE") ? "pc-chip--red" : r.action === "SETTLE" ? "pc-chip--green" : "pc-chip--violet"}`}>{auditLabel(r.action)}</span></td>
                                            <td className="pc-strong">{r.advance_no || (parseJson(r.old_data)?.advance_no) || `#${r.reference_id}`}</td>
                                            <td>{r.store_name || parseJson(r.old_data)?.store_name || "—"}</td>
                                            <td className="pc-purpose" title={auditSummary(r)}>{auditSummary(r)}</td>
                                            <td>{r.changed_by_name || (r.changed_by ? `User #${r.changed_by}` : "System")}</td>
                                        </>
                                    )}
                                    <td className="pc-col-actions">
                                        {(type !== "audit" || r.advance_no) ? (
                                            <button type="button" className="pc-act pc-act--view" onClick={() => navigate(`/petty-cash/${type === "audit" ? r.reference_id : r.advance_id}`)}><FaEye /> View</button>
                                        ) : <span className="pc-muted">Deleted</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {type !== "audit" && rows.length > 0 && !loading && (
                            <tfoot>
                                <tr>
                                    <td colSpan={type === "expenses" ? 6 : 5}>Total ({rows.length})</td>
                                    <td className="pc-num">{money(total)}</td>
                                    <td colSpan={type === "expenses" ? 4 : 5} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                <Pager pager={pager} />
            </section>
        </div>
    );
}

export function PettyCashExpenses() {
    return <PettyCashRegister type="expenses" />;
}

export function PettyCashDeposits() {
    return <PettyCashRegister type="deposits" />;
}

export function PettyCashAuditTrail() {
    return <PettyCashRegister type="audit" />;
}

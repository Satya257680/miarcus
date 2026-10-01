import PremiumLoader from "../../components/premium/PremiumLoader";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    FaHistory,
    FaExclamationCircle,
    FaCheckCircle,
    FaUser,
    FaStore,
    FaTrash,
    FaEye,
    FaEdit,
    FaUndo,
    FaPaperPlane,
    FaListAlt
} from "react-icons/fa";
import "../../styles/premium/PagePremium.css";
import "./PettyCashPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import ExportButton from "../../components/common/ExportButton";
import { exportTableData } from "../../utils/exportUtils.js";
import {
    money,
    dmy,
    getAccess,
    apiError,
    PettyNav,
    ConfirmModal,
    StatusPill,
    usePager,
    Pager,
    sortRows,
    SortTh
} from "./pettyCashShared";

const EMPTY_FILTERS = { search: "", store: "", status: "", from: "", to: "" };

// ======================================================
// PETTY CASH DASHBOARD / MANAGE ADVANCES
// mode="dashboard" -> KPIs + recent advances + summaries
// mode="manage"    -> full advance register
// ======================================================
function PettyCash({ mode = "dashboard" }) {
    const navigate = useNavigate();
    const access = getAccess();
    const manage = mode === "manage";

    const [advances, setAdvances] = useState([]);
    const [summary, setSummary] = useState({});
    const [storeWise, setStoreWise] = useState([]);
    const [personWise, setPersonWise] = useState([]);
    const [options, setOptions] = useState({ stores: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [applied, setApplied] = useState(EMPTY_FILTERS);
    const [selected, setSelected] = useState([]);
    const [sort, setSort] = useState({ key: "", dir: "asc" });
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);
    const [emailing, setEmailing] = useState(false);

    const load = async (next = filters) => {
        try {
            setLoading(true);
            setError("");
            const [list, sum, opts] = await Promise.all([
                axios.get("/api/petty-cash", {
                    params: {
                        search: next.search || undefined,
                        status: next.status || undefined,
                        store_id: next.store || undefined,
                        from: next.from || undefined,
                        to: next.to || undefined
                    }
                }),
                axios.get("/api/petty-cash/summary"),
                axios.get("/api/petty-cash/options")
            ]);
            setAdvances(list.data?.data || []);
            setSummary(sum.data?.data?.summary || {});
            setStoreWise(sum.data?.data?.storeWise || []);
            setPersonWise(sum.data?.data?.personWise || []);
            setOptions(opts.data?.data || { stores: [], users: [] });
            setApplied(next);
            setSelected([]);
        } catch (err) {
            setError(apiError(err, "Unable to load petty cash."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(EMPTY_FILTERS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const sorted = useMemo(() => sortRows(advances, sort), [advances, sort]);
    const pager = usePager(sorted, manage ? 15 : 8);

    const canDeleteRow = (row) => access.canEdit && (access.admin || Number(row.paid_by) === access.userId);
    const canEditRow = (row) => canDeleteRow(row) && !["SETTLED", "CANCELLED"].includes(row.status);

    const pageIds = pager.slice.filter(canDeleteRow).map((r) => Number(r.id));
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

    const toggleRow = (id) =>
        setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

    const togglePage = () =>
        setSelected((current) =>
            allPageSelected ? current.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...current, ...pageIds]))
        );

    const deleteOne = (row) =>
        setConfirm({
            title: `Delete ${row.advance_no}?`,
            message: (
                <>
                    <p>This permanently deletes advance <b>{row.advance_no}</b> ({money(row.advance_amount)}) together with its expenses, deposits and settlement record.</p>
                    <p className="pc-confirm-warn">This cannot be undone.</p>
                </>
            ),
            confirmText: "Delete Advance",
            run: async () => {
                const response = await axios.delete(`/api/petty-cash/${row.id}`);
                if (!response.data?.success) throw new Error(response.data?.message || "Unable to delete record.");
                setNotice(`${row.advance_no} deleted.`);
            }
        });

    const deleteSelected = () => {
        if (!selected.length) {
            setError("Select at least one advance to delete.");
            return;
        }
        setConfirm({
            title: `Delete ${selected.length} selected advance(s)?`,
            message: (
                <>
                    <p>The selected advances and all their expenses, deposits and settlement records will be permanently deleted.</p>
                    <p className="pc-confirm-warn">This cannot be undone.</p>
                </>
            ),
            confirmText: `Delete ${selected.length} Selected`,
            run: async () => {
                const response = await axios.post("/api/petty-cash/bulk-delete", {
                    scope: "filtered",
                    ids: selected,
                    search: applied.search,
                    store_id: applied.store,
                    status: applied.status,
                    from: applied.from,
                    to: applied.to
                });
                if (!response.data?.success) throw new Error(response.data?.message || "Unable to delete records.");
                setNotice(response.data?.message || "Selected advances deleted.");
            }
        });
    };

    const runConfirm = async () => {
        if (!confirm) return;
        try {
            setBusy(true);
            setError("");
            await confirm.run();
            setConfirm(null);
            await load(applied);
        } catch (err) {
            setConfirm(null);
            setError(apiError(err, "Action failed."));
        } finally {
            setBusy(false);
        }
    };

    const exportRows = async (format = "csv") => {
        if (!sorted.length) return;
        await exportTableData({
            headers: ["Advance No", "Date", "Store", "Paid By", "Employee", "Purpose", "Advance", "Expense", "Deposit", "Balance", "Status"],
            rows: sorted.map((a) => [
                a.advance_no,
                dmy(a.advance_date),
                a.store_name,
                a.paid_by_name,
                a.received_by_name,
                a.purpose,
                Number(a.advance_amount || 0).toFixed(2),
                Number(a.total_expense || 0).toFixed(2),
                Number(a.total_deposit || 0).toFixed(2),
                Number(a.balance || 0).toFixed(2),
                a.status
            ]),
            filename: `petty-cash-${new Date().toISOString().slice(0, 10)}`,
            format,
            title: "Petty Cash Advances"
        });
    };

    const emailReport = async () => {
        try {
            setEmailing(true);
            setError("");
            const { data } = await axios.post("/api/petty-cash/email-report", {
                search: applied.search,
                store_id: applied.store,
                status: applied.status,
                from: applied.from,
                to: applied.to
            });
            setNotice(data?.message || "Report emailed.");
        } catch (err) {
            setError(apiError(err, "Unable to email the report."));
        } finally {
            setEmailing(false);
        }
    };

    const kpis = [
        { key: "advance", label: "1. Advance Given", value: money(summary.total_advanced), hint: "Cash issued to employees", icon: FaMoneyBillWave, tone: "violet", to: "/petty-cash/advances" },
        { key: "expense", label: "2. Expenses (With Bills)", value: money(summary.total_expense), hint: "Verified purchase spend", icon: FaReceipt, tone: "blue", to: "/petty-cash/expenses" },
        { key: "deposit", label: "3. Unused Cash Return", value: money(summary.total_deposit), hint: "Cash returned to manager", icon: FaUniversity, tone: "amber", to: "/petty-cash/deposits" },
        { key: "open", label: "4. Open Advances", value: String(summary.open_advances ?? 0), hint: `Awaiting final settlement · ${money(summary.outstanding_balance)} outstanding`, icon: FaClipboardCheck, tone: "green" }
    ];

    return (
        <div className="pc-page pp-premium">
            <PremiumHero
                icon={manage ? FaListAlt : FaWallet}
                eyebrow={manage ? "Petty Cash · Manage Advances" : "Cash Control · Petty Cash"}
                title={manage ? "Manage Advances" : "Petty Cash Advance & Settlement"}
                badge="Live position"
                badgeTone="mint"
                subtitle="Manager gives advance → expense with bills → return unused cash → settlement."
                actions={access.canAdd && (
                    <button type="button" className="pp-hero-btn pp-hero-btn--solid" onClick={() => navigate("/petty-cash/new")}>
                        <FaPlus /> New Advance
                    </button>
                )}
            />

            <PettyNav />

            {error && <div className="pc-alert pc-alert--error"><FaExclamationCircle /> {error}<button type="button" onClick={() => setError("")}>×</button></div>}
            {notice && <div className="pc-alert pc-alert--success"><FaCheckCircle /> {notice}<button type="button" onClick={() => setNotice("")}>×</button></div>}

            {!manage && (
                <div className="pc-kpis">
                    {kpis.map(({ key, label, value, hint, icon: Icon, tone, to }) => (
                        <button type="button" key={key} className={`pc-kpi pc-kpi--${tone}`} onClick={() => to && navigate(to)} disabled={!to}>
                            <span className="pc-kpi-icon"><Icon /></span>
                            <span className="pc-kpi-copy">
                                <small>{label}</small>
                                <strong>{loading ? "…" : value}</strong>
                                <em>{hint}</em>
                            </span>
                            {to && <span className="pc-kpi-go"><FaArrowRight /></span>}
                        </button>
                    ))}
                </div>
            )}

            {/* FILTERS */}
            <form className="pc-card pc-filters" onSubmit={(e) => { e.preventDefault(); load(filters); }}>
                <label className="pc-filter pc-filter--search">
                    <span>Search</span>
                    <div className="pc-input-icon"><FaSearch /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Advance No, Employee, Purpose..." /></div>
                </label>
                <label className="pc-filter">
                    <span>Store</span>
                    <select value={filters.store} onChange={(e) => setFilters({ ...filters, store: e.target.value })}>
                        <option value="">All Stores</option>
                        {options.stores.map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
                    </select>
                </label>
                <label className="pc-filter">
                    <span>Status</span>
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="PARTIALLY_SETTLED">In Progress</option>
                        <option value="SETTLED">Settled</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </label>
                <label className="pc-filter">
                    <span>From Date</span>
                    <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                </label>
                <label className="pc-filter">
                    <span>To Date</span>
                    <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                </label>
                <div className="pc-filter-actions">
                    <button type="submit" className="pc-btn pc-btn--primary"><FaFilter /> Apply</button>
                    <button type="button" className="pc-btn pc-btn--ghost" onClick={() => { setFilters(EMPTY_FILTERS); load(EMPTY_FILTERS); }}><FaUndo /> Clear</button>
                </div>
            </form>

            {/* TABLE */}
            <section className="pc-card">
                <header className="pc-card-head">
                    <span className="pc-card-icon"><FaReceipt /></span>
                    <div>
                        <h2>{manage ? "Advance List" : "Recent Advances"}</h2>
                        <p>{manage ? "All petty cash advances, expenses, deposits and settlement status" : "Advance, expense, deposit and outstanding balance"}</p>
                    </div>
                    <div className="pc-card-tools">
                        <ExportButton onExport={exportRows} disabled={!sorted.length} />
                        <button type="button" className="pc-btn pc-btn--soft-blue" onClick={emailReport} disabled={emailing || !sorted.length}><FaPaperPlane /> {emailing ? "Sending..." : "Email Report"}</button>
                        <button type="button" className="pc-btn pc-btn--ghost" onClick={() => navigate("/petty-cash/audit-trail")}><FaHistory /> Audit Trail</button>
                        {access.canEdit && (
                            <button type="button" className="pc-btn pc-btn--danger-solid" onClick={deleteSelected} disabled={!selected.length}>
                                <FaTrash /> Delete Selected{selected.length ? ` (${selected.length})` : ""}
                            </button>
                        )}
                    </div>
                </header>

                <div className="pc-table-wrap">
                    <table className="pc-table">
                        <thead>
                            <tr>
                                <th className="pc-col-check">
                                    <input type="checkbox" checked={allPageSelected} onChange={togglePage} disabled={!pageIds.length} aria-label="Select all on this page" />
                                </th>
                                <th>#</th>
                                <SortTh label="Advance No." k="advance_no" sort={sort} setSort={setSort} />
                                <SortTh label="Date" k="advance_date" sort={sort} setSort={setSort} />
                                <SortTh label="Store" k="store_name" sort={sort} setSort={setSort} />
                                <SortTh label="Employee" k="received_by_name" sort={sort} setSort={setSort} />
                                <SortTh label="Purpose" k="purpose" sort={sort} setSort={setSort} />
                                <SortTh label="Advance (₹)" k="advance_amount" sort={sort} setSort={setSort} className="pc-num" />
                                <SortTh label="Expense (₹)" k="total_expense" sort={sort} setSort={setSort} className="pc-num" />
                                <SortTh label="Deposit (₹)" k="total_deposit" sort={sort} setSort={setSort} className="pc-num" />
                                <SortTh label="Balance (₹)" k="balance" sort={sort} setSort={setSort} className="pc-num" />
                                <SortTh label="Status" k="status" sort={sort} setSort={setSort} />
                                <th className="pc-col-actions">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="13" className="pc-empty"><PremiumLoader compact title="Loading petty cash" /></td></tr>
                            ) : pager.slice.length ? pager.slice.map((a, index) => (
                                <tr key={a.id} className={selected.includes(Number(a.id)) ? "is-selected" : ""}>
                                    <td className="pc-col-check">
                                        <input type="checkbox" checked={selected.includes(Number(a.id))} disabled={!canDeleteRow(a)} onChange={() => toggleRow(Number(a.id))} aria-label={`Select ${a.advance_no}`} />
                                    </td>
                                    <td className="pc-muted">{pager.from + index}</td>
                                    <td><strong className="pc-strong">{a.advance_no}</strong></td>
                                    <td>{dmy(a.advance_date)}</td>
                                    <td>{a.store_name || "—"}</td>
                                    <td>{a.received_by_name || "—"}</td>
                                    <td className="pc-purpose" title={a.purpose || ""}>{a.purpose || "—"}</td>
                                    <td className="pc-num pc-strong">{money(a.advance_amount)}</td>
                                    <td className="pc-num">{money(a.total_expense)}</td>
                                    <td className="pc-num">{money(a.total_deposit)}</td>
                                    <td className={`pc-num pc-strong ${Math.abs(Number(a.balance)) < 0.005 ? "pc-pos" : "pc-warn"}`}>{money(a.balance)}</td>
                                    <td><StatusPill status={a.status} /></td>
                                    <td className="pc-col-actions">
                                        <div className="pc-row-actions">
                                            <button type="button" className="pc-act pc-act--view" onClick={() => navigate(`/petty-cash/${a.id}`)}><FaEye /> View</button>
                                            {canEditRow(a) && (
                                                <button type="button" className="pc-act pc-act--edit" onClick={() => navigate(`/petty-cash/${a.id}/edit`)}><FaEdit /> Edit</button>
                                            )}
                                            {canDeleteRow(a) && (
                                                <button type="button" className="pc-act pc-act--delete" onClick={() => deleteOne(a)}><FaTrash /> Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="13" className="pc-empty">No petty cash advances found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager pager={pager} />
            </section>

            {!manage && (
                <div className="pc-two-col">
                    <section className="pc-card">
                        <header className="pc-card-head">
                            <span className="pc-card-icon pc-card-icon--teal"><FaStore /></span>
                            <div><h2>Store Wise Summary</h2><p>Cash movement by store</p></div>
                        </header>
                        <div className="pc-table-wrap">
                            <table className="pc-table pc-table--compact">
                                <thead><tr><th>Store</th><th className="pc-num">Advances</th><th className="pc-num">Expenses</th><th className="pc-num">Deposits</th><th className="pc-num">Closing</th></tr></thead>
                                <tbody>
                                    {storeWise.length ? storeWise.map((s) => (
                                        <tr key={s.store_name}>
                                            <td className="pc-strong">{s.store_name}</td>
                                            <td className="pc-num">{money(s.advances_given)}</td>
                                            <td className="pc-num">{money(s.total_expenses)}</td>
                                            <td className="pc-num">{money(s.total_deposits)}</td>
                                            <td className="pc-num pc-strong">{money(Number(s.advances_given) - Number(s.total_expenses) - Number(s.total_deposits))}</td>
                                        </tr>
                                    )) : <tr><td colSpan="5" className="pc-empty">No store activity yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    <section className="pc-card">
                        <header className="pc-card-head">
                            <span className="pc-card-icon pc-card-icon--amber"><FaUser /></span>
                            <div><h2>Person Wise Outstanding</h2><p>Employee accountability</p></div>
                        </header>
                        <div className="pc-table-wrap">
                            <table className="pc-table pc-table--compact">
                                <thead><tr><th>Employee</th><th className="pc-num">Total Advance</th><th className="pc-num">Settled</th><th className="pc-num">Outstanding</th></tr></thead>
                                <tbody>
                                    {personWise.length ? personWise.map((p) => {
                                        const outstanding = Number(p.total_advance) - Number(p.settled);
                                        return (
                                            <tr key={p.employee}>
                                                <td className="pc-strong">{p.employee}</td>
                                                <td className="pc-num">{money(p.total_advance)}</td>
                                                <td className="pc-num">{money(p.settled)}</td>
                                                <td className={`pc-num pc-strong ${outstanding > 0 ? "pc-warn" : "pc-pos"}`}>{money(outstanding)}</td>
                                            </tr>
                                        );
                                    }) : <tr><td colSpan="4" className="pc-empty">No employee activity yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}

            {confirm && (
                <ConfirmModal
                    title={confirm.title}
                    message={confirm.message}
                    confirmText={confirm.confirmText}
                    busy={busy}
                    onConfirm={runConfirm}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}

export default PettyCash;

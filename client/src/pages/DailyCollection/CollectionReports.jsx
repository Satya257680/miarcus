import React, { useEffect, useMemo, useState } from "react";
import { FaChartLine, FaMoneyBillWave, FaSyncAlt, FaFileExport } from "react-icons/fa";
import { getCollectionReports, getDailyCollectionStores } from "../../services/billingService";
import "../../styles/CollectionReports.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const readAccess = () => {
    let user = {};
    let permissions = {};
    try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch {}
    try { permissions = JSON.parse(localStorage.getItem("permissions") || "{}"); } catch {}
    const admin = [true, 1, "1"].includes(user?.administrator) || [true, 1, "1"].includes(user?.is_admin);
    const permission = permissions?.["Daily Collection"] || "None";
    return {
        admin,
        canView: admin || ["View", "Add", "Edit", "Full"].includes(permission)
    };
};

const PERIODS = [
    { value: "daily", label: "Every Day" },
    { value: "weekly", label: "Every Week" },
    { value: "monthly", label: "Every Month" },
    { value: "yearly", label: "Every Year" }
];

export default function CollectionReports() {
    const { admin, canView } = useMemo(readAccess, []);
    const [date, setDate] = useState(today());
    const [period, setPeriod] = useState("daily");
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState("");
    const [reports, setReports] = useState([]);
    const [totals, setTotals] = useState({});
    const [label, setLabel] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadStores = async () => {
        try {
            const response = await getDailyCollectionStores();
            const nextStores = response.data?.stores || [];
            setStores(nextStores);
            if (!admin && nextStores.length && !nextStores.some((store) => String(store.id) === String(selectedStore))) {
                setSelectedStore(String(nextStores[0].id));
            }
        } catch (err) {
            setStores([]);
            setError(err.response?.data?.message || "Unable to load collection report stores.");
        }
    };

    const loadReports = async () => {
        if (!canView || !selectedStore) return;
        try {
            setLoading(true);
            setError("");
            const params = { period, date, store_id: selectedStore };
            const response = await getCollectionReports(params);
            setReports(response.data?.reports || []);
            setTotals(response.data?.totals || {});
            setLabel(response.data?.label || "");
        } catch (err) {
            setReports([]);
            setTotals({});
            setError(err.response?.data?.message || "Unable to load Collection Reports.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (canView) loadStores(); }, [canView, admin]);
    useEffect(() => { if (canView && selectedStore) loadReports(); }, [canView, selectedStore, period, date]);

    const filteredReports = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return reports;
        return reports.filter((row) => [row.store_name, row.store_code, row.manager_name].some((v) => String(v || "").toLowerCase().includes(keyword)));
    }, [reports, search]);

    const exportCsv = () => {
        if (!filteredReports.length) return;
        const headers = ["Store", "Store Code", "Manager", "From Date", "To Date", "Days", "Submitted Days", "Missing Days", "Locked Days", "Bills", "System Billed", "UPI", "Cash", "Bank Transfer", "Card", "Total Collected", "Variance"];
        const rows = filteredReports.map((row) => [
            row.store_name, row.store_code, row.manager_name, row.from_date, row.to_date,
            row.days, row.submitted_days, row.missing_days, row.locked_days, row.bill_count,
            row.system_billed, row.upi_amount, row.cash_amount, row.bank_transfer_amount,
            row.card_amount, row.total_collected, row.variance
        ]);
        const csv = [headers, ...rows].map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `collection-reports-${period}-${date}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    if (!canView) return <div className="collection-reports-page"><div className="collection-reports-empty">You do not have permission to view Collection Reports.</div></div>;

    return (
        <div className="collection-reports-page">
            <section className="collection-reports-hero">
                <div>
                    <div className="collection-reports-eyebrow"><FaChartLine /> Daily Collection module</div>
                    <h1>Collection Reports</h1>
                    <p>Review Daily Collection history by day, week, month or year, with store-wise totals and reconciliation.</p>
                </div>
            </section>

            <section className="collection-reports-filters">
                <div className="collection-periods">
                    {PERIODS.map((item) => (
                        <button key={item.value} type="button" className={period === item.value ? "active" : ""} onClick={() => setPeriod(item.value)}>{item.label}</button>
                    ))}
                </div>
                <div className="collection-filter-row">
                    <label><span>Report date</span><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></label>
                    <label><span>Store</span>
                        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                            <option value="">Select store</option>
                            {admin && <option value="all">All stores</option>}
                            {stores.map((store) => <option key={store.id} value={store.id}>{store.store_name}{store.store_code ? ` (${store.store_code})` : ""}</option>)}
                        </select>
                    </label>
                    <button className="collection-refresh" type="button" onClick={loadReports} disabled={loading || !selectedStore}><FaSyncAlt /> Refresh</button>
                    <button className="collection-export" type="button" onClick={exportCsv} disabled={!selectedStore || !filteredReports.length}><FaFileExport /> Export</button>
                </div>
            </section>

            <div className="collection-reports-period-label"><strong>{selectedStore ? (label || "Selected period") : "Select a store to view collection reports"}</strong><span>{selectedStore === "all" ? "All active stores" : selectedStore ? "Selected store" : "No store selected"}</span></div>

            {error && <div className="collection-reports-alert">{error}</div>}

            {selectedStore && <section className="collection-summary-grid">
                <div><span>Stores</span><strong>{totals.stores || 0}</strong></div>
                <div><span>Submitted Days</span><strong>{totals.submitted_days || 0}</strong></div>
                <div><span>Missing Days</span><strong>{totals.missing_days || 0}</strong></div>
                <div><span>Locked Days</span><strong>{totals.locked_days || 0}</strong></div>
                <div><span>System Billed</span><strong>{money(totals.system_billed)}</strong></div>
                <div><span>Total Collected</span><strong>{money(totals.total_collected)}</strong></div>
                <div><span>Variance</span><strong className={Math.abs(Number(totals.variance || 0)) < 0.01 ? "match" : "mismatch"}>{money(totals.variance)}</strong></div>
            </section>}

            <section className="collection-report-table-wrap">
                {!selectedStore ? <div className="collection-reports-empty">Select a specific store or choose All stores to display Collection Reports.</div> : loading ? <div className="collection-reports-empty">Loading Collection Reports...</div> : !filteredReports.length ? <div className="collection-reports-empty">No Collection data is available for the selected period.</div> : (
                    <div className="collection-report-scroll">
                        <table className="collection-report-table">
                            <thead><tr><th>Store</th><th>Period</th><th>Days</th><th>Submitted</th><th>Missing</th><th>Locked</th><th>Bills</th><th>System Billed</th><th>UPI</th><th>Cash</th><th>Bank</th><th>Card</th><th>Collected</th><th>Variance</th></tr></thead>
                            <tbody>{filteredReports.map((row) => (
                                <tr key={`${row.store_id}-${row.from_date}-${row.to_date}`}>
                                    <td><strong>{row.store_name}</strong><small>{row.store_code || ""}{row.manager_name ? ` • ${row.manager_name}` : ""}</small></td>
                                    <td>{row.from_date === row.to_date ? row.from_date : `${row.from_date} → ${row.to_date}`}</td>
                                    <td>{row.days}</td>
                                    <td><span className="count submitted">{row.submitted_days}</span></td>
                                    <td><span className="count missing">{row.missing_days}</span></td>
                                    <td><span className="count locked">{row.locked_days}</span></td>
                                    <td>{row.bill_count}</td>
                                    <td>{money(row.system_billed)}</td>
                                    <td>{money(row.upi_amount)}</td>
                                    <td>{money(row.cash_amount)}</td>
                                    <td>{money(row.bank_transfer_amount)}</td>
                                    <td>{money(row.card_amount)}</td>
                                    <td>{money(row.total_collected)}</td>
                                    <td className={Math.abs(Number(row.variance || 0)) < 0.01 ? "match" : "mismatch"}>{money(row.variance)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </section>

            {selectedStore && <section className="collection-payment-summary">
                <div><FaMoneyBillWave /><span>UPI</span><strong>{money(totals.upi_amount)}</strong></div>
                <div><FaMoneyBillWave /><span>Cash</span><strong>{money(totals.cash_amount)}</strong></div>
                <div><FaMoneyBillWave /><span>Bank Transfer</span><strong>{money(totals.bank_transfer_amount)}</strong></div>
                <div><FaMoneyBillWave /><span>Card</span><strong>{money(totals.card_amount)}</strong></div>
            </section>}
        </div>
    );
}

import React, { useEffect, useMemo, useState } from "react";
import { FaChartBar, FaDownload, FaMoneyBillWave, FaSyncAlt } from "react-icons/fa";
import { getDailyCollections } from "../../services/billingService";
import "../../styles/DailyCollection.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DailyCollectionReport() {
    const [date, setDate] = useState(today());
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await getDailyCollections({ date });
            setReports(response.data?.reports || []);
        } catch (err) {
            setReports([]);
            setError(err.response?.data?.message || "Unable to load the Daily Collection report.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [date]);

    const totals = useMemo(() => reports.reduce((acc, row) => {
        const summary = row.summary || {};
        acc.billed += Number(summary.total_billed ?? row.total_billed ?? 0);
        acc.collected += Number(row.total_collected || 0);
        acc.upi += Number(row.upi_amount || 0);
        acc.cash += Number(row.cash_amount || 0);
        acc.bank += Number(row.bank_transfer_amount || 0);
        acc.card += Number(row.card_amount || 0);
        if (row.status === "submitted") acc.submitted += 1;
        if (row.status === "missing") acc.missing += 1;
        if (row.status === "locked") acc.locked += 1;
        return acc;
    }, { billed: 0, collected: 0, upi: 0, cash: 0, bank: 0, card: 0, submitted: 0, missing: 0, locked: 0 }), [reports]);

    const exportCsv = () => {
        const headers = ["Date", "Store", "Store Code", "Status", "Bill Count", "System Billed", "UPI", "Cash", "Bank Transfer", "Card", "Total Collected", "Variance", "Submitted By", "Submitted At"];
        const rows = reports.map((row) => [
            row.report_date, row.store_name, row.store_code, row.status,
            row.summary?.bill_count ?? row.bill_count ?? 0,
            row.summary?.total_billed ?? row.total_billed ?? 0,
            row.upi_amount || 0, row.cash_amount || 0, row.bank_transfer_amount || 0,
            row.card_amount || 0, row.total_collected || 0, row.variance || 0,
            row.submitted_by_name || "", row.submitted_at || ""
        ]);
        const csv = [headers, ...rows].map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `daily-collection-${date}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="daily-collection-page">
            <section className="daily-collection-hero">
                <div>
                    <div className="eyebrow"><FaChartBar /> Daily Collection module</div>
                    <h1>Daily Data Report</h1>
                    <p>Review the daily collection submitted by each assigned store, including billed amount, payment-method split, status and reconciliation variance.</p>
                </div>
                <button className="daily-report-export" onClick={exportCsv} disabled={!reports.length}><FaDownload /> Export CSV</button>
            </section>

            <section className="daily-collection-toolbar">
                <label>
                    <span>Report date</span>
                    <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <button onClick={load} disabled={loading}><FaSyncAlt /> Refresh</button>
            </section>

            {error && <div className="collection-alert error">{error}</div>}

            <section className="daily-report-summary-grid">
                <div><span>Stores</span><strong>{reports.length}</strong></div>
                <div><span>Submitted</span><strong>{totals.submitted}</strong></div>
                <div><span>Missing</span><strong>{totals.missing}</strong></div>
                <div><span>Locked</span><strong>{totals.locked}</strong></div>
                <div><span>System billed</span><strong>{money(totals.billed)}</strong></div>
                <div><span>Collected</span><strong>{money(totals.collected)}</strong></div>
            </section>

            <section className="daily-report-table-wrap">
                {loading ? <div className="collection-empty">Loading daily report...</div> : !reports.length ? <div className="collection-empty">No Daily Collection data for this date.</div> : (
                    <div className="daily-report-table-scroll">
                        <table className="daily-report-table">
                            <thead><tr><th>Store</th><th>Status</th><th>Bills</th><th>System Total</th><th>UPI</th><th>Cash</th><th>Bank</th><th>Card</th><th>Collected</th><th>Variance</th><th>Submitted By</th></tr></thead>
                            <tbody>{reports.map((row) => {
                                const billed = Number(row.summary?.total_billed ?? row.total_billed ?? 0);
                                const variance = Number(row.variance ?? (Number(row.total_collected || 0) - billed));
                                return <tr key={row.id}>
                                    <td><strong>{row.store_name}</strong><small>{row.store_code || ""}</small></td>
                                    <td><span className={`report-status ${row.status}`}>{row.status}</span></td>
                                    <td>{Number(row.summary?.bill_count ?? row.bill_count ?? 0)}</td>
                                    <td>{money(billed)}</td>
                                    <td>{money(row.upi_amount)}</td>
                                    <td>{money(row.cash_amount)}</td>
                                    <td>{money(row.bank_transfer_amount)}</td>
                                    <td>{money(row.card_amount)}</td>
                                    <td>{money(row.total_collected)}</td>
                                    <td className={Math.abs(variance) < 0.01 ? "report-match" : "report-mismatch"}>{money(variance)}</td>
                                    <td>{row.submitted_by_name || "—"}</td>
                                </tr>;
                            })}</tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="daily-report-payment-summary">
                <div><FaMoneyBillWave /><span>UPI</span><strong>{money(totals.upi)}</strong></div>
                <div><FaMoneyBillWave /><span>Cash</span><strong>{money(totals.cash)}</strong></div>
                <div><FaMoneyBillWave /><span>Bank Transfer</span><strong>{money(totals.bank)}</strong></div>
                <div><FaMoneyBillWave /><span>Card</span><strong>{money(totals.card)}</strong></div>
            </section>
        </div>
    );
}

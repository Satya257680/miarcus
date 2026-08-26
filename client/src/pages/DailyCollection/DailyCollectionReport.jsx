import React, { useEffect, useMemo, useState } from "react";
import { FaChartBar, FaMoneyBillWave, FaSyncAlt } from "react-icons/fa";
import PageToolbar from "../../components/common/PageToolbar";
import ActionButtons from "../../components/common/ActionButtons";
import BulkUploadModal from "../../components/common/BulkUploadModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DailyCollectionViewModal from "../../components/DailyCollectionViewModal";
import {
    getDailyCollections,
    getDailyCollectionById,
    bulkUploadDailyCollections,
    deleteDailyCollection,
    deleteAllDailyCollections
} from "../../services/billingService";
import "../../styles/DailyCollection.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getUserPermissions = () => {
    let user = {};
    let permissions = {};
    try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch {}
    try { permissions = JSON.parse(localStorage.getItem("permissions") || "{}"); } catch {}
    const admin = [true, 1, "1"].includes(user?.administrator) || [true, 1, "1"].includes(user?.is_admin);
    const permission = permissions?.["Daily Collection"] || "None";
    return {
        admin,
        canView: admin || ["View", "Add", "Edit", "Full"].includes(permission),
        canAdd: admin || ["Add", "Edit", "Full"].includes(permission),
        canDelete: admin,
    };
};

export default function DailyCollectionReport() {
    const permissions = useMemo(getUserPermissions, []);
    const { canView, canAdd, canDelete } = permissions;
    const [date, setDate] = useState(today());
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [search, setSearch] = useState("");
    const [bulkOpen, setBulkOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
    const [viewReport, setViewReport] = useState(null);

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

    useEffect(() => {
        if (!canView) {
            setLoading(false);
            return;
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const filteredReports = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return reports;
        return reports.filter((row) => [row.store_name, row.store_code, row.manager_name, row.submitted_by_name, row.status].some((value) => String(value || "").toLowerCase().includes(keyword)));
    }, [reports, search]);

    const totals = useMemo(() => filteredReports.reduce((acc, row) => {
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
    }, { billed: 0, collected: 0, upi: 0, cash: 0, bank: 0, card: 0, submitted: 0, missing: 0, locked: 0 }), [filteredReports]);

    const exportCsv = () => {
        if (!filteredReports.length) return;
        const headers = ["Date", "Store", "Store Code", "Status", "Bill Count", "System Billed", "UPI", "Cash", "Bank Transfer", "Card", "Total Collected", "Variance", "Submitted By", "Submitted At"];
        const rows = filteredReports.map((row) => [
            row.report_date, row.store_name, row.store_code, row.status,
            row.summary?.bill_count ?? row.bill_count ?? 0,
            row.summary?.total_billed ?? row.total_billed ?? 0,
            row.upi_amount || 0, row.cash_amount || 0, row.bank_transfer_amount || 0,
            row.card_amount || 0, row.total_collected || 0, row.variance || 0,
            row.submitted_by_name || "", row.submitted_at || ""
        ]);
        const csv = [headers, ...rows].map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `daily-collection-report-${date}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handleView = async (row) => {
        try {
            const response = await getDailyCollectionById(row.id);
            setViewReport(response.data?.data || response.data || row);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to view Daily Collection record.");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDailyCollection(deleteId);
            setSuccess("Daily Collection record deleted successfully.");
            setDeleteId(null);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to delete Daily Collection record.");
        }
    };

    const handleDeleteAll = async () => {
        try {
            const response = await deleteAllDailyCollections();
            setSuccess(response.data?.message || "All Daily Collection records deleted successfully.");
            setDeleteAllOpen(false);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to delete all Daily Collection records.");
        }
    };

    if (!canView) {
        return <div className="daily-collection-page"><div className="collection-empty">You do not have permission to view Daily Collection reports.</div></div>;
    }

    return (
        <div className="daily-collection-page">
            <section className="daily-collection-hero">
                <div>
                    <div className="eyebrow"><FaChartBar /> Daily Collection module</div>
                    <h1>Daily Data Report</h1>
                    <p>Review the daily collection submitted by each assigned store, including billed amount, payment-method split, status and reconciliation variance.</p>
                </div>
            </section>

            <PageToolbar
                search={search}
                setSearch={setSearch}
                placeholder="Search store, manager or status..."
                showExport={filteredReports.length > 0}
                onExport={exportCsv}
                showBulk={canAdd}
                onBulk={() => setBulkOpen(true)}
                showDeleteAll={canDelete}
                onDeleteAll={() => setDeleteAllOpen(true)}
            />

            <section className="daily-collection-toolbar">
                <label>
                    <span>Report date</span>
                    <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <button onClick={load} disabled={loading}><FaSyncAlt /> Refresh</button>
            </section>

            {error && <div className="collection-alert error">{error}</div>}
            {success && <div className="collection-alert success">{success}</div>}

            <section className="daily-report-summary-grid">
                <div><span>Stores</span><strong>{filteredReports.length}</strong></div>
                <div><span>Submitted</span><strong>{totals.submitted}</strong></div>
                <div><span>Missing</span><strong>{totals.missing}</strong></div>
                <div><span>Locked</span><strong>{totals.locked}</strong></div>
                <div><span>System billed</span><strong>{money(totals.billed)}</strong></div>
                <div><span>Collected</span><strong>{money(totals.collected)}</strong></div>
            </section>

            <section className="daily-report-table-wrap">
                {loading ? <div className="collection-empty">Loading daily report...</div> : !filteredReports.length ? <div className="collection-empty">No Daily Collection data for this date.</div> : (
                    <div className="daily-report-table-scroll">
                        <table className="daily-report-table">
                            <thead><tr><th>Store</th><th>Status</th><th>Bills</th><th>System Total</th><th>UPI</th><th>Cash</th><th>Bank</th><th>Card</th><th>Collected</th><th>Variance</th><th>Submitted By</th><th>Actions</th></tr></thead>
                            <tbody>{filteredReports.map((row) => {
                                const billed = Number(row.summary?.total_billed ?? row.total_billed ?? 0);
                                const variance = Number(row.variance ?? (Number(row.total_collected || 0) - billed));
                                const status = row.status === "submitted" ? "Submitted" : row.status === "locked" ? "Locked" : "Not Submitted";
                                return <tr key={row.id}>
                                    <td><strong>{row.store_name}</strong><small>{row.store_code || ""}</small></td>
                                    <td><span className={`report-status ${row.status}`}>{status}</span></td>
                                    <td>{Number(row.summary?.bill_count ?? row.bill_count ?? 0)}</td>
                                    <td>{money(billed)}</td>
                                    <td>{money(row.upi_amount)}</td>
                                    <td>{money(row.cash_amount)}</td>
                                    <td>{money(row.bank_transfer_amount)}</td>
                                    <td>{money(row.card_amount)}</td>
                                    <td>{money(row.total_collected)}</td>
                                    <td className={Math.abs(variance) < 0.01 ? "report-match" : "report-mismatch"}>{money(variance)}</td>
                                    <td>{row.submitted_by_name || "—"}</td>
                                    <td><ActionButtons showView onView={() => handleView(row)} showDelete={canDelete} onDelete={() => setDeleteId(row.id)} /></td>
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

            <BulkUploadModal
                isOpen={bulkOpen}
                onClose={() => setBulkOpen(false)}
                uploadFunction={bulkUploadDailyCollections}
                onSuccess={load}
                title="Bulk Upload Daily Collection"
                acceptedFile=".csv,.xlsx,.xls"
            />

            <ConfirmDialog
                open={Boolean(deleteId)}
                title="Delete Daily Collection Record"
                message="This Daily Collection record will be permanently deleted. Any access block linked to the same store and date will also be cleared."
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />

            <ConfirmDialog
                open={deleteAllOpen}
                title="Delete All Daily Collection Records"
                message="Every Daily Collection report and active Daily Collection access block will be permanently deleted. This action cannot be undone."
                confirmText="Delete All"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleDeleteAll}
                onCancel={() => setDeleteAllOpen(false)}
            />

            <DailyCollectionViewModal report={viewReport} onClose={() => setViewReport(null)} />
        </div>
    );
}

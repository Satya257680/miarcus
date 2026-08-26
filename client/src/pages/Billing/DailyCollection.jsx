import React, { useEffect, useMemo, useState } from "react";
import {
    FaChartBar,
    FaMoneyBillWave,
    FaSyncAlt,
    FaEye,
    FaTrashAlt
} from "react-icons/fa";
import PageToolbar from "../../components/common/PageToolbar";
import BulkUploadModal from "../../components/common/BulkUploadModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DailyCollectionViewModal from "../../components/DailyCollectionViewModal";
import {
    getDailyCollections,
    getDailyCollectionStores,
    getDailyCollectionById,
    bulkUploadDailyCollections,
    deleteDailyCollection,
    deleteAllDailyCollections,
    submitDailyCollection
} from "../../services/billingService";
import "../../styles/DailyCollection.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const readAccess = () => {
    let user = {};
    let permissions = {};
    try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch {}
    try { permissions = JSON.parse(localStorage.getItem("permissions") || "{}"); } catch {}

    const admin =
        [true, 1, "1"].includes(user?.administrator) ||
        [true, 1, "1"].includes(user?.is_admin);

    const permission = permissions?.["Daily Collection"] || "None";

    return {
        admin,
        canView: admin || ["View", "Add", "Edit", "Full"].includes(permission),
        canAdd: admin || ["Add", "Edit", "Full"].includes(permission),
        canDelete: admin
    };
};

const emptyEntry = () => ({
    upi_amount: "",
    cash_amount: "",
    bank_transfer_amount: "",
    card_amount: "",
    notes: ""
});

export default function DailyCollection() {
    const access = useMemo(readAccess, []);
    const { admin, canView, canAdd, canDelete } = access;

    const [date, setDate] = useState(today());
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState("");
    const [reports, setReports] = useState([]);
    const [entries, setEntries] = useState({});
    const [loadingStores, setLoadingStores] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [search, setSearch] = useState("");
    const [bulkOpen, setBulkOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
    const [viewReport, setViewReport] = useState(null);
    const [blockedStore, setBlockedStore] = useState(null);
    const [submittingId, setSubmittingId] = useState(null);

    const loadStores = async () => {
        try {
            setLoadingStores(true);
            setError("");
            const response = await getDailyCollectionStores();
            const nextStores = response.data?.stores || [];
            setStores(nextStores);

            if (!admin) {
                if (nextStores.length === 1) {
                    setSelectedStore(String(nextStores[0].id));
                } else if (nextStores.length === 0) {
                    setSelectedStore("");
                    setError("No store is assigned to your Daily Collection manager account.");
                } else if (!nextStores.some((store) => String(store.id) === String(selectedStore))) {
                    setSelectedStore("");
                }
            }
        } catch (err) {
            setStores([]);
            setSelectedStore("");
            setError(err.response?.data?.message || "Unable to load your Daily Collection store assignment.");
        } finally {
            setLoadingStores(false);
        }
    };

    const load = async () => {
        if (!canView || loadingStores) return;

        // Nothing selected for administrators means nothing is shown.
        if (admin && !selectedStore) {
            setReports([]);
            setBlockedStore(null);
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");
            setBlockedStore(null);

            const params = { date };
            if (selectedStore && selectedStore !== "all") {
                params.store_id = Number(selectedStore);
            }

            const response = await getDailyCollections(params);
            const nextReports = response.data?.reports || [];
            setReports(nextReports);

            setEntries((previous) => {
                const next = { ...previous };
                nextReports.forEach((report) => {
                    if (!next[report.id]) {
                        next[report.id] = {
                            upi_amount: report.upi_amount ?? "",
                            cash_amount: report.cash_amount ?? "",
                            bank_transfer_amount: report.bank_transfer_amount ?? "",
                            card_amount: report.card_amount ?? "",
                            notes: report.notes ?? ""
                        };
                    }
                });
                return next;
            });
        } catch (err) {
            setReports([]);
            if (err.response?.status === 423 && err.response?.data?.blocked) {
                setBlockedStore(err.response.data.block || null);
                setError(err.response.data.message || "Daily Collection access is blocked for this store.");
            } else {
                setError(err.response?.data?.message || "Unable to load Daily Collection entry.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canView) loadStores();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView, admin]);

    useEffect(() => {
        if (canView && !loadingStores) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, selectedStore, loadingStores]);

    const filteredReports = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return reports;

        return reports.filter((row) =>
            [
                row.store_name,
                row.store_code,
                row.manager_name,
                row.status
            ].some((value) => String(value || "").toLowerCase().includes(keyword))
        );
    }, [reports, search]);

    const updateEntry = (reportId, field, value) => {
        setEntries((previous) => ({
            ...previous,
            [reportId]: {
                ...(previous[reportId] || emptyEntry()),
                [field]: value
            }
        }));
    };

    const submit = async (report) => {
        if (!canAdd || !report?.id) return;

        const values = entries[report.id] || emptyEntry();
        try {
            setSubmittingId(report.id);
            setError("");
            setSuccess("");

            await submitDailyCollection({
                report_id: Number(report.id),
                store_id: Number(report.store_id),
                report_date: report.report_date || date,
                upi_amount: Number(values.upi_amount || 0),
                cash_amount: Number(values.cash_amount || 0),
                bank_transfer_amount: Number(values.bank_transfer_amount || 0),
                card_amount: Number(values.card_amount || 0),
                notes: values.notes || ""
            });

            setSuccess(`${report.store_name} Daily Collection submitted successfully.`);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to submit Daily Collection.");
        } finally {
            setSubmittingId(null);
        }
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

    const storeLabel = (store) => `${store.store_name}${store.store_code ? ` (${store.store_code})` : ""}`;

    if (!canView) {
        return (
            <div className="daily-collection-page">
                <div className="collection-empty">You do not have permission to enter Daily Collection.</div>
            </div>
        );
    }

    return (
        <div className="daily-collection-page">
            <section className="daily-collection-hero">
                <div>
                    <div className="eyebrow"><FaChartBar /> Daily Collection module</div>
                    <h1>Daily Collection</h1>
                    <p>
                        {admin
                            ? "Enter and manage Daily Collection for any active store."
                            : "Enter today's UPI, cash, bank transfer and card collection for your assigned store."}
                    </p>
                </div>
            </section>

            <PageToolbar
                search={search}
                setSearch={setSearch}
                placeholder="Search selected store..."
                showExport={false}
                showBulk={admin && canAdd}
                onBulk={() => setBulkOpen(true)}
                showDeleteAll={canDelete}
                onDeleteAll={() => setDeleteAllOpen(true)}
            />

            <section className="daily-collection-toolbar">
                <label>
                    <span>Collection date</span>
                    <input
                        type="date"
                        value={date}
                        max={today()}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </label>

                <label>
                    <span>Store</span>
                    {admin ? (
                        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                            <option value="">Select store</option>
                            <option value="all">All stores</option>
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>{storeLabel(store)}</option>
                            ))}
                        </select>
                    ) : (
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            disabled={stores.length <= 1}
                        >
                            <option value="">Select assigned store</option>
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>{storeLabel(store)}</option>
                            ))}
                        </select>
                    )}
                </label>

                <button onClick={load} disabled={loading || loadingStores}>
                    <FaSyncAlt /> Refresh
                </button>
            </section>

            {error && <div className="collection-alert error">{error}</div>}
            {success && <div className="collection-alert success">{success}</div>}

            {blockedStore && (
                <section className="collection-alert error">
                    <strong>Access blocked:</strong> {blockedStore.store_name || "This store"}.
                    An administrator must unblock this store before a manager can submit.
                </section>
            )}

            {loadingStores ? (
                <div className="collection-empty">Loading store assignment...</div>
            ) : !selectedStore && admin ? (
                <div className="collection-empty">Select a store to view or submit its Daily Collection.</div>
            ) : !selectedStore && !admin ? (
                <div className="collection-empty">No Daily Collection store is assigned to your manager account.</div>
            ) : loading ? (
                <div className="collection-empty">Loading Daily Collection...</div>
            ) : !filteredReports.length ? (
                <div className="collection-empty">No Daily Collection report is available for this store and date.</div>
            ) : (
                <section className="daily-report-cards">
                    {filteredReports.map((report) => {
                        const values = entries[report.id] || emptyEntry();
                        const billed = Number(report.summary?.total_billed ?? report.total_billed ?? 0);
                        const entered =
                            Number(values.upi_amount || 0) +
                            Number(values.cash_amount || 0) +
                            Number(values.bank_transfer_amount || 0) +
                            Number(values.card_amount || 0);
                        const variance = entered - billed;
                        const isSubmitted = report.status === "submitted";
                        const isLocked = report.status === "locked";
                        const disabled = isLocked || submittingId === report.id || Boolean(blockedStore);

                        return (
                            <article className="daily-collection-card" key={report.id}>
                                <div className="daily-card-header">
                                    <div>
                                        <small>{report.store_code || "Store"}</small>
                                        <h2>{report.store_name}</h2>
                                        <p>Manager: {report.manager_name || "Not linked"}</p>
                                    </div>
                                    <div className="daily-card-actions">
                                        <span className={`report-status ${report.status}`}>
                                            {isLocked ? "Locked" : isSubmitted ? "Submitted" : "Not Submitted"}
                                        </span>
                                        <button className="action-view" onClick={() => handleView(report)}>
                                            <FaEye /> View
                                        </button>
                                        {canDelete && (
                                            <button className="action-delete" onClick={() => setDeleteId(report.id)}>
                                                <FaTrashAlt /> Delete
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="daily-card-summary">
                                    <div><span>Bills</span><strong>{Number(report.summary?.bill_count ?? report.bill_count ?? 0)}</strong></div>
                                    <div><span>System total</span><strong>{money(billed)}</strong></div>
                                    <div><span>Entered</span><strong>{money(entered)}</strong></div>
                                    <div><span>Variance</span><strong className={Math.abs(variance) < 0.01 ? "report-match" : "report-mismatch"}>{money(variance)}</strong></div>
                                </div>

                                <div className="daily-payment-grid">
                                    <label>
                                        <span><FaMoneyBillWave /> UPI</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={values.upi_amount}
                                            onChange={(e) => updateEntry(report.id, "upi_amount", e.target.value)}
                                            disabled={disabled}
                                            placeholder="0.00"
                                        />
                                    </label>
                                    <label>
                                        <span><FaMoneyBillWave /> Cash</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={values.cash_amount}
                                            onChange={(e) => updateEntry(report.id, "cash_amount", e.target.value)}
                                            disabled={disabled}
                                            placeholder="0.00"
                                        />
                                    </label>
                                    <label>
                                        <span><FaMoneyBillWave /> Bank Transfer</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={values.bank_transfer_amount}
                                            onChange={(e) => updateEntry(report.id, "bank_transfer_amount", e.target.value)}
                                            disabled={disabled}
                                            placeholder="0.00"
                                        />
                                    </label>
                                    <label>
                                        <span><FaMoneyBillWave /> Card</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={values.card_amount}
                                            onChange={(e) => updateEntry(report.id, "card_amount", e.target.value)}
                                            disabled={disabled}
                                            placeholder="0.00"
                                        />
                                    </label>
                                </div>

                                <label className="daily-notes-field">
                                    <span>Notes / reconciliation explanation (optional)</span>
                                    <textarea
                                        value={values.notes}
                                        onChange={(e) => updateEntry(report.id, "notes", e.target.value)}
                                        disabled={disabled}
                                        placeholder="Add a note if the collection differs from the system total."
                                    />
                                </label>

                                <div className="daily-card-footer">
                                    <span>
                                        {isLocked
                                            ? "This Daily Collection is locked."
                                            : isSubmitted
                                                ? "Submitted successfully."
                                                : `Variance ${money(variance)} — submission allowed`}
                                    </span>
                                    <button
                                        className="daily-submit-button"
                                        onClick={() => submit(report)}
                                        disabled={disabled || !canAdd}
                                    >
                                        {submittingId === report.id ? "Submitting..." : isSubmitted ? "Submit Again" : "Submit Collection"}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

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

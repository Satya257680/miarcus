import React, { useEffect, useMemo, useState } from "react";
import {
    FaMoneyBillWave,
    FaCreditCard,
    FaUniversity,
    FaMobileAlt,
    FaStore,
    FaClock,
    FaExclamationTriangle,
    FaCheckCircle,
    FaLock,
    FaUnlock,
    FaSyncAlt,
    FaReceipt
} from "react-icons/fa";
import PageToolbar from "../../components/common/PageToolbar";
import ActionButtons from "../../components/common/ActionButtons";
import BulkUploadModal from "../../components/common/BulkUploadModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DailyCollectionViewModal from "../../components/DailyCollectionViewModal";
import {
    getDailyCollections,
    getDailyCollectionStores,
    getDailyCollectionById,
    submitDailyCollection,
    getBlockedDailyCollections,
    blockDailyCollection,
    unblockDailyCollection,
    getDailyCollectionEmailSettings,
    updateDailyCollectionEmailSettings,
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

const DailyCollection = () => {
    const permissions = useMemo(getUserPermissions, []);
    const { admin: isAdmin, canView, canAdd, canDelete } = permissions;

    const [date, setDate] = useState(today());
    const [stores, setStores] = useState([]);
    const [reports, setReports] = useState([]);
    const [selectedStore, setSelectedStore] = useState("");
    const [blocked, setBlocked] = useState(null);
    const [blockedList, setBlockedList] = useState([]);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [emailSaving, setEmailSaving] = useState(false);
    const [blocking, setBlocking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [values, setValues] = useState({});
    const [search, setSearch] = useState("");
    const [bulkOpen, setBulkOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
    const [viewReport, setViewReport] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            setError("");

            const storeResponse = await getDailyCollectionStores();
            const storeList = storeResponse.data?.stores || [];
            setStores(storeList);

            const selectedStillValid = selectedStore === "all" || (selectedStore && storeList.some((store) => String(store.id) === String(selectedStore)));
            if (!selectedStillValid && selectedStore) {
                setSelectedStore("");
                return;
            }

            if (isAdmin) {
                try {
                    const [blockedResponse, emailResponse] = await Promise.all([
                        getBlockedDailyCollections(),
                        getDailyCollectionEmailSettings()
                    ]);
                    setBlockedList(blockedResponse.data?.blocked || []);
                    setEmailEnabled(emailResponse.data?.settings?.email_enabled !== false);
                } catch (adminError) {
                    console.warn("Daily Collection admin controls could not be loaded.", adminError);
                    setBlockedList([]);
                }
            }

            if (!selectedStore || !selectedStillValid) {
                setReports([]);
                setValues({});
                setBlocked(null);
                return;
            }

            const reportResponse = await getDailyCollections(selectedStore === "all" ? { date } : { date, store_id: selectedStore });
            const reportList = reportResponse.data?.reports || [];
            setReports(reportList);
            setBlocked(reportResponse.data?.block || null);

            const initial = {};
            reportList.forEach((report) => {
                initial[report.id] = {
                    upi_amount: report.upi_amount ?? "",
                    cash_amount: report.cash_amount ?? "",
                    bank_transfer_amount: report.bank_transfer_amount ?? "",
                    card_amount: report.card_amount ?? "",
                    notes: report.notes || ""
                };
            });
            setValues(initial);
        } catch (err) {
            setBlocked(err.response?.data?.block || null);
            setReports([]);
            setError(err.response?.data?.message || "Unable to load daily collection.");
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
    }, [date, selectedStore]);

    const updateValue = (reportId, field, value) => {
        setValues((current) => ({
            ...current,
            [reportId]: { ...(current[reportId] || {}), [field]: value }
        }));
    };

    const totalEntered = (reportId) => {
        const value = values[reportId] || {};
        return ["upi_amount", "cash_amount", "bank_transfer_amount", "card_amount"]
            .reduce((sum, key) => sum + Number(value[key] || 0), 0);
    };

    const submit = async (report) => {
        try {
            setSaving(report.id);
            setError("");
            setSuccess("");
            const value = values[report.id] || {};
            await submitDailyCollection({
                report_id: report.id,
                store_id: report.store_id,
                report_date: report.report_date,
                upi_amount: Number(value.upi_amount || 0),
                cash_amount: Number(value.cash_amount || 0),
                bank_transfer_amount: Number(value.bank_transfer_amount || 0),
                card_amount: Number(value.card_amount || 0),
                notes: value.notes || ""
            });
            setSuccess(`Daily collection saved for ${report.store_name}.`);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to submit daily collection.");
        } finally {
            setSaving(null);
        }
    };

    const blockStoreAccess = async (storeId) => {
        if (!storeId) {
            setError("Select a store before blocking Daily Collection access.");
            return;
        }
        try {
            setBlocking(true);
            setError("");
            await blockDailyCollection({ store_id: Number(storeId), report_date: date, reason: "Blocked manually by administrator." });
            setSuccess("Daily Collection access blocked for the selected store users.");
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to block Daily Collection access.");
        } finally {
            setBlocking(false);
        }
    };

    const unlockGroup = async (controlIds) => {
        try {
            setError("");
            const ids = String(controlIds || "").split(",").map((id) => Number(id)).filter(Boolean);
            await Promise.all(ids.map((id) => unblockDailyCollection(id)));
            setSuccess("Daily Collection access restored for the selected store.");
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to restore access.");
        }
    };

    const toggleEmailNotifications = async () => {
        const next = !emailEnabled;
        try {
            setEmailSaving(true);
            setError("");
            await updateDailyCollectionEmailSettings(next);
            setEmailEnabled(next);
            setSuccess(`Daily Collection email notifications ${next ? "enabled" : "disabled"}.`);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to update email notifications.");
        } finally {
            setEmailSaving(false);
        }
    };

    const handleView = async (report) => {
        try {
            const response = await getDailyCollectionById(report.id);
            setViewReport(response.data?.data || response.data || report);
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

    const exportCsv = () => {
        if (!reports.length) return;
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
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `daily-collection-${date}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const filteredReports = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return reports;
        return reports.filter((report) => [report.store_name, report.store_code, report.manager_name].some((value) => String(value || "").toLowerCase().includes(keyword)));
    }, [reports, search]);

    const titleDate = useMemo(() => new Date(`${date}T00:00:00`), [date]);

    if (!canView) {
        return <div className="daily-collection-page"><div className="collection-empty">You do not have permission to view Daily Collection.</div></div>;
    }

    return (
        <div className="daily-collection-page">
            <section className="daily-collection-hero">
                <div>
                    <div className="eyebrow"><FaMoneyBillWave /> Daily Collection module</div>
                    <h1>Daily Collection</h1>
                    <p>Record each store's daily UPI, cash, bank transfer and card collection. The entered total must reconcile with bills recorded in Miarcus.</p>
                </div>
                <div className="deadline-card">
                    <FaClock />
                    <div><strong>Deadline: 12:00 AM</strong><span>12 hours later → access blocked</span></div>
                </div>
            </section>

            <PageToolbar
                search={search}
                setSearch={setSearch}
                placeholder="Search selected store..."
                showExport={canView && reports.length > 0}
                onExport={exportCsv}
                showBulk={canAdd}
                onBulk={() => setBulkOpen(true)}
                showDeleteAll={canDelete}
                onDeleteAll={() => setDeleteAllOpen(true)}
            />

            <section className="daily-collection-toolbar">
                <label>
                    <span>Collection date</span>
                    <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label>
                    <span>Store</span>
                    <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                        <option value="">Select store</option>
                        <option value="all">All stores</option>
                        {stores.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
                    </select>
                </label>
                <button onClick={load} disabled={loading}><FaSyncAlt /> Refresh</button>
            </section>

            {blocked && (
                <div className="collection-blocked">
                    <FaLock />
                    <div><strong>Daily Collection access is blocked</strong><span>{blocked.store_name}: {blocked.reason}</span></div>
                </div>
            )}
            {error && <div className="collection-alert error"><FaExclamationTriangle /> {error}</div>}
            {success && <div className="collection-alert success"><FaCheckCircle /> {success}</div>}

            <div className="date-heading">
                <div><h2>{titleDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</h2><span>{filteredReports.length} store report(s)</span></div>
                <div className="reconciliation-note"><FaReceipt /> System bill totals are calculated automatically.</div>
            </div>

            {!selectedStore ? (
                <div className="collection-empty">Select a store or All stores to view and submit Daily Collection.</div>
            ) : loading ? (
                <div className="collection-empty">Loading daily collection...</div>
            ) : !filteredReports.length ? (
                <div className="collection-empty">No Daily Collection report found for the selected store and date.</div>
            ) : (
                <div className="collection-grid">
                    {filteredReports.map((report) => {
                        const value = values[report.id] || {};
                        const entered = totalEntered(report.id);
                        const billed = Number(report.summary?.total_billed ?? report.total_billed ?? 0);
                        const variance = entered - billed;
                        const submitted = report.status === "submitted";
                        const locked = report.status === "locked";
                        const notSubmitted = report.status === "missing";
                        const reportBlocked = !isAdmin && blockedList.some((item) => String(item.store_id) === String(report.store_id));

                        return (
                            <article className={`collection-card ${submitted ? "submitted" : locked ? "locked" : ""}`} key={report.id}>
                                <div className="collection-card-header">
                                    <div>
                                        <span className="store-kicker"><FaStore /> {report.store_code || "Store"}</span>
                                        <h3>{report.store_name}</h3>
                                        <small>Manager: {report.manager_name || "Not linked"}</small>
                                    </div>
                                    <div className="collection-card-actions">
                                        <span className={`collection-status ${submitted ? "ok" : locked ? "locked" : "missing"}`}>
                                            {submitted ? <><FaCheckCircle /> Submitted</> : locked ? <><FaLock /> Locked</> : <><FaClock /> Not Submitted</>}
                                        </span>
                                        <ActionButtons showView onView={() => handleView(report)} showDelete={canDelete} onDelete={() => setDeleteId(report.id)} />
                                    </div>
                                </div>

                                <div className="system-summary">
                                    <div><span>Bills</span><strong>{Number(report.summary?.bill_count ?? report.bill_count ?? 0)}</strong></div>
                                    <div><span>System total</span><strong>{money(billed)}</strong></div>
                                    <div><span>Entered</span><strong>{money(entered)}</strong></div>
                                    <div className={Math.abs(variance) < 0.01 ? "match" : "mismatch"}><span>Variance</span><strong>{money(variance)}</strong></div>
                                </div>

                                <div className="payment-grid">
                                    <label><span><FaMobileAlt /> UPI</span><input type="number" min="0" step="0.01" value={value.upi_amount ?? ""} disabled={submitted || reportBlocked || Boolean(blocked)} onChange={(e) => updateValue(report.id, "upi_amount", e.target.value)} placeholder="0.00" /></label>
                                    <label><span><FaMoneyBillWave /> Cash</span><input type="number" min="0" step="0.01" value={value.cash_amount ?? ""} disabled={submitted || reportBlocked || Boolean(blocked)} onChange={(e) => updateValue(report.id, "cash_amount", e.target.value)} placeholder="0.00" /></label>
                                    <label><span><FaUniversity /> Bank Transfer</span><input type="number" min="0" step="0.01" value={value.bank_transfer_amount ?? ""} disabled={submitted || reportBlocked || Boolean(blocked)} onChange={(e) => updateValue(report.id, "bank_transfer_amount", e.target.value)} placeholder="0.00" /></label>
                                    <label><span><FaCreditCard /> Card</span><input type="number" min="0" step="0.01" value={value.card_amount ?? ""} disabled={submitted || reportBlocked || Boolean(blocked)} onChange={(e) => updateValue(report.id, "card_amount", e.target.value)} placeholder="0.00" /></label>
                                </div>

                                <div className="system-payment-reference">
                                    <span>System payment history</span>
                                    <b>UPI {money(report.summary?.system_upi)} · Card {money(report.summary?.system_card)} · Bank {money(report.summary?.system_bank_transfer)} · Cash {money(report.summary?.system_cash)}</b>
                                </div>

                                <textarea value={value.notes ?? ""} disabled={submitted || reportBlocked || Boolean(blocked)} onChange={(e) => updateValue(report.id, "notes", e.target.value)} placeholder="Notes / reconciliation explanation (optional)" />

                                <div className="collection-card-footer">
                                    <span>{locked ? "Access is locked — unblock this store before submitting" : notSubmitted ? (Math.abs(variance) < 0.01 ? "Ready to submit" : `Variance ${money(variance)} — submission allowed`) : "Collection submitted"}</span>
                                    {!submitted && !locked && (
                                        <button onClick={() => submit(report)} disabled={saving === report.id || reportBlocked || Boolean(blocked)}>
                                            {saving === report.id ? "Saving..." : "Submit Collection"}
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {isAdmin && (
                <section className="blocked-admin-panel">
                    <div className="blocked-admin-heading"><div><span>Administrator control</span><h2>Daily Collection Controls</h2></div><FaLock /></div>

                    <div className="daily-email-control">
                        <div className="daily-email-control-copy">
                            <div className="daily-email-control-title">
                                <strong>Daily Collection Email Notifications</strong>
                                <span className={emailEnabled ? "email-state on" : "email-state off"}></span>
                                <b>{emailEnabled ? "ON" : "OFF"}</b>
                            </div>
                            <p>{emailEnabled ? "Admins will receive missing-report reminders and 12-hour escalation emails." : "No Daily Collection reminder or escalation emails will be sent. Access blocking still works."}</p>
                        </div>
                        <button className={`email-toggle ${emailEnabled ? "on" : "off"}`} onClick={toggleEmailNotifications} disabled={emailSaving} aria-pressed={emailEnabled}>
                            <span>{emailSaving ? "Saving..." : emailEnabled ? "ON" : "OFF"}</span>
                            <span className="email-toggle-knob" />
                        </button>
                    </div>

                    <div className="blocked-admin-subheading">
                        <h3>Store Access Control</h3>
                        <span>Blocked stores are red; available stores are green. Administrator accounts are excluded.</span>
                    </div>
                    {!selectedStore ? (
                        <p>Select a store or All stores to manage Daily Collection access.</p>
                    ) : (
                        <div className="blocked-list">
                            {(selectedStore === "all" ? stores : stores.filter((store) => String(store.id) === String(selectedStore))).map((store) => {
                                const item = blockedList.find((blockedItem) => String(blockedItem.store_id) === String(store.id));
                                const isBlocked = Boolean(item);
                                return (
                                    <div className={`blocked-row ${isBlocked ? "blocked" : "available"}`} key={`${store.id}-${date}`}>
                                        <div>
                                            <strong>{store.store_name}</strong>
                                            <span>{isBlocked ? `${Number(item.blocked_user_count || 0)} user(s) blocked · ${item.report_date}` : "Daily Collection access available"}</span>
                                        </div>
                                        {isBlocked ? (
                                            <button className="unblock-access" onClick={() => unlockGroup(item.control_ids)} disabled={blocking}>
                                                <FaUnlock /> Unblock Access
                                            </button>
                                        ) : (
                                            <button className="block-access" onClick={() => blockStoreAccess(store.id)} disabled={blocking}>
                                                <FaLock /> Block Access
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
};

export default DailyCollection;

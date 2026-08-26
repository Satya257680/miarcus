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
import {
    getDailyCollections,
    getDailyCollectionStores,
    submitDailyCollection,
    getBlockedDailyCollections,
    unblockDailyCollection,
    getDailyCollectionEmailSettings,
    updateDailyCollectionEmailSettings
} from "../../services/billingService";
import "../../styles/DailyCollection.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const DailyCollection = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user?.administrator === true || Number(user?.is_admin) === 1;

    const [date, setDate] = useState(today());
    const [stores, setStores] = useState([]);
    const [reports, setReports] = useState([]);
    const [selectedStore, setSelectedStore] = useState("");
    const [blocked, setBlocked] = useState(null);
    const [blockedList, setBlockedList] = useState([]);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [emailSaving, setEmailSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [values, setValues] = useState({});

    const load = async () => {
        try {
            setLoading(true);
            setError("");
            const [storeResponse, reportResponse] = await Promise.all([
                getDailyCollectionStores(),
                getDailyCollections({
                    date,
                    ...(selectedStore ? { store_id: selectedStore } : {})
                })
            ]);

            const storeList = storeResponse.data?.stores || [];
            const reportList = reportResponse.data?.reports || [];
            setStores(storeList);
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

            if (isAdmin) {
                try {
                    const [blockedResponse, emailResponse] = await Promise.all([
                        getBlockedDailyCollections(),
                        getDailyCollectionEmailSettings()
                    ]);
                    setBlockedList(blockedResponse.data?.blocked || []);
                    setEmailEnabled(emailResponse.data?.settings?.email_enabled !== false);
                } catch {
                    setBlockedList([]);
                }
            }
        } catch (err) {
            setBlocked(err.response?.data?.block || null);
            setReports([]);
            setError(err.response?.data?.message || "Unable to load daily collection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, selectedStore]);

    const updateValue = (reportId, field, value) => {
        setValues((current) => ({
            ...current,
            [reportId]: {
                ...(current[reportId] || {}),
                [field]: value
            }
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

    const unlock = async (controlId) => {
        try {
            setError("");
            await unblockDailyCollection(controlId);
            setSuccess("Daily Collection access restored.");
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

    const titleDate = useMemo(() => new Date(`${date}T00:00:00`), [date]);

    return (
        <div className="daily-collection-page">
            <section className="daily-collection-hero">
                <div>
                    <div className="eyebrow"><FaMoneyBillWave /> Billing control</div>
                    <h1>Daily Collection</h1>
                    <p>Record each store's daily UPI, cash, bank transfer and card collection. The entered total must reconcile with bills recorded in Miarcus.</p>
                </div>
                <div className="deadline-card">
                    <FaClock />
                    <div><strong>Deadline: 12:00 AM</strong><span>12 hours later → access blocked</span></div>
                </div>
            </section>

            <section className="daily-collection-toolbar">
                <label>
                    <span>Collection date</span>
                    <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label>
                    <span>Store</span>
                    <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                        <option value="">All assigned stores</option>
                        {stores.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
                    </select>
                </label>
                <button onClick={load} disabled={loading}><FaSyncAlt /> Refresh</button>
            </section>

            {blocked && (
                <div className="collection-blocked">
                    <FaLock />
                    <div>
                        <strong>Daily Collection access is blocked</strong>
                        <span>{blocked.store_name}: {blocked.reason}</span>
                    </div>
                </div>
            )}

            {error && <div className="collection-alert error"><FaExclamationTriangle /> {error}</div>}
            {success && <div className="collection-alert success"><FaCheckCircle /> {success}</div>}

            <div className="date-heading">
                <div><h2>{titleDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</h2><span>{reports.length} store report(s)</span></div>
                <div className="reconciliation-note"><FaReceipt /> System bill totals are calculated automatically.</div>
            </div>

            {loading ? (
                <div className="collection-empty">Loading daily collection...</div>
            ) : !reports.length ? (
                <div className="collection-empty">No active store reports found for this date.</div>
            ) : (
                <div className="collection-grid">
                    {reports.map((report) => {
                        const value = values[report.id] || {};
                        const entered = totalEntered(report.id);
                        const billed = Number(report.summary?.total_billed ?? report.total_billed ?? 0);
                        const variance = entered - billed;
                        const submitted = report.status === "submitted";
                        const locked = report.status === "locked";

                        return (
                            <article className={`collection-card ${submitted ? "submitted" : locked ? "locked" : ""}`} key={report.id}>
                                <div className="collection-card-header">
                                    <div><span className="store-kicker"><FaStore /> {report.store_code || "Store"}</span><h3>{report.store_name}</h3><small>Manager: {report.manager_name || "Not linked"}</small></div>
                                    <span className={`collection-status ${submitted ? "ok" : locked ? "locked" : "pending"}`}>
                                        {submitted ? <><FaCheckCircle /> Submitted</> : locked ? <><FaLock /> Locked</> : <><FaClock /> Pending</>}
                                    </span>
                                </div>

                                <div className="system-summary">
                                    <div><span>Bills</span><strong>{Number(report.summary?.bill_count ?? report.bill_count ?? 0)}</strong></div>
                                    <div><span>System total</span><strong>{money(billed)}</strong></div>
                                    <div><span>Entered</span><strong>{money(entered)}</strong></div>
                                    <div className={Math.abs(variance) < 0.01 ? "match" : "mismatch"}><span>Variance</span><strong>{money(variance)}</strong></div>
                                </div>

                                <div className="payment-grid">
                                    <label><span><FaMobileAlt /> UPI</span><input type="number" min="0" step="0.01" value={value.upi_amount ?? ""} disabled={submitted || Boolean(blocked)} onChange={(e) => updateValue(report.id, "upi_amount", e.target.value)} placeholder="0.00" /></label>
                                    <label><span><FaMoneyBillWave /> Cash</span><input type="number" min="0" step="0.01" value={value.cash_amount ?? ""} disabled={submitted || Boolean(blocked)} onChange={(e) => updateValue(report.id, "cash_amount", e.target.value)} placeholder="0.00" /></label>
                                    <label><span><FaUniversity /> Bank Transfer</span><input type="number" min="0" step="0.01" value={value.bank_transfer_amount ?? ""} disabled={submitted || Boolean(blocked)} onChange={(e) => updateValue(report.id, "bank_transfer_amount", e.target.value)} placeholder="0.00" /></label>
                                    <label><span><FaCreditCard /> Card</span><input type="number" min="0" step="0.01" value={value.card_amount ?? ""} disabled={submitted || Boolean(blocked)} onChange={(e) => updateValue(report.id, "card_amount", e.target.value)} placeholder="0.00" /></label>
                                </div>

                                <div className="system-payment-reference">
                                    <span>System payment history</span>
                                    <b>UPI {money(report.summary?.system_upi)} · Card {money(report.summary?.system_card)} · Bank {money(report.summary?.system_bank_transfer)} · Cash {money(report.summary?.system_cash)}</b>
                                </div>

                                <textarea
                                    value={value.notes ?? ""}
                                    disabled={submitted || Boolean(blocked)}
                                    onChange={(e) => updateValue(report.id, "notes", e.target.value)}
                                    placeholder="Notes / reconciliation explanation (optional)"
                                />

                                <div className="collection-card-footer">
                                    <span>{Math.abs(variance) < 0.01 ? "Ready to submit" : `Difference ${money(variance)}`}</span>
                                    {!submitted && (
                                        <button onClick={() => submit(report)} disabled={saving === report.id || Boolean(blocked) || Math.abs(variance) > 0.01}>
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
                        <h3>Blocked Daily Collection Access</h3>
                        <span>Admin can restore access after reviewing the report.</span>
                    </div>
                    {!blockedList.length ? (
                        <p>No active Daily Collection blocks.</p>
                    ) : (
                        <div className="blocked-list">
                            {blockedList.map((item) => (
                                <div className="blocked-row" key={item.control_id}>
                                    <div><strong>{item.user_name}</strong><span>{item.store_name} · report {item.report_date}</span></div>
                                    <button onClick={() => unlock(item.control_id)}><FaUnlock /> Unblock Access</button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default DailyCollection;

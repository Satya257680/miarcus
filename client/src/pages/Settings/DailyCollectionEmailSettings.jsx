import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../axiosConfig.js";
import {
    FaArrowLeft,
    FaEnvelope,
    FaSave,
    FaCheckCircle,
    FaUsers,
    FaUserShield,
    FaPlus,
    FaTrash,
    FaPaperPlane,
    FaBell,
    FaLock,
    FaUnlock,
    FaChartPie,
} from "react-icons/fa";
import PremiumLoader from "../../components/premium/PremiumLoader";
import "../../styles/pages/NSOEmailSettings.css";
import "../../styles/pages/DailyCollectionPremium.css";

// ======================================================
// DAILY COLLECTION EMAIL ROUTING
// Settings → Daily Collection Email Routing
//
// • ONE summary email per day to the administrators
//   (Select All = every enabled contact, Specific = only
//   contacts ticked for "Summary").
// • Store managers get their own personal emails
//   (pending reminder / blocked / ready again).
// ======================================================

const empty = {
    email_enabled: true,
    summary_mode: "all",
    manager_reminder_enabled: true,
    blocked_email_enabled: true,
    ready_email_enabled: true,
    recipients: [],
};

const flag = (value) => value === true || value === 1 || value === "1";

const EMAILS = [
    {
        key: "summary",
        icon: FaChartPie,
        tone: "violet",
        title: "Administrator summary",
        time: "12:01 AM · one email",
        text: "Total stores, submitted, pending and blocked counts with the list of pending stores.",
    },
    {
        key: "manager_reminder_enabled",
        icon: FaBell,
        tone: "amber",
        title: "Pending reminder",
        time: "12:01 AM · store manager",
        text: "Sent to the manager of every store that has not submitted yet.",
    },
    {
        key: "blocked_email_enabled",
        icon: FaLock,
        tone: "red",
        title: "Module blocked",
        time: "12:00 PM · store manager",
        text: "Sent when the store is still pending 12 hours after the deadline and access is blocked.",
    },
    {
        key: "ready_email_enabled",
        icon: FaUnlock,
        tone: "green",
        title: "Ready for submission",
        time: "On unblock · store manager",
        text: "Sent the moment an administrator restores access from the Blocked Stores page.",
    },
];

export default function DailyCollectionEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(empty);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        axios
            .get("/api/daily-collection/email-routing")
            .then(({ data }) => setSettings({ ...empty, ...(data?.data || {}) }))
            .catch((err) => setError(err.response?.data?.message || "Unable to load Daily Collection email routing."))
            .finally(() => setLoading(false));
    }, []);

    const patch = (value) => setSettings((prev) => ({ ...prev, ...value }));

    const updateRecipient = (index, value) =>
        setSettings((prev) => ({
            ...prev,
            recipients: prev.recipients.map((row, i) => (i === index ? { ...row, ...value } : row)),
        }));

    const addEmail = () => {
        const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        setSettings((prev) => ({
            ...prev,
            recipients: [
                ...prev.recipients,
                {
                    recipient_key: key,
                    role_label: "Recipient",
                    contact_name: "",
                    email: "",
                    enabled: 1,
                    receive_summary: 1,
                    is_custom: 1,
                },
            ],
        }));
    };

    const removeRecipient = (index) =>
        setSettings((prev) => ({ ...prev, recipients: prev.recipients.filter((_, i) => i !== index) }));

    const setAll = (field, value) =>
        setSettings((prev) => ({ ...prev, recipients: prev.recipients.map((row) => ({ ...row, [field]: value ? 1 : 0 })) }));

    const save = async () => {
        setSaving(true);
        setMessage("");
        setError("");
        try {
            const { data } = await axios.put("/api/daily-collection/email-routing", settings);
            setSettings({ ...empty, ...(data?.data || settings) });
            setMessage(data?.message || "Daily Collection email routing saved successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save Daily Collection email routing.");
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async () => {
        setTesting(true);
        setMessage("");
        setError("");
        try {
            const { data } = await axios.post("/api/daily-collection/email-routing/test");
            setMessage(data?.message || "Test emails sent.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to send test emails.");
        } finally {
            setTesting(false);
        }
    };

    const summaryRecipients = settings.recipients.filter(
        (row) => flag(row.enabled) && row.email && (settings.summary_mode === "all" || flag(row.receive_summary))
    ).length;

    return (
        <div className="nso-email-settings-page dc-email-page">
            <div className="nso-email-settings-header">
                <div className="nso-email-title-wrap">
                    <button className="nso-email-back" onClick={() => navigate("/settings")} aria-label="Back to settings">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <span>DAILY COLLECTION</span>
                        <h1>Email Routing</h1>
                        <p>Choose who receives the one daily summary and which store-manager emails are sent.</p>
                    </div>
                </div>
                <div className="dc-email-actions">
                    <button className="dc-email-test" onClick={sendTest} disabled={testing || loading}>
                        <FaPaperPlane /> {testing ? "Sending..." : "Send Test Emails"}
                    </button>
                    <button className="nso-email-save" onClick={save} disabled={saving || loading}>
                        <FaSave /> {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </div>

            {message && <div className="nso-email-alert success"><FaCheckCircle /> {message}</div>}
            {error && <div className="nso-email-alert error">{error}</div>}

            {loading ? (
                <PremiumLoader compact title="Loading email routing" />
            ) : (
                <>
                    <div className="nso-email-card">
                        <div className="nso-email-card-head">
                            <FaEnvelope />
                            <div>
                                <h2>Daily Collection Emails</h2>
                                <p>The master switch turns every Daily Collection email on or off. Blocking after 12 hours always happens, even when emails are off.</p>
                            </div>
                            <label className="dc-switch dc-switch-master">
                                <input type="checkbox" checked={flag(settings.email_enabled)} onChange={(e) => patch({ email_enabled: e.target.checked })} />
                                <span />
                                <b>{flag(settings.email_enabled) ? "ON" : "OFF"}</b>
                            </label>
                        </div>

                        <div className="dc-email-type-grid">
                            {EMAILS.map((item) => {
                                const Icon = item.icon;
                                const isSummary = item.key === "summary";
                                const on = isSummary ? true : flag(settings[item.key]);
                                return (
                                    <div key={item.key} className={`dc-email-type dc-tone-${item.tone} ${!flag(settings.email_enabled) ? "is-muted" : ""}`}>
                                        <span className="dc-email-type-icon"><Icon /></span>
                                        <div>
                                            <b>{item.title}</b>
                                            <small>{item.time}</small>
                                            <p>{item.text}</p>
                                        </div>
                                        {isSummary ? (
                                            <span className="dc-email-count">{summaryRecipients} recipient{summaryRecipients === 1 ? "" : "s"}</span>
                                        ) : (
                                            <label className="dc-switch">
                                                <input type="checkbox" checked={on} onChange={(e) => patch({ [item.key]: e.target.checked })} />
                                                <span />
                                            </label>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="nso-email-card">
                        <div className="nso-email-card-head">
                            <FaUsers />
                            <div>
                                <h2>Summary Recipient Mode</h2>
                                <p>Select All sends the single daily summary to every enabled contact. Specific sends it only to contacts ticked under "Summary".</p>
                            </div>
                        </div>
                        <div className="nso-mode-grid">
                            <div className="nso-mode-box">
                                <div>
                                    <b>Daily administrator summary</b>
                                    <span>One email with submitted / pending / blocked store counts.</span>
                                </div>
                                <div className="nso-mode-buttons">
                                    {["all", "specific"].map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            className={settings.summary_mode === mode ? "active" : ""}
                                            onClick={() => patch({ summary_mode: mode })}
                                        >
                                            {mode === "all" ? <FaUsers /> : <FaUserShield />} {mode === "all" ? "Select All" : "Specific"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="nso-email-card">
                        <div className="nso-email-card-head">
                            <FaUsers />
                            <div>
                                <h2>Summary Contacts</h2>
                                <p>Every active administrator is listed automatically. Add extra emails (accounts, owners, regional heads) when needed.</p>
                            </div>
                        </div>
                        <div className="nso-email-bulk-actions">
                            <button type="button" onClick={addEmail} className="nso-add-email-btn"><FaPlus /> Add Email</button>
                            <button type="button" onClick={() => setAll("enabled", true)}>Select All Enable</button>
                            <button type="button" onClick={() => setAll("enabled", false)}>Select All Disable</button>
                            <button type="button" onClick={() => setAll("receive_summary", true)}>Select All Summary</button>
                            <button type="button" onClick={() => setAll("receive_summary", false)}>Clear Summary</button>
                        </div>
                        <div className="nso-email-table-wrap">
                            <table className="nso-email-table">
                                <thead>
                                    <tr>
                                        <th>Role</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Enabled</th>
                                        <th>Summary</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {settings.recipients.length === 0 && (
                                        <tr><td colSpan="6" style={{ textAlign: "center", padding: 18 }}>No administrators found. Add an email to receive the daily summary.</td></tr>
                                    )}
                                    {settings.recipients.map((row, index) => (
                                        <tr key={row.recipient_key}>
                                            <td>
                                                {flag(row.is_custom) ? (
                                                    <input value={row.role_label || ""} onChange={(e) => updateRecipient(index, { role_label: e.target.value })} placeholder="Role / Department" />
                                                ) : (
                                                    <b>{row.role_label || "Administrator"}</b>
                                                )}
                                            </td>
                                            <td>
                                                {flag(row.is_custom) ? (
                                                    <input value={row.contact_name || ""} onChange={(e) => updateRecipient(index, { contact_name: e.target.value })} placeholder="Contact name" />
                                                ) : (
                                                    row.contact_name || "-"
                                                )}
                                            </td>
                                            <td>
                                                {flag(row.is_custom) ? (
                                                    <input type="email" value={row.email || ""} onChange={(e) => updateRecipient(index, { email: e.target.value })} placeholder="email@example.com" />
                                                ) : (
                                                    row.email || <span className="dc-muted">No email on account</span>
                                                )}
                                            </td>
                                            <td><input type="checkbox" checked={flag(row.enabled)} onChange={(e) => updateRecipient(index, { enabled: e.target.checked ? 1 : 0 })} /></td>
                                            <td><input type="checkbox" checked={flag(row.receive_summary)} onChange={(e) => updateRecipient(index, { receive_summary: e.target.checked ? 1 : 0 })} /></td>
                                            <td>
                                                {flag(row.is_custom) ? (
                                                    <button type="button" className="nso-remove-email-btn" onClick={() => removeRecipient(index)} title="Remove recipient"><FaTrash /></button>
                                                ) : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="nso-email-note">
                            <b>Store managers:</b> pending, blocked and ready-again emails go only to the manager linked to each store (Store Management → store manager). Administrators receive just the one daily summary — never one email per store.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

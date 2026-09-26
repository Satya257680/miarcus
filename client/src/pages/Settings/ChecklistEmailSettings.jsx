import PremiumLoader from "../../components/premium/PremiumLoader";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    FaArrowLeft,
    FaEnvelope,
    FaSave,
    FaCheckCircle,
    FaUsers,
    FaStore,
    FaClipboardCheck,
    FaTasks,
    FaCheck,
    FaBell,
    FaPlus,
    FaTrash,
    FaUserEdit,
    FaExclamationTriangle
} from "react-icons/fa";
import "../../styles/pages/ChecklistEmailSettings.css";

// ======================================================
// CHECKLIST & CONTROLS – EMAIL ROUTING
// ======================================================
// Recipients are managed like New Store Opening email routing:
//   • a named contact list with per-event switches
//   • the manager of the SPECIFIC store only (never other stores)
//   • optionally the person who submitted the checklist
// ======================================================

const defaults = {
    checklist_submitted_enabled: 1,
    action_point_created_enabled: 1,
    action_point_status_enabled: 1,
    action_point_completed_enabled: 1,
    store_manager_recipients_enabled: 1,
    submitter_recipients_enabled: 1,
    recipients: []
};

const events = [
    {
        key: "checklist_submitted_enabled",
        column: "send_on_submission",
        short: "Submission",
        icon: FaClipboardCheck,
        title: "Checklist submitted",
        description: "Sent when a store checklist is submitted – includes the list of issues raised.",
        badge: "Submission"
    },
    {
        key: "action_point_created_enabled",
        column: "send_on_ap_created",
        short: "AP Raised",
        icon: FaTasks,
        title: "Action Point generated",
        description: "Sent when an answer reports a problem (or an Action Point is created manually).",
        badge: "Needs Action"
    },
    {
        key: "action_point_status_enabled",
        column: "send_on_ap_status",
        short: "Status",
        icon: FaBell,
        title: "Action Point status changed",
        description: "Sent when an Action Point moves between Open and In Progress.",
        badge: "Progress"
    },
    {
        key: "action_point_completed_enabled",
        column: "send_on_ap_completed",
        short: "Completed",
        icon: FaCheck,
        title: "Action Point completed",
        description: "Sent when the Action Point is closed and its answer moves to Checklist Reports.",
        badge: "Completed"
    }
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const newRecipient = () => ({
    role_key: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role_label: "",
    contact_name: "",
    email: "",
    enabled: 1,
    send_on_submission: 1,
    send_on_ap_created: 1,
    send_on_ap_status: 1,
    send_on_ap_completed: 1,
    is_new: true
});

export default function ChecklistEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(defaults);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get("/api/checklist-email-settings")
            .then(({ data }) => setSettings({ ...defaults, ...(data?.data || {}), recipients: data?.data?.recipients || [] }))
            .catch(err => setError(err.response?.data?.message || "Unable to load Checklist email settings."))
            .finally(() => setLoading(false));
    }, []);

    const touch = () => { setMessage(""); setError(""); };

    const setValue = (key, value) => {
        touch();
        setSettings(prev => ({ ...prev, [key]: value ? 1 : 0 }));
    };

    const updateRecipient = (index, patch) => {
        touch();
        setSettings(prev => ({
            ...prev,
            recipients: prev.recipients.map((row, i) => (i === index ? { ...row, ...patch } : row))
        }));
    };

    const setAll = (field, value) => {
        touch();
        setSettings(prev => ({
            ...prev,
            recipients: prev.recipients.map(row => ({ ...row, [field]: value ? 1 : 0 }))
        }));
    };

    const addRecipient = () => {
        touch();
        setSettings(prev => ({ ...prev, recipients: [...prev.recipients, newRecipient()] }));
    };

    const removeRecipient = (index) => {
        touch();
        setSettings(prev => ({ ...prev, recipients: prev.recipients.filter((_, i) => i !== index) }));
    };

    const invalidRows = useMemo(
        () => settings.recipients
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => String(row.email || "").trim() && !EMAIL_RE.test(String(row.email).trim())),
        [settings.recipients]
    );

    const activeCount = settings.recipients.filter(
        row => Number(row.enabled) === 1 && EMAIL_RE.test(String(row.email || "").trim())
    ).length;

    const save = async () => {
        if (invalidRows.length) {
            setError(`Please fix the invalid email address on row ${invalidRows[0].index + 1}.`);
            return;
        }
        setSaving(true);
        touch();
        try {
            const payload = {
                ...settings,
                recipients: settings.recipients.map(row => ({
                    ...row,
                    role_label: String(row.role_label || "").trim() || String(row.contact_name || "").trim() || "Recipient"
                }))
            };
            const { data } = await axios.put("/api/checklist-email-settings", payload);
            setSettings({ ...defaults, ...(data?.data || payload), recipients: data?.data?.recipients || payload.recipients });
            setMessage("Checklist email routing saved successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save Checklist email settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="checklist-email-settings-page">
            <div className="checklist-email-settings-header">
                <div className="checklist-email-title-wrap">
                    <button className="checklist-email-back" onClick={() => navigate("/settings")} aria-label="Back to settings">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <span>CHECKLIST &amp; CONTROLS</span>
                        <h1>Email Routing</h1>
                        <p>Choose exactly who is emailed for Checklist Submissions and Action Points.</p>
                    </div>
                </div>
                <button className="checklist-email-save" onClick={save} disabled={saving || loading}>
                    <FaSave /> {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            {message && <div className="checklist-email-alert success"><FaCheckCircle /> {message}</div>}
            {error && <div className="checklist-email-alert error"><FaExclamationTriangle /> {error}</div>}

            {loading ? (
                <div className="checklist-email-card loading"><PremiumLoader compact title="Loading email routing" /></div>
            ) : (
                <>
                    {/* ================= STORE-LEVEL RECIPIENTS ================= */}
                    <div className="checklist-email-card">
                        <div className="checklist-email-card-head">
                            <FaStore />
                            <div>
                                <h2>Store recipients</h2>
                                <p>Resolved automatically for every event. Only people of the store that submitted the checklist are emailed – never managers of other stores.</p>
                            </div>
                        </div>

                        <div className="checklist-recipient-grid">
                            <div className={`checklist-recipient-box ${settings.store_manager_recipients_enabled ? "active" : ""}`}>
                                <div className="checklist-recipient-icon"><FaStore /></div>
                                <div className="checklist-recipient-copy">
                                    <strong>That store's manager</strong>
                                    <span>The manager assigned to the submitting store (Chat Store Manager, or the store's email in Store Management).</span>
                                </div>
                                <label className="checklist-switch">
                                    <input type="checkbox" checked={Boolean(settings.store_manager_recipients_enabled)} onChange={e => setValue("store_manager_recipients_enabled", e.target.checked)} />
                                    <span />
                                </label>
                            </div>

                            <div className={`checklist-recipient-box ${settings.submitter_recipients_enabled ? "active" : ""}`}>
                                <div className="checklist-recipient-icon"><FaUserEdit /></div>
                                <div className="checklist-recipient-copy">
                                    <strong>Person who submitted</strong>
                                    <span>The employee who filled in the checklist gets a copy and follow-ups on their Action Points.</span>
                                </div>
                                <label className="checklist-switch">
                                    <input type="checkbox" checked={Boolean(settings.submitter_recipients_enabled)} onChange={e => setValue("submitter_recipients_enabled", e.target.checked)} />
                                    <span />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* ================= CONTACT LIST ================= */}
                    <div className="checklist-email-card">
                        <div className="checklist-email-card-head">
                            <FaUsers />
                            <div>
                                <h2>Checklist email contacts <em className="checklist-count-pill">{activeCount} active</em></h2>
                                <p>Head-office people who should be informed (Retail Head, VM, Operations …). Tick the events each contact should receive. Administrators are no longer emailed automatically.</p>
                            </div>
                        </div>

                        <div className="checklist-bulk-actions">
                            <button type="button" className="checklist-add-btn" onClick={addRecipient}><FaPlus /> Add Email</button>
                            <button type="button" onClick={() => setAll("enabled", true)}>Enable All</button>
                            <button type="button" onClick={() => setAll("enabled", false)}>Disable All</button>
                            {events.map(event => (
                                <span className="checklist-bulk-group" key={event.column}>
                                    <b>{event.short}</b>
                                    <button type="button" onClick={() => setAll(event.column, true)}>All</button>
                                    <button type="button" onClick={() => setAll(event.column, false)}>None</button>
                                </span>
                            ))}
                        </div>

                        <div className="checklist-contact-table-wrap">
                            <table className="checklist-contact-table">
                                <thead>
                                    <tr>
                                        <th>Role</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Enabled</th>
                                        {events.map(event => <th key={event.column}>{event.short}</th>)}
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {settings.recipients.length === 0 && (
                                        <tr>
                                            <td colSpan={5 + events.length} className="checklist-contact-empty">
                                                No contacts yet. Only the store manager / submitter will be emailed. Click <b>Add Email</b> to add head-office contacts.
                                            </td>
                                        </tr>
                                    )}
                                    {settings.recipients.map((row, index) => {
                                        const emailInvalid = String(row.email || "").trim() && !EMAIL_RE.test(String(row.email).trim());
                                        return (
                                            <tr key={row.role_key} className={Number(row.enabled) === 1 ? "" : "is-disabled"}>
                                                <td>
                                                    <input value={row.role_label || ""} onChange={e => updateRecipient(index, { role_label: e.target.value })} placeholder="Role / Department" />
                                                </td>
                                                <td>
                                                    <input value={row.contact_name || ""} onChange={e => updateRecipient(index, { contact_name: e.target.value })} placeholder="Contact name" />
                                                </td>
                                                <td>
                                                    <input
                                                        type="email"
                                                        className={emailInvalid ? "invalid" : ""}
                                                        value={row.email || ""}
                                                        onChange={e => updateRecipient(index, { email: e.target.value })}
                                                        placeholder="email@example.com"
                                                    />
                                                </td>
                                                <td>
                                                    <label className="checklist-switch small">
                                                        <input type="checkbox" checked={Number(row.enabled) === 1} onChange={e => updateRecipient(index, { enabled: e.target.checked ? 1 : 0 })} />
                                                        <span />
                                                    </label>
                                                </td>
                                                {events.map(event => (
                                                    <td key={event.column}>
                                                        <input
                                                            type="checkbox"
                                                            className="checklist-check"
                                                            checked={Number(row[event.column]) === 1}
                                                            disabled={Number(row.enabled) !== 1}
                                                            onChange={e => updateRecipient(index, { [event.column]: e.target.checked ? 1 : 0 })}
                                                            aria-label={`${event.title} for ${row.contact_name || row.role_label || "recipient"}`}
                                                        />
                                                    </td>
                                                ))}
                                                <td>
                                                    <button type="button" className="checklist-remove-btn" onClick={() => removeRecipient(index)} title="Remove recipient">
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ================= EVENTS ================= */}
                    <div className="checklist-email-card">
                        <div className="checklist-email-card-head">
                            <FaEnvelope />
                            <div>
                                <h2>Notification events</h2>
                                <p>Master switches. When an event is off, nobody receives that email.</p>
                            </div>
                        </div>

                        <div className="checklist-event-list">
                            {events.map(({ key, icon: Icon, title, description, badge }) => (
                                <div className={`checklist-event-row ${settings[key] ? "enabled" : "disabled"}`} key={key}>
                                    <div className="checklist-event-icon"><Icon /></div>
                                    <div className="checklist-event-copy">
                                        <div className="checklist-event-title"><strong>{title}</strong><span>{badge}</span></div>
                                        <p>{description}</p>
                                    </div>
                                    <label className="checklist-switch checklist-event-switch">
                                        <input type="checkbox" checked={Boolean(settings[key])} onChange={e => setValue(key, e.target.checked)} />
                                        <span />
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ================= FLOW ================= */}
                    <div className="checklist-email-card checklist-email-flow">
                        <div className="checklist-email-card-head">
                            <FaCheckCircle />
                            <div>
                                <h2>Checklist workflow</h2>
                                <p>The email flow follows the same lifecycle as the application.</p>
                            </div>
                        </div>
                        <div className="checklist-flow-grid">
                            <div><b>01</b><strong>Checklist Submitted</strong><span>Contacts + that store's manager receive the submission with any issues found.</span></div>
                            <div><b>02</b><strong>Problem → Action Point</strong><span>Only answers that report a problem (e.g. “Any tile issues?” → Yes) become Action Points.</span></div>
                            <div><b>03</b><strong>Open / In Progress</strong><span>Status changes are emailed so the responsible team sees progress.</span></div>
                            <div><b>04</b><strong>Completed → Report</strong><span>After closure, the answer appears in Checklist Reports. “All OK” answers go there directly.</span></div>
                        </div>
                        <div className="checklist-email-note">
                            <b>Important:</b> Email failures never cancel a saved checklist or Action Point. Contacts with an empty or disabled email are skipped.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

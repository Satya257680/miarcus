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
    FaUserCheck,
    FaLayerGroup,
    FaExclamationTriangle
} from "react-icons/fa";
import "../../styles/pages/ChecklistEmailSettings.css";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import "../../styles/premium/ModulesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";

// ======================================================
// ACTION POINTS – EMAIL ROUTING
// ======================================================
// Completely separate from Checklist Email Routing:
//   • its own contact list with per-event switches
//   • the manager of the SPECIFIC store only (never other stores)
//   • optionally the submitter and the assigned person
//   • one email per store submission listing every Action Point
// ======================================================

const API_URL = "/api/action-point-email-settings";

const defaults = {
    action_point_created_enabled: 1,
    action_point_status_enabled: 1,
    action_point_completed_enabled: 1,
    store_manager_recipients_enabled: 1,
    submitter_recipients_enabled: 1,
    assignee_recipients_enabled: 1,
    one_email_per_store: 1,
    recipients: []
};

const events = [
    {
        key: "action_point_created_enabled",
        column: "send_on_ap_created",
        short: "Generated",
        icon: FaTasks,
        title: "Action Point generated",
        description: "Sent when a checklist answer reports a problem (one email per store listing all of them) or an Action Point is created manually.",
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
    send_on_ap_created: 1,
    send_on_ap_status: 1,
    send_on_ap_completed: 1,
    is_new: true
});

export default function ActionPointEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(defaults);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get(API_URL)
            .then(({ data }) => setSettings({ ...defaults, ...(data?.data || {}), recipients: data?.data?.recipients || [] }))
            .catch(err => setError(err.response?.data?.message || "Unable to load Action Point email settings."))
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
            const { data } = await axios.put(API_URL, payload);
            setSettings({ ...defaults, ...(data?.data || payload), recipients: data?.data?.recipients || payload.recipients });
            setMessage("Action Point email routing saved successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save Action Point email settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="checklist-email-settings-page pp-premium er-legacy">
            <PremiumHero
                icon={FaEnvelope}
                eyebrow="Checklist & Controls · Action Point email routing"
                title="Email Routing"
                badge="Action Points"
                subtitle="Choose exactly who is emailed for Action Points – separate from the Checklist email."
                meta={[
                    { label: "Contacts", value: String(settings.recipients.length) },
                    { label: "Active", value: String(activeCount) }
                ]}
                actions={<>
                    <button type="button" className="pp-hero-btn" onClick={() => navigate("/settings")}><FaArrowLeft /> Settings</button>
                    <button type="button" className="pp-hero-btn" onClick={() => navigate("/settings/checklist-email")}><FaClipboardCheck /> Checklist Routing</button>
                    <button type="button" className="pp-hero-btn pp-hero-btn--solid" onClick={save} disabled={saving || loading}><FaSave /> {saving ? "Saving..." : "Save Settings"}</button>
                </>}
            />

            {message && <div className="checklist-email-alert success"><FaCheckCircle /> {message}</div>}
            {error && <div className="checklist-email-alert error"><FaExclamationTriangle /> {error}</div>}

            {loading ? (
                <div className="checklist-email-card loading"><PremiumLoader compact title="Loading Action Point email routing" /></div>
            ) : (
                <>
                    {/* ================= STORE-LEVEL RECIPIENTS ================= */}
                    <div className="checklist-email-card">
                        <div className="checklist-email-card-head">
                            <FaStore />
                            <div>
                                <h2>Store recipients</h2>
                                <p>Resolved automatically for every Action Point event. Only people of the store the Action Point belongs to are emailed – never managers of other stores.</p>
                            </div>
                        </div>

                        <div className="checklist-recipient-grid">
                            <div className={`checklist-recipient-box ${settings.store_manager_recipients_enabled ? "active" : ""}`}>
                                <div className="checklist-recipient-icon"><FaStore /></div>
                                <div className="checklist-recipient-copy">
                                    <strong>That store's manager</strong>
                                    <span>The manager assigned to the Action Point's store (Chat Store Manager, or the store's email in Store Management).</span>
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
                                    <span>The employee who filled in the checklist gets the Action Points raised from it and their follow-ups.</span>
                                </div>
                                <label className="checklist-switch">
                                    <input type="checkbox" checked={Boolean(settings.submitter_recipients_enabled)} onChange={e => setValue("submitter_recipients_enabled", e.target.checked)} />
                                    <span />
                                </label>
                            </div>

                            <div className={`checklist-recipient-box ${settings.assignee_recipients_enabled ? "active" : ""}`}>
                                <div className="checklist-recipient-icon"><FaUserCheck /></div>
                                <div className="checklist-recipient-copy">
                                    <strong>Assigned person</strong>
                                    <span>The user an Action Point is assigned to (Assigned To) is emailed about it.</span>
                                </div>
                                <label className="checklist-switch">
                                    <input type="checkbox" checked={Boolean(settings.assignee_recipients_enabled)} onChange={e => setValue("assignee_recipients_enabled", e.target.checked)} />
                                    <span />
                                </label>
                            </div>

                            <div className={`checklist-recipient-box ${settings.one_email_per_store ? "active" : ""}`}>
                                <div className="checklist-recipient-icon"><FaLayerGroup /></div>
                                <div className="checklist-recipient-copy">
                                    <strong>One email per store</strong>
                                    <span>When a checklist raises several Action Points, the store gets ONE email listing all of them (like the Checklist email). Off = one email per Action Point.</span>
                                </div>
                                <label className="checklist-switch">
                                    <input type="checkbox" checked={Boolean(settings.one_email_per_store)} onChange={e => setValue("one_email_per_store", e.target.checked)} />
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
                                <h2>Action Point email contacts <em className="checklist-count-pill">{activeCount} active</em></h2>
                                <p>Head-office people who should follow Action Points (Retail Head, VM, Operations …). This list is separate from the Checklist email contacts. Tick the events each contact should receive.</p>
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
                                <p>Master switches for Action Point emails. When an event is off, nobody receives that email. The Checklist email is controlled in Checklist Email Routing.</p>
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
                                <h2>Action Point workflow</h2>
                                <p>The email flow follows the same lifecycle as the application.</p>
                            </div>
                        </div>
                        <div className="checklist-flow-grid">
                            <div><b>01</b><strong>Checklist Submitted</strong><span>The Checklist email goes to the Checklist routing only – not to these contacts.</span></div>
                            <div><b>02</b><strong>Problem → Action Points</strong><span>One Action Point email per store submission, listing every Action Point raised.</span></div>
                            <div><b>03</b><strong>Open / In Progress</strong><span>Status changes are emailed so the responsible team sees progress.</span></div>
                            <div><b>04</b><strong>Completed → Report</strong><span>After closure, the answer appears in Checklist Reports.</span></div>
                        </div>
                        <div className="checklist-email-note">
                            <b>Important:</b> Email failures never cancel a saved checklist or Action Point. Contacts with an empty or disabled email are skipped. Remember to click <b>Save Settings</b>.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

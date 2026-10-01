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
    FaUserEdit,
    FaUserTie,
    FaPlus,
    FaTrash,
    FaPaperPlane,
    FaPlaneDeparture,
    FaThumbsUp,
    FaThumbsDown,
    FaStore,
    FaCommentDots,
    FaBan,
    FaSearch,
    FaExclamationCircle,
    FaAddressBook,
    FaToggleOn
} from "react-icons/fa";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import "../../styles/premium/ModulesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import InsightStrip from "../../components/premium/InsightStrip";

// ======================================================
// TRAVEL PLAN – EMAIL ROUTING  (Settings → Operations)
// Same pattern as Petty Cash / Checklist routing:
//   master ON/OFF  -> OFF: nobody receives a Travel Plan email
//   per-event switches
//   who filled the visit plan + approvers
//   specific contacts with a tick per event
// ======================================================

const API_URL = "/api/travel-plan-email-settings";

const EVENTS = [
    { key: "plan_submitted", title: "Visit plan submitted", text: "A visit plan is created / edited and waits for approval.", icon: FaPlaneDeparture, tone: "violet", short: "Submitted" },
    { key: "plan_approved", title: "Travel plan approved", text: "An approver approves the month's travel plan.", icon: FaThumbsUp, tone: "green", short: "Approved" },
    { key: "plan_rejected", title: "Travel plan rejected", text: "An approver rejects the plan (with the reason).", icon: FaThumbsDown, tone: "red", short: "Rejected" },
    { key: "actual_updated", title: "Actual stores updated", text: "The employee records the stores actually visited.", icon: FaStore, tone: "blue", short: "Actual" },
    { key: "remark_added", title: "Remark added", text: "A remark / attachment is added on a travel plan.", icon: FaCommentDots, tone: "amber", short: "Remark" },
    { key: "plan_deleted", title: "Visit plan deleted", text: "A planned visit is permanently deleted.", icon: FaBan, tone: "red", short: "Deleted" }
];

const DEFAULTS = {
    master_enabled: true,
    plan_submitted: true,
    plan_approved: true,
    plan_rejected: true,
    actual_updated: true,
    remark_added: true,
    plan_deleted: true,
    include_employee: true,
    include_approvers: true,
    recipients: []
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const newContact = () => ({
    role_key: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role_label: "Sales Head",
    contact_name: "",
    email: "",
    enabled: true,
    ...Object.fromEntries(EVENTS.map((e) => [e.key, true]))
});

export default function TravelPlanEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        axios.get(API_URL)
            .then(({ data }) => setSettings({ ...DEFAULTS, ...(data?.data || {}), recipients: data?.data?.recipients || [] }))
            .catch((err) => setError(err.response?.data?.message || "Unable to load Travel Plan email settings."))
            .finally(() => setLoading(false));
    }, []);

    const touch = () => { setMessage(""); setError(""); setDirty(true); };
    const set = (patch) => { touch(); setSettings((prev) => ({ ...prev, ...patch })); };

    const updateRecipient = (roleKey, patch) => {
        touch();
        setSettings((prev) => ({ ...prev, recipients: prev.recipients.map((r) => (r.role_key === roleKey ? { ...r, ...patch } : r)) }));
    };
    const setAll = (field, value) => {
        touch();
        setSettings((prev) => ({ ...prev, recipients: prev.recipients.map((r) => ({ ...r, [field]: value })) }));
    };
    const addContact = () => { touch(); setSettings((prev) => ({ ...prev, recipients: [...prev.recipients, newContact()] })); };
    const removeContact = (roleKey) => { touch(); setSettings((prev) => ({ ...prev, recipients: prev.recipients.filter((r) => r.role_key !== roleKey) })); };

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return settings.recipients;
        return settings.recipients.filter((r) => `${r.role_label} ${r.contact_name} ${r.email}`.toLowerCase().includes(q));
    }, [settings.recipients, search]);

    const enabledContacts = settings.recipients.filter((r) => r.enabled && isValidEmail(r.email)).length;
    const activeEvents = EVENTS.filter((e) => settings[e.key]).length;

    const save = async () => {
        const invalid = settings.recipients.find((r) => !isValidEmail(r.email));
        if (invalid) {
            setError(invalid.email ? `Fix the invalid email address: ${invalid.email}` : "Every contact needs an email address (or remove the empty row).");
            return;
        }
        const unnamed = settings.recipients.find((r) => !String(r.contact_name || "").trim() || !String(r.role_label || "").trim());
        if (unnamed) {
            setError("Role and name are mandatory for every contact.");
            return;
        }
        setSaving(true);
        setMessage("");
        setError("");
        try {
            const { data } = await axios.put(API_URL, settings);
            setSettings({ ...DEFAULTS, ...(data?.data || settings), recipients: data?.data?.recipients || settings.recipients });
            setDirty(false);
            setMessage(settings.master_enabled
                ? "Travel Plan email routing saved. Emails are ON."
                : "Travel Plan email routing saved. Emails are OFF – nobody will receive Travel Plan emails.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save Travel Plan email settings.");
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async () => {
        if (dirty) {
            setError("Save your changes first, then send the test email.");
            return;
        }
        setTesting(true);
        setMessage("");
        setError("");
        try {
            const { data } = await axios.post(`${API_URL}/test`);
            setMessage(data?.message || "Test email sent.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to send the test email.");
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="petty-page pp-premium er-page">
            <PremiumHero
                icon={FaEnvelope}
                eyebrow="Sales Team · Travel Plan email routing"
                title="Travel Plan Email Notifications"
                badge={settings.master_enabled ? "Emails on" : "Emails off"}
                badgeTone={settings.master_enabled ? "mint" : "gold"}
                subtitle="Choose which Visit Planner / Travel Plan events send email and exactly who receives them — like Petty Cash and Checklist routing."
                meta={[
                    { label: "Events on", value: `${activeEvents}/${EVENTS.length}` },
                    { label: "Contacts", value: String(enabledContacts) }
                ]}
                actions={
                    <>
                        <button type="button" className="pp-hero-btn" onClick={() => navigate("/settings")}><FaArrowLeft /> Settings</button>
                        <button type="button" className="pp-hero-btn" onClick={sendTest} disabled={testing || loading}><FaPaperPlane /> {testing ? "Sending..." : "Send Test Email"}</button>
                        <button type="button" className="pp-hero-btn pp-hero-btn--solid" onClick={save} disabled={saving || loading}><FaSave /> {saving ? "Saving..." : "Save Settings"}</button>
                    </>
                }
            />

            <InsightStrip
                loading={loading}
                items={[
                    { key: "master", label: "Master switch", value: settings.master_enabled ? "ON" : "OFF", hint: "All Travel Plan emails", tone: settings.master_enabled ? "green" : "red", icon: FaToggleOn, onClick: () => set({ master_enabled: !settings.master_enabled }) },
                    { key: "events", label: "Events enabled", value: `${activeEvents}/${EVENTS.length}`, hint: "Actions that send mail", tone: "violet", icon: FaEnvelope },
                    { key: "contacts", label: "Enabled contacts", value: enabledContacts, hint: "Specific contacts", tone: "blue", icon: FaAddressBook },
                    { key: "filler", label: "Plan filler", value: settings.include_employee ? "Included" : "Not included", hint: "Employee who filled the visit plan", tone: "amber", icon: FaUserEdit }
                ]}
            />

            {message && <div className="er-alert er-alert--success"><FaCheckCircle /> {message}</div>}
            {error && <div className="er-alert er-alert--error"><FaExclamationCircle /> {error}</div>}

            {loading ? (
                <div className="er-card er-card--loading"><PremiumLoader compact title="Loading email routing" /></div>
            ) : (
                <>
                    <section className="er-card">
                        <header className="er-card-head er-card-head--split">
                            <div className="er-card-head-left">
                                <span className="er-card-icon"><FaEnvelope /></span>
                                <div>
                                    <h2>Travel Plan Emails</h2>
                                    <p><b>OFF</b> – nobody receives any Travel Plan email (not approvers, not the employee, not contacts). <b>ON</b> – the events below go to the selected people.</p>
                                </div>
                            </div>
                            <label className="er-switch er-switch--lg">
                                <input type="checkbox" checked={Boolean(settings.master_enabled)} onChange={(e) => set({ master_enabled: e.target.checked })} />
                                <span className="er-switch-track"><i /></span>
                                <b>{settings.master_enabled ? "ON" : "OFF"}</b>
                            </label>
                        </header>

                        <div className={`er-event-grid ${settings.master_enabled ? "" : "is-muted"}`}>
                            {EVENTS.map(({ key, title, text, icon: Icon, tone }) => (
                                <div className={`er-event er-tone-${tone} ${settings[key] ? "is-on" : ""}`} key={key}>
                                    <span className="er-event-icon"><Icon /></span>
                                    <div className="er-event-copy">
                                        <strong>{title}</strong>
                                        <span>{text}</span>
                                    </div>
                                    <label className="er-switch">
                                        <input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => set({ [key]: e.target.checked })} aria-label={title} />
                                        <span className="er-switch-track"><i /></span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="er-card">
                        <header className="er-card-head">
                            <span className="er-card-icon er-card-icon--amber"><FaUsers /></span>
                            <div>
                                <h2>Who receives the email</h2>
                                <p>Specific contacts below always receive the events ticked on their row. These switches add the people of the plan itself.</p>
                            </div>
                        </header>

                        <div className={`er-event-grid ${settings.master_enabled ? "" : "is-muted"}`}>
                            <div className={`er-event er-tone-violet ${settings.include_employee ? "is-on" : ""}`}>
                                <span className="er-event-icon"><FaUserEdit /></span>
                                <div className="er-event-copy">
                                    <strong>Who filled the visit plan</strong>
                                    <span>The employee of the plan (and the person who created it for them) receives every enabled event.</span>
                                </div>
                                <label className="er-switch">
                                    <input type="checkbox" checked={Boolean(settings.include_employee)} onChange={(e) => set({ include_employee: e.target.checked })} />
                                    <span className="er-switch-track"><i /></span>
                                </label>
                            </div>
                            <div className={`er-event er-tone-blue ${settings.include_approvers ? "is-on" : ""}`}>
                                <span className="er-event-icon"><FaUserTie /></span>
                                <div className="er-event-copy">
                                    <strong>Approvers</strong>
                                    <span>Reporting manager and administrators receive the “submitted for approval” email.</span>
                                </div>
                                <label className="er-switch">
                                    <input type="checkbox" checked={Boolean(settings.include_approvers)} onChange={(e) => set({ include_approvers: e.target.checked })} />
                                    <span className="er-switch-track"><i /></span>
                                </label>
                            </div>
                        </div>
                    </section>

                    <section className="er-card">
                        <header className="er-card-head er-card-head--split">
                            <div className="er-card-head-left">
                                <span className="er-card-icon er-card-icon--teal"><FaAddressBook /></span>
                                <div>
                                    <h2>Specific Contacts <span className="er-count">{settings.recipients.length}</span></h2>
                                    <p>Sales heads, regional managers, accounts… Role, name and email are mandatory. Tick the events each contact should receive.</p>
                                </div>
                            </div>
                            <div className="er-search">
                                <FaSearch />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, role or email..." />
                            </div>
                        </header>

                        <div className="er-bulk">
                            <button type="button" className="er-bulk-btn er-bulk-btn--primary" onClick={addContact}><FaPlus /> Add Email</button>
                            <button type="button" className="er-bulk-btn" onClick={() => setAll("enabled", true)}>Select All Enable</button>
                            <button type="button" className="er-bulk-btn" onClick={() => setAll("enabled", false)}>Select All Disable</button>
                            {EVENTS.map((event) => (
                                <button type="button" key={event.key} className="er-bulk-btn" onClick={() => setAll(event.key, !settings.recipients.every((r) => r[event.key]))}>
                                    Toggle {event.short}
                                </button>
                            ))}
                        </div>

                        <div className="er-table-wrap">
                            <table className="er-table">
                                <thead>
                                    <tr>
                                        <th>Role *</th>
                                        <th>Name *</th>
                                        <th>Email *</th>
                                        <th>Enabled</th>
                                        {EVENTS.map((e) => <th key={e.key} title={e.title}>{e.short}</th>)}
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.length === 0 ? (
                                        <tr>
                                            <td colSpan={5 + EVENTS.length} className="er-empty">
                                                {search ? "No contacts match your search." : "No contacts yet. Click Add Email to add head-office contacts."}
                                            </td>
                                        </tr>
                                    ) : visible.map((r) => (
                                        <tr key={r.role_key} className={r.enabled ? "" : "is-off"}>
                                            <td><input className={`er-input ${!String(r.role_label || "").trim() ? "is-invalid" : ""}`} value={r.role_label || ""} onChange={(e) => updateRecipient(r.role_key, { role_label: e.target.value })} placeholder="Role / team" /></td>
                                            <td><input className={`er-input ${!String(r.contact_name || "").trim() ? "is-invalid" : ""}`} value={r.contact_name || ""} onChange={(e) => updateRecipient(r.role_key, { contact_name: e.target.value })} placeholder="Contact name" /></td>
                                            <td><input className={`er-input ${!isValidEmail(r.email) ? "is-invalid" : ""}`} type="email" value={r.email || ""} onChange={(e) => updateRecipient(r.role_key, { email: e.target.value })} placeholder="email@example.com" /></td>
                                            <td className="er-center">
                                                <label className="er-switch er-switch--sm">
                                                    <input type="checkbox" checked={Boolean(r.enabled)} onChange={(e) => updateRecipient(r.role_key, { enabled: e.target.checked })} aria-label="Enabled" />
                                                    <span className="er-switch-track"><i /></span>
                                                </label>
                                            </td>
                                            {EVENTS.map((e) => (
                                                <td className="er-center" key={e.key}>
                                                    <input type="checkbox" className="er-check" checked={Boolean(r[e.key])} disabled={!r.enabled} onChange={(ev) => updateRecipient(r.role_key, { [e.key]: ev.target.checked })} aria-label={`${e.title} for ${r.contact_name || r.email}`} />
                                                </td>
                                            ))}
                                            <td className="er-center">
                                                <button type="button" className="er-remove" onClick={() => removeContact(r.role_key)} title="Remove contact"><FaTrash /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="er-note">
                            <b>How it works:</b> Master <b>OFF</b> = no Travel Plan email at all. Master <b>ON</b> = each enabled event goes to the contacts ticked for it,
                            plus the employee who filled the visit plan (and approvers for submissions) when those switches are on. Changes apply after <b>Save Settings</b>.
                        </div>
                    </section>

                    <div className="er-savebar">
                        <span>{settings.recipients.length} contact(s) · {activeEvents} event(s) on · master {settings.master_enabled ? "ON" : "OFF"}{dirty ? " · unsaved changes" : ""}</span>
                        <button type="button" className="pp-btn pp-btn--primary" onClick={save} disabled={saving}>
                            <FaSave /> {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

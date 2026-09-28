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
    FaUser,
    FaUserShield,
    FaPlus,
    FaTrash,
    FaPaperPlane,
    FaMoneyBillWave,
    FaReceipt,
    FaUniversity,
    FaClipboardCheck,
    FaBan,
    FaSearch,
    FaExclamationCircle,
    FaAddressBook,
    FaToggleOn
} from "react-icons/fa";
import "./PettyCash.css";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import "../../styles/premium/ModulesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import InsightStrip from "../../components/premium/InsightStrip";
import { initials, avatarTone } from "../../utils/premiumFormat";

// ======================================================
// PETTY CASH – EMAIL ROUTING
// Same pattern as the NSO / Checklist / Daily Collection
// email pages: a master switch, one card per event,
// a recipient mode and an editable contact list.
// ======================================================

const EVENTS = [
    { key: "advance_created", title: "New advance created", text: "A manager issues a new petty cash advance.", icon: FaMoneyBillWave, tone: "violet", short: "Advance" },
    { key: "expense_added", title: "Expense added", text: "An employee records an expense against an advance.", icon: FaReceipt, tone: "blue", short: "Expense" },
    { key: "deposit_added", title: "Unused cash deposited", text: "Unused cash is returned to the manager.", icon: FaUniversity, tone: "green", short: "Deposit" },
    { key: "settlement_completed", title: "Settlement completed", text: "An advance is fully settled and closed.", icon: FaClipboardCheck, tone: "amber", short: "Settle" },
    { key: "advance_cancelled", title: "Advance deleted / cancelled", text: "An advance is permanently deleted.", icon: FaBan, tone: "red", short: "Cancel" }
];

const MODES = [
    { id: "direct", title: "Direct User(s)", text: "Only the giver and receiver of that advance.", icon: FaUser },
    { id: "specific", title: "Specific contacts", text: "Contacts ticked below for each event (plus direct users if enabled).", icon: FaUserShield },
    { id: "everyone", title: "Everyone", text: "Every active user with a valid email address.", icon: FaUsers }
];

const DEFAULTS = {
    master_enabled: true,
    advance_created: true,
    expense_added: true,
    deposit_added: true,
    settlement_completed: true,
    advance_cancelled: true,
    recipient_mode: "direct",
    include_direct: true,
    recipients: []
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export default function PettyCashEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        axios.get("/api/petty-cash/email-settings")
            .then(({ data }) => setSettings({ ...DEFAULTS, ...(data?.data || {}), recipients: data?.data?.recipients || [] }))
            .catch((err) => setError(err.response?.data?.message || "Unable to load email settings."))
            .finally(() => setLoading(false));
    }, []);

    const set = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

    const updateRecipient = (roleKey, patch) =>
        setSettings((prev) => ({
            ...prev,
            recipients: prev.recipients.map((row) => (row.role_key === roleKey ? { ...row, ...patch } : row))
        }));

    const setAll = (field, value) =>
        setSettings((prev) => ({ ...prev, recipients: prev.recipients.map((row) => ({ ...row, [field]: value })) }));

    const addEmail = () => {
        const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        setSettings((prev) => ({
            ...prev,
            recipients: [
                ...prev.recipients,
                {
                    role_key: key,
                    role_label: "Accounts",
                    contact_name: "",
                    email: "",
                    is_custom: true,
                    enabled: true,
                    advance_created: true,
                    expense_added: true,
                    deposit_added: true,
                    settlement_completed: true,
                    advance_cancelled: true
                }
            ]
        }));
    };

    const removeRecipient = (roleKey) =>
        setSettings((prev) => ({ ...prev, recipients: prev.recipients.filter((row) => row.role_key !== roleKey) }));

    const visibleRecipients = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return settings.recipients;
        return settings.recipients.filter((row) =>
            `${row.role_label} ${row.contact_name} ${row.email}`.toLowerCase().includes(q)
        );
    }, [settings.recipients, search]);

    const enabledContacts = settings.recipients.filter((row) => row.enabled && row.email).length;
    const activeEvents = EVENTS.filter((event) => settings[event.key]).length;
    const invalidEmails = settings.recipients.filter((row) => row.email && !isValidEmail(row.email));

    const save = async () => {
        if (invalidEmails.length) {
            setError(`Fix the invalid email address: ${invalidEmails[0].email}`);
            return;
        }
        setSaving(true);
        setMessage("");
        setError("");
        try {
            const { data } = await axios.put("/api/petty-cash/email-settings", settings);
            setSettings({ ...DEFAULTS, ...(data?.data || settings), recipients: data?.data?.recipients || settings.recipients });
            setMessage("Petty Cash email routing saved successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save email settings.");
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async () => {
        setTesting(true);
        setMessage("");
        setError("");
        try {
            const { data } = await axios.post("/api/petty-cash/email-settings/test");
            setMessage(data?.message || "Test email sent.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to send test emails. Save your contacts first.");
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="petty-page pp-premium er-page">
            <PremiumHero
                icon={FaEnvelope}
                eyebrow="Petty Cash · Email routing"
                title="Email Notifications"
                badge={settings.master_enabled ? "Emails on" : "Emails off"}
                badgeTone={settings.master_enabled ? "mint" : "gold"}
                subtitle="Choose which Petty Cash events send email and exactly who receives them — like NSO, Checklist and Daily Collection routing."
                meta={[
                    { label: "Mode", value: MODES.find((m) => m.id === settings.recipient_mode)?.title },
                    { label: "Events on", value: `${activeEvents}/${EVENTS.length}` },
                    { label: "Contacts", value: String(enabledContacts) }
                ]}
                actions={
                    <>
                        <button type="button" className="pp-hero-btn" onClick={() => navigate("/petty-cash")}>
                            <FaArrowLeft /> Back
                        </button>
                        <button type="button" className="pp-hero-btn" onClick={sendTest} disabled={testing || loading}>
                            <FaPaperPlane /> {testing ? "Sending..." : "Send Test Emails"}
                        </button>
                        <button type="button" className="pp-hero-btn pp-hero-btn--solid" onClick={save} disabled={saving || loading}>
                            <FaSave /> {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </>
                }
            />

            <InsightStrip
                loading={loading}
                items={[
                    { key: "master", label: "Master switch", value: settings.master_enabled ? "ON" : "OFF", hint: "All Petty Cash emails", tone: settings.master_enabled ? "green" : "red", icon: FaToggleOn, onClick: () => set({ master_enabled: !settings.master_enabled }) },
                    { key: "events", label: "Events enabled", value: `${activeEvents}/${EVENTS.length}`, hint: "Actions that send mail", tone: "violet", icon: FaEnvelope },
                    { key: "contacts", label: "Enabled contacts", value: enabledContacts, hint: "Used in Specific mode", tone: "blue", icon: FaAddressBook },
                    { key: "mode", label: "Recipient mode", value: MODES.find((m) => m.id === settings.recipient_mode)?.title, hint: settings.recipient_mode === "specific" && settings.include_direct ? "+ giver & receiver" : "Who receives mail", tone: "amber", icon: FaUsers }
                ]}
            />

            {message && <div className="er-alert er-alert--success"><FaCheckCircle /> {message}</div>}
            {error && <div className="er-alert er-alert--error"><FaExclamationCircle /> {error}</div>}

            {loading ? (
                <div className="er-card er-card--loading"><PremiumLoader compact title="Loading email routing" /></div>
            ) : (
                <>
                    {/* ================= EVENTS ================= */}
                    <section className="er-card">
                        <header className="er-card-head er-card-head--split">
                            <div className="er-card-head-left">
                                <span className="er-card-icon"><FaEnvelope /></span>
                                <div>
                                    <h2>Petty Cash Emails</h2>
                                    <p>The master switch turns every Petty Cash email on or off. Each event can also be switched individually.</p>
                                </div>
                            </div>
                            <label className="er-switch er-switch--lg">
                                <input
                                    type="checkbox"
                                    checked={Boolean(settings.master_enabled)}
                                    onChange={(e) => set({ master_enabled: e.target.checked })}
                                />
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
                                        <input
                                            type="checkbox"
                                            checked={Boolean(settings[key])}
                                            onChange={(e) => set({ [key]: e.target.checked })}
                                            aria-label={title}
                                        />
                                        <span className="er-switch-track"><i /></span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ================= RECIPIENT MODE ================= */}
                    <section className="er-card">
                        <header className="er-card-head">
                            <span className="er-card-icon er-card-icon--amber"><FaUsers /></span>
                            <div>
                                <h2>Recipient Mode</h2>
                                <p>Direct sends only to the people in the transaction. Specific uses the contact list below. Everyone emails every active user.</p>
                            </div>
                        </header>

                        <div className="er-mode-grid">
                            {MODES.map(({ id, title, text, icon: Icon }) => (
                                <button
                                    type="button"
                                    key={id}
                                    className={`er-mode ${settings.recipient_mode === id ? "is-on" : ""}`}
                                    onClick={() => set({ recipient_mode: id })}
                                    aria-pressed={settings.recipient_mode === id}
                                >
                                    <span className="er-mode-icon"><Icon /></span>
                                    <span className="er-mode-copy">
                                        <strong>{title}</strong>
                                        <small>{text}</small>
                                    </span>
                                    <span className="er-mode-radio" />
                                </button>
                            ))}
                        </div>

                        {settings.recipient_mode === "specific" && (
                            <label className="er-inline-check">
                                <input
                                    type="checkbox"
                                    checked={Boolean(settings.include_direct)}
                                    onChange={(e) => set({ include_direct: e.target.checked })}
                                />
                                Also send to the giver and receiver of the advance
                            </label>
                        )}
                    </section>

                    {/* ================= CONTACTS ================= */}
                    <section className="er-card">
                        <header className="er-card-head er-card-head--split">
                            <div className="er-card-head-left">
                                <span className="er-card-icon er-card-icon--teal"><FaAddressBook /></span>
                                <div>
                                    <h2>Petty Cash Email Contacts <span className="er-count">{settings.recipients.length}</span></h2>
                                    <p>Every active administrator is listed automatically. Add extra emails (accounts, owners, regional heads) when needed.</p>
                                </div>
                            </div>
                            <div className="er-search">
                                <FaSearch />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, role or email..." />
                            </div>
                        </header>

                        <div className="er-bulk">
                            <button type="button" className="er-bulk-btn er-bulk-btn--primary" onClick={addEmail}><FaPlus /> Add Email</button>
                            <button type="button" className="er-bulk-btn" onClick={() => setAll("enabled", true)}>Select All Enable</button>
                            <button type="button" className="er-bulk-btn" onClick={() => setAll("enabled", false)}>Select All Disable</button>
                            {EVENTS.map((event) => (
                                <button
                                    type="button"
                                    key={event.key}
                                    className="er-bulk-btn"
                                    onClick={() => setAll(event.key, !settings.recipients.every((row) => row[event.key]))}
                                    title={`Toggle ${event.title} for every contact`}
                                >
                                    Toggle {event.short}
                                </button>
                            ))}
                        </div>

                        <div className="er-table-wrap">
                            <table className="er-table">
                                <thead>
                                    <tr>
                                        <th>Role</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Enabled</th>
                                        {EVENTS.map((event) => <th key={event.key} title={event.title}>{event.short}</th>)}
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRecipients.length === 0 ? (
                                        <tr>
                                            <td colSpan={5 + EVENTS.length} className="er-empty">
                                                {search ? "No contacts match your search." : "No contacts yet. Add an email to start using Specific mode."}
                                            </td>
                                        </tr>
                                    ) : visibleRecipients.map((row) => (
                                        <tr key={row.role_key} className={row.enabled ? "" : "is-off"}>
                                            <td>
                                                {row.is_custom ? (
                                                    <input className="er-input" value={row.role_label || ""} onChange={(e) => updateRecipient(row.role_key, { role_label: e.target.value })} placeholder="Role / team" />
                                                ) : (
                                                    <span className="pp-pill pp-pill--violet">{row.role_label || "Administrator"}</span>
                                                )}
                                            </td>
                                            <td>
                                                {row.is_custom ? (
                                                    <input className="er-input" value={row.contact_name || ""} onChange={(e) => updateRecipient(row.role_key, { contact_name: e.target.value })} placeholder="Contact name" />
                                                ) : (
                                                    <div className="pp-cell-main">
                                                        <span className={`pp-avatar pp-avatar--round pp-avatar--xs ${avatarTone(row.contact_name)}`}>{initials(row.contact_name)}</span>
                                                        <span className="pp-cell-title">{row.contact_name || "—"}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {row.is_custom ? (
                                                    <input
                                                        className={`er-input ${row.email && !isValidEmail(row.email) ? "is-invalid" : ""}`}
                                                        type="email"
                                                        value={row.email || ""}
                                                        onChange={(e) => updateRecipient(row.role_key, { email: e.target.value })}
                                                        placeholder="email@example.com"
                                                    />
                                                ) : (
                                                    <span className="er-email">{row.email}</span>
                                                )}
                                            </td>
                                            <td className="er-center">
                                                <label className="er-switch er-switch--sm">
                                                    <input type="checkbox" checked={Boolean(row.enabled)} onChange={(e) => updateRecipient(row.role_key, { enabled: e.target.checked })} aria-label="Enabled" />
                                                    <span className="er-switch-track"><i /></span>
                                                </label>
                                            </td>
                                            {EVENTS.map((event) => (
                                                <td className="er-center" key={event.key}>
                                                    <input
                                                        type="checkbox"
                                                        className="er-check"
                                                        checked={Boolean(row[event.key])}
                                                        disabled={!row.enabled}
                                                        onChange={(e) => updateRecipient(row.role_key, { [event.key]: e.target.checked })}
                                                        aria-label={`${event.title} for ${row.contact_name || row.email}`}
                                                    />
                                                </td>
                                            ))}
                                            <td className="er-center">
                                                {row.is_custom ? (
                                                    <button type="button" className="er-remove" onClick={() => removeRecipient(row.role_key)} title="Remove recipient">
                                                        <FaTrash />
                                                    </button>
                                                ) : (
                                                    <span className="pp-dash">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="er-note">
                            <b>How it works:</b> in <b>Specific</b> mode each enabled contact receives only the events ticked on their row.
                            Administrators are added automatically; removing admin rights removes them from this list. Changes apply after <b>Save Settings</b>.
                        </div>
                    </section>

                    <div className="er-savebar">
                        <span>{settings.recipients.length} contact(s) · {activeEvents} event(s) on · mode: {MODES.find((m) => m.id === settings.recipient_mode)?.title}</span>
                        <button type="button" className="pp-btn pp-btn--primary" onClick={save} disabled={saving}>
                            <FaSave /> {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

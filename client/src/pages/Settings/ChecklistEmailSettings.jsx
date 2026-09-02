import { useEffect, useState } from "react";
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
    FaBell
} from "react-icons/fa";
import "../../styles/pages/ChecklistEmailSettings.css";

const defaults = {
    checklist_submitted_enabled: 1,
    action_point_created_enabled: 1,
    action_point_status_enabled: 1,
    action_point_completed_enabled: 1,
    admin_recipients_enabled: 1,
    store_manager_recipients_enabled: 1
};

const events = [
    {
        key: "checklist_submitted_enabled",
        icon: FaClipboardCheck,
        title: "Checklist submitted",
        description: "Send when a store checklist is successfully submitted.",
        badge: "Submission"
    },
    {
        key: "action_point_created_enabled",
        icon: FaTasks,
        title: "Action Point generated",
        description: "Send when an Action Point is raised from a checklist or created manually.",
        badge: "Needs Action"
    },
    {
        key: "action_point_status_enabled",
        icon: FaBell,
        title: "Action Point status changed",
        description: "Send when an Action Point moves between Open and In Progress.",
        badge: "Progress"
    },
    {
        key: "action_point_completed_enabled",
        icon: FaCheck,
        title: "Action Point completed",
        description: "Send when the Action Point is closed and its checklist answer becomes reportable.",
        badge: "Completed"
    }
];

export default function ChecklistEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(defaults);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get("/api/checklist-email-settings")
            .then(({ data }) => setSettings({ ...defaults, ...(data?.data || {}) }))
            .catch(err => setError(err.response?.data?.message || "Unable to load Checklist email settings."))
            .finally(() => setLoading(false));
    }, []);

    const setValue = (key, value) => {
        setMessage("");
        setSettings(prev => ({ ...prev, [key]: value ? 1 : 0 }));
    };

    const save = async () => {
        setSaving(true);
        setMessage("");
        setError("");
        try {
            const { data } = await axios.put("/api/checklist-email-settings", settings);
            setSettings({ ...defaults, ...(data?.data || settings) });
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
                        <p>Control Checklist Submission and Action Point email notifications from one place.</p>
                    </div>
                </div>
                <button className="checklist-email-save" onClick={save} disabled={saving || loading}>
                    <FaSave /> {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            {message && <div className="checklist-email-alert success"><FaCheckCircle /> {message}</div>}
            {error && <div className="checklist-email-alert error"><FaBell /> {error}</div>}

            {loading ? (
                <div className="checklist-email-card loading">Loading email routing...</div>
            ) : (
                <>
                    <div className="checklist-email-card">
                        <div className="checklist-email-card-head">
                            <FaUsers />
                            <div>
                                <h2>Who receives the emails?</h2>
                                <p>Recipients are resolved automatically for every store event. No manual store-by-store email maintenance is required.</p>
                            </div>
                        </div>

                        <div className="checklist-recipient-grid">
                            <div className={`checklist-recipient-box ${settings.admin_recipients_enabled ? "active" : ""}`}>
                                <div className="checklist-recipient-icon"><FaUsers /></div>
                                <div className="checklist-recipient-copy">
                                    <strong>Administrators</strong>
                                    <span>All active Mi Arcus administrators with a valid email address.</span>
                                </div>
                                <label className="checklist-switch">
                                    <input type="checkbox" checked={Boolean(settings.admin_recipients_enabled)} onChange={e => setValue("admin_recipients_enabled", e.target.checked)} />
                                    <span />
                                </label>
                            </div>

                            <div className={`checklist-recipient-box ${settings.store_manager_recipients_enabled ? "active" : ""}`}>
                                <div className="checklist-recipient-icon"><FaStore /></div>
                                <div className="checklist-recipient-copy">
                                    <strong>Specific Store Manager</strong>
                                    <span>The manager assigned to that store in Store Management / Chat Store Manager.</span>
                                </div>
                                <label className="checklist-switch">
                                    <input type="checkbox" checked={Boolean(settings.store_manager_recipients_enabled)} onChange={e => setValue("store_manager_recipients_enabled", e.target.checked)} />
                                    <span />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="checklist-email-card">
                        <div className="checklist-email-card-head">
                            <FaEnvelope />
                            <div>
                                <h2>Notification Events</h2>
                                <p>Turn individual workflow emails on or off. Changes apply immediately after saving.</p>
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

                    <div className="checklist-email-card checklist-email-flow">
                        <div className="checklist-email-card-head">
                            <FaCheckCircle />
                            <div>
                                <h2>Checklist workflow</h2>
                                <p>The email flow follows the same lifecycle as the application.</p>
                            </div>
                        </div>
                        <div className="checklist-flow-grid">
                            <div><b>01</b><strong>Checklist Submitted</strong><span>Admin + specific store manager receive the submission alert.</span></div>
                            <div><b>02</b><strong>Action Point Generated</strong><span>Recipients are told that the store has an issue requiring action.</span></div>
                            <div><b>03</b><strong>Open / In Progress</strong><span>Status changes can be emailed so the responsible team sees progress.</span></div>
                            <div><b>04</b><strong>Completed → Report</strong><span>After closure, the related checklist answer appears in Checklist Reports.</span></div>
                        </div>
                        <div className="checklist-email-note">
                            <b>Important:</b> If a store has no assigned Store Manager, the email is still sent to enabled administrators. Email failures never cancel a saved checklist or Action Point.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

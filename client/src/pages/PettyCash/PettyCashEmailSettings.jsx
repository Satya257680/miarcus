import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaEnvelope, FaSave, FaCheckCircle } from "react-icons/fa";
import "./PettyCash.css";

const defaults = {
    advance_created: true,
    expense_added: true,
    deposit_added: true,
    settlement_completed: true,
    advance_cancelled: true,
    send_to_giver: true,
    send_to_receiver: true,
    send_to_reporting_manager: false,
    send_to_admins: false
};

const labels = [
    ["advance_created", "New advance created", "Send an email when a new petty cash advance is created."],
    ["expense_added", "Expense added", "Send an email when an employee records an expense."],
    ["deposit_added", "Unused cash deposited", "Send an email when unused cash is returned."],
    ["settlement_completed", "Settlement completed", "Send an email when an advance is settled."],
    ["advance_cancelled", "Advance deleted / cancelled", "Send an email when an advance is permanently deleted."]
];

const recipientLabels = [
    ["send_to_giver", "Advance giver / Manager", "Send notifications to the manager who gave the advance."],
    ["send_to_receiver", "Employee / Receiver", "Send notifications to the employee who received the advance."],
    ["send_to_reporting_manager", "Reporting Manager", "Also send to the reporting manager configured on the employee profile."],
    ["send_to_admins", "System Administrators", "Also send to active users marked as Admin / Administrator."],
];

export default function PettyCashEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(defaults);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get("/api/petty-cash/email-settings")
            .then(({ data }) => setSettings({ ...defaults, ...(data?.data || {}) }))
            .catch((err) => setError(err.response?.data?.message || "Unable to load email settings."))
            .finally(() => setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true); setMessage(""); setError("");
        try {
            const { data } = await axios.put("/api/petty-cash/email-settings", settings);
            setSettings({ ...defaults, ...(data?.data || settings) });
            setMessage("Email notification settings saved successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save email settings.");
        } finally { setSaving(false); }
    };

    return (
        <div className="petty-page">
            <div className="petty-page-header">
                <div className="petty-header-with-back">
                    <button className="petty-back-btn" onClick={() => navigate("/petty-cash")}><FaArrowLeft /></button>
                    <div>
                        <span className="petty-eyebrow">Petty Cash</span>
                        <h1>Email Notifications</h1>
                        <p>Choose which Petty Cash events should send email to your account.</p>
                    </div>
                </div>
                <button className="petty-btn primary large" onClick={save} disabled={saving || loading}><FaSave /> {saving ? "Saving..." : "Save Settings"}</button>
            </div>

            {message && <div className="petty-success global"><FaCheckCircle /> {message}</div>}
            {error && <div className="petty-error global">{error}</div>}

            <div className="petty-card petty-email-settings-card">
                <div className="petty-card-title"><FaEnvelope /><div><h2>Email Notifications</h2><p>Emails use the existing MIARCUS Gmail/OAuth mail service.</p></div></div>
                {loading ? <div className="petty-loading">Loading settings...</div> : (
                    <>
                        <div className="petty-email-section-title">What should send an email?</div>
                        <div className="petty-email-setting-list">
                            {labels.map(([key, title, description]) => (
                                <label className="petty-email-setting-row" key={key}>
                                    <div><strong>{title}</strong><span>{description}</span></div>
                                    <input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))} />
                                </label>
                            ))}
                        </div>

                        <div className="petty-email-section-title recipient">Who should receive those emails?</div>
                        <div className="petty-email-setting-list">
                            {recipientLabels.map(([key, title, description]) => (
                                <label className="petty-email-setting-row" key={key}>
                                    <div><strong>{title}</strong><span>{description}</span></div>
                                    <input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))} />
                                </label>
                            ))}
                        </div>
                        <div className="petty-email-help">Example: enable <b>Expense added</b> + <b>Reporting Manager</b> + <b>System Administrators</b> to notify management whenever an employee records an expense.</div>
                    </>
                )}
            </div>
        </div>
    );
}

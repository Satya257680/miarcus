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
    advance_cancelled: true
};

const labels = [
    ["advance_created", "New advance created", "Email me when a petty cash advance is created for me."],
    ["expense_added", "Expense added", "Email the giver when the receiver records an expense."],
    ["deposit_added", "Unused cash deposited", "Email the giver when the receiver returns unused cash."],
    ["settlement_completed", "Settlement completed", "Email me when the giver completes settlement."],
    ["advance_cancelled", "Advance deleted / cancelled", "Email participants when an advance is cancelled."]
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
                    <div className="petty-email-setting-list">
                        {labels.map(([key, title, description]) => (
                            <label className="petty-email-setting-row" key={key}>
                                <div><strong>{title}</strong><span>{description}</span></div>
                                <input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))} />
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

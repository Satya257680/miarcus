import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaEnvelope, FaSave, FaCheckCircle, FaUsers, FaUserShield, FaPlus, FaTrash } from "react-icons/fa";
import "../../styles/pages/NSOEmailSettings.css";

const emptySettings = { create_recipient_mode: "all", update_recipient_mode: "all", recipients: [] };

export default function NSOEmailSettings() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(emptySettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get("/api/new-store-opening-email-settings")
            .then(({ data }) => setSettings({ ...emptySettings, ...(data?.data || {}) }))
            .catch(err => setError(err.response?.data?.message || "Unable to load NSO email settings."))
            .finally(() => setLoading(false));
    }, []);

    const updateRecipient = (index, patch) => setSettings(prev => ({ ...prev, recipients: prev.recipients.map((row, i) => i === index ? { ...row, ...patch } : row) }));

    const addEmail = () => {
        const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        setSettings(prev => ({
            ...prev,
            recipients: [
                ...prev.recipients,
                {
                    role_key: key,
                    role_label: "New Recipient",
                    contact_name: "",
                    email: "",
                    enabled: 1,
                    send_on_create: 1,
                    send_on_update: 1,
                    is_custom: true
                }
            ]
        }));
    };

    const removeRecipient = (index) => {
        setSettings(prev => ({ ...prev, recipients: prev.recipients.filter((_, i) => i !== index) }));
    };

    const setAllFor = (event, checked) => {
        const field = event === "create" ? "send_on_create" : "send_on_update";
        setSettings(prev => ({ ...prev, recipients: prev.recipients.map(row => ({ ...row, [field]: checked })) }));
    };
    const save = async () => {
        setSaving(true); setMessage(""); setError("");
        try {
            const { data } = await axios.put("/api/new-store-opening-email-settings", settings);
            setSettings({ ...emptySettings, ...(data?.data || settings) });
            setMessage("New Store Opening email routing saved successfully.");
        } catch (err) { setError(err.response?.data?.message || "Unable to save NSO email settings."); }
        finally { setSaving(false); }
    };

    return <div className="nso-email-settings-page">
        <div className="nso-email-settings-header">
            <div className="nso-email-title-wrap">
                <button className="nso-email-back" onClick={() => navigate("/settings")}><FaArrowLeft /></button>
                <div><span>NEW STORE OPENINGS</span><h1>Email Routing</h1><p>Set who receives New Store Opening emails and manage specific recipients.</p></div>
            </div>
            <button className="nso-email-save" onClick={save} disabled={saving || loading}><FaSave /> {saving ? "Saving..." : "Save Settings"}</button>
        </div>
        {message && <div className="nso-email-alert success"><FaCheckCircle /> {message}</div>}
        {error && <div className="nso-email-alert error">{error}</div>}
        {loading ? <div className="nso-email-card loading">Loading email routing...</div> : <>
            <div className="nso-email-card">
                <div className="nso-email-card-head"><FaEnvelope /><div><h2>Recipient Mode</h2><p>Select All sends to every enabled contact. Specific uses the individual Create/Update selections below.</p></div></div>
                <div className="nso-mode-grid">
                    {["create", "update"].map(event => {
                        const key = event === "create" ? "create_recipient_mode" : "update_recipient_mode";
                        return <div className="nso-mode-box" key={event}>
                            <div><b>{event === "create" ? "When a project is created" : "When a project is updated"}</b><span>Send the project details and complete timeline.</span></div>
                            <div className="nso-mode-buttons">
                                {["all", "specific"].map(mode => <button key={mode} type="button" className={settings[key] === mode ? "active" : ""} onClick={() => setSettings(s => ({ ...s, [key]: mode }))}>{mode === "all" ? <FaUsers /> : <FaUserShield />} {mode === "all" ? "Select All" : "Specific"}</button>)}
                            </div>
                        </div>;
                    })}
                </div>
            </div>
            <div className="nso-email-card">
                <div className="nso-email-card-head"><FaUsers /><div><h2>NSO Email Contacts</h2><p>Default contacts are loaded from your supplied list. Edit them here when responsibilities change.</p></div></div>
                <div className="nso-email-bulk-actions">
                    <button type="button" onClick={addEmail} className="nso-add-email-btn"><FaPlus /> Add Email</button>
                    <button type="button" onClick={() => setSettings(prev => ({ ...prev, recipients: prev.recipients.map(row => ({ ...row, enabled: 1 })) }))}>Select All Enable</button>
                    <button type="button" onClick={() => setSettings(prev => ({ ...prev, recipients: prev.recipients.map(row => ({ ...row, enabled: 0 })) }))}>Select All Disable</button>
                    <button type="button" onClick={() => setAllFor("create", true)}>Select All Create</button>
                    <button type="button" onClick={() => setAllFor("create", false)}>Clear Create</button>
                    <button type="button" onClick={() => setAllFor("update", true)}>Select All Update</button>
                    <button type="button" onClick={() => setAllFor("update", false)}>Clear Update</button>
                </div>
                <div className="nso-email-table-wrap"><table className="nso-email-table"><thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Enabled</th><th>Create</th><th>Update</th><th>Action</th></tr></thead><tbody>
                    {settings.recipients.map((row, index) => <tr key={row.role_key}>
                        <td>{row.is_custom ? <input value={row.role_label || ""} onChange={e => updateRecipient(index, { role_label: e.target.value })} placeholder="Role / Department" /> : <b>{row.role_label}</b>}</td>
                        <td><input value={row.contact_name || ""} onChange={e => updateRecipient(index, { contact_name: e.target.value })} placeholder="Contact name" /></td>
                        <td><input type="email" value={row.email || ""} onChange={e => updateRecipient(index, { email: e.target.value })} placeholder="email@example.com" /></td>
                        <td><input type="checkbox" checked={Boolean(row.enabled)} onChange={e => updateRecipient(index, { enabled: e.target.checked })} /></td>
                        <td><input type="checkbox" checked={Boolean(row.send_on_create)} onChange={e => updateRecipient(index, { send_on_create: e.target.checked })} /></td>
                        <td><input type="checkbox" checked={Boolean(row.send_on_update)} onChange={e => updateRecipient(index, { send_on_update: e.target.checked })} /></td>
                        <td>{row.is_custom ? <button type="button" className="nso-remove-email-btn" onClick={() => removeRecipient(index)} title="Remove recipient"><FaTrash /></button> : "-"}</td>
                    </tr>)}
                </tbody></table></div>
                <div className="nso-email-note"><b>Direct contacts:</b> Approver, Construction Vendor, Project Taken By, Broker, Operation Head and ASM emails entered on a project are automatically included in that project's email.</div>
            </div>
        </>}
    </div>;
}

import PremiumLoader from "../../components/premium/PremiumLoader";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import {
    FaFileInvoiceDollar,
    FaClipboardList,
    FaInfoCircle,
    FaSave,
    FaRupeeSign,
    FaExclamationCircle,
    FaHome,
    FaChevronRight,
    FaFileAlt,
    FaPaperclip,
    FaLock
} from "react-icons/fa";
import "../../styles/premium/PagePremium.css";
import "./PettyCashPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import {
    money,
    today,
    dmy,
    getAccess,
    apiError,
    PettyNav,
    FileDrop,
    Field,
    validateFile
} from "./pettyCashShared";

const PURPOSE_MAX = 300;

// ======================================================
// NEW / EDIT PETTY CASH ADVANCE (full page)
// Every field is mandatory, including the supporting document.
// Manager and employee cannot be changed after creation.
// ======================================================
export default function PettyCashAdvanceForm() {
    const { id } = useParams();
    const editing = Boolean(id);
    const navigate = useNavigate();
    const access = getAccess();

    const [options, setOptions] = useState({ stores: [], users: [] });
    const [form, setForm] = useState({
        advance_no: "",
        store_id: "",
        paid_by: access.admin ? "" : String(access.userId || ""),
        received_by: "",
        advance_amount: "",
        advance_date: today(),
        purpose: ""
    });
    const [existing, setExisting] = useState(null);
    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setLoading(true);
                const requests = [axios.get("/api/petty-cash/options")];
                if (editing) requests.push(axios.get(`/api/petty-cash/${id}`));
                else requests.push(axios.get("/api/petty-cash/next-number"));
                const [opts, second] = await Promise.all(requests);
                if (!active) return;
                setOptions(opts.data?.data || { stores: [], users: [] });
                if (editing) {
                    const a = second.data?.data;
                    if (!a) throw new Error("Advance not found.");
                    setExisting(a);
                    setForm({
                        advance_no: a.advance_no || "",
                        store_id: String(a.store_id || ""),
                        paid_by: String(a.paid_by || ""),
                        received_by: String(a.received_by || ""),
                        advance_amount: String(Number(a.advance_amount || 0)),
                        advance_date: String(a.advance_date || "").slice(0, 10),
                        purpose: a.purpose || ""
                    });
                } else {
                    setForm((f) => ({ ...f, advance_no: second.data?.data?.advance_no || "" }));
                }
            } catch (err) {
                if (active) setError(apiError(err, "Unable to load the form."));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [id, editing]);

    const update = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: "" }));
    };

    const userName = (uid) => options.users.find((u) => String(u.id) === String(uid))?.name;
    const storeName = (sid) => options.stores.find((s) => String(s.id) === String(sid))?.store_name;

    const used = existing ? Number(existing.total_expense || 0) + Number(existing.total_deposit || 0) : 0;

    const validate = () => {
        const e = {};
        if (!String(form.advance_no).trim()) e.advance_no = "Advance No. is required.";
        if (!form.store_id) e.store_id = "Please select the store.";
        if (!form.paid_by) e.paid_by = "Please select the manager who pays.";
        if (!form.received_by) e.received_by = "Please select the employee who receives.";
        if (form.paid_by && form.received_by && form.paid_by === form.received_by) e.received_by = "Paid By and Received By must be different.";
        if (!(Number(form.advance_amount) > 0)) e.advance_amount = "Enter an amount greater than zero.";
        else if (editing && Number(form.advance_amount) + 0.005 < used) e.advance_amount = `Cannot be less than ${money(used)} already used.`;
        if (!form.advance_date) e.advance_date = "Advance date is required.";
        const purpose = String(form.purpose || "").trim();
        if (!purpose) e.purpose = "Purpose is required.";
        else if (purpose.length < 3) e.purpose = "Please enter a valid purpose.";
        if (!file && !(editing && existing?.attachment_path)) e.file = "Supporting document is required.";
        else if (file) {
            const fileError = validateFile(file);
            if (fileError) e.file = fileError;
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        if (!validate()) {
            setError("All fields are mandatory. Please complete the highlighted fields.");
            return;
        }
        try {
            setSaving(true);
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => data.append(k, typeof v === "string" ? v.trim() : v));
            if (file) data.append("attachment", file);
            const response = editing
                ? await axios.put(`/api/petty-cash/${id}`, data)
                : await axios.post("/api/petty-cash", data);
            if (!response.data?.success) throw new Error(response.data?.message || "Unable to save the advance.");
            navigate(`/petty-cash/${editing ? id : response.data.data.id}`);
        } catch (err) {
            setError(apiError(err, "Unable to save the advance."));
        } finally {
            setSaving(false);
        }
    };

    const summaryRows = useMemo(() => [
        ["Advance No.", form.advance_no || "—"],
        ["Store", storeName(form.store_id) || "—"],
        ["Paid By (Manager)", userName(form.paid_by) || "—"],
        ["Received By (Employee)", userName(form.received_by) || "—"],
        ["Advance Amount", Number(form.advance_amount) > 0 ? money(form.advance_amount) : "—"],
        ["Advance Date", form.advance_date ? dmy(form.advance_date) : "—"],
        ["Purpose", String(form.purpose || "").trim() || "—"]
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [form, options]);

    if (loading) {
        return <div className="pc-page pp-premium"><div className="pc-card pc-center"><PremiumLoader title="Loading advance form" /></div></div>;
    }

    const locked = editing; // manager / employee / store / number are fixed after creation

    return (
        <div className="pc-page pp-premium">
            <PremiumHero
                icon={FaFileInvoiceDollar}
                eyebrow="Petty Cash"
                title={editing ? `Edit Advance ${form.advance_no}` : "New Petty Cash Advance"}
                subtitle={editing ? "Update the amount, date, purpose or supporting document." : "Create a new advance request for store operations, travel, purchase, etc."}
                actions={
                    <nav className="pc-crumbs" aria-label="Breadcrumb">
                        <Link to="/petty-cash"><FaHome /> Petty Cash</Link>
                        <FaChevronRight />
                        <span>{editing ? "Edit Advance" : "New Advance"}</span>
                    </nav>
                }
            />

            <PettyNav />

            {error && <div className="pc-alert pc-alert--error"><FaExclamationCircle /> {error}</div>}

            <form className="pc-form-layout" onSubmit={submit} noValidate>
                <section className="pc-card">
                    <header className="pc-card-head">
                        <span className="pc-card-icon"><FaFileAlt /></span>
                        <div>
                            <h2>Advance Details</h2>
                            <p>Fill in all details to {editing ? "update" : "create"} the petty cash advance. All fields are mandatory.</p>
                        </div>
                    </header>

                    <div className="pc-form-grid">
                        <Field label="Advance No." error={errors.advance_no}>
                            <div className="pc-input-icon pc-input-icon--right">
                                <input value={form.advance_no} onChange={(e) => update("advance_no", e.target.value)} readOnly={locked} placeholder="ADV-001" />
                                {locked ? <FaLock /> : <FaFileAlt />}
                            </div>
                        </Field>
                        <Field label="Store" error={errors.store_id}>
                            <select value={form.store_id} onChange={(e) => update("store_id", e.target.value)} disabled={locked}>
                                <option value="">Select store</option>
                                {options.stores.map((s) => <option key={s.id} value={s.id}>{s.store_name}{s.store_code ? ` (${s.store_code})` : ""}</option>)}
                            </select>
                        </Field>
                        <Field label="Paid By (Manager)" error={errors.paid_by}>
                            <select value={form.paid_by} onChange={(e) => update("paid_by", e.target.value)} disabled={locked || !access.admin}>
                                <option value="">Select manager</option>
                                {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.employee_id ? ` (${u.employee_id})` : ""}</option>)}
                            </select>
                        </Field>
                        <Field label="Received By (Employee)" error={errors.received_by}>
                            <select value={form.received_by} onChange={(e) => update("received_by", e.target.value)} disabled={locked}>
                                <option value="">Select employee</option>
                                {options.users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.employee_id ? ` (${u.employee_id})` : ""}</option>)}
                            </select>
                        </Field>
                        <Field label="Advance Amount (₹)" error={errors.advance_amount} hint={editing && used > 0 ? `Already used: ${money(used)}` : undefined}>
                            <div className="pc-input-icon">
                                <FaRupeeSign />
                                <input type="number" min="0.01" step="0.01" value={form.advance_amount} onChange={(e) => update("advance_amount", e.target.value)} placeholder="Enter advance amount" />
                            </div>
                        </Field>
                        <Field label="Advance Date" error={errors.advance_date}>
                            <input type="date" value={form.advance_date} onChange={(e) => update("advance_date", e.target.value)} />
                        </Field>
                        <Field label="Purpose" full error={errors.purpose}>
                            <div className="pc-textarea-wrap">
                                <textarea
                                    rows={4}
                                    maxLength={PURPOSE_MAX}
                                    value={form.purpose}
                                    onChange={(e) => update("purpose", e.target.value)}
                                    placeholder="Enter purpose (e.g. Store maintenance, Travel expense, Local purchase, Training, Meeting, etc.)"
                                />
                                <small className="pc-counter">{String(form.purpose || "").length}/{PURPOSE_MAX}</small>
                            </div>
                        </Field>
                        <Field label="Attach Supporting Document" full error={errors.file}>
                            <FileDrop
                                file={file}
                                onChange={(f) => { setFile(f); setErrors((e) => ({ ...e, file: "" })); }}
                                error={errors.file}
                                existingName={editing ? existing?.attachment_filename : ""}
                            />
                        </Field>
                    </div>
                </section>

                <aside className="pc-side">
                    <section className="pc-card">
                        <header className="pc-card-head">
                            <span className="pc-card-icon"><FaClipboardList /></span>
                            <div><h2>Advance Summary</h2><p>Review details before {editing ? "saving" : "creating"}.</p></div>
                        </header>
                        <dl className="pc-summary">
                            {summaryRows.map(([label, value]) => (
                                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                            ))}
                            <div>
                                <dt>Attachment</dt>
                                <dd>
                                    {file
                                        ? <span className="pc-chip pc-chip--green"><FaPaperclip /> Ready</span>
                                        : editing && existing?.attachment_path
                                            ? <span className="pc-chip pc-chip--green"><FaPaperclip /> Uploaded</span>
                                            : <span className="pc-chip pc-chip--red"><FaPaperclip /> Not uploaded</span>}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="pc-note">
                        <h3><FaInfoCircle /> Important Notes</h3>
                        <ul>
                            <li>All fields are mandatory.</li>
                            <li>Please enter a valid purpose for the advance.</li>
                            <li>Attach supporting document (bill/receipt).</li>
                            <li>Advance will be recorded and visible in the audit trail.</li>
                            <li>Manager and employee details cannot be changed after creation.</li>
                        </ul>
                    </section>
                </aside>

                <div className="pc-form-actions">
                    <button type="button" className="pc-btn pc-btn--ghost pc-btn--lg" onClick={() => navigate(editing ? `/petty-cash/${id}` : "/petty-cash")} disabled={saving}>Cancel</button>
                    <button type="submit" className="pc-btn pc-btn--primary pc-btn--lg" disabled={saving}>
                        <FaSave /> {saving ? "Saving..." : editing ? "Save Changes" : "Create Advance"}
                    </button>
                </div>
            </form>
        </div>
    );
}

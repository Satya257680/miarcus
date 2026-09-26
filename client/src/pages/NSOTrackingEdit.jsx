import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    FaArrowLeft,
    FaSave,
    FaTimes,
    FaStore,
    FaChartLine,
    FaCalendarAlt,
    FaAlignLeft,
    FaPaperclip,
    FaCloudUploadAlt,
    FaInfoCircle,
    FaFileAlt,
    FaCheckCircle,
} from "react-icons/fa";

import { API_BASE_URL } from "../axiosConfig.js";
import { getNewStoreOpening, updateNewStoreOpening } from "../services/newStoreOpeningService";
import PremiumLoader from "../components/premium/PremiumLoader";
import {
    REGIONS,
    STATUS_OPTIONS,
    storeCode,
    regionFor,
    progressFor,
    trackingStatus,
    toYmd,
    attachmentUrl,
    nsoPermissions,
    unwrapProject,
} from "../utils/nsoTracking";
import "../styles/pages/NSOTrackingPremium.css";

// ======================================================
// EDIT NSO DETAILS  (/nso-tracking/:id/edit)
// Saves through the normal New Store Opening update API, so
// timeline, history and emails keep working exactly as before.
// ======================================================

const SKIP_KEYS = new Set([
    "id",
    "created_at",
    "updated_at",
    "created_by_name",
    "updated_by_name",
    "attachment",
]);

const isDateKey = (key) =>
    /date|deadline/.test(key) ||
    ["layout_by_nso", "revised_layout_by_nso", "visit_by_op_team", "received_by_nso"].includes(key);

const MAX_FILE = 10 * 1024 * 1024;

export default function NSOTrackingEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const permissions = useMemo(nsoPermissions, []);
    const fileRef = useRef(null);

    const [original, setOriginal] = useState(null);
    const [form, setForm] = useState(null);
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let alive = true;
        getNewStoreOpening(id)
            .then((response) => {
                if (!alive) return;
                const data = unwrapProject(response);
                if (!data?.id) {
                    setError("NSO project not found.");
                    return;
                }
                const normalized = { ...data };
                Object.keys(normalized).forEach((key) => {
                    if (isDateKey(key)) normalized[key] = toYmd(normalized[key]);
                });
                setOriginal(normalized);
                setForm(normalized);
            })
            .catch((err) => alive && setError(err.response?.data?.message || "Unable to load the NSO project."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [id]);

    const set = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev) => ({ ...prev, [key]: "" }));
    };

    const pickFile = (candidate) => {
        if (!candidate) return;
        if (candidate.size > MAX_FILE) {
            setError("The file is larger than 10 MB. Please choose a smaller file.");
            return;
        }
        setError("");
        setFile(candidate);
    };

    const validate = () => {
        const next = {};
        if (!String(form.location || "").trim()) next.location = "Store name is required.";
        if (!String(form.city || "").trim()) next.city = "City is required.";
        if (!form.status) next.status = "Current status is required.";
        if (!form.possession_date_loi) next.possession_date_loi = "LOI possession date is required.";
        setFieldErrors(next);
        return Object.keys(next).length === 0;
    };

    const save = async () => {
        if (!permissions.canEdit || !form) return;
        if (!validate()) return;
        setSaving(true);
        setError("");
        try {
            const payload = { ...form };

            // A manually changed opening date must not be recalculated by the
            // automatic timeline, so the timeline is switched to manual.
            if (toYmd(payload.billing_start_date) !== toYmd(original.billing_start_date)) {
                payload.timeline_mode = "manual";
            }

            const data = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (SKIP_KEYS.has(key)) return;
                if (value === null || value === undefined) {
                    data.append(key, "");
                    return;
                }
                data.append(key, isDateKey(key) ? toYmd(value) : value);
            });

            if (file) data.append("attachment", file);
            else data.append("attachment", original.attachment || "");

            await updateNewStoreOpening(id, data);
            navigate(`/nso-tracking/${id}`, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Unable to save the NSO project.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="nst-page">
                <PremiumLoader title="Loading NSO Details" message="Preparing the project for editing." />
            </div>
        );
    }

    if (!form) {
        return (
            <div className="nst-page">
                <div className="nst-card nst-empty">
                    <FaInfoCircle />
                    <b>{error || "NSO project not found."}</b>
                    <button type="button" className="nst-btn nst-btn-primary" onClick={() => navigate("/nso-tracking")}>
                        <FaArrowLeft /> Back to NSO Tracking
                    </button>
                </div>
            </div>
        );
    }

    if (!permissions.canEdit) {
        return (
            <div className="nst-page">
                <div className="nst-card nst-empty">
                    <FaInfoCircle />
                    <b>You do not have permission to edit NSO projects.</b>
                    <button type="button" className="nst-btn nst-btn-primary" onClick={() => navigate(`/nso-tracking/${id}`)}>
                        <FaArrowLeft /> Back to details
                    </button>
                </div>
            </div>
        );
    }

    const progress = progressFor(form);
    const status = trackingStatus(form);
    const region = regionFor(form);
    const currentFile = original?.attachment ? String(original.attachment).split("/").pop() : "";

    return (
        <div className="nst-page nsd-page">
            <div className="nsd-header">
                <div className="nsd-title">
                    <button type="button" className="nsd-back" onClick={() => navigate(`/nso-tracking/${id}`)} aria-label="Back">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <span className="nst-eyebrow">NSO TRACKING</span>
                        <h1>Edit NSO Details</h1>
                        <p>Update the information for this New Store Opening project.</p>
                    </div>
                </div>
                <div className="nse-header-actions">
                    <button type="button" className="nst-btn nst-btn-ghost" onClick={() => navigate(`/nso-tracking/${id}`)} disabled={saving}>
                        <FaTimes /> Cancel
                    </button>
                    <button type="button" className="nst-btn nst-btn-primary" onClick={save} disabled={saving}>
                        <FaSave /> {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            {error && <div className="nst-alert">{error}</div>}

            <section className="nse-grid">
                <div className="nse-col">
                    <div className="nst-card nsd-block">
                        <h3><FaStore /> Store Information</h3>
                        <div className="nse-form-grid">
                            <label className="nse-field">
                                <span>Store Code <em>*</em></span>
                                <input value={storeCode(form)} disabled />
                            </label>
                            <label className={`nse-field ${fieldErrors.location ? "has-error" : ""}`}>
                                <span>Store Name <em>*</em></span>
                                <input value={form.location || ""} onChange={(e) => set("location", e.target.value)} placeholder="Store / location name" />
                                {fieldErrors.location && <small>{fieldErrors.location}</small>}
                            </label>
                            <label className={`nse-field ${fieldErrors.city ? "has-error" : ""}`}>
                                <span>City <em>*</em></span>
                                <input value={form.city || ""} onChange={(e) => set("city", e.target.value)} placeholder="City" />
                                {fieldErrors.city && <small>{fieldErrors.city}</small>}
                            </label>
                            <label className="nse-field">
                                <span>Region <em>*</em></span>
                                <select value={region} disabled>
                                    <option value="-">Detected from city</option>
                                    {REGIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                                <small className="nse-hint">Region is detected automatically from the city.</small>
                            </label>
                        </div>
                    </div>

                    <div className="nst-card nsd-block">
                        <h3><FaCalendarAlt /> Dates</h3>
                        <div className="nse-form-grid">
                            <label className={`nse-field ${fieldErrors.possession_date_loi ? "has-error" : ""}`}>
                                <span>LOI Possession Date <em>*</em></span>
                                <input type="date" value={toYmd(form.possession_date_loi)} onChange={(e) => set("possession_date_loi", e.target.value)} />
                                {fieldErrors.possession_date_loi && <small>{fieldErrors.possession_date_loi}</small>}
                            </label>
                            <label className="nse-field">
                                <span>Planned Opening Date</span>
                                <input type="date" value={toYmd(form.billing_start_date)} onChange={(e) => set("billing_start_date", e.target.value)} />
                                <small className="nse-hint">Changing it keeps this exact date (timeline switches to Manual).</small>
                            </label>
                            <label className="nse-field">
                                <span>Actual Possession Date</span>
                                <input type="date" value={toYmd(form.actual_possession_date)} onChange={(e) => set("actual_possession_date", e.target.value)} />
                            </label>
                            <label className="nse-field">
                                <span>Broker Possession Date</span>
                                <input type="date" value={toYmd(form.possession_date_broker)} onChange={(e) => set("possession_date_broker", e.target.value)} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="nse-col">
                    <div className="nst-card nsd-block">
                        <h3><FaChartLine /> Status &amp; Progress</h3>
                        <div className="nse-form-grid">
                            <label className={`nse-field ${fieldErrors.status ? "has-error" : ""}`}>
                                <span>Current Status <em>*</em></span>
                                <select value={form.status || ""} onChange={(e) => set("status", e.target.value)}>
                                    {!STATUS_OPTIONS.includes(form.status) && form.status && <option value={form.status}>{form.status}</option>}
                                    {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                                {fieldErrors.status && <small>{fieldErrors.status}</small>}
                            </label>
                            <label className="nse-field">
                                <span>Progress (%) <em>*</em></span>
                                <input value={progress} disabled />
                                <div className="nse-progress">
                                    <i style={{ width: `${progress}%` }} className={status === "Delayed" ? "red" : progress >= 100 ? "green" : ""} />
                                </div>
                                <small className="nse-hint">Calculated from the completed milestones · {status}</small>
                            </label>
                        </div>
                    </div>

                    <div className="nst-card nsd-block">
                        <h3><FaAlignLeft /> Description</h3>
                        <textarea
                            className="nse-textarea"
                            rows={4}
                            value={form.remarks || ""}
                            onChange={(e) => set("remarks", e.target.value)}
                            placeholder="Add notes about this New Store Opening project..."
                        />
                    </div>

                    <div className="nst-card nsd-block">
                        <h3><FaPaperclip /> Documents</h3>
                        {currentFile && !file && (
                            <a className="nse-current-file" href={attachmentUrl(API_BASE_URL, original.attachment)} target="_blank" rel="noopener noreferrer">
                                <FaFileAlt /> {currentFile}
                            </a>
                        )}
                        <div
                            className={`nse-drop ${dragOver ? "is-over" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => fileRef.current?.click()}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOver(false);
                                pickFile(e.dataTransfer.files?.[0]);
                            }}
                        >
                            {file ? (
                                <>
                                    <FaCheckCircle className="ok" />
                                    <div>
                                        <b>{file.name}</b>
                                        <small>{(file.size / 1024 / 1024).toFixed(2)} MB · click to change</small>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <FaCloudUploadAlt />
                                    <div>
                                        <b>Click to upload files or drag and drop</b>
                                        <small>PDF, Images, ZIP (Max 10MB){currentFile ? " · replaces the current document" : ""}</small>
                                    </div>
                                </>
                            )}
                            <input
                                ref={fileRef}
                                type="file"
                                hidden
                                accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.doc,.docx,.xls,.xlsx"
                                onChange={(e) => pickFile(e.target.files?.[0])}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {saving && <PremiumLoader overlay title="Saving NSO Details..." message="Updating the project, timeline and history." />}
        </div>
    );
}

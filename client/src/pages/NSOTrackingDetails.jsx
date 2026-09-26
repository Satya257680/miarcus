import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    FaArrowLeft,
    FaEdit,
    FaMapMarkerAlt,
    FaInfoCircle,
    FaProjectDiagram,
    FaAlignLeft,
    FaPaperclip,
    FaDownload,
    FaFilePdf,
    FaFileImage,
    FaFileArchive,
    FaFileAlt,
    FaListOl,
    FaCheckCircle,
    FaClock,
    FaCircle,
} from "react-icons/fa";

import { API_BASE_URL } from "../axiosConfig.js";
import { getNewStoreOpening } from "../services/newStoreOpeningService";
import PremiumLoader from "../components/premium/PremiumLoader";
import {
    storeCode,
    storeName,
    regionFor,
    plannedDate,
    openingDate,
    trackingStatus,
    progressFor,
    formatDate,
    formatDateTime,
    milestoneState,
    toYmd,
    todayYmd,
    STATUS_TONE,
    attachmentUrl,
    nsoPermissions,
    unwrapProject,
} from "../utils/nsoTracking";

import storeThumb from "../assets/premium/nso-store.png";
import "../styles/pages/NSOTrackingPremium.css";

// ======================================================
// NSO DETAILS  (/nso-tracking/:id)
// ======================================================

const fileIcon = (name = "") => {
    const ext = String(name).split("?")[0].split(".").pop().toLowerCase();
    if (ext === "pdf") return { Icon: FaFilePdf, tone: "red" };
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return { Icon: FaFileImage, tone: "blue" };
    if (["zip", "rar", "7z"].includes(ext)) return { Icon: FaFileArchive, tone: "amber" };
    return { Icon: FaFileAlt, tone: "violet" };
};

const parseAttachments = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    const text = String(value).trim();
    if (text.startsWith("[")) {
        try {
            const list = JSON.parse(text);
            return Array.isArray(list) ? list.map((item) => item?.path || item?.url || item).filter(Boolean) : [];
        } catch {
            /* fall through */
        }
    }
    return text.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
};

export function ProgressRing({ value, size = 64, label = "Project Progress", sub }) {
    const radius = size / 2 - 6;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
    return (
        <div className="nsd-ring-wrap">
            <div className="nsd-ring" style={{ width: size, height: size }}>
                <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                    <circle cx={size / 2} cy={size / 2} r={radius} className="nsd-ring-track" />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        className="nsd-ring-value"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <b>{Math.round(value)}%</b>
            </div>
            <div>
                <strong>{label}</strong>
                <small>{sub || (value >= 100 ? "Project completed" : "Milestones completed")}</small>
            </div>
        </div>
    );
}

export default function NSOTrackingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const permissions = useMemo(nsoPermissions, []);

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        getNewStoreOpening(id)
            .then((response) => {
                if (!alive) return;
                const data = unwrapProject(response);
                if (!data?.id) setError("NSO project not found.");
                setProject(data?.id ? data : null);
            })
            .catch((err) => alive && setError(err.response?.data?.message || "Unable to load the NSO project."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="nst-page">
                <PremiumLoader title="Loading NSO Details" message="Fetching the project details, timeline and documents." />
            </div>
        );
    }

    if (!project) {
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

    const status = trackingStatus(project);
    const progress = progressFor(project);
    const milestones = milestoneState(project);
    const today = todayYmd();
    const attachments = parseAttachments(project.attachment);

    // Five headline phases, as in the NSO Details design.
    const phaseDate = (field) => toYmd(project[field]);
    const phases = [
        { label: "Planning", date: toYmd(project.created_at) || toYmd(project.possession_date_loi), time: project.created_at },
        { label: "Documentation", date: phaseDate("layout_by_nso") || phaseDate("revised_layout_by_nso") },
        { label: "Approval", date: phaseDate("approval_deadline") },
        { label: "Construction / Setup", date: phaseDate("nso_handover_deadline") || phaseDate("vm_handover_deadline") },
        { label: "Completed", date: phaseDate("billing_start_date"), final: true },
    ].map((phase) => ({
        ...phase,
        done: status === "Completed" || Boolean(phase.date && phase.date <= today && !phase.final),
    }));
    const activeIndex = phases.findIndex((phase) => !phase.done);

    const info = [
        ["Store Code", storeCode(project)],
        ["Store Name", storeName(project)],
        ["City", project.city || "-"],
        ["Region", regionFor(project)],
        ["Planned Date", formatDate(plannedDate(project))],
        ["Opening Date", formatDate(openingDate(project))],
        ["Current Status", <span key="s" className={`nst-badge nst-tone-${STATUS_TONE[status] || "gray"}`}>{status}</span>],
        ["Project Stage", project.status || "-"],
        ["Operation Head", project.operation_head_assigned || "-"],
        ["ASM", project.asm_assigned || "-"],
        ["Created By", project.created_by_name || project.created_by || "-"],
        ["Created On", formatDateTime(project.created_at)],
        ["Last Updated", formatDateTime(project.updated_at)],
    ];

    return (
        <div className="nst-page nsd-page">
            <div className="nsd-header">
                <div className="nsd-title">
                    <button type="button" className="nsd-back" onClick={() => navigate("/nso-tracking")} aria-label="Back">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <span className="nst-eyebrow">NSO TRACKING</span>
                        <h1>NSO Details</h1>
                        <p>View complete information about this New Store Opening project.</p>
                    </div>
                </div>
                {permissions.canEdit && (
                    <button type="button" className="nst-btn nst-btn-primary nsd-edit" onClick={() => navigate(`/nso-tracking/${project.id}/edit`)}>
                        <FaEdit /> Edit
                    </button>
                )}
            </div>

            <section className="nst-card nsd-summary">
                <img src={storeThumb} alt="" className="nsd-thumb" />
                <div className="nsd-summary-text">
                    <div className="nsd-summary-title">
                        <h2>{storeCode(project)} - {storeName(project)}</h2>
                        <span className={`nst-badge nst-tone-${STATUS_TONE[status] || "gray"}`}>{status}</span>
                    </div>
                    <p><FaMapMarkerAlt /> {[project.city, regionFor(project) !== "-" ? `${regionFor(project)} Region` : ""].filter(Boolean).join(", ") || "-"}</p>
                </div>
                <ProgressRing value={progress} />
            </section>

            <section className="nsd-grid">
                <div className="nst-card nsd-block">
                    <h3><FaInfoCircle /> Basic Information</h3>
                    <dl className="nsd-info">
                        {info.map(([label, value]) => (
                            <div key={label}>
                                <dt>{label}</dt>
                                <dd>: {value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="nst-card nsd-block">
                    <h3><FaProjectDiagram /> Project Timeline</h3>
                    <ol className="nsd-timeline">
                        {phases.map((phase, index) => {
                            const state = phase.done ? "done" : index === activeIndex ? "active" : "waiting";
                            return (
                                <li key={phase.label} className={`is-${state}`}>
                                    <span className="nsd-dot" />
                                    <div>
                                        <b>{phase.label}</b>
                                        <small>{phase.date ? formatDate(phase.date) : "Not scheduled"}{phase.time ? `, ${new Date(phase.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })}` : ""}</small>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    <button type="button" className="nsd-link" onClick={() => setShowAll((v) => !v)}>
                        <FaListOl /> {showAll ? "Hide all milestones" : `View all ${milestones.length} milestones`}
                    </button>
                </div>

                <div className="nsd-side">
                    <div className="nst-card nsd-block">
                        <h3><FaAlignLeft /> Description</h3>
                        <p className="nsd-desc">{project.remarks || "No description has been added for this project yet."}</p>
                    </div>
                    <div className="nst-card nsd-block">
                        <h3><FaPaperclip /> Documents</h3>
                        {attachments.length ? (
                            <ul className="nsd-docs">
                                {attachments.map((path) => {
                                    const name = String(path).split("/").pop();
                                    const { Icon, tone } = fileIcon(name);
                                    return (
                                        <li key={path}>
                                            <span className={`nsd-doc-icon nst-tone-${tone}`}><Icon /></span>
                                            <span className="nsd-doc-name">{name}</span>
                                            <a href={attachmentUrl(API_BASE_URL, path)} target="_blank" rel="noopener noreferrer" aria-label={`Download ${name}`}>
                                                <FaDownload />
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="nsd-desc muted">No documents uploaded yet.</p>
                        )}
                    </div>
                </div>
            </section>

            {showAll && (
                <section className="nst-card nsd-block nsd-milestones">
                    <h3><FaListOl /> All Milestones</h3>
                    <div className="nsd-milestone-grid">
                        {milestones.map((item, index) => (
                            <div key={item.field} className={`nsd-milestone ${item.done ? "done" : item.date ? "pending" : "waiting"}`}>
                                <span>{item.done ? <FaCheckCircle /> : item.date ? <FaClock /> : <FaCircle />}</span>
                                <div>
                                    <small>{String(index + 1).padStart(2, "0")}</small>
                                    <b>{item.label}</b>
                                    <em>{item.date ? formatDate(item.date) : "Not generated"}</em>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

import PremiumLoader from "../../components/premium/PremiumLoader";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios, { API_BASE_URL } from "../../axiosConfig.js";
import {
    FaArrowLeft,
    FaUser,
    FaEnvelope,
    FaPhone,
    FaClipboardList,
    FaCalendarAlt,
    FaEye,
    FaEnvelopeOpen,
    FaCommentDots,
    FaPhoneAlt,
    FaUserSlash,
    FaHistory,
    FaPaperPlane,
    FaTimes,
    FaComments,
    FaPaperclip,
    FaCloudUploadAlt,
    FaDownload,
    FaTrashAlt,
    FaExternalLinkAlt,
    FaLink,
    FaSyncAlt,
    FaBuilding,
    FaIdBadge,
    FaLayerGroup,
    FaFlag,
    FaCircle,
    FaAlignLeft,
    FaStore,
} from "react-icons/fa";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { openAttachment } from "../../utils/attachments";
import {
    getActivityDetails,
    getActivityTimeline,
    getActivityComments,
    addActivityComment,
    getActivityFiles,
    uploadActivityFile,
    deleteActivityFile,
    getActivityMessages,
    sendActivityMessage,
    markActivityMessagesRead,
    sendActivityEmail,
} from "../../services/activityService";

import "../../styles/pages/ActivityDetails.css";
import "../../styles/pages/ActivityDetailsPremium.css";

const API = API_BASE_URL + "/api";

// Where "Open related record" goes for each module.
const MODULE_ROUTES = {
    "action points": "/action-points",
    announcements: "/announcements",
    gallery: "/gallery",
    attendance: "/attendance",
    "checklist submission": "/checklist-submit",
    "checklist reports": "/checklist-reports",
    "checklist types": "/settings/checklist-types",
    questions: "/settings/questions",
    departments: "/settings/departments",
    designations: "/settings/designations",
    "reports to": "/settings/reports-to",
    "new store openings": "/new-store-openings",
    "nso rules": "/nso-rules",
    expenses: "/expenses",
    "petty cash": "/petty-cash",
    billing: "/billing/bills",
    "sales team": "/visit-planner",
    "listing tracker": "/listing-tracker",
    quiz: "/quiz/setup",
    users: "/settings/users",
    stores: "/settings/stores",
    "nso tracking": "/nso-tracking",
    "daily collection": "/daily-collection",
    "collection tracking": "/collection-tracking",
    "asset master": "/asset-master",
};

const slug = (value) => String(value || "").toLowerCase().trim().replace(/\s+/g, "-");

const initials = (name) =>
    String(name || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");

const fmt = (value, withTime = true) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
};

const relative = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Math.round((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} day${diff < 172800 ? "" : "s"} ago`;
    return fmt(value, false);
};

const formatSize = (bytes) => {
    const n = Number(bytes || 0);
    if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

function ActivityDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [activity, setActivity] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [comments, setComments] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState("timeline");

    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const [showEmail, setShowEmail] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatMessage, setChatMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [confirm, setConfirm] = useState(null); // { kind: "file"|"deactivate", payload }
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [toast, setToast] = useState(null);

    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);
    const toastTimer = useRef(null);

    const token = localStorage.getItem("token");
    const currentUserId = Number(localStorage.getItem("userId") || 0);
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    const canDeactivate = currentUser?.is_admin || permissions?.Users === "Full";

    const showToast = useCallback((message, tone = "success") => {
        setToast({ message, tone });
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 3200);
    }, []);

    const loadActivity = useCallback(async ({ quiet = false } = {}) => {
        try {
            if (quiet) setRefreshing(true);
            else setLoading(true);
            const [activityResponse, timelineResponse, commentsResponse, filesResponse] = await Promise.all([
                getActivityDetails(id),
                getActivityTimeline(id).catch(() => ({ data: { data: [] } })),
                getActivityComments(id).catch(() => ({ data: { data: [] } })),
                getActivityFiles(id).catch(() => ({ data: { data: [] } })),
            ]);
            const row = activityResponse.data?.data;
            setActivity(Array.isArray(row) ? row[0] || null : row || null);
            setTimeline(timelineResponse.data?.data || []);
            setComments(commentsResponse.data?.data || []);
            setFiles(filesResponse.data?.data || []);
        } catch (err) {
            console.error("Activity details error:", err);
            if (!quiet) setActivity(null);
            showToast(err.response?.data?.message || "Could not load this activity.", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, showToast]);

    useEffect(() => {
        loadActivity();
    }, [loadActivity]);

    const recipientName = activity?.assigned_to_name || activity?.created_by_name || "User";
    const recipientEmail = activity?.assigned_to_email || activity?.created_by_email || "";
    const recipientPhone = activity?.phone || activity?.call_contact || "";
    const recipientId = Number(activity?.assigned_to || activity?.created_by || 0);
    const relatedRoute = MODULE_ROUTES[String(activity?.module_name || "").toLowerCase()];

    const defaultEmailSubject = useMemo(
        () => `${activity?.module_name || "MIARCUS"}: ${activity?.title || "Activity Update"}`,
        [activity]
    );

    useEffect(() => {
        if (showEmail && !emailSubject) setEmailSubject(defaultEmailSubject);
    }, [showEmail, emailSubject, defaultEmailSubject]);

    // ---------------- CHAT ----------------
    const loadMessages = useCallback(async () => {
        try {
            setLoadingMessages(true);
            const response = await getActivityMessages(id);
            setMessages(response.data.data || []);
            await markActivityMessagesRead(id);
        } catch (error) {
            console.error("Chat load error:", error);
        } finally {
            setLoadingMessages(false);
        }
    }, [id]);

    useEffect(() => {
        if (!showChat) return undefined;
        loadMessages();
        const timer = window.setInterval(loadMessages, 4000);
        return () => window.clearInterval(timer);
    }, [showChat, loadMessages]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages.length, showChat]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== "Escape") return;
            if (showChat) setShowChat(false);
            else if (showEmail && !sendingEmail) setShowEmail(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [showChat, showEmail, sendingEmail]);

    // ---------------- ACTIONS ----------------
    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            setPostingComment(true);
            await addActivityComment(id, newComment.trim());
            setNewComment("");
            const response = await getActivityComments(id);
            setComments(response.data.data || []);
            showToast("Comment posted.");
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || "Failed to add comment.", "error");
        } finally {
            setPostingComment(false);
        }
    };

    const handleUploadFile = async (file = selectedFile) => {
        if (!file) return;
        try {
            setUploadingFile(true);
            await uploadActivityFile(id, file);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            const response = await getActivityFiles(id);
            setFiles(response.data.data || []);
            showToast("File uploaded.");
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || "Failed to upload file.", "error");
        } finally {
            setUploadingFile(false);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) setSelectedFile(file);
    };

    const runConfirm = async () => {
        if (!confirm) return;
        try {
            setConfirmBusy(true);
            if (confirm.kind === "file") {
                await deleteActivityFile(confirm.payload.id);
                const response = await getActivityFiles(id);
                setFiles(response.data.data || []);
                showToast("File deleted.");
            } else if (confirm.kind === "deactivate") {
                const response = await axios.put(
                    `${API}/users/disable/${recipientId}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                showToast(response.data?.message || `${recipientName} deactivated successfully.`);
                await loadActivity({ quiet: true });
            }
            setConfirm(null);
        } catch (error) {
            showToast(error.response?.data?.message || "Action failed.", "error");
        } finally {
            setConfirmBusy(false);
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail) return showToast("No email address is available for this activity.", "error");
        if (!emailSubject.trim() || !emailMessage.trim()) return showToast("Please enter a subject and message.", "error");
        try {
            setSendingEmail(true);
            const response = await sendActivityEmail(id, {
                subject: emailSubject.trim(),
                message: emailMessage.trim(),
            });
            showToast(response.data?.message || "Email sent successfully.");
            setEmailMessage("");
            setShowEmail(false);
        } catch (error) {
            showToast(error.response?.data?.message || "Email could not be sent.", "error");
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSendMessage = async (event) => {
        event?.preventDefault();
        if (!chatMessage.trim() || sendingMessage) return;
        try {
            setSendingMessage(true);
            await sendActivityMessage(id, chatMessage.trim());
            setChatMessage("");
            await loadMessages();
        } catch (error) {
            showToast(error.response?.data?.message || "Message could not be sent.", "error");
        } finally {
            setSendingMessage(false);
        }
    };

    const handleViewUser = () => {
        if (!recipientId) return showToast("No user is linked to this activity.", "error");
        navigate("/settings/users", { state: { viewUserId: recipientId } });
    };

    const handleCall = () => {
        if (!recipientPhone) return showToast("No phone number is available for this user.", "error");
        window.location.href = `tel:${recipientPhone}`;
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast("Link copied to clipboard.");
        } catch {
            showToast("Could not copy the link.", "error");
        }
    };

    // ---------------- RENDER ----------------
    if (loading) {
        return (
            <div className="adp-page">
                <PremiumLoader compact title="Loading activity details" />
            </div>
        );
    }

    if (!activity) {
        return (
            <div className="adp-page">
                <div className="adp-empty-page">
                    <FaClipboardList />
                    <h2>Activity not found</h2>
                    <p>It may have been deleted, or you may not have access to it.</p>
                    <button type="button" className="adp-btn adp-btn-primary" onClick={() => navigate("/activity-center")}>
                        <FaArrowLeft /> Back to Activity Center
                    </button>
                </div>
                {toast && <div className={`adp-toast adp-toast-${toast.tone}`}>{toast.message}</div>}
            </div>
        );
    }

    const slNo = location.state?.slNo;
    const statusSlug = slug(activity.status || "open");
    const prioritySlug = slug(activity.priority || "medium");

    const tabs = [
        { key: "timeline", label: "Timeline", icon: <FaHistory />, count: timeline.length },
        { key: "comments", label: "Comments", icon: <FaCommentDots />, count: comments.length },
        { key: "files", label: "Attachments", icon: <FaPaperclip />, count: files.length },
    ];

    return (
        <div className="adp-page">
            {/* ================= HERO ================= */}
            <section className={`adp-hero adp-hero-${prioritySlug}`}>
                <span className="adp-orb adp-orb-a" aria-hidden="true" />
                <span className="adp-orb adp-orb-b" aria-hidden="true" />

                <div className="adp-hero-top">
                    <button type="button" className="adp-back" onClick={() => navigate("/activity-center")}>
                        <FaArrowLeft /> Activity Center
                    </button>
                    <div className="adp-hero-tools">
                        <button type="button" className="adp-icon-btn" onClick={copyLink} title="Copy link"><FaLink /></button>
                        <button type="button" className="adp-icon-btn" onClick={() => loadActivity({ quiet: true })} title="Refresh" disabled={refreshing}>
                            <FaSyncAlt className={refreshing ? "adp-spin" : ""} />
                        </button>
                    </div>
                </div>

                <div className="adp-hero-body">
                    <div className="adp-hero-icon"><FaLayerGroup /></div>
                    <div className="adp-hero-copy">
                        <span className="adp-eyebrow">
                            {activity.module_name || "System"} · Activity #{activity.id}{slNo ? ` · Sl No ${slNo}` : ""}
                        </span>
                        <h1>{activity.title || "Activity"}</h1>
                        <div className="adp-hero-chips">
                            <span className={`adp-chip adp-status-${statusSlug}`}><FaCircle /> {activity.status || "Open"}</span>
                            <span className={`adp-chip adp-priority-${prioritySlug}`}><FaFlag /> {activity.priority || "Medium"} priority</span>
                            {activity.activity_type && <span className="adp-chip adp-chip-glass">{activity.activity_type}</span>}
                            <span className="adp-chip adp-chip-glass"><FaCalendarAlt /> {fmt(activity.created_at)} · {relative(activity.created_at)}</span>
                        </div>
                    </div>
                    {relatedRoute && (
                        <button type="button" className="adp-btn adp-btn-light" onClick={() => navigate(relatedRoute)}>
                            <FaExternalLinkAlt /> Open {activity.module_name}
                        </button>
                    )}
                </div>
            </section>

            {/* ================= QUICK STATS ================= */}
            <section className="adp-stats">
                <div className="adp-stat"><span>Timeline events</span><strong>{timeline.length}</strong></div>
                <div className="adp-stat"><span>Comments</span><strong>{comments.length}</strong></div>
                <div className="adp-stat"><span>Attachments</span><strong>{files.length}</strong></div>
                <div className="adp-stat"><span>Last update</span><strong className="adp-stat-sm">{relative(activity.updated_at || activity.created_at) || "-"}</strong></div>
            </section>

            <div className="adp-layout">
                {/* ================= MAIN ================= */}
                <main className="adp-main">
                    <section className="adp-card">
                        <header className="adp-card-head"><h3><FaAlignLeft /> Description</h3></header>
                        <p className="adp-description">{activity.description || "No description available."}</p>

                        <div className="adp-facts">
                            <div><label>Module</label><p>{activity.module_name || "-"}</p></div>
                            <div><label>Activity Type</label><p>{activity.activity_type || "-"}</p></div>
                            <div><label>Reference ID</label><p>{Number(activity.reference_id) > 0 ? `#${activity.reference_id}` : "-"}</p></div>
                            <div><label>Created By</label><p>{activity.created_by_name || "System"}</p></div>
                            <div><label>Created At</label><p>{fmt(activity.created_at)}</p></div>
                            {activity.nso_location && (
                                <div><label><FaStore /> Store / Location</label><p>{[activity.nso_location, activity.nso_city].filter(Boolean).join(", ")}</p></div>
                            )}
                            {activity.nso_status && <div><label>NSO Status</label><p>{activity.nso_status}</p></div>}
                        </div>
                    </section>

                    <section className="adp-card adp-tabs-card">
                        <div className="adp-tabs" role="tablist">
                            {tabs.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === t.key}
                                    className={`adp-tab ${tab === t.key ? "active" : ""}`}
                                    onClick={() => setTab(t.key)}
                                >
                                    {t.icon} {t.label} <em>{t.count}</em>
                                </button>
                            ))}
                        </div>

                        {tab === "timeline" && (
                            timeline.length === 0 ? (
                                <div className="adp-empty"><FaHistory /><b>No timeline events yet</b><small>Updates to this activity will appear here.</small></div>
                            ) : (
                                <ol className="adp-timeline">
                                    {timeline.map((item, index) => (
                                        <li key={item.id || index} className="adp-tl-item">
                                            <span className="adp-tl-dot" />
                                            <div className="adp-tl-body">
                                                <div className="adp-tl-head">
                                                    <b>{item.event_type || "Update"}</b>
                                                    <time title={fmt(item.created_at)}>{relative(item.created_at)}</time>
                                                </div>
                                                {item.event_description && <p>{item.event_description}</p>}
                                                <small>by <strong>{item.name || "System"}</strong> · {fmt(item.created_at)}</small>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )
                        )}

                        {tab === "comments" && (
                            <>
                                <div className="adp-comments">
                                    {comments.length === 0 ? (
                                        <div className="adp-empty"><FaCommentDots /><b>No comments yet</b><small>Start the discussion below.</small></div>
                                    ) : comments.map((comment) => (
                                        <div className="adp-comment" key={comment.id}>
                                            <span className="adp-avatar">{initials(comment.name)}</span>
                                            <div className="adp-comment-body">
                                                <div className="adp-comment-head">
                                                    <strong>{comment.name || "Unknown User"}</strong>
                                                    <time title={fmt(comment.created_at)}>{relative(comment.created_at)}</time>
                                                </div>
                                                <p>{comment.comment}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="adp-composer">
                                    <span className="adp-avatar adp-avatar-me">{initials(currentUser?.name || "You")}</span>
                                    <div className="adp-composer-box">
                                        <textarea
                                            placeholder="Write a comment… (Ctrl + Enter to post)"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && handleAddComment()}
                                        />
                                        <div className="adp-composer-foot">
                                            <small>{newComment.length} characters</small>
                                            <button type="button" className="adp-btn adp-btn-primary" onClick={handleAddComment} disabled={postingComment || !newComment.trim()}>
                                                <FaPaperPlane /> {postingComment ? "Posting..." : "Post Comment"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {tab === "files" && (
                            <>
                                <div
                                    className={`adp-drop ${dragOver ? "over" : ""}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                                >
                                    <FaCloudUploadAlt />
                                    <b>{selectedFile ? selectedFile.name : "Drop a file here or click to browse"}</b>
                                    <small>{selectedFile ? formatSize(selectedFile.size) : "Images, PDFs and documents"}</small>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        hidden
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                                {selectedFile && (
                                    <div className="adp-drop-actions">
                                        <button type="button" className="adp-btn adp-btn-ghost" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Cancel</button>
                                        <button type="button" className="adp-btn adp-btn-primary" onClick={() => handleUploadFile()} disabled={uploadingFile}>
                                            <FaCloudUploadAlt /> {uploadingFile ? "Uploading..." : "Upload File"}
                                        </button>
                                    </div>
                                )}

                                <div className="adp-files">
                                    {files.length === 0 ? (
                                        <div className="adp-empty"><FaPaperclip /><b>No attachments</b><small>Upload files related to this activity.</small></div>
                                    ) : files.map((file) => {
                                        const ext = String(file.file_name || "").split(".").pop().slice(0, 4).toUpperCase();
                                        return (
                                            <div className="adp-file" key={file.id}>
                                                <span className="adp-file-ext">{ext || "FILE"}</span>
                                                <div className="adp-file-info">
                                                    <strong title={file.file_name}>{file.file_name}</strong>
                                                    <small>{[formatSize(file.file_size), file.uploaded_by_name || file.name, relative(file.created_at)].filter(Boolean).join(" · ")}</small>
                                                </div>
                                                <div className="adp-file-actions">
                                                    <button type="button" className="adp-icon-btn adp-icon-dark" title="Open" onClick={() => openAttachment(file.file_path)}><FaEye /></button>
                                                    <button type="button" className="adp-icon-btn adp-icon-dark" title="Download" onClick={() => openAttachment(file.file_path, { download: true })}><FaDownload /></button>
                                                    <button type="button" className="adp-icon-btn adp-icon-danger" title="Delete" onClick={() => setConfirm({ kind: "file", payload: file })}><FaTrashAlt /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </section>
                </main>

                {/* ================= SIDEBAR ================= */}
                <aside className="adp-side">
                    <section className="adp-card adp-person">
                        <div className="adp-person-cover" />
                        <span className="adp-person-avatar">{initials(recipientName)}</span>
                        <h3>{recipientName}</h3>
                        <p className="adp-person-role">
                            {[activity.designation_name, activity.department_name].filter(Boolean).join(" · ") || (activity.assigned_to_name ? "Assigned user" : "Created by")}
                        </p>

                        <div className="adp-person-actions">
                            <button type="button" onClick={handleViewUser} title="View user"><FaEye /><span>Profile</span></button>
                            <button type="button" onClick={() => setShowEmail(true)} title="Send email" disabled={!recipientEmail}><FaEnvelopeOpen /><span>Email</span></button>
                            <button type="button" onClick={() => setShowChat(true)} title="Message"><FaCommentDots /><span>Chat</span></button>
                            <button type="button" onClick={handleCall} title="Call" disabled={!recipientPhone}><FaPhoneAlt /><span>Call</span></button>
                        </div>

                        <ul className="adp-person-list">
                            <li><FaIdBadge /><span>Employee ID</span><b>{activity.assigned_employee_id || activity.created_by_employee_id || "-"}</b></li>
                            <li><FaBuilding /><span>Department</span><b>{activity.department_name || "-"}</b></li>
                            <li><FaEnvelope /><span>Email</span><b title={recipientEmail}>{recipientEmail || "-"}</b></li>
                            <li><FaPhone /><span>Phone</span><b>{recipientPhone || "-"}</b></li>
                        </ul>

                        {canDeactivate && recipientId > 0 && Number(recipientId) !== currentUserId && (
                            <button type="button" className="adp-btn adp-btn-danger-soft adp-block" onClick={() => setConfirm({ kind: "deactivate" })}>
                                <FaUserSlash /> Deactivate {recipientName.split(" ")[0]}
                            </button>
                        )}
                    </section>

                    <section className="adp-card">
                        <header className="adp-card-head"><h3><FaUser /> People</h3></header>
                        <div className="adp-people">
                            <div>
                                <span className="adp-avatar">{initials(activity.created_by_name || "System")}</span>
                                <div><small>Created by</small><b>{activity.created_by_name || "System"}</b></div>
                            </div>
                            <div>
                                <span className="adp-avatar adp-avatar-alt">{initials(activity.assigned_to_name || "—")}</span>
                                <div><small>Assigned to</small><b>{activity.assigned_to_name || "Not assigned"}</b></div>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            {/* ================= EMAIL ================= */}
            {showEmail && (
                <div className="adp-overlay" onMouseDown={() => !sendingEmail && setShowEmail(false)}>
                    <div className="adp-modal" role="dialog" aria-modal="true" aria-label="Send email" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="adp-modal-head">
                            <div>
                                <h3><FaEnvelopeOpen /> Send Email</h3>
                                <span>To: {recipientName} &lt;{recipientEmail || "no email"}&gt;</span>
                            </div>
                            <button type="button" className="adp-icon-btn adp-icon-dark" onClick={() => setShowEmail(false)} aria-label="Close"><FaTimes /></button>
                        </div>
                        <label className="adp-label">Subject</label>
                        <input className="adp-input" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                        <label className="adp-label">Message</label>
                        <textarea className="adp-input" rows="8" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} placeholder={`Write your message to ${recipientName}...`} />
                        <div className="adp-modal-foot">
                            <button type="button" className="adp-btn adp-btn-ghost" onClick={() => setShowEmail(false)}>Cancel</button>
                            <button type="button" className="adp-btn adp-btn-primary" onClick={handleSendEmail} disabled={sendingEmail}>
                                <FaPaperPlane /> {sendingEmail ? "Sending..." : "Send Email"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CHAT ================= */}
            {showChat && (
                <div className="adp-overlay adp-overlay-right" onMouseDown={() => setShowChat(false)}>
                    <div className="adp-chat" role="dialog" aria-modal="true" aria-label="Chat" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="adp-chat-head">
                            <span className="adp-avatar">{initials(recipientName)}</span>
                            <div><strong>{recipientName}</strong><span>{recipientEmail || "Activity chat"}</span></div>
                            <button type="button" className="adp-icon-btn" onClick={() => setShowChat(false)} aria-label="Close"><FaTimes /></button>
                        </div>
                        <div className="adp-chat-context">{activity.title} · {activity.module_name}</div>
                        <div className="adp-chat-body">
                            {loadingMessages && messages.length === 0 ? (
                                <div className="adp-empty"><PremiumLoader compact title="Loading messages" /></div>
                            ) : messages.length === 0 ? (
                                <div className="adp-empty"><FaComments /><b>No messages yet</b><small>Start the conversation below.</small></div>
                            ) : messages.map((message) => {
                                const mine = Number(message.sender_id) === currentUserId;
                                return (
                                    <div className={`adp-msg ${mine ? "mine" : "theirs"}`} key={message.id}>
                                        <div className="adp-bubble">
                                            <div>{message.message}</div>
                                            <small>{mine ? (currentUser?.name || "You") : (message.sender_name || recipientName)} · {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>
                        <form className="adp-chat-form" onSubmit={handleSendMessage}>
                            <input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder={`Message ${recipientName}...`} autoFocus />
                            <button type="submit" disabled={!chatMessage.trim() || sendingMessage} aria-label="Send"><FaPaperPlane /></button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(confirm)}
                title={confirm?.kind === "file" ? "Delete Attachment" : "Deactivate User"}
                message={
                    confirm?.kind === "file"
                        ? `Delete "${confirm?.payload?.file_name}"? This cannot be undone.`
                        : `Deactivate ${recipientName}? They will no longer be able to sign in.`
                }
                confirmText={confirmBusy ? "Please wait..." : confirm?.kind === "file" ? "Delete" : "Deactivate"}
                cancelText="Cancel"
                confirmVariant="danger"
                loading={confirmBusy}
                onConfirm={runConfirm}
                onCancel={() => !confirmBusy && setConfirm(null)}
            />

            {toast && <div className={`adp-toast adp-toast-${toast.tone}`}>{toast.message}</div>}
        </div>
    );
}

export default ActivityDetails;

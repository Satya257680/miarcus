import { useEffect, useRef, useState } from "react";
import {
    FaBullhorn,
    FaTimes,
    FaUsers,
    FaUserTie,
    FaUser,
    FaUserCheck,
    FaSearch,
    FaThumbtack,
    FaCloudUploadAlt,
    FaPaperclip,
    FaImage,
    FaVideo,
    FaFilePdf,
    FaCheckCircle,
    FaExclamationCircle,
    FaPaperPlane,
    FaSave,
    FaEye,
    FaRegCircle,
    FaTrash
} from "react-icons/fa";
import announcementService from "../../services/announcementService";
import "../../styles/premium/AnnouncementComposer.css";

// ======================================================
// ANNOUNCEMENT COMPOSER (Create / Edit)
// Premium two-pane modal: form on the left, live preview and
// publishing checklist on the right. Title, message and audience
// are mandatory (and at least one user for "Specific Users").
// ======================================================

const TITLE_MAX = 150;
const MESSAGE_MAX = 5000;
const MAX_FILE_MB = 50;

const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
const VIDEO_RE = /\.(mp4|webm|mov|avi|mkv)$/i;
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.mp4,.webm,.mov,.avi,.mkv";

const AUDIENCES = [
    { id: "everyone", label: "Everyone", text: "All active users", icon: FaUsers },
    { id: "managers", label: "Managers", text: "Store & department managers", icon: FaUserTie },
    { id: "users", label: "Users", text: "Employees (non-managers)", icon: FaUser },
    { id: "specific", label: "Specific Users", text: "Pick people by name", icon: FaUserCheck }
];

const fileIcon = (name) => {
    if (IMAGE_RE.test(String(name || ""))) return FaImage;
    if (VIDEO_RE.test(String(name || ""))) return FaVideo;
    if (String(name || "").toLowerCase().endsWith(".pdf")) return FaFilePdf;
    return FaPaperclip;
};

export default function AnnouncementComposer({ editingItem, onClose, onSuccess }) {
    const isEditing = Boolean(editingItem);

    const [title, setTitle] = useState(editingItem?.title || "");
    const [content, setContent] = useState(editingItem?.content || "");
    const [audience, setAudience] = useState(editingItem?.audience || "everyone");
    const [specificUsers, setSpecificUsers] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [removeAttachment, setRemoveAttachment] = useState(false);
    const [isPinned, setIsPinned] = useState(Number(editingItem?.is_pinned) === 1);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");
    const [drag, setDrag] = useState(false);
    const fileRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && !saving) onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, saving]);

    // Selected users of an existing "specific" announcement
    useEffect(() => {
        let active = true;
        if (!editingItem || editingItem.audience !== "specific") return undefined;
        announcementService.getRecipients(editingItem.id)
            .then((data) => { if (active) setSpecificUsers(data.users || []); })
            .catch((err) => console.error("Announcement recipients:", err));
        return () => { active = false; };
    }, [editingItem]);

    // User search for "specific"
    useEffect(() => {
        if (audience !== "specific") return undefined;
        setUsersLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await announcementService.getUsers(userSearch);
                setUsers(data.users || []);
            } catch (err) {
                console.error("Announcement users:", err);
            } finally {
                setUsersLoading(false);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [audience, userSearch]);

    // Image preview for a newly picked file
    useEffect(() => {
        if (!file || !IMAGE_RE.test(file.name)) { setPreview(""); return undefined; }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const clearError = (key) => { setErrors((e) => ({ ...e, [key]: "" })); setError(""); };

    const toggleUser = (user) => {
        clearError("users");
        setSpecificUsers((prev) => (prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]));
    };

    const pickFile = (picked) => {
        if (!picked) { setFile(null); return; }
        if (picked.size > MAX_FILE_MB * 1024 * 1024) {
            setErrors((e) => ({ ...e, file: `File is larger than ${MAX_FILE_MB} MB.` }));
            return;
        }
        setFile(picked);
        setRemoveAttachment(false);
        clearError("file");
    };

    const validate = () => {
        const e = {};
        if (!title.trim()) e.title = "Title is required.";
        else if (title.trim().length < 3) e.title = "Title is too short.";
        if (!content.trim()) e.content = "Message is required.";
        if (!audience) e.audience = "Choose who should receive it.";
        if (audience === "specific" && !specificUsers.length) e.users = "Select at least one user.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!validate()) {
            setError("Please complete the mandatory fields marked *.");
            return;
        }
        const form = new FormData();
        form.append("title", title.trim());
        form.append("content", content.trim());
        form.append("audience", audience);
        form.append("specificUserIds", JSON.stringify(specificUsers.map((u) => u.id)));
        form.append("isPinned", String(isPinned));
        form.append("removeAttachment", String(removeAttachment));
        if (file) form.append("attachment", file);

        try {
            setSaving(true);
            setError("");
            if (isEditing) await announcementService.update(editingItem.id, form);
            else await announcementService.create(form);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || (isEditing ? "Unable to update announcement." : "Unable to publish announcement."));
        } finally {
            setSaving(false);
        }
    };

    const audienceMeta = AUDIENCES.find((a) => a.id === audience) || AUDIENCES[0];
    const AudienceIcon = audienceMeta.icon;
    const existingName = isEditing && !removeAttachment ? editingItem?.attachment_original_name : "";
    const attachmentName = file?.name || existingName || "";
    const AttachIcon = fileIcon(attachmentName);

    const checklist = [
        { ok: Boolean(title.trim()), label: "Title added" },
        { ok: Boolean(content.trim()), label: "Message written" },
        { ok: audience !== "specific" || specificUsers.length > 0, label: audience === "specific" ? `${specificUsers.length} user(s) selected` : `Audience: ${audienceMeta.label}` },
        { ok: true, optional: true, label: attachmentName ? "Attachment added" : "Attachment (optional)" }
    ];

    return (
        <div className="ac-overlay" onMouseDown={() => !saving && onClose()}>
            <form className="ac-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} noValidate role="dialog" aria-modal="true">
                {/* HEADER */}
                <header className="ac-head">
                    <span className="ac-head-icon"><FaBullhorn /></span>
                    <div>
                        <span className="ac-eyebrow">{isEditing ? "Edit announcement" : "New announcement"}</span>
                        <h2>{isEditing ? "Edit Announcement" : "Create Announcement"}</h2>
                        <p>Share news, circulars and updates with your team. Fields marked <b>*</b> are mandatory.</p>
                    </div>
                    <button type="button" className="ac-close" onClick={onClose} disabled={saving} aria-label="Close"><FaTimes /></button>
                </header>

                <div className="ac-body">
                    {/* LEFT – FORM */}
                    <div className="ac-form">
                        <label className={`ac-field ${errors.title ? "is-invalid" : ""}`}>
                            <span className="ac-label">Title <b>*</b><em>{title.length}/{TITLE_MAX}</em></span>
                            <input
                                value={title}
                                maxLength={TITLE_MAX}
                                onChange={(e) => { setTitle(e.target.value); clearError("title"); }}
                                placeholder="e.g. Diwali store timings, New SOP for billing..."
                                autoFocus
                            />
                            {errors.title && <small className="ac-error">{errors.title}</small>}
                        </label>

                        <label className={`ac-field ${errors.content ? "is-invalid" : ""}`}>
                            <span className="ac-label">Message <b>*</b><em>{content.length}/{MESSAGE_MAX}</em></span>
                            <textarea
                                value={content}
                                maxLength={MESSAGE_MAX}
                                rows={7}
                                onChange={(e) => { setContent(e.target.value); clearError("content"); }}
                                placeholder="Write your announcement..."
                            />
                            {errors.content && <small className="ac-error">{errors.content}</small>}
                        </label>

                        <div className={`ac-field ${errors.audience ? "is-invalid" : ""}`}>
                            <span className="ac-label">Send To <b>*</b></span>
                            <div className="ac-audience">
                                {AUDIENCES.map(({ id, label, text, icon: Icon }) => (
                                    <button
                                        type="button"
                                        key={id}
                                        className={`ac-aud ${audience === id ? "is-on" : ""}`}
                                        onClick={() => { setAudience(id); clearError("audience"); clearError("users"); }}
                                        aria-pressed={audience === id}
                                    >
                                        <span className="ac-aud-icon"><Icon /></span>
                                        <span className="ac-aud-copy"><strong>{label}</strong><small>{text}</small></span>
                                        {audience === id ? <FaCheckCircle className="ac-aud-tick" /> : <FaRegCircle className="ac-aud-tick ac-aud-tick--off" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {audience === "specific" && (
                            <div className={`ac-users ${errors.users ? "is-invalid" : ""}`}>
                                <div className="ac-users-head">
                                    <span><FaUsers /> Select Users <b>*</b></span>
                                    <strong>{specificUsers.length} selected</strong>
                                </div>
                                {specificUsers.length > 0 && (
                                    <div className="ac-chips">
                                        {specificUsers.map((u) => (
                                            <span key={u.id} className="ac-chip">
                                                {u.name}
                                                <button type="button" onClick={() => toggleUser(u)} aria-label={`Remove ${u.name}`}><FaTimes /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="ac-search">
                                    <FaSearch />
                                    <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users by name or email..." />
                                </div>
                                <div className="ac-user-list">
                                    {usersLoading && !users.length ? (
                                        <div className="ac-user-empty">Loading users…</div>
                                    ) : users.length ? users.map((u) => {
                                        const selected = specificUsers.some((x) => x.id === u.id);
                                        return (
                                            <button type="button" key={u.id} className={`ac-user ${selected ? "is-on" : ""}`} onClick={() => toggleUser(u)}>
                                                <span className="ac-avatar">{String(u.name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
                                                <span className="ac-user-copy">
                                                    <strong>{u.name}</strong>
                                                    <small>{u.email}{u.designation ? ` · ${u.designation}` : ""}</small>
                                                </span>
                                                <span className="ac-user-pick">{selected ? "Selected" : "Select"}</span>
                                            </button>
                                        );
                                    }) : <div className="ac-user-empty">No users found.</div>}
                                </div>
                                {errors.users && <small className="ac-error">{errors.users}</small>}
                            </div>
                        )}

                        <div className={`ac-field ${errors.file ? "is-invalid" : ""}`}>
                            <span className="ac-label">{isEditing ? "Replace Attachment" : "Attachment"} <i>(optional)</i></span>
                            {attachmentName ? (
                                <div className="ac-file">
                                    {preview ? <img src={preview} alt="" /> : <span className="ac-file-icon"><AttachIcon /></span>}
                                    <div>
                                        <strong>{attachmentName}</strong>
                                        <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · new file` : "Current attachment"}</small>
                                    </div>
                                    <button type="button" className="ac-file-btn" onClick={() => fileRef.current?.click()}>Replace</button>
                                    <button
                                        type="button"
                                        className="ac-file-btn ac-file-btn--danger"
                                        onClick={() => { if (file) setFile(null); else setRemoveAttachment(true); if (fileRef.current) fileRef.current.value = ""; }}
                                    >
                                        <FaTrash /> Remove
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={`ac-drop ${drag ? "is-drag" : ""}`}
                                    onClick={() => fileRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                                    onDragLeave={() => setDrag(false)}
                                    onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <FaCloudUploadAlt />
                                    <div>
                                        <strong><span>Choose file</span> or drag and drop</strong>
                                        <small>Images, videos, PDF, Word, Excel, CSV · max {MAX_FILE_MB} MB</small>
                                    </div>
                                </div>
                            )}
                            {removeAttachment && isEditing && (
                                <small className="ac-hint">The current attachment will be removed when you save. <button type="button" onClick={() => setRemoveAttachment(false)}>Undo</button></small>
                            )}
                            {errors.file && <small className="ac-error">{errors.file}</small>}
                            <input ref={fileRef} type="file" hidden accept={ACCEPT} onChange={(e) => pickFile(e.target.files?.[0])} />
                        </div>

                        <label className={`ac-pin ${isPinned ? "is-on" : ""}`}>
                            <span className="ac-pin-icon"><FaThumbtack /></span>
                            <span className="ac-pin-copy">
                                <strong>{isEditing && Number(editingItem?.is_pinned) === 1 ? "Keep this announcement pinned" : "Pin this announcement"}</strong>
                                <small>{isPinned ? "Shown at the top of the list for everyone." : "Pinned announcements stay at the top of the list."}</small>
                            </span>
                            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
                            <span className="ac-toggle"><i /></span>
                        </label>
                    </div>

                    {/* RIGHT – PREVIEW */}
                    <aside className="ac-side">
                        <div className="ac-side-title"><FaEye /> Live preview</div>
                        <article className="ac-preview">
                            <div className="ac-preview-top">
                                <span className="ac-preview-badge"><FaBullhorn /> Announcement</span>
                                {isPinned && <span className="ac-preview-pin"><FaThumbtack /> Pinned</span>}
                            </div>
                            <h3>{title.trim() || "Your announcement title"}</h3>
                            <p className={content.trim() ? "" : "is-placeholder"}>{content.trim() || "Your message will appear here exactly as people will read it."}</p>
                            {preview && <img className="ac-preview-img" src={preview} alt="" />}
                            {attachmentName && !preview && (
                                <div className="ac-preview-file"><AttachIcon /> {attachmentName}</div>
                            )}
                            <div className="ac-preview-foot">
                                <span><AudienceIcon /> {audience === "specific" ? `${specificUsers.length} selected user(s)` : audienceMeta.label}</span>
                                <span>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            </div>
                        </article>

                        <div className="ac-check">
                            <div className="ac-side-title">Before you publish</div>
                            {checklist.map((item) => (
                                <div key={item.label} className={`ac-check-row ${item.ok ? "is-ok" : ""} ${item.optional ? "is-optional" : ""}`}>
                                    {item.ok ? <FaCheckCircle /> : <FaRegCircle />} {item.label}
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>

                {error && <div className="ac-alert"><FaExclamationCircle /> {error}</div>}

                {/* FOOTER */}
                <footer className="ac-foot">
                    <span className="ac-foot-note">
                        <AudienceIcon /> {audience === "specific" ? `${specificUsers.length} user(s)` : audienceMeta.label} will be notified
                    </span>
                    <button type="button" className="ac-btn ac-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="ac-btn ac-btn--primary" disabled={saving}>
                        {isEditing ? <FaSave /> : <FaPaperPlane />}
                        {saving ? "Saving..." : isEditing ? "Save Changes" : "Publish Announcement"}
                    </button>
                </footer>
            </form>
        </div>
    );
}

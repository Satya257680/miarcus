import React, { useEffect, useState } from "react";
import {
    FaBullhorn,
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaDownload,
    FaEdit,
    FaFile,
    FaImage,
    FaPaperclip,
    FaPrint,
    FaSearch,
    FaThumbtack,
    FaTimes,
    FaUser,
    FaUsers,
} from "react-icons/fa";
import announcementService from "../services/announcementService";
import PageToolbar from "../components/common/PageToolbar";
import BulkUploadModal from "../components/common/BulkUploadModal";
import "../styles/Announcements.css";

const PAGE_SIZE = 8;
const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
const API_BASE = (
    import.meta.env.VITE_API_URL?.trim() ||
    (import.meta.env.PROD
        ? "https://miarcus-backend.onrender.com"
        : "http://localhost:5000")
).replace(/\/+$/, "");

const isImage = name => IMAGE_RE.test(String(name || ""));
const isPdf = name => String(name || "").toLowerCase().endsWith(".pdf");

function Announcements() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin =
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.is_admin === true ||
        user?.is_admin === 1;

    const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    const announcementPermission = permissions["Announcements"] || "None";

    const canView = isAdmin || ["View", "Add", "Edit", "Full"].includes(announcementPermission);
    const canAdd = isAdmin || ["Add", "Edit", "Full"].includes(announcementPermission);
    const canEdit = isAdmin || ["Edit", "Full"].includes(announcementPermission);
    const canDelete = isAdmin || announcementPermission === "Full";

    const [announcements, setAnnouncements] = useState([]);
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const data = await announcementService.getAll({ search, startDate, endDate });
            setAnnouncements(data.announcements || []);
            setPage(1);
        } catch (error) {
            console.error("Announcements load:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // Search/date filtering is intentionally server-side for this module.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, startDate, endDate]);

    const pinned = announcements.find(a => Number(a.is_pinned) === 1);
    const latest = announcements.filter(a => a.id !== pinned?.id);
    const totalPages = Math.max(1, Math.ceil(latest.length / PAGE_SIZE));
    const visible = latest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const fileUrl = item => {
        if (!item?.attachment_path) return null;
        return `${API_BASE}/uploads/${encodeURIComponent(
            String(item.attachment_path).split("/").pop()
        )}`;
    };

    const openAnnouncement = async item => {
        setSelected(item);
        if (item.in_app_status !== "read") {
            try {
                await announcementService.markRead(item.id);
                setAnnouncements(prev =>
                    prev.map(a =>
                        a.id === item.id
                            ? { ...a, in_app_status: "read", read_at: new Date().toISOString() }
                            : a
                    )
                );
            } catch (error) {
                console.error("Mark announcement read:", error);
            }
        }
    };

    const openEdit = item => {
        if (!canEdit) return;
        setSelected(null);
        setEditing(item);
    };

    const printAnnouncement = item => {
        const w = window.open("", "_blank", "width=900,height=700");
        if (!w) return;
        const safeTitle = String(item.title || "Announcement").replace(/</g, "&lt;");
        const safeContent = String(item.content || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>");

        w.document.write(`
            <html>
                <head><title>${safeTitle}</title></head>
                <body style="font-family:Arial;padding:40px;color:#294851">
                    <h1>${safeTitle}</h1>
                    <p>${safeContent}</p>
                </body>
            </html>
        `);
        w.document.close();
        w.focus();
        w.print();
    };

    const deleteAnnouncement = async id => {
        if (!canDelete) return;
        if (!window.confirm("Delete this announcement?")) return;
        try {
            await announcementService.delete(id);
            setSelected(null);
            await load();
        } catch (error) {
            alert(error.response?.data?.message || "Unable to delete announcement");
        }
    };

    const handleDeleteAll = async () => {
        if (!canDelete) return;
        if (!announcements.length) {
            alert("There are no announcements to delete.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete ALL announcements? This cannot be undone.")) return;

        try {
            await announcementService.deleteAll();
            setSelected(null);
            setEditing(null);
            await load();
            alert("All announcements deleted successfully.");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete all announcements.");
        }
    };

    const handleExport = async () => {
        try {
            const response = await announcementService.export();
            const url = window.URL.createObjectURL(
                new Blob([response.data], { type: "text/csv;charset=utf-8;" })
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "Announcements.csv";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to export announcements.");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    if (!canView) {
        return (
            <div className="announcements-page">
                <div className="announcement-empty">
                    <FaBullhorn />
                    <h3>Announcements</h3>
                    <p>You don't have permission to view announcements.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="announcements-page">
            <div className="announcement-header">
                <div className="announcement-title-row">
                    <div className="announcement-title-icon"><FaBullhorn /></div>
                    <div>
                        <h1>Announcements</h1>
                        <p>Share important updates with the right people.</p>
                    </div>
                </div>
            </div>

            <PageToolbar
                search={search}
                setSearch={value => { setSearch(value); setPage(1); }}
                searchPlaceholder="Search announcement history..."
                showAdd={canAdd}
                addText="New Announcement"
                onAdd={() => setShowCreate(true)}
                showExport={canView}
                onExport={handleExport}
                showBulk={canAdd}
                onBulk={() => setShowBulkUpload(true)}
                showDeleteAll={canDelete}
                onDeleteAll={handleDeleteAll}
            >
                <button
                    type="button"
                    className="toolbar-btn announcement-clear-toolbar-btn"
                    onClick={clearFilters}
                    disabled={!search && !startDate && !endDate}
                >
                    <FaTimes /> Clear Filters
                </button>
            </PageToolbar>

            <div className="announcement-filters">
                <label>
                    <span>Start Date</span>
                    <div className="date-field">
                        <FaCalendarAlt />
                        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
                    </div>
                </label>

                <label>
                    <span>End Date</span>
                    <div className="date-field">
                        <FaCalendarAlt />
                        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
                    </div>
                </label>
            </div>

            {loading ? (
                <div className="announcement-empty">Loading announcements...</div>
            ) : announcements.length === 0 ? (
                <div className="announcement-empty">
                    <FaBullhorn />
                    <h3>No announcements yet</h3>
                    <p>Published announcements will appear here.</p>
                </div>
            ) : (
                <>
                    {pinned && (
                        <section className="announcement-section">
                            <div className="section-heading">
                                <span><FaThumbtack /> Pinned Announcement</span>
                            </div>
                            <AnnouncementCard
                                item={pinned}
                                featured
                                fileUrl={fileUrl(pinned)}
                                canEdit={canEdit}
                                onOpen={openAnnouncement}
                                onPrint={printAnnouncement}
                                onEdit={openEdit}
                            />
                        </section>
                    )}

                    <section className="announcement-section">
                        <div className="section-heading">
                            <span><FaBullhorn /> Latest</span>
                            <small>{latest.length} announcement{latest.length === 1 ? "" : "s"}</small>
                        </div>

                        <div className="announcement-grid">
                            {visible.map(item => (
                                <AnnouncementCard
                                    key={item.id}
                                    item={item}
                                    fileUrl={fileUrl(item)}
                                    canEdit={canEdit}
                                    onOpen={openAnnouncement}
                                    onPrint={printAnnouncement}
                                    onEdit={openEdit}
                                />
                            ))}
                        </div>

                        {latest.length > PAGE_SIZE && (
                            <div className="announcement-pagination">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                    <FaChevronLeft />
                                </button>
                                <span>Page {page} of {totalPages}</span>
                                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="announcement-section">
                        <div className="section-heading">
                            <span>History</span>
                            <small>{announcements.length} total</small>
                        </div>
                        <div className="announcement-history">
                            {announcements.map(item => (
                                <button key={item.id} className="history-row" onClick={() => openAnnouncement(item)}>
                                    <span className="history-icon">
                                        {isImage(item.attachment_original_name) ? <FaImage /> : item.attachment_path ? <FaFile /> : <FaBullhorn />}
                                    </span>
                                    <span className="history-main">
                                        <strong>{item.title}</strong>
                                        <small>{new Date(item.published_at || item.created_at).toLocaleString()}</small>
                                    </span>
                                    <span className="history-audience">{formatAudience(item.audience)}</span>
                                    <span className={`read-state ${item.in_app_status === "read" ? "read" : ""}`}>
                                        {item.in_app_status === "read" ? "Read" : "Unread"}
                                    </span>
                                    {item.is_pinned === 1 && <FaThumbtack className="history-pin" title="Pinned" />}
                                </button>
                            ))}
                        </div>
                    </section>
                </>
            )}

            {selected && (
                <AnnouncementView
                    item={selected}
                    fileUrl={fileUrl(selected)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onClose={() => setSelected(null)}
                    onPrint={() => printAnnouncement(selected)}
                    onEdit={() => openEdit(selected)}
                    onDelete={() => deleteAnnouncement(selected.id)}
                />
            )}

            {(showCreate || editing) && (
                <CreateAnnouncementModal
                    editingItem={editing}
                    onClose={() => {
                        setShowCreate(false);
                        setEditing(null);
                    }}
                    onSuccess={async () => {
                        setShowCreate(false);
                        setEditing(null);
                        await load();
                    }}
                />
            )}

            {canAdd && (
                <BulkUploadModal
                    isOpen={showBulkUpload}
                    onClose={() => setShowBulkUpload(false)}
                    onSuccess={async () => {
                        setShowBulkUpload(false);
                        await load();
                    }}
                    uploadFunction={announcementService.bulkUpload}
                    title="Bulk Upload Announcements"
                    acceptedFile=".csv,.xlsx,.xls"
                    sampleFile="/announcement-bulk-template.csv"
                />
            )}
        </div>
    );
}

function formatAudience(audience) {
    const map = {
        everyone: "Everyone",
        managers: "Managers",
        users: "Users",
        specific: "Specific Users"
    };
    return map[audience] || audience || "Everyone";
}

function AnnouncementCard({ item, featured, fileUrl, canEdit, onOpen, onPrint, onEdit }) {
    return (
        <article className={`announcement-card ${featured ? "featured" : ""} ${item.in_app_status !== "read" ? "unread" : ""}`}>
            <div className="announcement-card-preview">
                {fileUrl && isImage(item.attachment_original_name) ? (
                    <img
                        className="announcement-image-preview"
                        src={fileUrl}
                        alt={item.attachment_original_name || item.title}
                    />
                ) : fileUrl && isPdf(item.attachment_original_name) ? (
                    <iframe title={item.title} src={`${fileUrl}#toolbar=1&navpanes=0`} />
                ) : (
                    <div className="announcement-document">
                        {fileUrl ? <FaFile /> : <FaBullhorn />}
                        <span>{item.attachment_original_name || "Announcement"}</span>
                    </div>
                )}
            </div>

            <div className="announcement-card-body">
                <div className="announcement-card-top">
                    {Number(item.is_pinned) === 1 && (
                        <span className="pinned-badge"><FaThumbtack /> Pinned</span>
                    )}
                    {item.in_app_status !== "read" && <span className="new-badge">New</span>}
                </div>

                <h3>{item.title}</h3>
                <p>{item.content || "No description provided."}</p>

                <div className="announcement-meta">
                    <span>{new Date(item.published_at || item.created_at).toLocaleDateString()}</span>
                    <span>{formatAudience(item.audience)}</span>
                    <span>{item.created_by_name || "MIARCUS"}</span>
                </div>

                <div className="announcement-actions">
                    <button className="primary-action" onClick={() => onOpen(item)}>View</button>

                    {fileUrl && (
                        <a href={fileUrl} target="_blank" rel="noreferrer" download={item.attachment_original_name || true}>
                            <FaDownload /> Download
                        </a>
                    )}

                    <button onClick={() => onPrint(item)}><FaPrint /> Print</button>

                    {canEdit && (
                        <button className="edit-action" onClick={() => onEdit(item)}>
                            <FaEdit /> Edit
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

function AnnouncementView({ item, fileUrl, canEdit, canDelete, onClose, onPrint, onEdit, onDelete }) {
    return (
        <div className="announcement-overlay" onMouseDown={onClose}>
            <div className="announcement-view-modal" onMouseDown={e => e.stopPropagation()}>
                <div className="announcement-view-header">
                    <div>
                        <span className="modal-eyebrow"><FaBullhorn /> Announcement</span>
                        <h2>{item.title}</h2>
                        <div className="view-submeta">
                            <span>{formatAudience(item.audience)}</span>
                            <span>{new Date(item.published_at || item.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose}><FaTimes /></button>
                </div>

                {fileUrl && isImage(item.attachment_original_name) && (
                    <div className="announcement-full-image-wrap">
                        <img
                            className="announcement-full-image"
                            src={fileUrl}
                            alt={item.attachment_original_name || item.title}
                        />
                    </div>
                )}

                {fileUrl && isPdf(item.attachment_original_name) && (
                    <iframe className="announcement-full-pdf" title={item.title} src={fileUrl} />
                )}

                <div className="announcement-view-content">
                    <p>{item.content || "No description provided."}</p>

                    {item.attachment_original_name && fileUrl && (
                        <a className="attachment-chip" href={fileUrl} target="_blank" rel="noreferrer">
                            {isImage(item.attachment_original_name) ? <FaImage /> : <FaPaperclip />}
                            {item.attachment_original_name}
                        </a>
                    )}
                </div>

                <div className="announcement-view-footer">
                    <span>Published by {item.created_by_name || "MIARCUS"}</span>
                    <div>
                        {fileUrl && (
                            <a
                                className="secondary-btn"
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={item.attachment_original_name || true}
                            >
                                <FaDownload /> Download
                            </a>
                        )}
                        <button className="secondary-btn" onClick={onPrint}><FaPrint /> Print</button>
                        {canEdit && (
                            <button className="secondary-btn edit-view-btn" onClick={onEdit}>
                                <FaEdit /> Edit / Unpin
                            </button>
                        )}
                        {canDelete && <button className="danger-btn" onClick={onDelete}>Delete</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateAnnouncementModal({ editingItem, onClose, onSuccess }) {
    const isEditing = Boolean(editingItem);
    const [title, setTitle] = useState(editingItem?.title || "");
    const [content, setContent] = useState(editingItem?.content || "");
    const [audience, setAudience] = useState(editingItem?.audience || "everyone");
    const [specificUsers, setSpecificUsers] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [file, setFile] = useState(null);
    const [removeAttachment, setRemoveAttachment] = useState(false);
    const [isPinned, setIsPinned] = useState(Number(editingItem?.is_pinned) === 1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;

        const loadSelectedUsers = async () => {
            if (!editingItem || editingItem.audience !== "specific") return;
            try {
                const data = await announcementService.getRecipients(editingItem.id);
                if (active) setSpecificUsers(data.users || []);
            } catch (error) {
                console.error("Announcement recipients:", error);
            }
        };

        loadSelectedUsers();
        return () => { active = false; };
    }, [editingItem]);

    useEffect(() => {
        if (audience !== "specific") return;
        const timer = setTimeout(async () => {
            try {
                const data = await announcementService.getUsers(userSearch);
                setUsers(data.users || []);
            } catch (error) {
                console.error("Announcement users:", error);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [audience, userSearch]);

    const toggleUser = selectedUser => {
        setSpecificUsers(prev =>
            prev.some(u => u.id === selectedUser.id)
                ? prev.filter(u => u.id !== selectedUser.id)
                : [...prev, selectedUser]
        );
    };

    const submit = async e => {
        e.preventDefault();

        if (!title.trim()) return alert("Title is required");
        if (audience === "specific" && !specificUsers.length) {
            return alert("Select at least one user");
        }

        const form = new FormData();
        form.append("title", title);
        form.append("content", content);
        form.append("audience", audience);
        form.append("specificUserIds", JSON.stringify(specificUsers.map(u => u.id)));
        form.append("isPinned", String(isPinned));
        form.append("removeAttachment", String(removeAttachment));
        if (file) form.append("attachment", file);

        try {
            setSaving(true);
            if (isEditing) {
                await announcementService.update(editingItem.id, form);
            } else {
                await announcementService.create(form);
            }
            onSuccess();
        } catch (error) {
            alert(error.response?.data?.message || (isEditing ? "Unable to update announcement" : "Unable to publish announcement"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="announcement-overlay" onMouseDown={onClose}>
            <form className="announcement-create-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
                <div className="announcement-view-header">
                    <div>
                        <span className="modal-eyebrow"><FaBullhorn /> {isEditing ? "Edit Announcement" : "New Announcement"}</span>
                        <h2>{isEditing ? "Edit Announcement" : "Create Announcement"}</h2>
                    </div>
                    <button type="button" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="form-grid">
                    <label className="full">
                        <span>Title *</span>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
                    </label>

                    <label className="full">
                        <span>Message</span>
                        <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Write your announcement..." />
                    </label>

                    <label>
                        <span>Send To *</span>
                        <select value={audience} onChange={e => setAudience(e.target.value)}>
                            <option value="everyone">Everyone</option>
                            <option value="managers">Managers</option>
                            <option value="users">Users</option>
                            <option value="specific">Specific Users</option>
                        </select>
                    </label>

                    <label>
                        <span>{isEditing ? "Replace Attachment" : "Attachment"}</span>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg"
                            onChange={e => {
                                setFile(e.target.files?.[0] || null);
                                setRemoveAttachment(false);
                            }}
                        />
                    </label>
                </div>

                {isEditing && editingItem?.attachment_original_name && !file && (
                    <div className="current-attachment-box">
                        <div>
                            <span className="current-attachment-icon">
                                {isImage(editingItem.attachment_original_name) ? <FaImage /> : <FaPaperclip />}
                            </span>
                            <div>
                                <strong>Current attachment</strong>
                                <small>{editingItem.attachment_original_name}</small>
                            </div>
                        </div>
                        <label className="remove-attachment-check">
                            <input
                                type="checkbox"
                                checked={removeAttachment}
                                onChange={e => setRemoveAttachment(e.target.checked)}
                            />
                            Remove attachment
                        </label>
                    </div>
                )}

                {audience === "specific" && (
                    <div className="specific-users-box">
                        <div className="specific-users-title">
                            <span><FaUsers /> Select Users</span>
                            <strong>{specificUsers.length} selected</strong>
                        </div>
                        <div className="announcement-search compact">
                            <FaSearch />
                            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." />
                        </div>
                        <div className="user-picker-list">
                            {users.map(user => {
                                const selected = specificUsers.some(u => u.id === user.id);
                                return (
                                    <button
                                        type="button"
                                        key={user.id}
                                        className={`user-picker-row ${selected ? "selected" : ""}`}
                                        onClick={() => toggleUser(user)}
                                    >
                                        <span className="user-avatar"><FaUser /></span>
                                        <span>
                                            <strong>{user.name}</strong>
                                            <small>{user.email}{user.designation ? ` • ${user.designation}` : ""}</small>
                                        </span>
                                        <span className="user-check">{selected ? "Selected" : "Select"}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <label className="pin-checkbox">
                    <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
                    <span><FaThumbtack /> {isEditing && Number(editingItem?.is_pinned) === 1 ? "Keep this announcement pinned" : "Pin this announcement"}</span>
                </label>

                {isEditing && Number(editingItem?.is_pinned) === 1 && (
                    <div className="unpin-hint">
                        Uncheck the pin option and save to <strong>unpin</strong> this announcement.
                    </div>
                )}

                <div className="create-footer">
                    <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="announcement-primary-btn" disabled={saving}>
                        {saving ? "Saving..." : isEditing ? "Save Changes" : "Publish Announcement"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Announcements;

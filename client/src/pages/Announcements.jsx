import React, { useEffect, useMemo, useState } from "react";
import {
    FaBullhorn,
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaDownload,
    FaFilePdf,
    FaPaperclip,
    FaPlus,
    FaPrint,
    FaSearch,
    FaThumbtack,
    FaTimes,
    FaUser,
    FaUsers,
} from "react-icons/fa";
import announcementService from "../services/announcementService";
import "../styles/Announcements.css";

const PAGE_SIZE = 8;

function Announcements() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user?.administrator === true;
    const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    const canAdd = isAdmin || ["Add", "Edit", "Full"].includes(permissions["Announcements"]);
    const canDelete = isAdmin || permissions["Announcements"] === "Full";

    const [announcements, setAnnouncements] = useState([]);
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [showCreate, setShowCreate] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const data = await announcementService.getAll({ search, startDate, endDate });
            setAnnouncements(data.announcements || []);
            setPage(1);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [search, startDate, endDate]);

    const pinned = announcements.find(a => Number(a.is_pinned) === 1);
    const latest = announcements.filter(a => a.id !== pinned?.id);
    const totalPages = Math.max(1, Math.ceil(latest.length / PAGE_SIZE));
    const visible = latest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openAnnouncement = async (item) => {
        setSelected(item);
        if (item.in_app_status !== "read") {
            try {
                await announcementService.markRead(item.id);
                setAnnouncements(prev =>
                    prev.map(a => a.id === item.id
                        ? { ...a, in_app_status: "read", read_at: new Date().toISOString() }
                        : a
                    )
                );
            } catch (error) {
                console.error(error);
            }
        }
    };

    const fileUrl = (item) => {
        if (!item?.attachment_path) return null;
        const base = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:5000";
        return `${base}/uploads/${encodeURIComponent(item.attachment_path.split("/").pop())}`;
    };

    const printAnnouncement = (item) => {
        const w = window.open("", "_blank", "width=900,height=700");
        if (!w) return;
        w.document.write(`
            <html><head><title>${item.title}</title></head>
            <body style="font-family:Arial;padding:40px">
                <h1>${item.title}</h1>
                <p>${String(item.content || "").replace(/\n/g, "<br/>")}</p>
            </body></html>
        `);
        w.document.close();
        w.focus();
        w.print();
    };

    const deleteAnnouncement = async (id) => {
        if (!window.confirm("Delete this announcement?")) return;
        try {
            await announcementService.delete(id);
            setSelected(null);
            load();
        } catch (error) {
            alert(error.response?.data?.message || "Unable to delete announcement");
        }
    };

    return (
        <div className="announcements-page">
            <div className="announcement-header">
                <div>
                    <div className="announcement-title-row">
                        <div className="announcement-title-icon"><FaBullhorn /></div>
                        <div>
                            <h1>Announcements</h1>
                            <p>Share important updates with the right people.</p>
                        </div>
                    </div>
                </div>

                {canAdd && (
                    <button className="announcement-primary-btn" onClick={() => setShowCreate(true)}>
                        <FaPlus /> New Announcement
                    </button>
                )}
            </div>

            <div className="announcement-filters">
                <div className="announcement-search">
                    <FaSearch />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search announcement history..."
                    />
                </div>

                <label>
                    <span>Start Date</span>
                    <div className="date-field">
                        <FaCalendarAlt />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                </label>

                <label>
                    <span>End Date</span>
                    <div className="date-field">
                        <FaCalendarAlt />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </label>

                {(search || startDate || endDate) && (
                    <button
                        className="announcement-clear-btn"
                        onClick={() => {
                            setSearch("");
                            setStartDate("");
                            setEndDate("");
                        }}
                    >
                        <FaTimes /> Clear
                    </button>
                )}
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
                                <span><FaThumbtack /> Pinned</span>
                            </div>
                            <AnnouncementCard
                                item={pinned}
                                featured
                                fileUrl={fileUrl(pinned)}
                                onOpen={openAnnouncement}
                                onPrint={printAnnouncement}
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
                                    onOpen={openAnnouncement}
                                    onPrint={printAnnouncement}
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
                        </div>
                        <div className="announcement-history">
                            {announcements.map(item => (
                                <button key={item.id} className="history-row" onClick={() => openAnnouncement(item)}>
                                    <span className="history-icon">
                                        {item.attachment_path ? <FaFilePdf /> : <FaBullhorn />}
                                    </span>
                                    <span className="history-main">
                                        <strong>{item.title}</strong>
                                        <small>
                                            {new Date(item.published_at || item.created_at).toLocaleString()}
                                        </small>
                                    </span>
                                    <span className={`read-state ${item.in_app_status === "read" ? "read" : ""}`}>
                                        {item.in_app_status === "read" ? "Read" : "Unread"}
                                    </span>
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
                    canDelete={canDelete}
                    onClose={() => setSelected(null)}
                    onPrint={() => printAnnouncement(selected)}
                    onDelete={() => deleteAnnouncement(selected.id)}
                />
            )}

            {showCreate && (
                <CreateAnnouncementModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setShowCreate(false);
                        load();
                    }}
                />
            )}
        </div>
    );
}

function AnnouncementCard({ item, featured, fileUrl, onOpen, onPrint }) {
    return (
        <article className={`announcement-card ${featured ? "featured" : ""} ${item.in_app_status !== "read" ? "unread" : ""}`}>
            <div className="announcement-card-preview">
                {fileUrl && String(item.attachment_original_name || "").toLowerCase().endsWith(".pdf") ? (
                    <iframe title={item.title} src={`${fileUrl}#toolbar=0&navpanes=0`} />
                ) : (
                    <div className="announcement-document">
                        {fileUrl ? <FaFilePdf /> : <FaBullhorn />}
                        <span>{item.attachment_original_name || "Announcement"}</span>
                    </div>
                )}
            </div>

            <div className="announcement-card-body">
                <div className="announcement-card-top">
                    {item.is_pinned === 1 && <span className="pinned-badge"><FaThumbtack /> Pinned</span>}
                    {item.in_app_status !== "read" && <span className="new-badge">New</span>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.content || "No description provided."}</p>
                <div className="announcement-meta">
                    <span>{new Date(item.published_at || item.created_at).toLocaleDateString()}</span>
                    <span>{item.created_by_name || "MIARCUS"}</span>
                </div>
                <div className="announcement-actions">
                    <button onClick={() => onOpen(item)}>View</button>
                    {fileUrl && (
                        <a href={fileUrl} target="_blank" rel="noreferrer">
                            <FaDownload /> Download
                        </a>
                    )}
                    <button onClick={() => onPrint(item)}><FaPrint /> Print</button>
                </div>
            </div>
        </article>
    );
}

function AnnouncementView({ item, fileUrl, canDelete, onClose, onPrint, onDelete }) {
    return (
        <div className="announcement-overlay" onMouseDown={onClose}>
            <div className="announcement-view-modal" onMouseDown={e => e.stopPropagation()}>
                <div className="announcement-view-header">
                    <div>
                        <span className="modal-eyebrow"><FaBullhorn /> Announcement</span>
                        <h2>{item.title}</h2>
                    </div>
                    <button onClick={onClose}><FaTimes /></button>
                </div>

                {fileUrl && String(item.attachment_original_name || "").toLowerCase().endsWith(".pdf") && (
                    <iframe className="announcement-full-pdf" title={item.title} src={fileUrl} />
                )}

                <div className="announcement-view-content">
                    <p>{item.content || "No description provided."}</p>
                    {item.attachment_original_name && (
                        <a className="attachment-chip" href={fileUrl} target="_blank" rel="noreferrer">
                            <FaPaperclip /> {item.attachment_original_name}
                        </a>
                    )}
                </div>

                <div className="announcement-view-footer">
                    <span>Published {new Date(item.published_at || item.created_at).toLocaleString()}</span>
                    <div>
                        {fileUrl && <a className="secondary-btn" href={fileUrl} target="_blank" rel="noreferrer"><FaDownload /> Download</a>}
                        <button className="secondary-btn" onClick={onPrint}><FaPrint /> Print</button>
                        {canDelete && <button className="danger-btn" onClick={onDelete}>Delete</button>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateAnnouncementModal({ onClose, onSuccess }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [audience, setAudience] = useState("everyone");
    const [specificUsers, setSpecificUsers] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [file, setFile] = useState(null);
    const [isPinned, setIsPinned] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (audience !== "specific") return;
        const timer = setTimeout(async () => {
            try {
                const data = await announcementService.getUsers(userSearch);
                setUsers(data.users || []);
            } catch (error) {
                console.error(error);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [audience, userSearch]);

    const toggleUser = user => {
        setSpecificUsers(prev =>
            prev.some(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );
    };

    const submit = async e => {
        e.preventDefault();
        if (!title.trim()) return alert("Title is required");
        if (audience === "specific" && !specificUsers.length) return alert("Select at least one user");

        const form = new FormData();
        form.append("title", title);
        form.append("content", content);
        form.append("audience", audience);
        form.append("specificUserIds", JSON.stringify(specificUsers.map(u => u.id)));
        form.append("isPinned", String(isPinned));
        if (file) form.append("attachment", file);

        try {
            setSaving(true);
            await announcementService.create(form);
            onSuccess();
        } catch (error) {
            alert(error.response?.data?.message || "Unable to publish announcement");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="announcement-overlay" onMouseDown={onClose}>
            <form className="announcement-create-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
                <div className="announcement-view-header">
                    <div>
                        <span className="modal-eyebrow"><FaBullhorn /> New Announcement</span>
                        <h2>Create Announcement</h2>
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
                        <span>Attachment</span>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
                            onChange={e => setFile(e.target.files?.[0] || null)}
                        />
                    </label>
                </div>

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
                    <span><FaThumbtack /> Pin this announcement</span>
                </label>

                <div className="create-footer">
                    <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="announcement-primary-btn" disabled={saving}>
                        {saving ? "Publishing..." : "Publish Announcement"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Announcements;

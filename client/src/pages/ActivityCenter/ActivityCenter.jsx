import PremiumLoader from "../../components/premium/PremiumLoader";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaSearch,
    FaSyncAlt,
    FaTrashAlt,
    FaFilter,
    FaHistory,
    FaCalendarDay,
    FaExclamationTriangle,
    FaFolderOpen,
    FaInbox,
    FaChevronLeft,
    FaChevronRight,
    FaUndo,
} from "react-icons/fa";

import ActionButtons from "../../components/common/ActionButtons";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import {
    getActivities,
    deleteActivity,
    deleteAllActivities,
} from "../../services/activityService";

import "../../styles/pages/ActivityCenter.css";
import { activeFilters, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../../utils/deleteScope";

const MODULES = [
    "Action Points", "Announcements", "Gallery", "Attendance", "Checklist Submission",
    "Checklist Reports", "Checklist Types", "Questions", "Departments", "Designations",
    "Reports To", "New Store Openings", "NSO Rules", "Expenses", "Petty Cash", "Billing",
    "Sales Team", "Listing Tracker", "Quiz", "Activity Center", "Users", "Stores",
];

const ACTIVITY_TYPES = [
    "User Activity", "Action Points Activity", "Announcements Activity", "Attendance Activity",
    "Checklist Submission Activity", "Expenses Activity", "Sales Team Activity",
];

const ACTIONS = ["Created", "Updated", "Deleted", "Disabled", "Enabled", "Approved", "Rejected", "Submitted", "Completed"];

const slug = (value) => String(value || "").toLowerCase().trim().replace(/\s+/g, "-");

const formatDateTime = (value) => {
    if (!value) return { date: "-", time: "" };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { date: "-", time: "" };
    return {
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
};

const initials = (name) =>
    String(name || "System")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");

function ActivityCenter() {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [moduleName, setModuleName] = useState("");
    const [activityType, setActivityType] = useState("");
    const [action, setAction] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [newStoreOpeningId, setNewStoreOpeningId] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState({ total: 0, today: 0, high_priority: 0, open: 0 });

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState(null);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const showToast = (message, tone = "success") => {
        setToast({ message, tone });
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => setToast(null), 3200);
    };

    const buildFilters = () => ({
        search,
        status,
        priority,
        module_name: moduleName,
        activity_type: activityType,
        action,
        date_from: dateFrom,
        date_to: dateTo,
        new_store_opening_id: newStoreOpeningId,
    });

    const loadActivities = async (overridePage = page, overrideLimit = limit, filters = buildFilters()) => {
        try {
            setLoading(true);
            const response = await getActivities({ ...filters, page: overridePage, limit: overrideLimit });
            const payload = response.data || {};
            const rows = (payload.data || []).filter(
                (item) => String(item?.module_name || "").trim().toLowerCase() !== "employee location"
            );

            const apiTotal = Number(payload.total);
            const safeTotal = Number.isFinite(apiTotal) && payload.total !== undefined
                ? apiTotal
                : (overridePage - 1) * overrideLimit + rows.length;

            // Sl. No. — comes from the server (restarts from 1 after Delete All).
            // Falls back to a local serial if an older API is still deployed.
            const numbered = rows.map((row, index) => ({
                ...row,
                sl_no: row.sl_no ?? Math.max(safeTotal - (overridePage - 1) * overrideLimit - index, 1),
            }));

            setActivities(numbered);
            setTotal(safeTotal);
            setSummary(payload.summary || { total: safeTotal, today: 0, high_priority: 0, open: 0 });
        } catch (error) {
            console.error("Activity Center Error:", error);
            showToast(error.response?.data?.message || "Failed to load activities.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActivities(page, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const handleSearch = () => {
        if (page !== 1) setPage(1);
        else loadActivities(1, limit);
    };

    const handleReset = () => {
        setSearch("");
        setStatus("");
        setPriority("");
        setModuleName("");
        setActivityType("");
        setAction("");
        setDateFrom("");
        setDateTo("");
        setNewStoreOpeningId("");
        if (page !== 1) setPage(1);
        else loadActivities(1, limit, {});
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await deleteActivity(deleteTarget.id);
            setDeleteTarget(null);
            showToast("Activity deleted successfully.");
            const nextPage = activities.length === 1 && page > 1 ? page - 1 : page;
            if (nextPage !== page) setPage(nextPage);
            else await loadActivities(page, limit);
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to delete activity.", "error");
        } finally {
            setDeleting(false);
        }
    };

    const confirmDeleteAll = async () => {
        const applied = activeFilters(buildFilters());
        const filtered = hasActiveFilters(applied);
        try {
            setDeleting(true);
            const response = await deleteAllActivities(filtered ? { ...applied, scope: "filtered" } : {});
            setShowDeleteAll(false);
            showToast(response.data?.message || "Activities deleted successfully.");
            if (page !== 1) setPage(1);
            else await loadActivities(1, limit);
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to delete activities.", "error");
        } finally {
            setDeleting(false);
        }
    };

    const isFiltered = hasActiveFilters({
        search, status, priority, moduleName, activityType, action, dateFrom, dateTo, newStoreOpeningId,
    });

    const onEnter = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    const stats = [
        { key: "total", label: "Total Activities", value: summary.total ?? total, hint: isFiltered ? "Matching filters" : "All recorded activity", icon: <FaHistory />, tone: "violet" },
        { key: "today", label: "Today", value: summary.today ?? 0, hint: "Logged today", icon: <FaCalendarDay />, tone: "blue" },
        { key: "open", label: "Open", value: summary.open ?? 0, hint: "Open / in progress", icon: <FaFolderOpen />, tone: "amber" },
        { key: "high", label: "High Priority", value: summary.high_priority ?? 0, hint: "High / critical", icon: <FaExclamationTriangle />, tone: "red" },
    ];

    return (
        <div className="ac-page">
            {/* ================= HERO ================= */}
            <section className="ac-hero">
                <div className="ac-hero-text">
                    <span className="ac-eyebrow">MIARCUS • AUDIT TRAIL</span>
                    <h1>Activity Center</h1>
                    <p>Complete system activity history across every module.</p>
                </div>
                <div className="ac-hero-actions">
                    <button type="button" className="ac-btn ac-btn-glass" onClick={() => loadActivities(page, limit)} disabled={loading}>
                        <FaSyncAlt className={loading ? "ac-spin" : ""} /> {loading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button type="button" className="ac-btn ac-btn-danger" onClick={() => setShowDeleteAll(true)} disabled={total === 0}>
                        <FaTrashAlt /> {deleteAllLabel(isFiltered)}
                    </button>
                </div>
            </section>

            {/* ================= STATS ================= */}
            <section className="ac-stats">
                {stats.map((stat) => (
                    <div key={stat.key} className={`ac-stat ac-tone-${stat.tone}`}>
                        <div className="ac-stat-icon">{stat.icon}</div>
                        <div>
                            <span className="ac-stat-label">{stat.label}</span>
                            <strong className="ac-stat-value">{Number(stat.value || 0).toLocaleString("en-IN")}</strong>
                            <small>{stat.hint}</small>
                        </div>
                    </div>
                ))}
            </section>

            {/* ================= FILTERS ================= */}
            <section className="ac-card ac-filters">
                <div className="ac-filters-head">
                    <h3><FaFilter /> Filters</h3>
                    {isFiltered && <span className="ac-filter-flag">Filters applied</span>}
                </div>

                <div className="ac-filter-grid">
                    <label className="ac-field ac-field-search">
                        <span>Search</span>
                        <div className="ac-input-icon">
                            <FaSearch />
                            <input type="text" placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onEnter} />
                        </div>
                    </label>
                    <label className="ac-field">
                        <span>Module</span>
                        <select value={moduleName} onChange={(e) => setModuleName(e.target.value)}>
                            <option value="">All Modules</option>
                            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Activity Type</span>
                        <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                            <option value="">All Activity Types</option>
                            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Action</span>
                        <select value={action} onChange={(e) => setAction(e.target.value)}>
                            <option value="">All Actions</option>
                            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Status</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Priority</span>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                            <option value="">All Priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>From Date</span>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </label>
                    <label className="ac-field">
                        <span>To Date</span>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </label>
                    <label className="ac-field">
                        <span>NSO Project ID</span>
                        <input type="number" min="1" placeholder="e.g. 12" value={newStoreOpeningId} onChange={(e) => setNewStoreOpeningId(e.target.value)} onKeyDown={onEnter} />
                    </label>
                    <div className="ac-filter-buttons">
                        <button type="button" className="ac-btn ac-btn-primary" onClick={handleSearch}><FaSearch /> Search</button>
                        <button type="button" className="ac-btn ac-btn-ghost" onClick={handleReset}><FaUndo /> Reset</button>
                    </div>
                </div>
            </section>

            {/* ================= TABLE ================= */}
            <section className="ac-card ac-table-card">
                <div className="ac-table-head">
                    <h3>Activity Log <span className="ac-count">{total.toLocaleString("en-IN")} records</span></h3>
                </div>

                {loading ? (
                    <div className="ac-state"><PremiumLoader compact title="Loading activities" /></div>
                ) : activities.length === 0 ? (
                    <div className="ac-state ac-empty">
                        <FaInbox />
                        <b>No activities found</b>
                        <small>{isFiltered ? "Try clearing the filters." : "New activity will appear here as it happens."}</small>
                    </div>
                ) : (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th className="ac-col-sl">Sl No</th>
                                    <th className="ac-col-activity">Activity</th>
                                    <th>Module</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Created By</th>
                                    <th>Created Date</th>
                                    <th className="ac-col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((activity) => {
                                    const when = formatDateTime(activity.created_at);
                                    return (
                                        <tr key={activity.id}>
                                            <td className="ac-col-sl">{activity.sl_no}</td>
                                            <td className="ac-col-activity">
                                                <div className="ac-title">{activity.title}</div>
                                                <small className="ac-desc">{activity.description || "Activity"}</small>
                                            </td>
                                            <td><span className="ac-pill ac-pill-module">{activity.module_name || "System"}</span></td>
                                            <td><span className={`ac-pill ac-status-${slug(activity.status)}`}>{activity.status || "-"}</span></td>
                                            <td><span className={`ac-priority ac-priority-${slug(activity.priority)}`}><i />{activity.priority || "-"}</span></td>
                                            <td>
                                                <div className="ac-user">
                                                    <span className="ac-avatar">{initials(activity.created_by_name)}</span>
                                                    <span>{activity.created_by_name || "System"}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="ac-date">
                                                    <b>{when.date}</b>
                                                    <small>{when.time}</small>
                                                </div>
                                            </td>
                                            <td className="ac-col-actions">
                                                <ActionButtons
                                                    showView
                                                    onView={() => navigate(`/activity-center/${activity.id}`, { state: { slNo: activity.sl_no } })}
                                                    showDelete
                                                    onDelete={() => setDeleteTarget(activity)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="ac-pagination">
                    <div className="ac-page-size">
                        Rows per page
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                    <span className="ac-range">{from}–{to} of {total.toLocaleString("en-IN")}</span>
                    <div className="ac-page-buttons">
                        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><FaChevronLeft /></button>
                        <b>Page {page} of {totalPages}</b>
                        <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} aria-label="Next page"><FaChevronRight /></button>
                    </div>
                </div>
            </section>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Delete Activity"
                message={deleteTarget ? `Delete activity Sl No ${deleteTarget.sl_no} — "${deleteTarget.title}"? This cannot be undone.` : ""}
                confirmText={deleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />

            <ConfirmDialog
                open={showDeleteAll}
                title={isFiltered ? "Delete Filtered Activities" : "Delete All Activities"}
                message={`${deleteAllMessage(isFiltered, total, "activities")} Sl No will restart from 1. This cannot be undone.`}
                confirmText={deleting ? "Deleting..." : isFiltered ? "Delete Filtered" : "Delete All"}
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmDeleteAll}
                onCancel={() => !deleting && setShowDeleteAll(false)}
            />

            {toast && <div className={`ac-toast ac-toast-${toast.tone}`}>{toast.message}</div>}
        </div>
    );
}

export default ActivityCenter;

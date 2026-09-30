import PremiumLoader from "../../components/premium/PremiumLoader";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    FaAngleDoubleLeft,
    FaAngleDoubleRight,
    FaUndo,
    FaTimes,
} from "react-icons/fa";

import ActionButtons from "../../components/common/ActionButtons";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import {
    getActivities,
    getActivityFilterOptions,
    deleteActivity,
    deleteAllActivities,
} from "../../services/activityService";

import "../../styles/pages/ActivityCenter.css";
import { activeFilters, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../../utils/deleteScope";

// ------------------------------------------------------
// Fallback option lists. The real lists are loaded from
// GET /api/activities/filters (distinct values stored in the
// database) and merged with these, so every option matches data.
// ------------------------------------------------------
const DEFAULT_MODULES = [
    "Action Points", "Announcements", "Gallery", "Attendance", "Checklist Submission",
    "Checklist Reports", "Checklist Types", "Questions", "Departments", "Designations",
    "Reports To", "New Store Openings", "NSO Rules", "Expenses", "Petty Cash", "Billing",
    "Sales Team", "Listing Tracker", "Quiz", "Activity Center", "Users", "Stores",
];
const DEFAULT_STATUSES = ["Open", "In Progress", "Completed", "Closed"];
const DEFAULT_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const ACTIONS = [
    "Created", "Updated", "Deleted", "Disabled", "Enabled", "Activated", "Deactivated",
    "Approved", "Rejected", "Submitted", "Completed", "Sent",
];

const EMPTY_FILTERS = {
    search: "",
    module_name: "",
    activity_type: "",
    action: "",
    status: "",
    priority: "",
    date_from: "",
    date_to: "",
    new_store_opening_id: "",
};

const FILTER_LABELS = {
    search: "Search",
    module_name: "Module",
    activity_type: "Type",
    action: "Action",
    status: "Status",
    priority: "Priority",
    date_from: "From",
    date_to: "To",
    new_store_opening_id: "NSO",
};

const PRIORITY_ORDER = ["low", "medium", "high", "critical"];

const mergeOptions = (fromDb = [], defaults = [], sorter) => {
    const seen = new Map();
    [...(fromDb || []), ...(defaults || [])].forEach((value) => {
        const text = String(value || "").trim();
        if (text && !seen.has(text.toLowerCase())) seen.set(text.toLowerCase(), text);
    });
    const list = Array.from(seen.values());
    return sorter ? list.sort(sorter) : list.sort((a, b) => a.localeCompare(b));
};

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

// 1 … 4 5 [6] 7 8 … 20
const pageWindow = (current, totalPages) => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, current, current - 1, current + 1]);
    if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
    if (current >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p));
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, i) => {
        if (i && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
        out.push(p);
    });
    return out;
};

function ActivityCenter() {
    const navigate = useNavigate();

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    // "draft" = what is typed / selected; "applied" = what the list uses.
    // Dropdowns & dates apply instantly, search applies after typing stops.
    const [draft, setDraft] = useState(EMPTY_FILTERS);
    const [applied, setApplied] = useState(EMPTY_FILTERS);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [serverPages, setServerPages] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [summary, setSummary] = useState({ total: 0, today: 0, high_priority: 0, open: 0 });
    const [options, setOptions] = useState({ modules: [], activity_types: [], statuses: [], priorities: [] });
    const [reloadKey, setReloadKey] = useState(0);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showDeleteAll, setShowDeleteAll] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState(null);

    const requestRef = useRef(0);
    const toastTimer = useRef(null);

    const showToast = useCallback((message, tone = "success") => {
        setToast({ message, tone });
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 3200);
    }, []);

    // ---------------- OPTIONS ----------------
    const loadOptions = useCallback(async () => {
        try {
            const response = await getActivityFilterOptions();
            setOptions(response.data?.data || {});
        } catch (error) {
            // Older API without /filters – fall back to the defaults.
            console.warn("Activity filter options unavailable:", error?.message);
        }
    }, []);

    useEffect(() => {
        loadOptions();
    }, [loadOptions]);

    const moduleOptions = useMemo(
        () => mergeOptions(options.modules, DEFAULT_MODULES).filter((m) => m.toLowerCase() !== "employee location"),
        [options.modules]
    );
    const typeOptions = useMemo(() => mergeOptions(options.activity_types, []), [options.activity_types]);
    const statusOptions = useMemo(() => mergeOptions(options.statuses, DEFAULT_STATUSES), [options.statuses]);
    const priorityOptions = useMemo(
        () => mergeOptions(options.priorities, DEFAULT_PRIORITIES, (a, b) => {
            const ai = PRIORITY_ORDER.indexOf(a.toLowerCase());
            const bi = PRIORITY_ORDER.indexOf(b.toLowerCase());
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }),
        [options.priorities]
    );

    // ---------------- LOAD LIST ----------------
    useEffect(() => {
        const requestId = ++requestRef.current;

        const run = async () => {
            try {
                setLoading(true);
                const response = await getActivities({ ...applied, page, limit });
                if (requestId !== requestRef.current) return; // a newer request won

                const payload = response.data || {};
                const rows = (payload.data || []).filter(
                    (item) => String(item?.module_name || "").trim().toLowerCase() !== "employee location"
                );

                const apiTotal = Number(payload.total);
                const knownTotal = Number.isFinite(apiTotal) && payload.total !== undefined;
                const safeTotal = knownTotal ? apiTotal : (page - 1) * limit + rows.length;

                // If the requested page is now past the end (e.g. after a
                // delete or a narrower filter), jump back to the last page.
                if (knownTotal && rows.length === 0 && page > 1 && safeTotal > 0) {
                    setPage(Math.max(Math.ceil(safeTotal / limit), 1));
                    return;
                }

                setActivities(rows.map((row, index) => ({
                    ...row,
                    sl_no: row.sl_no ?? Math.max(safeTotal - (page - 1) * limit - index, 1),
                })));
                setTotal(safeTotal);
                setServerPages(Number(payload.total_pages) || Math.max(Math.ceil(safeTotal / limit), 1));
                setHasMore(
                    payload.has_more !== undefined
                        ? Boolean(payload.has_more)
                        : !knownTotal && rows.length === limit
                );
                setSummary(payload.summary || { total: safeTotal, today: 0, high_priority: 0, open: 0 });
            } catch (error) {
                if (requestId !== requestRef.current) return;
                console.error("Activity Center Error:", error);
                showToast(error.response?.data?.message || "Failed to load activities.", "error");
            } finally {
                if (requestId === requestRef.current) setLoading(false);
            }
        };

        run();
    }, [applied, page, limit, reloadKey, showToast]);

    // Search applies automatically 450 ms after typing stops.
    useEffect(() => {
        if (draft.search === applied.search) return undefined;
        const timer = window.setTimeout(() => {
            setApplied((prev) => ({ ...prev, search: draft.search }));
            setPage(1);
        }, 450);
        return () => window.clearTimeout(timer);
    }, [draft.search, applied.search]);

    const totalPages = Math.max(serverPages, Math.ceil(total / limit) || 1, hasMore ? page + 1 : 1);

    // ---------------- FILTER HANDLERS ----------------
    const setField = (key, value, { instant = true } = {}) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
        if (instant) {
            setApplied((prev) => ({ ...prev, [key]: value }));
            setPage(1);
        }
    };

    const applyNow = () => {
        setApplied({ ...draft });
        setPage(1);
        setReloadKey((k) => k + 1);
    };

    const clearOne = (key) => {
        setDraft((prev) => ({ ...prev, [key]: "" }));
        setApplied((prev) => ({ ...prev, [key]: "" }));
        setPage(1);
    };

    const handleReset = () => {
        setDraft(EMPTY_FILTERS);
        setApplied(EMPTY_FILTERS);
        setPage(1);
        setReloadKey((k) => k + 1);
    };

    const refresh = () => {
        setReloadKey((k) => k + 1);
        loadOptions();
    };

    const goTo = (target) => {
        const next = Math.min(Math.max(1, Number(target) || 1), totalPages);
        if (next !== page) setPage(next);
    };

    const onEnter = (e) => {
        if (e.key === "Enter") applyNow();
    };

    // ---------------- DELETE ----------------
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await deleteActivity(deleteTarget.id);
            setDeleteTarget(null);
            showToast("Activity deleted successfully.");
            if (activities.length === 1 && page > 1) setPage(page - 1);
            else setReloadKey((k) => k + 1);
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to delete activity.", "error");
        } finally {
            setDeleting(false);
        }
    };

    const appliedActive = activeFilters(applied);
    const isFiltered = hasActiveFilters(appliedActive);

    const confirmDeleteAll = async () => {
        try {
            setDeleting(true);
            const response = await deleteAllActivities(isFiltered ? { ...appliedActive, scope: "filtered" } : {});
            setShowDeleteAll(false);
            showToast(response.data?.message || "Activities deleted successfully.");
            setPage(1);
            setReloadKey((k) => k + 1);
            loadOptions();
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to delete activities.", "error");
        } finally {
            setDeleting(false);
        }
    };

    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min((page - 1) * limit + activities.length, Math.max(total, (page - 1) * limit + activities.length));

    const stats = [
        { key: "total", label: "Total Activities", value: summary.total ?? total, hint: isFiltered ? "Matching filters" : "All recorded activity", icon: <FaHistory />, tone: "violet" },
        { key: "today", label: "Today", value: summary.today ?? 0, hint: "Logged today", icon: <FaCalendarDay />, tone: "blue" },
        { key: "open", label: "Open", value: summary.open ?? 0, hint: "Open / in progress", icon: <FaFolderOpen />, tone: "amber", filter: ["status", "Open"] },
        { key: "high", label: "High Priority", value: summary.high_priority ?? 0, hint: "High / critical", icon: <FaExclamationTriangle />, tone: "red", filter: ["priority", "High"] },
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
                    <button type="button" className="ac-btn ac-btn-glass" onClick={refresh} disabled={loading}>
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
                    <div
                        key={stat.key}
                        className={`ac-stat ac-tone-${stat.tone} ${stat.filter ? "ac-stat-click" : ""}`}
                        role={stat.filter ? "button" : undefined}
                        tabIndex={stat.filter ? 0 : undefined}
                        title={stat.filter ? `Show only ${stat.filter[1]} ${stat.filter[0]}` : undefined}
                        onClick={stat.filter ? () => setField(stat.filter[0], stat.filter[1]) : undefined}
                        onKeyDown={stat.filter ? (e) => e.key === "Enter" && setField(stat.filter[0], stat.filter[1]) : undefined}
                    >
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
                            <input
                                type="text"
                                placeholder="Title, description, user or ID..."
                                value={draft.search}
                                onChange={(e) => setField("search", e.target.value, { instant: false })}
                                onKeyDown={onEnter}
                            />
                        </div>
                    </label>
                    <label className="ac-field">
                        <span>Module</span>
                        <select value={draft.module_name} onChange={(e) => setField("module_name", e.target.value)}>
                            <option value="">All Modules</option>
                            {moduleOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Activity Type</span>
                        <select value={draft.activity_type} onChange={(e) => setField("activity_type", e.target.value)}>
                            <option value="">All Activity Types</option>
                            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Action</span>
                        <select value={draft.action} onChange={(e) => setField("action", e.target.value)}>
                            <option value="">All Actions</option>
                            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Status</span>
                        <select value={draft.status} onChange={(e) => setField("status", e.target.value)}>
                            <option value="">All Status</option>
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>Priority</span>
                        <select value={draft.priority} onChange={(e) => setField("priority", e.target.value)}>
                            <option value="">All Priority</option>
                            {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </label>
                    <label className="ac-field">
                        <span>From Date</span>
                        <input
                            type="date"
                            value={draft.date_from}
                            max={draft.date_to || undefined}
                            onChange={(e) => setField("date_from", e.target.value)}
                        />
                    </label>
                    <label className="ac-field">
                        <span>To Date</span>
                        <input
                            type="date"
                            value={draft.date_to}
                            min={draft.date_from || undefined}
                            onChange={(e) => setField("date_to", e.target.value)}
                        />
                    </label>
                    <label className="ac-field">
                        <span>NSO Project ID</span>
                        <input
                            type="number"
                            min="1"
                            placeholder="e.g. 12"
                            value={draft.new_store_opening_id}
                            onChange={(e) => setField("new_store_opening_id", e.target.value, { instant: false })}
                            onBlur={() => draft.new_store_opening_id !== applied.new_store_opening_id && applyNow()}
                            onKeyDown={onEnter}
                        />
                    </label>
                    <div className="ac-filter-buttons">
                        <button type="button" className="ac-btn ac-btn-primary" onClick={applyNow}><FaSearch /> Search</button>
                        <button type="button" className="ac-btn ac-btn-ghost" onClick={handleReset} disabled={!isFiltered && !draft.search}><FaUndo /> Reset</button>
                    </div>
                </div>

                {isFiltered && (
                    <div className="ac-chips">
                        {Object.entries(appliedActive).map(([key, value]) => (
                            <button type="button" key={key} className="ac-chip" onClick={() => clearOne(key)} title="Remove filter">
                                <span>{FILTER_LABELS[key] || key}:</span> <b>{String(value)}</b> <FaTimes />
                            </button>
                        ))}
                        <button type="button" className="ac-chip ac-chip-clear" onClick={handleReset}>Clear all</button>
                    </div>
                )}
            </section>

            {/* ================= TABLE ================= */}
            <section className="ac-card ac-table-card">
                <div className="ac-table-head">
                    <h3>Activity Log <span className="ac-count">{total.toLocaleString("en-IN")} records</span></h3>
                </div>

                {loading && activities.length === 0 ? (
                    <div className="ac-state"><PremiumLoader compact title="Loading activities" /></div>
                ) : activities.length === 0 ? (
                    <div className="ac-state ac-empty">
                        <FaInbox />
                        <b>No activities found</b>
                        <small>{isFiltered ? "Try clearing the filters." : "New activity will appear here as it happens."}</small>
                    </div>
                ) : (
                    <div className={`ac-table-wrap ${loading ? "ac-is-loading" : ""}`}>
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
                                            <td>
                                                <button type="button" className="ac-pill ac-pill-module ac-pill-btn" onClick={() => setField("module_name", activity.module_name || "")} title="Filter by this module">
                                                    {activity.module_name || "System"}
                                                </button>
                                            </td>
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
                        <button type="button" onClick={() => goTo(1)} disabled={page <= 1} aria-label="First page" title="First page"><FaAngleDoubleLeft /></button>
                        <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page" title="Previous page"><FaChevronLeft /></button>
                        <div className="ac-page-numbers">
                            {pageWindow(page, totalPages).map((item) =>
                                typeof item === "string" ? (
                                    <span key={item} className="ac-page-gap">…</span>
                                ) : (
                                    <button
                                        type="button"
                                        key={item}
                                        className={`ac-page-num ${item === page ? "active" : ""}`}
                                        onClick={() => goTo(item)}
                                        aria-current={item === page ? "page" : undefined}
                                    >
                                        {item}
                                    </button>
                                )
                            )}
                        </div>
                        <b className="ac-page-label">Page {page} of {totalPages}</b>
                        <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages} aria-label="Next page" title="Next page"><FaChevronRight /></button>
                        <button type="button" onClick={() => goTo(totalPages)} disabled={page >= totalPages} aria-label="Last page" title="Last page"><FaAngleDoubleRight /></button>
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

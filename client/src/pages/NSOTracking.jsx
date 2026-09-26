import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaSearch,
    FaSyncAlt,
    FaEye,
    FaEdit,
    FaTrash,
    FaStore,
    FaCheck,
    FaClock,
    FaFolder,
    FaExclamationTriangle,
    FaChevronLeft,
    FaChevronRight,
    FaInfoCircle,
} from "react-icons/fa";

import {
    getNewStoreOpenings,
    deleteNewStoreOpening,
    deleteAllNewStoreOpenings,
} from "../services/newStoreOpeningService";
import PremiumLoader from "../components/premium/PremiumLoader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ExportButton from "../components/common/ExportButton";
import { exportTableData } from "../utils/exportUtils.js";
import { collectIds, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";
import {
    REGIONS,
    storeCode,
    storeName,
    regionFor,
    plannedDate,
    openingDate,
    trackingStatus,
    progressFor,
    progressTone,
    formatDate,
    STATUS_TONE,
    nsoPermissions,
    unwrapList,
} from "../utils/nsoTracking";

import heroArt from "../assets/premium/nso-hero.png";
import bulbArt from "../assets/premium/nso-bulb.png";
import "../styles/pages/NSOTrackingPremium.css";

// ======================================================
// NSO TRACKING (premium)
// Every New Store Opening project with its tracking status,
// region, planned / opening date and milestone progress.
// View → /nso-tracking/:id    Edit → /nso-tracking/:id/edit
// ======================================================

const STATUS_FILTERS = ["All Status", "Completed", "In Progress", "Planning", "Delayed", "On Hold", "Cancelled"];

function Ring({ value, tone }) {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
    return (
        <div className={`nst-ring nst-ring-${tone}`}>
            <svg viewBox="0 0 56 56" aria-hidden="true">
                <circle cx="28" cy="28" r={radius} className="nst-ring-track" />
                <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    className="nst-ring-value"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <b>{Math.round(value)}%</b>
        </div>
    );
}

export default function NSOTracking() {
    const navigate = useNavigate();
    const permissions = useMemo(nsoPermissions, []);

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All Status");
    const [region, setRegion] = useState("All Regions");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState(new Set());

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [bulkDelete, setBulkDelete] = useState(null); // "selected" | "all"
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const response = await getNewStoreOpenings({ page: 1, limit: 100000 });
            setProjects(unwrapList(response));
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load NSO Tracking.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (permissions.canView) load();
        else setLoading(false);
    }, [load, permissions.canView]);

    const rows = useMemo(
        () =>
            projects.map((project) => {
                const state = trackingStatus(project);
                const progress = progressFor(project);
                return {
                    project,
                    id: Number(project.id),
                    code: storeCode(project),
                    name: storeName(project),
                    city: project.city || "-",
                    region: regionFor(project),
                    planned: plannedDate(project),
                    opening: openingDate(project),
                    status: state,
                    progress,
                };
            }),
        [projects]
    );

    const stats = useMemo(() => {
        const count = (name) => rows.filter((row) => row.status === name).length;
        const total = rows.length || 0;
        const pct = (value) => (total ? (value / total) * 100 : 0);
        const completed = count("Completed");
        const inProgress = count("In Progress");
        const planning = count("Planning");
        const delayed = count("Delayed");
        return {
            total,
            completed,
            inProgress,
            planning,
            delayed,
            completedPct: pct(completed),
            inProgressPct: pct(inProgress),
            planningPct: pct(planning),
            delayedPct: pct(delayed),
        };
    }, [rows]);

    const filters = { search, status, region, fromDate, toDate };
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (q && ![row.code, row.name, row.city, row.region, row.project.broker_name, row.project.asm_assigned, row.project.operation_head_assigned]
                .some((value) => String(value || "").toLowerCase().includes(q))) return false;
            if (status !== "All Status" && row.status !== status) return false;
            if (region !== "All Regions" && row.region !== region) return false;
            if (fromDate && (!row.planned || row.planned < fromDate)) return false;
            if (toDate && (!row.planned || row.planned > toDate)) return false;
            return true;
        });
    }, [rows, search, status, region, fromDate, toDate]);

    useEffect(() => {
        setPage(1);
    }, [search, status, region, fromDate, toDate, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const isFiltered = hasActiveFilters(filters);
    const allOnPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.id));

    const toggleRow = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const togglePage = () =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (allOnPageSelected) pageRows.forEach((row) => next.delete(row.id));
            else pageRows.forEach((row) => next.add(row.id));
            return next;
        });

    const clearFilters = () => {
        setSearch("");
        setStatus("All Status");
        setRegion("All Regions");
        setFromDate("");
        setToDate("");
    };

    const confirmSingleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteNewStoreOpening(deleteTarget.id);
            setDeleteTarget(null);
            setSelected((prev) => {
                const next = new Set(prev);
                next.delete(deleteTarget.id);
                return next;
            });
            await load({ silent: true });
        } catch (err) {
            alert(err.response?.data?.message || "Unable to delete the project.");
        } finally {
            setDeleting(false);
        }
    };

    const confirmBulkDelete = async () => {
        setDeleting(true);
        try {
            let ids;
            if (bulkDelete === "selected") ids = [...selected];
            else if (isFiltered) ids = collectIds(filtered.map((row) => row.project));
            const response = await deleteAllNewStoreOpenings(ids);
            alert(response?.data?.message || "Projects deleted successfully.");
            setSelected(new Set());
            setBulkDelete(null);
            await load({ silent: true });
        } catch (err) {
            alert(err.response?.data?.message || "Unable to delete projects.");
        } finally {
            setDeleting(false);
        }
    };

    const handleExport = async (format = "csv") => {
        if (!filtered.length) {
            alert("No NSO projects to export.");
            return;
        }
        await exportTableData({
            headers: ["Store Code", "Store Name", "City", "Region", "Planned Date", "Opening Date", "Status", "Progress %"],
            rows: filtered.map((row) => [
                row.code,
                row.name,
                row.city,
                row.region,
                formatDate(row.planned),
                formatDate(row.opening),
                row.status,
                row.progress,
            ]),
            filename: `nso-tracking-${new Date().toISOString().slice(0, 10)}`,
            format,
            title: "NSO Tracking",
        });
    };

    if (!permissions.canView) {
        return (
            <div className="nst-page">
                <div className="nst-card nst-empty">
                    <FaInfoCircle />
                    <b>Access denied</b>
                    <small>You do not have permission to view NSO Tracking.</small>
                </div>
            </div>
        );
    }

    const kpis = [
        { key: "total", label: "Total NSO Projects", value: stats.total, tone: "violet", icon: FaStore, chart: true },
        { key: "completed", label: "Completed", value: stats.completed, tone: "green", icon: FaCheck, pct: stats.completedPct },
        { key: "progress", label: "In Progress", value: stats.inProgress, tone: "amber", icon: FaClock, pct: stats.inProgressPct },
        { key: "planning", label: "Planning", value: stats.planning, tone: "blue", icon: FaFolder, pct: stats.planningPct },
        { key: "delayed", label: "Delayed", value: stats.delayed, tone: "red", icon: FaExclamationTriangle, pct: stats.delayedPct },
    ];

    return (
        <div className="nst-page">
            {/* ================= HERO ================= */}
            <section className="nst-hero-row">
                <div className="nst-hero">
                    <div className="nst-hero-text">
                        <span className="nst-eyebrow">NSO TRACKING MODULE</span>
                        <h1>NSO Tracking</h1>
                        <p>
                            Track and manage New Store Opening progress across all locations.
                            <br />
                            Monitor status, timelines, approvals and documents in one place.
                        </p>
                    </div>
                    <img className="nst-hero-art" src={heroArt} alt="" draggable="false" />
                </div>
                <div className="nst-quote">
                    <img src={bulbArt} alt="" draggable="false" />
                    <p>“Every new store is a new opportunity for growth”</p>
                </div>
            </section>

            {/* ================= KPI ================= */}
            <section className="nst-kpis">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={kpi.key} className={`nst-kpi nst-tone-${kpi.tone}`}>
                            <span className="nst-kpi-icon"><Icon /></span>
                            <div className="nst-kpi-text">
                                <small>{kpi.label} <i /></small>
                                <b>{loading ? "–" : kpi.value}</b>
                            </div>
                            {kpi.chart ? (
                                <span className="nst-kpi-bars" aria-hidden="true"><i /><i /><i /><i /></span>
                            ) : (
                                <Ring value={loading ? 0 : kpi.pct} tone={kpi.tone} />
                            )}
                        </div>
                    );
                })}
            </section>

            {/* ================= FILTERS ================= */}
            <section className="nst-filters">
                <label className="nst-field nst-field-search">
                    <span>Search</span>
                    <div className="nst-input-icon">
                        <FaSearch />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by store, location, city..." />
                    </div>
                </label>
                <label className="nst-field">
                    <span>Status</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        {STATUS_FILTERS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                </label>
                <label className="nst-field">
                    <span>Region</span>
                    <select value={region} onChange={(e) => setRegion(e.target.value)}>
                        <option>All Regions</option>
                        {REGIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                </label>
                <label className="nst-field">
                    <span>From Date</span>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </label>
                <label className="nst-field">
                    <span>To Date</span>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </label>
                <div className="nst-filter-actions">
                    <button type="button" className="nst-btn nst-btn-primary" onClick={() => load({ silent: true })} disabled={refreshing}>
                        <FaSyncAlt className={refreshing ? "nst-spin" : ""} /> Refresh
                    </button>
                    {isFiltered && (
                        <button type="button" className="nst-btn nst-btn-ghost" onClick={clearFilters}>Clear</button>
                    )}
                </div>
            </section>

            {error && <div className="nst-alert">{error}</div>}

            {/* ================= TABLE ================= */}
            <section className="nst-card">
                <div className="nst-table-head">
                    <div>
                        <h2>NSO Projects</h2>
                        <span className="nst-count">{filtered.length} project{filtered.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="nst-table-actions">
                        <ExportButton onExport={handleExport} />
                        {permissions.canDelete && selected.size > 0 && (
                            <button type="button" className="nst-btn nst-btn-danger-soft" onClick={() => setBulkDelete("selected")}>
                                <FaTrash /> Delete Selected ({selected.size})
                            </button>
                        )}
                        {permissions.canDelete && (
                            <button
                                type="button"
                                className="nst-btn nst-btn-danger"
                                onClick={() => setBulkDelete("all")}
                                disabled={!filtered.length}
                            >
                                <FaTrash /> {deleteAllLabel(isFiltered, filtered.length)}
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <PremiumLoader compact title="Loading NSO Tracking" />
                ) : filtered.length === 0 ? (
                    <div className="nst-empty">
                        <FaStore />
                        <b>No NSO projects found</b>
                        <small>{isFiltered ? "Try clearing the filters." : "New Store Opening projects will appear here."}</small>
                    </div>
                ) : (
                    <>
                        <div className="nst-table-wrap">
                            <table className="nst-table">
                                <thead>
                                    <tr>
                                        <th className="nst-check-col">
                                            <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} aria-label="Select page" />
                                        </th>
                                        <th>#</th>
                                        <th>Store Code</th>
                                        <th>Store Name</th>
                                        <th>City</th>
                                        <th>Region</th>
                                        <th>Planned Date</th>
                                        <th>Opening Date</th>
                                        <th>Status</th>
                                        <th>Progress</th>
                                        <th className="nst-actions-col">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((row, index) => (
                                        <tr key={row.id} className={selected.has(row.id) ? "is-selected" : ""}>
                                            <td className="nst-check-col">
                                                <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} aria-label={`Select ${row.name}`} />
                                            </td>
                                            <td>{(safePage - 1) * pageSize + index + 1}</td>
                                            <td className="nst-code">{row.code}</td>
                                            <td className="nst-name">{row.name}</td>
                                            <td>{row.city}</td>
                                            <td>{row.region}</td>
                                            <td>{formatDate(row.planned)}</td>
                                            <td>{formatDate(row.opening)}</td>
                                            <td>
                                                <span className={`nst-badge nst-tone-${STATUS_TONE[row.status] || "gray"}`}>{row.status}</span>
                                            </td>
                                            <td>
                                                <div className="nst-progress">
                                                    <span>{row.progress}%</span>
                                                    <div className={`nst-progress-bar nst-bar-${progressTone(row.progress, row.status)}`}>
                                                        <i style={{ width: `${row.progress}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="nst-actions-col">
                                                <div className="nst-actions">
                                                    <button type="button" className="nst-act nst-act-view" onClick={() => navigate(`/nso-tracking/${row.id}`)}>
                                                        <FaEye /> View
                                                    </button>
                                                    {permissions.canEdit && (
                                                        <button type="button" className="nst-act nst-act-edit" onClick={() => navigate(`/nso-tracking/${row.id}/edit`)}>
                                                            <FaEdit /> Edit
                                                        </button>
                                                    )}
                                                    {permissions.canDelete && (
                                                        <button type="button" className="nst-act nst-act-delete" onClick={() => setDeleteTarget(row)} aria-label={`Delete ${row.name}`}>
                                                            <FaTrash />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="nst-pagination">
                            <div className="nst-page-size">
                                Rows per page
                                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                                    {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                                </select>
                            </div>
                            <span>
                                {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                            </span>
                            <div className="nst-page-buttons">
                                <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} aria-label="Previous page"><FaChevronLeft /></button>
                                <b>{safePage} / {totalPages}</b>
                                <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} aria-label="Next page"><FaChevronRight /></button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Delete NSO Project"
                message={deleteTarget ? `Delete ${deleteTarget.code} - ${deleteTarget.name}? This permanently removes the New Store Opening project.` : ""}
                confirmText={deleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmSingleDelete}
                onCancel={() => !deleting && setDeleteTarget(null)}
            />

            <ConfirmDialog
                open={Boolean(bulkDelete)}
                title={bulkDelete === "selected" ? "Delete Selected Projects" : isFiltered ? "Delete Filtered Projects" : "Delete All Projects"}
                message={bulkDelete === "selected"
                    ? `Delete the ${selected.size} selected New Store Opening project(s)? This cannot be undone.`
                    : `${deleteAllMessage(isFiltered, filtered.length, "NSO projects")} This cannot be undone.`}
                confirmText={deleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={confirmBulkDelete}
                onCancel={() => !deleting && setBulkDelete(null)}
            />
        </div>
    );
}

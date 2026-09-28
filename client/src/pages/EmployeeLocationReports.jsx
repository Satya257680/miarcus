import PremiumLoader from "../components/premium/PremiumLoader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../axiosConfig.js";
import {
    FaMapMarkedAlt,
    FaMapMarkerAlt,
    FaStore,
    FaUsers,
    FaCrosshairs,
    FaClock,
    FaSearch,
    FaTrash,
    FaEdit,
    FaExternalLinkAlt,
    FaChevronLeft,
    FaChevronRight,
    FaSyncAlt,
    FaTimes,
    FaArrowLeft,
    FaCalendarAlt,
    FaSave,
    FaExclamationCircle,
    FaCheckCircle,
    FaBroadcastTower
} from "react-icons/fa";

import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";
import ExportButton from "../components/common/ExportButton";
import ProfessionalModal from "../components/common/ProfessionalModal";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import { exportTableData } from "../utils/exportUtils.js";
import { initials, avatarTone, formatCount } from "../utils/premiumFormat";

import "../styles/premium/PagePremium.css";
import "../styles/premium/AdminPagesPremium.css";
import "../styles/premium/ModulesPremium.css";

// ======================================================
// EMPLOYEE LOCATION – STORE REPORTS
// Day / week / month / year reports per store, with the
// exact latitude / longitude of every point captured to
// the second. Admins can edit, delete, bulk delete and
// export (CSV / Excel / PDF).
// ======================================================

const PERIODS = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
    { id: "custom", label: "Custom" },
    { id: "all", label: "All time" }
];

const GRANULARITY = [
    { id: "second", label: "Every point (to the second)" },
    { id: "minute", label: "One point per minute" },
    { id: "hour", label: "One point per hour" }
];

const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayYmd = () => toYmd(new Date());

const parseYmd = (value) => {
    const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
};

const shiftAnchor = (ymd, period, step) => {
    const d = parseYmd(ymd);
    if (period === "week") d.setDate(d.getDate() + 7 * step);
    else if (period === "month") d.setMonth(d.getMonth() + step);
    else if (period === "year") d.setFullYear(d.getFullYear() + step);
    else d.setDate(d.getDate() + step);
    return toYmd(d);
};

const splitStamp = (value) => {
    const text = String(value || "");
    return { date: text.slice(0, 10), time: text.slice(11, 19) };
};

const fmtDate = (ymd) => {
    const d = parseYmd(ymd);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const coord = (value) => (value === null || value === undefined || value === "" ? "—" : Number(value).toFixed(6));
const mapsUrl = (row) => `https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`;

const osmEmbed = (row) => {
    if (!row) return "";
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    const d = 0.006;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
};

const EMPTY_FILTERS = { search: "", storeId: "", employeeId: "", source: "", granularity: "second" };

export default function EmployeeLocationReports() {
    const [period, setPeriod] = useState("day");
    const [anchor, setAnchor] = useState(todayYmd());
    const [customFrom, setCustomFrom] = useState(todayYmd());
    const [customTo, setCustomTo] = useState(todayYmd());
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [searchInput, setSearchInput] = useState("");

    const [options, setOptions] = useState({ stores: [], employees: [], sources: [] });
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [storeSummary, setStoreSummary] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [live, setLive] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [selected, setSelected] = useState([]);
    const [focus, setFocus] = useState(null);
    const [editing, setEditing] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [confirm, setConfirm] = useState(null); // { type: "one" | "selected" | "all", row? }
    const [deleting, setDeleting] = useState(false);

    // ---------- query ----------
    const query = useMemo(() => ({
        period,
        date: anchor,
        from: customFrom,
        to: customTo,
        search: filters.search,
        storeId: filters.storeId,
        employeeId: filters.employeeId,
        source: filters.source,
        granularity: filters.granularity
    }), [period, anchor, customFrom, customTo, filters]);

    const filtersActive =
        period !== "all" ||
        Boolean(filters.search || filters.storeId || filters.employeeId || filters.source) ||
        filters.granularity !== "second";

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        setError("");
        try {
            const { data } = await axios.get("/api/location/reports", { params: { ...query, page, limit } });
            setRows(data?.data || []);
            setSummary(data?.summary || {});
            setStoreSummary(data?.storeSummary || []);
            setPagination(data?.pagination || { page, limit, total: 0, totalPages: 1 });
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load location report.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [query, page, limit]);

    useEffect(() => {
        axios.get("/api/location/reports/options")
            .then(({ data }) => setOptions({ stores: [], employees: [], sources: [], ...(data?.data || {}) }))
            .catch(() => {});
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Live mode refreshes quietly every 30 seconds.
    useEffect(() => {
        if (!live) return undefined;
        const timer = setInterval(() => load({ silent: true }), 30000);
        return () => clearInterval(timer);
    }, [live, load]);

    // Debounced search box.
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
            setPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const setFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
        setSelected([]);
    };

    const clearFilters = () => {
        setFilters(EMPTY_FILTERS);
        setSearchInput("");
        setPeriod("day");
        setAnchor(todayYmd());
        setCustomFrom(todayYmd());
        setCustomTo(todayYmd());
        setPage(1);
        setSelected([]);
    };

    const choosePeriod = (id) => {
        setPeriod(id);
        setPage(1);
        setSelected([]);
    };

    const rangeLabel = summary?.range?.label || (period === "all" ? "All time" : fmtDate(anchor));

    // ---------- selection ----------
    const pageIds = rows.map((row) => row.id);
    const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const toggleAll = () =>
        setSelected((prev) => (allOnPage ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));
    const toggleOne = (id) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    // ---------- export ----------
    const handleExport = async (format) => {
        setExporting(true);
        try {
            const { data } = await axios.get("/api/location/reports", { params: { ...query, all: 1 } });
            const list = data?.data || [];
            if (!list.length) {
                setError("There are no location points to export for these filters.");
                return;
            }
            await exportTableData({
                headers: ["Date", "Time", "Employee", "Employee ID", "Department", "Store(s)", "Latitude", "Longitude", "Accuracy (m)", "Source", "Google Maps"],
                rows: list.map((row) => {
                    const { date, time } = splitStamp(row.captured_at);
                    return [
                        date,
                        time,
                        row.name || "",
                        row.employee_code || "",
                        row.department || "",
                        row.store_names || "",
                        coord(row.latitude),
                        coord(row.longitude),
                        row.accuracy ?? "",
                        row.source || "",
                        mapsUrl(row)
                    ];
                }),
                filename: `MIARCUS_Location_Report_${period}_${anchor}`,
                format,
                title: `Employee Location Report — ${rangeLabel}`,
                sheetName: "Location Report"
            });
        } catch (err) {
            setError(err.response?.data?.message || "Export failed.");
        } finally {
            setExporting(false);
        }
    };

    // ---------- delete ----------
    const runDelete = async () => {
        if (!confirm) return;
        setDeleting(true);
        setError("");
        try {
            let message = "";
            if (confirm.type === "one") {
                const { data } = await axios.delete(`/api/location/reports/${confirm.row.id}`);
                message = data?.message;
            } else if (confirm.type === "selected") {
                const { data } = await axios.post("/api/location/reports/delete-all", { ids: selected });
                message = data?.message;
            } else {
                const { data } = await axios.post(
                    "/api/location/reports/delete-all",
                    filtersActive ? { scope: "filtered", filters: query } : { scope: "all" }
                );
                message = data?.message;
            }
            setNotice(message || "Deleted.");
            setSelected([]);
            if (focus && (confirm.type !== "one" || confirm.row.id === focus.id)) setFocus(null);
            setConfirm(null);
            setPage(1);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Delete failed.");
        } finally {
            setDeleting(false);
        }
    };

    // ---------- edit ----------
    const openEdit = (row) =>
        setEditing({
            id: row.id,
            name: row.name,
            latitude: row.latitude,
            longitude: row.longitude,
            accuracy: row.accuracy ?? "",
            source: row.source || "website",
            captured_at: String(row.captured_at || "").replace(" ", "T").slice(0, 19)
        });

    const saveEdit = async (event) => {
        event?.preventDefault?.();
        if (!editing) return;
        setSavingEdit(true);
        setError("");
        try {
            const { data } = await axios.put(`/api/location/reports/${editing.id}`, editing);
            setNotice(data?.message || "Location record updated.");
            setEditing(null);
            await load({ silent: true });
        } catch (err) {
            setError(err.response?.data?.message || "Unable to update the record.");
        } finally {
            setSavingEdit(false);
        }
    };

    useEffect(() => {
        if (!notice) return undefined;
        const t = setTimeout(() => setNotice(""), 4000);
        return () => clearTimeout(t);
    }, [notice]);

    const totalPoints = Number(summary.points || 0);
    const deleteAllText = filtersActive ? `Delete Filtered (${formatCount(totalPoints)})` : "Delete All";

    return (
        <div className="employee-location-page loc-report-page pp-premium">
            <PremiumHero
                icon={FaMapMarkedAlt}
                eyebrow="Employee Location · Reports"
                title="Store Location Reports"
                badge={live ? "Live · 30 sec" : rangeLabel}
                badgeTone={live ? "mint" : "sky"}
                subtitle="Day, week, month and year reports per store with the exact latitude / longitude of every point, captured to the second."
                meta={[
                    { label: "Period", value: PERIODS.find((p) => p.id === period)?.label },
                    { label: "Range", value: rangeLabel },
                    { label: "Points", value: formatCount(totalPoints) }
                ]}
                actions={
                    <>
                        <Link to="/employee-location" className="pp-hero-btn"><FaArrowLeft /> Live Map</Link>
                        <button type="button" className={`pp-hero-btn ${live ? "pp-hero-btn--solid" : ""}`} onClick={() => setLive((v) => !v)}>
                            <FaBroadcastTower /> {live ? "Live on" : "Go live"}
                        </button>
                    </>
                }
            />

            <InsightStrip
                loading={loading && !rows.length}
                items={[
                    { key: "points", label: "Location points", value: formatCount(totalPoints), hint: GRANULARITY.find((g) => g.id === filters.granularity)?.label, tone: "violet", icon: FaMapMarkerAlt },
                    { key: "employees", label: "Employees", value: formatCount(summary.employees || 0), hint: "Tracked in range", tone: "blue", icon: FaUsers },
                    { key: "stores", label: "Stores", value: formatCount(summary.stores || 0), hint: "With tracked staff", tone: "green", icon: FaStore },
                    { key: "accuracy", label: "Avg accuracy", value: summary.avg_accuracy ? `±${summary.avg_accuracy} m` : "—", hint: "Lower is better", tone: "amber", icon: FaCrosshairs },
                    { key: "last", label: "Last point", value: summary.last_seen ? splitStamp(summary.last_seen).time : "—", hint: summary.last_seen ? fmtDate(summary.last_seen) : "No data", tone: "slate", icon: FaClock }
                ]}
            />

            {notice && <div className="er-alert er-alert--success"><FaCheckCircle /> {notice}</div>}
            {error && <div className="er-alert er-alert--error"><FaExclamationCircle /> {error}<button type="button" onClick={() => setError("")}><FaTimes /></button></div>}

            {/* ================= PERIOD ================= */}
            <section className="lr-period-card">
                <div className="lr-period-tabs" role="tablist" aria-label="Report period">
                    {PERIODS.map((p) => (
                        <button
                            type="button"
                            role="tab"
                            key={p.id}
                            aria-selected={period === p.id}
                            className={period === p.id ? "is-on" : ""}
                            onClick={() => choosePeriod(p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {period === "custom" ? (
                    <div className="lr-range">
                        <label><span>From</span><input type="date" value={customFrom} max={customTo} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} /></label>
                        <label><span>To</span><input type="date" value={customTo} min={customFrom} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} /></label>
                    </div>
                ) : period !== "all" ? (
                    <div className="lr-stepper">
                        <button type="button" onClick={() => { setAnchor(shiftAnchor(anchor, period, -1)); setPage(1); }} aria-label="Previous period"><FaChevronLeft /></button>
                        <label className="lr-date">
                            <FaCalendarAlt />
                            <input type="date" value={anchor} onChange={(e) => { setAnchor(e.target.value || todayYmd()); setPage(1); }} />
                        </label>
                        <button type="button" onClick={() => { setAnchor(shiftAnchor(anchor, period, 1)); setPage(1); }} aria-label="Next period"><FaChevronRight /></button>
                        <button type="button" className="lr-today" onClick={() => { setAnchor(todayYmd()); setPage(1); }}>Today</button>
                        <span className="lr-range-label">{rangeLabel}</span>
                    </div>
                ) : (
                    <span className="lr-range-label">Every location point ever recorded</span>
                )}
            </section>

            {/* ================= TOOLBAR ================= */}
            <div className="page-toolbar">
                <div className="toolbar-search">
                    <FaSearch className="toolbar-search-icon" />
                    <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search employee name, ID or email..." />
                </div>
                <div className="toolbar-buttons">
                    <button type="button" className="toolbar-btn" onClick={() => load()} disabled={loading}>
                        <FaSyncAlt className={loading ? "lr-spin" : ""} /> Refresh
                    </button>
                    <ExportButton onExport={handleExport} loading={exporting} disabled={!totalPoints} />
                    {selected.length > 0 && (
                        <button type="button" className="toolbar-btn delete-btn" onClick={() => setConfirm({ type: "selected" })}>
                            <FaTrash /> Delete Selected ({selected.length})
                        </button>
                    )}
                    <button type="button" className="toolbar-btn delete-btn" onClick={() => setConfirm({ type: "all" })} disabled={!totalPoints}>
                        <FaTrash /> {deleteAllText}
                    </button>
                </div>
            </div>

            {/* ================= FILTERS ================= */}
            <div className="filter-bar">
                <div className="filter-items">
                    <div className="filter-group">
                        <label>Store</label>
                        <select value={filters.storeId} onChange={(e) => setFilter("storeId", e.target.value)}>
                            <option value="">All stores</option>
                            {options.stores.map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Employee</label>
                        <select value={filters.employeeId} onChange={(e) => setFilter("employeeId", e.target.value)}>
                            <option value="">All employees</option>
                            {options.employees.map((u) => <option key={u.id} value={u.id}>{u.name}{u.employee_code ? ` (${u.employee_code})` : ""}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Source</label>
                        <select value={filters.source} onChange={(e) => setFilter("source", e.target.value)}>
                            <option value="">All sources</option>
                            {options.sources.map((src) => <option key={src} value={src}>{src}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Detail</label>
                        <select value={filters.granularity} onChange={(e) => setFilter("granularity", e.target.value)}>
                            {GRANULARITY.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                        </select>
                    </div>
                </div>
                <button type="button" className="clear-filter-btn" onClick={clearFilters}>
                    <FaTimes /> Clear Filters
                </button>
            </div>

            {/* ================= STORE SUMMARY ================= */}
            <section className="card">
                <div className="card-header">
                    <div className="card-header-left">
                        <h3 className="card-title">Store-wise Summary</h3>
                        <p className="card-subtitle">{rangeLabel} · staff are grouped by the stores assigned to them</p>
                    </div>
                </div>
                <div className="card-body">
                    {storeSummary.length === 0 ? (
                        <div className="lr-empty-inline">{loading ? "Loading…" : "No store activity in this period."}</div>
                    ) : (
                        <div className="lr-store-grid">
                            {storeSummary.map((s) => {
                                const on = String(filters.storeId) === String(s.store_id);
                                return (
                                    <button
                                        type="button"
                                        key={s.store_id}
                                        className={`lr-store ${on ? "is-on" : ""}`}
                                        onClick={() => setFilter("storeId", on ? "" : String(s.store_id))}
                                        title={on ? "Show all stores" : `Show only ${s.store_name}`}
                                    >
                                        <span className={`pp-avatar ${avatarTone(s.store_name)}`}>
                                            {initials(String(s.store_name || "").replace(/^MRPL\s*-\s*/i, ""))}
                                        </span>
                                        <span className="lr-store-copy">
                                            <strong>{s.store_name}</strong>
                                            <small>{[s.city, s.state].filter(Boolean).join(", ") || "—"}</small>
                                            <span className="lr-store-stats">
                                                <b>{formatCount(s.points)}</b> points · <b>{formatCount(s.employees)}</b> staff
                                            </span>
                                            <span className="lr-store-time">
                                                {splitStamp(s.first_seen).time} → {splitStamp(s.last_seen).time}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ================= RECORDS + MAP ================= */}
            <div className={`lr-main ${focus ? "has-map" : ""}`}>
                <section className="card">
                    <div className="card-header">
                        <div className="card-header-left">
                            <h3 className="card-title">Exact Location Log</h3>
                            <p className="card-subtitle">
                                {formatCount(totalPoints)} point(s) · {GRANULARITY.find((g) => g.id === filters.granularity)?.label}
                                {selected.length ? ` · ${selected.length} selected` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="card-body">
                        {loading && !rows.length ? (
                            <PremiumLoader compact title="Loading location points" />
                        ) : rows.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><FaMapMarkerAlt /></div>
                                <h3 className="empty-state-title">No location points</h3>
                                <p className="empty-state-description">Try another period, store or employee — or clear the filters.</p>
                            </div>
                        ) : (
                            <div className="data-table-wrapper pp-sticky-last">
                                <table className="data-table lr-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 44 }}>
                                                <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" />
                                            </th>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Employee</th>
                                            <th>Store(s)</th>
                                            <th>Latitude</th>
                                            <th>Longitude</th>
                                            <th>Accuracy</th>
                                            <th>Source</th>
                                            <th style={{ textAlign: "center" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => {
                                            const { date, time } = splitStamp(row.captured_at);
                                            const acc = Number(row.accuracy);
                                            const accTone = !Number.isFinite(acc) ? "slate" : acc <= 30 ? "green" : acc <= 100 ? "amber" : "red";
                                            return (
                                                <tr key={row.id} className={focus?.id === row.id ? "is-focus" : ""}>
                                                    <td>
                                                        <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)} aria-label="Select row" />
                                                    </td>
                                                    <td><span className="pp-date">{fmtDate(date)}</span></td>
                                                    <td><span className="lr-time">{time}</span></td>
                                                    <td>
                                                        <div className="pp-cell-main">
                                                            <span className={`pp-avatar pp-avatar--round ${avatarTone(row.name)}`}>{initials(row.name)}</span>
                                                            <span className="pp-cell-text">
                                                                <span className="pp-cell-title">{row.name}</span>
                                                                <span className="pp-cell-sub">{[row.employee_code, row.department].filter(Boolean).join(" · ") || "—"}</span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="pp-wrap lr-stores">
                                                        {row.store_names
                                                            ? <span className="pp-pill pp-pill--teal"><FaStore /> {row.store_names}</span>
                                                            : <span className="pp-dash">No store</span>}
                                                    </td>
                                                    <td><span className="lr-coord">{coord(row.latitude)}</span></td>
                                                    <td><span className="lr-coord">{coord(row.longitude)}</span></td>
                                                    <td>
                                                        {Number.isFinite(acc)
                                                            ? <span className={`pp-pill pp-pill--dot pp-pill--${accTone}`}>±{acc} m</span>
                                                            : <span className="pp-dash">—</span>}
                                                    </td>
                                                    <td><span className="pp-pill pp-pill--slate">{row.source}</span></td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button type="button" className="view-btn" onClick={() => setFocus(focus?.id === row.id ? null : row)} title="Show on map">
                                                                <FaMapMarkerAlt /><span>Map</span>
                                                            </button>
                                                            <button type="button" className="edit-btn" onClick={() => openEdit(row)} title="Edit">
                                                                <FaEdit /><span>Edit</span>
                                                            </button>
                                                            <button type="button" className="delete-btn" onClick={() => setConfirm({ type: "one", row })} title="Delete">
                                                                <FaTrash /><span>Delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <Pagination
                            currentPage={pagination.page || page}
                            totalPages={pagination.totalPages || 1}
                            totalRecords={pagination.total || 0}
                            pageSize={limit}
                            pageSizeOptions={[25, 50, 100, 200]}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => { setLimit(Number(size)); setPage(1); }}
                        />
                    </div>
                </section>

                {focus && (
                    <aside className="card lr-map-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h3 className="card-title">{focus.name}</h3>
                                <p className="card-subtitle">{fmtDate(splitStamp(focus.captured_at).date)} · {splitStamp(focus.captured_at).time}</p>
                            </div>
                            <button type="button" className="lr-close" onClick={() => setFocus(null)} aria-label="Close map"><FaTimes /></button>
                        </div>
                        <div className="card-body">
                            <iframe title="Exact location" className="lr-map" src={osmEmbed(focus)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                            <div className="lr-map-facts">
                                <div><span>Latitude</span><strong>{coord(focus.latitude)}</strong></div>
                                <div><span>Longitude</span><strong>{coord(focus.longitude)}</strong></div>
                                <div><span>Accuracy</span><strong>{focus.accuracy != null ? `±${focus.accuracy} m` : "—"}</strong></div>
                                <div><span>Store(s)</span><strong>{focus.store_names || "—"}</strong></div>
                            </div>
                            <a className="pp-btn pp-btn--primary lr-open-maps" href={mapsUrl(focus)} target="_blank" rel="noopener noreferrer">
                                <FaExternalLinkAlt /> Open in Google Maps
                            </a>
                        </div>
                    </aside>
                )}
            </div>

            {/* ================= EDIT ================= */}
            <ProfessionalModal
                isOpen={Boolean(editing)}
                onClose={() => !savingEdit && setEditing(null)}
                title="Edit Location Point"
                subtitle={editing ? `${editing.name} · record #${editing.id}` : ""}
                icon={<FaEdit />}
                footer={
                    <>
                        <button type="button" className="inventory-modal-btn secondary" onClick={() => setEditing(null)} disabled={savingEdit}>Cancel</button>
                        <button type="submit" form="lr-edit-form" className="inventory-modal-btn primary" disabled={savingEdit}>
                            <FaSave /> {savingEdit ? "Saving..." : "Save Changes"}
                        </button>
                    </>
                }
            >
                {editing && (
                    <form id="lr-edit-form" className="inventory-form" onSubmit={saveEdit}>
                        <div className="inventory-form-grid">
                            <label>Latitude <span>*</span>
                                <input type="number" step="0.0000001" min="-90" max="90" required value={editing.latitude} onChange={(e) => setEditing({ ...editing, latitude: e.target.value })} />
                            </label>
                            <label>Longitude <span>*</span>
                                <input type="number" step="0.0000001" min="-180" max="180" required value={editing.longitude} onChange={(e) => setEditing({ ...editing, longitude: e.target.value })} />
                            </label>
                            <label>Accuracy (metres)
                                <input type="number" step="0.01" min="0" value={editing.accuracy} onChange={(e) => setEditing({ ...editing, accuracy: e.target.value })} />
                            </label>
                            <label>Captured at <span>*</span>
                                <input type="datetime-local" step="1" required value={editing.captured_at} onChange={(e) => setEditing({ ...editing, captured_at: e.target.value })} />
                            </label>
                            <label>Source
                                <select value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })}>
                                    {[...new Set(["website", "mobile-network", "manual", editing.source, ...options.sources])].filter(Boolean).map((src) => (
                                        <option key={src} value={src}>{src}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </form>
                )}
            </ProfessionalModal>

            <ConfirmDialog
                open={Boolean(confirm)}
                title={
                    confirm?.type === "one" ? "Delete Location Point"
                        : confirm?.type === "selected" ? "Delete Selected Points"
                            : filtersActive ? "Delete Filtered Points" : "Delete All Location Points"
                }
                message={
                    confirm?.type === "one"
                        ? `Delete ${confirm.row.name}'s point at ${confirm.row.captured_at}? This cannot be undone.`
                        : confirm?.type === "selected"
                            ? `Delete ${selected.length} selected location point(s)? This cannot be undone.`
                            : filtersActive
                                ? `Delete all ${formatCount(totalPoints)} point(s) that match the current period and filters (${rangeLabel})? This cannot be undone.`
                                : "No filter is applied. EVERY location point ever recorded will be permanently deleted. This cannot be undone."
                }
                confirmText={deleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={runDelete}
                onCancel={() => !deleting && setConfirm(null)}
            />
        </div>
    );
}

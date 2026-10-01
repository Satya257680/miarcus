import { Fragment, useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import { exportTableData } from "../utils/exportUtils.js";
import ExportButton from "../components/common/ExportButton";

import {
    FaStore,
    FaCheckCircle,
    FaTimesCircle,
    FaFileAlt,
    FaExclamationTriangle,
    FaRedoAlt,
    FaSearch,
    FaTimes,
    FaChevronDown,
    FaChevronRight,
    FaSyncAlt,
    FaCalendarAlt,
    FaClipboardCheck,
} from "react-icons/fa";

import "../styles/premium/PagePremium.css";
import "../styles/premium/ChecklistPremium.css";
import "../styles/ChecklistTracker.css";

const API = API_BASE_URL + "/api";

// ------------------------------------------------------
// Date helpers (local calendar dates, YYYY-MM-DD)
// ------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toKey(new Date());
const shift = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toKey(d);
};
const monthStart = () => {
    const d = new Date();
    return toKey(new Date(d.getFullYear(), d.getMonth(), 1));
};

const QUICK_RANGES = [
    { key: "today", label: "Today", range: () => [today(), today()] },
    { key: "yesterday", label: "Yesterday", range: () => [shift(-1), shift(-1)] },
    { key: "7d", label: "Last 7 days", range: () => [shift(-6), today()] },
    { key: "30d", label: "Last 30 days", range: () => [shift(-29), today()] },
    { key: "month", label: "This month", range: () => [monthStart(), today()] },
];

const formatDay = (key) => {
    if (!key) return "-";
    const [y, m, d] = String(key).slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const num = (v) => Number(v || 0).toLocaleString("en-IN");

const STATUS_OPTIONS = [
    { value: "", label: "All Stores" },
    { value: "submitted", label: "Submitted" },
    { value: "not_submitted", label: "Not Submitted" },
    { value: "multiple", label: "Submitted 2+ times in a day" },
    { value: "with_actions", label: "With Action Points" },
];

const PAGE_SIZES = [10, 25, 50, 100];

// ======================================================
// PAGE
// ======================================================
function ChecklistTracker() {
    const [fromDate, setFromDate] = useState(today());
    const [toDate, setToDate] = useState(today());
    const [checklistType, setChecklistType] = useState("");
    const [storeFilter, setStoreFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");

    const [checklistTypes, setChecklistTypes] = useState([]);
    const [allStores, setAllStores] = useState([]);

    const [refreshKey, setRefreshKey] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: "" });

    const [expanded, setExpanded] = useState(() => new Set());
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // ---------- lookups ----------
    useEffect(() => {
        Promise.allSettled([
            axios.get(`${API}/checklist-types`),
            axios.get(`${API}/stores`),
        ]).then(([typeRes, storeRes]) => {
            if (typeRes.status === "fulfilled") setChecklistTypes(typeRes.value.data?.data || []);
            if (storeRes.status === "fulfilled") setAllStores(storeRes.value.data?.data || []);
        });
    }, []);

    // ---------- data ----------
    const requestKey = JSON.stringify([fromDate, toDate, checklistType, storeFilter, refreshKey]);

    useEffect(() => {
        let alive = true;
        const [start, end, typeId, storeId] = JSON.parse(requestKey);

        axios
            .get(`${API}/checklist-reports/compliance`, {
                params: {
                    start_date: start || undefined,
                    end_date: end || undefined,
                    checklist_type_id: typeId || undefined,
                    store_id: storeId || undefined,
                },
            })
            .then(({ data: res }) => {
                if (alive) setResult({ key: requestKey, data: res?.data || null, error: "" });
            })
            .catch((err) => {
                console.error("Checklist tracker error:", err);
                if (alive) {
                    setResult({
                        key: requestKey,
                        data: null,
                        error: err?.response?.data?.message || "Unable to load checklist store status.",
                    });
                }
            });

        return () => {
            alive = false;
        };
    }, [requestKey]);

    const loading = result.key !== requestKey;
    const data = result.data;
    const error = loading ? "" : result.error;

    // Any filter change sends the table back to page 1.
    const withReset = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const summary = data?.summary || {};
    const stores = useMemo(() => data?.stores || [], [data]);

    const activeQuick = QUICK_RANGES.find((q) => {
        const [a, b] = q.range();
        return a === fromDate && b === toDate;
    })?.key;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return stores.filter((s) => {
            if (statusFilter === "submitted" && !s.submitted) return false;
            if (statusFilter === "not_submitted" && s.submitted) return false;
            if (statusFilter === "multiple" && !s.multiple_in_a_day) return false;
            if (statusFilter === "with_actions" && !s.action_points) return false;
            if (!q) return true;
            return [s.store_name, s.store_code, s.city, s.state, s.submitted_by]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
    }, [stores, statusFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const hasFilters =
        fromDate !== today() ||
        toDate !== today() ||
        checklistType ||
        storeFilter ||
        statusFilter ||
        search;

    const clearFilters = () => {
        setFromDate(today());
        setToDate(today());
        setChecklistType("");
        setStoreFilter("");
        setStatusFilter("");
        setSearch("");
        setExpanded(new Set());
        setPage(1);
    };

    const toggleRow = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleStatus = (value) => {
        setStatusFilter((cur) => (cur === value ? "" : value));
        setPage(1);
    };

    const rangeLabel =
        data?.range && data.range.start_date === data.range.end_date
            ? formatDay(data.range.start_date)
            : data?.range
                ? `${formatDay(data.range.start_date)} – ${formatDay(data.range.end_date)}`
                : "";

    const handleExport = async (format = "xlsx") => {
        const headers = [
            "Store",
            "Store Code",
            "City",
            "Status",
            "Checklists Submitted",
            "Days Submitted",
            "Most in One Day",
            "Per Day Breakdown",
            "Action Points",
            "Action Points Closed",
            "Avg Score",
            "First Submission",
            "Last Submission",
            "Submitted By",
            "Checklist Types",
        ];
        const rows = filtered.map((s) => [
            s.store_name || "",
            s.store_code || "",
            s.city || "",
            s.submitted ? "Submitted" : "Not Submitted",
            s.submissions,
            s.days_submitted,
            s.max_per_day,
            s.per_day.map((d) => `${d.date}: ${d.submissions}`).join(" | "),
            s.action_points,
            s.action_closed,
            s.average_score ?? "",
            s.first_submission ? formatDateTime(s.first_submission) : "",
            s.last_submission ? formatDateTime(s.last_submission) : "",
            s.submitted_by || "",
            s.checklist_types || "",
        ]);
        await exportTableData({
            headers,
            rows,
            filename: `Checklist_Store_Tracker_${fromDate}_to_${toDate}`,
            format,
            title: `Checklist Store Tracker (${rangeLabel})`,
        });
    };

    const rate = Number(summary.compliance_rate || 0);

    return (
        <div className="checklist-tracker-page pp-premium">
            <PremiumHero
                icon={FaClipboardCheck}
                eyebrow="Store Operations · Checklist"
                title="Checklist Tracker"
                subtitle="Which stores submitted their checklist, which did not, how many times, and what it generated."
                meta={[
                    { label: "Period", value: rangeLabel },
                    { label: "Compliance", value: data ? `${rate}%` : null },
                ]}
                actions={
                    <div className="ctr-hero-actions">
                        <button type="button" className="ctr-btn ctr-btn-ghost" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
                            <FaSyncAlt className={loading ? "ctr-spin" : ""} /> Refresh
                        </button>
                        <ExportButton onExport={handleExport} disabled={loading} />
                    </div>
                }
            />

            <div className="ctr-insights">
                <InsightStrip
                    loading={loading}
                    items={[
                        {
                            key: "total",
                            label: "Total Stores",
                            value: num(summary.total_stores),
                            hint: "Stores in scope",
                            tone: "violet",
                            icon: FaStore,
                            onClick: () => withReset(setStatusFilter)(""),
                            active: statusFilter === "",
                        },
                        {
                            key: "submitted",
                            label: "Submitted",
                            value: num(summary.submitted_stores),
                            hint: `${rate}% of stores`,
                            tone: "green",
                            icon: FaCheckCircle,
                            onClick: () => toggleStatus("submitted"),
                            active: statusFilter === "submitted",
                        },
                        {
                            key: "not",
                            label: "Not Submitted",
                            value: num(summary.not_submitted_stores),
                            hint: "No checklist in period",
                            tone: "red",
                            icon: FaTimesCircle,
                            onClick: () => toggleStatus("not_submitted"),
                            active: statusFilter === "not_submitted",
                        },
                        {
                            key: "reports",
                            label: "Reports",
                            value: num(summary.reports_generated),
                            hint: summary.average_score != null ? `Generated · avg ${summary.average_score}%` : "Checklist reports generated",
                            tone: "blue",
                            icon: FaFileAlt,
                        },
                        {
                            key: "actions",
                            label: "Action Points",
                            value: num(summary.action_points),
                            hint: `${num(summary.action_points_open)} open · ${num(summary.action_points_closed)} closed`,
                            tone: "amber",
                            icon: FaExclamationTriangle,
                            onClick: () => toggleStatus("with_actions"),
                            active: statusFilter === "with_actions",
                        },
                        {
                            key: "multi",
                            label: "2+ in a Day",
                            value: num(summary.multiple_in_a_day_stores),
                            hint: `${num(summary.repeat_submissions)} extra submissions`,
                            tone: "slate",
                            icon: FaRedoAlt,
                            onClick: () => toggleStatus("multiple"),
                            active: statusFilter === "multiple",
                        },
                    ]}
                />
            </div>

            {/* Compliance bar */}
            <section className="ctr-card ctr-progress-card">
                <div className="ctr-progress-head">
                    <div>
                        <span className="ctr-eyebrow">Store compliance</span>
                        <strong>
                            {num(summary.submitted_stores)} of {num(summary.total_stores)} stores submitted
                        </strong>
                    </div>
                    <span className={`ctr-rate ${rate >= 90 ? "good" : rate >= 60 ? "mid" : "low"}`}>{rate}%</span>
                </div>
                <div className="ctr-progress-track" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
                    <div className="ctr-progress-fill" style={{ width: `${Math.min(rate, 100)}%` }} />
                </div>
                <div className="ctr-progress-legend">
                    <span><i className="dot green" /> Submitted {num(summary.submitted_stores)}</span>
                    <span><i className="dot red" /> Not submitted {num(summary.not_submitted_stores)}</span>
                    <span><i className="dot blue" /> Reports {num(summary.reports_generated)}</span>
                    <span><i className="dot amber" /> Action points {num(summary.action_points)}</span>
                </div>
            </section>

            {/* Filters */}
            <section className="ctr-card ctr-filters">
                <div className="ctr-quick">
                    <FaCalendarAlt className="ctr-quick-icon" />
                    {QUICK_RANGES.map((q) => (
                        <button
                            key={q.key}
                            type="button"
                            className={`ctr-chip ${activeQuick === q.key ? "active" : ""}`}
                            onClick={() => {
                                const [a, b] = q.range();
                                setFromDate(a);
                                setToDate(b);
                                setPage(1);
                            }}
                        >
                            {q.label}
                        </button>
                    ))}
                </div>

                <div className="ctr-filter-grid">
                    <label className="ctr-field">
                        <span>From Date</span>
                        <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => withReset(setFromDate)(e.target.value)} />
                    </label>

                    <label className="ctr-field">
                        <span>To Date</span>
                        <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => withReset(setToDate)(e.target.value)} />
                    </label>

                    <label className="ctr-field">
                        <span>Checklist Type</span>
                        <select value={checklistType} onChange={(e) => withReset(setChecklistType)(e.target.value)}>
                            <option value="">All Checklist Types</option>
                            {checklistTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.checklist_name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="ctr-field">
                        <span>Store</span>
                        <select value={storeFilter} onChange={(e) => withReset(setStoreFilter)(e.target.value)}>
                            <option value="">All Stores</option>
                            {allStores.map((s) => (
                                <option key={s.id} value={s.id}>{s.store_name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="ctr-field">
                        <span>Status</span>
                        <select value={statusFilter} onChange={(e) => withReset(setStatusFilter)(e.target.value)}>
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="ctr-field ctr-field-search">
                        <span>Search</span>
                        <div className="ctr-search">
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Store, code, city or person…"
                                value={search}
                                onChange={(e) => withReset(setSearch)(e.target.value)}
                            />
                        </div>
                    </label>

                    <div className="ctr-field ctr-field-clear">
                        <span>&nbsp;</span>
                        <button type="button" className="ctr-btn ctr-btn-clear" onClick={clearFilters} disabled={!hasFilters}>
                            <FaTimes /> Clear Filters
                        </button>
                    </div>
                </div>
            </section>

            {error && (
                <div className="ctr-error">
                    {error}
                    <button type="button" onClick={() => setRefreshKey((k) => k + 1)}>Try again</button>
                </div>
            )}

            {/* Table */}
            <section className="ctr-card ctr-table-card">
                <div className="ctr-table-head">
                    <div>
                        <h3>Store-wise submissions</h3>
                        <p>
                            A store counts once even if it submits more than once — expand a row to see how many times it submitted each day.
                        </p>
                    </div>
                    <span className="ctr-count">{num(filtered.length)} stores</span>
                </div>

                <div className="ctr-table-wrap">
                    <table className="ctr-table">
                        <thead>
                            <tr>
                                <th style={{ width: 44 }} />
                                <th>Store</th>
                                <th>Status</th>
                                <th className="num">Submitted</th>
                                <th className="num">Days</th>
                                <th className="num">Most / Day</th>
                                <th className="num">Action Points</th>
                                <th className="num">Avg Score</th>
                                <th>Last Submitted</th>
                                <th>Submitted By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !stores.length ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`} className="ctr-skeleton-row">
                                        {Array.from({ length: 10 }).map((__, j) => (
                                            <td key={j}><span className="ctr-skeleton" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="ctr-empty">
                                        <FaStore />
                                        <strong>No stores match these filters</strong>
                                        <span>Try another date range or clear the filters.</span>
                                    </td>
                                </tr>
                            ) : (
                                pageRows.map((s) => {
                                    const open = expanded.has(s.store_id);
                                    return (
                                        <Fragment key={s.store_id}>
                                            <tr className={`${s.submitted ? "" : "is-missing"} ${open ? "is-open" : ""}`}>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="ctr-expand"
                                                        onClick={() => toggleRow(s.store_id)}
                                                        disabled={!s.submitted}
                                                        aria-label={open ? "Hide day breakdown" : "Show day breakdown"}
                                                    >
                                                        {open ? <FaChevronDown /> : <FaChevronRight />}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="ctr-store">
                                                        <span className="ctr-store-name">{s.store_name}</span>
                                                        <span className="ctr-store-meta">
                                                            {[s.store_code, s.city].filter(Boolean).join(" · ") || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {s.submitted ? (
                                                        <span className="ctr-badge ok"><FaCheckCircle /> Submitted</span>
                                                    ) : (
                                                        <span className="ctr-badge miss"><FaTimesCircle /> Not Submitted</span>
                                                    )}
                                                </td>
                                                <td className="num">
                                                    <strong>{num(s.submissions)}</strong>
                                                    {s.submissions > 0 && <small> time{s.submissions > 1 ? "s" : ""}</small>}
                                                </td>
                                                <td className="num">{s.days_submitted}{data?.range?.days > 1 ? <small> / {data.range.days}</small> : null}</td>
                                                <td className="num">
                                                    {s.max_per_day > 1 ? (
                                                        <span className="ctr-pill warn">{s.max_per_day}×</span>
                                                    ) : (
                                                        s.max_per_day || "—"
                                                    )}
                                                </td>
                                                <td className="num">
                                                    {s.action_points ? (
                                                        <span className="ctr-pill amber" title={`${s.action_closed} closed`}>
                                                            {s.action_points}
                                                            <small> · {s.action_points - s.action_closed} open</small>
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td className="num">
                                                    {s.average_score != null ? (
                                                        <span className={`ctr-score ${s.average_score >= 85 ? "good" : s.average_score >= 60 ? "mid" : "low"}`}>
                                                            {s.average_score}%
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td>{s.last_submission ? formatDateTime(s.last_submission) : "—"}</td>
                                                <td className="ctr-by" title={s.submitted_by}>{s.submitted_by || "—"}</td>
                                            </tr>

                                            {open && (
                                                <tr className="ctr-detail-row">
                                                    <td />
                                                    <td colSpan={9}>
                                                        <div className="ctr-detail">
                                                            <div className="ctr-detail-title">
                                                                Submissions per day
                                                                {s.checklist_types && <span> · {s.checklist_types}</span>}
                                                            </div>
                                                            <div className="ctr-days">
                                                                {s.per_day.map((d) => (
                                                                    <div key={d.date} className={`ctr-day ${d.submissions > 1 ? "multi" : ""}`}>
                                                                        <span>{formatDay(d.date)}</span>
                                                                        <strong>{d.submissions} {d.submissions > 1 ? "times" : "time"}</strong>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="ctr-pager">
                    <label>
                        Rows
                        <select value={pageSize} onChange={(e) => withReset(setPageSize)(Number(e.target.value))}>
                            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <div className="ctr-pager-nav">
                        <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button>
                        <span>Page {safePage} of {totalPages}</span>
                        <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default ChecklistTracker;

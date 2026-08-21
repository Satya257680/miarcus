import { useCallback, useEffect, useState } from "react";
import {
    FaCamera,
    FaChartBar,
    FaDownload,
    FaMapMarkerAlt,
    FaSearch,
    FaTimes,
    FaTimesCircle,
    FaTrash,
    FaUsers,
} from "react-icons/fa";

import ConfirmDialog from "../components/common/ConfirmDialog";
import {
    deleteAllAttendance,
    deleteAttendanceRecord,
    getAttendanceEmployees,
    getAttendancePhotoUrl,
    getAttendanceReports,
    getAttendanceStores,
} from "../services/attendanceService";

import "../styles/pages/Attendance.css";

const initialFilters = {
    search: "",
    userId: "",
    storeId: "",
    from: "",
    to: "",
    status: "",
    page: 1,
    pageSize: 10,
};

const INDIA_TIME_ZONE = "Asia/Kolkata";

const parseAttendanceDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;

    const text = String(value);

    if (/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}/.test(text)) {
        return new Date(`${text.slice(0, 19).replace(" ", "T")}+05:30`);
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fmt = (value) => {
    const date = parseAttendanceDate(value);
    if (!date) return "—";

    return date.toLocaleString([], {
        timeZone: INDIA_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const fmtDate = (value) => {
    if (!value) return "—";

    // work_date is a MySQL DATE, so never let the browser shift it
    // backward/forward because of its local timezone.
    const text = String(value).slice(0, 10);
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) {
        const [year, month, day] = text.split("-").map(Number);
        return new Intl.DateTimeFormat([], {
            timeZone: INDIA_TIME_ZONE,
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(Date.UTC(year, month - 1, day)));
    }

    const date = parseAttendanceDate(value);
    return date
        ? date.toLocaleDateString([], {
              timeZone: INDIA_TIME_ZONE,
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : text;
};

const duration = (start, end) => {
    const from = parseAttendanceDate(start);
    const to = parseAttendanceDate(end);
    if (!from || !to) return "—";

    const minutes = Math.max(0, Math.floor((to - from) / 60000));

    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(
        2,
        "0"
    )}m`;
};

const csvEscape = (value) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function AttendanceReports() {
    const [data, setData] = useState({
        rows: [],
        total: 0,
        pages: 1,
        summary: {},
    });
    const [employees, setEmployees] = useState([]);
    const [stores, setStores] = useState([]);
    const [filters, setFilters] = useState(initialFilters);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [photo, setPhoto] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showDeleteAll, setShowDeleteAll] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getAttendanceReports(filters);
            setData(response);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to load attendance reports."
            );
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        getAttendanceEmployees()
            .then((response) => setEmployees(response.data || []))
            .catch(() => {});

        getAttendanceStores()
            .then((response) => setStores(response.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const timer = setTimeout(load, filters.search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [load, filters.search]);

    const set = (key, value) => {
        setFilters((current) => ({
            ...current,
            [key]: value,
            page: 1,
        }));
    };

    const clearFilters = () => {
        setMessage("");
        setError("");
        setFilters({ ...initialFilters });
    };

    const exportCsv = async () => {
        try {
            setBusy(true);
            setError("");

            const all = await getAttendanceReports({
                ...filters,
                page: 1,
                pageSize: 10000,
            });

            const header = [
                "Date",
                "Employee",
                "Employee ID",
                "Department",
                "Designation",
                "Store",
                "Store Code",
                "Status",
                "Check-in",
                "Check-out",
                "Duration",
                "Check-in Latitude",
                "Check-in Longitude",
                "Check-in Accuracy",
                "Remarks",
            ];

            const rows = (all.rows || []).map((row) => [
                fmtDate(row.work_date),
                row.name,
                row.employee_id,
                row.department,
                row.designation,
                row.store_name,
                row.store_code,
                row.status,
                fmt(row.check_in_at),
                fmt(row.check_out_at),
                duration(row.check_in_at, row.check_out_at),
                row.check_in_latitude,
                row.check_in_longitude,
                row.check_in_accuracy,
                row.check_in_remarks || row.check_out_remarks,
            ]);

            const csv = [header, ...rows]
                .map((row) => row.map(csvEscape).join(","))
                .join("\n");

            const blob = new Blob([csv], {
                type: "text/csv;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `attendance-report-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to export attendance records."
            );
        } finally {
            setBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            setBusy(true);
            setError("");
            await deleteAttendanceRecord(deleteId);
            setDeleteId(null);
            setMessage("Attendance record deleted successfully.");
            await load();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to delete attendance record."
            );
        } finally {
            setBusy(false);
        }
    };

    const confirmDeleteAll = async () => {
        try {
            setBusy(true);
            setError("");
            await deleteAllAttendance();
            setShowDeleteAll(false);
            setMessage("All attendance records were deleted successfully.");
            setFilters({ ...initialFilters });
            await load();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to delete attendance records."
            );
        } finally {
            setBusy(false);
        }
    };

    const summary = data.summary || {};

    return (
        <div className="attendance-page">
            <div className="attendance-shell">
                <header className="attendance-hero report-page-hero">
                    <div>
                        <div className="attendance-eyebrow">
                            <FaChartBar />
                            Workforce analytics
                        </div>
                        <h1>Attendance Reports</h1>
                        <p>
                            Review attendance, working duration, location and
                            employee photo evidence.
                        </p>
                    </div>

                    <div className="report-header-actions">
                        <button
                            className="attendance-btn secondary"
                            onClick={clearFilters}
                            disabled={busy}
                        >
                            <FaTimes />
                            Clear Filters
                        </button>
                        <button
                            className="attendance-btn secondary danger-outline"
                            onClick={() => setShowDeleteAll(true)}
                            disabled={busy || !data.total}
                        >
                            <FaTrash />
                            Delete All
                        </button>
                        <button
                            className="attendance-btn primary"
                            onClick={exportCsv}
                            disabled={busy || !data.total}
                        >
                            <FaDownload />
                            {busy ? "Working…" : "Export CSV"}
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="attendance-alert error">
                        <FaTimesCircle />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="attendance-alert success">
                        <FaUsers />
                        {message}
                    </div>
                )}

                <section className="attendance-kpis report-kpis">
                    <div className="attendance-kpi">
                        <span>Total records</span>
                        <strong>{summary.total || 0}</strong>
                        <small>Matching your filters</small>
                    </div>
                    <div className="attendance-kpi">
                        <span>Present</span>
                        <strong className="active">
                            {Number(summary.present || 0) +
                                Number(summary.completed || 0)}
                        </strong>
                        <small>Employees with attendance</small>
                    </div>
                    <div className="attendance-kpi">
                        <span>Late check-ins</span>
                        <strong className="ready">
                            {summary.late || 0}
                        </strong>
                        <small>After 09:15 AM</small>
                    </div>
                    <div className="attendance-kpi">
                        <span>Open sessions</span>
                        <strong className="active">
                            {summary.open_sessions || 0}
                        </strong>
                        <small>Currently checked in</small>
                    </div>
                </section>

                <section className="attendance-card report-filters">
                    <div className="report-section-head">
                        <div>
                            <span className="card-kicker">Filters</span>
                            <h2>Attendance search</h2>
                        </div>
                        <FaUsers />
                    </div>

                    <div className="report-filter-grid">
                        <label className="report-search-field">
                            <span>Search employee, ID, store or email</span>
                            <div className="search-control">
                                <FaSearch />
                                <input
                                    value={filters.search}
                                    onChange={(event) =>
                                        set("search", event.target.value)
                                    }
                                    placeholder="Search employee, employee ID, store or email…"
                                />
                            </div>
                        </label>

                        <label>
                            <span>Employee</span>
                            <select
                                value={filters.userId}
                                onChange={(event) =>
                                    set("userId", event.target.value)
                                }
                            >
                                <option value="">All employees</option>
                                {employees.map((employee) => (
                                    <option
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        {employee.name} ({employee.employee_id})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Store</span>
                            <select
                                value={filters.storeId}
                                onChange={(event) =>
                                    set("storeId", event.target.value)
                                }
                            >
                                <option value="">All stores</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.store_name} ({store.store_code})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Status</span>
                            <select
                                value={filters.status}
                                onChange={(event) =>
                                    set("status", event.target.value)
                                }
                            >
                                <option value="">All status</option>
                                <option value="Present">Present</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </label>

                        <label>
                            <span>From date</span>
                            <input
                                type="date"
                                value={filters.from}
                                onChange={(event) =>
                                    set("from", event.target.value)
                                }
                            />
                        </label>

                        <label>
                            <span>To date</span>
                            <input
                                type="date"
                                value={filters.to}
                                onChange={(event) =>
                                    set("to", event.target.value)
                                }
                            />
                        </label>
                    </div>
                </section>

                <section className="attendance-card report-table-card">
                    <div className="report-table-head">
                        <div>
                            <span className="card-kicker">Live records</span>
                            <h2>Attendance register</h2>
                        </div>
                        <span className="record-count">
                            {data.total || 0} records
                        </span>
                    </div>

                    <div className="attendance-table-wrap">
                        <table className="attendance-table attendance-report-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Store</th>
                                    <th>Date</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Location</th>
                                    <th>Photo</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan="10" className="table-state">
                                            Loading attendance…
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    data.rows?.length > 0 &&
                                    data.rows.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <strong>{row.name}</strong>
                                                <small>
                                                    {row.employee_id}
                                                    {row.department
                                                        ? ` · ${row.department}`
                                                        : ""}
                                                </small>
                                            </td>
                                            <td>
                                                <strong>
                                                    {row.store_name || "—"}
                                                </strong>
                                                <small>
                                                    {row.store_code || ""}
                                                </small>
                                            </td>
                                            <td>{fmtDate(row.work_date)}</td>
                                            <td>{fmt(row.check_in_at)}</td>
                                            <td>{fmt(row.check_out_at)}</td>
                                            <td>
                                                {duration(
                                                    row.check_in_at,
                                                    row.check_out_at
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`attendance-status ${
                                                        row.status?.toLowerCase() ||
                                                        ""
                                                    }`}
                                                >
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td>
                                                {row.check_in_latitude ? (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${row.check_in_latitude},${row.check_in_longitude}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <FaMapMarkerAlt /> View
                                                    </a>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td>
                                                {(row.check_in_photo || row.check_out_photo) ? (
                                                    <button
                                                        className="report-link-button"
                                                        onClick={() =>
                                                            setPhoto({
                                                                url: getAttendancePhotoUrl(
                                                                    row.check_in_photo || row.check_out_photo
                                                                ),
                                                                title: `${row.name} · ${fmtDate(
                                                                    row.work_date
                                                                )}`,
                                                            })
                                                        }
                                                    >
                                                        <FaCamera /> View
                                                    </button>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="report-delete-button"
                                                    onClick={() =>
                                                        setDeleteId(row.id)
                                                    }
                                                    disabled={busy}
                                                    title="Delete attendance record"
                                                >
                                                    <FaTrash /> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                {!loading &&
                                    (!data.rows || data.rows.length === 0) && (
                                        <tr>
                                            <td colSpan="10" className="table-state">
                                                No attendance records match your filters.
                                            </td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>

                    <div className="report-pagination">
                        <span>
                            Page {data.page || 1} of {data.pages || 1}
                        </span>
                        <div>
                            <button
                                disabled={(data.page || 1) <= 1 || busy}
                                onClick={() =>
                                    setFilters((current) => ({
                                        ...current,
                                        page: current.page - 1,
                                    }))
                                }
                            >
                                Previous
                            </button>
                            <button
                                disabled={
                                    (data.page || 1) >= (data.pages || 1) ||
                                    busy
                                }
                                onClick={() =>
                                    setFilters((current) => ({
                                        ...current,
                                        page: current.page + 1,
                                    }))
                                }
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {photo && (
                <div
                    className="attendance-photo-modal"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setPhoto(null)}
                >
                    <div
                        className="attendance-photo-dialog"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="attendance-photo-dialog-head">
                            <div>
                                <span className="card-kicker">Photo evidence</span>
                                <h2>{photo.title}</h2>
                            </div>
                            <button
                                className="photo-modal-close"
                                onClick={() => setPhoto(null)}
                                aria-label="Close photo"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="attendance-photo-viewer">
                            <img src={photo.url} alt={photo.title} />
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(deleteId)}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this attendance record? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                loading={busy}
                confirmVariant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />

            <ConfirmDialog
                open={showDeleteAll}
                title="Delete All Attendance"
                message="Are you sure you want to delete ALL attendance records? This will permanently remove the attendance history and stored attendance photos."
                confirmText="Delete All"
                cancelText="Cancel"
                loading={busy}
                confirmVariant="danger"
                onConfirm={confirmDeleteAll}
                onCancel={() => setShowDeleteAll(false)}
            />
        </div>
    );
}


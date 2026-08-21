import { useCallback, useEffect, useState } from "react";
import {
    FaChartBar,
    FaDownload,
    FaMapMarkerAlt,
    FaSearch,
    FaTimesCircle,
    FaUsers,
} from "react-icons/fa";

import {
    getAttendanceEmployees,
    getAttendanceReports,
    getAttendanceStores,
} from "../services/attendanceService";

import "../styles/pages/Attendance.css";

// ======================================================
// HELPERS
// ======================================================

const fmt = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const duration = (start, end) => {
    if (!start || !end) return "—";

    const milliseconds = new Date(end) - new Date(start);
    const minutes = Math.max(
        0,
        Math.floor(milliseconds / 60000)
    );

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
};

const csvEscape = (value) => {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
};

// ======================================================
// ATTENDANCE REPORTS
// ======================================================

export default function AttendanceReports() {
    // ==================================================
    // STATE
    // ==================================================

    const [data, setData] = useState({
        rows: [],
        total: 0,
        pages: 1,
        summary: {},
    });

    const [employees, setEmployees] = useState([]);
    const [stores, setStores] = useState([]);

    const [filters, setFilters] = useState({
        search: "",
        userId: "",
        storeId: "",
        from: "",
        to: "",
        status: "",
        page: 1,
        pageSize: 10,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ==================================================
    // LOAD ATTENDANCE REPORTS
    // ==================================================

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

    // ==================================================
    // LOAD EMPLOYEES AND STORES
    // ==================================================

    useEffect(() => {
        getAttendanceEmployees()
            .then((response) => {
                setEmployees(response.data || []);
            })
            .catch(() => {});

        getAttendanceStores()
            .then((response) => {
                setStores(response.data || []);
            })
            .catch(() => {});
    }, []);

    // ==================================================
    // LOAD REPORTS WHEN FILTERS CHANGE
    // ==================================================

    useEffect(() => {
        const timer = setTimeout(
            load,
            filters.search ? 300 : 0
        );

        return () => clearTimeout(timer);
    }, [load, filters.search]);

    // ==================================================
    // UPDATE FILTER
    // ==================================================

    const set = (key, value) => {
        setFilters((current) => ({
            ...current,
            [key]: value,
            page: 1,
        }));
    };

    // ==================================================
    // EXPORT CSV
    // ==================================================

    const exportCsv = async () => {
        let all;

        try {
            all = await getAttendanceReports({
                ...filters,
                page: 1,
                pageSize: 100,
            });
        } catch {
            return;
        }

        const header = [
            "Date",
            "Employee",
            "Employee ID",
            "Department",
            "Store",
            "Status",
            "Check-in",
            "Check-out",
            "Duration",
            "Remarks",
        ];

        const rows = (all.rows || []).map((row) => [
            row.work_date,
            row.name,
            row.employee_id,
            row.department,
            row.store_name,
            row.status,
            fmt(row.check_in_at),
            fmt(row.check_out_at),
            duration(
                row.check_in_at,
                row.check_out_at
            ),
            row.check_in_remarks ||
                row.check_out_remarks,
        ]);

        const csv = [header, ...rows]
            .map((row) =>
                row
                    .map(csvEscape)
                    .join(",")
            )
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

        link.click();

        URL.revokeObjectURL(url);
    };

    // ==================================================
    // SUMMARY
    // ==================================================

    const summary = data.summary || {};

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="attendance-page">
            <div className="attendance-shell">

                {/* ======================================
                    PAGE HEADER
                ====================================== */}

                <header className="attendance-hero">
                    <div>
                        <div className="attendance-eyebrow">
                            <FaChartBar />
                            Workforce analytics
                        </div>

                        <h1>Attendance Reports</h1>

                        <p>
                            Review employee attendance,
                            working duration, check-in
                            evidence and location records.
                        </p>
                    </div>

                    <button
                        className="attendance-btn primary report-export"
                        onClick={exportCsv}
                    >
                        <FaDownload />
                        Export CSV
                    </button>
                </header>

                {/* ======================================
                    ERROR MESSAGE
                ====================================== */}

                {error && (
                    <div className="attendance-alert error">
                        <FaTimesCircle />
                        {error}
                    </div>
                )}

                {/* ======================================
                    KPI CARDS
                ====================================== */}

                <section className="attendance-kpis report-kpis">

                    {/* Total Records */}
                    <div className="attendance-kpi">
                        <span>Total records</span>

                        <strong>
                            {summary.total || 0}
                        </strong>

                        <small>
                            Matching your filters
                        </small>
                    </div>

                    {/* Present */}
                    <div className="attendance-kpi">
                        <span>Present</span>

                        <strong className="active">
                            {Number(summary.present || 0) +
                                Number(summary.completed || 0)}
                        </strong>

                        <small>
                            Employees with attendance
                        </small>
                    </div>

                    {/* Late */}
                    <div className="attendance-kpi">
                        <span>Late check-ins</span>

                        <strong className="ready">
                            {summary.late || 0}
                        </strong>

                        <small>
                            After 09:15 AM
                        </small>
                    </div>

                    {/* Open Sessions */}
                    <div className="attendance-kpi">
                        <span>Open sessions</span>

                        <strong className="active">
                            {summary.open_sessions || 0}
                        </strong>

                        <small>
                            Currently checked in
                        </small>
                    </div>

                </section>

                {/* ======================================
                    FILTER SECTION
                ====================================== */}

                <section className="attendance-card report-filters">

                    <div className="card-heading">
                        <div>
                            <span className="card-kicker">
                                Filters
                            </span>

                            <h2>
                                Attendance search
                            </h2>
                        </div>

                        <FaUsers />
                    </div>

                    <div className="report-filter-grid">

                        {/* Search */}
                        <label className="search-field">
                            <FaSearch />

                            <input
                                value={filters.search}
                                onChange={(event) =>
                                    set(
                                        "search",
                                        event.target.value
                                    )
                                }
                                placeholder="Search employee, ID, store or email…"
                            />
                        </label>

                        {/* Employee */}
                        <label>
                            <span>
                                Employee
                            </span>

                            <select
                                value={filters.userId}
                                onChange={(event) =>
                                    set(
                                        "userId",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    All employees
                                </option>

                                {employees.map((employee) => (
                                    <option
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        {employee.name} (
                                        {employee.employee_id}
                                        )
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Store */}
                        <label>
                            <span>
                                Store
                            </span>

                            <select
                                value={filters.storeId}
                                onChange={(event) =>
                                    set(
                                        "storeId",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    All stores
                                </option>

                                {stores.map((store) => (
                                    <option
                                        key={store.id}
                                        value={store.id}
                                    >
                                        {store.store_name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Status */}
                        <label>
                            <span>
                                Status
                            </span>

                            <select
                                value={filters.status}
                                onChange={(event) =>
                                    set(
                                        "status",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    All status
                                </option>

                                <option value="Present">
                                    Present
                                </option>

                                <option value="Completed">
                                    Completed
                                </option>
                            </select>
                        </label>

                        {/* From */}
                        <label>
                            <span>
                                From
                            </span>

                            <input
                                type="date"
                                value={filters.from}
                                onChange={(event) =>
                                    set(
                                        "from",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        {/* To */}
                        <label>
                            <span>
                                To
                            </span>

                            <input
                                type="date"
                                value={filters.to}
                                onChange={(event) =>
                                    set(
                                        "to",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                    </div>
                </section>

                {/* ======================================
                    ATTENDANCE TABLE
                ====================================== */}

                <section className="attendance-card report-table-card">

                    <div className="report-table-head">
                        <div>
                            <span className="card-kicker">
                                Live records
                            </span>

                            <h2>
                                Attendance register
                            </h2>
                        </div>

                        <span className="record-count">
                            {data.total || 0} records
                        </span>
                    </div>

                    <div className="attendance-table-wrap">

                        <table className="attendance-table">

                            <thead>
                                <tr>
                                    <th>
                                        Employee
                                    </th>

                                    <th>
                                        Store
                                    </th>

                                    <th>
                                        Date
                                    </th>

                                    <th>
                                        Check-in
                                    </th>

                                    <th>
                                        Check-out
                                    </th>

                                    <th>
                                        Duration
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Location
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {/* Loading */}
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan="8"
                                            className="table-state"
                                        >
                                            Loading attendance…
                                        </td>
                                    </tr>
                                )}

                                {/* Records */}
                                {!loading &&
                                    data.rows?.length > 0 &&
                                    data.rows.map((row) => (
                                        <tr key={row.id}>

                                            {/* Employee */}
                                            <td>
                                                <strong>
                                                    {row.name}
                                                </strong>

                                                <small>
                                                    {row.employee_id}

                                                    {row.department
                                                        ? ` · ${row.department}`
                                                        : ""}
                                                </small>
                                            </td>

                                            {/* Store */}
                                            <td>
                                                <strong>
                                                    {row.store_name ||
                                                        "—"}
                                                </strong>

                                                <small>
                                                    {row.store_code ||
                                                        ""}
                                                </small>
                                            </td>

                                            {/* Date */}
                                            <td>
                                                {row.work_date}
                                            </td>

                                            {/* Check-in */}
                                            <td>
                                                {fmt(
                                                    row.check_in_at
                                                )}
                                            </td>

                                            {/* Check-out */}
                                            <td>
                                                {fmt(
                                                    row.check_out_at
                                                )}
                                            </td>

                                            {/* Duration */}
                                            <td>
                                                {duration(
                                                    row.check_in_at,
                                                    row.check_out_at
                                                )}
                                            </td>

                                            {/* Status */}
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

                                            {/* Location */}
                                            <td>
                                                {row.check_in_latitude ? (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${row.check_in_latitude},${row.check_in_longitude}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <FaMapMarkerAlt />
                                                        {" "}
                                                        View
                                                    </a>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                        </tr>
                                    ))}

                                {/* Empty */}
                                {!loading &&
                                    (!data.rows ||
                                        data.rows.length === 0) && (
                                        <tr>
                                            <td
                                                colSpan="8"
                                                className="table-state"
                                            >
                                                No attendance records
                                                match your filters.
                                            </td>
                                        </tr>
                                    )}

                            </tbody>
                        </table>

                    </div>

                    {/* ==================================
                        PAGINATION
                    ================================== */}

                    <div className="report-pagination">

                        <span>
                            Page {data.page || 1} of{" "}
                            {data.pages || 1}
                        </span>

                        <div>
                            <button
                                disabled={
                                    (data.page || 1) <= 1
                                }
                                onClick={() =>
                                    setFilters((current) => ({
                                        ...current,
                                        page:
                                            current.page - 1,
                                    }))
                                }
                            >
                                Previous
                            </button>

                            <button
                                disabled={
                                    (data.page || 1) >=
                                    (data.pages || 1)
                                }
                                onClick={() =>
                                    setFilters((current) => ({
                                        ...current,
                                        page:
                                            current.page + 1,
                                    }))
                                }
                            >
                                Next
                            </button>
                        </div>

                    </div>

                </section>
            </div>
        </div>
    );
}
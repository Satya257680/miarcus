import { useCallback, useEffect, useMemo, useState } from "react";

import {
    FaCalendarAlt,
    FaCamera,
    FaChartBar,
    FaCheckCircle,
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
    deleteAttendancePhoto,
    downloadAttendancePhoto,
    getAttendanceEmployees,
    getAttendancePhotoAccess,
    getAttendanceReports,
    getAttendanceStores,
} from "../services/attendanceService";

import "../styles/pages/Attendance.css";

// ======================================================
// INITIAL FILTERS
// ======================================================

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

// ======================================================
// DATE / TIME HELPERS
// ======================================================

const parseAttendanceDate = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    // MySQL DATETIME:
    // 2026-08-21 10:30:45
    //
    // Treat it explicitly as IST.
    const mysqlMatch = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/
    );

    if (mysqlMatch) {
        const [
            ,
            year,
            month,
            day,
            hour,
            minute,
            second,
        ] = mysqlMatch;

        const parsed = new Date(
            `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`
        );

        return Number.isNaN(parsed.getTime())
            ? null
            : parsed;
    }

    const parsed = new Date(text);

    return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
};

// ======================================================
// FORMAT DATE + TIME
// ======================================================

const fmt = (value) => {
    const date = parseAttendanceDate(value);

    if (!date) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: INDIA_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(date);
};

// ======================================================
// FORMAT WORK DATE
// ======================================================

const fmtDate = (value) => {
    if (!value) {
        return "—";
    }

    const text = String(value).slice(0, 10);

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {
        return text;
    }

    const [year, month, day] =
        text.split("-").map(Number);

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day
        )
    );

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            timeZone: INDIA_TIME_ZONE,
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    ).format(date);
};

// ======================================================
// DURATION
// ======================================================

const duration = (
    start,
    end
) => {
    const from =
        parseAttendanceDate(start);

    const to =
        parseAttendanceDate(end);

    if (!from || !to) {
        return "—";
    }

    const minutes = Math.max(
        0,
        Math.floor(
            (to.getTime() -
                from.getTime()) /
                60000
        )
    );

    return `${Math.floor(
        minutes / 60
    )}h ${String(
        minutes % 60
    ).padStart(2, "0")}m`;
};

// ======================================================
// CSV ESCAPE
// ======================================================

const csvEscape = (value) =>
    `"${String(
        value ?? ""
    ).replaceAll('"', '""')}"`;

// ======================================================
// LOCATION URL
// ======================================================

const getMapsUrl = (
    latitude,
    longitude
) => {
    if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined
    ) {
        return "";
    }

    if (
        !Number.isFinite(
            Number(latitude)
        ) ||
        !Number.isFinite(
            Number(longitude)
        )
    ) {
        return "";
    }

    return (
        `https://www.google.com/maps/search/?api=1&query=` +
        `${latitude},${longitude}`
    );
};

// ======================================================
// STATUS CLASS
// ======================================================

const getStatusClass = (
    status
) =>
    String(
        status || ""
    )
        .toLowerCase()
        .replace(/\s+/g, "-");

// ======================================================
// COMPONENT
// ======================================================

export default function AttendanceReports() {
    // ==================================================
    // DATA
    // ==================================================

    const [data, setData] = useState({
        rows: [],
        total: 0,
        pages: 1,
        page: 1,
        summary: {},
    });

    const [
        employees,
        setEmployees,
    ] = useState([]);

    const [
        stores,
        setStores,
    ] = useState([]);

    // ==================================================
    // FILTERS
    // ==================================================

    const [
        filters,
        setFilters,
    ] = useState({
        ...initialFilters,
    });

    // ==================================================
    // UI STATE
    // ==================================================

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        busy,
        setBusy,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        message,
        setMessage,
    ] = useState("");

    // ==================================================
    // PHOTO VIEWER
    // ==================================================

    const [
        photo,
        setPhoto,
    ] = useState(null);

    const [
        photoLoadingId,
        setPhotoLoadingId,
    ] = useState(null);

    useEffect(() => {
        return () => {
            if (photo?.url?.startsWith("blob:")) {
                URL.revokeObjectURL(photo.url);
            }
        };
    }, [photo]);

    // ==================================================
    // DELETE
    // ==================================================

    const [
        deleteId,
        setDeleteId,
    ] = useState(null);

    const [
        showDeleteAll,
        setShowDeleteAll,
    ] = useState(false);

    // ==================================================
    // LOAD REPORTS
    // ==================================================

    const load = useCallback(
        async () => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await getAttendanceReports(
                        filters
                    );

                setData({
                    rows:
                        response.rows || [],

                    total:
                        Number(
                            response.total || 0
                        ),

                    pages:
                        Number(
                            response.pages || 1
                        ),

                    page:
                        Number(
                            response.page ||
                                filters.page ||
                                1
                        ),

                    pageSize:
                        Number(
                            response.pageSize ||
                                filters.pageSize ||
                                10
                        ),

                    summary:
                        response.summary ||
                        {},
                });
            } catch (err) {
                setError(
                    err.response?.data
                        ?.message ||
                        "Unable to load attendance reports."
                );
            } finally {
                setLoading(false);
            }
        },
        [filters]
    );

    // ==================================================
    // LOAD EMPLOYEES + STORES
    // ==================================================

    useEffect(() => {
        let active = true;

        const loadFilterData =
            async () => {
                try {
                    const [
                        employeeResponse,
                        storeResponse,
                    ] =
                        await Promise.all([
                            getAttendanceEmployees(),
                            getAttendanceStores(),
                        ]);

                    if (!active) {
                        return;
                    }

                    setEmployees(
                        employeeResponse.data ||
                            []
                    );

                    setStores(
                        storeResponse.data ||
                            []
                    );
                } catch {
                    // Main report remains usable
                    // even if filter lists fail.
                }
            };

        loadFilterData();

        return () => {
            active = false;
        };
    }, []);

    // ==================================================
    // LOAD WHEN FILTERS CHANGE
    // ==================================================

    useEffect(() => {
        const timer =
            setTimeout(
                load,
                filters.search
                    ? 300
                    : 0
            );

        return () =>
            clearTimeout(timer);
    }, [
        load,
        filters.search,
    ]);

    // ==================================================
    // SET FILTER
    // ==================================================

    const set = (
        key,
        value
    ) => {
        setFilters(
            (current) => ({
                ...current,

                [key]: value,

                page: 1,
            })
        );
    };

    // ==================================================
    // CLEAR FILTERS
    // ==================================================

    const clearFilters = () => {
        setError("");
        setMessage("");

        setFilters({
            ...initialFilters,
        });
    };

    // ==================================================
    // ACTIVE FILTER COUNT
    // ==================================================

    const activeFilterCount =
        useMemo(
            () =>
                [
                    filters.search,
                    filters.userId,
                    filters.storeId,
                    filters.from,
                    filters.to,
                    filters.status,
                ].filter(Boolean)
                    .length,
            [filters]
        );

    const handlePhotoView = async (row, type) => {
        const photoPath =
            type === "check-in"
                ? row.check_in_photo
                : row.check_out_photo;

        if (!photoPath || !row?.id) return;

        const loadingKey = `${row.id}-${type}`;
        setPhotoLoadingId(loadingKey);
        setError("");

        try {
            const url = await getAttendancePhotoAccess(row.id, type);
            const timestamp = type === "check-in" ? row.check_in_at : row.check_out_at;
            const latitude = type === "check-in" ? row.check_in_latitude : row.check_out_latitude;
            const longitude = type === "check-in" ? row.check_in_longitude : row.check_out_longitude;

            setPhoto({
                url,
                id: row.id,
                type,
                fileName: `attendance-${row.id}-${type}.jpg`,
                title: `${row.name || "Employee"} · ${type === "check-in" ? "Check-in" : "Check-out"}`,
                subtitle: `${fmtDate(row.work_date)} · ${fmt(timestamp)}`,
                name: row.name || "Employee",
                employeeCode: row.employee_id || "",
                storeName: row.store_name || "Head Office",
                storeCode: row.store_code || "",
                timestamp,
                latitude,
                longitude,
            });
        } catch (error) {
            console.error("Unable to load attendance photo:", error);
            setError(
                error?.response?.data?.message ||
                error?.message ||
                "Unable to load attendance photo."
            );
        } finally {
            setPhotoLoadingId(null);
        }
    };

    const handlePhotoDownload = async () => {
        if (!photo?.id || !photo?.type) return;
        try {
            await downloadAttendancePhoto(photo.id, photo.type, photo.fileName);
        } catch (error) {
            console.error("Unable to download attendance photo:", error);
            setError("Unable to download attendance photo.");
        }
    };

    const handlePhotoDelete = async () => {
        if (!photo?.id || !photo?.type) return;

        const confirmed = window.confirm(
            `Delete this ${photo.type === "check-in" ? "check-in" : "check-out"} photo? This will remove only the photo, not the attendance record.`
        );
        if (!confirmed) return;

        try {
            setBusy(true);
            await deleteAttendancePhoto(photo.id, photo.type);
            if (photo.url?.startsWith("blob:")) URL.revokeObjectURL(photo.url);
            setPhoto(null);
            await load();
            setMessage("Attendance photo deleted successfully.");
        } catch (error) {
            console.error("Unable to delete attendance photo:", error);
            setError(
                error?.response?.data?.message ||
                "Unable to delete attendance photo."
            );
        } finally {
            setBusy(false);
        }
    };

    // ==================================================
    // EXPORT CSV
    // ==================================================

    const exportCsv =
        async () => {
            try {
                setBusy(true);
                setError("");

                const all =
                    await getAttendanceReports(
                        {
                            ...filters,

                            page: 1,

                            pageSize: 10000,
                        }
                    );

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
                    "Check-out Latitude",
                    "Check-out Longitude",
                    "Check-out Accuracy",
                    "Remarks",
                ];

                const rows =
                    (
                        all.rows ||
                        []
                    ).map(
                        (row) => [
                            fmtDate(
                                row.work_date
                            ),

                            row.name,

                            row.employee_id,

                            row.department,

                            row.designation,

                            row.store_name,

                            row.store_code,

                            row.status,

                            fmt(
                                row.check_in_at
                            ),

                            fmt(
                                row.check_out_at
                            ),

                            duration(
                                row.check_in_at,
                                row.check_out_at
                            ),

                            row.check_in_latitude,

                            row.check_in_longitude,

                            row.check_in_accuracy,

                            row.check_out_latitude,

                            row.check_out_longitude,

                            row.check_out_accuracy,

                            row.check_in_remarks ||
                                row.check_out_remarks,
                        ]
                    );

                const csv = [
                    header,
                    ...rows,
                ]
                    .map(
                        (row) =>
                            row
                                .map(
                                    csvEscape
                                )
                                .join(",")
                    )
                    .join("\n");

                const blob =
                    new Blob(
                        [csv],
                        {
                            type:
                                "text/csv;charset=utf-8",
                        }
                    );

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href = url;

                link.download =
                    `attendance-report-${new Date()
                        .toISOString()
                        .slice(
                            0,
                            10
                        )}.csv`;

                document.body.appendChild(
                    link
                );

                link.click();

                link.remove();

                URL.revokeObjectURL(
                    url
                );

                setMessage(
                    `${
                        rows.length
                    } attendance records exported successfully.`
                );
            } catch (err) {
                setError(
                    err.response?.data
                        ?.message ||
                        "Unable to export attendance records."
                );
            } finally {
                setBusy(false);
            }
        };

    // ==================================================
    // DELETE SINGLE
    // ==================================================

    const confirmDelete =
        async () => {
            if (!deleteId) {
                return;
            }

            try {
                setBusy(true);
                setError("");

                await deleteAttendanceRecord(
                    deleteId
                );

                setDeleteId(
                    null
                );

                setMessage(
                    "Attendance record deleted successfully."
                );

                await load();
            } catch (err) {
                setError(
                    err.response?.data
                        ?.message ||
                        "Unable to delete attendance record."
                );
            } finally {
                setBusy(false);
            }
        };

    // ==================================================
    // DELETE ALL
    // ==================================================

    const confirmDeleteAll =
        async () => {
            try {
                setBusy(true);
                setError("");

                await deleteAllAttendance();

                setShowDeleteAll(
                    false
                );

                setMessage(
                    "All attendance records were deleted successfully."
                );

                setFilters({
                    ...initialFilters,
                });

                await load();
            } catch (err) {
                setError(
                    err.response?.data
                        ?.message ||
                        "Unable to delete attendance records."
                );
            } finally {
                setBusy(false);
            }
        };

    // ==================================================
    // SUMMARY
    // ==================================================

    const summary =
        data.summary || {};

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="attendance-page">
            <div className="attendance-shell">

                {/* ==================================================
                    PAGE HEADER
                ================================================== */}

                <header className="attendance-hero report-page-hero">

                    <div>
                        <div className="attendance-eyebrow">
                            <FaChartBar />

                            Workforce
                            analytics
                        </div>

                        <h1>
                            Attendance
                            Reports
                        </h1>

                        <p>
                            Monitor employee
                            attendance,
                            working duration,
                            location evidence
                            and attendance
                            photos from one
                            professional
                            workspace.
                        </p>
                    </div>

                    <div className="report-header-actions">

                        <button
                            type="button"
                            className="attendance-btn secondary"
                            onClick={
                                clearFilters
                            }
                            disabled={
                                busy
                            }
                        >
                            <FaTimes />

                            Clear Filters

                            {activeFilterCount >
                                0 && (
                                <span className="button-count">
                                    {
                                        activeFilterCount
                                    }
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            className="attendance-btn secondary danger-outline"
                            onClick={() =>
                                setShowDeleteAll(
                                    true
                                )
                            }
                            disabled={
                                busy ||
                                !data.total
                            }
                        >
                            <FaTrash />

                            Delete All
                        </button>

                        <button
                            type="button"
                            className="attendance-btn primary"
                            onClick={
                                exportCsv
                            }
                            disabled={
                                busy ||
                                !data.total
                            }
                        >
                            <FaDownload />

                            {busy
                                ? "Working…"
                                : "Export CSV"}
                        </button>

                    </div>

                </header>

                {/* ==================================================
                    ALERTS
                ================================================== */}

                {error && (
                    <div className="attendance-alert error">
                        <FaTimesCircle />

                        <span>
                            {error}
                        </span>
                    </div>
                )}

                {message && (
                    <div className="attendance-alert success">
                        <FaCheckCircle />

                        <span>
                            {message}
                        </span>
                    </div>
                )}

                {/* ==================================================
                    FILTER PANEL
                ================================================== */}

                <section className="attendance-card report-filters">

                    <div className="report-section-head">

                        <div>
                            <span className="card-kicker">
                                Smart filters
                            </span>

                            <h2>
                                Attendance
                                search
                            </h2>

                            <p>
                                Search and
                                narrow records
                                without leaving
                                the report.
                            </p>
                        </div>

                        <div className="filter-head-icon">
                            <FaSearch />
                        </div>

                    </div>

                    <div className="attendance-report-filter-grid">

                        {/* SEARCH */}

                        <label className="attendance-report-search-field">

                            <span>
                                Search
                            </span>

                            <div className="attendance-report-search-control">

                                <FaSearch />

                                <input
                                    type="search"
                                    value={
                                        filters.search
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        set(
                                            "search",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Employee, ID, email or store…"
                                />

                                {filters.search && (
                                    <button
                                        type="button"
                                        className="search-clear"
                                        onClick={() =>
                                            set(
                                                "search",
                                                ""
                                            )
                                        }
                                        aria-label="Clear search"
                                    >
                                        <FaTimes />
                                    </button>
                                )}

                            </div>

                        </label>

                        {/* EMPLOYEE */}

                        <label>

                            <span>
                                Employee
                            </span>

                            <select
                                value={
                                    filters.userId
                                }
                                onChange={(
                                    event
                                ) =>
                                    set(
                                        "userId",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    All employees
                                </option>

                                {employees.map(
                                    (
                                        employee
                                    ) => (
                                        <option
                                            key={
                                                employee.id
                                            }
                                            value={
                                                employee.id
                                            }
                                        >
                                            {
                                                employee.name
                                            }{" "}
                                            (
                                            {
                                                employee.employee_id
                                            }
                                            )
                                        </option>
                                    )
                                )}
                            </select>

                        </label>

                        {/* STORE */}

                        <label>

                            <span>
                                Store
                            </span>

                            <select
                                value={
                                    filters.storeId
                                }
                                onChange={(
                                    event
                                ) =>
                                    set(
                                        "storeId",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    All stores
                                </option>

                                {stores.map(
                                    (
                                        store
                                    ) => (
                                        <option
                                            key={
                                                store.id
                                            }
                                            value={
                                                store.id
                                            }
                                        >
                                            {
                                                store.store_name
                                            }{" "}
                                            (
                                            {
                                                store.store_code
                                            }
                                            )
                                        </option>
                                    )
                                )}
                            </select>

                        </label>

                        {/* STATUS */}

                        <label>

                            <span>
                                Status
                            </span>

                            <select
                                value={
                                    filters.status
                                }
                                onChange={(
                                    event
                                ) =>
                                    set(
                                        "status",
                                        event
                                            .target
                                            .value
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

                        {/* FROM */}

                        <label>

                            <span>
                                From date
                            </span>

                            <div className="date-control">
                                <FaCalendarAlt />

                                <input
                                    type="date"
                                    value={
                                        filters.from
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        set(
                                            "from",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </div>

                        </label>

                        {/* TO */}

                        <label>

                            <span>
                                To date
                            </span>

                            <div className="date-control">
                                <FaCalendarAlt />

                                <input
                                    type="date"
                                    value={
                                        filters.to
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        set(
                                            "to",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </div>

                        </label>

                    </div>

                </section>

                {/* ==================================================
                    KPI CARDS
                ================================================== */}

                <section className="attendance-kpis report-kpis">

                    <div className="attendance-kpi">
                        <span>
                            Total records
                        </span>

                        <strong>
                            {summary.total ||
                                0}
                        </strong>

                        <small>
                            Matching your
                            filters
                        </small>
                    </div>

                    <div className="attendance-kpi">
                        <span>
                            Present
                        </span>

                        <strong className="active">
                            {Number(
                                summary.present ||
                                    0
                            ) +
                                Number(
                                    summary.completed ||
                                        0
                                )}
                        </strong>

                        <small>
                            Employees with
                            attendance
                        </small>
                    </div>

                    <div className="attendance-kpi">
                        <span>
                            Late check-ins
                        </span>

                        <strong className="ready">
                            {summary.late ||
                                0}
                        </strong>

                        <small>
                            After 09:15 AM
                        </small>
                    </div>

                    <div className="attendance-kpi">
                        <span>
                            Open sessions
                        </span>

                        <strong className="active">
                            {summary.open_sessions ||
                                0}
                        </strong>

                        <small>
                            Currently checked
                            in
                        </small>
                    </div>

                </section>

                {/* ==================================================
                    TABLE
                ================================================== */}

                <section className="attendance-card report-table-card">

                    <div className="report-table-head">

                        <div>
                            <span className="card-kicker">
                                Live records
                            </span>

                            <h2>
                                Attendance
                                register
                            </h2>

                            <p>
                                Detailed employee
                                attendance
                                activity.
                            </p>
                        </div>

                        <div className="record-count-wrap">

                            <FaUsers />

                            <span className="record-count">
                                {data.total ||
                                    0}{" "}
                                records
                            </span>

                        </div>

                    </div>

                    <div className="attendance-table-wrap">

                        <table className="attendance-table attendance-report-table">

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

                                    <th>
                                        Check-in
                                        Photo
                                    </th>

                                    <th>
                                        Check-out
                                        Photo
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>
                            </thead>

                            <tbody>

                                {loading && (
                                    <tr>
                                        <td
                                            colSpan="11"
                                            className="table-state"
                                        >
                                            <div className="table-loading">
                                                <span />
                                                Loading
                                                attendance
                                                records…
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    data.rows
                                        ?.length >
                                        0 &&
                                    data.rows.map(
                                        (
                                            row
                                        ) => {

                                            const checkInPhoto =
                                                row.check_in_photo || "";

                                            const checkOutPhoto =
                                                row.check_out_photo || "";

                                            const locationUrl =
                                                getMapsUrl(
                                                    row.check_in_latitude,
                                                    row.check_in_longitude
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        row.id
                                                    }
                                                >

                                                    {/* EMPLOYEE */}

                                                    <td className="employee-cell">

                                                        <div className="employee-primary">
                                                            {
                                                                row.name ||
                                                                    "—"
                                                            }
                                                        </div>

                                                        <div className="employee-secondary">
                                                            {
                                                                row.employee_id ||
                                                                    "—"
                                                            }

                                                            {row.department && (
                                                                <>
                                                                    <span>
                                                                        ·
                                                                    </span>

                                                                    {
                                                                        row.department
                                                                    }
                                                                </>
                                                            )}
                                                        </div>

                                                    </td>

                                                    {/* STORE */}

                                                    <td className="store-cell">

                                                        <strong>
                                                            {
                                                                row.store_name ||
                                                                    "—"
                                                            }
                                                        </strong>

                                                        {row.store_code && (
                                                            <small>
                                                                {
                                                                    row.store_code
                                                                }
                                                            </small>
                                                        )}

                                                    </td>

                                                    {/* DATE */}

                                                    <td>
                                                        <span className="date-value">
                                                            {fmtDate(
                                                                row.work_date
                                                            )}
                                                        </span>
                                                    </td>

                                                    {/* CHECK-IN */}

                                                    <td>
                                                        <span className="time-value">
                                                            {fmt(
                                                                row.check_in_at
                                                            )}
                                                        </span>
                                                    </td>

                                                    {/* CHECK-OUT */}

                                                    <td>
                                                        <span className="time-value">
                                                            {fmt(
                                                                row.check_out_at
                                                            )}
                                                        </span>
                                                    </td>

                                                    {/* DURATION */}

                                                    <td>
                                                        <span className="duration-value">
                                                            {duration(
                                                                row.check_in_at,
                                                                row.check_out_at
                                                            )}
                                                        </span>
                                                    </td>

                                                    {/* STATUS */}

                                                    <td>

                                                        <span
                                                            className={`attendance-status ${getStatusClass(
                                                                row.status
                                                            )}`}
                                                        >
                                                            <i />

                                                            {
                                                                row.status ||
                                                                    "Unknown"
                                                            }
                                                        </span>

                                                    </td>

                                                    {/* LOCATION */}

                                                    <td>

                                                        {locationUrl ? (
                                                            <a
                                                                className="report-action-link"
                                                                href={
                                                                    locationUrl
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <FaMapMarkerAlt />

                                                                View
                                                            </a>
                                                        ) : (
                                                            <span className="table-muted">
                                                                —
                                                            </span>
                                                        )}

                                                    </td>

                                                    {/* CHECK-IN PHOTO */}

                                                    <td>

                                                        {checkInPhoto ? (
                                                            <button
                                                                type="button"
                                                                className="report-photo-button"
                                                                disabled={
                                                                    photoLoadingId === `${row.id}-check-in`
                                                                }
                                                                onClick={() =>
                                                                    handlePhotoView(
                                                                        row,
                                                                        "check-in"
                                                                    )
                                                                }
                                                            >
                                                                <FaCamera />

                                                                {photoLoadingId === `${row.id}-check-in`
                                                                    ? "Loading…"
                                                                    : "View"}
                                                            </button>
                                                        ) : (
                                                            <span className="table-muted">
                                                                —
                                                            </span>
                                                        )}

                                                    </td>

                                                    {/* CHECK-OUT PHOTO */}

                                                    <td>

                                                        {checkOutPhoto ? (
                                                            <button
                                                                type="button"
                                                                className="report-photo-button"
                                                                disabled={
                                                                    photoLoadingId === `${row.id}-check-out`
                                                                }
                                                                onClick={() =>
                                                                    handlePhotoView(
                                                                        row,
                                                                        "check-out"
                                                                    )
                                                                }
                                                            >
                                                                <FaCamera />

                                                                {photoLoadingId === `${row.id}-check-out`
                                                                    ? "Loading…"
                                                                    : "View"}
                                                            </button>
                                                        ) : (
                                                            <span className="table-muted">
                                                                —
                                                            </span>
                                                        )}

                                                    </td>

                                                    {/* DELETE */}

                                                    <td>

                                                        <button
                                                            type="button"
                                                            className="report-delete-button"
                                                            onClick={() =>
                                                                setDeleteId(
                                                                    row.id
                                                                )
                                                            }
                                                            disabled={
                                                                busy
                                                            }
                                                            title="Delete attendance record"
                                                        >
                                                            <FaTrash />

                                                            Delete
                                                        </button>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                {!loading &&
                                    (
                                        !data.rows ||
                                        data.rows.length ===
                                            0
                                    ) && (
                                        <tr>
                                            <td
                                                colSpan="11"
                                                className="table-state"
                                            >
                                                <div className="empty-report">

                                                    <div>
                                                        <FaSearch />
                                                    </div>

                                                    <strong>
                                                        No attendance
                                                        records found
                                                    </strong>

                                                    <span>
                                                        Try changing
                                                        your search
                                                        or filters.
                                                    </span>

                                                    {activeFilterCount >
                                                        0 && (
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                clearFilters
                                                            }
                                                        >
                                                            Clear
                                                            filters
                                                        </button>
                                                    )}

                                                </div>
                                            </td>
                                        </tr>
                                    )}

                            </tbody>

                        </table>

                    </div>

                    {/* ==================================================
                        PAGINATION
                    ================================================== */}

                    <div className="report-pagination">

                        <div className="pagination-summary">

                            Showing page{" "}
                            <strong>
                                {data.page ||
                                    1}
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {data.pages ||
                                    1}
                            </strong>

                        </div>

                        <div className="pagination-buttons">

                            <button
                                type="button"
                                disabled={
                                    (data.page ||
                                        1) <=
                                        1 ||
                                    busy
                                }
                                onClick={() =>
                                    setFilters(
                                        (
                                            current
                                        ) => ({
                                            ...current,

                                            page:
                                                Math.max(
                                                    1,
                                                    current.page -
                                                        1
                                                ),
                                        })
                                    )
                                }
                            >
                                Previous
                            </button>

                            <span className="pagination-current">
                                {data.page ||
                                    1}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    (data.page ||
                                        1) >=
                                        (data.pages ||
                                            1) ||
                                    busy
                                }
                                onClick={() =>
                                    setFilters(
                                        (
                                            current
                                        ) => ({
                                            ...current,

                                            page:
                                                current.page +
                                                1,
                                        })
                                    )
                                }
                            >
                                Next
                            </button>

                        </div>

                    </div>

                </section>

            </div>

            {/* ======================================================
                FULL-SCREEN ATTENDANCE PHOTO VIEWER
            ====================================================== */}

            {photo && (
                <div
                    className="attendance-photo-modal"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setPhoto(null)}
                >
                    <button
                        type="button"
                        className="attendance-photo-close"
                        onClick={() => setPhoto(null)}
                        aria-label="Close photo"
                    >
                        <FaTimes />
                    </button>

                    <div
                        className="attendance-photo-fullscreen"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="attendance-photo-image-area">
                            <img
                                src={photo.url}
                                alt={photo.title}
                                className="attendance-photo-full-image"
                            />
                        </div>

                        <div className="attendance-photo-info-bar">
                            <div className="attendance-photo-info">
                                <span className="attendance-photo-kicker">Attendance</span>
                                <h2>Attendance attachment</h2>
                                <p>
                                    Uploaded by <strong>{photo.name}</strong>
                                    {photo.employeeCode ? ` (${photo.employeeCode})` : ""}
                                    {photo.timestamp ? ` · ${fmt(photo.timestamp)}` : ""}
                                </p>
                                <div className="attendance-photo-location">
                                    <FaMapMarkerAlt />
                                    <strong>{photo.storeName}</strong>
                                    {photo.storeCode ? <span>{photo.storeCode}</span> : null}
                                    {photo.latitude !== null && photo.longitude !== null ? (
                                        <span>{Number(photo.latitude).toFixed(6)}, {Number(photo.longitude).toFixed(6)}</span>
                                    ) : null}
                                </div>
                            </div>

                            <div className="attendance-photo-actions">
                                <button
                                    type="button"
                                    className="attendance-photo-download"
                                    onClick={handlePhotoDownload}
                                    disabled={busy}
                                >
                                    <FaDownload />
                                    Download
                                </button>
                                <button
                                    type="button"
                                    className="attendance-photo-delete"
                                    onClick={handlePhotoDelete}
                                    disabled={busy}
                                >
                                    <FaTrash />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================
                DELETE SINGLE
            ====================================================== */}

            <ConfirmDialog
                open={Boolean(
                    deleteId
                )}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this attendance record? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                loading={busy}
                confirmVariant="danger"
                onConfirm={
                    confirmDelete
                }
                onCancel={() =>
                    setDeleteId(
                        null
                    )
                }
            />

            {/* ======================================================
                DELETE ALL
            ====================================================== */}

            <ConfirmDialog
                open={
                    showDeleteAll
                }
                title="Delete All Attendance"
                message="Are you sure you want to delete ALL attendance records? This will permanently remove the attendance history and stored attendance photos."
                confirmText="Delete All"
                cancelText="Cancel"
                loading={busy}
                confirmVariant="danger"
                onConfirm={
                    confirmDeleteAll
                }
                onCancel={() =>
                    setShowDeleteAll(
                        false
                    )
                }
            />

        </div>
    );
}
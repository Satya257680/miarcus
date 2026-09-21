import { useEffect, useMemo, useState } from "react";


// ======================================================
// COMMON COMPONENTS
// ======================================================

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";


// ======================================================
// ICONS
// ======================================================

import {
    FaEye,
    FaTrash,
    FaMapMarkerAlt,
    FaDownload
} from "react-icons/fa";


// ======================================================
// STYLE
// ======================================================
//
// Reuses the Checklist Reports table styling (same DataTable/Card/
// FilterBar/status-badge classes) so this page looks consistent with
// the rest of the app without duplicating a stylesheet.

import "../styles/ChecklistReports.css";
import { exportTableData } from "../utils/exportUtils.js";


// ======================================================
// ATTENDANCE API
// ======================================================
//
// BUG FIX: this file used to be an accidental copy of
// pages/ChecklistReports.jsx — it fetched `/api/checklist-reports`
// and rendered Checklist Report rows (Question/Answer/Checklist Type)
// under the "Attendance Reports" heading, which is why opening
// Attendance Reports actually showed Checklist Report data. A real,
// working Attendance API + service already existed
// (services/attendanceService.js — getAttendanceReports,
// getAttendanceEmployees, getAttendanceStores, deleteAttendanceRecord,
// deleteAllAttendance, photo access) but was never wired up to any
// page. This rewrite uses that service instead.

import {
    getAttendanceReports,
    getAttendanceEmployees,
    getAttendanceStores,
    deleteAttendanceRecord,
    deleteAllAttendance,
    getAttendancePhotoAccess,
    downloadAttendancePhoto
} from "../services/attendanceService.js";


// ======================================================
// COMPONENT
// ======================================================

function AttendanceReports() {

    // ======================================================
    // STATES
    // ======================================================

    const [records, setRecords] = useState([]);

    const [summary, setSummary] = useState({});

    const [stores, setStores] = useState([]);

    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);

    const [loadError, setLoadError] = useState(false);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // ======================================================
    // FILTERS
    // ======================================================

    const [fromDate, setFromDate] = useState("");

    const [toDate, setToDate] = useState("");

    const [selectedStore, setSelectedStore] = useState("");

    const [selectedEmployee, setSelectedEmployee] = useState("");

    const [selectedStatus, setSelectedStatus] = useState("");

    // ======================================================
    // PAGINATION
    // ======================================================

    const [currentPage, setCurrentPage] = useState(1);

    const [pageSize, setPageSize] = useState(10);

    // ======================================================
    // MODALS
    // ======================================================

    const [showViewModal, setShowViewModal] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

    // ======================================================
    // SELECTED DATA
    // ======================================================

    const [selectedRecord, setSelectedRecord] = useState(null);

    const [deleteId, setDeleteId] = useState(null);

    const [photoPreview, setPhotoPreview] = useState({ loading: false, url: "", type: "" });

    // ======================================================
    // RBAC
    // ======================================================
    //
    // Attendance Reports (server/routes/attendanceRoutes.js) restrict
    // every reporting endpoint — reports/employees/stores/photos/
    // delete — to an administrator or a user with Full Attendance
    // access. There is no separate view-only tier on the backend for
    // this page, so the frontend mirrors that exactly instead of
    // reusing the generic View/Add/Edit/Full permission ladder the
    // other report pages use.

    const user = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    const permissions = JSON.parse(
        localStorage.getItem("permissions") || "{}"
    );

    const isAdmin =
        user.administrator === true ||
        user.administrator === 1;

    const permission = isAdmin
        ? "Full"
        : permissions["Attendance"] || "None";

    const canView = permission === "Full";

    const canDelete = permission === "Full";

    // ======================================================
    // LOAD DATA
    //
    // BUG FIX ("blank on refresh, appears on the next refresh"): the
    // Checklist Reports version of this pattern used Promise.allSettled
    // and silently set the list to [] on a failed request with no
    // retry and no visible error — a transient failure (a cold-start
    // lazy-dependency hiccup, a dropped connection) looked exactly like
    // "no records" until the user manually refreshed. This retries the
    // main Reports request once automatically before giving up.
    // ======================================================

    const loadReports = async (attempt = 1) => {

        try {
            const data = await getAttendanceReports({
                page: 1,
                pageSize: 10000,
                search,
                userId: selectedEmployee,
                storeId: selectedStore,
                from: fromDate,
                to: toDate,
                status: selectedStatus
            });

            setRecords(data.rows || []);
            setSummary(data.summary || {});
            setLoadError(false);

        } catch (err) {

            if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 900));
                return loadReports(attempt + 1);
            }

            console.error("Attendance Reports Error:", err);
            setRecords([]);
            setLoadError(true);
        }

    };

    const loadFilters = async () => {

        try {
            const [employeeRes, storeRes] = await Promise.allSettled([
                getAttendanceEmployees(),
                getAttendanceStores()
            ]);

            setEmployees(
                employeeRes.status === "fulfilled"
                    ? employeeRes.value.data || []
                    : []
            );

            setStores(
                storeRes.status === "fulfilled"
                    ? storeRes.value.data || []
                    : []
            );

        } catch (err) {
            console.error("Attendance filters error:", err);
        }

    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([loadReports(), loadFilters()]);
        setLoading(false);
    };

    // Silent refresh — same fetch as loadData(), but never flips
    // `loading` to true so a background refresh (window focus) never
    // swaps the page out for the "Loading..." screen.
    const silentRefresh = async () => {
        await loadReports();
    };

    useEffect(() => {

        if (!canView) {
            setLoading(false);
            return;
        }

        loadData();

        const handleFocus = () => {
            if (showViewModal || showDeleteDialog || showDeleteAllDialog) {
                return;
            }
            silentRefresh();
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("focus", handleFocus);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        canView,
        showViewModal,
        showDeleteDialog,
        showDeleteAllDialog
    ]);

    // Re-run the reports query (server-side filtering) whenever a
    // filter changes — the employee/store lists don't need reloading.
    useEffect(() => {
        if (!canView) return;
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, selectedStore, selectedEmployee, selectedStatus, fromDate, toDate]);

    // ======================================================
    // VIEW RECORD
    // ======================================================

    const handleView = (row) => {
        if (!canView) return;
        setSelectedRecord(row);
        setShowViewModal(true);
    };

    // ======================================================
    // VIEW PHOTO
    // ======================================================

    const handleViewPhoto = async (row, type) => {

        const hasPhoto = type === "check-in" ? row.check_in_photo : row.check_out_photo;
        if (!hasPhoto) return;

        setPhotoPreview({ loading: true, url: "", type });

        try {
            const url = await getAttendancePhotoAccess(row.id, type);
            setPhotoPreview({ loading: false, url, type });
        } catch (err) {
            console.error(err);
            alert("Unable to load attendance photo.");
            setPhotoPreview({ loading: false, url: "", type: "" });
        }

    };

    const closePhotoPreview = () => {
        if (photoPreview.url) {
            URL.revokeObjectURL(photoPreview.url);
        }
        setPhotoPreview({ loading: false, url: "", type: "" });
    };

    const handleDownloadPhoto = async (row, type) => {
        try {
            await downloadAttendancePhoto(
                row.id,
                type,
                `attendance-${row.id}-${type}.jpg`
            );
        } catch (err) {
            console.error(err);
            alert("Unable to download attendance photo.");
        }
    };

    // ======================================================
    // DELETE
    // ======================================================

    const handleDelete = (id) => {
        if (!canDelete) return;
        setDeleteId(id);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteAttendanceRecord(deleteId);
            await loadReports();
        } catch (err) {
            console.error(err);
            alert(
                err.response?.data?.message ||
                "Unable to delete attendance record."
            );
        } finally {
            setDeleteId(null);
            setShowDeleteDialog(false);
        }
    };

    const handleDeleteAll = () => {
        if (!canDelete) return;
        if (!filteredRecords.length) {
            alert("No Attendance Records found.");
            return;
        }
        setShowDeleteAllDialog(true);
    };

    const confirmDeleteAll = async () => {
        try {
            const response = await deleteAllAttendance();
            alert(response?.message || "All attendance records were deleted successfully.");
            setCurrentPage(1);
            await loadReports();
        } catch (err) {
            console.error(err);
            alert(
                err.response?.data?.message ||
                "Unable to delete attendance records."
            );
        } finally {
            setShowDeleteAllDialog(false);
        }
    };

    // ======================================================
    // EXPORT CSV
    // ======================================================

    const handleExport = async (format = "csv") => {

        if (!filteredRecords.length) {
            alert("No records found.");
            return;
        }

        const rows = filteredRecords.map((r) => ({
            "Work Date": formatDateOnly(r.work_date),
            Status: r.status,
            Employee: r.name,
            "Employee ID": r.employee_id || "-",
            Department: r.department || "-",
            Designation: r.designation || "-",
            Store: r.store_name || "-",
            "Check-in At": formatDateTime(r.check_in_at),
            "Check-in Latitude": r.check_in_latitude ?? "-",
            "Check-in Longitude": r.check_in_longitude ?? "-",
            "Check-out At": formatDateTime(r.check_out_at),
            "Check-out Latitude": r.check_out_latitude ?? "-",
            "Check-out Longitude": r.check_out_longitude ?? "-",
            "Check-in Remarks": r.check_in_remarks || "-",
            "Check-out Remarks": r.check_out_remarks || "-"
        }));

        await exportTableData({
            headers: Object.keys(rows[0]),
            rows: rows.map((row) => Object.values(row)),
            filename: "AttendanceReports",
            format,
            title: "Attendance Reports",
        });

    };

    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {
        setSearch("");
        setFromDate("");
        setToDate("");
        setSelectedStore("");
        setSelectedEmployee("");
        setSelectedStatus("");
        setCurrentPage(1);
    };

    // ======================================================
    // CLIENT-SIDE SEARCH (server already filters store/employee/status/
    // date — search narrows further across name/id/store already
    // loaded for the selected filters).
    // ======================================================

    const filteredRecords = useMemo(() => {

        if (!search) return records;

        const q = search.toLowerCase();

        return records.filter((item) =>
            item.name?.toLowerCase().includes(q) ||
            item.employee_id?.toLowerCase?.().includes(q) ||
            item.store_name?.toLowerCase().includes(q) ||
            item.department?.toLowerCase().includes(q)
        );

    }, [records, search]);

    // ======================================================
    // PAGINATION
    // ======================================================

    const totalRecords = filteredRecords.length;

    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

    const startIndex = (currentPage - 1) * pageSize;

    const currentRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize, search, selectedStore, selectedEmployee, selectedStatus, fromDate, toDate]);

    useEffect(() => {
        const pages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
        if (currentPage > pages) setCurrentPage(pages);
    }, [filteredRecords.length, pageSize, currentPage]);

    // ======================================================
    // FORMAT HELPERS
    // ======================================================

    const formatDateTime = (value) => {
        if (!value) return "-";
        // Backend already formats as 'YYYY-MM-DD HH:mm:ss' (Asia/Kolkata) —
        // treat it as local rather than routing it through `new Date()`
        // (which would otherwise interpret it as UTC and shift the time).
        const [datePart, timePart] = String(value).split(" ");
        if (!datePart) return "-";
        const [y, m, d] = datePart.split("-");
        return `${d}/${m}/${y}${timePart ? `, ${timePart}` : ""}`;
    };

    const formatDateOnly = (value) => {
        if (!value) return "-";
        const [y, m, d] = String(value).split("-");
        if (!y || !m || !d) return String(value);
        return `${d}/${m}/${y}`;
    };

    // ======================================================
    // ACCESS DENIED
    // ======================================================

    if (!canView) {
        return (
            <div className="no-permission">
                <h2>Access Denied</h2>
                <p>
                    You don't have permission to view Attendance Reports.
                    This requires administrator or Full Attendance access.
                </p>
            </div>
        );
    }

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {
        return (
            <div className="reports-loading">
                Loading Attendance Reports...
            </div>
        );
    }

    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        {
            key: "work_date",
            title: "Work Date",
            render: (row) => formatDateOnly(row.work_date)
        },

        {
            key: "status",
            title: "Status",
            render: (row) => (
                <span
                    className={`status-badge ${(row.status || "Present")
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                >
                    {row.status || "Present"}
                </span>
            )
        },

        {
            key: "name",
            title: "Employee",
            render: (row) => row.name || "-"
        },

        {
            key: "employee_id",
            title: "Employee ID",
            render: (row) => row.employee_id || "-"
        },

        {
            key: "department",
            title: "Department",
            render: (row) => row.department || "-"
        },

        {
            key: "designation",
            title: "Designation",
            render: (row) => row.designation || "-"
        },

        {
            key: "store_name",
            title: "Store",
            render: (row) => row.store_name || "-"
        },

        {
            key: "check_in_at",
            title: "Check-in At",
            render: (row) => formatDateTime(row.check_in_at)
        },

        {
            key: "check_in_photo",
            title: "Check-in Photo",
            align: "center",
            render: (row) => (
                row.check_in_photo ? (
                    <button
                        type="button"
                        className="table-link"
                        onClick={() => handleViewPhoto(row, "check-in")}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                        View
                    </button>
                ) : "-"
            )
        },

        {
            key: "check_in_location",
            title: "Check-in Location",
            render: (row) => (
                row.check_in_latitude && row.check_in_longitude ? (
                    <a
                        href={`https://www.google.com/maps?q=${row.check_in_latitude},${row.check_in_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-link"
                    >
                        <FaMapMarkerAlt />{" "}View Map
                    </a>
                ) : "-"
            )
        },

        {
            key: "check_out_at",
            title: "Check-out At",
            render: (row) => formatDateTime(row.check_out_at)
        },

        {
            key: "check_out_photo",
            title: "Check-out Photo",
            align: "center",
            render: (row) => (
                row.check_out_photo ? (
                    <button
                        type="button"
                        className="table-link"
                        onClick={() => handleViewPhoto(row, "check-out")}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                        View
                    </button>
                ) : "-"
            )
        },

        {
            key: "check_out_location",
            title: "Check-out Location",
            render: (row) => (
                row.check_out_latitude && row.check_out_longitude ? (
                    <a
                        href={`https://www.google.com/maps?q=${row.check_out_latitude},${row.check_out_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-link"
                    >
                        <FaMapMarkerAlt />{" "}View Map
                    </a>
                ) : "-"
            )
        },

        {
            key: "actions",
            title: "Actions",
            minWidth: "220px",
            width: "220px",
            align: "center",
            render: (row) => (
                <div className="action-buttons">

                    <button
                        type="button"
                        className="view-btn"
                        onClick={() => handleView(row)}
                    >
                        <FaEye />
                        <span>View</span>
                    </button>

                    {canDelete && (
                        <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(row.id)}
                        >
                            <FaTrash />
                            <span>Delete</span>
                        </button>
                    )}

                </div>
            )
        }
    ];

    return (

        <div className="checklist-reports-page">

            <PageHeader
                title="Attendance Reports"
                subtitle="Manage employee check-in and check-out attendance records."
            />

            {loadError && (
                <div className="reports-loading" style={{ color: "#b91c1c" }}>
                    Unable to load Attendance Reports right now. Showing what's cached —
                    <button
                        type="button"
                        className="table-link"
                        style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer" }}
                        onClick={() => loadReports()}
                    >
                        try again
                    </button>.
                </div>
            )}

            <PageToolbar
                search={search}
                setSearch={setSearch}
                placeholder="Search Attendance Reports..."
                showAdd={false}
                showExport={canView}
                onExport={handleExport}
                showBulkUpload={false}
                showDeleteAll={canDelete}
                onDeleteAll={handleDeleteAll}
            />

            <FilterBar onClear={handleClearFilters}>

                <div className="filter-group">
                    <label>From Date</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label>To Date</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label>Status</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Completed">Completed</option>
                        <option value="Absent">Absent</option>
                        <option value="On Leave">On Leave</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Store</label>
                    <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                    >
                        <option value="">All Stores</option>
                        {stores.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.store_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Employee</label>
                    <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                    >
                        <option value="">All Employees</option>
                        {employees.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}{item.employee_id ? ` (${item.employee_id})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

            </FilterBar>

            <Card title="Attendance Report List">

                <DataTable
                    columns={columns}
                    data={currentRecords}
                    loading={loading}
                    emptyTitle="No Records Found"
                    emptyDescription="There are no Attendance Records available."
                />

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                />

            </Card>

            {/* ======================================================
                DELETE CONFIRMATION
            ====================================================== */}

            <ConfirmDialog
                open={showDeleteDialog}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this attendance record? Its photos will also be removed."
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteId(null);
                    setShowDeleteDialog(false);
                }}
            />

            <ConfirmDialog
                open={showDeleteAllDialog}
                title="Delete All Attendance Records"
                message="Are you sure you want to delete all available Attendance Records? This cannot be undone."
                confirmText="Delete All"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={confirmDeleteAll}
                onCancel={() => setShowDeleteAllDialog(false)}
            />

            {/* ======================================================
                VIEW MODAL
            ====================================================== */}

            {showViewModal && selectedRecord && (
                <div className="modal-overlay">
                    <div className="report-modal">

                        <div className="modal-header">
                            <h3>Attendance Record Details</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowViewModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">

                            <div className="detail-grid">

                                <div>
                                    <strong>Employee</strong>
                                    <p>{selectedRecord.name || "-"}</p>
                                </div>

                                <div>
                                    <strong>Employee ID</strong>
                                    <p>{selectedRecord.employee_id || "-"}</p>
                                </div>

                                <div>
                                    <strong>Department</strong>
                                    <p>{selectedRecord.department || "-"}</p>
                                </div>

                                <div>
                                    <strong>Designation</strong>
                                    <p>{selectedRecord.designation || "-"}</p>
                                </div>

                                <div>
                                    <strong>Store</strong>
                                    <p>{selectedRecord.store_name || "-"}</p>
                                </div>

                                <div>
                                    <strong>Status</strong>
                                    <p>{selectedRecord.status || "-"}</p>
                                </div>

                                <div>
                                    <strong>Work Date</strong>
                                    <p>{formatDateOnly(selectedRecord.work_date)}</p>
                                </div>

                            </div>

                            <hr />

                            <div className="question-section">

                                <h4>Check-in At</h4>
                                <p>{formatDateTime(selectedRecord.check_in_at)}</p>

                                <h4>Check-in Remarks</h4>
                                <p>{selectedRecord.check_in_remarks || "-"}</p>

                                <h4>Check-out At</h4>
                                <p>{formatDateTime(selectedRecord.check_out_at)}</p>

                                <h4>Check-out Remarks</h4>
                                <p>{selectedRecord.check_out_remarks || "-"}</p>

                            </div>

                            <div className="map-section" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>

                                {selectedRecord.check_in_latitude && selectedRecord.check_in_longitude ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${selectedRecord.check_in_latitude},${selectedRecord.check_in_longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="map-link"
                                    >
                                        <FaMapMarkerAlt />{" "}Check-in Location
                                    </a>
                                ) : (
                                    <p>Check-in Location Not Available</p>
                                )}

                                {selectedRecord.check_out_latitude && selectedRecord.check_out_longitude ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${selectedRecord.check_out_latitude},${selectedRecord.check_out_longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="map-link"
                                    >
                                        <FaMapMarkerAlt />{" "}Check-out Location
                                    </a>
                                ) : (
                                    <p>Check-out Location Not Available</p>
                                )}

                            </div>

                            {(selectedRecord.check_in_photo || selectedRecord.check_out_photo) && (
                                <div className="modal-actions" style={{ marginTop: "1rem" }}>
                                    {selectedRecord.check_in_photo && (
                                        <button
                                            type="button"
                                            className="upload-btn"
                                            onClick={() => handleViewPhoto(selectedRecord, "check-in")}
                                        >
                                            View Check-in Photo
                                        </button>
                                    )}
                                    {selectedRecord.check_out_photo && (
                                        <button
                                            type="button"
                                            className="upload-btn"
                                            onClick={() => handleViewPhoto(selectedRecord, "check-out")}
                                        >
                                            View Check-out Photo
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>

                    </div>
                </div>
            )}

            {/* ======================================================
                PHOTO PREVIEW MODAL
            ====================================================== */}

            {(photoPreview.loading || photoPreview.url) && (
                <div className="modal-overlay" onClick={closePhotoPreview}>
                    <div
                        className="report-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: "560px" }}
                    >
                        <div className="modal-header">
                            <h3>
                                {photoPreview.type === "check-in" ? "Check-in Photo" : "Check-out Photo"}
                            </h3>
                            <button className="close-btn" onClick={closePhotoPreview}>×</button>
                        </div>

                        <div className="modal-body" style={{ textAlign: "center" }}>
                            {photoPreview.loading ? (
                                <p>Loading photo...</p>
                            ) : (
                                <>
                                    <img
                                        src={photoPreview.url}
                                        alt="Attendance"
                                        style={{ maxWidth: "100%", borderRadius: "8px" }}
                                    />
                                    <div className="modal-actions" style={{ marginTop: "1rem" }}>
                                        <button
                                            type="button"
                                            className="upload-btn"
                                            onClick={() =>
                                                selectedRecord &&
                                                handleDownloadPhoto(selectedRecord, photoPreview.type)
                                            }
                                        >
                                            <FaDownload /> Download
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>

    );

}

export default AttendanceReports;

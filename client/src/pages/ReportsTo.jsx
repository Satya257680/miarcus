import PremiumLoader from "../components/premium/PremiumLoader";
import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import { getDepartments } from "../services/departmentService.js";

// ======================================================
// COMMON COMPONENTS
// ======================================================

import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";

// ======================================================
// MODALS
// ======================================================

import AddReportModal from "../components/AddReportModal";
import BulkUploadModal from "../components/common/BulkUploadModal";

// ======================================================
// ICONS
// ======================================================

import {
    FaEdit,
    FaTrash
} from "react-icons/fa";

// ======================================================
// STYLE
// ======================================================

import "../styles/ReportsTo.css";
import "../styles/premium/PagePremium.css";
import "../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import { FaSitemap, FaUserTie, FaUserCheck, FaUserSlash, FaBuilding } from "react-icons/fa";
import { initials, avatarTone, formatCount } from "../utils/premiumFormat";
import { exportFromXLSXBinary } from "../utils/exportUtils.js";

// ======================================================
// API
// ======================================================

const API = API_BASE_URL + '/api';

// ======================================================
// COMPONENT
// ======================================================

function ReportsTo() {

    // ======================================================
    // STATES
    // ======================================================

    const [reports, setReports] = useState([]);
    const [masterDepartments, setMasterDepartments] = useState([]);

    const [loading, setLoading] = useState(true);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // ======================================================
    // FILTERS
    // ======================================================

    const [departmentFilter, setDepartmentFilter] = useState("");

    const [statusFilter, setStatusFilter] = useState("");

    // ======================================================
    // PAGINATION
    // ======================================================

    const [currentPage, setCurrentPage] = useState(1);

    const [pageSize] = useState(10);

    const [totalRecords, setTotalRecords] = useState(0);

    const [totalPages, setTotalPages] = useState(1);

    // ======================================================
    // MODALS
    // ======================================================

    const [showModal, setShowModal] = useState(false);

    const [showBulkModal, setShowBulkModal] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // ======================================================
    // SELECTED DATA
    // ======================================================

    const [selectedManager, setSelectedManager] = useState(null);

    const [deleteId, setDeleteId] = useState(null);

    // ======================================================
    // RBAC
    // ======================================================

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
        : permissions["Reports To"] || "None";

    const canView = [
        "View",
        "Add",
        "Edit",
        "Full"
    ].includes(permission);

    const canAdd = [
        "Add",
        "Edit",
        "Full"
    ].includes(permission);

    const canEdit = [
        "Edit",
        "Full"
    ].includes(permission);

    const canDelete =
        permission === "Full";

    // ======================================================
    // LOAD CURRENT DEPARTMENTS
    // ======================================================

    useEffect(() => {
        let mounted = true;

        const loadDepartments = async () => {
            try {
                const response = await getDepartments();
                const rows =
                    response?.data ||
                    response?.departments ||
                    [];

                if (mounted) {
                    setMasterDepartments(
                        Array.isArray(rows) ? rows : []
                    );
                }
            } catch (error) {
                console.error(
                    "Failed to load current departments:",
                    error
                );
                if (mounted) setMasterDepartments([]);
            }
        };

        loadDepartments();

        return () => {
            mounted = false;
        };
    }, []);

    // ======================================================
    // LOAD REPORTS
    // ======================================================

    const loadReports = async () => {

        try {

            setLoading(true);

            const res = await axios.get(
                `${API}/reports`
            );

            const data =
                res.data.reports ||
                res.data.data ||
                [];

            setReports(data);

            setTotalRecords(data.length);

            setTotalPages(
                Math.ceil(
                    data.length / pageSize
                ) || 1
            );

        } catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Failed to load Reports."
            );

            setReports([]);

        } finally {

            setLoading(false);

        }

    };

    // ======================================================
    // LOAD
    // ======================================================

    useEffect(() => {

        if (!canView) {

            setLoading(false);

            return;

        }

        loadReports();

    }, [canView]);
        // ======================================================
    // ADD
    // ======================================================

    const handleAdd = () => {

        if (!canAdd) return;

        setSelectedManager(null);

        setShowModal(true);

    };

    // ======================================================
    // EDIT
    // ======================================================

    const handleEdit = (row) => {

        if (!canEdit) return;

        setSelectedManager(row);

        setShowModal(true);

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

            await axios.delete(
                `${API}/reports/${deleteId}`
            );

            alert("Manager deleted successfully.");

            loadReports();

        } catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Delete failed."
            );

        } finally {

            setDeleteId(null);

            setShowDeleteDialog(false);

        }

    };

    // ======================================================
    // BULK UPLOAD
    // ======================================================
    //
    // NOTE:
    // BulkUploadModal (common) hands back the raw File object
    // and expects this function to build the FormData itself
    // and return a { success, message } style result — the
    // same contract used by the Departments module.
    //
    // The previous implementation posted the raw File with a
    // manually forced "Content-Type: multipart/form-data"
    // header and no boundary, which the browser rejected with
    // "Multipart: Boundary not found" and the backend rejected
    // with 400 Bad Request. Letting the browser/axios set the
    // Content-Type (with boundary) for a FormData body fixes
    // this.
    // ======================================================

    const handleBulkUpload = async (file) => {

        try {

            const formData = new FormData();

            formData.append("file", file);

            const res = await axios.post(

                `${API}/reports/bulk-upload`,

                formData

            );

            return res.data;

        } catch (err) {

            console.error(err);

            return {

                success: false,

                message:
                    err.response?.data?.message ||
                    "Upload failed."

            };

        }

    };

    // ======================================================
    // EXPORT
    // ======================================================

    const handleExport = async (format = "csv") => {

        try {

            const response = await axios.get(

                `${API}/reports/export`,

                {
                    responseType: "blob"
                }

            );

            await exportFromXLSXBinary({
                data: response.data,
                filename: "ReportsTo",
                format,
                title: "Reports To",
            });

        } catch (err) {

            console.error(err);

            alert("Export failed.");

        }

    };

    // ======================================================
    // SUCCESS
    // ======================================================

    const handleSuccess = () => {

        setShowModal(false);

        setSelectedManager(null);

        loadReports();

    };

    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setDepartmentFilter("");

        setStatusFilter("");

        setCurrentPage(1);

    };
        // ======================================================
    // FILTER REPORTS
    // ======================================================

    const filteredReports = useMemo(() => {

        return reports.filter((item) => {

            const matchesSearch =

                !search ||

                item.manager_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.department
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.designation
                    ?.toLowerCase()
                    .includes(search.toLowerCase());

            const matchesDepartment =

                !departmentFilter ||

                item.department === departmentFilter;

            const matchesStatus =

                !statusFilter ||

                item.status === statusFilter;

            return (

                matchesSearch &&

                matchesDepartment &&

                matchesStatus

            );

        });

    }, [

        reports,

        search,

        departmentFilter,

        statusFilter

    ]);

    // ======================================================
    // FILTER DROPDOWNS
    // ======================================================

    const departments = useMemo(() => {

        const current = masterDepartments
            .map((department) => department.department_name)
            .filter(Boolean);

        // Keep old report values available for filtering as well,
        // while making newly created/renamed master departments
        // immediately available in the dropdown.
        return [
            ...new Set([
                ...current,
                ...reports
                    .map((report) => report.department)
                    .filter(Boolean),
            ]),
        ];
    }, [masterDepartments, reports]);

    // ======================================================
    // PAGINATION
    // ======================================================

    const totalFilteredRecords =

        filteredReports.length;

    const calculatedTotalPages =

        Math.max(

            1,

            Math.ceil(

                totalFilteredRecords /

                pageSize

            )

        );

    const currentReports =

        filteredReports.slice(

            (currentPage - 1) * pageSize,

            currentPage * pageSize

        );

    useEffect(() => {

        setCurrentPage(1);

    }, [

        search,

        departmentFilter,

        statusFilter

    ]);

    // ======================================================
    // STATUS
    // ======================================================

    const getStatusClass = (status) => {

        switch (

            (status || "").toLowerCase()

        ) {

            case "active":

                return "active";

            case "inactive":

                return "inactive";

            default:

                return "inactive";

        }

    };

    // ======================================================
    // ACCESS DENIED
    // ======================================================

    if (!canView) {

        return (

            <div className="no-permission">

                <h2>

                    Access Denied

                </h2>

                <p>

                    You don't have permission to
                    view Reports To.

                </p>

            </div>

        );

    }

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {

        return (

            <div className="reports-loading"><PremiumLoader title="Loading Managers" /></div>

        );

    }

    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        // ==================================================
        // MANAGER NAME
        // ==================================================

        {
            key: "manager_name",
            title: "Manager Name",

            render: (row) => (

                <div className="pp-cell-main">
                    <span className={`pp-avatar pp-avatar--round ${avatarTone(row.manager_name)}`}>
                        {initials(row.manager_name)}
                    </span>
                    <span className="pp-cell-text">
                        <span className="pp-cell-title">{row.manager_name || "-"}</span>
                        <span className="pp-cell-sub">{row.designation || "Reporting manager"}</span>
                    </span>
                </div>

            )

        },

        // ==================================================
        // DEPARTMENT
        // ==================================================

        {
            key: "department",
            title: "Department",

            render: (row) =>

                row.department
                    ? <span className="pp-pill pp-pill--violet">{row.department}</span>
                    : <span className="pp-dash">—</span>

        },

        // ==================================================
        // DESIGNATION
        // ==================================================

        {
            key: "designation",
            title: "Designation",

            render: (row) =>

                row.designation || "-"

        },

        // ==================================================
        // STATUS
        // ==================================================

        {
            key: "status",
            title: "Status",
            align: "center",

            render: (row) => (

                <span
                    className={`pp-pill pp-pill--dot ${
                        getStatusClass(row.status) === "active"
                            ? "pp-pill--green"
                            : "pp-pill--slate"
                    }`}
                >
                    {row.status || "Inactive"}
                </span>

            )

        },

        // ==================================================
        // ACTIONS
        // ==================================================

        {
            key: "actions",
            title: "Actions",
            width: "280px",
            minWidth: "280px",
            align: "center",

            render: (row) => (

                <div className="action-buttons">

                    {canEdit && (

                        <button
                            className="edit-btn"
                            title="Edit"
                            onClick={() =>
                                handleEdit(row)
                            }
                        >
                            <FaEdit />
                            <span>Edit</span>
                        </button>

                    )}

                    {canDelete && (

                        <button
                            className="delete-btn"
                            title="Delete"
                            onClick={() =>
                                handleDelete(row.id)
                            }
                        >
                            <FaTrash />
                            <span>Delete</span>
                        </button>

                    )}

                </div>

            )

        }

    ];
        // ======================================================
    // RETURN
    // ======================================================

    return (

        <div className="reports-page pp-premium">

            {/* ======================================================
                PREMIUM HERO + KPIs
            ====================================================== */}

            <PremiumHero
                icon={FaSitemap}
                eyebrow="Settings · Hierarchy"
                title="Reports To"
                badge="Admin only"
                subtitle="Reporting managers that users roll up to — their department, designation and status."
                meta={[
                    { label: "Managers", value: formatCount(reports.length) },
                    { label: "Showing", value: filteredReports.length !== reports.length ? `${formatCount(filteredReports.length)} filtered` : null }
                ]}
            />

            <InsightStrip
                loading={loading}
                items={[
                    { key: "all", label: "All managers", value: formatCount(reports.length), hint: "Reporting heads", tone: "violet", icon: FaUserTie },
                    { key: "active", label: "Active", value: formatCount(reports.filter((r) => getStatusClass(r.status) === "active").length), hint: "Can receive reports", tone: "green", icon: FaUserCheck, onClick: () => setStatusFilter(statusFilter === "Active" ? "" : "Active"), active: statusFilter === "Active" },
                    { key: "inactive", label: "Inactive", value: formatCount(reports.filter((r) => getStatusClass(r.status) !== "active").length), hint: "Disabled managers", tone: "red", icon: FaUserSlash, onClick: () => setStatusFilter(statusFilter === "Inactive" ? "" : "Inactive"), active: statusFilter === "Inactive" },
                    { key: "depts", label: "Departments", value: formatCount(new Set(reports.map((r) => r.department).filter(Boolean)).size), hint: "Covered by managers", tone: "blue", icon: FaBuilding }
                ]}
            />

            {/* ======================================================
                PAGE TOOLBAR
            ====================================================== */}

            <PageToolbar

                search={search}

                setSearch={setSearch}

                placeholder="Search Manager..."

                showAdd={canAdd}

                addText="Add Manager"

                onAdd={handleAdd}

                showBulkUpload={canAdd}

                bulkUploadText="Bulk Add"

                onBulkUpload={() =>
                    setShowBulkModal(true)
                }

                showExport={canView}

                onExport={handleExport}

            />

            {/* ======================================================
                FILTER BAR
            ====================================================== */}

            <FilterBar
                onClear={handleClearFilters}
            >

                {/* ==========================================
                    DEPARTMENT
                ========================================== */}

                <div className="filter-group">

                    <label>Department</label>

                    <select
                        value={departmentFilter}
                        onChange={(e) =>
                            setDepartmentFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All Departments
                        </option>

                        {departments.map((dept) => (

                            <option
                                key={dept}
                                value={dept}
                            >
                                {dept}
                            </option>

                        ))}

                    </select>

                </div>

                {/* ==========================================
                    STATUS
                ========================================== */}

                <div className="filter-group">

                    <label>Status</label>

                    <select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All Status
                        </option>

                        <option value="Active">
                            Active
                        </option>

                        <option value="Inactive">
                            Inactive
                        </option>

                    </select>

                </div>

            </FilterBar>
                        {/* ======================================================
                CARD
            ====================================================== */}

            <Card
                title="Reports To List"
                subtitle={`${formatCount(filteredReports.length)} managers`}
            >

                <DataTable

                    columns={columns}

                    data={currentReports}

                    loading={loading}

                    emptyTitle="No Managers Found"

                    emptyDescription="There are no reporting managers available."

                />

                <Pagination

                    currentPage={currentPage}

                    totalPages={calculatedTotalPages}

                    totalRecords={totalFilteredRecords}

                    pageSize={pageSize}

                    onPageChange={setCurrentPage}

                    onPageSizeChange={() => {

                        // Fixed page size (10)

                        setCurrentPage(1);

                    }}

                />

            </Card>
                        {/* ======================================================
                BULK UPLOAD MODAL
            ====================================================== */}

            {canAdd && showBulkModal && (

                <BulkUploadModal
    moduleKey="reports-to"
    uploadUrl={"/api/reports/bulk-upload"}

                    isOpen={showBulkModal}

                    onClose={() =>
                        setShowBulkModal(false)
                    }

                    onSuccess={loadReports}

                    uploadFunction={handleBulkUpload}

                    title="Bulk Upload Managers"/>

            )}

            {/* ======================================================
                ADD / EDIT MANAGER MODAL
            ====================================================== */}

            {(canAdd || canEdit) && showModal && (

                <AddReportModal

                    editData={selectedManager}

                    closeModal={() => {

                        setShowModal(false);

                        setSelectedManager(null);

                    }}

                    refresh={handleSuccess}

                />

            )}

            {/* ======================================================
                DELETE CONFIRMATION
            ====================================================== */}

            <ConfirmDialog

                open={showDeleteDialog}

                title="Delete Manager"

                message="Are you sure you want to delete this manager?"

                confirmText="Delete"

                cancelText="Cancel"

                confirmVariant="danger"

                onConfirm={confirmDelete}

                onCancel={() => {

                    setDeleteId(null);

                    setShowDeleteDialog(false);

                }}

            />

        </div>

    );

}

export default ReportsTo;
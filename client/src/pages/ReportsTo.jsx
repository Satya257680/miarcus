import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

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
// MODALS
// ======================================================

import AddReportModal from "../components/AddReportModal";
import BulkUploadModal from "../components/BulkUploadModal";

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

    const handleBulkSuccess = () => {

        setShowBulkModal(false);

        loadReports();

    };

    // ======================================================
    // EXPORT
    // ======================================================

    const handleExport = async () => {

        try {

            const response = await axios.get(

                `${API}/reports/export`,

                {
                    responseType: "blob"
                }

            );

            const blob = new Blob(

                [response.data]

            );

            const url =
                window.URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;

            link.download = "ReportsTo.xlsx";

            link.click();

            window.URL.revokeObjectURL(url);

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

    const departments = useMemo(() => (

        [

            ...new Set(

                reports

                    .map(r => r.department)

                    .filter(Boolean)

            )

        ]

    ), [reports]);

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

            <div className="reports-loading">

                Loading Managers...

            </div>

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

            render: (row) =>

                row.manager_name || "-"

        },

        // ==================================================
        // DEPARTMENT
        // ==================================================

        {
            key: "department",
            title: "Department",

            render: (row) =>

                row.department || "-"

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
                    className={`status-badge ${getStatusClass(
                        row.status
                    )}`}
                >
                    {row.status || "-"}
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
                            onClick={() =>
                                handleEdit(row)
                            }
                        >
                            <FaEdit />
                        </button>

                    )}

                    {canDelete && (

                        <button
                            className="delete-btn"
                            onClick={() =>
                                handleDelete(row.id)
                            }
                        >
                            <FaTrash />
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

        <div className="reports-page">

            {/* ======================================================
                PAGE HEADER
            ====================================================== */}

            <PageHeader
                title="Reports To"
                subtitle="Manage Reporting Managers."
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

                    isOpen={showBulkModal}

                    onClose={() =>
                        setShowBulkModal(false)
                    }

                    onSuccess={handleBulkSuccess}

                    uploadFunction={async (formData) => {

                        return axios.post(

                            `${API}/reports/bulk-upload`,

                            formData,

                            {

                                headers: {

                                    "Content-Type":
                                        "multipart/form-data"

                                }

                            }

                        );

                    }}

                    title="Bulk Upload Managers"

                    acceptedFile=".csv,.xlsx,.xls"

                />

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
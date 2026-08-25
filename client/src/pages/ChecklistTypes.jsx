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
import BulkUploadModal from "../components/common/BulkUploadModal";

// ======================================================
// MODALS
// ======================================================

import AddChecklistTypeModal from "../components/AddChecklistTypeModal";

// ======================================================
// ICONS
// ======================================================

import {
    FaEdit,
    FaTrash,
    FaUpload
} from "react-icons/fa";

// ======================================================
// STYLE
// ======================================================

import "../styles/ChecklistTypes.css";

// ======================================================
// API
// ======================================================

const API = API_BASE_URL + '/api';

// ======================================================
// COMPONENT
// ======================================================

function ChecklistTypes() {

    // ======================================================
    // STATES
    // ======================================================

    const [checklists, setChecklists] = useState([]);

    const [loading, setLoading] = useState(true);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // ======================================================
    // FILTERS
    // ======================================================

    const [statusFilter, setStatusFilter] = useState("");

    const [departmentFilter, setDepartmentFilter] = useState("");

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

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // ======================================================
    // SELECTED DATA
    // ======================================================

    const [selectedChecklist, setSelectedChecklist] = useState(null);

    const [deleteId, setDeleteId] = useState(null);

    // ======================================================
// BULK UPLOAD MODAL
// ======================================================

const [showBulkUpload, setShowBulkUpload] = useState(false);

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
        : permissions["Checklist Types"] || "None";

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
    // LOAD CHECKLIST TYPES
    // ======================================================

    const loadChecklistTypes = async () => {

        try {

            setLoading(true);

            const res = await axios.get(
                `${API}/checklist-types`
            );

            const data = res.data.data || res.data || [];

            setChecklists(data);

            setTotalRecords(data.length);

            setTotalPages(
                Math.ceil(data.length / pageSize) || 1
            );

        } catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Failed to load Checklist Types."
            );

            setChecklists([]);

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

        loadChecklistTypes();

    }, [canView]);
        // ======================================================
    // ADD
    // ======================================================

    const handleAdd = () => {

        if (!canAdd) return;

        setSelectedChecklist(null);

        setShowModal(true);

    };

    // ======================================================
    // EDIT
    // ======================================================

    const handleEdit = (row) => {

        if (!canEdit) return;

        setSelectedChecklist(row);

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
                `${API}/checklist-types/${deleteId}`
            );

            alert("Checklist Type deleted successfully.");

            loadChecklistTypes();

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
    // DELETE ALL
    // ======================================================

    const handleDeleteAll = async () => {

        if (!canDelete) return;

        if (!window.confirm("Delete all Checklist Types?")) return;

        try {

            await axios.delete(
                `${API}/checklist-types/delete-all`
            );

            alert("All Checklist Types deleted successfully.");

            loadChecklistTypes();

        } catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Delete failed."
            );

        }

    };

    // ======================================================
    // EXPORT
    // ======================================================

    const handleExport = async () => {

        try {

            const response = await axios.get(
                `${API}/checklist-types/export`,
                {
                    responseType: "blob"
                }
            );

            const url = window.URL.createObjectURL(
                new Blob([response.data])
            );

            const link = document.createElement("a");

            link.href = url;

            link.download = "ChecklistTypes.xlsx";

            link.click();

            window.URL.revokeObjectURL(url);

        } catch (err) {

            console.error(err);

            alert("Export failed.");

        }

    };
// ======================================================
// BULK UPLOAD CHECKLIST TYPES
// ======================================================

const uploadChecklistTypes = async (file) => {

    if (!canAdd) {

        return {

            success: false,

            message: "You don't have permission."

        };

    }

    const formData = new FormData();

    formData.append("file", file);

    const token = localStorage.getItem("token");

    try {

        const response = await axios.post(

            `${API}/checklist-types/bulk-upload`,

            formData,

            {

                headers: {

                    Authorization: `Bearer ${token}`

                }

            }

        );

        return response.data;

    } catch (err) {

        console.error(err);

        return {

            success: false,

            message:

                err.response?.data?.message ||

                "Bulk upload failed."

        };

    }

};
// ==========================
// SAVE
// ==========================

const handleSave = async (data) => {

    try {

        if (selectedChecklist) {

            await axios.put(

                `${API}/checklist-types/${selectedChecklist.id}`,

                data

            );

        } else {

            await axios.post(

                `${API}/checklist-types`,

                data

            );

        }

        alert(

            selectedChecklist

                ? "Checklist updated successfully."

                : "Checklist created successfully."

        );

        setShowModal(false);

        setSelectedChecklist(null);

        await loadChecklistTypes();

    } catch (err) {

        console.error(err);

        alert(

            err.response?.data?.message ||

            "Save failed."

        );

    }

};  // ======================================================
    // SUCCESS
    // ======================================================

    const handleSuccess = () => {

        setShowModal(false);

        setSelectedChecklist(null);

        loadChecklistTypes();

    };
        // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setStatusFilter("");

        setDepartmentFilter("");

        setCurrentPage(1);

    };

    // ======================================================
    // FILTER CHECKLIST TYPES
    // ======================================================

    const filteredChecklists = useMemo(() => {

        return checklists.filter((item) => {

            const matchesSearch =

                !search ||

                item.checklist_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.departments
                    ?.toLowerCase()
                    .includes(search.toLowerCase());

            const matchesStatus =

                !statusFilter ||

                item.status === statusFilter;

            const matchesDepartment =

                !departmentFilter ||

                item.departments
                    ?.split(",")
                    .map((d) => d.trim())
                    .includes(departmentFilter);

            return (

                matchesSearch &&

                matchesStatus &&

                matchesDepartment

            );

        });

    }, [

        checklists,

        search,

        statusFilter,

        departmentFilter

    ]);

    // ======================================================
    // FILTER DROPDOWNS
    // ======================================================

    const departments = useMemo(() => (

        [

            ...new Set(

                checklists.flatMap(item =>

                    item.departments

                        ? item.departments
                              .split(",")
                              .map(d => d.trim())

                        : []

                )

            )

        ]

    ), [checklists]);

    // ======================================================
    // PAGINATION
    // ======================================================

    const totalFilteredRecords =

        filteredChecklists.length;

    const calculatedTotalPages =

        Math.max(

            1,

            Math.ceil(

                totalFilteredRecords /

                pageSize

            )

        );

    const currentChecklistTypes =

        filteredChecklists.slice(

            (currentPage - 1) * pageSize,

            currentPage * pageSize

        );

    useEffect(() => {

        setCurrentPage(1);

    }, [

        search,

        statusFilter,

        departmentFilter

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
                    view Checklist Types.

                </p>

            </div>

        );

    }

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {

        return (

            <div className="questions-loading">

                Loading Checklist Types...

            </div>

        );

    }

    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        // ==================================================
        // CHECKLIST NAME
        // ==================================================

        {
            key: "checklist_name",
            title: "Checklist Name",
            render: (row) => row.checklist_name || "-"
        },

        // ==================================================
        // DEPARTMENTS
        // ==================================================

        {
            key: "departments",
            title: "Departments Allowed",
            render: (row) => (
                <div className="department-cell">
                    {row.departments || "-"}
                </div>
            )
        },

        // ==================================================
        // ALLOW PAST SUBMISSION
        // ==================================================

        {
            key: "allow_past_submission",
            title: "Allow Past Submission",
            align: "center",

            render: (row) => (

                <span
                    className={
                        row.allow_past_submission
                            ? "required-badge yes"
                            : "required-badge no"
                    }
                >
                    {row.allow_past_submission
                        ? "Yes"
                        : "No"}
                </span>

            )

        },
                // ==================================================
        // CUTOFF TIME
        // ==================================================

        {
            key: "cutoff_time",
            title: "Cutoff Time",
            align: "center",

            render: (row) =>

                row.cutoff_time || "-"

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

        <div className="checklist-page">

            {/* ======================================================
                PAGE HEADER
            ====================================================== */}

            <PageHeader
                title="Checklist Types"
                subtitle="Manage Checklist Types."
            />
<PageToolbar

    search={search}

    setSearch={setSearch}

    placeholder="Search Checklist Types..."

    showAdd={canAdd}

    addText="Add Checklist"

    onAdd={handleAdd}

    showExport={canView}

    onExport={handleExport}

    showBulkUpload={canAdd}

    bulkUploadText="Bulk Upload"

    onBulkUpload={() => setShowBulkUpload(true)}

    showDeleteAll={canDelete}

    onDeleteAll={handleDeleteAll}

/>
            {/* ======================================================
                FILTER BAR
            ====================================================== */}

            <FilterBar
                onClear={handleClearFilters}
            >
                              {/* ==========================================
                    STATUS
                ========================================== */}

                <div className="filter-group">

                    <label>Status</label>

                    <select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value)
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

            </FilterBar>

            {/* ======================================================
                CARD
            ====================================================== */}

            <Card
                title="Checklist Types List"
            >

                <DataTable

                    columns={columns}

                    data={currentChecklistTypes}

                    loading={loading}

                    emptyTitle="No Checklist Types Found"

                    emptyDescription="There are no Checklist Types available."

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
                ADD / EDIT CHECKLIST TYPE MODAL
            ====================================================== */}

          {(canAdd || canEdit) && showModal && (

    <AddChecklistTypeModal

        checklist={selectedChecklist}

        onSave={handleSave}

        onClose={() => {

            setShowModal(false);

            setSelectedChecklist(null);

        }}

    />

)}
{/* ======================================================
    BULK UPLOAD MODAL
====================================================== */}

<BulkUploadModal

    isOpen={showBulkUpload}

    onClose={() => setShowBulkUpload(false)}

    onSuccess={async () => {

        await loadChecklistTypes();

    }}

    uploadFunction={uploadChecklistTypes}

    title="Bulk Upload Checklist Types"

    acceptedFile=".csv,.xlsx,.xls"

    sampleFile="/samples/checklist-types-sample.xlsx"

/>

            {/* ======================================================
                DELETE CONFIRMATION
            ====================================================== */}

            <ConfirmDialog

                open={showDeleteDialog}

                title="Delete Checklist Type"

                message="Are you sure you want to delete this Checklist Type?"

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

export default ChecklistTypes;



           
            
import { useEffect, useMemo, useState } from "react";
import axios from "axios";


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
// ICONS
// ======================================================

import {
    FaEye,
    FaEdit,
    FaTrash,
    FaMapMarkerAlt
} from "react-icons/fa";


// ======================================================
// STYLE
// ======================================================

import "../styles/ChecklistReports.css";


// ======================================================
// API
// ======================================================

const API = "https://miarcus-backend.onrender.com/api";


// ======================================================
// COMPONENT
// ======================================================

function ChecklistReports() {

    // ======================================================
    // STATES
    // ======================================================

    const [reports, setReports] = useState([]);

    const [stores, setStores] = useState([]);

    const [users, setUsers] = useState([]);

    const [checklistTypes, setChecklistTypes] = useState([]);

    const [loading, setLoading] = useState(true);

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

    const [selectedChecklist, setSelectedChecklist] = useState("");

    const [selectedEmployee, setSelectedEmployee] = useState("");

    // ======================================================
    // PAGINATION
    // ======================================================

    const [currentPage, setCurrentPage] = useState(1);

    const [pageSize, setPageSize] = useState(10);

    // ======================================================
    // MODALS
    // ======================================================

    const [showViewModal, setShowViewModal] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);

    const [showBulkModal, setShowBulkModal] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // ======================================================
    // SELECTED DATA
    // ======================================================

    const [selectedReport, setSelectedReport] = useState(null);

    const [deleteId, setDeleteId] = useState(null);

    const [editingReport, setEditingReport] = useState({

        id: "",

        status: "",

        submission_date: "",

        answer: "",

        remarks: "",

        device: ""

    });

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

        : permissions["Checklist Reports"] || "None";

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
    // LOAD DATA
    // ======================================================

    const loadData = async () => {

        try {

            setLoading(true);

            const results = await Promise.allSettled([

                axios.get(`${API}/checklist-reports`),

                axios.get(`${API}/stores`),

                axios.get(`${API}/checklist-types`),

                axios.get(`${API}/users`)

            ]);

            const [

                reportRes,

                storeRes,

                checklistRes,

                userRes

            ] = results;

            // ==========================================
            // REPORTS
            // ==========================================

            if (reportRes.status === "fulfilled") {

                setReports(

                    reportRes.value.data.data || []

                );

            } else {

                console.error(

                    "Checklist Reports Error:",

                    reportRes.reason

                );

                setReports([]);

            }

            // ==========================================
            // STORES
            // ==========================================

            if (storeRes.status === "fulfilled") {

                setStores(

                    storeRes.value.data.data || []

                );

            } else {

                setStores([]);

            }

            // ==========================================
            // CHECKLIST TYPES
            // ==========================================

            if (checklistRes.status === "fulfilled") {

                setChecklistTypes(

                    checklistRes.value.data.data || []

                );

            } else {

                setChecklistTypes([]);

            }

            // ==========================================
            // USERS
            // ==========================================

            if (userRes.status === "fulfilled") {

                setUsers(

                    userRes.value.data.data || []

                );

            } else {

                setUsers([]);

            }

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to load Checklist Reports."

            );

            setReports([]);

        }
        finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        if (!canView) {

            setLoading(false);

            return;

        }

        loadData();

    }, [canView]);

    // ======================================================
    // VIEW REPORT
    // ======================================================

    const handleView = async (id) => {

        if (!canView) return;

        try {

            const res = await axios.get(

                `${API}/checklist-reports/${id}`

            );

            setSelectedReport(

                res.data.data

            );

            setShowViewModal(true);

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to load report."

            );

        }

    };

    // ======================================================
    // EDIT REPORT
    // ======================================================

    const handleEdit = (row) => {

        if (!canEdit) return;

        setEditingReport({

            id: row.id,

            status: row.status || "",

            submission_date:

                row.submission_date || "",

            answer: row.answer || "",

            remarks: row.remarks || "",

            device: row.device || ""

        });

        setShowEditModal(true);

    };

    // ======================================================
    // UPDATE REPORT
    // ======================================================

    const updateReport = async () => {

        try {

            await axios.put(

                `${API}/checklist-reports/${editingReport.id}`,

                {

                    status: editingReport.status,

                    answer: editingReport.answer,

                    remarks: editingReport.remarks

                }

            );

            alert(

                "Checklist Report updated successfully."

            );

            setShowEditModal(false);

            loadData();

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                err.message ||

                "Unable to update report."

            );

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

            await axios.delete(

                `${API}/checklist-reports/${deleteId}`

            );

            loadData();

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to delete report."

            );

        }
        finally {

            setDeleteId(null);

            setShowDeleteDialog(false);

        }

    };

    // ======================================================
    // EXPORT CSV
    // ======================================================

    const handleExport = () => {

        if (!filteredReports.length) {

            alert("No records found.");

            return;

        }

        const rows = filteredReports.map((r) => ({

            "Submitted At": r.submission_date,

            Status: r.status,

            Checklist: r.checklist_name,

            Store: r.store_name,

            Employee: r.employee_name,

            "Employee ID": r.employee_id || "-",

            Department: r.department_name || "-",

            Question: r.question || "-",

            Answer: r.answer || "-",

            Comment: r.remarks || "-",

            Device: r.device || "-",

            Attachment: r.attachment || "-",

            Latitude: r.latitude || "-",

            Longitude: r.longitude || "-"

        }));

        const csv = [

            Object.keys(rows[0]).join(","),

            ...rows.map((row) =>

                Object.values(row)

                    .map((item) => `"${item}"`)

                    .join(",")

            )

        ].join("\n");

        const blob = new Blob(

            [csv],

            {

                type: "text/csv;charset=utf-8;"

            }

        );

        const url =

            window.URL.createObjectURL(blob);

        const link =

            document.createElement("a");

        link.href = url;

        link.download =

            "ChecklistReports.csv";

        link.click();

        window.URL.revokeObjectURL(url);

    };

    // ======================================================
// BULK UPLOAD CHECKLIST REPORT
// ======================================================

const uploadChecklistReport = async (file) => {

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

            `${API}/checklist-reports/bulk-upload`,

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
    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setFromDate("");

        setToDate("");

        setSelectedStore("");

        setSelectedChecklist("");

        setSelectedEmployee("");

        setCurrentPage(1);

    };
        // ======================================================
    // FILTER REPORTS
    // ======================================================

    const filteredReports = useMemo(() => {

        return reports.filter((item) => {

            // ==========================================
            // SEARCH
            // ==========================================

            const searchMatch =

                !search ||

                item.store_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.checklist_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.employee_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.question
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.answer
                    ?.toLowerCase()
                    .includes(search.toLowerCase());

            // ==========================================
            // STORE
            // ==========================================

            const storeMatch =

                !selectedStore ||

                item.store_id == selectedStore;

            // ==========================================
            // CHECKLIST
            // ==========================================

            const checklistMatch =

                !selectedChecklist ||

                item.checklist_type_id == selectedChecklist;

            // ==========================================
            // EMPLOYEE
            // ==========================================

            const employeeMatch =

                !selectedEmployee ||

                item.submitted_by == selectedEmployee;

            // ==========================================
            // DATE FILTER
            // ==========================================

            const fromMatch =

                !fromDate ||

                new Date(item.submission_date) >=

                new Date(fromDate);

            const toMatch =

                !toDate ||

                new Date(item.submission_date) <=

                new Date(toDate + "T23:59:59");

            return (

                searchMatch &&

                storeMatch &&

                checklistMatch &&

                employeeMatch &&

                fromMatch &&

                toMatch

            );

        });

    }, [

        reports,

        search,

        selectedStore,

        selectedChecklist,

        selectedEmployee,

        fromDate,

        toDate

    ]);

    // ======================================================
    // PAGINATION
    // ======================================================

    const totalRecords = filteredReports.length;

    const totalPages = Math.ceil(

        totalRecords / pageSize

    );

    const startIndex =

        (currentPage - 1) * pageSize;

    const endIndex =

        startIndex + pageSize;

    const currentReports =

        filteredReports.slice(

            startIndex,

            endIndex

        );

    useEffect(() => {

        setCurrentPage(1);

    }, [

        pageSize,

        search,

        selectedStore,

        selectedChecklist,

        selectedEmployee,

        fromDate,

        toDate

    ]);

    // ======================================================
    // FORMAT DATE
    // ======================================================

    const formatDate = (value) => {

        if (!value) return "-";

        return new Date(value).toLocaleString(

            "en-GB"

        );

    };

    // ======================================================
    // ACCESS DENIED
    // ======================================================

    if (!canView) {

        return (

            <div className="no-permission">

                <h2>Access Denied</h2>

                <p>

                    You don't have permission to view
                    Checklist Reports.

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

                Loading Checklist Reports...

            </div>

        );

    };

    // ======================================================
    // TABLE COLUMNS
    // ======================================================
        const columns = [

        // ==================================================
        // SUBMISSION DETAILS
        // ==================================================

        {
            key: "submission_date",
            title: "Submitted At",
            render: (row) => formatDate(row.submission_date)
        },

        {
            key: "status",
            title: "Status",
            render: (row) => (
                <span
                    className={`status-badge ${(
                        row.status || "Pending"
                    )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                >
                    {row.status || "Pending"}
                </span>
            )
        },

        {
            key: "checklist_name",
            title: "Checklist",
            render: (row) => row.checklist_name || "-"
        },

        {
            key: "store_name",
            title: "Store",
            render: (row) => row.store_name || "-"
        },

        {
            key: "employee_name",
            title: "Employee",
            render: (row) => row.employee_name || "-"
        },

        {
            key: "employee_id",
            title: "Employee ID",
            render: (row) => row.employee_id || "-"
        },

        // ==================================================
        // CHECKLIST DETAILS
        // ==================================================

        {
            key: "department_name",
            title: "Department",
            render: (row) => row.department_name || "-"
        },

        {
            key: "question",
            title: "Question",
            render: (row) => (
                <div className="question-cell">
                    {row.question || "-"}
                </div>
            )
        },

        {
            key: "answer",
            title: "Answer",
            render: (row) => row.answer || "-"
        },

        {
            key: "remarks",
            title: "Comment",
            render: (row) => (
                <div className="remarks-cell">
                    {row.remarks || "-"}
                </div>
            )
        },

       // ==================================================
// ATTACHMENT & DEVICE
// ==================================================

{
    key: "attachment",
    title: "Attachment",
    minWidth: "120px",
    align: "center",

    render: (row) => (

        row.attachment ? (

            <a
                href={`https://miarcus-backend.onrender.com/${row.attachment}`}
                target="_blank"
                rel="noopener noreferrer"
                className="table-link"
            >
                View
            </a>

        ) : (

            "-"

        )

    )
},

{
    key: "device",
    title: "Device",
    minWidth: "220px",   // Reduce width
    render: (row) => (
        <div className="device-cell">
            {row.device || "-"}
        </div>
    )
},

        // ==================================================
        // LOCATION
        // ==================================================

        {
            key: "latitude",
            title: "Latitude",
            render: (row) => row.latitude || "-"
        },

        {
            key: "longitude",
            title: "Longitude",
            render: (row) => row.longitude || "-"
        },

        {
            key: "location",
            title: "Geo Location",
            render: (row) => (

                row.latitude && row.longitude ? (

                    <a
                        href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-link"
                    >
                        <FaMapMarkerAlt />

                        {" "}View Map
                    </a>

                ) : (

                    "-"

                )

            )
        },

      {
    key: "actions",
    title: "Actions",
    minWidth: "360px",
    width: "360px",
    align: "center",

    render: (row) => (

        <div className="action-buttons">

            {canView && (

                <button
                    type="button"
                    className="view-btn"
                    onClick={() => handleView(row.id)}
                >
                    <FaEye />
                    <span>View</span>
                </button>

            )}

            {canEdit && (

                <button
                    type="button"
                    className="edit-btn"
                    onClick={() => handleEdit(row)}
                >
                    <FaEdit />
                    <span>Edit</span>
                </button>

            )}

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

            {/* ======================================================
                PAGE HEADER
            ====================================================== */}

            <PageHeader
                title="Checklist Reports"
                subtitle="Manage submitted checklist reports."
            />

            {/* ======================================================
                PAGE TOOLBAR
            ====================================================== */}
<PageToolbar

    search={search}

    setSearch={setSearch}

    placeholder="Search Checklist Reports..."

    showAdd={false}

    showExport={canView}

    onExport={handleExport}

    showBulkUpload={canAdd}

    bulkUploadText="Bulk Upload"

    onBulkUpload={() => setShowBulkUpload(true)}

    showDeleteAll={false}

/>
            {/* ======================================================
                FILTER BAR
            ====================================================== */}

            <FilterBar
                onClear={handleClearFilters}
            >

                <div className="filter-group">

                    <label>From Date</label>

                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) =>
                            setFromDate(e.target.value)
                        }
                    />

                </div>

                <div className="filter-group">

                    <label>To Date</label>

                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) =>
                            setToDate(e.target.value)
                        }
                    />

                </div>

                <div className="filter-group">

                    <label>Checklist Type</label>

                    <select
                        value={selectedChecklist}
                        onChange={(e) =>
                            setSelectedChecklist(e.target.value)
                        }
                    >

                        <option value="">
                            All Checklist Types
                        </option>

                        {checklistTypes.map((item) => (

                            <option
                                key={item.id}
                                value={item.id}
                            >

                                {item.checklist_name}

                            </option>

                        ))}

                    </select>

                </div>

                <div className="filter-group">

                    <label>Store</label>

                    <select
                        value={selectedStore}
                        onChange={(e) =>
                            setSelectedStore(e.target.value)
                        }
                    >

                        <option value="">
                            All Stores
                        </option>

                        {stores.map((item) => (

                            <option
                                key={item.id}
                                value={item.id}
                            >

                                {item.store_name}

                            </option>

                        ))}

                    </select>

                </div>

                <div className="filter-group">

                    <label>Employee</label>

                    <select
                        value={selectedEmployee}
                        onChange={(e) =>
                            setSelectedEmployee(e.target.value)
                        }
                    >

                        <option value="">
                            All Employees
                        </option>

                        {users.map((item) => (

                            <option
                                key={item.id}
                                value={item.id}
                            >

                                {item.name}

                            </option>

                        ))}

                    </select>

                </div>

            </FilterBar>

            {/* ======================================================
                CARD
            ====================================================== */}

            <Card
                title="Checklist Report List"
            >

                <DataTable

                    columns={columns}

                    data={currentReports}

                    loading={loading}

                    emptyTitle="No Reports Found"

                    emptyDescription="There are no Checklist Reports available."

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
    BULK UPLOAD MODAL
====================================================== */}

<BulkUploadModal

    isOpen={showBulkUpload}

    onClose={() => setShowBulkUpload(false)}

 onSuccess={async () => {

    await loadData();

}}

    uploadFunction={uploadChecklistReport}

    title="Bulk Upload Checklist Reports"

    acceptedFile=".csv,.xlsx,.xls"

    sampleFile="/samples/checklist-report-sample.xlsx"

/>

            {/* ======================================================
                DELETE CONFIRMATION
            ====================================================== */}

            <ConfirmDialog
                open={showDeleteDialog}
                title="Delete Checklist Report"
                message="Are you sure you want to delete this Checklist Report?"
                confirmText="Delete"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteId(null);
                    setShowDeleteDialog(false);
                }}
            />

            {/* ======================================================
                VIEW MODAL
            ====================================================== */}

            {showViewModal && selectedReport && (

                <div className="modal-overlay">

                    <div className="report-modal">

                        <div className="modal-header">

                            <h3>
                                Checklist Report Details
                            </h3>

                            <button
                                className="close-btn"
                                onClick={() =>
                                    setShowViewModal(false)
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="modal-body">

                            <div className="detail-grid">

                                <div>
                                    <strong>Checklist</strong>
                                    <p>
                                        {selectedReport.checklist_name || "-"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Store</strong>
                                    <p>
                                        {selectedReport.store_name || "-"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Employee</strong>
                                    <p>
                                        {selectedReport.employee_name || "-"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Employee ID</strong>
                                    <p>
                                        {selectedReport.employee_id || "-"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Status</strong>
                                    <p>
                                        {selectedReport.status || "-"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Submission Date</strong>
                                    <p>
                                        {formatDate(
                                            selectedReport.submission_date
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <strong>Department</strong>
                                    <p>
                                        {selectedReport.department_name || "-"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Device</strong>
                                    <p>
                                        {selectedReport.device || "-"}
                                    </p>
                                </div>

                            </div>

                            <hr />

                            <div className="question-section">

                                <h4>Question</h4>

                                <p>
                                    {selectedReport.question || "-"}
                                </p>

                                <h4>Answer</h4>

                                <p>
                                    {selectedReport.answer || "-"}
                                </p>

                                <h4>Comment</h4>

                                <p>
                                    {selectedReport.remarks || "-"}
                                </p>

                                <h4>Attachment</h4>

                                <p>

                                    {selectedReport.attachment ? (

                                        <a
                                            href={`https://miarcus-backend.onrender.com/${selectedReport.attachment}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="table-link"
                                        >
                                            View Attachment
                                        </a>

                                    ) : (

                                        "-"

                                    )}

                                </p>

                            </div>

                            <div className="map-section">

                                {selectedReport.latitude &&
                                selectedReport.longitude ? (

                                    <a
                                        href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="map-link"
                                    >
                                        <FaMapMarkerAlt />

                                        {" "}Open Location in Google Maps
                                    </a>

                                ) : (

                                    <p>
                                        Location Not Available
                                    </p>

                                )}

                            </div>

                        </div>

                    </div>

                </div>

            )}
                        {/* ======================================================
                EDIT MODAL
            ====================================================== */}

            {showEditModal && (

                <div className="modal-overlay">

                    <div className="report-modal">

                        {/* ==========================================
                            HEADER
                        ========================================== */}

                        <div className="modal-header">

                            <h3>Edit Checklist Report</h3>

                            <button
                                className="close-btn"
                                onClick={() =>
                                    setShowEditModal(false)
                                }
                            >
                                ×
                            </button>

                        </div>

                        {/* ==========================================
                            BODY
                        ========================================== */}

                        <div className="modal-body">

                            <div className="filter-group">

                                <label>Status</label>

                                <select
                                    value={editingReport.status}
                                    onChange={(e) =>
                                        setEditingReport({
                                            ...editingReport,
                                            status: e.target.value
                                        })
                                    }
                                >

                                    <option value="Completed">
                                        Completed
                                    </option>

                                    <option value="Pending">
                                        Pending
                                    </option>

                                    <option value="Failed">
                                        Failed
                                    </option>

                                </select>

                            </div>

                            <br />

                            <div className="filter-group">

                                <label>Answer</label>

                                <input
                                    type="text"
                                    value={editingReport.answer}
                                    onChange={(e) =>
                                        setEditingReport({
                                            ...editingReport,
                                            answer: e.target.value
                                        })
                                    }
                                />

                            </div>

                            <br />

                            <div className="filter-group">

                                <label>Remarks</label>

                                <textarea
                                    rows={5}
                                    value={editingReport.remarks}
                                    onChange={(e) =>
                                        setEditingReport({
                                            ...editingReport,
                                            remarks: e.target.value
                                        })
                                    }
                                />

                            </div>

                            <br />

                            <div className="filter-group">

                                <label>Device</label>

                                <input
                                    type="text"
                                    value={editingReport.device}
                                    onChange={(e) =>
                                        setEditingReport({
                                            ...editingReport,
                                            device: e.target.value
                                        })
                                    }
                                />

                            </div>

                            {/* ==========================================
                                ACTIONS
                            ========================================== */}

                            <div className="modal-actions">

                                <button
                                    className="cancel-btn"
                                    onClick={() =>
                                        setShowEditModal(false)
                                    }
                                >
                                    Cancel
                                </button>

                                {canEdit && (

                                    <button
                                        className="upload-btn"
                                        onClick={updateReport}
                                    >
                                        Save Changes
                                    </button>

                                )}

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

export default ChecklistReports;
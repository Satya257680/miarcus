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

// ======================================================
// MODALS
// ======================================================

import CreatePointModal from "../components/CreatePointModal";

// ======================================================
// ICONS
// ======================================================

import {
    FaEye,
    FaEdit,
    FaTrash,
    FaFileCsv,
    FaPlus
} from "react-icons/fa";

// ======================================================
// STYLE
// ======================================================

import "../styles/ActionPoints.css";

// ======================================================
// API
// ======================================================

const API = "http://localhost:5000";

// ======================================================
// COMPONENT
// ======================================================

function ActionPoints() {

    // ======================================================
    // STATES
    // ======================================================

    const [actionPoints, setActionPoints] = useState([]);

    const [stores, setStores] = useState([]);

    const [departments, setDepartments] = useState([]);

    const [checklists, setChecklists] = useState([]);

    const [loading, setLoading] = useState(true);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // ======================================================
    // FILTERS
    // ======================================================

    const [store, setStore] = useState("");

    const [department, setDepartment] = useState("");

    const [status, setStatus] = useState("");

    const [checklistType, setChecklistType] = useState("");

    const [startDate, setStartDate] = useState("");

    const [endDate, setEndDate] = useState("");

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

    const [showCreateModal, setShowCreateModal] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);

    const [showOpenModal, setShowOpenModal] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // ======================================================
    // SELECTED DATA
    // ======================================================

    const [selectedAction, setSelectedAction] = useState(null);

    const [deleteId, setDeleteId] = useState(null);

    // ======================================================
    // EDIT DATA
    // ======================================================

    const [editData, setEditData] = useState({

        id: "",

        question: "",

        answer: "",

        comment: "",

        department_name: "",

        sla: ""

    });

    // ======================================================
    // TAKE ACTION
    // ======================================================

    const [actionTaken, setActionTaken] = useState("");

    const [remarks, setRemarks] = useState("");

    const [completionDate, setCompletionDate] = useState("");

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

        : permissions["Action Points"] || "None";

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
    // LOAD ACTION POINTS
    // ======================================================

    const fetchActionPoints = async () => {

        try {

            setLoading(true);

            const res = await axios.get(

                `${API}/api/action-points`,

                {
                    params: {

                        page: currentPage,

                        limit: pageSize,

                        search,

                        store_id: store,

                        department_id: department,

                        status,

                        checklist_type_id: checklistType,

                        start_date: startDate,

                        end_date: endDate

                    }

                }

            );

            const result = res.data || {};

            setActionPoints(result.data || []);

            setTotalRecords(result.total || 0);

            setTotalPages(

                Math.ceil(

                    (result.total || 0) / pageSize

                ) || 1

            );

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to load Action Points."

            );

            setActionPoints([]);

        }
        finally {

            setLoading(false);

        }

    };

    // ======================================================
    // LOAD FILTERS
    // ======================================================

    const fetchFilters = async () => {

        try {

            const [

                storeRes,

                deptRes,

                checklistRes

            ] = await Promise.all([

                axios.get(`${API}/api/stores`),

                axios.get(`${API}/api/departments`),

                axios.get(`${API}/api/checklist-types`)

            ]);

            setStores(

                storeRes.data.data || []

            );

            setDepartments(

                deptRes.data.data || []

            );

            setChecklists(

                checklistRes.data.data || []

            );

        }
        catch (err) {

            console.error(err);

        }

    };

    // ======================================================
    // LOAD DATA
    // ======================================================

    useEffect(() => {

        if (!canView) {

            setLoading(false);

            return;

        }

        fetchFilters();

    }, [canView]);

    useEffect(() => {

        if (!canView) return;

        fetchActionPoints();

    }, [

        canView,

        currentPage,

        pageSize,

        search,

        store,

        department,

        status,

        checklistType,

        startDate,

        endDate

    ]);

    // ======================================================
    // UPDATE ACTION POINT
    // ======================================================

    const updateActionPoint = async () => {

        try {

            await axios.put(

                `${API}/api/action-points/${editData.id}`,

                {

                    answer: editData.answer,

                    remarks: editData.comment,

                    status: "No Action Taken"

                }

            );

            alert(

                "Action Point updated successfully."

            );

            setShowEditModal(false);

            fetchActionPoints();

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to update Action Point."

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

                `${API}/api/action-points/${deleteId}`

            );

            alert("Deleted Successfully");

            fetchActionPoints();

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to delete Action Point."

            );

        }
        finally {

            setDeleteId(null);

            setShowDeleteDialog(false);

        }

    };

    // ======================================================
    // OPEN TAKE ACTION MODAL
    // ======================================================

    const handleOpen = (row) => {

        if (!canEdit) return;

        setSelectedAction(row);

        setActionTaken("");

        setRemarks("");

        setCompletionDate("");

        setShowOpenModal(true);

    };

    // ======================================================
    // SAVE ACTION
    // ======================================================

    const saveActionPoint = async () => {

        try {

            await axios.put(

                `${API}/api/action-points/${selectedAction.id}/take-action`,

                {

                    action_taken: actionTaken,

                    remarks,

                    completion_date: completionDate

                }

            );

            alert("Action saved successfully.");

            setShowOpenModal(false);

            fetchActionPoints();

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to save Action Point."

            );

        }

    };

    // ======================================================
    // EXPORT
    // ======================================================

    const handleExport = () => {

        window.open(

            `${API}/api/action-points/export`,

            "_blank"

        );

    };

    // ======================================================
    // SUCCESS
    // ======================================================

    const handleSuccess = () => {

        setShowCreateModal(false);

        fetchActionPoints();

    };

    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setStore("");

        setDepartment("");

        setStatus("");

        setChecklistType("");

        setStartDate("");

        setEndDate("");

        setCurrentPage(1);

    };
        // ======================================================
    // FILTERED DATA
    // ======================================================

    const filteredActionPoints = useMemo(() => {

        return actionPoints.filter((item) => {

            const searchMatch =

                !search ||

                item.store_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.question
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.checklist_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.department_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||

                item.answer
                    ?.toLowerCase()
                    .includes(search.toLowerCase());

            const storeMatch =

                !store ||

                item.store_id == store;

            const departmentMatch =

                !department ||

                item.department_id == department;

            const statusMatch =

                !status ||

                item.status === status;

            const checklistMatch =

                !checklistType ||

                item.checklist_type_id == checklistType;

            const fromMatch =

                !startDate ||

                new Date(item.date) >=

                new Date(startDate);

            const toMatch =

                !endDate ||

                new Date(item.date) <=

                new Date(endDate + "T23:59:59");

            return (

                searchMatch &&

                storeMatch &&

                departmentMatch &&

                statusMatch &&

                checklistMatch &&

                fromMatch &&

                toMatch

            );

        });

    }, [

        actionPoints,

        search,

        store,

        department,

        status,

        checklistType,

        startDate,

        endDate

    ]);

    // ======================================================
    // PAGINATION
    // ======================================================

    const currentData = filteredActionPoints;

    useEffect(() => {

        setCurrentPage(1);

    }, [

        search,

        store,

        department,

        status,

        checklistType,

        startDate,

        endDate

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
                    Action Points.

                </p>

            </div>

        );

    }

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {

        return (

            <div className="action-loading">

                Loading Action Points...

            </div>

        );

    }

    // ======================================================
    // TABLE COLUMNS
    // ======================================================
        const columns = [

        // ==================================================
        // ACTION DETAILS
        // ==================================================

        {
            key: "date",
            title: "Date",
            render: (row) => formatDate(row.date)
        },

        {
            key: "store_name",
            title: "Store",
            render: (row) => row.store_name || "-"
        },

        {
            key: "city",
            title: "City",
            render: (row) => row.city || "-"
        },

        {
            key: "state",
            title: "State",
            render: (row) => row.state || "-"
        },

        // ==================================================
        // CHECKLIST DETAILS
        // ==================================================

        {
            key: "checklist_name",
            title: "Checklist",
            render: (row) => row.checklist_name || "-"
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
            key: "department_name",
            title: "Department",
            render: (row) => row.department_name || "-"
        },

        {
            key: "answer",
            title: "Answer",
            render: (row) => row.answer || "-"
        },

        {
            key: "comment",
            title: "Comment",
            render: (row) => (
                <div className="remarks-cell">
                    {row.comment || "-"}
                </div>
            )
        },

        // ==================================================
        // ATTACHMENT
        // ==================================================

        {
            key: "attachment",
            title: "Attachment",
            render: (row) => (

                row.attachment ? (

                    <a
                        href={`${API}/${row.attachment.replace(/\\/g, "/")}`}
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

        // ==================================================
        // STATUS
        // ==================================================

        {
            key: "status",
            title: "Status",
            render: (row) => (
                <span
                    className={`status-badge ${(
                        row.status || ""
                    )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                >
                    {row.status || "-"}
                </span>
            )
        },

        {
            key: "sla_status",
            title: "SLA",
            render: (row) => (
                <span className="sla-cell">
                    {row.sla_status || "-"}
                </span>
            )
        },

        {
            key: "next_action",
            title: "Next Action",
            render: (row) => (

                row.next_action ? (

                    <button
                        className="open-btn"
                        onClick={() => handleOpen(row)}
                    >
                        {row.next_action}
                    </button>

                ) : (

                    "-"

                )

            )
        },

        {
            key: "remarks",
            title: "Remarks",
            render: (row) => (
                <div className="remarks-cell">
                    {row.remarks || "-"}
                </div>
            )
        },

        // ==================================================
        // HISTORY
        // ==================================================

        {
            key: "history",
            title: "History",
            render: (row) =>
                row.history ||
                row.created_by ||
                "-"
        },

        // ==================================================
        // ACTIONS
        // ==================================================

        {
            key: "actions",
            title: "Actions",
            width: "260px",
            align: "center",

            render: (row) => (

                <div className="action-buttons">

                    {canEdit && (

                        <button
                            className="edit-btn"
                            onClick={() => {

                                setEditData({

                                    id: row.id,

                                    question: row.question,

                                    department_name: row.department_name,

                                    answer: row.answer || "",

                                    comment: row.comment || "",

                                    sla: row.sla || ""

                                });

                                setShowEditModal(true);

                            }}
                        >
                            <FaEdit />

                            {" "}Edit
                        </button>

                    )}

                    {canDelete && (

                        <button
                            className="delete-btn"
                            onClick={() => handleDelete(row.id)}
                        >
                            <FaTrash />

                            {" "}Delete
                        </button>

                    )}

                </div>

            )

        }

    ];
return (

    <div className="action-points-page">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <PageHeader
            title="Action Points"
            subtitle="Manage and track Action Points."
        />

        {/* ======================================================
            PAGE TOOLBAR
        ====================================================== */}

        <PageToolbar

            search={search}

            setSearch={setSearch}

            placeholder="Search Action Points..."

            showAdd={canAdd}

            addText="Add Action Point"

            onAdd={() => setShowCreateModal(true)}

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
                STORE
            ========================================== */}

            <div className="filter-group">

                <label>Store</label>

                <select
                    value={store}
                    onChange={(e) =>
                        setStore(e.target.value)
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

            {/* ==========================================
                DEPARTMENT
            ========================================== */}

            <div className="filter-group">

                <label>Department</label>

                <select
                    value={department}
                    onChange={(e) =>
                        setDepartment(e.target.value)
                    }
                >

                    <option value="">
                        All Departments
                    </option>

                    {departments.map((item) => (

                        <option
                            key={item.id}
                            value={item.id}
                        >
                            {item.department_name}
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
                    value={status}
                    onChange={(e) =>
                        setStatus(e.target.value)
                    }
                >

                    <option value="">
                        All Status
                    </option>

                    <option value="Opened">
                        Opened
                    </option>

                    <option value="In Progress">
                        In Progress
                    </option>

                    <option value="Closed">
                        Closed
                    </option>

                    <option value="No Action Taken">
                        No Action Taken
                    </option>

                </select>

            </div>

            {/* ==========================================
                CHECKLIST
            ========================================== */}

            <div className="filter-group">

                <label>Checklist Type</label>

                <select
                    value={checklistType}
                    onChange={(e) =>
                        setChecklistType(e.target.value)
                    }
                >

                    <option value="">
                        All Checklist Types
                    </option>

                    {checklists.map((item) => (

                        <option
                            key={item.id}
                            value={item.id}
                        >
                            {item.checklist_name}
                        </option>

                    ))}

                </select>

            </div>

            {/* ==========================================
                START DATE
            ========================================== */}

            <div className="filter-group">

                <label>From Date</label>

                <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                        setStartDate(e.target.value)
                    }
                />

            </div>

            {/* ==========================================
                END DATE
            ========================================== */}

            <div className="filter-group">

                <label>To Date</label>

                <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                        setEndDate(e.target.value)
                    }
                />

            </div>

        </FilterBar>
                {/* ======================================================
            CARD
        ====================================================== */}

        <Card
            title="Action Point List"
        >

            <DataTable

                columns={columns}

                data={currentData}

                loading={loading}

                emptyTitle="No Action Points Found"

                emptyDescription="There are no Action Points available."

            />

            <Pagination

                currentPage={currentPage}

                totalPages={totalPages}

                totalRecords={totalRecords}

                pageSize={pageSize}

                onPageChange={setCurrentPage}

                onPageSizeChange={(size) => {

                    // Fixed page size (10)
                    // Keep API compatible

                    setCurrentPage(1);

                }}

            />

        </Card>
                {/* ======================================================
            CREATE ACTION POINT MODAL
        ====================================================== */}

        {canAdd && (

            <CreatePointModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleSuccess}
            />

        )}

        {/* ======================================================
            DELETE CONFIRMATION
        ====================================================== */}

        <ConfirmDialog
            open={showDeleteDialog}
            title="Delete Action Point"
            message="Are you sure you want to delete this Action Point?"
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
            EDIT ACTION POINT MODAL
        ====================================================== */}

        {showEditModal && (

            <div className="modal-overlay">

                <div className="report-modal">

                    <div className="modal-header">

                        <h3>Edit Action Point</h3>

                        <button
                            className="close-btn"
                            onClick={() => setShowEditModal(false)}
                        >
                            ×
                        </button>

                    </div>

                    <div className="modal-body">

                        <div className="filter-group">

                            <label>Question</label>

                            <input
                                type="text"
                                value={editData.question}
                                readOnly
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Department</label>

                            <input
                                type="text"
                                value={editData.department_name}
                                readOnly
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>SLA</label>

                            <input
                                type="text"
                                value={editData.sla}
                                readOnly
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Answer</label>

                            <input
                                type="text"
                                value={editData.answer}
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        answer: e.target.value
                                    })
                                }
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Comment</label>

                            <textarea
                                rows={4}
                                value={editData.comment}
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        comment: e.target.value
                                    })
                                }
                            />

                        </div>

                        <div className="modal-actions">

                            <button
                                className="cancel-btn"
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="upload-btn"
                                onClick={updateActionPoint}
                            >
                                Update
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        )}

        {/* ======================================================
            TAKE ACTION MODAL
        ====================================================== */}

        {showOpenModal && selectedAction && (

            <div className="modal-overlay">

                <div className="report-modal">

                    <div className="modal-header">

                        <h3>Take Action</h3>

                        <button
                            className="close-btn"
                            onClick={() => setShowOpenModal(false)}
                        >
                            ×
                        </button>

                    </div>

                    <div className="modal-body">

                        <div className="filter-group">

                            <label>Question</label>

                            <input
                                type="text"
                                value={selectedAction.question || ""}
                                readOnly
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Department</label>

                            <input
                                type="text"
                                value={selectedAction.department_name || ""}
                                readOnly
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Answer</label>

                            <input
                                type="text"
                                value={selectedAction.answer || ""}
                                readOnly
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Current Status</label>

                            <input
                                type="text"
                                value={selectedAction.status || ""}
                                readOnly
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Action Taken</label>

                            <textarea
                                rows={4}
                                value={actionTaken}
                                onChange={(e) =>
                                    setActionTaken(e.target.value)
                                }
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Remarks</label>

                            <textarea
                                rows={4}
                                value={remarks}
                                onChange={(e) =>
                                    setRemarks(e.target.value)
                                }
                            />

                        </div>

                        <br />

                        <div className="filter-group">

                            <label>Completion Date</label>

                            <input
                                type="date"
                                value={completionDate}
                                onChange={(e) =>
                                    setCompletionDate(e.target.value)
                                }
                            />

                        </div>

                        <div className="modal-actions">

                            <button
                                className="cancel-btn"
                                onClick={() => setShowOpenModal(false)}
                            >
                                Close
                            </button>

                            <button
                                className="upload-btn"
                                onClick={saveActionPoint}
                            >
                                Save
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        )}

    </div>

);

}

export default ActionPoints;
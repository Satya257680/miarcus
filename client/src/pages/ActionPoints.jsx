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

import CreatePointModal from "../components/CreatePointModal";

// ======================================================
// ICONS
// ======================================================

import {
    FaEdit,
    FaTrash,
    FaUpload,
    FaHistory,
    FaClock,
} from "react-icons/fa";

// ======================================================
// STYLE
// ======================================================

import "../styles/ActionPoints.css";

// ======================================================
// API
// ======================================================


// ======================================================
// API
// ======================================================

const API = API_BASE_URL;

// ======================================================
// COMPONENT
// ======================================================

// ==================================================
// SLA COUNTDOWN
// ==================================================

const getSlaMeta = (row, now = Date.now()) => {
    const status = String(row?.status || "").toLowerCase();

    if (status === "closed") {
        return {
            state: "completed",
            label: "Completed",
        };
    }

    let totalMinutes = Number(
        row?.sla_minutes ??
        0
    );

    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
        const legacyDays = Number(
            row?.sla_days ??
            row?.sla_value ??
            0
        );

        totalMinutes = legacyDays > 0
            ? legacyDays * 24 * 60
            : 0;
    }

    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0 || !row?.created_at) {
        return {
            state: "none",
            label: "No SLA",
        };
    }

    const createdAt = new Date(row.created_at).getTime();

    if (!Number.isFinite(createdAt)) {
        return {
            state: "none",
            label: "SLA unavailable",
        };
    }

    const deadline = createdAt + totalMinutes * 60 * 1000;
    const diffMs = deadline - now;
    const absoluteMinutes = Math.floor(Math.abs(diffMs) / 60000);

    const formatRemaining = (minutes) => {
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;

        return `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
    };

    if (diffMs <= 0) {
        return {
            state: "overdue",
            label: `OVERDUE · ${formatRemaining(absoluteMinutes)}`,
        };
    }

    const remaining = formatRemaining(
        Math.ceil(diffMs / 60000)
    );

    if (diffMs <= 24 * 60 * 60 * 1000) {
        return {
            state: "critical",
            label: `IMPORTANT · ${remaining}`,
        };
    }

    if (diffMs <= 48 * 60 * 60 * 1000) {
        return {
            state: "warning",
            label: `WARNING · ${remaining}`,
        };
    }

    return {
        state: "normal",
        label: remaining,
    };
};

function ActionPoints() {

    // ======================================================
    // STATES
    // ======================================================

    const [actionPoints, setActionPoints] = useState([]);

    const [stores, setStores] = useState([]);

    const [departments, setDepartments] = useState([]);

    const [checklists, setChecklists] = useState([]);

    const [nsoProjects, setNsoProjects] = useState([]);

    const [loading, setLoading] = useState(true);

    // Re-render the SLA countdown every minute without changing the stored Action Point status.
    const [slaNow, setSlaNow] = useState(() => Date.now());

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // ======================================================
    // FILTERS
    // ======================================================

    const [store, setStore] = useState("");

    const [department, setDepartment] = useState("");

    const [status, setStatus] = useState("Open");

    const [priority, setPriority] = useState("");

    const [checklistType, setChecklistType] = useState("");

    const [nsoProject, setNsoProject] = useState("");

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
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [history, setHistory] = useState([]);

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

        department_name: "",

        assigned_to: "",

        priority: "Medium",

        sla_days: 0,
        sla_hours: 0,
        sla_minutes_part: 0,

        remarks: "",
        comment: "",
        attachment: null,
        status: "Open"

    });

    // ======================================================
    // TAKE ACTION
    // ======================================================

    const [actionTaken, setActionTaken] = useState("");

    const [remarks, setRemarks] = useState("");
    const [actionComment, setActionComment] = useState("");
    const [actionStatus, setActionStatus] = useState("Closed");

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

    const permission =

        isAdmin

            ? "Full"

            : permissions["Action Points"] || "None";

    const canView =

        [

            "View",

            "Add",

            "Edit",

            "Full"

        ].includes(permission);

    const canAdd =

        [

            "Add",

            "Edit",

            "Full"

        ].includes(permission);

    const canEdit =

        [

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

            "/api/action-points",

            {

                params: {

                    page: currentPage,

                    limit: pageSize,

                    search,

                    store_id: store,

                    department_id: department,

                    checklist_type_id: checklistType,

                    priority,

                    status,

                    start_date: startDate,

                    end_date: endDate

                }

            }

        );

        const result = res.data || {};

        const rows = Array.isArray(result.data)
            ? result.data
            : [];

        // Backend stores the configured SLA in sla_value. Keep a stable
        // frontend alias and calculate the live countdown from created_at.
        setActionPoints(
            rows.map((row) => ({
                ...row,
                sla_days:
                    row.sla_days ??
                    row.sla_value ??
                    0,
                sla_minutes:
                    row.sla_minutes ??
                    (Number(row.sla_value || 0) * 1440),
            }))
        );

        setTotalRecords(

            result.pagination?.total || 0

        );

        setTotalPages(

            result.pagination?.totalPages || 1

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

            checklistRes,
            nsoRes

        ] = await Promise.all([

            axios.get(

                "/api/stores"

            ),

            axios.get(

                "/api/departments"

            ),

            axios.get(

                "/api/checklist-types"

            ),

            axios.get(

                "/api/new-store-openings",
                { params: { page: 1, limit: 1000 } }

            )

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

        setNsoProjects(

            nsoRes.data.data || []

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

}, [

    canView

]);



useEffect(() => {

    if (!canView) {

        return;

    }

    fetchActionPoints();

}, [

    canView,

    currentPage,

    pageSize,

    search,

    store,

    department,

    checklistType,

    priority,

    status,

    startDate,

    endDate

]);



// ======================================================
// UPDATE ACTION POINT
// ======================================================

const updateActionPoint = async () => {
    try {
        const data = new FormData();
        data.append("assigned_to", editData.assigned_to || "");
        data.append("priority", editData.priority || "Medium");
        data.append("sla_days", String(editData.sla_days ?? 0));
        data.append("sla_hours", String(editData.sla_hours ?? 0));
        data.append("sla_minutes", String(editData.sla_minutes_part ?? 0));
        data.append("remarks", editData.remarks || "");
        data.append("comment", editData.comment || "");
        data.append("status", editData.status || "Open");
        if (editData.attachment) data.append("attachment", editData.attachment);

        await axios.put(`/api/action-points/${editData.id}`, data);

        alert("Action Point updated successfully.");
        setShowEditModal(false);
        await fetchActionPoints();
        if (showHistoryModal) await openHistory({ id: editData.id });
    } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Unable to update Action Point.");
    }
};

// ======================================================
// EDIT / HISTORY HELPERS
// ======================================================

const prepareEdit = (row) => {
    const total = Number(row.sla_minutes || 0);
    setEditData({
        id: row.id,
        question: row.question || "",
        department_name: row.department_name || "",
        assigned_to: row.assigned_to || "",
        priority: row.priority || "Medium",
        sla_days: Math.floor(total / 1440),
        sla_hours: Math.floor((total % 1440) / 60),
        sla_minutes_part: total % 60,
        remarks: row.remarks || "",
        comment: row.comment || "",
        attachment: null,
        status: row.status || "Open"
    });
    setShowEditModal(true);
};

const openHistory = async (row) => {
    setSelectedAction(row);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
        const response = await axios.get(`/api/action-points/${row.id}/history`);
        setHistory(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
        console.error(err);
        setHistory([]);
        alert(err.response?.data?.message || "Unable to load Action Point history.");
    } finally {
        setHistoryLoading(false);
    }
};

const handleNextAction = async (row, value) => {
    if (!canEdit) return;
    if (value === "Closed" || value === "Completed") {
        setSelectedAction(row);
        setActionStatus("Closed");
        setActionTaken("");
        setRemarks(row.remarks || "");
        setActionComment(row.comment || "");
        setShowOpenModal(true);
        return;
    }

    try {
        await axios.put(`/api/action-points/${row.id}/status`, {
            status: value,
            comment: row.comment || ""
        });
        await fetchActionPoints();
    } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Unable to update Next Action.");
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

            `/api/action-points/${deleteId}`

        );

        alert(

            "Action Point deleted successfully."

        );

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
// DELETE ALL
// ======================================================

const confirmDeleteAll = async () => {
    if (!canDelete) return;

    try {
        await axios.delete(
            "/api/action-points"
        );

        alert("All Action Points deleted successfully.");
        setShowDeleteAllDialog(false);
        await fetchActionPoints();
    } catch (err) {
        console.error(err);
        alert(
            err.response?.data?.message ||
            "Unable to delete all Action Points."
        );
    }
};

// ======================================================
// BULK UPLOAD
// Uses the shared/global BulkUploadModal used by other master modules.
// The shared modal passes the selected File directly to this handler.
// ======================================================

const handleBulkUpload = async (file) => {
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
        "/api/action-points/bulk-upload",
        formData,
        {
            headers: {
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {}),
            }
        }
    );

    return response.data;
};

// ======================================================
// OPEN TAKE ACTION MODAL
// ======================================================

const handleOpen = (row) => {

    if (!canEdit) return;

    setSelectedAction(row);

    setActionTaken("");

    setRemarks(row.remarks || "");
    setActionComment(row.comment || "");
    setActionStatus("Closed");

    setShowOpenModal(true);

};



// ======================================================
// SAVE ACTION
// ======================================================

const saveActionPoint = async () => {
    try {
        await axios.put(
            `/api/action-points/${selectedAction.id}/take-action`,
            {
                action_taken: actionTaken,
                remarks,
                comment: actionComment,
                status: actionStatus
            }
        );

        alert(
            actionStatus === "Closed"
                ? "Action Point completed successfully."
                : `Action Point moved to ${actionStatus}.`
        );

        setShowOpenModal(false);
        await fetchActionPoints();
        if (showHistoryModal && selectedAction) await openHistory(selectedAction);
    } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Unable to update Action Point.");
    }
};

// ======================================================
// EXPORT
// ======================================================

const handleExport = async () => {

    try {

        const response = await axios.get(
            "/api/action-points/export",
            {
                responseType: "blob"
            }
        );

        const blob = new Blob(
            [response.data],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "ActionPoints.csv";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

    } catch (err) {

        console.error("ACTION POINT EXPORT ERROR:", err);

        alert(
            err.response?.data?.message ||
            "Unable to export Action Points."
        );
    }

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

    setNsoProject("");

    setStatus("Open");

    setPriority("");

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

            item.nso_store_name
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||

            item.nso_location
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||

            item.priority
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||

            item.status
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



        const priorityMatch =

            !priority ||

            item.priority === priority;



        const checklistMatch =

            !checklistType ||

            item.checklist_type_id == checklistType;


        const nsoMatch =

            !nsoProject ||

            item.new_store_opening_id == nsoProject;



        const fromMatch =

            !startDate ||

            new Date(item.submission_date || item.date) >=

            new Date(startDate);



        const toMatch =

            !endDate ||

            new Date(item.submission_date || item.date) <=

            new Date(endDate + "T23:59:59");



        return (

            searchMatch &&

            storeMatch &&

            departmentMatch &&

            nsoMatch &&

            statusMatch &&

            priorityMatch &&

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

    priority,

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

    priority,

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

const formatHistoryDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
};

// Keep countdown labels current while the page remains open.
useEffect(() => {

    const interval = window.setInterval(() => {
        setSlaNow(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(interval);

}, []);



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

        // ==================================================
        // ANSWER
        // ==================================================
        {
            key: "answer",
            title: "Answer",
            render: (row) => (
                <div className="answer-cell">
                    {row.answer ?? "-"}
                </div>
            )
        },

        // ==================================================
        // COMMENT
        // ==================================================
        {
            key: "comment",
            title: "Comment",
            render: (row) => (
                <div className="comment-cell">
                    {row.comment || row.answer_remarks || "-"}
                </div>
            )
        },

        // ==================================================
// PRIORITY
// ==================================================

{
    key: "priority",

    title: "Priority",

    render: (row) => (

        <span
            className={`priority-badge ${(
                row.priority || "medium"
            )
                .toLowerCase()}`}
        >

            {row.priority || "-"}

        </span>

    )

},

// ==================================================
// ASSIGNED TO
// ==================================================

{
    key: "assigned_to",

    title: "Assigned To",

    render: (row) => (

        <div className="remarks-cell">

            {row.assigned_to_name ||

             row.assigned_to ||

             "-"}

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



// ==================================================
// SLA DAYS
// ==================================================

{
    key: "sla_minutes",

    title: "SLA Countdown",

    render: (row) => {

        const meta = getSlaMeta(row, slaNow);

        return (
            <span
                className={`sla-cell sla-${meta.state}`}
                title={
                    meta.state === "overdue"
                        ? "SLA breached. Complete this Action Point immediately."
                        : meta.state === "warning"
                            ? "SLA is due soon."
                            : meta.state === "critical"
                            ? "SLA is due now. Immediate action is important."
                            : "SLA countdown"
                }
            >
                {meta.label}
            </span>
        );

    }

},



// ==================================================
// NEXT ACTION
// ==================================================

{
    key: "next_action",
    title: "Next Action",
    render: (row) => (
        <div className="next-action-cell">
            <select
                className={`next-action-select next-${String(row.status || "Open").toLowerCase().replace(/\s+/g, "-")}`}
                value={row.status === "Closed" ? "Closed" : row.status || "Open"}
                onChange={(e) => handleNextAction(row, e.target.value)}
                disabled={!canEdit}
                aria-label={`Next Action for Action Point ${row.id}`}
            >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Close</option>
                <option value="Completed">Completed</option>
            </select>
        </div>
    )
},

// ==================================================
// REMARKS
// ==================================================

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
    render: (row) => (
        <div className="history-cell-content">
            <div className="history-last-entry">
                <strong>{row.last_history_status || row.status || "Open"}</strong>
                <span>by {row.last_history_by || "System"}</span>
                <small>{row.last_history_at ? formatHistoryDate(row.last_history_at) : "No history timestamp"}</small>
            </div>
            <button
                type="button"
                className="history-view-btn"
                onClick={() => openHistory(row)}
            >
                <FaHistory /> History
            </button>
        </div>
    )
},

// ==================================================
// ACTIONS
// ==================================================

{
    key: "actions",

    title: "Actions",

    width: "390px",

    align: "center",

    render: (row) => (

        <div className="action-buttons action-buttons-horizontal">

            {canEdit && (

                <button
                    className="edit-btn"
                    onClick={() => prepareEdit(row)}
                >

                    <FaEdit />

                    {" "}Edit

                </button>

            )}



            {row.status !== "Closed" && canEdit && (

                <button
                    className="open-btn"
                    onClick={() => handleOpen(row)}
                >

                    Take Action

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

        {(canAdd || canDelete) && (
            <div className="action-point-management-actions">
                {canAdd && (
                    <button
                        type="button"
                        className="bulk-upload-btn"
                        onClick={() => setShowBulkModal(true)}
                    >
                        <FaUpload />
                        Bulk Upload
                    </button>
                )}

                {canDelete && (
                    <button
                        type="button"
                        className="delete-all-action-btn"
                        onClick={() => setShowDeleteAllDialog(true)}
                    >
                        <FaTrash />
                        Delete All
                    </button>
                )}
            </div>
        )}

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
                NEW STORE OPENING
            ========================================== */}

            <div className="filter-group">

                <label>NSO Project</label>

                <select
                    value={nsoProject}
                    onChange={(e) =>
                        setNsoProject(e.target.value)
                    }
                >

                    <option value="">
                        All NSO Projects
                    </option>

                    {nsoProjects.map((item) => (

                        <option
                            key={item.id}
                            value={item.id}
                        >
                            #{item.id} - {item.store_name || item.location || "NSO Project"}
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

                    <option value="Open">
                        Open
                    </option>

                    <option value="In Progress">
                        In Progress
                    </option>

                    <option value="Closed">
                        Closed
                    </option>

                </select>

            </div>

            {/* ==========================================
                PRIORITY
            ========================================== */}

            <div className="filter-group">

                <label>Priority</label>

                <select
                    value={priority}
                    onChange={(e) =>
                        setPriority(e.target.value)
                    }
                >

                    <option value="">
                        All Priority
                    </option>

                    <option value="Low">
                        Low
                    </option>

                    <option value="Medium">
                        Medium
                    </option>

                    <option value="High">
                        High
                    </option>

                    <option value="Critical">
                        Critical
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

<Card title="Action Point List">

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

        showPageSize={false}

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
    DELETE ALL CONFIRMATION
====================================================== */}

<ConfirmDialog
    open={showDeleteAllDialog}
    title="Delete All Action Points"
    message="This will permanently delete all Action Points. Are you sure?"
    confirmText="Delete All"
    cancelText="Cancel"
    confirmVariant="danger"
    onConfirm={confirmDeleteAll}
    onCancel={() => setShowDeleteAllDialog(false)}
/>

{/* ======================================================
    BULK UPLOAD MODAL
====================================================== */}

<BulkUploadModal
    isOpen={showBulkModal}
    onClose={() => setShowBulkModal(false)}
    title="Bulk Upload Action Points"
    uploadFunction={handleBulkUpload}
    onSuccess={fetchActionPoints}
    acceptedFile=".csv,.xlsx,.xls"
/>

{/* ======================================================
    EDIT ACTION POINT MODAL
====================================================== */}

{showEditModal && (

    <div className="modal-overlay action-workflow-overlay">

        <div className="workflow-modal action-edit-modal">

            <div className="workflow-modal-header">
                <div>
                    <span className="workflow-eyebrow">ACTION POINT WORKFLOW</span>
                    <h3>Edit Action Point</h3>
                    <p>Update ownership, SLA, status and conversation details.</p>
                </div>

                <button

                    className="workflow-close-btn"

                    onClick={() => setShowEditModal(false)}

                >

                    ×

                </button>

            </div>



            <div className="workflow-modal-body">

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

                    <label>Assigned To</label>

                    <input

                        type="text"

                        value={editData.assigned_to}

                        onChange={(e) =>

                            setEditData({

                                ...editData,

                                assigned_to: e.target.value

                            })

                        }

                    />

                </div>

                <br />



                <div className="filter-group">

                    <label>Priority</label>

                    <select

                        value={editData.priority}

                        onChange={(e) =>

                            setEditData({

                                ...editData,

                                priority: e.target.value

                            })

                        }

                    >

                        <option value="Low">

                            Low

                        </option>

                        <option value="Medium">

                            Medium

                        </option>

                        <option value="High">

                            High

                        </option>

                        <option value="Critical">

                            Critical

                        </option>

                    </select>

                </div>

                <br />



                <div className="filter-group">
                    <label>SLA</label>

                    <div className="edit-sla-grid">
                        <div>
                            <span>Days</span>
                            <input
                                type="number"
                                min="0"
                                value={editData.sla_days}
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        sla_days: e.target.value
                                    })
                                }
                            />
                        </div>

                        <div>
                            <span>Hours</span>
                            <input
                                type="number"
                                min="0"
                                max="23"
                                value={editData.sla_hours}
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        sla_hours: e.target.value
                                    })
                                }
                            />
                        </div>

                        <div>
                            <span>Minutes</span>
                            <input
                                type="number"
                                min="0"
                                max="59"
                                value={editData.sla_minutes_part}
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        sla_minutes_part: e.target.value
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="edit-form-divider"></div>

                <div className="filter-group">
                    <label>Comment</label>
                    <textarea
                        rows={3}
                        value={editData.comment}
                        onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
                        placeholder="Add or update the Action Point comment"
                    />
                </div>

                <div className="filter-group">
                    <label>Attachment <span className="optional-text">Optional</span></label>
                    <input
                        type="file"
                        onChange={(e) => setEditData({ ...editData, attachment: e.target.files?.[0] || null })}
                    />
                </div>

                <br />

                <div className="filter-group">

                    <label>Status</label>

                    <select

                        value={editData.status}

                        onChange={(e) =>

                            setEditData({

                                ...editData,

                                status: e.target.value

                            })

                        }

                    >

                        <option value="Open">

                            Open

                        </option>

                        <option value="In Progress">

                            In Progress

                        </option>

                        <option value="Closed">

                            Closed

                        </option>

                    </select>

                </div>

                <br />



                <div className="filter-group">

                    <label>Remarks</label>

                    <textarea

                        rows={4}

                        value={editData.remarks}

                        onChange={(e) =>

                            setEditData({

                                ...editData,

                                remarks: e.target.value

                            })

                        }

                    />

                </div>



                <div className="workflow-modal-actions">

                    <button

                        className="cancel-btn"

                        onClick={() =>

                            setShowEditModal(false)

                        }

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

    <div className="modal-overlay action-workflow-overlay">

        <div className="workflow-modal action-take-modal">

            <div className="workflow-modal-header">
                <div>
                    <span className="workflow-eyebrow">NEXT ACTION</span>
                    <h3>Take Action</h3>
                    <p>Move the Action Point forward and keep a complete audit trail.</p>
                </div>

                <button
                    className="workflow-close-btn"
                    onClick={() => setShowOpenModal(false)}
                >
                    ×
                </button>

            </div>

            <div className="workflow-modal-body">

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

                    <label>Priority</label>

                    <input
                        type="text"
                        value={selectedAction.priority || ""}
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
                    <label>Next Action</label>
                    <select
                        value={actionStatus}
                        onChange={(e) => setActionStatus(e.target.value)}
                    >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Closed">Close / Completed</option>
                    </select>
                </div>

                <div className="filter-group">

                    <label>Action Taken {actionStatus === "Closed" && <span className="required-star">*</span>}</label>

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
                    <label>Comment</label>
                    <textarea
                        rows={3}
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        placeholder="Add a workflow comment"
                    />
                </div>

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

                <div className="workflow-modal-actions">

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

{/* ======================================================
    ACTION POINT HISTORY MODAL
====================================================== */}

{showHistoryModal && selectedAction && (
    <div className="modal-overlay action-workflow-overlay">
        <div className="workflow-modal history-modal">
            <div className="workflow-modal-header history-header">
                <div>
                    <span className="workflow-eyebrow">AUDIT TRAIL</span>
                    <h3>Action Point History</h3>
                    <p>Every creation, edit and Next Action change is recorded with the user and exact time.</p>
                </div>
                <button
                    type="button"
                    className="workflow-close-btn"
                    onClick={() => setShowHistoryModal(false)}
                >×</button>
            </div>

            <div className="history-summary">
                <div><span>Action Point</span><strong>#{selectedAction.id}</strong></div>
                <div><span>Current Status</span><strong>{selectedAction.status || "Open"}</strong></div>
                <div><span>Store</span><strong>{selectedAction.store_name || "-"}</strong></div>
                <button type="button" className="history-edit-btn" onClick={() => { setShowHistoryModal(false); prepareEdit(selectedAction); }}>
                    <FaEdit /> Edit Action Point
                </button>
            </div>

            <div className="workflow-modal-body history-body">
                {historyLoading ? (
                    <div className="history-loading"><FaClock /> Loading history…</div>
                ) : history.length === 0 ? (
                    <div className="history-empty"><FaHistory /><strong>No history found</strong><span>New changes will appear here automatically.</span></div>
                ) : (
                    <div className="history-timeline">
                        {history.map((item) => (
                            <div className="history-item" key={item.id}>
                                <div className="history-dot"></div>
                                <div className="history-card">
                                    <div className="history-card-top">
                                        <div>
                                            <span className={`history-action history-${String(item.action_type || "").toLowerCase()}`}>{String(item.action_type || "UPDATE").replace(/_/g, " ")}</span>
                                            {item.status && <span className="history-status">{item.status}</span>}
                                        </div>
                                        <time>{formatHistoryDate(item.created_at)}</time>
                                    </div>
                                    <div className="history-user">
                                        <strong>{item.changed_by_name || "System"}</strong>
                                        {item.changed_by_employee_id && <span>Employee ID: {item.changed_by_employee_id}</span>}
                                    </div>
                                    {item.comment && <div className="history-note"><b>Comment</b><span>{item.comment}</span></div>}
                                    {item.remarks && <div className="history-note"><b>Remarks</b><span>{item.remarks}</span></div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
)}
    </div>

);

}

export default ActionPoints;
import { useEffect, useMemo, useState } from "react";
import axios from "../axiosConfig.js";

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
    FaEdit,
    FaTrash,
    FaUpload,
    FaDownload,
} from "react-icons/fa";

// ======================================================
// STYLE
// ======================================================

import "../styles/ActionPoints.css";

// ======================================================
// API
// ======================================================


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

    const [status, setStatus] = useState("");

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
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkUploading, setBulkUploading] = useState(false);

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

        status: "Open"

    });

    // ======================================================
    // TAKE ACTION
    // ======================================================

    const [actionTaken, setActionTaken] = useState("");

    const [remarks, setRemarks] = useState("");

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

        await axios.put(

            `/api/action-points/${editData.id}`,

            {
                assigned_to: editData.assigned_to,
                priority: editData.priority,
                sla_days: editData.sla_days,
                sla_hours: editData.sla_hours,
                sla_minutes: editData.sla_minutes_part,
                remarks: editData.remarks,
                status: editData.status
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
// ======================================================

const downloadBulkTemplate = () => {
    const headers = [
        "Store ID",
        "Department ID",
        "Question ID",
        "Submission ID",
        "Submission Answer ID",
        "Assigned To",
        "Priority",
        "SLA Days",
        "SLA Hours",
        "SLA Minutes",
        "Status",
        "Remarks"
    ];

    const example = [
        "1",
        "1",
        "1",
        "",
        "",
        "",
        "High",
        "3",
        "4",
        "30",
        "Open",
        "Example action point"
    ];

    const csv = `${headers.join(",")}\n${example.map((value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
    }).join(",")}\n`;

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "miarcus-action-points-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

const handleBulkUpload = async () => {
    if (!bulkFile || bulkUploading) return;

    setBulkUploading(true);

    try {
        const token =
            localStorage.getItem("token") ||
            localStorage.getItem("accessToken");

        const formData = new FormData();
        formData.append("file", bulkFile);

        await axios.post(
            "/api/action-points/bulk-upload",
            formData,
            {
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );

        alert("Action Points bulk upload completed.");
        setBulkFile(null);
        setShowBulkModal(false);
        await fetchActionPoints();
    } catch (err) {
        console.error(err);

        const message =
            err.response?.data?.message ||
            "Unable to bulk upload Action Points.";

        const errors =
            Array.isArray(err.response?.data?.errors) &&
            err.response.data.errors.length
                ? `\n\n${err.response.data.errors.slice(0, 8).join("\n")}`
                : "";

        alert(`${message}${errors}`);
    } finally {
        setBulkUploading(false);
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

                remarks

            }

        );

        alert(

            "Action completed successfully."

        );

        setShowOpenModal(false);

        fetchActionPoints();

    }

    catch (err) {

        console.error(err);

        alert(

            err.response?.data?.message ||

            "Unable to complete Action Point."

        );

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

    setStatus("");

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

        row.status !== "Closed" ? (

            <button
                className="open-btn"
                onClick={() => handleOpen(row)}
            >

                Take Action

            </button>

        ) : (

            <span>

                Completed

            </span>

        )

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

        row.completed_at

            ? `Closed on ${formatDate(row.completed_at)}`

            : "Open"

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
                    onClick={() => {

                        setEditData({

                            id: row.id,

                            question: row.question,

                            department_name:
                                row.department_name,

                            assigned_to:
                                row.assigned_to || "",

                            priority:
                                row.priority || "Medium",

                            sla_days: Math.floor(
                                Number(row.sla_minutes || 0) / 1440
                            ),
                            sla_hours: Math.floor(
                                (Number(row.sla_minutes || 0) % 1440) / 60
                            ),
                            sla_minutes_part: Number(
                                row.sla_minutes || 0
                            ) % 60,

                            remarks:
                                row.remarks || "",

                            status:
                                row.status || "Open"

                        });

                        setShowEditModal(true);

                    }}
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
                {canDelete && (
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

{showBulkModal && (
    <div className="modal-overlay">
        <div className="report-modal bulk-upload-modal">
            <div className="modal-header">
                <div>
                    <h3>Bulk Upload Action Points</h3>
                    <p className="bulk-upload-help">
                        Upload CSV or Excel. Store ID, Question ID, Submission ID and Submission Answer ID are required.
                    </p>
                </div>

                <button
                    className="close-btn"
                    onClick={() => {
                        if (!bulkUploading) {
                            setBulkFile(null);
                            setShowBulkModal(false);
                        }
                    }}
                >
                    ×
                </button>
            </div>

            <div className="modal-body">
                <div className="bulk-template-row">
                    <div>
                        <strong>Recommended template</strong>
                        <p>
                            SLA supports Days + Hours + Minutes.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="bulk-template-btn"
                        onClick={downloadBulkTemplate}
                    >
                        <FaDownload />
                        Download Template
                    </button>
                </div>

                <div className="bulk-file-drop">
                    <input
                        id="action-point-bulk-file"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        disabled={bulkUploading}
                        onChange={(event) =>
                            setBulkFile(
                                event.target.files?.[0] || null
                            )
                        }
                    />

                    <label htmlFor="action-point-bulk-file">
                        <FaUpload />
                        <strong>
                            {bulkFile
                                ? bulkFile.name
                                : "Choose CSV / Excel file"}
                        </strong>
                        <span>
                            Maximum 10 MB
                        </span>
                    </label>
                </div>

                <div className="bulk-columns-info">
                    <strong>Columns:</strong>
                    Store ID, Department ID, Question ID, Submission ID,
                    Submission Answer ID, Assigned To, Priority, SLA Days,
                    SLA Hours, SLA Minutes, Status, Remarks.
                </div>
            </div>

            <div className="modal-actions">
                <button
                    type="button"
                    className="cancel-btn"
                    disabled={bulkUploading}
                    onClick={() => {
                        setBulkFile(null);
                        setShowBulkModal(false);
                    }}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    className="upload-btn"
                    disabled={!bulkFile || bulkUploading}
                    onClick={handleBulkUpload}
                >
                    <FaUpload />
                    {bulkUploading
                        ? "Uploading..."
                        : "Upload Action Points"}
                </button>
            </div>
        </div>
    </div>
)}

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



                <div className="modal-actions">

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
import { useEffect, useRef, useState } from "react";
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
    FaFileExcel,
    FaMagic,
    FaListUl,
    FaFolderOpen,
    FaHourglassHalf,
    FaCheckCircle,
    FaExclamationTriangle,
} from "react-icons/fa";

import InsightStrip, { useInsightSummary } from "../components/premium/InsightStrip";
import ReclassifyModal from "../components/premium/ReclassifyModal";

// ======================================================
// STYLE
// ======================================================

import "../styles/ActionPoints.css";
import "../styles/premium/ChecklistPremium.css";
import { exportManagementHealthCheck } from "../utils/managementHealthCheckExport.js";
import { exportFromCSV } from "../utils/exportUtils.js";
import { activeFilters, hasActiveFilters, collectIds, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";

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
// DISPLAY FIX — GARBLED TEXT ("â€\"", boxes, etc.)
//
// Some Question/Comment/Remarks text (mostly rows that came in
// through a bulk import, or older data written before the
// database connection was pinned to utf8mb4 — see config/db.js)
// contains a dash, curly quote or arrow that got mis-decoded as
// if it were Latin-1/cp1252 instead of UTF-8 — it now displays as
// "â€" followed by a box/replacement glyph instead of the real
// character. This repairs that specific, well-known pattern for
// display only (it never touches what's stored) by re-reading the
// mangled string's char codes as UTF-8 bytes. If the text doesn't
// actually look mangled, or the repair doesn't produce anything
// cleaner, the original text is returned untouched.
// ==================================================

const MOJIBAKE_PATTERN = /[ÂÃ][\u0080-¿]|�/;

const fixMojibake = (value) => {
    const text = String(value ?? "");
    if (!text || !MOJIBAKE_PATTERN.test(text)) return text;

    try {
        const bytes = Uint8Array.from(
            [...text].map((char) => char.charCodeAt(0))
        );
        const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

        // Only use the repaired version if it actually removed the
        // mangled pattern — otherwise the original text (which may
        // just happen to contain a real "Â"/"Ã" character) is safer.
        return MOJIBAKE_PATTERN.test(repaired) ? text : repaired;
    } catch {
        return text;
    }
};

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

    const [managementExporting, setManagementExporting] = useState(false);

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
    const [showReclassify, setShowReclassify] = useState(false);

    // KPI tiles – refreshed every time the list reloads.
    const { data: apSummary, loading: apSummaryLoading } = useInsightSummary(
        "/api/action-points/summary",
        { store_id: store || undefined },
        actionPoints
    );

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

// `silent` skips the loading flag so callers that must not unmount the
// current view (e.g. refreshing the table right after a Bulk Upload,
// while the Bulk Upload modal may still be open showing per-row results)
// can refresh the data without swapping the whole page out for the
// "Loading Action Points..." screen.
//
// BUG FIX ("blank on refresh, appears on the next refresh"): the fetch
// itself is retried once automatically (e.g. a transient/cold-start
// failure) before bothering the user with an alert and an empty table
// — the retry lives inside a single try/finally so `loading` is only
// ever toggled once per call, instead of flickering off and back on.
const fetchActionPointsOnce = () =>
    axios.get(
        "/api/action-points",
        {
            params: {
                page: currentPage,
                limit: pageSize,
                search,
                store_id: store,
                department_id: department,
                checklist_type_id: checklistType,
                new_store_opening_id: nsoProject,
                priority,
                status,
                start_date: startDate,
                end_date: endDate
            }
        }
    );

const fetchActionPoints = async ({ silent = false } = {}) => {

    try {

        if (!silent) setLoading(true);

        let res;

        try {
            res = await fetchActionPointsOnce();
        } catch (firstError) {
            console.warn("Action Points load failed, retrying once:", firstError.message);
            await new Promise((resolve) => setTimeout(resolve, 900));
            res = await fetchActionPointsOnce();
        }

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

        if (!silent) setLoading(false);

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

    nsoProject,

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
        const response = await axios.put(`/api/action-points/${row.id}/status`, {
            status: value,
            comment: row.comment || ""
        });

        // Keep the Action Point row in sync immediately with the status
        // selected in Next Action. The Action Point status is independent
        // from the Checklist Report status.
        const savedStatus = response.data?.status || value;

        setActionPoints((current) =>
            current.map((item) =>
                Number(item.id) === Number(row.id)
                    ? {
                        ...item,
                        status: savedStatus,
                        last_history_status: savedStatus
                    }
                    : item
            )
        );

        // Refresh from the server so the database/history remain the source
        // of truth after the optimistic UI update.
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

// Filters applied on the page. With any filter set, Delete All only
// removes the Action Points matching those filters.
const deleteFilters = activeFilters({
    search,
    store_id: store,
    department_id: department,
    checklist_type_id: checklistType,
    new_store_opening_id: nsoProject,
    priority,
    status,
    start_date: startDate,
    end_date: endDate
});
const isFilteredDelete = hasActiveFilters(deleteFilters);

const confirmDeleteAll = async () => {
    if (!canDelete) return;

    try {
        if (isFilteredDelete) {
            // Resolve every Action Point matching the filters (all pages).
            const res = await axios.get("/api/action-points", {
                params: { ...deleteFilters, page: 1, limit: 100000 }
            });
            const ids = collectIds(res.data?.data || []);

            if (!ids.length) {
                alert("No Action Points match the selected filters.");
                setShowDeleteAllDialog(false);
                return;
            }

            const response = await axios.delete("/api/action-points", {
                data: { scope: "filtered", ids }
            });

            alert(response.data?.message || `${ids.length} filtered Action Point(s) deleted successfully.`);
            setShowDeleteAllDialog(false);
            setCurrentPage(1);
            await fetchActionPoints();
            return;
        }

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
// The shared modal passes the selected File directly to this handler,
// plus an optional second `assembled` argument — see
// components/common/BulkUploadModal (enableChunkedUpload) and
// pages/ChecklistReports.jsx for the same pattern. When set, the file
// has ALREADY been fully transferred to the server in pieces (see
// server/middleware/chunkedUpload.js), so this sends the small
// { assembledFile } token instead of re-sending the whole file.
// ======================================================

const handleBulkUpload = async (file, assembled) => {
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    if (assembled?.assembledFile) {

        const response = await axios.post(
            "/api/action-points/bulk-upload",
            { assembledFile: assembled.assembledFile },
            { headers: authHeader }
        );

        return response.data;

    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
        "/api/action-points/bulk-upload",
        formData,
        { headers: authHeader }
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

const handleExport = async (format = "csv") => {

    try {

        const response = await axios.get(
            "/api/action-points/export",
            {
                responseType: "blob"
            }
        );

        const csvText = await response.data.text();

        await exportFromCSV({
            csvText,
            filename: "ActionPoints",
            format,
            title: "Action Points",
        });

    } catch (err) {

        console.error("ACTION POINT EXPORT ERROR:", err);

        alert(
            err.response?.data?.message ||
            "Unable to export Action Points."
        );
    }

};



// ======================================================
// MANAGEMENT XLSX EXPORT
// Uses the management-provided Store Health Check template.
// Fetches all rows matching the current Action Point filters.
// ======================================================

const handleManagementExport = async () => {

    if (!canView) return;

    try {
        setManagementExporting(true);

        const response = await axios.get(
            "/api/action-points",
            {
                params: {
                    page: 1,
                    limit: 100000,
                    search,
                    store_id: store,
                    department_id: department,
                    checklist_type_id: checklistType,
                    priority,
                    status,
                    start_date: startDate,
                    end_date: endDate,
                },
            }
        );

        const rows = Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        if (!rows.length) {
            alert("No Action Points found for the selected filters.");
            return;
        }

        const storesResponse = await axios.get("/api/stores");
        const storesForExport = Array.isArray(storesResponse.data?.data)
            ? storesResponse.data.data
            : [];

        await exportManagementHealthCheck({
            records: rows,
            stores: storesForExport,
            mode: "action",
            filename: "Action_Points_Management_Store_Health_Check.xlsx",
        });
    } catch (error) {
        console.error("MANAGEMENT ACTION POINT EXPORT ERROR:", error);
        alert(error?.message || "Unable to create Management XLSX export.");
    } finally {
        setManagementExporting(false);
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
// TABLE DATA
// ======================================================
//
// BUG FIX (vestigial re-filter): this used to re-apply every filter a
// second time on the client, on top of `actionPoints`, which the
// server (see fetchActionPointsOnce above) already fetched pre-
// filtered and paginated for the exact same criteria — search, store,
// department, status, priority, checklist type, NSO project, and date
// range are all sent as server query params. Re-filtering the already-
// filtered/paginated page client-side did nothing useful and could
// only ever narrow that one page further (e.g. hiding rows that
// server-side pagination had already decided belonged on this page),
// never restore rows the server correctly excluded. `actionPoints` is
// used directly now, same as Checklist Reports.
// ======================================================

const currentData = actionPoints;

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
// BACKGROUND AUTO-REFRESH
// ======================================================
//
// Previously only the SLA countdown label re-rendered every minute —
// the actual Action Points DATA never refetched on its own, so a new
// bulk upload or submission from another device/tab only showed up
// after a manual page reload. This mirrors the same fix already
// applied to Checklist Reports: a quiet periodic refetch plus a
// refetch on window focus, both skipped while a modal is open so an
// in-progress edit/create/history view is never unmounted out from
// under the person using it.
// ======================================================

const modalOpenRef = useRef(false);

useEffect(() => {
    modalOpenRef.current =
        showCreateModal ||
        showEditModal ||
        showOpenModal ||
        showDeleteDialog ||
        showDeleteAllDialog ||
        showBulkModal ||
        showHistoryModal;
}, [
    showCreateModal,
    showEditModal,
    showOpenModal,
    showDeleteDialog,
    showDeleteAllDialog,
    showBulkModal,
    showHistoryModal
]);

useEffect(() => {

    if (!canView) return;

    const silentTick = () => {
        if (modalOpenRef.current) return;
        fetchActionPoints({ silent: true });
    };

    const interval = window.setInterval(silentTick, 60 * 1000);

    const handleFocus = () => silentTick();
    window.addEventListener("focus", handleFocus);

    return () => {
        window.clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [canView, currentPage, pageSize, search, store, department, checklistType, nsoProject, priority, status, startDate, endDate]);



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
            minWidth: "150px",
            // `row.date` is COALESCE(checklist submission_date, Action
            // Point created_at) from the server (see models/
            // actionPointModel.js) — the real checklist submission
            // timestamp, or the bulk-uploaded file's own timestamp (see
            // checklistReportService.parseSubmissionDate), whenever one
            // exists. It only ever falls back to "now" for something
            // that genuinely has no submission to date itself by (a
            // manually added Action Point, or a fresh submission made
            // today) — it's never forced to today's date otherwise.
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
            minWidth: "287px",
            render: (row) => (
                <div className="question-cell">
                    {fixMojibake(row.question) || "-"}
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
            minWidth: "180px",
            render: (row) => (
                <div className="answer-cell">
                    {row.answer
                        ? <span className="answer-chip issue">{fixMojibake(row.answer)}</span>
                        : "-"}
                </div>
            )
        },

        // ==================================================
        // COMMENT
        // ==================================================
        {
            key: "comment",
            title: "Comment",
            minWidth: "260px",
            render: (row) => (
                <div className="comment-cell">
                    {fixMojibake(row.comment || row.answer_remarks) || "-"}
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

        <div className="assigned-to-cell">

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
                href={
                    /^https?:\/\//i.test(String(row.attachment))
                        ? row.attachment
                        : `${API}/${String(row.attachment).replace(/\\/g, "/")}`
                }
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
// SLA (DAYS) — the configured SLA itself, shown as its own
// column so the number of days is visible at a glance instead
// of only ever being buried inside the live countdown text.
// ==================================================

{
    key: "sla_days_display",

    title: "SLA (Days)",

    render: (row) => {

        const rawDays = row.sla_days;
        const hasDays = rawDays !== null && rawDays !== undefined && rawDays !== "" && Number(rawDays) > 0;

        return (
            <span className={`sla-days-cell ${hasDays ? "" : "sla-days-none"}`}>
                {hasDays
                    ? `${rawDays} day${Number(rawDays) === 1 ? "" : "s"}`
                    : "No SLA"}
            </span>
        );

    }

},

// ==================================================
// OVERDUE — a dedicated Yes/No column, on top of the SLA
// Countdown badge already turning red: once the SLA deadline
// has passed — including simply rolling over into the next
// day, exactly like the "Overdue by Xd Yh Zm" figure the
// Action Points export already writes — this reads "Overdue"
// at a glance without needing to read the countdown text.
// ==================================================

{
    key: "overdue",

    title: "Overdue",

    render: (row) => {

        const meta = getSlaMeta(row, slaNow);
        const isOverdue = meta.state === "overdue";
        const notApplicable = meta.state === "none" || meta.state === "completed";

        return (
            <span className={`overdue-badge ${isOverdue ? "overdue-yes" : "overdue-no"}`}>
                {isOverdue ? "Overdue" : notApplicable ? "-" : "On Time"}
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

    minWidth: "220px",

    render: (row) => (

        <div className="remarks-cell">

            {fixMojibake(row.remarks) || "-"}

        </div>

    )

},



// ==================================================
// HISTORY
// ==================================================

{
    key: "history",
    title: "History",
    minWidth: "210px",
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

    <div className="action-points-page ap-premium">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <PageHeader
            className="premium-hero"
            title="Action Points"
            subtitle="Only checklist answers that report a problem land here. Once closed, they move to Checklist Reports."
        />

        <InsightStrip
            loading={apSummaryLoading}
            items={[
                {
                    key: "total",
                    label: "Total",
                    value: apSummary?.total,
                    hint: "All Action Points",
                    tone: "violet",
                    icon: FaListUl,
                    active: !status,
                    onClick: () => { setStatus(""); setCurrentPage(1); }
                },
                {
                    key: "open",
                    label: "Open",
                    value: apSummary?.open,
                    hint: "Waiting for action",
                    tone: "blue",
                    icon: FaFolderOpen,
                    active: status === "Open",
                    onClick: () => { setStatus("Open"); setCurrentPage(1); }
                },
                {
                    key: "progress",
                    label: "In Progress",
                    value: apSummary?.in_progress,
                    hint: "Being worked on",
                    tone: "amber",
                    icon: FaHourglassHalf,
                    active: status === "In Progress",
                    onClick: () => { setStatus("In Progress"); setCurrentPage(1); }
                },
                {
                    key: "closed",
                    label: "Completed",
                    value: apSummary?.closed,
                    hint: "Moved to Checklist Reports",
                    tone: "green",
                    icon: FaCheckCircle,
                    active: status === "Closed",
                    onClick: () => { setStatus("Closed"); setCurrentPage(1); }
                },
                {
                    key: "overdue",
                    label: "Overdue",
                    value: apSummary?.overdue,
                    hint: `${apSummary?.high_priority ?? 0} high / critical open`,
                    tone: "red",
                    icon: FaExclamationTriangle
                }
            ]}
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

        >
            {canView && (
                <button
                    type="button"
                    className="toolbar-btn export-btn"
                    onClick={handleManagementExport}
                    disabled={managementExporting}
                    title="Export using the management Store Health Check format"
                >
                    <FaFileExcel />
                    {managementExporting ? "Creating XLSX..." : "Management XLSX"}
                </button>
            )}
        </PageToolbar>

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
                        className="recheck-answers-btn"
                        onClick={() => setShowReclassify(true)}
                        title="Re-check existing checklist answers and fix wrongly raised / missed Action Points"
                    >
                        <FaMagic />
                        Re-check Answers
                    </button>
                )}

                {canDelete && (
                    <button
                        type="button"
                        className="delete-all-action-btn"
                        onClick={() => setShowDeleteAllDialog(true)}
                    >
                        <FaTrash />
                        {deleteAllLabel(isFilteredDelete, isFilteredDelete ? totalRecords : undefined)}
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

<Card
    className="premium-table-card"
    title="Action Point List"
    subtitle={`${totalRecords} record${totalRecords === 1 ? "" : "s"}${status ? ` · ${status}` : ""}`}
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

        showPageSize={false}

    />

</Card>
{canDelete && (
    <ReclassifyModal
        isOpen={showReclassify}
        onClose={() => setShowReclassify(false)}
        onApplied={() => fetchActionPoints({ silent: true })}
    />
)}

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
    title={isFilteredDelete ? "Delete Filtered Action Points" : "Delete All Action Points"}
    message={deleteAllMessage(isFilteredDelete, isFilteredDelete ? totalRecords : null, "Action Points")}
    confirmText={isFilteredDelete ? "Delete Filtered" : "Delete All"}
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
    onSuccess={() => fetchActionPoints({ silent: true })}
    acceptedFile=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,.mkv,.webm"
    maxFileSize={100 * 1024 * 1024 * 1024}
    enableChunkedUpload
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
                                    {item.comment && <div className="history-note"><b>Comment</b><span>{fixMojibake(item.comment)}</span></div>}
                                    {item.remarks && <div className="history-note"><b>Remarks</b><span>{fixMojibake(item.remarks)}</span></div>}
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
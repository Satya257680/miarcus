import PremiumLoader from "../components/premium/PremiumLoader";
import ActionPointEditModal from "../components/actionPoints/ActionPointEditModal";
import {
    TakeActionPhotoField,
    PhotoRuleAdminSwitch,
    PhotoRuleNote,
    ActionPhotoThumbs
} from "../components/actionPoints/TakeActionPhotos";
import { isPhotoRequired, historyPhotos, historyActionTaken } from "../utils/actionPointPhotos";
import AttachmentLinks from "../components/common/AttachmentLinks";
import { useEffect, useRef, useState, useEffectEvent } from "react";
import { useNavigate } from "react-router-dom";
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
    FaFileExcel,
    FaMagic,
    FaListUl,
    FaFolderOpen,
    FaHourglassHalf,
    FaCheckCircle,
    FaExclamationTriangle,
    FaCalendarDay
} from "react-icons/fa";

import InsightStrip from "../components/premium/InsightStrip";
import { useInsightSummary } from "../components/premium/useInsightSummary";
import ReclassifyModal from "../components/premium/ReclassifyModal";

// ======================================================
// STYLE
// ======================================================

import "../styles/ActionPoints.css";
import "../styles/premium/ChecklistPremium.css";
import { exportManagementHealthCheck } from "../utils/managementHealthCheckExport.js";
import { exportFromCSV } from "../utils/exportUtils.js";
import { activeFilters, hasActiveFilters, collectIds, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";
import runAfterCommit from "../utils/runAfterCommit";

// ======================================================
// API
// ======================================================


// ======================================================
// API
// ======================================================


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

const VIEW_LABELS = {
    overdue: "Overdue",
    today: "Today",
    high: "High / Critical open",
};

function ActionPoints() {

    // ======================================================
    // STATES
    // ======================================================

    const [actionPoints, setActionPoints] = useState([]);

    const navigate = useNavigate();

    const [stores, setStores] = useState([]);

    const [departments, setDepartments] = useState([]);

    const [checklists, setChecklists] = useState([]);

    const [nsoProjects, setNsoProjects] = useState([]);

    const [loading, setLoading] = useState(true);

    // The full-page "Loading Action Points" screen is only for the very
    // first load. Later fetches (search, filters, paging) show the
    // table's own loading state instead. Before, every keystroke in the
    // search box swapped the whole page (search box included) for the
    // loader, so typing stopped after each letter.
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Only the newest request may update the table, so a slow, older
    // search ("m") can never overwrite a newer one ("mrpl").
    const fetchSeqRef = useRef(0);

    const [managementExporting, setManagementExporting] = useState(false);

    // Re-render the SLA countdown every minute without changing the stored Action Point status.
    const [slaNow, setSlaNow] = useState(() => Date.now());

    // ======================================================
    // SEARCH
    // ======================================================

    // `searchInput` is what the box shows and updates on every key
    // press; `search` is the value actually sent to the API. A local
    // 300 ms debounce (below) copies one into the other only after the
    // user stops typing, so typing never fires a request per letter.
    const [searchInput, setSearchInput] = useState("");

    const [search, setSearch] = useState("");

    // ======================================================
    // FILTERS
    // ======================================================

    const [designation, setDesignation] = useState("");

    const [designations, setDesignations] = useState([]);

    // Filter Access policy per filter from /api/filter-access/options
    // ({ store: { policy, hidden }, ... }). A hidden filter is not shown.
    const [filterAccess, setFilterAccess] = useState({});

    const [store, setStore] = useState("");

    const [department, setDepartment] = useState("");

    const [status, setStatus] = useState("");

    // Quick view from the clickable KPI cards: "overdue" | "today" | "".
    // Sent to the API as ?view=… and combined with the other filters.
    const [view, setView] = useState("");

    const [priority, setPriority] = useState("");

    const [checklistType, setChecklistType] = useState("");

    const [nsoProject, setNsoProject] = useState("");

    const [startDate, setStartDate] = useState("");

    const [endDate, setEndDate] = useState("");

    // ======================================================
    // PAGINATION
    // ======================================================

    const [currentPage, setCurrentPage] = useState(1);

    // ======================================================
    // SEARCH DEBOUNCE (Action Points only, 300 ms)
    // ======================================================
    // Each key press restarts the timer (the cleanup cancels the
    // pending one), and unmounting cancels it too. Only when the user
    // has paused for 300 ms does `search` change, which triggers the
    // existing fetch effect exactly once. Whitespace-only edits never
    // trigger a request.

    useEffect(() => {
        const next = searchInput.trim();
        if (next === search) return undefined;

        // Both updates are batched into one render (React 18+), so the
        // list is fetched once, already on page 1.
        const timer = window.setTimeout(() => {
            setSearch(next);
            setCurrentPage(1);
        }, 300);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

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

    const [editRow, setEditRow] = useState(null);

    // ======================================================
    // TAKE ACTION
    // ======================================================

    const [actionTaken, setActionTaken] = useState("");

    const [remarks, setRemarks] = useState("");
    const [actionComment, setActionComment] = useState("");
    const [actionStatus, setActionStatus] = useState("Closed");
    const [actionPhotos, setActionPhotos] = useState([]);
    const [savingAction, setSavingAction] = useState(false);

    // Take Action photo rule (Administrator on/off). Photo is optional
    // unless an Administrator switches "Photo mandatory" ON.
    const [photoSettings, setPhotoSettings] = useState({ photo_mandatory: 0, mandatory_scope: "close" });
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
    // TAKE ACTION PHOTO RULE
    // ======================================================

    // Errors keep the current rule ("optional" by default) – the rule
    // must never block the form from opening.
    const loadPhotoSettings = () =>
        axios
            .get("/api/action-point-photo-settings")
            .then((res) => {
                if (res.data?.data) setPhotoSettings(res.data.data);
            })
            .catch(() => {});

    useEffect(() => {
        let active = true;
        axios
            .get("/api/action-point-photo-settings")
            .then((res) => {
                if (active && res.data?.data) setPhotoSettings(res.data.data);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const photoRequiredFor = (status) => isPhotoRequired(photoSettings, status);
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
                designation_id: designation,
                priority,
                status,
                view,
                start_date: startDate,
                end_date: endDate
            }
        }
    );

const fetchActionPoints = async ({ silent = false } = {}) => {

    const seq = ++fetchSeqRef.current;

    const isLatest = () => seq === fetchSeqRef.current;

    try {

        if (!silent) setLoading(true);

        let res;

        try {
            res = await fetchActionPointsOnce();
        } catch (firstError) {
            if (!isLatest()) return;
            console.warn("Action Points load failed, retrying once:", firstError.message);
            await new Promise((resolve) => setTimeout(resolve, 900));
            if (!isLatest()) return;
            res = await fetchActionPointsOnce();
        }

        // A newer search/filter request has started — drop this result.
        if (!isLatest()) return;

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

        if (!isLatest()) return;

        console.error(err);

        alert(

            err.response?.data?.message ||

            "Unable to load Action Points."

        );

        setActionPoints([]);

    }

    finally {

        if (isLatest()) {

            // Always clear: an earlier non-silent fetch may have been
            // superseded by this one and never got to clear it.
            setLoading(false);

            setHasLoadedOnce(true);

        }

    }

};



// ======================================================
// LOAD FILTERS
// ======================================================

const fetchFilters = async () => {

    // One read-only lookup returns only the values this user may filter
    // by in Action Points (Filter Access). It needs Action Points "View"
    // only, so the dropdowns work without Departments / Store Management
    // / Checklist Types / NSO permissions (before, one 403 from any of
    // those master endpoints emptied every dropdown).
    try {

        const res = await axios.get("/api/filter-access/options", {
            params: { module: "Action Points" }
        });

        const filters = res.data?.filters || {};
        const optionsOf = (key) =>
            Array.isArray(filters[key]?.options) ? filters[key].options : [];

        setStores(optionsOf("store"));
        setDepartments(optionsOf("department"));
        setDesignations(optionsOf("designation"));
        setChecklists(optionsOf("checklist_type"));
        setNsoProjects(optionsOf("nso_project"));

        setFilterAccess(
            Object.fromEntries(
                Object.entries(filters).map(([key, value]) => [
                    key,
                    { policy: value?.policy || "default", hidden: Boolean(value?.hidden) }
                ])
            )
        );

    }

    catch (err) {

        console.error("Action Point filter options failed:", err);

    }

};



// ======================================================
// LOAD DATA
// ======================================================

useEffect(() => runAfterCommit(() => {

    if (!canView) {

        setLoading(false);

        return;

    }

    fetchFilters();

}), [

    canView

]);



const fetchActionPointsEvent = useEffectEvent((...args) => fetchActionPoints(...args));
useEffect(() => runAfterCommit(() => {

    if (!canView) {

        return;

    }

    fetchActionPointsEvent();

}), [

    canView,

    currentPage,

    pageSize,

    search,

    store,

    department,

    checklistType,

    nsoProject,

    designation,

    priority,

    status,

    view,

    startDate,

    endDate

]);



// ======================================================
// UPDATE ACTION POINT
// ======================================================

const handleEditSaved = async () => {
    const id = editRow?.id;
    setShowEditModal(false);
    setEditRow(null);
    await fetchActionPoints({ silent: true });
    if (showHistoryModal && id) await openHistory({ id });
};

// ======================================================
// EDIT / HISTORY HELPERS
// ======================================================

const prepareEdit = (row) => {
    if (!row) return;
    setEditRow(row);
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
    // Closing always goes through Take Action. When an Admin has made
    // the photo mandatory for EVERY action, Open / In Progress also
    // opens Take Action so the photo can be attached.
    const mustUseTakeAction =
        value === "Closed" || value === "Completed" ||
        (Number(photoSettings?.photo_mandatory) === 1 && photoSettings?.mandatory_scope === "all");
    if (mustUseTakeAction) {
        setSelectedAction(row);
        setActionStatus(value === "Completed" ? "Closed" : value);
        setActionTaken("");
        setRemarks(row.remarks || "");
        setActionComment(row.comment || "");
        setActionPhotos([]);
        setShowOpenModal(true);
        loadPhotoSettings();
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
    designation_id: designation,
    priority,
    status,
    view,
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
    setActionPhotos([]);

    setShowOpenModal(true);

    // Refresh the rule in case an Admin changed it meanwhile.
    loadPhotoSettings();

};



// ======================================================
// SAVE ACTION
// ======================================================

const saveActionPoint = async () => {
    if (savingAction) return;

    if (actionStatus === "Closed" && !String(actionTaken || "").trim()) {
        alert("Action Taken is required when closing an Action Point.");
        return;
    }

    if (photoRequiredFor(actionStatus) && actionPhotos.length === 0) {
        alert(
            actionStatus === "Closed"
                ? "A photo is mandatory to close this Action Point. Please take or upload a photo."
                : "A photo is mandatory for this action. Please take or upload a photo."
        );
        return;
    }

    try {
        setSavingAction(true);

        // multipart/form-data so the optional photos travel with the action.
        const payload = new FormData();
        payload.append("action_taken", actionTaken || "");
        payload.append("remarks", remarks || "");
        payload.append("comment", actionComment || "");
        payload.append("status", actionStatus);
        actionPhotos.forEach((photo) => payload.append("action_photos", photo.file, photo.file.name));

        await axios.put(
            `/api/action-points/${selectedAction.id}/take-action`,
            payload
        );

        alert(
            actionStatus === "Closed"
                ? "Action Point completed successfully."
                : `Action Point moved to ${actionStatus}.`
        );

        setShowOpenModal(false);
        setActionPhotos([]);
        await fetchActionPoints();
        if (showHistoryModal && selectedAction) await openHistory(selectedAction);
    } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || "Unable to update Action Point.");
    } finally {
        setSavingAction(false);
    }
};

// ======================================================
// EXPORT
// ======================================================

const handleExport = async (format = "csv") => {

    try {

        // FIX (filtered export): send the SAME active filters the table
        // uses (Store, Department, Designation, NSO Project, Status,
        // Show/view, Priority, Checklist Type, From/To Date and Search).
        // Before, no params were sent, so CSV / XLSX / PDF always
        // contained every Action Point (e.g. 1,170 rows while the page
        // showed 14 for "MRPL - ABOHAR"). `deleteFilters` (above) holds
        // only the filters that are actually set, so with no filters the
        // export is unfiltered exactly as before.
        const response = await axios.get(
            "/api/action-points/export",
            {
                params: deleteFilters,
                responseType: "blob"
            }
        );

        const csvText = await response.data.text();

        // Header line only -> nothing matches the selected filters.
        if (isFilteredDelete && String(csvText || "").trim().split(/\r?\n/).length <= 1) {
            alert("No Action Points found for the selected filters.");
            return;
        }

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
                    new_store_opening_id: nsoProject,
                    designation_id: designation,
                    priority,
                    status,
                    view,
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

        // Full store details (address, opening date…) come from Store
        // Management. Users without that permission still get the
        // export, using the store names they are allowed to filter by.
        let storesForExport = stores;
        try {
            const storesResponse = await axios.get("/api/stores");
            if (Array.isArray(storesResponse.data?.data)) {
                storesForExport = storesResponse.data.data;
            }
        } catch {
            storesForExport = stores;
        }

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
// KPI CARD CLICK
// ======================================================
// Every KPI card is clickable. A status card (Open / In Progress /
// Completed) shows that status; Today / Overdue switch to the quick
// view and show every status. Clicking the active card again goes
// back to all Action Points.

const showCard = (nextStatus, nextView) => {

    const alreadyActive =
        status === nextStatus &&
        view === nextView;

    if (alreadyActive && (nextStatus || nextView)) {
        setStatus("");
        setView("");
    } else {
        setStatus(nextStatus);
        setView(nextView);
    }

    setCurrentPage(1);

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

    setSearchInput("");

    setSearch("");

    setDesignation("");

    setStore("");

    setDepartment("");

    setNsoProject("");

    setStatus("Open");

    setView("");

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

useEffect(() => runAfterCommit(() => {

    setCurrentPage(1);

}), [

    search,

    store,

    department,

    status,

    view,

    priority,

    checklistType,

    designation,

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
}, [canView, currentPage, pageSize, search, store, department, checklistType, nsoProject, designation, priority, status, startDate, endDate]);



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

if (loading && !hasLoadedOnce) {

    return (

        <div className="action-loading"><PremiumLoader title="Loading Action Points" /></div>

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

    // One "View" link for every file of the Action Point: its own
    // attachment, Take Action photos and the originating checklist
    // question's evidence (server-built `attachments` list).
    render: (row) => (

        <AttachmentLinks
            items={row.attachments}
            value={row.attachment}
            title={`Action Point #${row.id}`}
            subtitle={[row.store_name, fixMojibake(row.question)].filter(Boolean).join(" · ")}
        />

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
            subtitle="Only checklist answers that report a problem land here. Once completed, they move to Completed Action Points and the answer appears in Checklist Reports."
        />

        <InsightStrip
            loading={apSummaryLoading}
            items={[
                {
                    key: "total",
                    label: "Total",
                    value: apSummary?.total,
                    hint: "All active Action Points",
                    tone: "violet",
                    icon: FaListUl,
                    active: !status && !view,
                    onClick: () => showCard("", "")
                },
                {
                    key: "today",
                    label: "Today",
                    value: apSummary?.today,
                    hint: "Raised today",
                    tone: "slate",
                    icon: FaCalendarDay,
                    active: view === "today",
                    onClick: () => showCard("", "today")
                },
                {
                    key: "open",
                    label: "Open",
                    value: apSummary?.open,
                    hint: "Waiting for action",
                    tone: "blue",
                    icon: FaFolderOpen,
                    active: status === "Open" && !view,
                    onClick: () => showCard("Open", "")
                },
                {
                    key: "progress",
                    label: "In Progress",
                    value: apSummary?.in_progress,
                    hint: "Being worked on",
                    tone: "amber",
                    icon: FaHourglassHalf,
                    active: status === "In Progress" && !view,
                    onClick: () => showCard("In Progress", "")
                },
                {
                    key: "closed",
                    label: "Completed",
                    value: apSummary?.closed,
                    hint: "Open Completed Action Points",
                    tone: "green",
                    icon: FaCheckCircle,
                    active: false,
                    onClick: () => navigate("/completed-action-points")
                },
                {
                    key: "overdue",
                    label: "Overdue",
                    value: apSummary?.overdue,
                    hint: `${apSummary?.high_priority ?? 0} high / critical open`,
                    tone: "red",
                    icon: FaExclamationTriangle,
                    active: view === "overdue",
                    onClick: () => showCard("", "overdue")
                }
            ]}
        />

        {/* ======================================================
            PAGE TOOLBAR
        ====================================================== */}

        <PageToolbar

            search={searchInput}

            setSearch={setSearchInput}

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

            {!filterAccess.store?.hidden && (
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
            )}

            {/* ==========================================
                DEPARTMENT
            ========================================== */}

            {!filterAccess.department?.hidden && (
            <div className="filter-group">

                <label>Department</label>

                <select
                    value={department}
                    onChange={(e) => {
                        const next = e.target.value;
                        setDepartment(next);
                        // Keep Designation consistent with the department.
                        const current = designations.find((d) => String(d.id) === String(designation));
                        if (next && current && current.department_id != null && String(current.department_id) !== String(next)) {
                            setDesignation("");
                        }
                    }}
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
            )}

            {/* ==========================================
                DESIGNATION (of the employee who submitted)
            ========================================== */}

            {!filterAccess.designation?.hidden && (
            <div className="filter-group">

                <label>Designation</label>

                <select
                    value={designation}
                    onChange={(e) =>
                        setDesignation(e.target.value)
                    }
                >

                    <option value="">
                        All Designations
                    </option>

                    {designations
                        .filter((item) =>
                            !department ||
                            item.department_id == null ||
                            String(item.department_id) === String(department)
                        )
                        .map((item) => (

                        <option
                            key={item.id}
                            value={item.id}
                        >
                            {item.designation_name}
                        </option>

                    ))}

                </select>

            </div>
            )}

            {/* ==========================================
                NEW STORE OPENING
            ========================================== */}

            {!filterAccess.nso_project?.hidden && (
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
            )}

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

                    {/* Completed (Closed) records live in Completed
                        Action Points — see the "Completed" card. */}

                </select>

            </div>

            {/* ==========================================
                QUICK VIEW (same as the KPI cards)
            ========================================== */}

            <div className="filter-group">

                <label>Show</label>

                <select
                    value={view}
                    onChange={(e) => {
                        setView(e.target.value);
                        setCurrentPage(1);
                    }}
                >

                    <option value="">
                        All Action Points
                    </option>

                    <option value="today">
                        Raised Today
                    </option>

                    <option value="overdue">
                        Overdue
                    </option>

                    <option value="high">
                        High / Critical (open)
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

{!filterAccess.checklist_type?.hidden && (
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
)}

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
    subtitle={`${totalRecords} record${totalRecords === 1 ? "" : "s"}${status ? ` · ${status}` : ""}${view ? ` · ${VIEW_LABELS[view] || view}` : ""}`}
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
    moduleKey="action-points"
    uploadUrl={"/api/action-points/bulk-upload"}
    isOpen={showBulkModal}
    onClose={() => setShowBulkModal(false)}
    title="Bulk Upload Action Points"
    uploadFunction={handleBulkUpload}
    onSuccess={() => fetchActionPoints({ silent: true })}
                maxFileSize={100 * 1024 * 1024 * 1024}
    enableChunkedUpload
/>

{/* ======================================================
    EDIT ACTION POINT MODAL (premium, every column editable)
====================================================== */}

{showEditModal && editRow && (
    <ActionPointEditModal
        key={editRow.id}
        row={editRow}
        stores={stores}
        departments={departments}
        onClose={() => {
            setShowEditModal(false);
            setEditRow(null);
        }}
        onSaved={handleEditSaved}
    />
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
                    disabled={savingAction}
                >
                    ×
                </button>

            </div>

            <div className="workflow-modal-body">

                {isAdmin ? (
                    <PhotoRuleAdminSwitch
                        settings={photoSettings}
                        onSaved={(data) => data && setPhotoSettings(data)}
                    />
                ) : (
                    <PhotoRuleNote settings={photoSettings} />
                )}

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

                <TakeActionPhotoField
                    photos={actionPhotos}
                    onChange={setActionPhotos}
                    required={photoRequiredFor(actionStatus)}
                    disabled={savingAction}
                />

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
                        disabled={savingAction}
                    >
                        Close
                    </button>

                    <button
                        className="upload-btn"
                        onClick={saveActionPoint}
                        disabled={savingAction}
                    >
                        {savingAction ? "Saving..." : "Save"}
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
                    <div className="history-loading"><PremiumLoader compact title="Loading history" /></div>
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
                                    {historyActionTaken(item) && <div className="history-note"><b>Action Taken</b><span>{fixMojibake(historyActionTaken(item))}</span></div>}
                                    {item.comment && <div className="history-note"><b>Comment</b><span>{fixMojibake(item.comment)}</span></div>}
                                    {item.remarks && <div className="history-note"><b>Remarks</b><span>{fixMojibake(item.remarks)}</span></div>}
                                    <ActionPhotoThumbs photos={historyPhotos(item)} />
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
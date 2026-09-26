import PremiumLoader from "../components/premium/PremiumLoader";
import { useCallback, useEffect, useRef, useState } from "react";
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
// ICONS
// ======================================================

import {
    FaEye,
    FaEdit,
    FaTrash,
    FaMapMarkerAlt,
    FaFileExcel,
    FaClipboardCheck,
    FaListUl,
    FaCheckDouble,
    FaHourglassHalf,
    FaCheckCircle
} from "react-icons/fa";

import InsightStrip, { useInsightSummary } from "../components/premium/InsightStrip";
import { activeFilters, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";


// ======================================================
// STYLE
// ======================================================

import "../styles/ChecklistReports.css";
import "../styles/premium/ChecklistPremium.css";
import { exportManagementHealthCheck } from "../utils/managementHealthCheckExport.js";
import { exportTableData } from "../utils/exportUtils.js";


// ======================================================
// API
// ======================================================

const API = API_BASE_URL + '/api';


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

    // Lighter-weight loading flag for page/filter/auto-refresh fetches —
    // only shown inline over the table (via DataTable's own `loading`
    // prop), never as the full-page "Loading Checklist Reports..."
    // screen (`loading` above), so switching pages or an auto-refresh
    // never unmounts an open modal the way flipping `loading` does.
    const [tableLoading, setTableLoading] = useState(false);

    const [loadError, setLoadError] = useState(false);

    const [managementExporting, setManagementExporting] = useState(false);

    // ======================================================
    // SERVER-SIDE PAGINATION TOTALS
    //
    // BUG FIX ("data stops at 10000, no matter how much more exists"):
    // this page used to fetch the whole report list in one shot with a
    // hardcoded `?limit=10000` and then do every bit of searching,
    // filtering AND paging itself against that single in-memory array —
    // which is exactly why the list could never show more than 10,000
    // rows even when far more existed. `reports` now holds only the
    // CURRENT PAGE returned by the server (see fetchReports below), and
    // `totalRecords`/`totalPages` are taken directly from the server's
    // own count for the active filters — so there is no upper bound
    // baked into the frontend at all; it scales to 100,000, 1,000,000+
    // rows exactly the same way it scales to 10.
    // ======================================================

    const [totalRecords, setTotalRecords] = useState(0);

    const [totalPages, setTotalPages] = useState(1);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // Debounced copy of `search` actually sent to the server, so every
    // keystroke doesn't fire its own request.
    const [debouncedSearch, setDebouncedSearch] = useState("");

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

    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

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

    // KPI tiles – follow the same filters as the table and refresh
    // whenever the table reloads.
    const { data: crSummary, loading: crSummaryLoading } = useInsightSummary(
        "/api/checklist-reports/summary",
        {
            store_id: selectedStore || undefined,
            checklist_type_id: selectedChecklist || undefined,
            start_date: fromDate || undefined,
            end_date: toDate || undefined
        },
        reports
    );
            // ======================================================
    // MODAL-OPEN TRACKING (ref)
    //
    // Read from inside the auto-refresh interval / window-focus handler
    // below without needing to be a dependency of those effects — a
    // dependency on these booleans would tear the refresh timer down
    // and rebuild it every time a modal opens/closes, which is both
    // wasteful and would reset the refresh interval's timing.
    // ======================================================

    const modalOpenRef = useRef(false);

    useEffect(() => {
        modalOpenRef.current =
            showBulkUpload ||
            showViewModal ||
            showEditModal ||
            showDeleteDialog ||
            showDeleteAllDialog;
    }, [
        showBulkUpload,
        showViewModal,
        showEditModal,
        showDeleteDialog,
        showDeleteAllDialog
    ]);

    // ======================================================
    // BUILD REPORT QUERY PARAMS FROM CURRENT FILTERS
    // ======================================================

    const buildReportParams = useCallback((overrides = {}) => {

        const params = {
            page: overrides.page ?? currentPage,
            limit: overrides.limit ?? pageSize,
        };

        if (overrides.all) params.all = "true";

        const searchValue = overrides.search ?? debouncedSearch;
        if (searchValue) params.search = searchValue;

        if (selectedStore) params.store_id = selectedStore;
        if (selectedChecklist) params.checklist_type_id = selectedChecklist;
        if (selectedEmployee) params.employee_id = selectedEmployee;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;

        return params;

    }, [
        currentPage,
        pageSize,
        debouncedSearch,
        selectedStore,
        selectedChecklist,
        selectedEmployee,
        fromDate,
        toDate
    ]);

    // ======================================================
    // FETCH ONE PAGE OF REPORTS FROM THE SERVER
    //
    // BUG FIX ("data stops at 10,000" / "arranged wrong" / "no auto
    // refresh"): the whole report list used to be pulled into the
    // browser once (`?limit=10000`) and every bit of searching,
    // filtering, sorting and paging happened client-side against that
    // one array — capping the app at 10,000 rows no matter how much
    // more data existed, and requiring a manual page reload to see
    // anything created after that fetch. This now asks the server for
    // exactly the current page (page/limit + active filters), the same
    // way every other paginated list in this app already works — so
    // there is no cap, ordering is the server's own
    // `ORDER BY created_at DESC, id DESC` (newest first, every previous
    // day's — and every older day's — history still reachable further
    // back, never reshuffled between requests), and a fresh fetch always
    // reflects whatever was just bulk-uploaded or submitted, including
    // by someone else.
    // ======================================================

    const fetchReportsPage = useCallback(async (overrides = {}) => {

        const params = buildReportParams(overrides);

        const attempt = () => axios.get(`${API}/checklist-reports`, { params });

        try {
            const res = await attempt();
            return res.data;
        } catch (err) {
            // Retry once — a single transient failure (a cold-start
            // hiccup, a dropped connection) used to leave the list blank
            // until the user manually refreshed the whole page.
            console.error("Checklist Reports fetch failed, retrying once:", err);
            const retryRes = await attempt();
            return retryRes.data;
        }

    }, [buildReportParams]);

    const applyReportsResponse = (data) => {

        setReports(
            (data?.data || []).map((report) => ({
                ...report,
                // Checklist Reports always represent completed submitted
                // checklist history. Action Point status is displayed
                // separately in the Action Status column.
                status: "Completed"
            }))
        );

        const pagination = data?.pagination || {};
        setTotalRecords(Number(pagination.total || 0));
        setTotalPages(Math.max(Number(pagination.totalPages || 1), 1));
        setLoadError(false);

    };

    // ======================================================
    // LOAD DATA — first mount only: reports (page 1) + lookup lists
    // ======================================================

    const loadData = async () => {

        try {

            setLoading(true);

            const results = await Promise.allSettled([

                fetchReportsPage({ page: 1 }),

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

                applyReportsResponse(reportRes.value);

            } else {

                console.error("Checklist Reports Error:", reportRes.reason);

                setReports([]);
                setLoadError(true);

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

    // ======================================================
    // SILENT REFRESH
    //
    // Same reports fetch as loadData(), but never flips `loading` to
    // true — used for page/filter changes, the background window-focus
    // refresh, the periodic auto-refresh timer below, and right after a
    // bulk upload / create / edit / delete — so the page never swaps out
    // to the full "Loading Checklist Reports..." screen (and never
    // unmounts an open modal) just for a data refresh.
    //
    // `quiet: true` (used only by the passive window-focus/interval
    // auto-refresh — see below) skips the `tableLoading` flag entirely,
    // so a background poll that finds nothing new never flickers the
    // table to a "Loading..." placeholder and back every 20 seconds. A
    // deliberate action (changing page/filters, editing, deleting,
    // finishing a bulk upload) still shows that brief in-place indicator
    // so it's clear something happened.
    // ======================================================

    const silentRefresh = async (overrides = {}, { quiet = false } = {}) => {

        if (!quiet) setTableLoading(true);

        try {

            const data = await fetchReportsPage(overrides);
            applyReportsResponse(data);

        } catch (err) {

            console.error("Checklist Reports background refresh failed:", err);
            // A quiet background refresh failing (even after
            // fetchReportsPage's own built-in retry) is not worth
            // interrupting the user with an alert — leave the existing
            // (still-valid) list on screen.

        } finally {

            setTableLoading(false);

        }

    };

    // ======================================================
    // INITIAL LOAD
    // ======================================================

    useEffect(() => {

        if (!canView) {

            setLoading(false);

            return;

        }

        loadData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView]);

    // ======================================================
    // DEBOUNCE SEARCH
    // ======================================================

    useEffect(() => {

        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 400);

        return () => clearTimeout(timer);

    }, [search]);

    // ======================================================
    // RE-FETCH WHENEVER PAGE, PAGE SIZE OR FILTERS CHANGE
    // (skipped on the very first render — the INITIAL LOAD effect
    // above already fetches page 1)
    // ======================================================

    const didMountRef = useRef(false);

    useEffect(() => {

        if (!canView) return;

        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }

        silentRefresh();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        canView,
        currentPage,
        pageSize,
        debouncedSearch,
        selectedStore,
        selectedChecklist,
        selectedEmployee,
        fromDate,
        toDate
    ]);

    // ======================================================
    // BACKGROUND REFRESH — WINDOW FOCUS + PERIODIC AUTO-REFRESH
    //
    // Refresh the current page's data (and totals) whenever the user
    // comes back to this tab, AND on a recurring timer, so new
    // submissions/bulk uploads — including ones made by someone else,
    // in another tab, or via bulk upload — show up automatically
    // instead of requiring a manual page reload. Both skip silently
    // while a modal is open (see modalOpenRef above): the native
    // "Browse File" dialog opened by Bulk Upload blurs/refocuses the
    // browser window while it's open, and a refresh mid-edit could
    // otherwise overwrite what the user is looking at.
    // ======================================================

    useEffect(() => {

        if (!canView) return;

        const refreshIfIdle = () => {
            if (modalOpenRef.current) return;
            silentRefresh({}, { quiet: true });
        };

        window.addEventListener("focus", refreshIfIdle);

        // Poll every 20 seconds so newly bulk-uploaded/submitted
        // Checklist Reports appear on their own — "real time" for an
        // admin list without hammering the server every second.
        const intervalId = setInterval(refreshIfIdle, 20 * 1000);

        return () => {
            window.removeEventListener("focus", refreshIfIdle);
            clearInterval(intervalId);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView, currentPage, pageSize, debouncedSearch, selectedStore, selectedChecklist, selectedEmployee, fromDate, toDate]);

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

            // Checklist Report history is always completed.
            status: "Completed",

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

                    status: "Completed",

                    answer: editingReport.answer,

                    remarks: editingReport.remarks

                }

            );

            alert(

                "Checklist Report updated successfully."

            );

            setShowEditModal(false);

            silentRefresh();

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

            silentRefresh();

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
    // DELETE ALL
    // ======================================================

    const handleDeleteAll = () => {

        if (!canDelete) return;

        if (!totalRecords) {
            alert("No Checklist Reports found.");
            return;
        }

        setShowDeleteAllDialog(true);
    };

    // Filters currently applied on the page. When any is set, Delete All
    // removes ONLY the matching reports; otherwise it removes everything.
    const deleteFilters = activeFilters({
        search: debouncedSearch,
        store_id: selectedStore,
        checklist_type_id: selectedChecklist,
        employee_id: selectedEmployee,
        from_date: fromDate,
        to_date: toDate,
    });
    const isFilteredDelete = hasActiveFilters(deleteFilters);

    const confirmDeleteAll = async () => {

        try {

            const response = await axios.delete(
                `${API}/checklist-reports/all`,
                isFilteredDelete
                    ? { data: { scope: "filtered", filters: deleteFilters } }
                    : undefined
            );

            alert(
                response.data?.message ||
                "Checklist Reports deleted successfully."
            );

            setCurrentPage(1);
            await silentRefresh({ page: 1 });

        }
        catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Unable to delete Checklist Reports."
            );

        }
        finally {

            setShowDeleteAllDialog(false);

        }

    };

    // ======================================================
    // FETCH EVERY REPORT MATCHING THE ACTIVE FILTERS
    //
    // The table itself only ever holds one page's worth of rows (see
    // fetchReportsPage above) — an export, by definition, needs every
    // matching row instead, however many there now are. `all=true`
    // tells the server to skip LIMIT/OFFSET entirely (see
    // models/checklistReportModel.js), so this always returns the
    // complete filtered set in one request rather than being capped
    // the way the old `?limit=10000` fetch used to cap the whole page.
    // ======================================================

    const fetchAllFilteredReports = async () => {
        const data = await fetchReportsPage({ page: 1, limit: 0, search: debouncedSearch, all: true });
        return (data?.data || []).map((report) => ({ ...report, status: "Completed" }));
    };

    // ======================================================
    // EXPORT CSV
    // ======================================================

    const handleExport = async (format = "csv") => {

        let exportRows;

        try {
            exportRows = await fetchAllFilteredReports();
        } catch (err) {
            console.error("CHECKLIST REPORT EXPORT FETCH ERROR:", err);
            alert("Unable to load Checklist Reports for export.");
            return;
        }

        if (!exportRows.length) {

            alert("No records found.");

            return;

        }

        const rows = exportRows.map((r) => ({

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

            "Action Status": r.action_point_id
                ? (r.action_point_status || "Open")
                : "Not Required",

            Priority: r.action_point_id ? (r.action_point_priority || "Medium") : "-",

            "SLA (Days)": r.action_point_id ? (r.action_point_sla_days || 0) : "-",

            "Action Taken": r.action_taken || "-",

            "Action Completed At": r.action_point_completed_at || r.completion_date || "-",

            Device: r.device || "-",

            Attachment: r.attachment || "-",

            Latitude: r.latitude || "-",

            Longitude: r.longitude || "-"

        }));

        await exportTableData({
            headers: Object.keys(rows[0]),
            rows: rows.map((row) => Object.values(row)),
            filename: "ChecklistReports",
            format,
            title: "Checklist Reports",
        });

    };

    // ======================================================
    // MANAGEMENT XLSX EXPORT
    // Uses the management-provided Store Health Check template.
    // One worksheet is created per checklist submission.
    // ======================================================

    const handleManagementExport = async () => {

        if (!canView) return;

        try {
            setManagementExporting(true);

            const records = await fetchAllFilteredReports();

            if (!records.length) {
                alert("No Checklist Reports found for the selected filters.");
                return;
            }

            await exportManagementHealthCheck({
                records,
                stores,
                mode: "checklist",
                filename: "Store_Health_Check_Report.xlsx",
            });
        } catch (error) {
            console.error("MANAGEMENT CHECKLIST EXPORT ERROR:", error);
            alert(error?.message || "Unable to create Management XLSX export.");
        } finally {
            setManagementExporting(false);
        }
    };

    // ======================================================
// BULK UPLOAD CHECKLIST REPORT
//
// BUG FIX ("bulk upload works sometimes, fails other times"): a
// transient failure — a dropped connection, a proxy hiccup, the server
// briefly waking up from an idle/cold-start state — used to just fail
// the whole upload with a generic "Bulk upload failed." and no way to
// recover except manually re-selecting the same file and clicking
// Upload again. This now retries automatically (a couple of times,
// with a short pause) for exactly the kinds of failures a retry can
// actually fix — a network error, or a 502/503/504 from a proxy/
// server that was momentarily unavailable. A 413 (request too large)
// or a normal 4xx validation error is NOT retried, since trying the
// same oversized/invalid file again would only fail the same way —
// those get a clear, specific message instead.
// ======================================================

// ======================================================
// assembled (optional second argument)
//
// Set by components/common/BulkUploadModal when this page's
// enableChunkedUpload prop is on and the selected file was larger
// than the modal's chunkThreshold: the file has ALREADY been fully
// transferred to the server in pieces (see
// server/middleware/chunkedUpload.js), and `assembled.assembledFile`
// is the token that identifies it. In that case this sends a tiny
// JSON request instead of re-sending the whole file — no FormData,
// no retry loop, since the token is single-use and a genuine retry
// would only fail with "already used" instead of the real error.
// ======================================================

const uploadChecklistReport = async (file, assembled) => {

    if (!canAdd) {

        return {

            success: false,

            message: "You don't have permission."

        };

    }

    const token = localStorage.getItem("token");

    if (assembled?.assembledFile) {

        try {

            const response = await axios.post(

                `${API}/checklist-reports/bulk-upload`,

                { assembledFile: assembled.assembledFile },

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
                    "Bulk upload failed after the large file finished uploading. Please try again.",
                errors: err.response?.data?.errors || [],
                warnings: err.response?.data?.warnings || []
            };

        }

    }

    const RETRYABLE_STATUSES = new Set([502, 503, 504]);
    const MAX_ATTEMPTS = 3;

    let lastErr = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {

        // A fresh FormData per attempt — a File object's stream can only
        // be read once, and axios/the browser have already consumed it
        // by the time a failed attempt returns, so re-using the same
        // FormData on a retry would silently send an empty body.
        const formData = new FormData();
        formData.append("file", file);

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

            lastErr = err;

            const status = err.response?.status;
            const isNetworkError = !err.response; // request never reached/returned from the server at all
            const isRetryable = isNetworkError || RETRYABLE_STATUSES.has(status);

            if (!isRetryable || attempt === MAX_ATTEMPTS) break;

            console.warn(`Bulk upload attempt ${attempt} failed, retrying…`, err);
            await new Promise((resolve) => setTimeout(resolve, attempt * 1500));

        }

    }

    console.error(lastErr);

    const status = lastErr?.response?.status;

    // NOTE: the app itself no longer imposes any upload size limit (see
    // components/common/BulkUploadModal usage above, and
    // server/middleware/bulkFileUpload.js). A 413 at this point can only
    // be coming from the IIS reverse proxy in front of the API — see
    // server/web.config, which raises IIS's own ceiling to the maximum
    // it supports; that file has to be deployed to the live IIS site for
    // this message to stop appearing.
    const message =
        status === 413
            ? "This file was rejected by the server before it even reached the app (a proxy/IIS request-size limit, not an app limit). Ask an admin to deploy the updated server/web.config to the IIS site in front of this app."
            : lastErr?.response?.data?.message ||
              "Bulk upload failed. Please check your connection and try again.";

    return {

        success: false,

        message

    };

};
    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        // Bypass the search debounce here so clearing filters re-fetches
        // once, immediately, instead of firing once now with the old
        // search term still applied and again ~400ms later once the
        // debounce catches up.
        setDebouncedSearch("");

        setFromDate("");

        setToDate("");

        setSelectedStore("");

        setSelectedChecklist("");

        setSelectedEmployee("");

        setCurrentPage(1);

    };
        // ======================================================
    // CURRENT PAGE
    //
    // Searching, filtering AND paging now all happen on the server
    // (see fetchReportsPage/buildReportParams above) — `reports` is
    // already exactly the rows for `currentPage`, in the server's own
    // date order, so there is nothing left to slice client-side.
    // `totalRecords`/`totalPages` are likewise server-reported state,
    // not derived from whatever happens to be loaded in the browser.
    // ======================================================

    const currentReports = reports;

    // Snap back to the last real page if the active page is now past
    // the end (e.g. a filter narrowed the result set, or the last row
    // on the last page was just deleted) — the RE-FETCH effect above
    // picks this up and reloads automatically.
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    // ======================================================
    // FORMAT DATE
    // ======================================================

    const formatDate = (value) => {

        if (!value) return "-";

        // BUG FIX ("exact submission time shows shifted / wrong"):
        // submission_date now comes back from the server as a literal
        // "YYYY-MM-DD HH:MM:SS" string (see DATE_FORMAT(...) in
        // models/checklistReportModel.js) — the exact wall-clock moment
        // the checklist was actually submitted, in the business's own
        // timezone. Routing that through `new Date(value)` would let the
        // browser's own timezone-parsing rules reinterpret it (and, for
        // some string shapes, silently shift it by hours), which is
        // exactly the kind of subtle bug that makes an "exact" time
        // untrustworthy. Instead, a value already in this shape is
        // reformatted with plain string manipulation — no Date object,
        // no timezone conversion, so the numbers shown are always
        // exactly the numbers the server sent.
        // Anchored at both ends, with no trailing "Z"/offset allowed —
        // this only matches a bare, timezone-less "YYYY-MM-DD HH:MM:SS"
        // (what DATE_FORMAT produces), never a real ISO instant like
        // "...T12:37:52.000Z" (e.g. created_at / completion timestamps
        // elsewhere on this page), which still needs to go through
        // `new Date(...)` below to convert correctly to the viewer's
        // local time.
        const exactMatch = String(value).trim().match(

            /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/

        );

        if (exactMatch) {

            const [, year, month, day, hour, minute, second] = exactMatch;

            return `${day}/${month}/${year}, ${hour}:${minute}:${second}`;

        }

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

            <div className="reports-loading"><PremiumLoader title="Loading Checklist Reports" /></div>

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
            render: (row) => row.answer
                ? <span className={`answer-chip ${row.action_point_id ? "resolved" : "ok"}`}>{row.answer}</span>
                : "-"
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
        // ACTION POINT STATUS / COMPLETION
        // ==================================================

        {
            key: "action_point_status",
            title: "Action Status",
            render: (row) => {
                if (!row.action_point_id) {
                    return <span className="report-state-badge ok">No Action Needed</span>;
                }

                const status = row.action_point_status || "Open";
                if (String(status).toLowerCase() === "closed") {
                    return <span className="report-state-badge done">Action Completed</span>;
                }
                return (
                    <span
                        className={`status-badge ${String(status)
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                    >
                        {status}
                    </span>
                );
            }
        },

        {
            key: "action_point_priority",
            title: "Priority",
            render: (row) =>
                row.action_point_id ? (row.action_point_priority || "Medium") : "-"
        },

        {
            key: "action_point_sla_days",
            title: "SLA (Days)",
            render: (row) => {
                if (!row.action_point_id) return "-";
                const days = Number(row.action_point_sla_days || 0);
                return days > 0 ? days : "-";
            }
        },

        {
            key: "action_taken",
            title: "Action Taken",
            render: (row) => row.action_taken || "-"
        },

        {
            key: "action_point_comment",
            title: "Action Point Comment",
            render: (row) => (
                <div className="remarks-cell">
                    {row.action_point_comment || "-"}
                </div>
            )
        },

        {
            key: "action_point_completed_at",
            title: "Action Completed At",
            render: (row) =>
                row.action_point_completed_at || row.completion_date
                    ? formatDate(row.action_point_completed_at || row.completion_date)
                    : "-"
        },

        {
            key: "action_point_sla_minutes",
            title: "SLA",
            render: (row) => {
                const minutes = Number(row.action_point_sla_minutes || 0);
                if (!row.action_point_id || minutes <= 0) return "No SLA";
                const days = Math.floor(minutes / 1440);
                const hours = Math.floor((minutes % 1440) / 60);
                const mins = minutes % 60;
                return `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
            }
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
                href={`${API_BASE_URL}/${row.attachment}`}
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

        <div className="checklist-reports-page cr-premium">

            {/* ======================================================
                PAGE HEADER
            ====================================================== */}

            <PageHeader
                className="premium-hero"
                title="Checklist Reports"
                subtitle="Answers where everything is fine, plus answers whose Action Point has been completed."
            />

            <InsightStrip
                loading={crSummaryLoading}
                items={[
                    {
                        key: "submissions",
                        label: "Submissions",
                        value: crSummary?.submissions,
                        hint: crSummary?.average_score != null ? `Avg. score ${crSummary.average_score}%` : "Checklists submitted",
                        tone: "violet",
                        icon: FaClipboardCheck
                    },
                    {
                        key: "reported",
                        label: "In Report",
                        value: crSummary?.reported_answers,
                        hint: "Answers shown below",
                        tone: "blue",
                        icon: FaListUl
                    },
                    {
                        key: "no-action",
                        label: "No Action Needed",
                        value: crSummary?.no_action_needed,
                        hint: "All OK / N/A answers",
                        tone: "green",
                        icon: FaCheckCircle
                    },
                    {
                        key: "completed",
                        label: "Action Completed",
                        value: crSummary?.action_completed,
                        hint: "Closed Action Points",
                        tone: "slate",
                        icon: FaCheckDouble
                    },
                    {
                        key: "pending",
                        label: "Pending Action",
                        value: crSummary?.pending_action,
                        hint: "Open in Action Points",
                        tone: "amber",
                        icon: FaHourglassHalf
                    }
                ]}
            />

            {loadError && (
                <div className="reports-loading" style={{ color: "#b91c1c" }}>
                    Unable to refresh Checklist Reports right now. Showing what's cached —
                    <button
                        type="button"
                        className="table-link"
                        style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer" }}
                        onClick={() => loadData()}
                    >
                        try again
                    </button>.
                </div>
            )}

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

    showDeleteAll={canDelete}

    deleteAllText={deleteAllLabel(isFilteredDelete)}

    onDeleteAll={handleDeleteAll}

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
                className="premium-table-card"
                title="Checklist Report List"
                subtitle={`${totalRecords} record${totalRecords === 1 ? "" : "s"}`}
            >

                <DataTable

                    columns={columns}

                    data={currentReports}

                    loading={tableLoading}

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

    // Silent — a full loadData() flips `loading` to true, which would
    // swap this page out for the "Loading..." screen and unmount this
    // very modal while it may still be showing per-row bulk-upload
    // results the user hasn't dismissed yet.
    //
    // Newly bulk-uploaded rows sort to the top (server ORDER BY
    // created_at DESC), so jump back to page 1 to actually show them —
    // otherwise a user sitting on page 5 would see no visible change
    // and could easily think the upload silently did nothing.
    setCurrentPage(1);
    await silentRefresh({ page: 1 }, { quiet: true });

}}

    uploadFunction={uploadChecklistReport}

    title="Bulk Upload Checklist Reports"

    acceptedFile=".csv,.xlsx,.xls"

    sampleFile="/samples/checklist-report-sample.xlsx"

    // Matches the app-wide 100 GB ceiling (server/middleware/
    // fileSecurity.js). Files bigger than IIS's ~4 GB per-request
    // limit (server/web.config) automatically use the chunked upload
    // flow below instead of one giant request.
    maxFileSize={100 * 1024 * 1024 * 1024}

    enableChunkedUpload

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

            <ConfirmDialog
                open={showDeleteAllDialog}
                title={isFilteredDelete ? "Delete Filtered Checklist Reports" : "Delete All Checklist Reports"}
                message={deleteAllMessage(isFilteredDelete, null, "Checklist Report submissions", "Active Action Points will be preserved.")}
                confirmText={isFilteredDelete ? "Delete Filtered" : "Delete All"}
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={confirmDeleteAll}
                onCancel={() => setShowDeleteAllDialog(false)}
            />

            {/* ======================================================
                VIEW MODAL
            ======================================================}

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

                                {selectedReport.action_point_id && (
                                    <>
                                        <h4>Action Point Comment</h4>
                                        <p>
                                            {selectedReport.action_point_comment || "-"}
                                        </p>
                                        <h4>Action Point Remarks</h4>
                                        <p>
                                            {selectedReport.action_point_remarks || "-"}
                                        </p>
                                    </>
                                )}

                                <h4>Attachment</h4>

                                <p>

                                    {selectedReport.attachment ? (

                                        <a
                                            href={`${API_BASE_URL}/${selectedReport.attachment}`}
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
                                    value="Completed"
                                    disabled
                                    aria-label="Checklist report status"
                                >
                                    <option value="Completed">
                                        Completed
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
import { API_BASE_URL } from "../axiosConfig.js";
import { collectIds, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";
import { useEffect, useRef, useState } from "react";

// ======================================================
// COMMON COMPONENTS
// ======================================================

import PageToolbar from "../components/common/PageToolbar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BulkUploadModal from "../components/common/BulkUploadModal";

// ======================================================
// MODAL
// ======================================================

import AddNewStoreOpeningModal
    from "../components/NewStoreOpening/AddNewStoreOpeningModal";

// ======================================================
// SERVICES
// ======================================================

import {
    getNewStoreOpenings,
    deleteNewStoreOpening,
    deleteAllNewStoreOpenings,
    bulkUploadNewStoreOpenings,
    exportNewStoreOpenings
} from "../services/newStoreOpeningService";

// ======================================================
// STYLE
// ======================================================

import "../styles/NewStoreOpenings.css";
import "../styles/premium/PagePremium.css";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import {
    FaStore,
    FaRocket,
    FaCalendarCheck,
    FaHourglassHalf,
    FaHandshake,
    FaTimes
} from "react-icons/fa";
import {
    daysFromToday,
    initials,
    avatarTone,
    formatCount
} from "../utils/premiumFormat";
import { exportFromCSV } from "../utils/exportUtils.js";

function NewStoreOpenings() {

    // ======================================================
    // STATES
    // ======================================================

    const [data, setData] = useState([]);

    const [loading, setLoading] = useState(true);

    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState("");

    // ======================================================
    // PAGINATION
    // ======================================================

    const [currentPage, setCurrentPage] = useState(1);

    const [pageSize, setPageSize] = useState(10);

    const [totalPages, setTotalPages] = useState(1);

    const [totalRecords, setTotalRecords] = useState(0);

    // ======================================================
    // ADD / EDIT MODAL
    // ======================================================

    const [showModal, setShowModal] = useState(false);

    const [editData, setEditData] = useState(null);

    // ======================================================
    // BULK UPLOAD
    // ======================================================

    const [showBulkModal, setShowBulkModal] = useState(false);

    // ======================================================
    // DELETE
    // ======================================================

    const [showDeleteDialog, setShowDeleteDialog] =
        useState(false);

    const [showDeleteAllDialog, setShowDeleteAllDialog] =
        useState(false);

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
        user.administrator === 1 ||
        user.administrator === "1";

    const permission = isAdmin
        ? "Full"
        : permissions["New Store Openings"] || "None";

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
    // SAFE VALUE
    // ======================================================

    const displayValue = (value) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "-";
        }

        return value;
    };

    // ======================================================
    // FORMAT DATE FOR TABLE
    //
    // IMPORTANT:
    // This avoids timezone shifting for MySQL dates.
    // ======================================================

    const formatDate = (value) => {

        if (!value) {
            return "-";
        }

        // --------------------------------------------------
        // Already YYYY-MM-DD
        // --------------------------------------------------

        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {

            const [
                year,
                month,
                day
            ] = value.split("-");

            return `${day}/${month}/${year}`;
        }

        // --------------------------------------------------
        // MySQL DATETIME
        // Example:
        // 2026-08-20 18:30:00
        // --------------------------------------------------

        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
        ) {

            const datePart =
                value.substring(0, 10);

            const [
                year,
                month,
                day
            ] = datePart.split("-");

            return `${day}/${month}/${year}`;
        }

        // --------------------------------------------------
        // ISO DATE
        // Example:
        // 2026-08-20T18:30:00.000Z
        // --------------------------------------------------

        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}T/.test(value)
        ) {

            const datePart =
                value.substring(0, 10);

            const [
                year,
                month,
                day
            ] = datePart.split("-");

            return `${day}/${month}/${year}`;
        }

        // --------------------------------------------------
        // Fallback
        // --------------------------------------------------

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${day}/${month}/${year}`;
    };

    // ======================================================
    // FORMAT DATE FOR HTML DATE INPUT
    //
    // IMPORTANT FOR EDIT
    //
    // HTML:
    // <input type="date">
    //
    // MUST receive:
    // YYYY-MM-DD
    // ======================================================

    const formatDateForInput = (value) => {

        if (!value) {
            return "";
        }

        // --------------------------------------------------
        // Already YYYY-MM-DD
        // --------------------------------------------------

        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {

            return value;
        }

        // --------------------------------------------------
        // MySQL DATETIME
        // --------------------------------------------------

        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
        ) {

            return value.substring(0, 10);
        }

        // --------------------------------------------------
        // ISO DATE
        // --------------------------------------------------

        if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}T/.test(value)
        ) {

            return value.substring(0, 10);
        }

        // --------------------------------------------------
        // Excel / JS DATE
        // --------------------------------------------------

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "";
        }

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    // ======================================================
    // NORMALIZE ROW
    //
    // This makes sure edit modal receives all dates
    // in YYYY-MM-DD format.
    // ======================================================

    const normalizeRowForEdit = (row) => {

        if (!row) {
            return null;
        }

        return {

            ...row,

            // ------------------------------------------------
            // BASIC / APPROVAL
            // ------------------------------------------------

            layout_by_nso:
                row.layout_by_nso ?? "",

            revised_layout_by_nso:
                row.revised_layout_by_nso ?? "",

            approval_deadline:
                formatDateForInput(
                    row.approval_deadline
                ),

            approver_name:
                row.approver_name ?? "",

            construction_vendor:
                row.construction_vendor ?? "",

            project_taken_by:
                row.project_taken_by ?? "",

            // ------------------------------------------------
            // TIMELINE
            // ------------------------------------------------

            visit_by_op_team:
                formatDateForInput(
                    row.visit_by_op_team
                ),

            gst_deadline:
                formatDateForInput(
                    row.gst_deadline
                ),

            hr_hiring_deadline:
                formatDateForInput(
                    row.hr_hiring_deadline
                ),

            team_training_deadline:
                formatDateForInput(
                    row.team_training_deadline
                ),

            visit_by_nso_team_deadline:
                formatDateForInput(
                    row.visit_by_nso_team_deadline
                ),

            plan_of_stock_deadline:
                formatDateForInput(
                    row.plan_of_stock_deadline
                ),

            plan_of_collaterals_deadline:
                formatDateForInput(
                    row.plan_of_collaterals_deadline
                ),

            on_field_training_deadline:
                formatDateForInput(
                    row.on_field_training_deadline
                ),

            dispatch_stock_deadline:
                formatDateForInput(
                    row.dispatch_stock_deadline
                ),

            nso_handover_deadline:
                formatDateForInput(
                    row.nso_handover_deadline
                ),

            vm_handover_deadline:
                formatDateForInput(
                    row.vm_handover_deadline
                ),

            scanning_deadline:
                formatDateForInput(
                    row.scanning_deadline
                ),

            billing_start_date:
                formatDateForInput(
                    row.billing_start_date
                ),

            // ------------------------------------------------
            // STORE DETAILS
            // ------------------------------------------------

            location:
                row.location ?? "",

            city:
                row.city ?? "",

            sb_area:
                row.sb_area ?? "",

            carpet_area:
                row.carpet_area ?? "",

            cam:
                row.cam ?? "",

            mg:
                row.mg ?? "",

            electricity_kva:
                row.electricity_kva ?? "",

            revenue_share:
                row.revenue_share ?? "",

            escalation:
                row.escalation ?? "",

            expected_sale:
                row.expected_sale ?? "",

            // ------------------------------------------------
            // POSSESSION
            // ------------------------------------------------

            possession_date_loi:
                formatDateForInput(
                    row.possession_date_loi
                ),

            possession_date_broker:
                formatDateForInput(
                    row.possession_date_broker
                ),

            actual_possession_date:
                formatDateForInput(
                    row.actual_possession_date
                ),

            received_by_nso:
                formatDateForInput(
                    row.received_by_nso
                ),

            broker_name:
                row.broker_name ?? "",

            operation_head_assigned:
                row.operation_head_assigned ?? "",

            asm_assigned:
                row.asm_assigned ?? "",

            deal_days:
                row.deal_days ?? "",

            // ------------------------------------------------
            // OTHER
            // ------------------------------------------------

            remarks:
                row.remarks ?? "",

            attachment:
                row.attachment ?? "",

            delay_loi_vs_broker:
                row.delay_loi_vs_broker ?? "",

            possession_delay:
                row.possession_delay ?? "",

            history:
                row.history ?? "",

            created_by:
                row.created_by ?? ""
        };
    };

    // ======================================================
    // LOAD DATA
    // ======================================================

    // `silent` skips the loading flag so a background refresh never
    // swaps the table out for the "Loading..." state — see the
    // auto-refresh effect below.
    const fetchNewStoreOpenings = async ({ silent = false } = {}) => {

        try {

            if (!silent) setLoading(true);

            // BUG FIX ("blank on refresh, appears on the next refresh"):
            // retry once automatically (e.g. a transient/cold-start
            // failure) before bothering the user with an alert and an
            // empty table.
            let res;

            try {
                res = await getNewStoreOpenings({
                    page: currentPage,
                    limit: pageSize,
                    search
                });
            } catch (firstError) {
                console.warn("New Store Openings load failed, retrying once:", firstError.message);
                await new Promise((resolve) => setTimeout(resolve, 900));
                res = await getNewStoreOpenings({
                    page: currentPage,
                    limit: pageSize,
                    search
                });
            }

            const result =
                res?.data || {};

            const rows =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            setData(rows);

            setTotalPages(
                Number(
                    result.totalPages
                ) || 1
            );

            setTotalRecords(
                Number(
                    result.total
                ) || 0
            );

        }
        catch (err) {

            console.error(
                "New Store Openings Load Error:",
                err
            );

            // A quiet background refresh should never interrupt the
            // person with an alert over a transient failure — it just
            // tries again on the next tick/focus. Only a real,
            // person-initiated load reports the error.
            if (!silent) {

                alert(
                    err.response?.data?.message ||
                    err.message ||
                    "Unable to load New Store Openings."
                );

                setData([]);

                setTotalPages(1);

                setTotalRecords(0);

            }

        }
        finally {

            if (!silent) setLoading(false);

        }

    };

    // ======================================================
    // LOAD ON PAGE / SEARCH CHANGE
    // ======================================================

    useEffect(() => {

        if (!canView) {

            setLoading(false);

            return;

        }

        fetchNewStoreOpenings();

    }, [
        currentPage,
        pageSize,
        search,
        canView
    ]);

    // ======================================================
    // BACKGROUND AUTO-REFRESH
    //
    // Total Records / the table itself used to only ever load on
    // mount or when a filter/page changed — a record added or
    // changed from another tab/device only showed up after a manual
    // page reload. This mirrors the same fix already applied to
    // Action Points / Checklist Reports: a quiet periodic refetch
    // plus a refetch on window focus, skipped while a modal is open
    // so an in-progress add/edit is never unmounted out from under
    // the person using it.
    // ======================================================

    const modalOpenRef = useRef(false);

    useEffect(() => {
        modalOpenRef.current =
            showModal ||
            showBulkModal ||
            showDeleteDialog ||
            showDeleteAllDialog;
    }, [
        showModal,
        showBulkModal,
        showDeleteDialog,
        showDeleteAllDialog
    ]);

    useEffect(() => {

        if (!canView) return;

        const silentTick = () => {
            if (modalOpenRef.current) return;
            fetchNewStoreOpenings({ silent: true });
        };

        const interval = window.setInterval(silentTick, 60 * 1000);

        const handleFocus = () => silentTick();
        window.addEventListener("focus", handleFocus);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView, currentPage, pageSize, search]);

    // ======================================================
    // ADD
    // ======================================================

    const handleAdd = () => {

        if (!canAdd) {
            return;
        }

        setEditData(null);

        setShowModal(true);

    };

    // ======================================================
    // EDIT
    // ======================================================

    const handleEdit = (row) => {

        if (!canEdit) {
            return;
        }

        // -----------------------------------------------
        // VERY IMPORTANT
        //
        // Normalize every date before opening modal.
        // -----------------------------------------------

        const normalized =
            normalizeRowForEdit(row);

        console.log(
            "EDIT ROW:",
            row
        );

        console.log(
            "NORMALIZED EDIT DATA:",
            normalized
        );

        setEditData(normalized);

        setShowModal(true);

    };

    // ======================================================
    // DELETE
    // ======================================================

    const handleDelete = (id) => {

        if (!canDelete) {
            return;
        }

        if (!id) {
            alert(
                "Invalid New Store Opening ID."
            );

            return;
        }

        setDeleteId(id);

        setShowDeleteDialog(true);

    };

    // ======================================================
    // CONFIRM DELETE
    // ======================================================

    const confirmDelete = async () => {

        if (!deleteId) {
            return;
        }

        try {

            const res =
                await deleteNewStoreOpening(
                    deleteId
                );

            if (
                res?.success ||
                res?.data?.success ||
                res?.status === 200
            ) {

                await fetchNewStoreOpenings();

            }
            else {

                alert(
                    res?.message ||
                    res?.data?.message ||
                    "Unable to delete record."
                );

            }

        }
        catch (err) {

            console.error(
                "Delete Error:",
                err
            );

            alert(
                err.response?.data?.message ||
                err.message ||
                "Delete failed."
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

        if (!canDelete) {
            return;
        }

        if (totalRecords <= 0) {

            alert(
                "There are no records to delete."
            );

            return;
        }

        setShowDeleteAllDialog(true);

    };

    // ======================================================
    // CONFIRM DELETE ALL
    // ======================================================

    const isFilteredDelete = hasActiveFilters({ search });

    const confirmDeleteAll = async () => {

        try {

            let ids;

            if (isFilteredDelete) {
                // Resolve every project matching the search (all pages).
                const all = await getNewStoreOpenings({ page: 1, limit: 100000, search });
                ids = collectIds(all?.data?.data || []);
                if (!ids.length) {
                    alert("No New Store Openings match the current search.");
                    return;
                }
            }

            const res =
                await deleteAllNewStoreOpenings(ids);

            if (
                res?.success ||
                res?.data?.success ||
                res?.status === 200
            ) {

                alert(
                    res?.data?.message ||
                    "All records deleted successfully."
                );

                setCurrentPage(1);

                await fetchNewStoreOpenings();

            }
            else {

                alert(
                    res?.message ||
                    res?.data?.message ||
                    "Delete failed."
                );

            }

        }
        catch (err) {

            console.error(
                "Delete All Error:",
                err
            );

            alert(
                err.response?.data?.message ||
                err.message ||
                "Delete failed."
            );

        }
        finally {

            setShowDeleteAllDialog(false);

        }

    };

    // ======================================================
    // EXPORT
    // ======================================================

    const handleExport = async (format = "csv") => {

        try {

            const res =
                await exportNewStoreOpenings({

                    search

                });

            if (!res?.data) {

                alert(
                    "No data available."
                );

                return;

            }

            const csvText = await res.data.text();

            await exportFromCSV({
                csvText,
                filename: "NewStoreOpenings",
                format,
                title: "New Store Openings",
            });

        }
        catch (err) {

            console.error(
                "Export Error:",
                err
            );

            alert(
                err.response?.data?.message ||
                "Failed to export records."
            );

        }

    };

    // ======================================================
    // BULK UPLOAD
    // ======================================================

    const handleBulkUpload = async (
        formData
    ) => {

        try {

            const res =
                await bulkUploadNewStoreOpenings(
                    formData
                );

            if (
                res?.success ||
                res?.data?.success ||
                res?.status === 200
            ) {

                alert(
                    res?.message ||
                    res?.data?.message ||
                    "Bulk upload completed successfully."
                );

                setCurrentPage(1);

                await fetchNewStoreOpenings();

                return res;

            }

            alert(
                res?.message ||
                res?.data?.message ||
                "Bulk upload failed."
            );

            return res;

        }
        catch (err) {

            console.error(
                "Bulk Upload Error:",
                err
            );

            alert(
                err.response?.data?.message ||
                err.message ||
                "Bulk upload failed."
            );

            throw err;

        }

    };

    // ======================================================
    // MODAL SUCCESS
    // ======================================================

    const handleSuccess = async () => {

        setShowModal(false);

        setEditData(null);

        await fetchNewStoreOpenings();

    };

    // ======================================================
    // CLOSE MODAL
    // ======================================================

    const handleCloseModal = () => {

        setShowModal(false);

        setEditData(null);

    };

    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setCurrentPage(1);

    };

    // ======================================================
    // PREMIUM SUMMARY (KPI strip)
    //
    // One light request for the whole pipeline (not just the
    // current page) so the KPI tiles describe every project.
    // Re-runs whenever the record count changes (add / delete /
    // bulk upload).
    // ======================================================

    const [summaryRows, setSummaryRows] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(true);

    useEffect(() => {

        let alive = true;

        getNewStoreOpenings({ page: 1, limit: 1000, search: "" })
            .then((res) => {
                if (!alive) return;
                const rows = res?.data?.data;
                setSummaryRows(Array.isArray(rows) ? rows : []);
            })
            .catch(() => {
                if (alive) setSummaryRows([]);
            })
            .finally(() => {
                if (alive) setSummaryLoading(false);
            });

        return () => {
            alive = false;
        };

    }, [totalRecords]);

    const MILESTONE_KEYS = [
        "layout_by_nso",
        "revised_layout_by_nso",
        "approval_deadline",
        "visit_by_op_team",
        "gst_deadline",
        "hr_hiring_deadline",
        "team_training_deadline",
        "visit_by_nso_team_deadline",
        "plan_of_stock_deadline",
        "plan_of_collaterals_deadline",
        "on_field_training_deadline",
        "dispatch_stock_deadline",
        "nso_handover_deadline",
        "vm_handover_deadline",
        "scanning_deadline",
        "billing_start_date"
    ];

    const summary = (() => {

        let live = 0;
        let launchingSoon = 0;
        let milestonesThisWeek = 0;
        let dealDaysTotal = 0;
        let dealDaysCount = 0;

        summaryRows.forEach((row) => {

            const launch = daysFromToday(row.billing_start_date);

            if (launch !== null && launch < 0) live += 1;
            if (launch !== null && launch >= 0 && launch <= 30) launchingSoon += 1;

            MILESTONE_KEYS.forEach((key) => {
                const diff = daysFromToday(row[key]);
                if (diff !== null && diff >= 0 && diff <= 7) milestonesThisWeek += 1;
            });

            const deal = Number(row.deal_days);

            if (Number.isFinite(deal) && String(row.deal_days ?? "").trim() !== "") {
                dealDaysTotal += deal;
                dealDaysCount += 1;
            }
        });

        return {
            total: summaryRows.length,
            live,
            launchingSoon,
            milestonesThisWeek,
            avgDealDays: dealDaysCount
                ? Math.round(dealDaysTotal / dealDaysCount)
                : null
        };

    })();

    // ======================================================
    // PREMIUM CELL RENDERERS
    // ======================================================

    const isBlank = (value) =>
        value === null ||
        value === undefined ||
        String(value).trim() === "";

    const renderValue = (value) =>
        isBlank(value)
            ? <span className="pp-dash">—</span>
            : value;

    const renderDate = (value) => {

        const text = formatDate(value);

        if (!text || text === "-") {
            return <span className="pp-dash">—</span>;
        }

        const diff = daysFromToday(value);

        let tone = "";

        if (diff === 0) tone = "pp-date--today";
        else if (diff !== null && diff > 0 && diff <= 7) tone = "pp-date--soon";
        else if (diff !== null && diff < 0) tone = "pp-date--past";

        const hint =
            diff === 0
                ? "Today"
                : diff === null
                    ? undefined
                    : diff > 0
                        ? `In ${diff} day${diff === 1 ? "" : "s"}`
                        : `${Math.abs(diff)} day${diff === -1 ? "" : "s"} ago`;

        return (
            <span className={`pp-date ${tone}`} title={hint}>
                {text}
            </span>
        );
    };

    const renderPerson = (value) => {

        if (isBlank(value)) {
            return <span className="pp-dash">—</span>;
        }

        return (
            <span className="pp-person">
                <span className={`pp-avatar pp-avatar--round pp-avatar--xs ${avatarTone(value)}`}>
                    {initials(value)}
                </span>
                <span className="pp-person-name">{value}</span>
            </span>
        );
    };

    const launchStatus = (row) => {

        const diff = daysFromToday(row.billing_start_date);

        if (diff === null) {
            return { tone: "slate", label: "Launch date TBD" };
        }

        if (diff < 0) {
            return { tone: "green", label: "Live" };
        }

        if (diff === 0) {
            return { tone: "violet", label: "Launching today" };
        }

        if (diff <= 30) {
            return { tone: "amber", label: `Launch in ${diff}d` };
        }

        return { tone: "blue", label: `Launch in ${diff}d` };
    };

    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        // ==================================================
        // STORE (sticky identity column)
        // ==================================================

        {
            key: "store",

            title: "Store",

            width: "260px",

            render: (row) => {

                const status = launchStatus(row);

                const name =
                    row.location ||
                    row.store_name ||
                    `NSO #${row.id}`;

                return (

                    <div className="pp-cell-main">

                        <span className={`pp-avatar ${avatarTone(name)}`}>
                            {initials(name)}
                        </span>

                        <span className="pp-cell-text">

                            <span className="pp-cell-title" title={name}>
                                {name}
                            </span>

                            <span className="pp-cell-sub pp-cell-sub--flex">
                                <span>{row.city || "City not set"}</span>
                                <span className={`pp-pill pp-pill--dot pp-pill--${status.tone} pp-pill--xs`}>
                                    {status.label}
                                </span>
                            </span>

                        </span>

                    </div>

                );

            }
        },

        // ==================================================
        // APPROVAL & PLANNING
        // ==================================================

        {
            // BUG FIX ("timezone shows in the date, only need date"):
            // these two are calculated milestone DATES (see the NSO
            // timeline calculation — Layout by NSO, +2 days from
            // possession), but were rendered with displayValue(),
            // which just prints the raw value as-is. A DATETIME value
            // serializes to JSON as an ISO string ("2026-02-21T18:30:
            // 00.000Z"), so the raw timezone-stamped string was showing
            // straight in the table instead of a plain date. Every
            // other date column here already goes through formatDate()
            // — these two now do too.
            key: "layout_by_nso",

            title: "Layout by NSO",

            render: (row) => renderDate(row.layout_by_nso)
        },

        {
            key: "revised_layout_by_nso",

            title: "Revised Layout by NSO",

            render: (row) => renderDate(row.revised_layout_by_nso)
        },

        {
            key: "approval_deadline",

            title: "Approval Deadline",

            render: (row) => renderDate(row.approval_deadline)
        },

        {
            key: "approver_name",

            title: "Approver Name",

            render: (row) => renderPerson(row.approver_name)
        },

        {
            key: "construction_vendor",

            title: "Construction Vendor",

            render: (row) => renderPerson(row.construction_vendor)
        },

        {
            key: "project_taken_by",

            title: "Project Taken By",

            render: (row) => renderPerson(row.project_taken_by)
        },

        {
            key: "visit_by_op_team",

            title: "Visit by OP Team",

            render: (row) => renderDate(row.visit_by_op_team)
        },

        {
            key: "gst_deadline",

            title: "GST Deadline",

            render: (row) => renderDate(row.gst_deadline)
        },

        {
            key: "hr_hiring_deadline",

            title: "HR Hiring Deadline",

            render: (row) => renderDate(row.hr_hiring_deadline)
        },

        {
            key: "team_training_deadline",

            title: "Team Training Deadline",

            render: (row) => renderDate(row.team_training_deadline)
        },

        {
            key: "visit_by_nso_team_deadline",

            title: "Visit by NSO Team Deadline",

            render: (row) => renderDate(row.visit_by_nso_team_deadline)
        },

        {
            key: "plan_of_stock_deadline",

            title: "Plan of Stock Deadline",

            render: (row) => renderDate(row.plan_of_stock_deadline)
        },

        {
            key: "plan_of_collaterals_deadline",

            title: "Plan of Collaterals Deadline",

            render: (row) => renderDate(row.plan_of_collaterals_deadline)
        },

        {
            key: "on_field_training_deadline",

            title: "On Field Training Deadline",

            render: (row) => renderDate(row.on_field_training_deadline)
        },

        {
            key: "dispatch_stock_deadline",

            title: "Dispatch of Stock Deadline",

            render: (row) => renderDate(row.dispatch_stock_deadline)
        },

        {
            key: "nso_handover_deadline",

            title: "NSO Handover Deadline",

            render: (row) => renderDate(row.nso_handover_deadline)
        },

        {
            key: "vm_handover_deadline",

            title: "VM Handover Deadline",

            render: (row) => renderDate(row.vm_handover_deadline)
        },

        {
            key: "scanning_deadline",

            title: "Scanning of Stock Deadline",

            render: (row) => renderDate(row.scanning_deadline)
        },

        {
            key: "billing_start_date",

            title: "Billing Start",

            render: (row) => renderDate(row.billing_start_date)
        },

        {
            key: "history",

            title: "History",

            render: (row) =>
                displayValue(
                    row.history ||
                    row.created_by
                )
        },

        // ==================================================
        // STORE DETAILS
        // ==================================================



        {
            key: "sb_area",

            title: "SB Area (Sqft)",

            render: (row) => renderValue(row.sb_area)
        },

        {
            key: "carpet_area",

            title: "Carpet Area (Sqft)",

            render: (row) => renderValue(row.carpet_area)
        },

        {
            key: "cam",

            title: "CAM",

            render: (row) => renderValue(row.cam)
        },

        {
            key: "mg",

            title: "MG",

            render: (row) => renderValue(row.mg)
        },

        {
            key: "electricity_kva",

            title: "Electricity (KVA)",

            render: (row) => renderValue(row.electricity_kva)
        },

        {
            key: "revenue_share",

            title: "Revenue Share %",

            render: (row) => {

                if (
                    row.revenue_share === null ||
                    row.revenue_share === undefined ||
                    row.revenue_share === ""
                ) {
                    return "-";
                }

                return `${row.revenue_share}%`;

            }

        },

        {
            key: "escalation",

            title: "Escalation %",

            render: (row) => {

                if (
                    row.escalation === null ||
                    row.escalation === undefined ||
                    row.escalation === ""
                ) {
                    return "-";
                }

                return `${row.escalation}%`;

            }

        },

        {
            key: "expected_sale",

            title: "Expected Sale",

            render: (row) => renderValue(row.expected_sale)
        },

        // ==================================================
        // POSSESSION
        // ==================================================

        {
            key: "possession_date_loi",

            title: "Possession Date (LOI)",

            render: (row) => renderDate(row.possession_date_loi)
        },

        {
            key: "possession_date_broker",

            title: "Possession Date (Broker)",

            render: (row) => renderDate(row.possession_date_broker)
        },

        {
            key: "broker_name",

            title: "Broker Name",

            render: (row) => renderPerson(row.broker_name)
        },

        {
            key: "operation_head_assigned",

            title: "Operation Head Assigned",

            render: (row) => renderPerson(row.operation_head_assigned)
        },

        {
            key: "asm_assigned",

            title: "ASM Assigned",

            render: (row) => renderPerson(row.asm_assigned)
        },

        {
            key: "deal_days",

            title: "Deal Days",

            render: (row) => renderValue(row.deal_days)
        },

        {
            key: "actual_possession_date",

            title: "Actual Possession Date",

            render: (row) => renderDate(row.actual_possession_date)
        },

        // ==================================================
        // OTHER DETAILS
        // ==================================================

        {
            key: "remarks",

            title: "Remarks",

            render: (row) => (

                <div className="remarks-cell">

                    {displayValue(
                        row.remarks
                    )}

                </div>

            )

        },

        {
            key: "attachment",

            title: "Attachment",

            render: (row) => {

                if (!row.attachment) {
                    return "-";
                }

                const attachmentPath =
                    String(
                        row.attachment
                    ).replace(
                       (/^\/+/, "")
                    );

                return (

                    <a
                        href={`${API_BASE_URL}/${attachmentPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pp-link"
                    >
                        View
                    </a>

                );

            }

        },

        {
            key: "delay_loi_vs_broker",

            title: "Delay LOI vs Broker",

            render: (row) => renderValue(row.delay_loi_vs_broker)
        },

        {
            key: "possession_delay",

            title: "Possession Delay",

            render: (row) => renderValue(row.possession_delay)
        },

        {
            key: "received_by_nso",

            title: "Received by NSO",

            render: (row) => renderDate(row.received_by_nso)
        },

        // ==================================================
        // ACTIONS
        // ==================================================

        {
            key: "actions",

            title: "Actions",

            width: "190px",

            align: "center",

            render: (row) => (

                <div className="action-buttons">

                    {canEdit && (

                        <button
                            type="button"
                            className="edit-btn"
                            onClick={() =>
                                handleEdit(row)
                            }
                        >
                            <i className="fas fa-edit"></i>
                            {" "}
                            Edit
                        </button>

                    )}

                    {canDelete && (

                        <button
                            type="button"
                            className="delete-btn"
                            onClick={() =>
                                handleDelete(row.id)
                            }
                        >
                            <i className="fas fa-trash"></i>
                            {" "}
                            Delete
                        </button>

                    )}

                </div>

            )

        }

    ];

    // ======================================================
    // RENDER
    // ======================================================

    return (

        <div className="new-store-page pp-premium">

            {/* ==================================================
                PREMIUM HERO
            ================================================== */}

            <PremiumHero
                icon={FaStore}
                eyebrow="Expansion · Admin workspace"
                title="New Store Openings"
                badge="Admin only"
                subtitle="Every new store from layout approval to billing start — milestones, vendors, owners and possession in one place."
                meta={[
                    { label: "Projects", value: formatCount(totalRecords) },
                    { label: "Showing", value: `${data.length} on this page` }
                ]}
            />

            {/* ==================================================
                KPI STRIP
            ================================================== */}

            <InsightStrip
                loading={summaryLoading}
                items={[
                    {
                        key: "total",
                        label: "Pipeline",
                        value: formatCount(summary.total),
                        hint: "Stores in the NSO tracker",
                        tone: "violet",
                        icon: FaStore
                    },
                    {
                        key: "live",
                        label: "Live",
                        value: formatCount(summary.live),
                        hint: "Billing has started",
                        tone: "green",
                        icon: FaRocket
                    },
                    {
                        key: "soon",
                        label: "Launching ≤ 30 days",
                        value: formatCount(summary.launchingSoon),
                        hint: "Billing start within a month",
                        tone: "amber",
                        icon: FaHourglassHalf
                    },
                    {
                        key: "week",
                        label: "Milestones this week",
                        value: formatCount(summary.milestonesThisWeek),
                        hint: "Deadlines in the next 7 days",
                        tone: "blue",
                        icon: FaCalendarCheck
                    },
                    {
                        key: "deal",
                        label: "Avg deal days",
                        value: summary.avgDealDays === null ? "—" : summary.avgDealDays,
                        hint: "Across projects with deal days",
                        tone: "slate",
                        icon: FaHandshake
                    }
                ]}
            />

            {/* ==================================================
                PAGE TOOLBAR
            ================================================== */}

            <PageToolbar

                search={search}

                setSearch={(value) => {

                    setSearch(value);

                    setCurrentPage(1);

                }}

                placeholder="Search by store, city, vendor, owner…"

                showAdd={canAdd}

                addText="Add New Store Opening"

                onAdd={handleAdd}

                showExport={canView}

                onExport={handleExport}

                showBulk={canAdd}

                onBulk={() =>
                    setShowBulkModal(true)
                }

                showDeleteAll={canDelete}

                deleteAllText={deleteAllLabel(isFilteredDelete, totalRecords)}
                onDeleteAll={handleDeleteAll}

            >

                {search && (

                    <button
                        type="button"
                        className="toolbar-btn"
                        onClick={handleClearFilters}
                    >
                        <FaTimes />
                        Clear search
                    </button>

                )}

            </PageToolbar>

            {/* ==================================================
                TABLE CARD
            ================================================== */}

            <Card
                title="New Store Opening List"
                subtitle="Scroll sideways for every milestone. Dots mark timing: amber = due within 7 days, violet = today, grey = passed."
                className="pp-sticky-first pp-sticky-last"
            >

                <DataTable

                    columns={columns}

                    data={data}

                    loading={loading}

                    emptyTitle="No Records Found"

                    emptyDescription={
                        "There are no New Store Openings available."
                    }

                />

                {/* ==================================================
                    PAGINATION
                ================================================== */}

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

            {/* ==================================================
                ADD / EDIT MODAL
            ================================================== */}

            <AddNewStoreOpeningModal

                isOpen={showModal}

                editData={editData}

                onClose={handleCloseModal}

                onSuccess={handleSuccess}

            />

            {/* ==================================================
                BULK UPLOAD MODAL
            ================================================== */}

            <BulkUploadModal
    moduleKey="new-store-openings"
    uploadUrl={"/api/new-store-openings/bulk-upload"}

                isOpen={showBulkModal}

                onClose={() =>
                    setShowBulkModal(false)
                }

                title="Bulk Upload New Store Openings"

                uploadFunction={handleBulkUpload}

                onSuccess={async () => {

                    setShowBulkModal(false);

                    setCurrentPage(1);

                    await fetchNewStoreOpenings();

                }}
                sampleFile="/api/new-store-openings/sample"

            />

            {/* ==================================================
                DELETE CONFIRMATION
            ================================================== */}

            <ConfirmDialog

                open={showDeleteDialog}

                title="Delete New Store Opening"

                message={
                    "Are you sure you want to delete this New Store Opening?"
                }

                confirmText="Delete"

                cancelText="Cancel"

                confirmVariant="danger"

                onConfirm={confirmDelete}

                onCancel={() => {

                    setDeleteId(null);

                    setShowDeleteDialog(false);

                }}

            />

            {/* ==================================================
                DELETE ALL CONFIRMATION
            ================================================== */}

            <ConfirmDialog

                open={showDeleteAllDialog}

                title={isFilteredDelete ? "Delete Filtered New Store Openings" : "Delete All New Store Openings"}

                message={
                    `${deleteAllMessage(isFilteredDelete, totalRecords, "New Store Openings")} This action cannot be undone.`
                }

                confirmText={isFilteredDelete ? "Delete Filtered" : "Delete All"}

                cancelText="Cancel"

                confirmVariant="danger"

                onConfirm={confirmDeleteAll}

                onCancel={() =>
                    setShowDeleteAllDialog(false)
                }

            />

        </div>

    );

}

export default NewStoreOpenings;
import { API_BASE_URL } from "../axiosConfig.js";
import { useEffect, useRef, useState } from "react";

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

    const confirmDeleteAll = async () => {

        try {

            const res =
                await deleteAllNewStoreOpenings();

            if (
                res?.success ||
                res?.data?.success ||
                res?.status === 200
            ) {

                alert(
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
    // TABLE COLUMNS
    // ======================================================

    const columns = [

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

            render: (row) =>
                formatDate(
                    row.layout_by_nso
                )
        },

        {
            key: "revised_layout_by_nso",

            title: "Revised Layout by NSO",

            render: (row) =>
                formatDate(
                    row.revised_layout_by_nso
                )
        },

        {
            key: "approval_deadline",

            title: "Approval Deadline",

            render: (row) =>
                formatDate(
                    row.approval_deadline
                )
        },

        {
            key: "approver_name",

            title: "Approver Name",

            render: (row) =>
                displayValue(
                    row.approver_name
                )
        },

        {
            key: "construction_vendor",

            title: "Construction Vendor",

            render: (row) =>
                displayValue(
                    row.construction_vendor
                )
        },

        {
            key: "project_taken_by",

            title: "Project Taken By",

            render: (row) =>
                displayValue(
                    row.project_taken_by
                )
        },

        {
            key: "visit_by_op_team",

            title: "Visit by OP Team",

            render: (row) =>
                formatDate(
                    row.visit_by_op_team
                )
        },

        {
            key: "gst_deadline",

            title: "GST Deadline",

            render: (row) =>
                formatDate(
                    row.gst_deadline
                )
        },

        {
            key: "hr_hiring_deadline",

            title: "HR Hiring Deadline",

            render: (row) =>
                formatDate(
                    row.hr_hiring_deadline
                )
        },

        {
            key: "team_training_deadline",

            title: "Team Training Deadline",

            render: (row) =>
                formatDate(
                    row.team_training_deadline
                )
        },

        {
            key: "visit_by_nso_team_deadline",

            title: "Visit by NSO Team Deadline",

            render: (row) =>
                formatDate(
                    row.visit_by_nso_team_deadline
                )
        },

        {
            key: "plan_of_stock_deadline",

            title: "Plan of Stock Deadline",

            render: (row) =>
                formatDate(
                    row.plan_of_stock_deadline
                )
        },

        {
            key: "plan_of_collaterals_deadline",

            title: "Plan of Collaterals Deadline",

            render: (row) =>
                formatDate(
                    row.plan_of_collaterals_deadline
                )
        },

        {
            key: "on_field_training_deadline",

            title: "On Field Training Deadline",

            render: (row) =>
                formatDate(
                    row.on_field_training_deadline
                )
        },

        {
            key: "dispatch_stock_deadline",

            title: "Dispatch of Stock Deadline",

            render: (row) =>
                formatDate(
                    row.dispatch_stock_deadline
                )
        },

        {
            key: "nso_handover_deadline",

            title: "NSO Handover Deadline",

            render: (row) =>
                formatDate(
                    row.nso_handover_deadline
                )
        },

        {
            key: "vm_handover_deadline",

            title: "VM Handover Deadline",

            render: (row) =>
                formatDate(
                    row.vm_handover_deadline
                )
        },

        {
            key: "scanning_deadline",

            title: "Scanning of Stock Deadline",

            render: (row) =>
                formatDate(
                    row.scanning_deadline
                )
        },

        {
            key: "billing_start_date",

            title: "Billing Start",

            render: (row) =>
                formatDate(
                    row.billing_start_date
                )
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
            key: "location",

            title: "Location",

            render: (row) =>
                displayValue(
                    row.location
                )
        },

        {
            key: "city",

            title: "City",

            render: (row) =>
                displayValue(
                    row.city
                )
        },

        {
            key: "sb_area",

            title: "SB Area (Sqft)",

            render: (row) =>
                displayValue(
                    row.sb_area
                )
        },

        {
            key: "carpet_area",

            title: "Carpet Area (Sqft)",

            render: (row) =>
                displayValue(
                    row.carpet_area
                )
        },

        {
            key: "cam",

            title: "CAM",

            render: (row) =>
                displayValue(
                    row.cam
                )
        },

        {
            key: "mg",

            title: "MG",

            render: (row) =>
                displayValue(
                    row.mg
                )
        },

        {
            key: "electricity_kva",

            title: "Electricity (KVA)",

            render: (row) =>
                displayValue(
                    row.electricity_kva
                )
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

            render: (row) =>
                displayValue(
                    row.expected_sale
                )
        },

        // ==================================================
        // POSSESSION
        // ==================================================

        {
            key: "possession_date_loi",

            title: "Possession Date (LOI)",

            render: (row) =>
                formatDate(
                    row.possession_date_loi
                )
        },

        {
            key: "possession_date_broker",

            title: "Possession Date (Broker)",

            render: (row) =>
                formatDate(
                    row.possession_date_broker
                )
        },

        {
            key: "broker_name",

            title: "Broker Name",

            render: (row) =>
                displayValue(
                    row.broker_name
                )
        },

        {
            key: "operation_head_assigned",

            title: "Operation Head Assigned",

            render: (row) =>
                displayValue(
                    row.operation_head_assigned
                )
        },

        {
            key: "asm_assigned",

            title: "ASM Assigned",

            render: (row) =>
                displayValue(
                    row.asm_assigned
                )
        },

        {
            key: "deal_days",

            title: "Deal Days",

            render: (row) =>
                displayValue(
                    row.deal_days
                )
        },

        {
            key: "actual_possession_date",

            title: "Actual Possession Date",

            render: (row) =>
                formatDate(
                    row.actual_possession_date
                )
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
                        className="table-link"
                    >
                        View
                    </a>

                );

            }

        },

        {
            key: "delay_loi_vs_broker",

            title: "Delay LOI vs Broker",

            render: (row) =>
                displayValue(
                    row.delay_loi_vs_broker
                )
        },

        {
            key: "possession_delay",

            title: "Possession Delay",

            render: (row) =>
                displayValue(
                    row.possession_delay
                )
        },

        {
            key: "received_by_nso",

            title: "Received by NSO",

            render: (row) =>
                formatDate(
                    row.received_by_nso
                )
        },

        // ==================================================
        // ACTIONS
        // ==================================================

        {
            key: "actions",

            title: "Actions",

            width: "240px",

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

        <div className="new-store-page">

            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <PageHeader
                title="New Store Openings"
                subtitle="Manage new store opening records."
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

                placeholder="Search New Store Opening..."

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

                onDeleteAll={handleDeleteAll}

            />

            {/* ==================================================
                FILTER BAR
            ================================================== */}

            <FilterBar
                onClear={handleClearFilters}
            >

                {/* Future filters */}

            </FilterBar>

            {/* ==================================================
                TABLE CARD
            ================================================== */}

            <Card
                title="New Store Opening List"
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

                acceptedFile=".csv,.xlsx,.xls"

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

                title="Delete All New Store Openings"

                message={
                    "Are you sure you want to delete ALL New Store Openings? This action cannot be undone."
                }

                confirmText="Delete All"

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
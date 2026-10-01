import { useEffect, useState } from "react";
import { activeFilters, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";

// ======================================================
// COMMON COMPONENTS
// ======================================================

import PageToolbar from "../components/common/PageToolbar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import ActionButtons from "../components/common/ActionButtons";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BulkUploadModal from "../components/common/BulkUploadModal";

// ======================================================
// MODAL
// ======================================================

import AddRuleModal from "../components/AddRuleModal";

// ======================================================
// SERVICES
// ======================================================

import {

    getRules,

    deleteRule,

    deleteAllRules,

    bulkUploadRules,

    exportRules

} from "../services/nsoRuleService";

// ======================================================
// STYLE
// ======================================================

import "../styles/NSORules.css";
import "../styles/premium/PagePremium.css";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import {
    FaGavel,
    FaCheckCircle,
    FaFire,
    FaAsterisk,
    FaBolt,
    FaTimes,
    FaLongArrowAltRight
} from "react-icons/fa";
import { formatCount } from "../utils/premiumFormat";
import { exportFromCSV } from "../utils/exportUtils.js";

function NSORules() {

    // ======================================================
    // STATES
    // ======================================================

    const [rules, setRules] = useState([]);

    const [loading, setLoading] = useState(true);

    // Search

    const [search, setSearch] = useState("");

    // Pagination

    const [currentPage, setCurrentPage] = useState(1);

    const [pageSize, setPageSize] = useState(10);

    const [totalPages, setTotalPages] = useState(1);

    const [totalRecords, setTotalRecords] = useState(0);

    // Modal

    const [showModal, setShowModal] = useState(false);

    const [editData, setEditData] = useState(null);

    // Bulk Upload

    const [showBulkModal, setShowBulkModal] = useState(false);

    // Delete Dialog

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

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

        user.administrator === 1;

    const permission = isAdmin

        ? "Full"

        : permissions["NSO Rules"] || "None";

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

const fetchRules = async () => {

    try {

        setLoading(true);

        const result = await getRules({

            search,

            page: currentPage,

            limit: pageSize

        });

        

        console.log("NSO Rules API:", result);

        setRules(

            result.data || []

        );

        setTotalPages(

            result.pagination?.totalPages || 1

        );

        setTotalRecords(

            result.pagination?.total || 0

        );

    }

    catch (err) {

        console.error("NSO Rules Error:", err);

        console.log("Status:", err.response?.status);

        console.log("Response:", err.response?.data);

        alert(

            err.response?.data?.message ||

            "Unable to load NSO Rules."

        );

        setRules([]);

        setTotalPages(1);

        setTotalRecords(0);

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

    fetchRules();

}, [

    currentPage,

    pageSize,

    search,

    canView

]);
        // ======================================================
    // ADD
    // ======================================================

    const handleAdd = () => {

        setEditData(null);

        setShowModal(true);

    };

    // ======================================================
    // EDIT
    // ======================================================

    const handleEdit = (rule) => {

        setEditData(rule);

        setShowModal(true);

    };

    // ======================================================
    // DELETE
    // ======================================================

    const handleDelete = (id) => {

        setDeleteId(id);

        setShowDeleteDialog(true);

    };

    const confirmDelete = async () => {

        try {

            await deleteRule(deleteId);

            setShowDeleteDialog(false);

            setDeleteId(null);

            fetchRules();

        }

        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to delete rule."

            );

        }

    };

    // ======================================================
    // DELETE ALL
    // ======================================================

    const handleDeleteAll = () => {

        setShowDeleteAllDialog(true);

    };

    const isFilteredDelete = hasActiveFilters({ search });

    const confirmDeleteAll = async () => {

        try {

            const result = await deleteAllRules(
                isFilteredDelete ? activeFilters({ search }) : null
            );

            if (result?.message) alert(result.message);

            setShowDeleteAllDialog(false);

            fetchRules();

        }

        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                "Unable to delete all rules."

            );

        }

    };

    // ======================================================
// EXPORT
// ======================================================

const handleExport = async (format = "csv") => {

    try {

        const response = await exportRules();

        const csvText = await response.data.text();

        await exportFromCSV({
            csvText,
            filename: "NSO_Rules",
            format,
            title: "NSO Rules",
        });

    }

    catch (err) {

        console.error(err);

        alert(

            err.response?.data?.message ||

            "Export failed."

        );

    }

};
    // ======================================================
// BULK UPLOAD
// ======================================================

const handleBulkUpload = async (file) => {

    try {

        const response = await bulkUploadRules(file);

        await fetchRules();

        return response;

    }

    catch (err) {

        console.error("Bulk Upload Error:", err);

        throw err;

    }

};
    // ======================================================
    // SUCCESS
    // ======================================================

    const handleSuccess = () => {

        setShowModal(false);

        setEditData(null);

        fetchRules();

    };

    // ======================================================
    // CLEAR FILTERS
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setCurrentPage(1);

    };

// ======================================================
// PREMIUM SUMMARY (all rules, not just this page)
// ======================================================

const [summaryRules, setSummaryRules] = useState([]);
const [summaryLoading, setSummaryLoading] = useState(true);

useEffect(() => {

    let alive = true;

    getRules({ search: "", page: 1, limit: 1000 })
        .then((result) => {
            if (alive) setSummaryRules(Array.isArray(result?.data) ? result.data : []);
        })
        .catch(() => {
            if (alive) setSummaryRules([]);
        })
        .finally(() => {
            if (alive) setSummaryLoading(false);
        });

    return () => {
        alive = false;
    };

}, [totalRecords]);

const isOn = (value) =>
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true" ||
    String(value).toLowerCase() === "yes";

const summary = summaryRules.reduce(
    (acc, rule) => {
        acc.total += 1;
        if (isOn(rule.is_active)) acc.active += 1;
        if (["high", "critical", "urgent"].includes(String(rule.priority || "").toLowerCase())) acc.high += 1;
        if (isOn(rule.mandatory)) acc.mandatory += 1;
        if (isOn(rule.create_action_point)) acc.actionPoints += 1;
        return acc;
    },
    { total: 0, active: 0, high: 0, mandatory: 0, actionPoints: 0 }
);

const PRIORITY_TONE = {
    critical: "red",
    urgent: "red",
    high: "red",
    medium: "amber",
    low: "green"
};

const yesNoPill = (value) =>
    isOn(value)
        ? <span className="pp-pill pp-pill--violet">Yes</span>
        : <span className="pp-pill pp-pill--slate">No</span>;

// ======================================================
// TABLE COLUMNS
// ======================================================

const columns = [

    {
        key: "rule",
        title: "Rule",
        width: "380px",
        render: (row) => {

            const expected = String(row.expected_answer || "").trim();

            return (
                <div className="pp-cell-main pp-rule-cell">

                    <span className="pp-avatar pp-rule-id">
                        #{row.id}
                    </span>

                    <span className="pp-cell-text">

                        <span className="pp-cell-title pp-wrap" title={row.trigger_column || ""}>
                            {row.trigger_column || "Untitled rule"}
                        </span>

                        <span className="pp-cell-sub pp-cell-sub--flex">
                            <span>When answered</span>
                            <span className={`pp-pill pp-pill--xs pp-pill--${expected.toLowerCase() === "no" ? "red" : "green"}`}>
                                {expected || "—"}
                            </span>
                            <FaLongArrowAltRight className="pp-rule-arrow" />
                            <span>
                                {isOn(row.create_action_point)
                                    ? "raise an action point"
                                    : "flag in NSO tracking"}
                            </span>
                        </span>

                    </span>

                </div>
            );
        },
    },

    {
        key: "priority",
        title: "Priority",
        width: "130px",
        align: "center",
        render: (row) => {
            const value = String(row.priority || "").trim();
            if (!value) return <span className="pp-dash">—</span>;
            return (
                <span className={`pp-pill pp-pill--dot pp-pill--${PRIORITY_TONE[value.toLowerCase()] || "slate"}`}>
                    {value}
                </span>
            );
        },
    },

    {
        key: "sla_days",
        title: "SLA",
        width: "110px",
        align: "center",
        render: (row) =>
            row.sla_days === null || row.sla_days === undefined || row.sla_days === ""
                ? <span className="pp-dash">—</span>
                : (
                    <span className="pp-sla">
                        <strong>{row.sla_days}</strong>
                        <span>day{Number(row.sla_days) === 1 ? "" : "s"}</span>
                    </span>
                ),
    },

    {
        key: "mandatory",
        title: "Mandatory",
        width: "120px",
        align: "center",
        render: (row) => yesNoPill(row.mandatory),
    },

    {
        key: "create_action_point",
        title: "Action Point",
        width: "130px",
        align: "center",
        render: (row) => yesNoPill(row.create_action_point),
    },

    {
        key: "is_active",
        title: "Status",
        width: "120px",
        align: "center",
        render: (row) =>
            isOn(row.is_active)
                ? <span className="pp-pill pp-pill--dot pp-pill--green">Active</span>
                : <span className="pp-pill pp-pill--dot pp-pill--slate">Inactive</span>,
    },

    {
        key: "departments",
        title: "Departments",
        width: "280px",
        render: (row) => {
            const list = String(row.departments || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            if (list.length === 0) {
                return <span className="pp-pill pp-pill--blue">All departments</span>;
            }

            return (
                <div className="pp-chip-list">
                    {list.slice(0, 3).map((item) => (
                        <span className="pp-pill pp-pill--slate" key={item}>{item}</span>
                    ))}
                    {list.length > 3 && (
                        <span className="pp-pill pp-pill--violet" title={list.slice(3).join(", ")}>
                            +{list.length - 3}
                        </span>
                    )}
                </div>
            );
        },
    },

    {
        key: "actions",
        title: "Actions",
        width: "190px",
        align: "center",

        render: (row) => (

            <ActionButtons

                showEdit={canEdit}

                showDelete={canDelete}

                onEdit={() => handleEdit(row)}

                onDelete={() => handleDelete(row.id)}

            />

        ),

    },

];
        return (

        <div className="nso-rules-page pp-premium">

            {/* ======================================================
                PREMIUM HERO
            ====================================================== */}

            <PremiumHero
                icon={FaGavel}
                eyebrow="Expansion · Admin workspace"
                title="NSO Rules"
                badge="Admin only"
                subtitle="The automation behind NSO tracking — which answers raise action points, how urgent they are and how long teams have to close them."
                meta={[
                    { label: "Rules", value: formatCount(totalRecords) },
                    { label: "Active", value: summaryLoading ? null : formatCount(summary.active) }
                ]}
            />

            <InsightStrip
                loading={summaryLoading}
                items={[
                    { key: "total", label: "Total rules", value: formatCount(summary.total), hint: "Configured for NSO", tone: "violet", icon: FaGavel },
                    { key: "active", label: "Active", value: formatCount(summary.active), hint: `${formatCount(summary.total - summary.active)} inactive`, tone: "green", icon: FaCheckCircle },
                    { key: "high", label: "High priority", value: formatCount(summary.high), hint: "High / critical rules", tone: "red", icon: FaFire },
                    { key: "mandatory", label: "Mandatory", value: formatCount(summary.mandatory), hint: "Must be answered", tone: "amber", icon: FaAsterisk },
                    { key: "ap", label: "Auto action points", value: formatCount(summary.actionPoints), hint: "Raise a task automatically", tone: "blue", icon: FaBolt }
                ]}
            />

            {/* ======================================================
                PAGE TOOLBAR
            ====================================================== */}

            <PageToolbar

                search={search}

                setSearch={setSearch}

                placeholder="Search rules, priorities, departments…"

                showAdd={canAdd}

                addText="Add NSO Rule"

                onAdd={handleAdd}

                showExport

                onExport={handleExport}

                showBulk

                onBulk={() => setShowBulkModal(true)}

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

            {/* ======================================================
                CARD
            ====================================================== */}
<Card title="NSO Rule List" subtitle="Each rule watches one NSO checklist answer." className="pp-sticky-last">

    <DataTable
        columns={columns}
        data={rules}
        loading={loading}
        emptyTitle="No Rules Found"
        emptyDescription="There are no NSO Rules available."
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
                ADD / EDIT MODAL
            ====================================================== */}

            <AddRuleModal

                isOpen={showModal}

                editData={editData}

                onClose={() => {

                    setShowModal(false);

                    setEditData(null);

                }}

                onSuccess={handleSuccess}

            />

            {/* ======================================================
                BULK UPLOAD
            ====================================================== */}

            <BulkUploadModal
    moduleKey="nso-rules"
    uploadUrl={"/api/nso-rules/bulk-upload"}

                isOpen={showBulkModal}

                onClose={() => setShowBulkModal(false)}

                title="Bulk Upload NSO Rules"

                uploadFunction={handleBulkUpload}

                onSuccess={fetchRules}
                sampleFile="/api/nso-rules/sample"

            />

            {/* ======================================================
                DELETE
            ====================================================== */}

            <ConfirmDialog

                open={showDeleteDialog}

                title="Delete NSO Rule"

                message="Are you sure you want to delete this NSO Rule?"

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
                DELETE ALL
            ====================================================== */}

            <ConfirmDialog

                open={showDeleteAllDialog}

                title={isFilteredDelete ? "Delete Filtered NSO Rules" : "Delete All NSO Rules"}

                message={`${deleteAllMessage(isFilteredDelete, totalRecords, "NSO Rules")} This action cannot be undone.`}

                confirmText={isFilteredDelete ? "Delete Filtered" : "Delete All"}

                cancelText="Cancel"

                confirmVariant="danger"

                onConfirm={confirmDeleteAll}

                onCancel={() => setShowDeleteAllDialog(false)}

            />

        </div>

    );

}

export default NSORules;
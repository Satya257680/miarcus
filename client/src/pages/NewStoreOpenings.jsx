import { useEffect, useState } from "react";

// ======================================================
// COMMON COMPONENTS
// ======================================================

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import ActionButtons from "../components/common/ActionButtons";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BulkUploadModal from "../components/common/BulkUploadModal";

// ======================================================
// MODAL
// ======================================================

import AddNewStoreOpeningModal from "../components/NewStoreOpening/AddNewStoreOpeningModal";

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

function NewStoreOpenings() {

    // ======================================================
    // STATES
    // ======================================================

    const [data, setData] = useState([]);

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
    // LOAD DATA
    // ======================================================

    const fetchNewStoreOpenings = async () => {

        try {

            setLoading(true);

            const res = await getNewStoreOpenings({

                page: currentPage,

                limit: pageSize,

                search

            });

            const result = res.data || {};

            setData(result.data || []);

            setTotalPages(result.totalPages || 1);

            setTotalRecords(result.total || 0);

        }
        catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Unable to load New Store Openings."
            );

            setData([]);

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

        fetchNewStoreOpenings();

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

        if (!canAdd) return;

        setEditData(null);

        setShowModal(true);

    };

    // ======================================================
    // EDIT
    // ======================================================

    const handleEdit = (row) => {

        if (!canEdit) return;

        setEditData(row);

        setShowModal(true);

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

            const res = await deleteNewStoreOpening(deleteId);

            if (
                res.success ||
                res.data?.success ||
                res.status === 200
            ) {

                fetchNewStoreOpenings();

            } else {

                alert(res.message || "Unable to delete record.");

            }

        }
        catch (err) {

            console.error(err);

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

        if (!canDelete) return;

        setShowDeleteAllDialog(true);

    };

    const confirmDeleteAll = async () => {

        try {

            const res = await deleteAllNewStoreOpenings();

            if (
                res.success ||
                res.data?.success ||
                res.status === 200
            ) {

                alert("All records deleted successfully.");

                fetchNewStoreOpenings();

            } else {

                alert(res.message || "Delete failed.");

            }

        }
        catch (err) {

            console.error(err);

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

    const handleExport = async () => {

        try {

            const res = await exportNewStoreOpenings({

                search

            });

            if (!res.data) {

                alert("No data available.");

                return;

            }

            const blob = new Blob(

                [res.data],

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

                "NewStoreOpenings.csv";

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

        }
        catch (err) {

            console.error(err);

            alert("Failed to export records.");

        }

    };

    // ======================================================
    // BULK UPLOAD
    // ======================================================

    const handleBulkUpload = async (formData) => {

        try {

            const res = await bulkUploadNewStoreOpenings(formData);

            if (
                res.success ||
                res.data?.success
            ) {

                alert(

                    res.message ||

                    res.data?.message ||

                    "Bulk upload completed."

                );

                fetchNewStoreOpenings();

                return res;

            }

            alert(

                res.message ||

                "Bulk upload failed."

            );

            return res;

        }
        catch (err) {

            console.error(err);

            alert(

                err.response?.data?.message ||

                err.message ||

                "Bulk upload failed."

            );

            throw err;

        }

    };

    // ======================================================
    // SUCCESS
    // ======================================================

    const handleSuccess = () => {

        setShowModal(false);

        setEditData(null);

        fetchNewStoreOpenings();

    };

    // ======================================================
    // CLEAR FILTER
    // ======================================================

    const handleClearFilters = () => {

        setSearch("");

        setCurrentPage(1);

    };
    // ======================================================
// FORMAT DATE
// ======================================================

const formatDate = (value) => {

    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-GB");

};

// ======================================================
// TABLE COLUMNS
// ======================================================

const columns = [

    // ==================================================
    // APPROVAL & PLANNING
    // ==================================================

    {
        key: "layout_by_nso",
        title: "Layout by NSO",
        render: (row) => row.layout_by_nso || "-"
    },

    {
        key: "revised_layout_by_nso",
        title: "Revised Layout by NSO",
        render: (row) => row.revised_layout_by_nso || "-"
    },

    {
        key: "approval_deadline",
        title: "Approval Deadline",
        render: (row) => formatDate(row.approval_deadline)
    },

    {
        key: "approver_name",
        title: "Approver Name",
        render: (row) => row.approver_name || "-"
    },

    {
        key: "construction_vendor",
        title: "Construction Vendor",
        render: (row) => row.construction_vendor || "-"
    },

    {
        key: "project_taken_by",
        title: "Project Taken By",
        render: (row) => row.project_taken_by || "-"
    },

    {
        key: "visit_by_op_team",
        title: "Visit by OP Team",
        render: (row) => formatDate(row.visit_by_op_team)
    },

    {
        key: "gst_deadline",
        title: "GST Deadline",
        render: (row) => formatDate(row.gst_deadline)
    },

    {
        key: "hr_hiring_deadline",
        title: "HR Hiring Deadline",
        render: (row) => formatDate(row.hr_hiring_deadline)
    },

    {
        key: "team_training_deadline",
        title: "Team Training Deadline",
        render: (row) => formatDate(row.team_training_deadline)
    },

    {
        key: "visit_by_nso_team_deadline",
        title: "Visit by NSO Team Deadline",
        render: (row) => formatDate(row.visit_by_nso_team_deadline)
    },

    {
        key: "plan_of_stock_deadline",
        title: "Plan of Stock Deadline",
        render: (row) => formatDate(row.plan_of_stock_deadline)
    },

    {
        key: "plan_of_collaterals_deadline",
        title: "Plan of Collaterals Deadline",
        render: (row) => formatDate(row.plan_of_collaterals_deadline)
    },

    {
        key: "on_field_training_deadline",
        title: "On Field Training Deadline",
        render: (row) => formatDate(row.on_field_training_deadline)
    },

    {
        key: "dispatch_stock_deadline",
        title: "Dispatch of Stock Deadline",
        render: (row) => formatDate(row.dispatch_stock_deadline)
    },

    {
        key: "nso_handover_deadline",
        title: "NSO Handover Deadline",
        render: (row) => formatDate(row.nso_handover_deadline)
    },

    {
        key: "vm_handover_deadline",
        title: "VM Handover Deadline",
        render: (row) => formatDate(row.vm_handover_deadline)
    },

    {
        key: "scanning_deadline",
        title: "Scanning of Stock Deadline",
        render: (row) => formatDate(row.scanning_deadline)
    },

    {
        key: "billing_start_date",
        title: "Billing Start",
        render: (row) => formatDate(row.billing_start_date)
    },

    {
        key: "history",
        title: "History",
        render: (row) =>
            row.history ||
            row.created_by ||
            "-"
    },
       // ==================================================
// STORE DETAILS
// ==================================================

{
    key: "location",
    title: "Location",
    render: (row) => row.location || "-"
},

{
    key: "city",
    title: "City",
    render: (row) => row.city || "-"
},

{
    key: "sb_area",
    title: "SB Area (Sqft)",
    render: (row) => row.sb_area || "-"
},

{
    key: "carpet_area",
    title: "Carpet Area (Sqft)",
    render: (row) => row.carpet_area || "-"
},

{
    key: "cam",
    title: "CAM",
    render: (row) => row.cam || "-"
},

{
    key: "mg",
    title: "MG",
    render: (row) => row.mg || "-"
},

{
    key: "electricity_kva",
    title: "Electricity (KVA)",
    render: (row) => row.electricity_kva || "-"
},

{
    key: "revenue_share",
    title: "Revenue Share %",
    render: (row) =>
        row.revenue_share !== null &&
        row.revenue_share !== undefined
            ? `${row.revenue_share}%`
            : "-"
},
{
    key: "escalation",
    title: "Escalation %",
    render: (row) =>
        row.escalation !== null &&
        row.escalation !== undefined
            ? `${row.escalation}%`
            : "-"
},

{
    key: "expected_sale",
    title: "Expected Sale",
    render: (row) => row.expected_sale || "-"
},

// ==================================================
// POSSESSION
// ==================================================

{
    key: "possession_date_loi",
    title: "Possession Date (LOI)",
    render: (row) => formatDate(row.possession_date_loi)
},

{
    key: "possession_date_broker",
    title: "Possession Date (Broker)",
    render: (row) => formatDate(row.possession_date_broker)
},

{
    key: "broker_name",
    title: "Broker Name",
    render: (row) => row.broker_name || "-"
},

{
    key: "operation_head_assigned",
    title: "Operation Head Assigned",
    render: (row) => row.operation_head_assigned || "-"
},

{
    key: "asm_assigned",
    title: "ASM Assigned",
    render: (row) => row.asm_assigned || "-"
},

{
    key: "deal_days",
    title: "Deal Days",
    render: (row) => row.deal_days || "-"
},

{
    key: "actual_possession_date",
    title: "Actual Possession Date",
    render: (row) => formatDate(row.actual_possession_date)
},
    // ==================================================
// OTHER DETAILS
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

{
    key: "attachment",
    title: "Attachment",
    render: (row) => (
        row.attachment ? (
            <a
                href={`http://localhost:5000/${row.attachment}`}
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
    key: "delay_loi_vs_broker",
    title: "Delay LOI vs Broker",
    render: (row) => row.delay_loi_vs_broker || "-"
},

{
    key: "possession_delay",
    title: "Possession Delay",
    render: (row) => row.possession_delay || "-"
},

{
    key: "received_by_nso",
    title: "Received by NSO",
    render: (row) => row.received_by_nso || "-"
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
            <button
                className="edit-btn"
                onClick={() => handleEdit(row)}
            >
                <i className="fas fa-edit"></i> Edit
            </button>

            <button
                className="delete-btn"
                onClick={() => handleDelete(row.id)}
            >
                <i className="fas fa-trash"></i> Delete
            </button>
        </div>
    )
}

];

return (

<div className="new-store-page">

    {/* ======================================================
        PAGE HEADER
    ====================================================== */}

    <PageHeader
        title="New Store Openings"
        subtitle="Manage new store opening records."
    />

    {/* ======================================================
        PAGE TOOLBAR
    ====================================================== */}

    <PageToolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search New Store Opening..."

        showAdd={canAdd}
        addText="Add New Store Opening"
        onAdd={handleAdd}

        showExport
        onExport={handleExport}

        showBulk
        onBulk={() => setShowBulkModal(true)}

        showDeleteAll={canDelete}
        onDeleteAll={handleDeleteAll}
    />

    {/* ======================================================
        FILTER BAR
    ====================================================== */}

    <FilterBar
        onClear={handleClearFilters}
    >
        {/* Future Filters */}
    </FilterBar>

    {/* ======================================================
        CARD
    ====================================================== */}

    <Card
        title="New Store Opening List"
    >

        <DataTable

            columns={columns}

            data={data}

            loading={loading}

            emptyTitle="No Records Found"

            emptyDescription="There are no New Store Openings available."

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

    <AddNewStoreOpeningModal
        isOpen={showModal}
        editData={editData}
        onClose={() => {

            setShowModal(false);

            setEditData(null);

        }}
        onSuccess={handleSuccess}
    />

    {/* ======================================================
        BULK UPLOAD MODAL
    ====================================================== */}

    <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload New Store Openings"
        uploadFunction={handleBulkUpload}
        onSuccess={fetchNewStoreOpenings}
        acceptedFile=".csv,.xlsx,.xls"
        sampleFile="/api/new-store-openings/sample"
    />

    {/* ======================================================
        DELETE CONFIRMATION
    ====================================================== */}

    <ConfirmDialog
        open={showDeleteDialog}
        title="Delete New Store Opening"
        message="Are you sure you want to delete this New Store Opening?"
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
        title="Delete All New Store Openings"
        message="Are you sure you want to delete ALL New Store Openings? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllDialog(false)}
    />

</div>

);

}

export default NewStoreOpenings;
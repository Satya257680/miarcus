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

    const confirmDeleteAll = async () => {

        try {

            await deleteAllRules();

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

const handleExport = async () => {

    try {

        const response = await exportRules();

        const blob = new Blob(
            [response.data],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.setAttribute(
            "download",
            "NSO_Rules.csv"
        );

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(url);

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
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        {
            key: "id",
            title: "ID",
            width: "90px",
        },

        {
            key: "trigger_column",
            title: "Trigger Column",
            width: "350px",
            render: (row) => (
                <div className="wrap-text">
                    {row.trigger_column || "-"}
                </div>
            ),
        },

       {
    key: "departments",
    title: "Departments",
    width: "300px",
    render: (row) => (
        <div className="wrap-text">
            {row.departments || "-"}
        </div>
    ),
},

    

        {
            key: "actions",
            title: "Actions",
            width: "220px",
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

        <div className="nso-rules-page">

            {/* ======================================================
                PAGE HEADER
            ====================================================== */}

            <PageHeader
                title="NSO Rules"
                subtitle="Manage NSO Rules."
            />

            {/* ======================================================
                PAGE TOOLBAR
            ====================================================== */}

            <PageToolbar

                search={search}

                setSearch={setSearch}

                placeholder="Search NSO Rules..."

                showAdd={canAdd}

                addText="Add NSO Rule"

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
<Card title="NSO Rule List">

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

                isOpen={showBulkModal}

                onClose={() => setShowBulkModal(false)}

                title="Bulk Upload NSO Rules"

                uploadFunction={handleBulkUpload}

                onSuccess={fetchRules}

                acceptedFile=".csv,.xlsx,.xls"

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

                title="Delete All NSO Rules"

                message="Are you sure you want to delete all NSO Rules? This action cannot be undone."

                confirmText="Delete All"

                cancelText="Cancel"

                confirmVariant="danger"

                onConfirm={confirmDeleteAll}

                onCancel={() => setShowDeleteAllDialog(false)}

            />

        </div>

    );

}

export default NSORules;
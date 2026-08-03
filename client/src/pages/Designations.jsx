import { useEffect, useState } from "react";

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import FilterBar from "../components/common/FilterBar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import ActionButtons from "../components/common/ActionButtons";
import Pagination from "../components/common/Pagination";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BulkUploadModal from "../components/common/BulkUploadModal";

import "../styles/Designation.css";

import DesignationModal from "../components/designations/DesignationModal";

import {

  getDesignations,

  getDesignationById,

  createDesignation,

  updateDesignation,

  deleteDesignation,

  exportDesignations,

  deleteAllDesignations,

  bulkUploadDesignations,

} from "../services/designationService";

import {

  getDepartments

} from "../services/departmentService";

function Designations() {

  // =====================================================
  // STATES
  // =====================================================

  const [

    designations,

    setDesignations

  ] = useState([]);

  const [

    filteredDesignations,

    setFilteredDesignations

  ] = useState([]);

  const [

    departments,

    setDepartments

  ] = useState([]);

  const [

    loading,

    setLoading

  ] = useState(true);

  const [

    search,

    setSearch

  ] = useState("");

  const [

    showModal,

    setShowModal

  ] = useState(false);

  const [

    editDesignation,

    setEditDesignation

  ] = useState(null);

  const [

    showBulkModal,

    setShowBulkModal

  ] = useState(false);

  const [

    showDeleteDialog,

    setShowDeleteDialog

  ] = useState(false);

  const [

    showDeleteAllDialog,

    setShowDeleteAllDialog

  ] = useState(false);

  const [

    deleteId,

    setDeleteId

  ] = useState(null);

  // =====================================================
  // PAGINATION
  // =====================================================

  const [

    currentPage,

    setCurrentPage

  ] = useState(1);

  const [

    pageSize,

    setPageSize

  ] = useState(10);

  // =====================================================
  // RBAC
  // =====================================================

  const user = JSON.parse(

    localStorage.getItem("user") || "{}"

  );

  const permissions = JSON.parse(

    localStorage.getItem("permissions") || "{}"

  );

  const isAdmin =

    user.administrator === true ||

    user.administrator === 1;

  const designationPermission =

    isAdmin

      ? "Full"

      : permissions["Designations"] || "None";

  const canView =

    [

      "View",

      "Add",

      "Edit",

      "Full"

    ].includes(

      designationPermission

    );

  const canAdd =

    [

      "Add",

      "Edit",

      "Full"

    ].includes(

      designationPermission

    );

  const canEdit =

    [

      "Edit",

      "Full"

    ].includes(

      designationPermission

    );

  const canDelete =

    designationPermission === "Full";

  // =====================================================
  // LOAD DESIGNATIONS
  // =====================================================

  const fetchDesignations = async () => {

    try {

      setLoading(true);

      const res = await getDesignations();

      if (res.success) {

        setDesignations(res.data);

        setFilteredDesignations(res.data);

      }

      else {

        setDesignations([]);

        setFilteredDesignations([]);

      }

    }

    catch (err) {

      console.error(err);

      alert(

        err.response?.data?.message ||

        "Unable to load Designations."

      );

    }

    finally {

      setLoading(false);

    }

  };

  // =====================================================
  // LOAD DEPARTMENTS
  // =====================================================

  const fetchDepartments = async () => {

    try {

      const res = await getDepartments();

      if (res.success) {

        setDepartments(res.data);

      }

    }

    catch (err) {

      console.error(err);

    }

  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    if (!canView) {

      setLoading(false);

      return;

    }

    fetchDesignations();

    fetchDepartments();

  }, [canView]);
    // =====================================================
  // SEARCH
  // =====================================================

  useEffect(() => {

    const keyword = search.toLowerCase();

    const filtered = designations.filter((item) => {

      const designation =
        item.designation_name?.toLowerCase() || "";

      const department =
        item.department_name?.toLowerCase() || "";

      const description =
        item.description?.toLowerCase() || "";

      return (

        designation.includes(keyword) ||

        department.includes(keyword) ||

        description.includes(keyword)

      );

    });

    setFilteredDesignations(filtered);

    setCurrentPage(1);

  }, [search, designations]);

  // =====================================================
  // ADD DESIGNATION
  // =====================================================

  const handleAdd = () => {

    if (!canAdd) return;

    setEditDesignation(null);

    setShowModal(true);

  };

  // =====================================================
  // EDIT DESIGNATION
  // =====================================================

  const handleEdit = async (designation) => {

    if (!canEdit) return;

    try {

      const res = await getDesignationById(

        designation.id

      );

      if (res.success) {

        setEditDesignation(

          res.data

        );

        setShowModal(true);

      }

    } catch (err) {

      console.error(err);

      alert("Unable to load designation.");

    }

  };

  // =====================================================
  // DELETE DESIGNATION
  // =====================================================

  const handleDelete = (id) => {

    if (!canDelete) return;

    setDeleteId(id);

    setShowDeleteDialog(true);

  };

  const confirmDelete = async () => {

    try {

      const res = await deleteDesignation(

        deleteId

      );

      if (res.success) {

        fetchDesignations();

      } else {

        alert(res.message);

      }

    } catch (err) {

      alert(

        err.response?.data?.message ||

        err.message

      );

    } finally {

      setDeleteId(null);

      setShowDeleteDialog(false);

    }

  };

  // =====================================================
  // SAVE DESIGNATION
  // =====================================================

  const handleSave = async (data) => {

    try {

      let res;

      if (editDesignation) {

        if (!canEdit) return;

        res = await updateDesignation(

          editDesignation.id,

          data

        );

      } else {

        if (!canAdd) return;

        res = await createDesignation(

          data

        );

      }

      if (res.success) {

        setShowModal(false);

        setEditDesignation(null);

        fetchDesignations();

      } else {

        alert(res.message);

      }

    } catch (err) {

      alert(

        err.response?.data?.message ||

        err.message

      );

    }

  };

  // =====================================================
  // EXPORT
  // =====================================================

  const handleExport = async () => {

    try {

      const res = await exportDesignations();

      if (!res.success) {

        alert("No data found.");

        return;

      }

      const rows = res.data;

      if (!rows.length) {

        alert("No designations available.");

        return;

      }

      const headers = Object.keys(rows[0]);

      let csv = headers.join(",") + "\n";

      rows.forEach((row) => {

        csv += headers

          .map(

            (header) => `"${row[header] ?? ""}"`

          )

          .join(",");

        csv += "\n";

      });

      const blob = new Blob(

        [csv],

        {

          type: "text/csv;charset=utf-8;"

        }

      );

      const url =

        window.URL.createObjectURL(blob);

      const link =

        document.createElement("a");

      link.href = url;

      link.download = "Designations.csv";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

    } catch (err) {

      console.error(err);

      alert("Failed to export designations.");

    }

  };

  // =====================================================
  // BULK UPLOAD
  // =====================================================

  const handleBulkUpload = async (formData) => {

    try {

      const res = await bulkUploadDesignations(

        formData

      );

      if (res.success) {

        alert(res.message);

        fetchDesignations();

        return res;

      }

      alert(res.message);

      return res;

    } catch (err) {

      console.error(err);

      alert(

        err.response?.data?.message ||

        err.message ||

        "Bulk upload failed."

      );

      throw err;

    }

  };

  // =====================================================
  // DELETE ALL
  // =====================================================

  const handleDeleteAll = () => {

    if (!canDelete) return;

    setShowDeleteAllDialog(true);

  };

  const confirmDeleteAll = async () => {

    try {

      const res = await deleteAllDesignations();

      if (res.success) {

        fetchDesignations();

        alert(

          "All designations deleted successfully."

        );

      } else {

        alert(res.message);

      }

    } catch (err) {

      alert(

        err.response?.data?.message ||

        err.message ||

        "Failed to delete all designations."

      );

    } finally {

      setShowDeleteAllDialog(false);

    }

  };

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const handleClearFilters = () => {

    setSearch("");

  };

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalRecords =

    filteredDesignations.length;

  const totalPages = Math.ceil(

    totalRecords / pageSize

  );

  const paginatedDesignations =

    filteredDesignations.slice(

      (currentPage - 1) * pageSize,

      currentPage * pageSize

    );
     // =====================================================
// TABLE COLUMNS
// =====================================================

const columns = [

  {
    key: "id",
    title: "ID",
    width: "70px",
    render: (row) => row.id
  },

  {
    key: "department_name",
    title: "Department",
    render: (row) => row.department_name || "-"
  },

  {
    key: "designation_name",
    title: "Designation",
    render: (row) => row.designation_name || "-"
  },

  {
    key: "description",
    title: "Description",
    render: (row) => row.description || "-"
  },

  {
    key: "status",
    title: "Status",
    align: "center",
    render: (row) => (
      <StatusBadge
        status={row.status}
      />
    )
  },

  {
    key: "assigned_users",
    title: "Assigned Users",
    align: "center",
    render: (row) => row.assigned_users ?? 0
  },

  {
    key: "actions",
    title: "Actions",
    align: "center",
    render: (row) => (
      <ActionButtons
        showEdit={canEdit}
        showDelete={canDelete}
        onEdit={() => handleEdit(row)}
        onDelete={() => handleDelete(row.id)}
      />
    )
  }

];
  // =====================================================
  // JSX
  // =====================================================

  return (

    <div className="designation-page">

      {/* ==========================================
          PAGE HEADER
      ========================================== */}

      <PageHeader

        title="Designations"

        subtitle="Manage all designations"

      />

      {/* ==========================================
          PAGE TOOLBAR
      ========================================== */}

    <PageToolbar

  search={search}
  setSearch={setSearch}
  searchPlaceholder="Search Designation..."

  showAdd={canAdd}

  addLabel="Add Designation"

  onAdd={handleAdd}

  showExport={canView}

  onExport={handleExport}

  showBulkUpload={canAdd}

  onBulkUpload={() =>
    setShowBulkModal(true)
  }

  showDeleteAll={canDelete}

  onDeleteAll={handleDeleteAll}

/>
      {/* ==========================================
          FILTER BAR
      ========================================== */}

      <FilterBar

        search={search}

        onSearch={setSearch}

        searchPlaceholder="Search Designation..."

        onClear={handleClearFilters}

      />

      {/* ==========================================
          CARD
      ========================================== */}
<Card title="Designation List">
              {/* ==========================================
            DATA TABLE
        ========================================== */}

        <DataTable

          columns={columns}

          data={paginatedDesignations}

          loading={loading}

          emptyMessage="No Designations Found"

        />

        {/* ==========================================
            PAGINATION
        ========================================== */}

        {!loading &&

          totalRecords > 0 && (

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

          )}

      </Card>

      {/* ==========================================
          DESIGNATION MODAL
      ========================================== */}

      <DesignationModal

        isOpen={showModal}

        onClose={() => {

          setShowModal(false);

          setEditDesignation(null);

        }}

        onSave={handleSave}

        designation={editDesignation}

        departments={departments}

      />
            {/* ==========================================
          BULK UPLOAD MODAL
      ========================================== */}

      <BulkUploadModal

        isOpen={showBulkModal}

        onClose={() =>

          setShowBulkModal(false)

        }

        onSuccess={() => {

          fetchDesignations();

          setShowBulkModal(false);

        }}

        uploadFunction={handleBulkUpload}

        title="Bulk Upload Designations"

        acceptedFile=".xlsx,.xls,.csv"

        sampleFile="/samples/designation_sample.xlsx"

      />

      {/* ==========================================
          DELETE CONFIRM DIALOG
      ========================================== */}

      <ConfirmDialog

        isOpen={showDeleteDialog}

        title="Delete Designation"

        message="Are you sure you want to delete this designation?"

        confirmText="Delete"

        cancelText="Cancel"

        confirmType="danger"

        onConfirm={confirmDelete}

        onCancel={() => {

          setDeleteId(null);

          setShowDeleteDialog(false);

        }}

      />

      {/* ==========================================
          DELETE ALL CONFIRM DIALOG
      ========================================== */}

      <ConfirmDialog

        isOpen={showDeleteAllDialog}

        title="Delete All Designations"

        message="This will permanently delete every designation. This action cannot be undone."

        confirmText="Delete All"

        cancelText="Cancel"

        confirmType="danger"

        onConfirm={confirmDeleteAll}

        onCancel={() =>

          setShowDeleteAllDialog(false)

        }

      />

    </div>

  );

}

export default Designations;
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

import "../styles/Departments.css";
import DepartmentModal from "../components/departments/DepartmentModal";
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  exportDepartments,
  deleteAllDepartments,
  bulkUploadDepartments,
} from "../services/departmentService";

function Departments() {

  // =====================================================
  // STATES
  // =====================================================

  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editDepartment, setEditDepartment] = useState(null);

  const [showBulkModal, setShowBulkModal] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const [deleteId, setDeleteId] = useState(null);

  // Pagination

  const [currentPage, setCurrentPage] = useState(1);

  

  const [pageSize, setPageSize] = useState(10);

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

  const departmentPermission = isAdmin
    ? "Full"
    : permissions["Departments"] || "None";

  const canView = [
    "View",
    "Add",
    "Edit",
    "Full",
  ].includes(departmentPermission);

  const canAdd = [
    "Add",
    "Edit",
    "Full",
  ].includes(departmentPermission);

  const canEdit = [
    "Edit",
    "Full",
  ].includes(departmentPermission);

  const canDelete =
    departmentPermission === "Full";

  // =====================================================
  // LOAD DEPARTMENTS
  // =====================================================

  const fetchDepartments = async () => {

    try {

      setLoading(true);

      const res = await getDepartments();

      if (res.success) {

        setDepartments(res.data);

        setFilteredDepartments(res.data);

      } else {

        setDepartments([]);

        setFilteredDepartments([]);

      }

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "Unable to load departments."
      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    if (!canView) {

      setLoading(false);

      return;

    }

    fetchDepartments();

  }, [canView]);

  // =====================================================
  // SEARCH
  // =====================================================

  useEffect(() => {

    const keyword = search.toLowerCase();

    const filtered = departments.filter((item) => {

      const department =
        item.department_name?.toLowerCase() || "";

      const description =
        item.description?.toLowerCase() || "";

      return (

        department.includes(keyword) ||

        description.includes(keyword)

      );

    });

    setFilteredDepartments(filtered);

    setCurrentPage(1);

  }, [search, departments]);
  // =====================================================
// ADD DEPARTMENT
// =====================================================

const handleAdd = () => {

  if (!canAdd) return;

  setEditDepartment(null);

  setShowModal(true);

};

// =====================================================
// EDIT DEPARTMENT
// =====================================================

const handleEdit = async (department) => {

  if (!canEdit) return;

  try {

    const res = await getDepartmentById(department.id);

    if (res.success) {

      setEditDepartment(res.data);

      setShowModal(true);

    }

  } catch (err) {

    console.error(err);

    alert("Unable to load department.");

  }

};

// =====================================================
// DELETE DEPARTMENT
// =====================================================

const handleDelete = (id) => {

  if (!canDelete) return;

  setDeleteId(id);

  setShowDeleteDialog(true);

};

const confirmDelete = async () => {

  try {

    const res = await deleteDepartment(deleteId);

    if (res.success) {

      fetchDepartments();

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
// SAVE
// =====================================================

const handleSave = async (data) => {

  try {

    let res;

    if (editDepartment) {

      if (!canEdit) return;

      res = await updateDepartment(

        editDepartment.id,

        data

      );

    } else {

      if (!canAdd) return;

      res = await createDepartment(data);

    }

    if (res.success) {

      setShowModal(false);

      setEditDepartment(null);

      fetchDepartments();

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

    const res = await exportDepartments();

    if (!res.success) {

      alert("No data found.");

      return;

    }

    const rows = res.data;

    if (!rows.length) {

      alert("No departments available.");

      return;

    }

    const headers = Object.keys(rows[0]);

    let csv = headers.join(",") + "\n";

    rows.forEach((row) => {

      csv += headers
        .map((header) => `"${row[header] ?? ""}"`)
        .join(",");

      csv += "\n";

    });

    const blob = new Blob(

      [csv],

      {

        type: "text/csv;charset=utf-8;"

      }

    );

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "Departments.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

  } catch (err) {

    console.error(err);

    alert("Failed to export departments.");

  }

};
// =====================================================
// BULK UPLOAD
// =====================================================

const handleBulkUpload = async (formData) => {

  try {

    const res = await bulkUploadDepartments(formData);

    if (res.success) {

      alert(res.message);

      fetchDepartments();

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

    const res = await deleteAllDepartments();

    if (res.success) {

      fetchDepartments();

      alert("All departments deleted successfully.");

    } else {

      alert(res.message);

    }

  } catch (err) {

    alert(

      err.response?.data?.message ||

      err.message ||

      "Failed to delete all departments."

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

const totalRecords = filteredDepartments.length;

const totalPages = Math.ceil(

  totalRecords / pageSize

);

const paginatedDepartments =

filteredDepartments.slice(

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

},

{

key: "department_name",

title: "Department",

},

{

key: "description",

title: "Description",

render: (row) =>

row.description || "-",

},

{

key: "status",

title: "Status",

render: (row) => (

<StatusBadge

status={row.status}

/>

),

},

{

key: "actions",

title: "Actions",

render: (row) => (

<ActionButtons

showEdit={canEdit}

onEdit={() =>

handleEdit(row)

}

showDelete={canDelete}

onDelete={() =>

handleDelete(row.id)

}

/>

),

},

];return (

  <div className="departments-page">

    {/* =====================================================
        PAGE HEADER
    ===================================================== */}

    <PageHeader
      title="Departments"
      subtitle="Manage department information."
    />

    {/* =====================================================
        PAGE TOOLBAR
    ===================================================== */}

    <PageToolbar
      search={search}
      setSearch={setSearch}
      placeholder="Search Department..."
      showAdd={canAdd}
      addText="Add Department"
      onAdd={handleAdd}
      showExport
      onExport={handleExport}
      showBulk
      onBulk={() => setShowBulkModal(true)}
      showDeleteAll={canDelete}
      onDeleteAll={handleDeleteAll}
    />

    {/* =====================================================
        FILTER BAR
    ===================================================== */}

    <FilterBar
      onClear={handleClearFilters}
    >
      {/* Future filters can be added here */}
    </FilterBar>

    {/* =====================================================
        CARD
    ===================================================== */}

    <Card
      title="Department List"
    >

      <DataTable
        columns={columns}
        data={paginatedDepartments}
        loading={loading}
        emptyTitle="No Departments Found"
        emptyDescription="There are no departments available."
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

    {/* =====================================================
        DEPARTMENT MODAL
    ===================================================== */}

    <DepartmentModal
      isOpen={showModal}
      onClose={() => {
        setShowModal(false);
        setEditDepartment(null);
      }}
      onSave={handleSave}
      department={editDepartment}
    />

    {/* =====================================================
        BULK UPLOAD MODAL
    ===================================================== */}

<BulkUploadModal
    isOpen={showBulkModal}
    onClose={() => setShowBulkModal(false)}
    title="Bulk Upload Departments"
    uploadFunction={handleBulkUpload}
    onSuccess={fetchDepartments}
    acceptedFile=".csv,.xlsx,.xls"
    sampleFile="/api/departments/sample"
/>
    {/* =====================================================
        DELETE CONFIRMATION
    ===================================================== */}

    <ConfirmDialog
      open={showDeleteDialog}
      title="Delete Department"
      message="Are you sure you want to delete this department?"
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
  title="Delete All Departments"
  message="Are you sure you want to delete ALL departments? This action cannot be undone."
  confirmText="Delete All"
  cancelText="Cancel"
  confirmVariant="danger"
  onConfirm={confirmDeleteAll}
  onCancel={() => setShowDeleteAllDialog(false)}
/>

  </div>


);

}

export default Departments;
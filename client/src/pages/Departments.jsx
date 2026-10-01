import { useEffect, useState } from "react";
import { collectIds, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";

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
import "../styles/premium/PagePremium.css";
import "../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import { FaBuilding, FaCheckCircle, FaPauseCircle, FaAlignLeft } from "react-icons/fa";
import { initials, avatarTone, formatCount } from "../utils/premiumFormat";
import DepartmentModal from "../components/Departments/DepartmentModal";
import { exportTableData } from "../utils/exportUtils.js";
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

  const [statusFilter, setStatusFilter] = useState("");

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

      if (statusFilter && String(item.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;

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

  }, [search, statusFilter, departments]);
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
const handleExport = async (format = "csv") => {

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

    await exportTableData({
      headers,
      rows: rows.map((row) => headers.map((header) => row[header] ?? "")),
      filename: "Departments",
      format,
      title: "Departments",
    });

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

const isFilteredDelete = hasActiveFilters({ search, statusFilter });

const confirmDeleteAll = async () => {

  try {

    const ids = collectIds(filteredDepartments);

    if (isFilteredDelete && !ids.length) {
      alert("No departments match the current search.");
      return;
    }

    const res = await deleteAllDepartments(isFilteredDelete ? ids : undefined);

    if (res.success) {

      fetchDepartments();

      alert(res.message || "All departments deleted successfully.");

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

  setStatusFilter("");

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
        width: "90px",
        minWidth: "90px",
        render: (row) => <span className="pp-id">#{row.id}</span>,
    },

    {
        key: "department_name",
        title: "Department",
        minWidth: "220px",
        render: (row) => (
            <div className="pp-cell-main">
                <span className={`pp-avatar ${avatarTone(row.department_name)}`}>
                    {initials(row.department_name)}
                </span>
                <span className="pp-cell-text">
                    <span className="pp-cell-title">{row.department_name || "-"}</span>
                    <span className="pp-cell-sub">Department #{row.id}</span>
                </span>
            </div>
        ),
    },

    {
        key: "description",
        title: "Description",
        minWidth: "320px",
        render: (row) => <span className="pp-wrap pp-muted-text">{row.description || "—"}</span>,
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
        width: "220px",
        minWidth: "220px",
        align: "center",

        render: (row) => (

            <ActionButtons
                showEdit={canEdit}
                onEdit={() => handleEdit(row)}
                showDelete={canDelete}
                onDelete={() => handleDelete(row.id)}
            />

        ),
    },


];

return (

  <div className="departments-page pp-premium">

    {/* =====================================================
        PREMIUM HERO + KPIs
    ===================================================== */}

    <PremiumHero
      icon={FaBuilding}
      eyebrow="Settings · Organisation"
      title="Departments"
      badge="Admin only"
      subtitle="The teams that make up the business — used for designations, checklists, access and reporting."
      meta={[
        { label: "Departments", value: formatCount(departments.length) },
        { label: "Showing", value: filteredDepartments.length !== departments.length ? `${formatCount(filteredDepartments.length)} filtered` : null }
      ]}
    />

    <InsightStrip
      loading={loading}
      items={[
        { key: "all", label: "Departments", value: formatCount(departments.length), hint: "Teams configured", tone: "violet", icon: FaBuilding },
        { key: "active", label: "Active", value: formatCount(departments.filter((d) => String(d.status || "").toLowerCase() === "active").length), hint: "In use", tone: "green", icon: FaCheckCircle, onClick: () => setStatusFilter(statusFilter === "Active" ? "" : "Active"), active: statusFilter === "Active" },
        { key: "inactive", label: "Inactive", value: formatCount(departments.filter((d) => String(d.status || "").toLowerCase() !== "active").length), hint: "Paused teams", tone: "red", icon: FaPauseCircle, onClick: () => setStatusFilter(statusFilter === "Inactive" ? "" : "Inactive"), active: statusFilter === "Inactive" },
        { key: "described", label: "Documented", value: formatCount(departments.filter((d) => String(d.description || "").trim()).length), hint: "Have a description", tone: "blue", icon: FaAlignLeft }
      ]}
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
      deleteAllText={deleteAllLabel(isFilteredDelete, filteredDepartments.length)}
      onDeleteAll={handleDeleteAll}
    />

    {/* =====================================================
        FILTER BAR
    ===================================================== */}

    <FilterBar
      onClear={handleClearFilters}
    >
      <div className="filter-group">
        <label>Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    </FilterBar>

    {/* =====================================================
        CARD
    ===================================================== */}

    <Card
      title="Department List"
      subtitle={`${formatCount(filteredDepartments.length)} departments`}
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
    moduleKey="departments"
    uploadUrl={"/api/departments/bulk-upload"}
    isOpen={showBulkModal}
    onClose={() => setShowBulkModal(false)}
    title="Bulk Upload Departments"
    uploadFunction={handleBulkUpload}
    onSuccess={fetchDepartments}
    // Matches the app-wide server-side ceiling (server/middleware/
    // fileSecurity.js). Note: this page hasn't been wired up for the
    // chunked upload flow (see enableChunkedUpload on
    // pages/ChecklistReports.jsx / pages/ActionPoints.jsx), so a
    // single request here is still limited in practice to whatever
    // fits under IIS's own ~4 GB per-request ceiling (server/web.config).
    maxFileSize={100 * 1024 * 1024 * 1024}
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
  title={isFilteredDelete ? "Delete Filtered Departments" : "Delete All Departments"}
  message={`${deleteAllMessage(isFilteredDelete, filteredDepartments.length, "departments")} This action cannot be undone.`}
  confirmText={isFilteredDelete ? "Delete Filtered" : "Delete All"}
  cancelText="Cancel"
  confirmVariant="danger"
  onConfirm={confirmDeleteAll}
  onCancel={() => setShowDeleteAllDialog(false)}
/>

  </div>


);

}

export default Departments;
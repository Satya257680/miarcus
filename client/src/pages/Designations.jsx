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

import "../styles/Designation.css";
import "../styles/premium/PagePremium.css";
import "../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import { FaIdBadge, FaCheckCircle, FaUsers, FaBuilding } from "react-icons/fa";
import { formatCount } from "../utils/premiumFormat";
import { exportTableData } from "../utils/exportUtils.js";

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

  const [departmentFilter, setDepartmentFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

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

      if (departmentFilter && item.department_name !== departmentFilter) return false;

      if (statusFilter && String(item.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;

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

  }, [search, departmentFilter, statusFilter, designations]);

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

  const handleExport = async (format = "csv") => {

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

      await exportTableData({
        headers,
        rows: rows.map((row) => headers.map((header) => row[header] ?? "")),
        filename: "Designations",
        format,
        title: "Designations",
      });

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

  const isFilteredDelete = hasActiveFilters({ search, departmentFilter, statusFilter });

  const confirmDeleteAll = async () => {

    try {

      const ids = collectIds(filteredDesignations);

      if (isFilteredDelete && !ids.length) {
        alert("No designations match the current search.");
        return;
      }

      const res = await deleteAllDesignations(isFilteredDelete ? ids : undefined);

      if (res.success) {

        fetchDesignations();

        alert(

          res.message || "All designations deleted successfully."

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

    setDepartmentFilter("");

    setStatusFilter("");

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
    width: "80px",
    render: (row) => <span className="pp-id">#{row.id}</span>
  },

  {
    key: "department_name",
    title: "Department",
    render: (row) =>
      row.department_name
        ? <span className="pp-pill pp-pill--violet">{row.department_name}</span>
        : <span className="pp-dash">—</span>
  },

  {
    key: "designation_name",
    title: "Designation",
    render: (row) => (
      <div className="pp-cell-main">
        <span className="pp-avatar pp-avatar--blue"><FaIdBadge /></span>
        <span className="pp-cell-text">
          <span className="pp-cell-title">{row.designation_name || "-"}</span>
          <span className="pp-cell-sub">{row.department_name || "No department"}</span>
        </span>
      </div>
    )
  },

  {
    key: "description",
    title: "Description",
    render: (row) => <span className="pp-wrap pp-muted-text">{row.description || "—"}</span>
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
    render: (row) => (
      <span className={`pp-count ${Number(row.assigned_users) > 0 ? "pp-count--on" : ""}`}>
        <FaUsers /> {formatCount(row.assigned_users ?? 0)}
      </span>
    )
  },

 {
    key: "actions",
    title: "Actions",
    align: "center",
    width: "220px",
    render: (row) => (
        <div
            style={{
                width: "220px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }}
        >
            <ActionButtons
                showEdit={canEdit}
                showDelete={canDelete}
                onEdit={() => handleEdit(row)}
                onDelete={() => handleDelete(row.id)}
            />
        </div>
    )
}
];
  // =====================================================
  // JSX
  // =====================================================

  return (

    <div className="designation-page pp-premium">

      {/* ==========================================
          PREMIUM HERO + KPIs
      ========================================== */}

      <PremiumHero
        icon={FaIdBadge}
        eyebrow="Settings · Organisation"
        title="Designations"
        badge="Admin only"
        subtitle="Job titles inside each department and how many people currently hold them."
        meta={[
          { label: "Designations", value: formatCount(designations.length) },
          { label: "Showing", value: filteredDesignations.length !== designations.length ? `${formatCount(filteredDesignations.length)} filtered` : null }
        ]}
      />

      <InsightStrip
        loading={loading}
        items={[
          { key: "all", label: "Designations", value: formatCount(designations.length), hint: "Titles configured", tone: "violet", icon: FaIdBadge },
          { key: "active", label: "Active", value: formatCount(designations.filter((d) => String(d.status || "").toLowerCase() === "active").length), hint: "Available to assign", tone: "green", icon: FaCheckCircle, onClick: () => setStatusFilter(statusFilter === "Active" ? "" : "Active"), active: statusFilter === "Active" },
          { key: "assigned", label: "Assigned users", value: formatCount(designations.reduce((sum, d) => sum + Number(d.assigned_users || 0), 0)), hint: "People with a title", tone: "blue", icon: FaUsers },
          { key: "depts", label: "Departments", value: formatCount(new Set(designations.map((d) => d.department_name).filter(Boolean)).size), hint: "Using designations", tone: "amber", icon: FaBuilding }
        ]}
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

  deleteAllText={deleteAllLabel(isFilteredDelete, filteredDesignations.length)}

  onDeleteAll={handleDeleteAll}

/>
      {/* ==========================================
          FILTER BAR
      ========================================== */}

      <FilterBar

        onClear={handleClearFilters}

      >

        <div className="filter-group">

          <label>Department</label>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {[...new Set([
              ...departments.map((d) => d.department_name),
              ...designations.map((d) => d.department_name)
            ].filter(Boolean))].sort().map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

        </div>

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

      {/* ==========================================
          CARD
      ========================================== */}
<Card title="Designation List" subtitle={`${formatCount(filteredDesignations.length)} designations`}>
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
    moduleKey="designations"
    uploadUrl={"/api/designations/bulk-upload"}

        isOpen={showBulkModal}

        onClose={() =>

          setShowBulkModal(false)

        }

        onSuccess={() => {

          fetchDesignations();

          setShowBulkModal(false);

        }}

        uploadFunction={handleBulkUpload}

        title="Bulk Upload Designations"sampleFile="/samples/designation_sample.xlsx"

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

        title={isFilteredDelete ? "Delete Filtered Designations" : "Delete All Designations"}

        message={`${deleteAllMessage(isFilteredDelete, filteredDesignations.length, "designations")} This action cannot be undone.`}

        confirmText={isFilteredDelete ? "Delete Filtered" : "Delete All"}

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
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AddUserModal from "../components/AddUserModal";

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

import { FaInfoCircle } from "react-icons/fa";

import "../styles/Users.css";

const API = "https://miarcus-backend.onrender.com/api";

function Users() {
  // =====================================================
  // STATES
  // =====================================================

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [reportsTo, setReportsTo] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [reportsFilter, setReportsFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedUsers, setSelectedUsers] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [showBulkModal, setShowBulkModal] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // =====================================================
  // RBAC - SAME PATTERN AS DEPARTMENTS
  // =====================================================

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = JSON.parse(
    localStorage.getItem("permissions") || "{}"
  );

  const isAdmin =
    user.administrator === true || user.administrator === 1;

  const userPermission = isAdmin
    ? "Full"
    : permissions["Users"] || "None";

  const canView = ["View", "Add", "Edit", "Full"].includes(
    userPermission
  );

  const canAdd = ["Add", "Edit", "Full"].includes(
    userPermission
  );

  const canEdit = ["Edit", "Full"].includes(
    userPermission
  );

  const canDelete = userPermission === "Full";

  // =====================================================
  // LOAD DATA
  // =====================================================

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/users`);
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error(err);
      setUsers([]);

      alert(
        err.response?.data?.message ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API}/departments`);
      setDepartments(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setDepartments([]);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await axios.get(`${API}/reports`);
      setReportsTo(res.data?.reports || []);
    } catch (err) {
      console.error(err);
      setReportsTo([]);
    }
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    fetchUsers();
    fetchManagers();
    fetchDepartments();
  }, [canView]);

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((userItem) => {
      const matchesSearch =
        !keyword ||
        userItem.name?.toLowerCase().includes(keyword) ||
        userItem.email?.toLowerCase().includes(keyword) ||
        String(userItem.employee_id || "")
          .toLowerCase()
          .includes(keyword);

      const matchesDepartment =
        !departmentFilter ||
        departmentFilter === "All Departments" ||
        userItem.department === departmentFilter;

      const matchesReports =
        !reportsFilter ||
        reportsFilter === "All Reports" ||
        userItem.reports_to === reportsFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesReports
      );
    });
  }, [
    users,
    search,
    departmentFilter,
    reportsFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, reportsFilter]);

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalRecords = filteredUsers.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / pageSize)
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // =====================================================
  // SELECTION
  // =====================================================

  const allCurrentPageSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((item) =>
      selectedUsers.includes(item.id)
    );

  const toggleUser = (id) => {
    setSelectedUsers((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const toggleCurrentPage = () => {
    const pageIds = paginatedUsers.map((item) => item.id);

    if (allCurrentPageSelected) {
      setSelectedUsers((previous) =>
        previous.filter((id) => !pageIds.includes(id))
      );
    } else {
      setSelectedUsers((previous) => [
        ...new Set([...previous, ...pageIds]),
      ]);
    }
  };

  // =====================================================
  // ADD / EDIT
  // =====================================================

  const handleAdd = () => {
    if (!canAdd) return;

    setEditingUser(null);
    setShowAddModal(true);
  };

  const handleEdit = (userItem) => {
    if (!canEdit) return;

    setEditingUser(userItem);
    setShowAddModal(true);
  };

  const closeUserModal = () => {
    setShowAddModal(false);
    setEditingUser(null);
  };

  // =====================================================
  // EXPORT
  // =====================================================

  const handleExport = () => {
    if (!users.length) {
      alert("No users available.");
      return;
    }

    const headers = [
      "Employee ID",
      "Name",
      "Email",
      "Department",
      "Designation",
      "Reports To",
      "Status",
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const rows = users.map((item) =>
      [
        item.employee_id,
        item.name,
        item.email,
        item.department,
        item.designation,
        item.reports_to,
        item.status,
      ]
        .map(escapeCSV)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "Users.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  // =====================================================
  // BULK UPLOAD
  // =====================================================

  const handleBulkUpload = async (formData) => {
    try {
      const res = await axios.post(
        `${API}/users/bulk-upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data?.success === false) {
        throw new Error(
          res.data?.message || "Bulk upload failed."
        );
      }

      return {
        success: true,
        message:
          res.data?.message ||
          "Users uploaded successfully.",
        ...res.data,
      };
    } catch (err) {
      console.error("Bulk user upload failed:", err);

      throw new Error(
        err.response?.data?.message ||
          err.message ||
          "Bulk upload failed."
      );
    }
  };

  // =====================================================
  // DISABLE USER
  // =====================================================

  const disableUser = async (id) => {
    if (!canDelete) return;

    try {
      const res = await axios.put(
        `${API}/users/disable/${id}`
      );

      alert(
        res.data?.message ||
          "User status updated successfully."
      );

      await fetchUsers();
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
          "Disable failed."
      );
    }
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const handleDelete = (id) => {
    if (!canDelete) return;

    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await axios.delete(
        `${API}/users/${deleteId}`
      );

      if (res.data?.success === false) {
        alert(res.data?.message || "Delete failed.");
        return;
      }

      await fetchUsers();
      setSelectedUsers((previous) =>
        previous.filter((id) => id !== deleteId)
      );
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
          "Delete failed."
      );
    } finally {
      setDeleteId(null);
      setShowDeleteDialog(false);
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
      await axios.delete(`${API}/users/delete-all`);

      alert("All users deleted successfully.");

      setSelectedUsers([]);
      await fetchUsers();
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
          "Failed to delete all users."
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
    setReportsFilter("");
    setSelectedUsers([]);
    setCurrentPage(1);
  };

  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  const columns = [
    {
      key: "select",
      title: (
        <input
          type="checkbox"
          checked={allCurrentPageSelected}
          onChange={toggleCurrentPage}
          disabled={!paginatedUsers.length}
          aria-label="Select all users on this page"
        />
      ),
      width: "48px",
      minWidth: "48px",
      align: "center",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedUsers.includes(row.id)}
          onChange={() => toggleUser(row.id)}
          aria-label={`Select ${row.name || "user"}`}
        />
      ),
    },
    {
      key: "name",
      title: "Name",
      render: (row) => (
        <span className="users-name">
          {row.name || "-"}
        </span>
      ),
    },
    {
      key: "employee_id",
      title: "Employee ID",
      render: (row) => row.employee_id || "-",
    },
    {
      key: "email",
      title: "Email",
      render: (row) => row.email || "-",
    },
    {
      key: "reports_to",
      title: "Reports To",
      render: (row) => row.reports_to || "-",
    },
    {
      key: "designation",
      title: "Designation",
      render: (row) => row.designation || "-",
    },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <StatusBadge status={row.status || "Inactive"} />
      ),
    },
    {
      key: "administrator",
      title: "Admin",
      render: (row) =>
        row.is_admin || row.administrator ? "Yes" : "No",
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
        >
          {canDelete && (
            <button
              type="button"
              className="users-disable-button"
              onClick={() => disableUser(row.id)}
            >
              Disable
            </button>
          )}
        </ActionButtons>
      ),
    },
  ];

  // =====================================================
  // ACCESS CONTROL
  // =====================================================

  if (!canView) {
    return (
      <div className="users-page">
        <PageHeader
          title="Users"
          subtitle="Manage user information."
        />

        <Card title="Users">
          <div className="users-no-access">
            You do not have permission to view Users.
          </div>
        </Card>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="users-page">
      <PageHeader
        title={
          <span className="users-page-title">
            Users <FaInfoCircle className="users-info-icon" />
          </span>
        }
        subtitle="Manage user information."
      />

      <PageToolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search by name, ID, email..."
        showAdd={canAdd}
        addText="Add User"
        onAdd={handleAdd}
        showExport={canView}
        onExport={handleExport}
        showBulk={canAdd}
        onBulk={() => setShowBulkModal(true)}
        showDeleteAll={canDelete}
        onDeleteAll={handleDeleteAll}
      />

      <FilterBar onClear={handleClearFilters}>
        <select
          className="users-filter-select"
          value={departmentFilter}
          onChange={(e) =>
            setDepartmentFilter(e.target.value)
          }
        >
          <option value="">All Departments</option>

          {departments.map((department) => (
            <option
              key={department.id}
              value={department.department_name}
            >
              {department.department_name}
            </option>
          ))}
        </select>

        <select
          className="users-filter-select"
          value={reportsFilter}
          onChange={(e) =>
            setReportsFilter(e.target.value)
          }
        >
          <option value="">All Reports</option>

          {reportsTo.map((manager) => (
            <option
              key={manager.id}
              value={manager.manager_name}
            >
              {manager.manager_name}
            </option>
          ))}
        </select>
      </FilterBar>

      <Card title="User List">
        <DataTable
          columns={columns}
          data={paginatedUsers}
          loading={loading}
          emptyTitle="No Users Found"
          emptyDescription="There are no users available."
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

      <AddUserModal
        onClose={closeUserModal}
        fetchUsers={fetchUsers}
        editingUser={editingUser}
        isOpen={showAddModal}
      />

      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Users"
        uploadFunction={handleBulkUpload}
        onSuccess={fetchUsers}
        acceptedFile=".csv,.xlsx,.xls"
        sampleFile="/api/users/sample"
      />

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete User"
        message="Are you sure you want to delete this user?"
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
        title="Delete All Users"
        message="Are you sure you want to delete ALL users? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllDialog(false)}
      />
    </div>
  );
}

export default Users;

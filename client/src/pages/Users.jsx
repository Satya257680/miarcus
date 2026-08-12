import { useEffect, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";

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

import AddUserModal from "../components/AddUserModal";

import "../styles/Users.css";

function Users() {
  // =====================================================
  // STATES
  // =====================================================

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [reportsTo, setReportsTo] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [reportsFilter, setReportsFilter] = useState("");

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // =====================================================
  // RBAC
  // =====================================================

  const permissions = JSON.parse(
    localStorage.getItem("permissions") || "{}"
  );

  const userPermission = permissions["Users"] || "None";

  const canView = [
    "View",
    "Add",
    "Edit",
    "Full",
  ].includes(userPermission);

  const canAdd = [
    "Add",
    "Edit",
    "Full",
  ].includes(userPermission);

  const canEdit = [
    "Edit",
    "Full",
  ].includes(userPermission);

  const canDelete = userPermission === "Full";

  // =====================================================
  // LOAD USERS
  // =====================================================

  const fetchUsers = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/users"
      );

      setUsers([...(res.data.users || [])]);
    } catch (err) {
      console.error(err);
    }
  };

  // =====================================================
  // LOAD REPORTS
  // =====================================================

  const fetchManagers = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/reports"
      );

      setReportsTo(res.data.reports || []);
    } catch (err) {
      console.error(err);
    }
  };

  // =====================================================
  // LOAD DEPARTMENTS
  // =====================================================

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/departments"
      );

      setDepartments(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!canView) return;

    fetchUsers();
    fetchManagers();
    fetchDepartments();
  }, [canView]);

  // =====================================================
  // EXPORT
  // =====================================================

  const exportCSV = () => {
    if (users.length === 0) {
      alert("No Users Found");
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

    const rows = users.map((user) => [
      user.employee_id || "",
      user.name || "",
      user.email || "",
      user.department || "",
      user.designation || "",
      user.reports_to || "",
      user.status || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(
      [csv],
      { type: "text/csv;charset=utf-8;" }
    );

    saveAs(blob, "Users.csv");
  };

  // =====================================================
  // BULK UPLOAD
  // =====================================================

  const handleBulkUpload = async (formData) => {
    try {
      const res = await axios.post(
        "https://miarcus-backend.onrender.com/api/users/bulk-upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return {
        success: res.data?.success !== false,
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
  // DELETE ALL
  // =====================================================

  const deleteAllUsers = async () => {
    try {
      await axios.delete(
        "https://miarcus-backend.onrender.com/api/users/delete-all"
      );

      alert("Users Deleted Successfully");

      fetchUsers();
      setShowDeleteModal(false);
    } catch (err) {
      console.error(err);
      alert("Delete Failed");
    }
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      const res = await axios.delete(
        `https://miarcus-backend.onrender.com/api/users/${id}`
      );

      alert(res.data.message);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Delete Failed");
    }
  };

  // =====================================================
  // DISABLE USER
  // =====================================================

  const disableUser = async (id) => {
    try {
      const res = await axios.put(
        `https://miarcus-backend.onrender.com/api/users/disable/${id}`
      );

      alert(res.data.message);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Disable Failed");
    }
  };

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      user.name?.toLowerCase().includes(keyword) ||
      user.email?.toLowerCase().includes(keyword) ||
      user.employee_id?.toLowerCase().includes(keyword);

    const matchesDepartment =
      departmentFilter === "" ||
      departmentFilter === "All Departments" ||
      user.department === departmentFilter;

    const matchesReports =
      reportsFilter === "" ||
      reportsFilter === "All Reports" ||
      user.reports_to === reportsFilter;

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesReports
    );
  });

  // =====================================================
  // PAGINATION
  // =====================================================

  const totalRecords = filteredUsers.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / usersPerPage)
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  // =====================================================
  // RESET PAGE WHEN FILTER CHANGES
  // =====================================================

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    departmentFilter,
    reportsFilter,
  ]);

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const handleClearFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setReportsFilter("");
  };

  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  const columns = [
    {
      key: "name",
      title: "Name",
      render: (row) => row.name || "-",
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
        <StatusBadge
          status={row.status || "Inactive"}
        />
      ),
    },
    {
      key: "is_admin",
      title: "Admin",
      render: (row) =>
        row.is_admin ? "Yes" : "No",
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
          onEdit={() => {
            setEditingUser(row);
            setShowAddModal(true);
          }}
          showDelete={canDelete}
          onDelete={() => deleteUser(row.id)}
        />
      ),
    },
  ];

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="users-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <PageHeader
        title="Users"
        subtitle="Manage user accounts and access."
      />

      {/* =====================================================
          PAGE TOOLBAR
          ADD USER IS FIRST
      ===================================================== */}

      <PageToolbar
        search={search}
        setSearch={setSearch}
        placeholder="Search Users..."
        showAdd={canAdd}
        addText="Add User"
        onAdd={() => {
          setEditingUser(null);
          setShowAddModal(true);
        }}
        showExport={canView}
        onExport={exportCSV}
        showBulk={canAdd}
        onBulk={() => setShowBulkModal(true)}
        showDeleteAll={canDelete}
        onDeleteAll={() => setShowDeleteModal(true)}
      />

      {/* =====================================================
          FILTER BAR
      ===================================================== */}

      <FilterBar onClear={handleClearFilters}>
        <select
          value={departmentFilter}
          onChange={(e) =>
            setDepartmentFilter(e.target.value)
          }
        >
          <option value="">
            All Departments
          </option>

          {departments.map((dept) => (
            <option
              key={dept.id}
              value={dept.department_name}
            >
              {dept.department_name}
            </option>
          ))}
        </select>

        <select
          value={reportsFilter}
          onChange={(e) =>
            setReportsFilter(e.target.value)
          }
        >
          <option value="">
            All Reports
          </option>

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

      {/* =====================================================
          USERS CARD
      ===================================================== */}

      <Card title="User List">
        <DataTable
          columns={columns}
          data={paginatedUsers}
          loading={false}
          emptyTitle="No Users Found"
          emptyDescription="There are no users available."
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={usersPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* =====================================================
          ADD / EDIT USER MODAL
          ONLY RENDERS AFTER BUTTON CLICK
      ===================================================== */}

      {showAddModal && (
        <AddUserModal
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          fetchUsers={fetchUsers}
          editingUser={editingUser}
        />
      )}

      {/* =====================================================
          BULK UPLOAD MODAL
      ===================================================== */}

      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Upload Users"
        uploadFunction={handleBulkUpload}
        onSuccess={fetchUsers}
        acceptedFile=".csv,.xlsx,.xls"
        sampleFile="https://miarcus-backend.onrender.com/api/users/sample"
      />

      {/* =====================================================
          DELETE ALL CONFIRMATION
      ===================================================== */}

      <ConfirmDialog
        open={showDeleteModal}
        title="Delete All Users"
        message="Are you sure you want to delete ALL users? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={deleteAllUsers}
        onCancel={() => setShowDeleteModal(false)}
      />

    </div>
  );
}

export default Users;

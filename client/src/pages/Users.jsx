import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { saveAs } from "file-saver";
import AddUserModal from "../components/AddUserModal";
import BulkUploadModal from "../components/common/BulkUploadModal";

import {
  FaSearch,
  FaPlus,
  FaUpload,
  FaTrash,
  FaInfoCircle,
} from "react-icons/fa";

import "../styles/Users.css";

function Users() {

  const location = useLocation();

  // ============================
  // States
  // ============================

  // ============================
// States
// ============================

const [users, setUsers] = useState([]);

const [search, setSearch] = useState("");

const [reportsTo, setReportsTo] = useState([]);

const [departmentFilter, setDepartmentFilter] =
  useState("");

const [reportsFilter, setReportsFilter] =
  useState("");


const [selectedUsers, setSelectedUsers] =
  useState([]);

// NEW STATES

const [showBulkModal, setShowBulkModal] =
  useState(false);

const [showDeleteModal, setShowDeleteModal] =
  useState(false);

const [selectedFile, setSelectedFile] =
  useState(null);
  const [currentPage, setCurrentPage] = useState(1);

const usersPerPage = 10;
 // ============================
// RBAC
// ============================

const permissions = JSON.parse(
  localStorage.getItem("permissions") || "{}"
);

const userPermission =
  permissions["Users"] || "None";

// Debug (temporary)
console.log("Permissions:", permissions);
console.log("Users Permission:", userPermission);

// View -> View, Add, Edit, Full
const canView =
  ["View", "Add", "Edit", "Full"].includes(userPermission);

// Add -> Add, Edit, Full
const canAdd =
  ["Add", "Edit", "Full"].includes(userPermission);

// Edit -> Edit, Full
const canEdit =
  ["Edit", "Full"].includes(userPermission);

// Delete/Disable -> Full only
const canDelete =
  userPermission === "Full";

  // ============================
  // Load Users
  // ============================

 const fetchUsers = async () => {
  try {
    const res = await axios.get(
      "https://miarcus-backend.onrender.com/api/users"
    );

    console.log("Fetched Users:", res.data.users);

    setUsers([...res.data.users]);

  } catch (err) {
    console.log(err);
  }
};

useEffect(() => {
  fetchUsers();
  fetchManagers();
  fetchDepartments();
}, []);

useEffect(() => {
  const viewUserId = Number(location.state?.viewUserId || 0);
  if (!viewUserId || !users.length) return;
  const found = users.find((item) => Number(item.id) === viewUserId);
  if (found) {
    setViewingUser(found);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, [location.state, users]);
const fetchManagers = async () => {
  try {
    const res = await axios.get(
      "https://miarcus-backend.onrender.com/api/reports"
    );

    setReportsTo(res.data.reports);
  } catch (err) {
    console.log(err);
  }
};
// ============================
// Export CSV
// ============================

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

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  saveAs(blob, "Users.csv");

};

// ============================
// Bulk Upload
// ============================

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
      message: res.data?.message || "Users uploaded successfully.",
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

// ============================
// Delete All Users
// ============================

const deleteAllUsers = async () => {

  try {

    await axios.delete(
      "https://miarcus-backend.onrender.com/api/users/delete-all"
    );

    alert("Users Deleted Successfully");

    fetchUsers();

    setShowDeleteModal(false);

  } catch (err) {

    console.log(err);
    alert("Delete Failed");

  }

};
// ============================
// Delete User
// ============================

const deleteUser = async (id) => {

  if (!window.confirm("Delete this user?")) return;

  try {

    const res = await axios.delete(
      `https://miarcus-backend.onrender.com/api/users/${id}`
    );

    alert(res.data.message);

    fetchUsers();

  } catch (err) {

    console.log(err);
    alert("Delete Failed");

  }

};

// ============================
// Disable User
// ============================

const disableUser = async (id) => {

  try {

    const res = await axios.put(
      `https://miarcus-backend.onrender.com/api/users/disable/${id}`
    );

    alert(res.data.message);

    fetchUsers();

  } catch (err) {

    console.log(err);
    alert("Disable Failed");

  }

};

// ============================
// Edit User
// ============================

const editUser = (user) => {

  alert("Edit feature will open AddUserModal.");

  // We'll connect this to your AddUserModal next.

};

// ============================
// Dropdown Data
// ============================

const [departments, setDepartments] = useState([]);


// ============================
// Search + Filter
// ============================

const filteredUsers = users.filter((user) => {

  const matchesSearch =
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.employee_id?.toLowerCase().includes(search.toLowerCase());

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
const fetchDepartments = async () => {
  try {
    const res = await axios.get(
      "https://miarcus-backend.onrender.com/api/departments"
    );

    setDepartments(res.data.data);

  } catch (err) {
    console.log(err);
  }
};
const [showAddModal, setShowAddModal] = useState(false);
const [editingUser, setEditingUser] = useState(null);
const [viewingUser, setViewingUser] = useState(null);

const indexOfLastUser = currentPage * usersPerPage;

const indexOfFirstUser =
  indexOfLastUser - usersPerPage;

const currentUsers =
  filteredUsers.slice(
    indexOfFirstUser,
    indexOfLastUser
  );

const totalPages = Math.ceil(
  filteredUsers.length / usersPerPage
);
return (
  
    <div className="users-page">

      {/* ============================
          Header
      ============================ */}

      <div className="users-header">

        <div className="users-title">

          <h2>

            Users

            <FaInfoCircle className="info-icon" />

          </h2>

        </div>

  {/* Toolbar */}

<div className="users-toolbar">

 <div className="users-search-box">

    <FaSearch className="users-search-icon" />

    <input
        type="text"
        placeholder="Search by name, ID, email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
    />

</div>

  {/* Add User */}

  {canAdd && (

    <button
      className="add-btn"
      onClick={() =>
        setShowAddModal(true)
      }
    >
      <FaPlus />
      Add User
    </button>

  )}

  {/* Export */}

  {canView && (

    <button
      className="export-btn"
      onClick={exportCSV}
    >
      <FaUpload />
      Export
    </button>

  )}

  {/* Bulk Add */}

  {canAdd && (

    <button
      className="bulk-btn"
      onClick={() => setShowBulkModal(true)}
    >
      <FaUpload />
      Bulk Add
    </button>

  )}

   {/* Clear Filters */}

  <button
    type="button"
    className="clear-filter-btn"
    onClick={() => {

      setSearch("");

      setDepartmentFilter("");

      setReportsFilter("");

    }}
  >
    Clear Filters
  </button>


  {/* Delete All */}

  {canDelete && (

    <button
      className="delete-btn"
      onClick={() => setShowDeleteModal(true)}
    >
      <FaTrash />
      Delete All
    </button>

  )}

</div>

       {/* ============================
    Filters
============================ */}

<div className="users-filters">

  {/* Department Filter */}

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

  {/* Reports To Filter */}

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

 
</div>

</div>

{/* ============================
    Users Table
============================ */}

<div className="users-table-wrapper">

  <table className="users-table">

    <thead>

      <tr>

        <th>
          <input type="checkbox" />
        </th>

        <th>Name</th>

        <th>Employee ID</th>

        <th>Email</th>

        <th>Reports To</th>

        <th>Designation</th>

        <th>Status</th>

        <th>Admin</th>

        <th>Actions</th>

      </tr>

    </thead>

    <tbody>

      {filteredUsers.length > 0 ? (

       currentUsers.map((user) => (
          <tr key={user.id}>

            <td>

              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={(e) => {

                  if (e.target.checked) {

                    setSelectedUsers([
                      ...selectedUsers,
                      user.id,
                    ]);

                  } else {

                    setSelectedUsers(
                      selectedUsers.filter(
                        (id) => id !== user.id
                      )
                    );

                  }

                }}
              />

            </td>

            <td className="user-name">
              {user.name}
            </td>

            <td>
              {user.employee_id}
            </td>

            <td>
              {user.email}
            </td>

            <td>
              {user.reports_to || "-"}
            </td>

            <td>
              {user.designation || "-"}
            </td>

            <td>

              <span
                className={
                  user.status === "Active"
                    ? "status-active"
                    : "status-inactive"
                }
              >

                {user.status || "Inactive"}

              </span>

            </td>

            <td>

              {user.is_admin
                ? "Yes"
                : "No"}

            </td>

      <td>
  <div className="action-buttons">

    {canEdit && (
      <button
        className="edit-btn"
        onClick={() => {
          setEditingUser(user);
          setShowAddModal(true);
        }}
      >
        Edit
      </button>
    )}

    {canDelete && (
      <button
        className="disable-btn"
        onClick={() => disableUser(user.id)}
      >
        Disable
      </button>
    )}

    {canDelete && (
      <button
        className="remove-btn"
        onClick={() => deleteUser(user.id)}
      >
        Delete
      </button>
    )}

  </div>
</td>
          </tr>

        ))

      ) : (

        <tr>

          <td
            colSpan="9"
            className="no-data"
          >

            No Users Found

          </td>

        </tr>

      )}

    </tbody>

  </table>

</div>

{/* ============================
      Pagination
============================ */}

<div className="users-footer">

  <div>

    Showing

    <strong>

      {" "}
      {indexOfFirstUser + 1}

    </strong>

    {" - "}

    <strong>

      {Math.min(
        indexOfLastUser,
        filteredUsers.length
      )}

    </strong>

    {" of "}

    <strong>

      {filteredUsers.length}

    </strong>

    {" "}Users

  </div>

  <div className="pagination">

  <button
    disabled={currentPage === 1}
    onClick={() =>
      setCurrentPage(currentPage - 1)
    }
  >
    Previous
  </button>

  <span>
    Page {currentPage} of {totalPages}
  </span>

  <button
    disabled={currentPage === totalPages}
    onClick={() =>
      setCurrentPage(currentPage + 1)
    }
  >
    Next
  </button>

</div>
</div>

{/* ============================
      Add User Modal
============================ */}
{/* ============================
      Add User Modal
============================ */}
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
{/* ============================
      VIEW USER MODAL
============================ */}
{viewingUser && (
  <div className="user-view-overlay" onClick={() => setViewingUser(null)}>
    <div className="user-view-modal" onClick={(e) => e.stopPropagation()}>
      <div className="user-view-header">
        <div>
          <h2>User Details</h2>
          <p>Employee information from Activity Center</p>
        </div>
        <button onClick={() => setViewingUser(null)}>×</button>
      </div>
      <div className="user-view-avatar">{(viewingUser.name || "U").charAt(0).toUpperCase()}</div>
      <div className="user-view-grid">
        <div><span>Employee ID</span><strong>{viewingUser.employee_id || "-"}</strong></div>
        <div><span>Name</span><strong>{viewingUser.name || "-"}</strong></div>
        <div><span>Email</span><strong>{viewingUser.email || "-"}</strong></div>
        <div><span>Department</span><strong>{viewingUser.department || viewingUser.department_name || "-"}</strong></div>
        <div><span>Designation</span><strong>{viewingUser.designation || viewingUser.designation_name || "-"}</strong></div>
        <div><span>Reports To</span><strong>{viewingUser.reports_to || "-"}</strong></div>
        <div><span>Status</span><strong>{viewingUser.status || "-"}</strong></div>
        <div><span>Admin</span><strong>{viewingUser.is_admin ? "Yes" : "No"}</strong></div>
      </div>
      <div className="user-view-actions">
        {canEdit && <button onClick={() => { setEditingUser(viewingUser); setViewingUser(null); setShowAddModal(true); }}>Edit User</button>}
        <button className="secondary" onClick={() => setViewingUser(null)}>Close</button>
      </div>
    </div>
  </div>
)}

{/* ============================
      BULK UPLOAD MODAL
      ============================ */}

<BulkUploadModal
  isOpen={showBulkModal}
  onClose={() => setShowBulkModal(false)}
  title="Bulk Upload Users"
  uploadFunction={handleBulkUpload}
  onSuccess={fetchUsers}
  acceptedFile=".csv,.xlsx,.xls"
  sampleFile="https://miarcus-backend.onrender.com/api/users/sample"
/>
{/* ============================
      Delete All Modal
============================ */}

{showDeleteModal && (

<div className="modal-overlay">

  <div className="user-modal">

    <h2>Delete All Users</h2>

    <p>
      Are you sure you want to delete all users?
    </p>

    <div className="modal-buttons">

      <button
        className="cancel-btn"
        onClick={() =>
          setShowDeleteModal(false)
        }
      >
        Cancel
      </button>
<button
  className="modal-delete-btn"
  onClick={deleteAllUsers}
>
  Delete
</button>
    </div>

  </div>

</div>

)}
    </div>

  );

}

export default Users;
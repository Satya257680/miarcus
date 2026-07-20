import { useEffect, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import AddUserModal from "../components/AddUserModal";

import {
  FaSearch,
  FaPlus,
  FaUpload,
  FaTrash,
  FaInfoCircle,
} from "react-icons/fa";

import "../styles/Users.css";

function Users() {

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

  // ============================
  // Load Users
  // ============================

  const fetchUsers = async () => {
  try {
    const res = await axios.get(
      "http://localhost:5000/api/users"
    );

    setUsers(res.data.users);

  } catch (err) {
    console.log(err);
  }
};

useEffect(() => {
  fetchUsers();
  fetchManagers();
  fetchDepartments();
}, []);
const fetchManagers = async () => {
  try {
    const res = await axios.get(
      "http://localhost:5000/api/reports"
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

const uploadUsers = async () => {

  if (!selectedFile) {
    alert("Please Select File");
    return;
  }

  const formData = new FormData();

  formData.append("file", selectedFile);

  try {

    const res = await axios.post(
      "http://localhost:5000/api/users/bulk-upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    alert(res.data.message);

    fetchUsers();

    setShowBulkModal(false);

    setSelectedFile(null);

  } catch (err) {

    console.log(err);
    alert("Upload Failed");

  }

};

// ============================
// Delete All Users
// ============================

const deleteAllUsers = async () => {

  try {

    await axios.delete(
      "http://localhost:5000/api/users/delete-all"
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
      `http://localhost:5000/api/users/${id}`
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
      `http://localhost:5000/api/users/disable/${id}`
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
      "http://localhost:5000/api/departments"
    );

    setDepartments(res.data.data);

  } catch (err) {
    console.log(err);
  }
};
const [showAddModal, setShowAddModal] = useState(false);
const [editingUser, setEditingUser] = useState(null);

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

          <div className="search-box">

            <FaSearch className="search-icon" />

            <input
              type="text"
              placeholder="Search by name, ID, email..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

          <button
            className="add-btn"
            onClick={() =>
              setShowAddModal(true)
            }
          >
            <FaPlus />
            Add User
          </button>

         <button
  className="export-btn"
  onClick={exportCSV}
>
  <FaUpload />
  Export
</button>

          <button
  className="bulk-btn"
  onClick={() => setShowBulkModal(true)}
>
  <FaUpload />
  Bulk Add
</button>

          <button
  className="delete-btn"
  onClick={() => setShowDeleteModal(true)}
>
  <FaTrash />
  Delete All
</button>

        </div>

        {/* Filters */}

        <div className="users-filters">

          <select
            value={departmentFilter}
            onChange={(e) =>
              setDepartmentFilter(
                e.target.value
              )
            }
          >

            <option>All Departments</option>

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
  onChange={(e) => setReportsFilter(e.target.value)}
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

        </div>

      </div>

      {/* ============================
          TABLE COMES IN PART-2
      ============================ */}
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

        filteredUsers.map((user) => (

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

  <button
    className="edit-btn"
    onClick={() => {
        setEditingUser(user);
        setShowAddModal(true);
    }}
>
    Edit
</button>
  <button
    className="disable-btn"
    onClick={() => disableUser(user.id)}
  >
    Disable
  </button>

  <button
    className="remove-btn"
    onClick={() => deleteUser(user.id)}
  >
    Delete
  </button>

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
      {filteredUsers.length}

    </strong>

    {" "}Users

  </div>

  <div className="pagination">

    <button>

      Previous

    </button>

    <span>

      Page 1

    </span>

    <button>

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
      Bulk Upload Modal
============================ */}

{showBulkModal && (

<div className="modal-overlay">

  <div className="user-modal">

    <h2>Bulk Add Users</h2>

    <p>
      Upload a CSV or Excel file to create users.
    </p>

    <input
      type="file"
      accept=".csv,.xlsx,.xls"
      onChange={(e) =>
        setSelectedFile(e.target.files[0])
      }
    />

    <div className="modal-buttons">

      <button
        className="cancel-btn"
        onClick={() =>
          setShowBulkModal(false)
        }
      >
        Cancel
      </button>

      <button
        className="save-btn"
        onClick={uploadUsers}
      >
        Upload Users
      </button>

    </div>

  </div>

</div>

)}
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
        className="remove-btn"
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
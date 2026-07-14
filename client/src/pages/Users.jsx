import { useState } from "react";
import {
  FaSearch,
  FaInfoCircle,
  FaPlus,
  FaUpload,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

import "../styles/Users.css";

function Users() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="users-page">

      {/* Header */}

      <div className="users-header">
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
          />
        </div>

        <button
          className="btn primary"
          onClick={() => setShowModal(true)}
        >
          <FaPlus />
          Add User
        </button>

        <button className="btn outline">
          <FaUpload />
          Export
        </button>

        <button className="btn primary">
          <FaUpload />
          Bulk Add
        </button>

        <button className="btn danger">
          <FaTrash />
          Delete All
        </button>

      </div>

      {/* Filters */}

      <div className="filters">

        <select>
          <option>Departments...</option>
        </select>

        <select>
          <option>Reports To...</option>
        </select>

      </div>

      {/* Table Placeholder */}

      <div className="empty-table">

        <h3>No Users Found</h3>

        <p>Click "Add User" to create your first user.</p>

      </div>

      {/* ================= Add User Modal ================= */}

      {showModal && (

        <div className="modal-overlay">

          <div className="add-user-modal">

            {/* Header */}

            <div className="modal-header">

              <div>

                <h2>Add User</h2>

                <p>Create a new MIARCUS user account.</p>

              </div>

              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                <FaTimes />
              </button>

            </div>

            {/* Body */}

            {/* Reports To */}

<h3 className="section-title">Reports To</h3>

<div className="form-grid">

  <div className="form-group">
    <label>Reporting Manager</label>
    <select>
      <option>Select Manager</option>
    </select>
  </div>

  <div className="form-group">
    <label>User Role</label>
    <select>
      <option>Select Role</option>
    </select>
  </div>

</div>

{/* Assigned Departments */}

<h3 className="section-title">Assigned Departments</h3>

<div className="checkbox-grid">

  <label><input type="checkbox" /> Sales</label>

  <label><input type="checkbox" /> HR</label>

  <label><input type="checkbox" /> Accounts</label>

  <label><input type="checkbox" /> Marketing</label>

  <label><input type="checkbox" /> Operations</label>

  <label><input type="checkbox" /> IT</label>

</div>

{/* Designations */}

<h3 className="section-title">Designations</h3>

<div className="checkbox-grid">

  <label><input type="checkbox" /> Manager</label>

  <label><input type="checkbox" /> Team Lead</label>

  <label><input type="checkbox" /> Executive</label>

  <label><input type="checkbox" /> Admin</label>

</div>

{/* Assigned Stores */}

<h3 className="section-title">Assigned Stores</h3>

<div className="checkbox-grid">

  <label><input type="checkbox" /> Store 1</label>

  <label><input type="checkbox" /> Store 2</label>

  <label><input type="checkbox" /> Store 3</label>

  <label><input type="checkbox" /> Store 4</label>

</div>

{/* Account Settings */}

<h3 className="section-title">Account Settings</h3>

<div className="checkbox-grid">

  <label>
    <input type="checkbox" />
    Active Account
  </label>

  <label>
    <input type="checkbox" />
    Administrator
  </label>

</div>
            {/* Footer */}

            <div className="modal-footer">

              <button
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button className="create-btn">
                Create User
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Users;
import { useEffect, useState } from "react";
import "./DepartmentModal.css";
import "../../styles/common/ProfessionalModal.css";
import EmployeeList from "./EmployeeList";
import { getUsers } from "../../services/userService";

function DepartmentModal({
  isOpen,
  onClose,
  onSave,
  department,
}) {
  const [departmentName, setDepartmentName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");

  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers = async () => {
    try {
      const response = await getUsers();

      setUsers(response?.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setUsers([]);
    }
  };

  // =====================================================
  // LOAD DEPARTMENT DATA
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    loadUsers();

    if (department) {
      console.log("Department Data:", department);

      setDepartmentName(
        department.department_name || ""
      );

      setDescription(
        department.description || ""
      );

      setStatus(
        department.status || "Active"
      );

      // -----------------------------------------
      // Normalize assigned users
      // -----------------------------------------

      let assigned = [];

      if (Array.isArray(department.users)) {
        assigned = department.users.map((user) =>
          typeof user === "object"
            ? user.id
            : user
        );
      } else if (
        Array.isArray(department.assignedUsers)
      ) {
        assigned = department.assignedUsers.map(
          (user) =>
            typeof user === "object"
              ? user.id
              : user
        );
      } else if (
        Array.isArray(department.userIds)
      ) {
        assigned = department.userIds;
      }

      setSelectedUsers(assigned);
    } else {
      setDepartmentName("");
      setDescription("");
      setStatus("Active");
      setSelectedUsers([]);
    }

    setSearch("");
  }, [department, isOpen]);

  // =====================================================
  // SAVE
  // =====================================================

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!departmentName.trim()) {
      alert("Department Name is required");
      return;
    }

    onSave({
      department_name: departmentName.trim(),
      description: description.trim(),
      status,
      users: selectedUsers,
    });
  };

  // =====================================================
  // MODAL CLOSE
  // =====================================================

  const handleClose = () => {
    onClose();
  };

  // =====================================================
  // DO NOT RENDER WHEN CLOSED
  // =====================================================

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay department-modal-overlay"
      onMouseDown={(e) => {
        // Close only when clicking directly on overlay
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="department-modal department-modal-animated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="department-modal-title"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="modal-header department-modal-header">
          <div className="modal-header-content">
            <div className="modal-header-icon">
              <span>
                {department ? "✎" : "+"}
              </span>
            </div>

            <div>
              <h2 id="department-modal-title">
                {department
                  ? "Edit Department"
                  : "Add Department"}
              </h2>

              <p>
                {department
                  ? "Update department information and assigned employees."
                  : "Create a new department and assign employees."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="department-form"
        >
          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <div className="department-form-section">
            <div className="section-title">
              <span className="section-line"></span>
              <h3>Department Information</h3>
            </div>

            <div className="department-form-grid">
              {/* Department Name */}

              <div className="form-group department-field">
                <label htmlFor="department-name">
                  Department Name
                  <span className="required">*</span>
                </label>

                <input
                  id="department-name"
                  type="text"
                  value={departmentName}
                  onChange={(e) =>
                    setDepartmentName(e.target.value)
                  }
                  placeholder="Enter department name"
                  autoComplete="off"
                />
              </div>

              {/* Description */}

              <div className="form-group department-field">
                <label htmlFor="department-description">
                  Description
                </label>

                <textarea
                  id="department-description"
                  rows="3"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Enter department description"
                />
              </div>
            </div>

            {/* Status */}

            <div className="form-group department-field status-field">
              <label htmlFor="department-status">
                Status
              </label>

              <div className="select-wrapper">
                <select
                  id="department-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* =================================================
              EMPLOYEE ASSIGNMENT
          ================================================= */}

          <div className="department-form-section employee-section">
            <div className="section-title">
              <span className="section-line"></span>

              <div>
                <h3>Assign Employees</h3>

                <p>
                  Select employees who belong to this
                  department.
                </p>
              </div>
            </div>

            <div className="employee-list-wrapper">
              <EmployeeList
                users={users}
                search={search}
                setSearch={setSearch}
                selectedUsers={selectedUsers}
                setSelectedUsers={setSelectedUsers}
              />
            </div>
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="modal-buttons department-modal-footer">
            <button
              type="button"
              className="cancel-btn department-cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-btn department-save-btn"
            >
              <span className="save-btn-icon">
                {department ? "✓" : "+"}
              </span>

              <span>
                {department ? "Update Department" : "Create Department"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DepartmentModal;
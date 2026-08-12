import { useEffect, useState } from "react";
import ProfessionalModal from "../common/ProfessionalModal";
import EmployeeList from "./EmployeeList";
import { getUsers } from "../../services/userService";

import "../../styles/common/ProfessionalModal.css";
import "../../styles/DepartmentModal.css";

function DepartmentModal({
  isOpen,
  onClose,
  onSave,
  department,
}) {
  // =====================================================
  // FORM STATE
  // =====================================================

  const [departmentName, setDepartmentName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");

  // =====================================================
  // EMPLOYEE STATE
  // =====================================================

  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers = async () => {
    try {
      const response = await getUsers();

      setUsers(response?.users || response?.data || []);
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    }
  };

  // =====================================================
  // NORMALIZE ASSIGNED USERS
  // =====================================================

  const normalizeAssignedUsers = (data) => {
    if (!data) {
      return [];
    }

    if (Array.isArray(data.users)) {
      return data.users
        .map((user) =>
          typeof user === "object"
            ? user?.id
            : user
        )
        .filter(Boolean);
    }

    if (Array.isArray(data.assignedUsers)) {
      return data.assignedUsers
        .map((user) =>
          typeof user === "object"
            ? user?.id
            : user
        )
        .filter(Boolean);
    }

    if (Array.isArray(data.userIds)) {
      return data.userIds.filter(Boolean);
    }

    return [];
  };

  // =====================================================
  // LOAD / RESET FORM
  // =====================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

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

      setSelectedUsers(
        normalizeAssignedUsers(department)
      );
    } else {
      setDepartmentName("");
      setDescription("");
      setStatus("Active");
      setSelectedUsers([]);
    }

    setSearch("");
  }, [department, isOpen]);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    onClose();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = departmentName.trim();

    if (!trimmedName) {
      alert("Department Name is required");
      return;
    }

    const payload = {
      department_name: trimmedName,
      description: description.trim(),
      status,
      users: selectedUsers,
    };

    onSave(payload);
  };

  // =====================================================
  // DO NOT RENDER WHEN CLOSED
  // =====================================================

  if (!isOpen) {
    return null;
  }

  // =====================================================
  // HEADER ICON
  // =====================================================

  const modalIcon = department ? "✎" : "+";

  // =====================================================
  // FOOTER
  // =====================================================

  const modalFooter = (
    <div className="professional-modal-footer department-modal-footer">
      <button
        type="button"
        className="professional-btn professional-btn-secondary"
        onClick={handleClose}
      >
        Cancel
      </button>

      <button
        type="submit"
        form="department-form"
        className="professional-btn professional-btn-primary"
      >
        <span className="professional-btn-icon">
          {department ? "✓" : "+"}
        </span>

        <span>
          {department
            ? "Update Department"
            : "Create Department"}
        </span>
      </button>
    </div>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <ProfessionalModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        department
          ? "Edit Department"
          : "Add Department"
      }
      subtitle={
        department
          ? "Update department information and assigned employees."
          : "Create a new department and assign employees."
      }
      icon={modalIcon}
      size="large"
      footer={modalFooter}
    >
      <form
        id="department-form"
        className="department-professional-form"
        onSubmit={handleSubmit}
      >
        {/* =================================================
            SECTION 1 — DEPARTMENT INFORMATION
        ================================================= */}

        <section className="professional-form-section">
          <div className="professional-section-heading">
            <div className="professional-section-indicator"></div>

            <div>
              <h3>Department Information</h3>

              <p>
                Configure the basic department information.
              </p>
            </div>
          </div>

          <div className="professional-form-grid">
            {/* Department Name */}

            <div className="professional-field">
              <label htmlFor="department-name">
                Department Name
                <span className="required">*</span>
              </label>

              <input
                id="department-name"
                type="text"
                value={departmentName}
                onChange={(event) =>
                  setDepartmentName(
                    event.target.value
                  )
                }
                placeholder="Enter department name"
                autoComplete="off"
              />
            </div>

            {/* Status */}

            <div className="professional-field">
              <label htmlFor="department-status">
                Status
              </label>

              <div className="professional-select-wrapper">
                <select
                  id="department-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
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

          {/* Description */}

          <div className="professional-field professional-field-full">
            <label htmlFor="department-description">
              Description
            </label>

            <textarea
              id="department-description"
              rows="4"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Enter department description"
            />
          </div>
        </section>

        {/* =================================================
            SECTION 2 — ASSIGN EMPLOYEES
        ================================================= */}

        <section className="professional-form-section department-employee-section">
          <div className="professional-section-heading">
            <div className="professional-section-indicator"></div>

            <div>
              <h3>Assign Employees</h3>

              <p>
                Select employees who belong to this
                department.
              </p>
            </div>

            <div className="professional-section-count">
              {selectedUsers.length} selected
            </div>
          </div>

          <div className="department-employee-container">
            <EmployeeList
              users={users}
              search={search}
              setSearch={setSearch}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
            />
          </div>
        </section>
      </form>
    </ProfessionalModal>
  );
}

export default DepartmentModal;
import { useEffect, useState } from "react";

import ProfessionalModal from "../common/ProfessionalModal";
import EmployeeList from "../Departments/EmployeeList";

import { getUsers } from "../../services/userService";

import "../../styles/common/ProfessionalModal.css";
import "./DesignationModal.css";

function DesignationModal({
  isOpen,
  onClose,
  onSave,
  designation,
  departments = [],
}) {
  // =====================================================
  // FORM STATE
  // =====================================================

  const [designationName, setDesignationName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
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

      setUsers(
        response?.users ||
        response?.data ||
        []
      );
    } catch (error) {
      console.error(
        "Failed to load users:",
        error
      );

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
  // LOAD / RESET DESIGNATION
  // =====================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadUsers();

    if (designation) {
      console.log(
        "Designation Data:",
        designation
      );

      setDesignationName(
        designation.designation_name || ""
      );

      setDepartmentId(
        designation.department_id || ""
      );

      setDescription(
        designation.description || ""
      );

      setStatus(
        designation.status || "Active"
      );

      setSelectedUsers(
        normalizeAssignedUsers(designation)
      );
    } else {
      setDesignationName("");
      setDepartmentId("");
      setDescription("");
      setStatus("Active");
      setSelectedUsers([]);
    }

    setSearch("");
  }, [designation, isOpen]);

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!departmentId) {
      alert("Please select a Department");
      return;
    }

    if (!designationName.trim()) {
      alert("Designation Name is required");
      return;
    }

    onSave({
      department_id: departmentId,
      designation_name: designationName.trim(),
      description: description.trim(),
      status,
      users: selectedUsers,
    });
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    onClose();
  };

  // =====================================================
  // DO NOT RENDER
  // =====================================================

  if (!isOpen) {
    return null;
  }

  // =====================================================
  // FOOTER
  // =====================================================

  const modalFooter = (
    <div className="professional-modal-footer designation-modal-footer">
      <button
        type="button"
        className="professional-btn professional-btn-secondary"
        onClick={handleClose}
      >
        Cancel
      </button>

      <button
        type="submit"
        form="designation-form"
        className="professional-btn professional-btn-primary"
      >
        <span className="professional-btn-icon">
          {designation ? "✓" : "+"}
        </span>

        <span>
          {designation
            ? "Update Designation"
            : "Create Designation"}
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
        designation
          ? "Edit Designation"
          : "Add Designation"
      }
      subtitle={
        designation
          ? "Update designation information and assigned employees."
          : "Create a new designation and assign employees."
      }
      icon={designation ? "✎" : "+"}
      size="large"
      footer={modalFooter}
    >
      <form
        id="designation-form"
        className="designation-professional-form"
        onSubmit={handleSubmit}
      >
        {/* =================================================
            DESIGNATION INFORMATION
        ================================================= */}

        <section className="professional-form-section">
          <div className="professional-section-heading">
            <div className="professional-section-indicator" />

            <div>
              <h3>Designation Information</h3>

              <p>
                Configure the designation and department
                information.
              </p>
            </div>
          </div>

          {/* =================================================
              FIRST ROW
          ================================================= */}

          <div className="professional-form-grid">

            {/* Department */}

            <div className="professional-field">
              <label htmlFor="designation-department">
                Department
                <span className="required">
                  *
                </span>
              </label>

              <div className="professional-select-wrapper">
                <select
                  id="designation-department"
                  value={departmentId}
                  onChange={(event) =>
                    setDepartmentId(
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select Department
                  </option>

                  {departments.map((dept) => (
                    <option
                      key={dept.id}
                      value={dept.id}
                    >
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Designation Name */}

            <div className="professional-field">
              <label htmlFor="designation-name">
                Designation Name
                <span className="required">
                  *
                </span>
              </label>

              <input
                id="designation-name"
                type="text"
                value={designationName}
                onChange={(event) =>
                  setDesignationName(
                    event.target.value
                  )
                }
                placeholder="Enter designation name"
                autoComplete="off"
                required
              />
            </div>
          </div>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <div className="professional-field professional-field-full">
            <label htmlFor="designation-description">
              Description
            </label>

            <textarea
              id="designation-description"
              rows="4"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Enter designation description"
            />
          </div>

          {/* =================================================
              STATUS
          ================================================= */}

          <div className="professional-field designation-status-field">
            <label htmlFor="designation-status">
              Status
            </label>

            <div className="professional-select-wrapper">
              <select
                id="designation-status"
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
        </section>

        {/* =================================================
            ASSIGN EMPLOYEES
        ================================================= */}

        <section className="professional-form-section designation-employee-section">

          <div className="professional-section-heading">

            <div className="professional-section-indicator" />

            <div>
              <h3>Assign Employees</h3>

              <p>
                Select employees who belong to this
                designation.
              </p>
            </div>

            <div className="professional-section-count">
              {selectedUsers.length} selected
            </div>

          </div>

          <div className="designation-employee-container">
            <EmployeeList
              users={users}
              search={search}
              setSearch={setSearch}
              selectedUsers={selectedUsers}
              setSelectedUsers={
                setSelectedUsers
              }
            />
          </div>

        </section>
      </form>
    </ProfessionalModal>
  );
}

export default DesignationModal;
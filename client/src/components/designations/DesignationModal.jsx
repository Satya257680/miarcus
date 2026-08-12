import { useEffect, useState } from "react";
import "./DesignationModal.css";
import EmployeeList from "../Departments/EmployeeList";
import { getUsers } from "../../services/userService";

function DesignationModal({
  isOpen,
  onClose,
  onSave,
  designation,
  departments = [],
}) {
  const [designationName, setDesignationName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
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
  // LOAD DESIGNATION DATA
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    loadUsers();

    if (designation) {
      console.log("Designation Data:", designation);

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

      // -----------------------------------------
      // Normalize assigned users
      // -----------------------------------------

      let assignedUsers = [];

      if (Array.isArray(designation.users)) {
        assignedUsers = designation.users.map((user) =>
          typeof user === "object"
            ? user.id
            : user
        );
      } else if (
        Array.isArray(designation.assignedUsers)
      ) {
        assignedUsers =
          designation.assignedUsers.map((user) =>
            typeof user === "object"
              ? user.id
              : user
          );
      } else if (
        Array.isArray(designation.userIds)
      ) {
        assignedUsers = designation.userIds;
      }

      setSelectedUsers(assignedUsers);
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

  const handleSubmit = (e) => {
    e.preventDefault();

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

  return (
    <div
      className="modal-overlay designation-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="designation-modal designation-modal-animated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="designation-modal-title"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="modal-header designation-modal-header">

          <div className="modal-header-content">

            <div className="modal-header-icon">
              <span>
                {designation ? "✎" : "+"}
              </span>
            </div>

            <div>

              <h2 id="designation-modal-title">
                {designation
                  ? "Edit Designation"
                  : "Add Designation"}
              </h2>

              <p>
                {designation
                  ? "Update designation information and assigned employees."
                  : "Create a new designation and assign employees."}
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
          className="designation-form"
        >

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <div className="designation-form-section">

            <div className="section-title">

              <span className="section-line"></span>

              <h3>
                Designation Information
              </h3>

            </div>


            <div className="designation-form-grid">

              {/* Department */}

              <div className="form-group designation-field">

                <label htmlFor="designation-department">
                  Department
                  <span className="required">*</span>
                </label>

                <div className="select-wrapper">

                  <select
                    id="designation-department"
                    value={departmentId}
                    onChange={(e) =>
                      setDepartmentId(e.target.value)
                    }
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


              {/* Designation */}

              <div className="form-group designation-field">

                <label htmlFor="designation-name">
                  Designation Name
                  <span className="required">*</span>
                </label>

                <input
                  id="designation-name"
                  type="text"
                  value={designationName}
                  onChange={(e) =>
                    setDesignationName(e.target.value)
                  }
                  placeholder="Enter designation name"
                  autoComplete="off"
                />

              </div>

            </div>


            {/* Description */}

            <div className="form-group designation-field description-field">

              <label htmlFor="designation-description">
                Description
              </label>

              <textarea
                id="designation-description"
                rows="3"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Enter designation description"
              />

            </div>


            {/* Status */}

            <div className="form-group designation-field status-field">

              <label htmlFor="designation-status">
                Status
              </label>

              <div className="select-wrapper">

                <select
                  id="designation-status"
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

          <div className="designation-form-section employee-section">

            <div className="section-title">

              <span className="section-line"></span>

              <div>

                <h3>
                  Assign Employees
                </h3>

                <p>
                  Select employees who belong to this
                  designation.
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

          <div className="modal-buttons designation-modal-footer">

            <button
              type="button"
              className="cancel-btn designation-cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>


            <button
              type="submit"
              className="save-btn designation-save-btn"
            >

              <span className="save-btn-icon">
                {designation ? "✓" : "+"}
              </span>

              <span>
                {designation
                  ? "Update Designation"
                  : "Create Designation"}
              </span>

            </button>

          </div>

        </form>

      </div>
    </div>
  );
}

export default DesignationModal;
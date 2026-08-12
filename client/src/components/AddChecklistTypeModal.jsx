import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AddChecklistTypeModal.css";

const API = "https://miarcus-backend.onrender.com/api";

function AddChecklistTypeModal({
  checklist,
  onSave,
  onClose,
}) {
  const [checklistName, setChecklistName] = useState("");

  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [searchUser, setSearchUser] = useState("");

  const [allowPastSubmission, setAllowPastSubmission] =
    useState(false);

  const [cutoffTime, setCutoffTime] = useState("");

  const [status, setStatus] = useState("Active");

  const [saving, setSaving] = useState(false);

  // =====================================================
  // LOAD DEPARTMENTS
  // =====================================================

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await axios.get(
          `${API}/departments`
        );

        if (res.data.success) {
          setDepartments(res.data.data || []);
        }
      } catch (err) {
        console.error("Department loading error:", err);
      }
    };

    loadDepartments();
  }, []);

  // =====================================================
  // LOAD USERS
  // =====================================================

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await axios.get(
          `${API}/users`
        );

        if (res.data.success) {
          setUsers(res.data.users || []);
        }
      } catch (err) {
        console.error("User loading error:", err);
      }
    };

    loadUsers();
  }, []);

  // =====================================================
  // EDIT MODE
  // =====================================================

  useEffect(() => {
    if (!checklist) {
      setChecklistName("");
      setSelectedDepartments([]);
      setSelectedUsers([]);
      setSearchUser("");
      setAllowPastSubmission(false);
      setCutoffTime("");
      setStatus("Active");

      return;
    }

    setChecklistName(
      checklist.checklist_name || ""
    );

    setAllowPastSubmission(
      Boolean(checklist.allow_past_submission)
    );

    setCutoffTime(
      checklist.cutoff_time || ""
    );

    setStatus(
      checklist.status || "Active"
    );

    setSelectedDepartments(
      Array.isArray(checklist.department_ids)
        ? checklist.department_ids
        : []
    );

    setSelectedUsers(
      Array.isArray(checklist.user_ids)
        ? checklist.user_ids
        : []
    );

    setSearchUser("");
  }, [checklist]);

  // =====================================================
  // DEPARTMENT SELECTION
  // =====================================================

  const toggleDepartment = (id) => {
    if (selectedDepartments.includes(id)) {
      setSelectedDepartments(
        selectedDepartments.filter(
          (item) => item !== id
        )
      );
    } else {
      setSelectedDepartments([
        ...selectedDepartments,
        id,
      ]);
    }
  };

  // =====================================================
  // SELECT ALL DEPARTMENTS
  // =====================================================

  const selectAllDepartments = () => {
    if (
      departments.length > 0 &&
      selectedDepartments.length ===
        departments.length
    ) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(
        departments.map(
          (department) => department.id
        )
      );
    }
  };

  // =====================================================
  // USER SELECTION
  // =====================================================

  const toggleUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(
        selectedUsers.filter(
          (item) => item !== id
        )
      );
    } else {
      setSelectedUsers([
        ...selectedUsers,
        id,
      ]);
    }
  };

  // =====================================================
  // FILTER USERS
  // =====================================================

  const filteredUsers = users.filter((user) => {
    const keyword =
      searchUser.toLowerCase().trim();

    if (!keyword) return true;

    return (
      user.name
        ?.toLowerCase()
        .includes(keyword) ||
      user.employee_id
        ?.toLowerCase()
        .includes(keyword) ||
      user.email
        ?.toLowerCase()
        .includes(keyword)
    );
  });

  // =====================================================
  // SELECT ALL USERS
  // =====================================================

  const selectAllUsers = () => {
    const visibleIds = filteredUsers.map(
      (user) => user.id
    );

    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedUsers.includes(id)
      );

    if (allVisibleSelected) {
      setSelectedUsers(
        selectedUsers.filter(
          (id) => !visibleIds.includes(id)
        )
      );
    } else {
      setSelectedUsers([
        ...new Set([
          ...selectedUsers,
          ...visibleIds,
        ]),
      ]);
    }
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!checklistName.trim()) {
      alert("Checklist Name is required.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        checklist_name: checklistName.trim(),

        departments:
          selectedDepartments,

        users:
          selectedUsers,

        allow_past_submission:
          allowPastSubmission ? 1 : 0,

        cutoff_time:
          cutoffTime || null,

        status,
      });
    } catch (err) {
      console.error(err);
      alert("Unable to save checklist type.");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SELECTED COUNTS
  // =====================================================

  const selectedDepartmentCount =
    selectedDepartments.length;

  const selectedUserCount =
    selectedUsers.length;

  const allDepartmentsSelected =
    departments.length > 0 &&
    selectedDepartments.length ===
      departments.length;

  const visibleUserIds =
    filteredUsers.map((user) => user.id);

  const allVisibleUsersSelected =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((id) =>
      selectedUsers.includes(id)
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="modal-overlay checklist-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="checklist-modal checklist-modal-animated"
        role="dialog"
        aria-modal="true"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="checklist-modal-header">
          <div className="checklist-header-content">

            <div className="checklist-header-icon">
              {checklist ? "✎" : "+"}
            </div>

            <div>
              <h2>
                {checklist
                  ? "Edit Checklist Type"
                  : "Add Checklist Type"}
              </h2>

              <p>
                {checklist
                  ? "Update checklist configuration and access."
                  : "Create and configure a new checklist type."}
              </p>
            </div>

          </div>

          <button
            type="button"
            className="checklist-close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <form
          className="checklist-modal-body"
          onSubmit={handleSubmit}
        >

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <section className="checklist-section">

            <div className="checklist-section-heading">

              <span className="section-accent"></span>

              <div>
                <h3>Basic Information</h3>

                <p>
                  Enter the checklist type details.
                </p>
              </div>

            </div>

            <div className="checklist-form-group">

              <label>
                Checklist Name
                <span className="required">*</span>
              </label>

              <input
                type="text"
                placeholder="Enter Checklist Name"
                value={checklistName}
                onChange={(e) =>
                  setChecklistName(e.target.value)
                }
                autoFocus
              />

            </div>

          </section>

          {/* =================================================
              DEPARTMENTS
          ================================================= */}

          <section className="checklist-section">

            <div className="checklist-section-heading section-heading-with-action">

              <div className="heading-left">

                <span className="section-accent"></span>

                <div>
                  <h3>Departments</h3>

                  <p>
                    Select departments that can use this checklist.
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="checklist-select-all-btn"
                onClick={selectAllDepartments}
              >
                {allDepartmentsSelected
                  ? "Unselect All"
                  : "Select All"}
              </button>

            </div>

            <div className="selection-summary">
              <span>
                {selectedDepartmentCount}
              </span>

              {selectedDepartmentCount === 1
                ? " department selected"
                : " departments selected"}
            </div>

            <div className="checklist-checkbox-list">

              {departments.length === 0 ? (

                <div className="checklist-empty">
                  No Departments Found
                </div>

              ) : (

                departments.map((dept) => {

                  const selected =
                    selectedDepartments.includes(
                      dept.id
                    );

                  return (
                    <label
                      key={dept.id}
                      className={
                        selected
                          ? "checklist-option selected"
                          : "checklist-option"
                      }
                    >

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleDepartment(
                            dept.id
                          )
                        }
                      />

                      <span className="custom-check">
                        {selected && "✓"}
                      </span>

                      <span className="option-text">
                        {dept.department_name}
                      </span>

                    </label>
                  );
                })
              )}

            </div>

          </section>

          {/* =================================================
              EMPLOYEES
          ================================================= */}

          <section className="checklist-section">

            <div className="checklist-section-heading section-heading-with-action">

              <div className="heading-left">

                <span className="section-accent"></span>

                <div>
                  <h3>Employees</h3>

                  <p>
                    Assign employees who can access this checklist.
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="checklist-select-all-btn"
                onClick={selectAllUsers}
              >
                {allVisibleUsersSelected
                  ? "Unselect All"
                  : "Select All"}
              </button>

            </div>

            <div className="selection-summary">
              <span>
                {selectedUserCount}
              </span>

              {selectedUserCount === 1
                ? " employee selected"
                : " employees selected"}
            </div>

            {/* Search */}

            <div className="checklist-search-box">

              <span className="search-symbol">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search by Employee ID, Name or Email..."
                value={searchUser}
                onChange={(e) =>
                  setSearchUser(
                    e.target.value
                  )
                }
              />

              {searchUser && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() =>
                    setSearchUser("")
                  }
                >
                  ×
                </button>
              )}

            </div>

            {/* Employee List */}

            <div className="checklist-checkbox-list employee-list">

              {filteredUsers.length === 0 ? (

                <div className="checklist-empty">
                  No Employees Found
                </div>

              ) : (

                filteredUsers.map((user) => {

                  const selected =
                    selectedUsers.includes(
                      user.id
                    );

                  return (
                    <label
                      key={user.id}
                      className={
                        selected
                          ? "checklist-option employee-option selected"
                          : "checklist-option employee-option"
                      }
                    >

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleUser(
                            user.id
                          )
                        }
                      />

                      <span className="custom-check">
                        {selected && "✓"}
                      </span>

                      <span className="employee-avatar">
                        {user.name
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </span>

                      <span className="employee-details">

                        <strong>
                          {user.name}
                        </strong>

                        <small>
                          {user.employee_id}

                          {user.email
                            ? ` • ${user.email}`
                            : ""}
                        </small>

                      </span>

                    </label>
                  );
                })
              )}

            </div>

          </section>

          {/* =================================================
              SUBMISSION SETTINGS
          ================================================= */}

          <section className="checklist-section">

            <div className="checklist-section-heading">

              <span className="section-accent"></span>

              <div>
                <h3>Submission Settings</h3>

                <p>
                  Configure submission rules and checklist status.
                </p>
              </div>

            </div>

            <div className="checklist-settings-grid">

              {/* Past Submission */}

              <label className="setting-card">

                <input
                  type="checkbox"
                  checked={allowPastSubmission}
                  onChange={(e) =>
                    setAllowPastSubmission(
                      e.target.checked
                    )
                  }
                />

                <span className="setting-check">
                  {allowPastSubmission && "✓"}
                </span>

                <span className="setting-content">

                  <strong>
                    Allow Past Date Submission
                  </strong>

                  <small>
                    Allow users to submit checklists for previous dates.
                  </small>

                </span>

              </label>

              {/* Cutoff */}

              <div className="checklist-form-group">

                <label>
                  Daily Submission Cutoff Time
                </label>

                <input
                  type="time"
                  value={cutoffTime}
                  onChange={(e) =>
                    setCutoffTime(
                      e.target.value
                    )
                  }
                />

              </div>

              {/* Status */}

              <div className="checklist-form-group">

                <label>
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
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
              FOOTER
          ================================================= */}

          <div className="checklist-modal-footer">

            <button
              type="button"
              className="checklist-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="checklist-save-btn"
              disabled={saving}
            >

              {saving ? (
                <>
                  <span className="save-spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <span>
                    {checklist ? "✓" : "+"}
                  </span>

                  {checklist
                    ? "Update Checklist"
                    : "Create Checklist"}
                </>
              )}

            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

export default AddChecklistTypeModal;
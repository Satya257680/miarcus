import { useEffect, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

import ProfessionalModal from "./common/ProfessionalModal";

import "../styles/AddChecklistTypeModal.css";

const API = API_BASE_URL + '/api';

function AddChecklistTypeModal({
  checklist,
  onSave,
  onClose,
}) {
  // =====================================================
  // BASIC STATE
  // =====================================================

  const [checklistName, setChecklistName] = useState("");

  // =====================================================
  // DEPARTMENTS
  // =====================================================

  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] =
    useState([]);

  // =====================================================
  // USERS
  // =====================================================

  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] =
    useState([]);

  const [searchUser, setSearchUser] = useState("");

  // =====================================================
  // SUBMISSION SETTINGS
  // =====================================================

  const [allowPastSubmission, setAllowPastSubmission] =
    useState(false);

  const [cutoffTime, setCutoffTime] =
    useState("");

  const [status, setStatus] =
    useState("Active");

  const [saving, setSaving] =
    useState(false);

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
          setDepartments(
            res.data.data || []
          );
        }
      } catch (err) {
        console.error(
          "Department loading error:",
          err
        );

        setDepartments([]);
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
          setUsers(
            res.data.users || []
          );
        }
      } catch (err) {
        console.error(
          "User loading error:",
          err
        );

        setUsers([]);
      }
    };

    loadUsers();
  }, []);

  // =====================================================
  // EDIT / RESET
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
      Boolean(
        checklist.allow_past_submission
      )
    );

    setCutoffTime(
      checklist.cutoff_time || ""
    );

    setStatus(
      checklist.status || "Active"
    );

    setSelectedDepartments(
      Array.isArray(
        checklist.department_ids
      )
        ? checklist.department_ids
        : []
    );

    setSelectedUsers(
      Array.isArray(
        checklist.user_ids
      )
        ? checklist.user_ids
        : []
    );

    setSearchUser("");
  }, [checklist]);

  // =====================================================
  // DEPARTMENT SELECTION
  // =====================================================

  const toggleDepartment = (id) => {
    if (
      selectedDepartments.includes(id)
    ) {
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
          (department) =>
            department.id
        )
      );
    }
  };

  // =====================================================
  // USER SELECTION
  // =====================================================

  const toggleUser = (id) => {
    if (
      selectedUsers.includes(id)
    ) {
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

  const filteredUsers = users.filter(
    (user) => {
      const keyword =
        searchUser
          .toLowerCase()
          .trim();

      if (!keyword) {
        return true;
      }

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
    }
  );

  // =====================================================
  // SELECT ALL USERS
  // =====================================================

  const selectAllUsers = () => {
    const visibleIds =
      filteredUsers.map(
        (user) => user.id
      );

    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every(
        (id) =>
          selectedUsers.includes(id)
      );

    if (allVisibleSelected) {
      setSelectedUsers(
        selectedUsers.filter(
          (id) =>
            !visibleIds.includes(id)
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
      alert(
        "Checklist Name is required."
      );

      return;
    }

    setSaving(true);

    try {
      await onSave({
        checklist_name:
          checklistName.trim(),

        departments:
          selectedDepartments,

        users:
          selectedUsers,

        allow_past_submission:
          allowPastSubmission
            ? 1
            : 0,

        cutoff_time:
          cutoffTime || null,

        status,
      });
    } catch (err) {
      console.error(err);

      alert(
        "Unable to save checklist type."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // COUNTS
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
    filteredUsers.map(
      (user) => user.id
    );

  const allVisibleUsersSelected =
    visibleUserIds.length > 0 &&
    visibleUserIds.every(
      (id) =>
        selectedUsers.includes(id)
    );

  // =====================================================
  // FOOTER
  // =====================================================

  const modalFooter = (
    <div className="professional-modal-footer checklist-modal-footer">

      <button
        type="button"
        className="professional-btn professional-btn-secondary"
        onClick={onClose}
        disabled={saving}
      >
        Cancel
      </button>

      <button
        type="submit"
        form="checklist-type-form"
        className="professional-btn professional-btn-primary checklist-save-button"
        disabled={saving}
      >
        {saving ? (
          <>
            <span className="checklist-spinner"></span>
            Saving...
          </>
        ) : (
          <>
            <span className="professional-btn-icon">
              {checklist ? "✓" : "+"}
            </span>

            <span>
              {checklist
                ? "Update Checklist"
                : "Create Checklist"}
            </span>
          </>
        )}
      </button>

    </div>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <ProfessionalModal
      isOpen={true}
      onClose={saving ? undefined : onClose}
      title={
        checklist
          ? "Edit Checklist Type"
          : "Add Checklist Type"
      }
      subtitle={
        checklist
          ? "Update checklist configuration and access."
          : "Create and configure a new checklist type."
      }
      icon={checklist ? "✎" : "+"}
      size="large"
      footer={modalFooter}
    >

      <form
        id="checklist-type-form"
        className="checklist-professional-form"
        onSubmit={handleSubmit}
      >

        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <section className="professional-form-section">

          <div className="professional-section-heading">

            <div className="professional-section-indicator" />

            <div>
              <h3>
                Basic Information
              </h3>

              <p>
                Enter the checklist type details.
              </p>
            </div>

          </div>

          <div className="professional-field">

            <label htmlFor="checklist-name">
              Checklist Name
              <span className="required">
                *
              </span>
            </label>

            <input
              id="checklist-name"
              type="text"
              placeholder="Enter checklist name"
              value={checklistName}
              onChange={(e) =>
                setChecklistName(
                  e.target.value
                )
              }
              autoFocus
              required
              disabled={saving}
            />

          </div>

        </section>

        {/* =================================================
            DEPARTMENTS
        ================================================= */}

        <section className="professional-form-section">

          <div className="professional-section-heading checklist-heading-row">

            <div className="checklist-heading-left">

              <div className="professional-section-indicator" />

              <div>
                <h3>
                  Departments
                </h3>

                <p>
                  Select departments that can use this checklist.
                </p>
              </div>

            </div>

            <button
              type="button"
              className="checklist-select-all-button"
              onClick={
                selectAllDepartments
              }
              disabled={
                saving ||
                departments.length === 0
              }
            >
              {allDepartmentsSelected
                ? "Unselect All"
                : "Select All"}
            </button>

          </div>

          <div className="checklist-selection-summary">

            <span>
              {selectedDepartmentCount}
            </span>

            {selectedDepartmentCount ===
            1
              ? " department selected"
              : " departments selected"}

          </div>

          <div className="checklist-option-list">

            {departments.length === 0 ? (

              <div className="checklist-empty-state">
                No Departments Found
              </div>

            ) : (

              departments.map(
                (department) => {

                  const selected =
                    selectedDepartments.includes(
                      department.id
                    );

                  return (
                    <label
                      key={
                        department.id
                      }
                      className={`checklist-option-card ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleDepartment(
                            department.id
                          )
                        }
                        disabled={saving}
                      />

                      <span className="checklist-custom-check">
                        {selected
                          ? "✓"
                          : ""}
                      </span>

                      <span className="checklist-option-text">
                        {
                          department.department_name
                        }
                      </span>

                    </label>
                  );
                }
              )

            )}

          </div>

        </section>

        {/* =================================================
            EMPLOYEES
        ================================================= */}

        <section className="professional-form-section">

          <div className="professional-section-heading checklist-heading-row">

            <div className="checklist-heading-left">

              <div className="professional-section-indicator" />

              <div>
                <h3>
                  Employees
                </h3>

                <p>
                  Assign employees who can access this checklist.
                </p>
              </div>

            </div>

            <button
              type="button"
              className="checklist-select-all-button"
              onClick={
                selectAllUsers
              }
              disabled={
                saving ||
                filteredUsers.length === 0
              }
            >
              {allVisibleUsersSelected
                ? "Unselect All"
                : "Select All"}
            </button>

          </div>

          <div className="checklist-selection-summary">

            <span>
              {selectedUserCount}
            </span>

            {selectedUserCount === 1
              ? " employee selected"
              : " employees selected"}

          </div>

          {/* SEARCH */}

          <div className="checklist-search-wrapper">

            <span className="checklist-search-icon">
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
              disabled={saving}
            />

            {searchUser && (
              <button
                type="button"
                className="checklist-clear-search"
                onClick={() =>
                  setSearchUser("")
                }
                disabled={saving}
              >
                ×
              </button>
            )}

          </div>

          {/* EMPLOYEE LIST */}

          <div className="checklist-option-list checklist-employee-list">

            {filteredUsers.length === 0 ? (

              <div className="checklist-empty-state">
                No Employees Found
              </div>

            ) : (

              filteredUsers.map(
                (user) => {

                  const selected =
                    selectedUsers.includes(
                      user.id
                    );

                  const initial =
                    user.name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                    "U";

                  return (
                    <label
                      key={user.id}
                      className={`checklist-option-card checklist-employee-card ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleUser(
                            user.id
                          )
                        }
                        disabled={saving}
                      />

                      <span className="checklist-custom-check">
                        {selected
                          ? "✓"
                          : ""}
                      </span>

                      <span className="checklist-employee-avatar">
                        {initial}
                      </span>

                      <span className="checklist-employee-details">

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
                }
              )

            )}

          </div>

        </section>

        {/* =================================================
            SUBMISSION SETTINGS
        ================================================= */}

        <section className="professional-form-section">

          <div className="professional-section-heading">

            <div className="professional-section-indicator" />

            <div>
              <h3>
                Submission Settings
              </h3>

              <p>
                Configure submission rules and checklist status.
              </p>
            </div>

          </div>

          <div className="checklist-settings-grid">

            {/* PAST SUBMISSION */}

            <label
              className={`checklist-setting-card ${
                allowPastSubmission
                  ? "active"
                  : ""
              }`}
            >

              <input
                type="checkbox"
                checked={
                  allowPastSubmission
                }
                onChange={(e) =>
                  setAllowPastSubmission(
                    e.target.checked
                  )
                }
                disabled={saving}
              />

              <span className="checklist-setting-check">
                {allowPastSubmission
                  ? "✓"
                  : ""}
              </span>

              <span className="checklist-setting-content">

                <strong>
                  Allow Past Date Submission
                </strong>

                <small>
                  Allow users to submit checklists for previous dates.
                </small>

              </span>

            </label>

            {/* CUTOFF */}

            <div className="professional-field">

              <label htmlFor="checklist-cutoff">
                Daily Submission Cutoff Time
              </label>

              <input
                id="checklist-cutoff"
                type="time"
                value={cutoffTime}
                onChange={(e) =>
                  setCutoffTime(
                    e.target.value
                  )
                }
                disabled={saving}
              />

            </div>

            {/* STATUS */}

            <div className="professional-field">

              <label htmlFor="checklist-status">
                Status
              </label>

              <div className="professional-select-wrapper">

                <select
                  id="checklist-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                  disabled={saving}
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

        </section>

      </form>

    </ProfessionalModal>
  );
}

export default AddChecklistTypeModal;
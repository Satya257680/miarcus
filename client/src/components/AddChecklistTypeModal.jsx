import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AddChecklistTypeModal.css";

const API = "http://localhost:5000/api";

function AddChecklistTypeModal({
  checklist,
  onSave,
  onClose,
}) {

  // ===========================
  // States
  // ===========================

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

  // ===========================
  // Load Departments
  // ===========================

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

        console.error(err);

      }

    };

    loadDepartments();

  }, []);

  // ===========================
  // Load Users
  // ===========================

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

        console.error(err);

      }

    };

    loadUsers();

  }, []);

  // ===========================
  // Edit Mode
  // ===========================

  useEffect(() => {

    if (!checklist) return;

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

    if (checklist.departments) {

      setSelectedDepartments(
        Array.isArray(checklist.departments)
          ? checklist.departments
          : []
      );

    }

    if (checklist.users) {

      setSelectedUsers(
        Array.isArray(checklist.users)
          ? checklist.users
          : []
      );

    }

  }, [checklist]);

  // ===========================
  // Department Selection
  // ===========================

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

  const selectAllDepartments = () => {

    if (
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

  // ===========================
  // User Selection
  // ===========================

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

  const filteredUsers = users.filter((user) => {

    const keyword =
      searchUser.toLowerCase();

    return (

      user.name
        ?.toLowerCase()
        .includes(keyword)

      ||

      user.employee_id
        ?.toLowerCase()
        .includes(keyword)

    );

  });

  const selectAllUsers = () => {

    if (
      selectedUsers.length ===
      filteredUsers.length
    ) {

      setSelectedUsers([]);

    } else {

      setSelectedUsers(
        filteredUsers.map(
          (user) => user.id
        )
      );

    }

  };

  // ===========================
  // Save
  // ===========================

  const handleSubmit = async () => {

    if (!checklistName.trim()) {

      alert(
        "Checklist Name is required."
      );

      return;

    }

    setSaving(true);

    try {

      await onSave({

        checklist_name: checklistName,

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

    } finally {

      setSaving(false);

    }

  };
  // ===========================
// Return
// ===========================

return (

  <div className="modal-overlay">

    <div className="checklist-modal">

      {/* ================= Header ================= */}

      <div className="modal-header">

        <h2>
          {checklist
            ? "Edit Checklist Type"
            : "Add Checklist Type"}
        </h2>

        <button
          className="close-btn"
          onClick={onClose}
        >
          ✕
        </button>

      </div>

      {/* ================= Body ================= */}

      <div className="modal-body">

        {/* Checklist Name */}

        <div className="form-group">

          <label>
            Checklist Name <span className="required">*</span>
          </label>

          <input
            type="text"
            placeholder="Enter Checklist Name"
            value={checklistName}
            onChange={(e) =>
              setChecklistName(e.target.value)
            }
          />

        </div>

        {/* Departments */}

        <div className="form-group">

          <div className="section-header">

            <label>Departments</label>

            <button
              type="button"
              className="select-all-btn"
              onClick={selectAllDepartments}
            >
              {selectedDepartments.length === departments.length
                ? "Unselect All"
                : "Select All"}
            </button>

          </div>

          <div className="checkbox-list">

            {departments.length === 0 ? (

              <p>No Departments Found</p>

            ) : (

              departments.map((dept) => (

                <label key={dept.id}>

                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(
                      dept.id
                    )}
                    onChange={() =>
                      toggleDepartment(dept.id)
                    }
                  />

                  {dept.department_name}

                </label>

              ))

            )}

          </div>

        </div>

        {/* Employees */}

        <div className="form-group">

          <div className="section-header">

            <label>Employees</label>

            <button
              type="button"
              className="select-all-btn"
              onClick={selectAllUsers}
            >
              {selectedUsers.length === filteredUsers.length &&
              filteredUsers.length > 0
                ? "Unselect All"
                : "Select All"}
            </button>

          </div>

          <input
            type="text"
            placeholder="Search by Employee ID or Name"
            value={searchUser}
            onChange={(e) =>
              setSearchUser(e.target.value)
            }
          />

          <div className="checkbox-list">

            {filteredUsers.length === 0 ? (

              <p>No Employees Found</p>

            ) : (

              filteredUsers.map((user) => (

                <label key={user.id}>

                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(
                      user.id
                    )}
                    onChange={() =>
                      toggleUser(user.id)
                    }
                  />

                  <strong>{user.employee_id}</strong>
                  {" - "}
                  {user.name}

                </label>

              ))

            )}

          </div>

        </div>

        {/* Allow Past Submission */}

        <div className="form-group checkbox-group">

          <label>

            <input
              type="checkbox"
              checked={allowPastSubmission}
              onChange={(e) =>
                setAllowPastSubmission(
                  e.target.checked
                )
              }
            />

            Allow Past Date Submission

          </label>

        </div>

        {/* Cutoff Time */}

        <div className="form-group">

          <label>Daily Submission Cutoff Time</label>

          <input
            type="time"
            value={cutoffTime}
            onChange={(e) =>
              setCutoffTime(e.target.value)
            }
          />

        </div>

        {/* Status */}

        <div className="form-group">

          <label>Status</label>

          <select
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

      {/* ================= Footer ================= */}

      <div className="modal-footer">

        <button
          className="cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          className="save-btn"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : checklist
            ? "Update Checklist"
            : "Create Checklist"}
        </button>

      </div>

    </div>

  </div>

);

}

export default AddChecklistTypeModal;
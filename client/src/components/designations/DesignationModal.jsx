import { useEffect, useState } from "react";
import "./DesignationModal.css";
import EmployeeList from "../departments/EmployeeList";
import { getUsers } from "../../services/userService";

function DesignationModal({
  isOpen,
  onClose,
  onSave,
  designation,
  departments,
}) {
  const [designationName, setDesignationName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");

  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadUsers();

    if (designation) {
      setDesignationName(designation.designation_name || "");
      setDepartmentId(designation.department_id || "");
      setDescription(designation.description || "");
      setStatus(designation.status || "Active");

      setSelectedUsers(designation.users || []);
    } else {
      setDesignationName("");
      setDepartmentId("");
      setDescription("");
      setStatus("Active");
      setSelectedUsers([]);
    }

    setSearch("");
  }, [designation, isOpen]);

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
      designation_name: designationName,
      description,
      status,
      users: selectedUsers,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">

      <div className="department-modal">

        <div className="modal-header">
          <h2>
            {designation ? "Edit Designation" : "Add Designation"}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Department */}

          <div className="form-group">
            <label>Department</label>

            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Select Department</option>

              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>

          {/* Designation */}

          <div className="form-group">
            <label>Designation Name</label>

            <input
              type="text"
              value={designationName}
              onChange={(e) => setDesignationName(e.target.value)}
              placeholder="Enter Designation Name"
            />
          </div>

          {/* Description */}

          <div className="form-group">
            <label>Description</label>

            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter Description"
            />
          </div>

          {/* Status */}

          <div className="form-group">
            <label>Status</label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* Employees */}

          <EmployeeList
            users={users}
            search={search}
            setSearch={setSearch}
            selectedUsers={selectedUsers}
            setSelectedUsers={setSelectedUsers}
          />

          {/* Buttons */}

          <div className="modal-buttons">

            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-btn"
            >
              {designation ? "Update" : "Create"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default DesignationModal;
import { useEffect, useState } from "react";
import "./DepartmentModal.css";
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

  useEffect(() => {
    if (!isOpen) return;

    loadUsers();

    if (department) {
      setDepartmentName(department.department_name || "");
      setDescription(department.description || "");
      setStatus(department.status || "Active");

      // If your API returns assigned users
      setSelectedUsers(department.users || []);
    } else {
      setDepartmentName("");
      setDescription("");
      setStatus("Active");
      setSelectedUsers([]);
    }

    setSearch("");
  }, [department, isOpen]);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!departmentName.trim()) {
      alert("Department Name is required");
      return;
    }

    onSave({
      department_name: departmentName,
      description,
      status,
      users: selectedUsers,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">

      <div className="department-modal">

        {/* Header */}

        <div className="modal-header">
          <h2>
            {department ? "Edit Department" : "Add Department"}
          </h2>
        </div>

        {/* Form */}

        <form onSubmit={handleSubmit}>

          {/* Department Name */}

          <div className="form-group">
            <label>Department Name</label>

            <input
              type="text"
              value={departmentName}
              onChange={(e) =>
                setDepartmentName(e.target.value)
              }
              placeholder="Enter Department Name"
            />
          </div>

          {/* Description */}

          <div className="form-group">
            <label>Description</label>

            <textarea
              rows="3"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Enter Description"
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

          {/* Footer */}

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
              {department ? "Update" : "Create"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default DepartmentModal;
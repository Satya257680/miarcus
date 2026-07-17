import { useEffect, useState } from "react";
import axios from "axios";

function AddReportModal({
  editData,
  closeModal,
  refresh,
}) {
  const [managerName, setManagerName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    if (editData) {
      setManagerName(editData.manager_name || "");
      setDepartment(editData.department || "");
      setDesignation(editData.designation || "");
      setStatus(editData.status || "Active");
    }
  }, [editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      manager_name: managerName,
      department,
      designation,
      status,
    };

    try {
      if (editData) {
        await axios.put(
          `http://localhost:5000/api/reports/${editData.id}`,
          data
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/reports",
          data
        );
      }

      refresh();
      closeModal();

    }catch (err) {
  console.error(err);

  console.log("Response:", err.response?.data);

  alert(
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message
  );
}
  };

  return (
    <div className="modal-overlay">
      <div className="modal">

        <h2>{editData ? "Edit Manager" : "Add Manager"}</h2>

        <form onSubmit={handleSubmit}>

          {/* Manager Name */}

          <label>Manager Name</label>

          <input
            type="text"
            placeholder="Enter Manager Name"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            required
          />

          {/* Department */}

          <label>Department</label>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          >
            <option value="">Select Department</option>

            <option>Accounts</option>
            <option>Buying</option>
            <option>Customer Support</option>
            <option>Design</option>
            <option>E-commerce</option>
            <option>HR</option>
            <option>IT Department</option>
            <option>Maintenance</option>
            <option>Management</option>
            <option>Marketing</option>
            <option>Quality</option>
            <option>Store Personnel</option>
            <option>VM</option>
            <option>Warehouse</option>
          </select>

          {/* Designation */}

          <label>Designation</label>

          <select
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            required
          >
            <option value="">Select Designation</option>

            <option>Manager</option>
            <option>ASM</option>
            <option>Regional Head</option>
            <option>City Manager</option>
            <option>Team Lead</option>
            <option>Supervisor</option>
            <option>Executive</option>
          </select>

          {/* Status */}

          <label>Status</label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <div className="modal-buttons">
            <button
              type="button"
              onClick={closeModal}
            >
              Cancel
            </button>

            <button type="submit">
              {editData ? "Update" : "Save"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default AddReportModal;
import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AddReportModal.css";

function AddReportModal({
  editData,
  closeModal,
  refresh,
}) {
  const [managerName, setManagerName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("Active");

  // =====================================================
  // LOAD EDIT DATA
  // =====================================================

  useEffect(() => {
    if (editData) {
      setManagerName(editData.manager_name || "");
      setDepartment(editData.department || "");
      setDesignation(editData.designation || "");
      setStatus(editData.status || "Active");
    } else {
      setManagerName("");
      setDepartment("");
      setDesignation("");
      setStatus("Active");
    }
  }, [editData]);

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!managerName.trim()) {
      alert("Manager Name is required.");
      return;
    }

    if (!department) {
      alert("Please select a Department.");
      return;
    }

    if (!designation) {
      alert("Please select a Designation.");
      return;
    }

    const data = {
      manager_name: managerName.trim(),
      department,
      designation,
      status,
    };

    try {
      if (editData) {
        await axios.put(
          `https://miarcus-backend.onrender.com/api/reports/${editData.id}`,
          data
        );
      } else {
        await axios.post(
          "https://miarcus-backend.onrender.com/api/reports",
          data
        );
      }

      refresh();
      closeModal();
    } catch (err) {
      console.error("Report save error:", err);
      console.log("Response:", err.response?.data);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Unable to save manager."
      );
    }
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    setManagerName("");
    setDepartment("");
    setDesignation("");
    setStatus("Active");

    closeModal();
  };

  return (
    <div className="report-modal-overlay">

      <div className="report-modal">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="report-modal-header">

          <div>
            <h2>
              {editData ? "Edit Manager" : "Add Manager"}
            </h2>

            <p>
              {editData
                ? "Update manager information"
                : "Create a new reporting manager"}
            </p>
          </div>

          <button
            type="button"
            className="report-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          className="report-modal-form"
          onSubmit={handleSubmit}
        >

          {/* Manager Name */}

          <div className="report-form-group">

            <label htmlFor="managerName">
              Manager Name
              <span className="required-star">*</span>
            </label>

            <input
              id="managerName"
              type="text"
              placeholder="Enter manager name"
              value={managerName}
              onChange={(e) =>
                setManagerName(e.target.value)
              }
              autoComplete="off"
            />

          </div>

          {/* Department */}

          <div className="report-form-group">

            <label htmlFor="department">
              Department
              <span className="required-star">*</span>
            </label>

            <select
              id="department"
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
            >

              <option value="">
                Select Department
              </option>

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

          </div>

          {/* Designation */}

          <div className="report-form-group">

            <label htmlFor="designation">
              Designation
              <span className="required-star">*</span>
            </label>

            <select
              id="designation"
              value={designation}
              onChange={(e) =>
                setDesignation(e.target.value)
              }
            >

              <option value="">
                Select Designation
              </option>

              <option>Manager</option>
              <option>ASM</option>
              <option>Regional Head</option>
              <option>City Manager</option>
              <option>Team Lead</option>
              <option>Supervisor</option>
              <option>Executive</option>

            </select>

          </div>

          {/* Status */}

          <div className="report-form-group">

            <label htmlFor="status">
              Status
            </label>

            <select
              id="status"
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

          {/* =================================================
              FOOTER BUTTONS
          ================================================= */}

          <div className="report-modal-buttons">

            <button
              type="button"
              className="report-cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="report-save-btn"
            >
              {editData ? "Update Manager" : "Save Manager"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default AddReportModal;
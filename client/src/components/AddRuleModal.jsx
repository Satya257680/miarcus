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

  const [saving, setSaving] = useState(false);

  // =====================================================
  // DEPARTMENT OPTIONS
  // =====================================================

  const departmentOptions = [
    "Accounts",
    "Buying",
    "Customer Support",
    "Design",
    "E-commerce",
    "HR",
    "IT Department",
    "Maintenance",
    "Management",
    "Marketing",
    "Quality",
    "Store Personnel",
    "VM",
    "Warehouse",
  ];

  // =====================================================
  // DESIGNATION OPTIONS
  // =====================================================

  const designationOptions = [
    "Manager",
    "ASM",
    "Regional Head",
    "City Manager",
    "Team Lead",
    "Supervisor",
    "Executive",
  ];

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
      resetForm();
    }
  }, [editData]);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setManagerName("");
    setDepartment("");
    setDesignation("");
    setStatus("Active");
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const handleClose = () => {
    if (saving) return;

    resetForm();
    closeModal();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // SAVE
    // -----------------------------------------------------

    try {
      setSaving(true);

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

      // Refresh parent table
      if (typeof refresh === "function") {
        await refresh();
      }

      // Close modal
      resetForm();
      closeModal();

    } catch (err) {
      console.error("Report save error:", err);

      console.log(
        "Response:",
        err.response?.data
      );

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Unable to save manager."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="report-modal-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !saving
        ) {
          handleClose();
        }
      }}
    >
      <div
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="report-modal-header">

          <div className="report-header-content">

            <div className="report-modal-icon">
              <span>
                {editData ? "✎" : "+"}
              </span>
            </div>

            <div className="report-header-text">

              <h2 id="report-modal-title">
                {editData
                  ? "Edit Manager"
                  : "Add Manager"}
              </h2>

              <p>
                {editData
                  ? "Update manager information and reporting details."
                  : "Create a new reporting manager for your organization."}
              </p>

            </div>

          </div>

          <button
            type="button"
            className="report-close-btn"
            onClick={handleClose}
            disabled={saving}
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
          className="report-modal-form"
          onSubmit={handleSubmit}
        >

          {/* =================================================
              INFORMATION SECTION
          ================================================= */}

          <div className="report-form-section">

            <div className="report-section-title">

              <span className="report-section-line"></span>

              <div>
                <h3>Manager Information</h3>

                <p>
                  Enter the manager's organizational details.
                </p>
              </div>

            </div>

            {/* =================================================
                FORM GRID
            ================================================= */}

            <div className="report-form-grid">

              {/* =================================================
                  MANAGER NAME
              ================================================= */}

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
                  disabled={saving}
                />

              </div>

              {/* =================================================
                  DEPARTMENT
              ================================================= */}

              <div className="report-form-group">

                <label htmlFor="department">
                  Department
                  <span className="required-star">*</span>
                </label>

                <div className="report-select-wrapper">

                  <select
                    id="department"
                    value={department}
                    onChange={(e) =>
                      setDepartment(e.target.value)
                    }
                    disabled={saving}
                  >

                    <option value="">
                      Select Department
                    </option>

                    {departmentOptions.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              {/* =================================================
                  DESIGNATION
              ================================================= */}

              <div className="report-form-group">

                <label htmlFor="designation">
                  Designation
                  <span className="required-star">*</span>
                </label>

                <div className="report-select-wrapper">

                  <select
                    id="designation"
                    value={designation}
                    onChange={(e) =>
                      setDesignation(e.target.value)
                    }
                    disabled={saving}
                  >

                    <option value="">
                      Select Designation
                    </option>

                    {designationOptions.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              {/* =================================================
                  STATUS
              ================================================= */}

              <div className="report-form-group">

                <label htmlFor="status">
                  Status
                </label>

                <div className="report-select-wrapper">

                  <select
                    id="status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value)
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

          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="report-modal-footer">

            <button
              type="button"
              className="report-cancel-btn"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="report-save-btn"
              disabled={saving}
            >

              {saving ? (
                <>
                  <span className="report-spinner"></span>

                  <span>
                    {editData
                      ? "Updating..."
                      : "Saving..."}
                  </span>
                </>
              ) : (
                <>
                  <span className="report-save-icon">
                    {editData ? "✓" : "+"}
                  </span>

                  <span>
                    {editData
                      ? "Update Manager"
                      : "Save Manager"}
                  </span>
                </>
              )}

            </button>

          </div>

        </form>

      </div>
    </div>
  );
}

export default AddReportModal;
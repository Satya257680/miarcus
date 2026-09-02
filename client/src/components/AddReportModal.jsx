import { useEffect, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import { getDepartments } from "../services/departmentService.js";
import { getDesignations } from "../services/designationService.js";
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
  // MASTER DATA — ALWAYS USE CURRENT DEPARTMENTS/DESIGNATIONS
  // =====================================================

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadMasterData = async () => {
      try {
        const [departmentResponse, designationResponse] =
          await Promise.all([
            getDepartments(),
            getDesignations(),
          ]);

        if (!mounted) return;

        const departmentRows =
          departmentResponse?.data ||
          departmentResponse?.departments ||
          [];

        const designationRows =
          designationResponse?.data ||
          designationResponse?.designations ||
          [];

        setDepartments(
          Array.isArray(departmentRows) ? departmentRows : []
        );
        setDesignations(
          Array.isArray(designationRows) ? designationRows : []
        );
      } catch (error) {
        console.error(
          "Failed to load current departments/designations:",
          error
        );
        if (mounted) {
          setDepartments([]);
          setDesignations([]);
        }
      }
    };

    loadMasterData();

    return () => {
      mounted = false;
    };
  }, []);

  const activeDepartments = departments.filter(
    (department) =>
      String(department.status || "Active").toLowerCase() !== "inactive"
  );

  const selectedDepartmentId =
    activeDepartments.find(
      (item) => item.department_name === department
    )?.id ||
    departments.find(
      (item) => item.department_name === department
    )?.id;

  const currentDesignations = designations.filter(
    (item) => {
      const isActive =
        String(item.status || "Active").toLowerCase() !== "inactive";

      if (!selectedDepartmentId) return isActive;

      return (
        isActive &&
        String(item.department_id) === String(selectedDepartmentId)
      );
    }
  );

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
  // CLOSE
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
      setSaving(true);

      if (editData) {
        await axios.put(
          `${API_BASE_URL}/api/reports/${editData.id}`,
          data
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/reports`,
          data
        );
      }

      await refresh();

      resetForm();
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
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div
      className="professional-modal-overlay report-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) {
          handleClose();
        }
      }}
    >
      <div
        className="professional-modal report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="professional-modal-header report-modal-header">
          <div className="professional-modal-header-content">
            <div className="professional-modal-icon report-modal-icon">
              <span>{editData ? "✎" : "+"}</span>
            </div>

            <div>
              <h2 id="report-modal-title">
                {editData ? "Edit Manager" : "Add Manager"}
              </h2>

              <p>
                {editData
                  ? "Update reporting manager information."
                  : "Create a new reporting manager."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="professional-modal-close"
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
          className="professional-modal-form report-modal-form"
          onSubmit={handleSubmit}
        >
          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <div className="professional-form-section">
            <div className="professional-section-title">
              <span className="professional-section-line"></span>

              <div>
                <h3>Manager Information</h3>

                <p>
                  Enter the reporting manager details below.
                </p>
              </div>
            </div>

            <div className="professional-form-grid">
              {/* =================================================
                  MANAGER NAME
              ================================================= */}

              <div className="professional-form-group">
                <label htmlFor="manager-name">
                  Manager Name
                  <span className="required-star">*</span>
                </label>

                <input
                  id="manager-name"
                  type="text"
                  value={managerName}
                  onChange={(e) =>
                    setManagerName(e.target.value)
                  }
                  placeholder="Enter manager name"
                  autoComplete="off"
                  disabled={saving}
                />
              </div>

              {/* =================================================
                  DEPARTMENT
              ================================================= */}

              <div className="professional-form-group">
                <label htmlFor="manager-department">
                  Department
                  <span className="required-star">*</span>
                </label>

                <div className="professional-select-wrapper">
                  <select
                    id="manager-department"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setDesignation("");
                    }}
                    disabled={saving}
                  >
                    <option value="">
                      Select Department
                    </option>

                    {activeDepartments.map((item) => {
                      const value =
                        item?.department_name ??
                        item?.name ??
                        item?.department ??
                        (typeof item === "string" ? item : "");
                      const key = item?.id ?? value;

                      if (!value) return null;

                      return (
                        <option key={key} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* =================================================
                  DESIGNATION
              ================================================= */}

              <div className="professional-form-group">
                <label htmlFor="manager-designation">
                  Designation
                  <span className="required-star">*</span>
                </label>

                <div className="professional-select-wrapper">
                  <select
                    id="manager-designation"
                    value={designation}
                    onChange={(e) =>
                      setDesignation(e.target.value)
                    }
                    disabled={saving}
                  >
                    <option value="">
                      Select Designation
                    </option>

                    {currentDesignations.map((item) => {
                      const value =
                        item?.designation_name ??
                        item?.name ??
                        item?.designation ??
                        (typeof item === "string" ? item : "");
                      const key = item?.id ?? value;

                      if (!value) return null;

                      return (
                        <option key={key} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* =================================================
                  STATUS
              ================================================= */}

              <div className="professional-form-group">
                <label htmlFor="manager-status">
                  Status
                </label>

                <div className="professional-select-wrapper">
                  <select
                    id="manager-status"
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

          <div className="professional-modal-footer report-modal-buttons">
            <button
              type="button"
              className="professional-cancel-btn"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="professional-save-btn"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="professional-spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="professional-save-icon">
                    {editData ? "✓" : "+"}
                  </span>

                  <span>
                    {editData
                      ? "Update Manager"
                      : "Create Manager"}
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
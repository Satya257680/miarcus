import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/CreatePointModal.css";

const API = "https://miarcus-backend.onrender.com";

function CreatePointModal({
  isOpen,
  onClose,
  onSuccess,
  submissionId = null,
}) {
  const [stores, setStores] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [formData, setFormData] = useState({
    submission_id: submissionId || "",
    store_id: "",
    department_id: "",
    question_id: "",
    answer: "",
    remarks: "",
    sla_value: "",
    sla_type: "Hours",
  });

  // ==========================================================
  // UPDATE SUBMISSION ID
  // ==========================================================

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      submission_id: submissionId || "",
    }));
  }, [submissionId]);

  // ==========================================================
  // LOAD DROPDOWN DATA
  // ==========================================================

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoadingData(true);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {};

      const [storeRes, deptRes, questionRes] = await Promise.all([
        axios.get(`${API}/api/stores`, {
          headers,
        }),

        axios.get(`${API}/api/departments`, {
          headers,
        }),

        axios.get(`${API}/api/questions`, {
          headers,
        }),
      ]);

      setStores(
        storeRes.data?.data ||
          storeRes.data?.stores ||
          []
      );

      setDepartments(
        deptRes.data?.data ||
          deptRes.data?.departments ||
          []
      );

      setQuestions(
        questionRes.data?.data ||
          questionRes.data?.questions ||
          []
      );
    } catch (error) {
      console.error(
        "CREATE ACTION POINT - LOAD DATA ERROR:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Unable to load dropdown data.";

      alert(message);
    } finally {
      setLoadingData(false);
    }
  };

  // ==========================================================
  // HANDLE CHANGE
  // ==========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================================
  // HANDLE FILE
  // ==========================================================

  const handleFile = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setFormData({
      submission_id: submissionId || "",
      store_id: "",
      department_id: "",
      question_id: "",
      answer: "",
      remarks: "",
      sla_value: "",
      sla_type: "Hours",
    });

    setFile(null);
  };

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    resetForm();
    onClose();
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!formData.store_id) {
      alert("Please select a Store.");
      return;
    }

    if (!formData.department_id) {
      alert("Please select a Department.");
      return;
    }

    if (!formData.question_id) {
      alert("Please select a Question.");
      return;
    }

    if (!formData.answer.trim()) {
      alert("Please enter the Submission Answer.");
      return;
    }

    if (
      !formData.sla_value ||
      Number(formData.sla_value) <= 0
    ) {
      alert("Please enter a valid SLA value.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();

      // ------------------------------------------------------
      // SUBMISSION ID
      // ------------------------------------------------------

      if (formData.submission_id) {
        data.append(
          "submission_id",
          String(formData.submission_id)
        );
      }

      // ------------------------------------------------------
      // STORE
      // ------------------------------------------------------

      data.append(
        "store_id",
        String(formData.store_id)
      );

      // ------------------------------------------------------
      // DEPARTMENT
      // ------------------------------------------------------

      data.append(
        "department_id",
        String(formData.department_id)
      );

      // ------------------------------------------------------
      // QUESTION
      // ------------------------------------------------------

      data.append(
        "question_id",
        String(formData.question_id)
      );

      // ------------------------------------------------------
      // ANSWER
      // ------------------------------------------------------

      data.append(
        "answer",
        formData.answer.trim()
      );

      // ------------------------------------------------------
      // REMARKS
      // ------------------------------------------------------

      data.append(
        "remarks",
        formData.remarks || ""
      );

      // ------------------------------------------------------
      // SLA VALUE
      // ------------------------------------------------------

      data.append(
        "sla_value",
        String(formData.sla_value)
      );

      // ------------------------------------------------------
      // SLA TYPE
      // ------------------------------------------------------

      data.append(
        "sla_type",
        formData.sla_type
      );

      // ------------------------------------------------------
      // SLA BACKEND COMPATIBILITY
      // ------------------------------------------------------

      data.append(
        "sla",
        `${formData.sla_value} ${formData.sla_type}`
      );

      // ------------------------------------------------------
      // ATTACHMENT
      // ------------------------------------------------------

      if (file) {
        data.append(
          "attachment",
          file
        );
      }

      // ------------------------------------------------------
      // AUTH TOKEN
      // ------------------------------------------------------

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      const headers = {};

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      // ------------------------------------------------------
      // DEBUG
      // ------------------------------------------------------

      console.log(
        "CREATE ACTION POINT DATA:"
      );

      console.log({
        submission_id:
          formData.submission_id || null,

        store_id:
          formData.store_id,

        department_id:
          formData.department_id,

        question_id:
          formData.question_id,

        answer:
          formData.answer,

        remarks:
          formData.remarks,

        sla_value:
          formData.sla_value,

        sla_type:
          formData.sla_type,

        attachment:
          file?.name || null,
      });

      // ------------------------------------------------------
      // API REQUEST
      // ------------------------------------------------------

      const res = await axios.post(
        `${API}/api/action-points`,
        data,
        {
          headers,
        }
      );

      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      alert(
        res.data?.message ||
          "Action Point created successfully."
      );

      resetForm();

      if (onSuccess) {
        await onSuccess();
      }

      onClose();

    } catch (error) {
      console.error(
        "CREATE ACTION POINT ERROR:",
        error
      );

      if (error.response) {
        console.error(
          "STATUS:",
          error.response.status
        );

        console.error(
          "RESPONSE:",
          error.response.data
        );

        const backendMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          "Unable to create Action Point.";

        if (
          backendMessage
            .toLowerCase()
            .includes("submission")
        ) {
          alert(
            `${backendMessage}\n\n` +
            `If you are creating an Action Point manually, ` +
            `the backend must allow submission_id to be NULL.`
          );
        } else {
          alert(backendMessage);
        }

      } else if (error.request) {

        alert(
          "Backend server did not respond."
        );

      } else {

        alert(
          "Unable to create Action Point."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // DO NOT RENDER WHEN CLOSED
  // ==========================================================

  if (!isOpen) {
    return null;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="modal-overlay action-point-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !loading
        ) {
          handleClose();
        }
      }}
    >

      <div
        className="create-modal action-point-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-point-title"
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="action-point-header">

          <div className="action-point-header-content">

            <div className="action-point-header-icon">
              <span>✓</span>
            </div>

            <div>

              <h2 id="action-point-title">
                Create Action Point
              </h2>

              <p>
                Create and assign a new action point
              </p>

            </div>

          </div>

          <button
            type="button"
            className="action-point-close"
            onClick={handleClose}
            disabled={loading}
            title="Close"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        {/* ==================================================
            BODY
        ================================================== */}

        <div className="action-point-body">

          {/* ==================================================
              CREATION TYPE
          ================================================== */}

          <div className="creation-info">

            {formData.submission_id ? (
              <div className="creation-status checklist-status">

                <div className="creation-status-icon">
                  ✓
                </div>

                <div>
                  <strong>
                    Checklist Action Point
                  </strong>

                  <small>
                    Submission ID:{" "}
                    {formData.submission_id}
                  </small>
                </div>

              </div>
            ) : (
              <div className="creation-status manual-status">

                <div className="creation-status-icon">
                  +
                </div>

                <div>
                  <strong>
                    Manual Action Point
                  </strong>

                  <small>
                    This Action Point is being
                    created manually.
                  </small>
                </div>

              </div>
            )}

          </div>

          {/* ==================================================
              LOADING
          ================================================== */}

          {loadingData ? (

            <div className="action-point-loading">

              <div className="loading-spinner"></div>

              <span>
                Loading form data...
              </span>

            </div>

          ) : (

            <form
              onSubmit={handleSubmit}
              className="action-point-form"
            >

              {/* ==================================================
                  BASIC INFORMATION
              ================================================== */}

              <div className="action-point-section">

                <div className="action-section-title">

                  <span className="section-accent"></span>

                  <div>
                    <h3>
                      Action Point Information
                    </h3>

                    <p>
                      Select the location, department
                      and checklist question.
                    </p>
                  </div>

                </div>

                <div className="action-form-grid">

                  {/* STORE */}

                  <div className="action-form-group">

                    <label htmlFor="action-store">
                      Store / Location
                      <span className="required-star">
                        *
                      </span>
                    </label>

                    <select
                      id="action-store"
                      name="store_id"
                      value={formData.store_id}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    >

                      <option value="">
                        Select Store / Location
                      </option>

                      {stores.map((store) => (

                        <option
                          key={store.id}
                          value={store.id}
                        >
                          {store.store_name ||
                            store.name ||
                            "Unnamed Store"}

                          {store.store_code
                            ? ` (${store.store_code})`
                            : ""}
                        </option>

                      ))}

                    </select>

                  </div>

                  {/* DEPARTMENT */}

                  <div className="action-form-group">

                    <label htmlFor="action-department">
                      Department
                      <span className="required-star">
                        *
                      </span>
                    </label>

                    <select
                      id="action-department"
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    >

                      <option value="">
                        Select Department
                      </option>

                      {departments.map((dept) => (

                        <option
                          key={dept.id}
                          value={dept.id}
                        >
                          {dept.department_name ||
                            dept.name ||
                            "Unnamed Department"}
                        </option>

                      ))}

                    </select>

                  </div>

                  {/* QUESTION */}

                  <div className="action-form-group action-full-width">

                    <label htmlFor="action-question">
                      Question
                      <span className="required-star">
                        *
                      </span>
                    </label>

                    <select
                      id="action-question"
                      name="question_id"
                      value={formData.question_id}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    >

                      <option value="">
                        Select Question
                      </option>

                      {questions.map((question) => (

                        <option
                          key={question.id}
                          value={question.id}
                        >
                          {question.question ||
                            question.question_text ||
                            "Unnamed Question"}
                        </option>

                      ))}

                    </select>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  ACTION DETAILS
              ================================================== */}

              <div className="action-point-section">

                <div className="action-section-title">

                  <span className="section-accent"></span>

                  <div>
                    <h3>
                      Action Details
                    </h3>

                    <p>
                      Provide the answer, SLA and
                      supporting information.
                    </p>
                  </div>

                </div>

                <div className="action-form-grid">

                  {/* SLA */}

                  <div className="action-form-group">

                    <label>
                      SLA
                      <span className="required-star">
                        *
                      </span>
                    </label>

                    <div className="sla-row">

                      <input
                        type="number"
                        name="sla_value"
                        placeholder="SLA Value"
                        min="1"
                        value={formData.sla_value}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />

                      <select
                        name="sla_type"
                        value={formData.sla_type}
                        onChange={handleChange}
                        disabled={loading}
                      >

                        <option value="Hours">
                          Hours
                        </option>

                        <option value="Days">
                          Days
                        </option>

                      </select>

                    </div>

                  </div>

                  {/* ANSWER */}

                  <div className="action-form-group">

                    <label htmlFor="action-answer">
                      Submission Answer
                      <span className="required-star">
                        *
                      </span>
                    </label>

                    <input
                      id="action-answer"
                      type="text"
                      name="answer"
                      placeholder="Enter Submission Answer"
                      value={formData.answer}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />

                  </div>

                  {/* REMARKS */}

                  <div className="action-form-group action-full-width">

                    <label htmlFor="action-remarks">
                      Remarks
                    </label>

                    <textarea
                      id="action-remarks"
                      rows="4"
                      name="remarks"
                      placeholder="Enter remarks (optional)"
                      value={formData.remarks}
                      onChange={handleChange}
                      disabled={loading}
                    />

                  </div>

                  {/* ATTACHMENT */}

                  <div className="action-form-group action-full-width">

                    <label>
                      Attachment
                      <span className="optional-text">
                        Optional
                      </span>
                    </label>

                    <div className="file-upload-box">

                      <input
                        id="action-attachment"
                        type="file"
                        onChange={handleFile}
                        disabled={loading}
                      />

                      <label
                        htmlFor="action-attachment"
                        className="file-upload-label"
                      >

                        <span className="file-upload-icon">
                          ↑
                        </span>

                        <span>
                          {file
                            ? "Change attachment"
                            : "Choose attachment"}
                        </span>

                      </label>

                      {file && (

                        <div className="selected-file">

                          <span className="file-check">
                            ✓
                          </span>

                          <span>
                            {file.name}
                          </span>

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  FOOTER
              ================================================== */}

              <div className="action-point-footer">

                <button
                  type="button"
                  className="action-cancel-btn"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="action-create-btn"
                  disabled={
                    loading ||
                    loadingData
                  }
                >

                  {loading ? (
                    <>
                      <span className="button-spinner"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span className="create-button-icon">
                        +
                      </span>
                      Create Action Point
                    </>
                  )}

                </button>

              </div>

            </form>

          )}

        </div>

      </div>

    </div>
  );
}

export default CreatePointModal;
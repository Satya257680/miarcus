import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/CreatePointModal.css";
import "../styles/common/ProfessionalModal.css";

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
  // UPDATE SUBMISSION ID WHEN PARENT CHANGES IT
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
  // CLOSE
  // ==========================================================

  if (!isOpen) {
    return null;
  }

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

    // ========================================================
    // VALIDATION
    // ========================================================

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

    // Backend currently requires Submission Answer.
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

    // ========================================================
    // IMPORTANT
    //
    // submission_id is OPTIONAL for manual Action Point
    // creation.
    //
    // If this Action Point was opened from a checklist
    // submission, submission_id will be sent.
    //
    // If user clicked "Add Action Point" directly from the
    // Action Points page, submission_id will NOT be sent.
    // ========================================================

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
      // SLA
      //
      // Keep this for backend compatibility.
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

      // ======================================================
      // AUTH TOKEN
      // ======================================================

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      const headers = {};

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      // ======================================================
      // DEBUG
      // ======================================================

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

      // ======================================================
      // API REQUEST
      // ======================================================

      const res = await axios.post(
        `${API}/api/action-points`,
        data,
        {
          headers,
        }
      );

      // ======================================================
      // SUCCESS
      // ======================================================

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

      // ======================================================
      // BACKEND ERROR
      // ======================================================

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

        // ----------------------------------------------------
        // SPECIAL MESSAGE
        // ----------------------------------------------------

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
  // RENDER
  // ==========================================================

  return (
    <div className="modal-overlay">

      <div className="create-modal">

        <h2>
          Create Action Point
        </h2>

        {/* ==================================================
            CREATION TYPE INFORMATION
        ================================================== */}

        <div className="creation-info">

          {formData.submission_id ? (
            <>
              <span className="creation-badge checklist">
                Checklist Action Point
              </span>

              <small>
                Submission ID:{" "}
                {formData.submission_id}
              </small>
            </>
          ) : (
            <>
              <span className="creation-badge manual">
                Manual Action Point
              </span>

              <small>
                This Action Point is being created manually.
              </small>
            </>
          )}

        </div>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loadingData ? (

          <div className="loading-message">
            Loading...
          </div>

        ) : (

          <form onSubmit={handleSubmit}>

            {/* ==================================================
                STORE
            ================================================== */}

            <label>
              Store / Location
            </label>

            <select
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

            {/* ==================================================
                DEPARTMENT
            ================================================== */}

            <label>
              Department
            </label>

            <select
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

            {/* ==================================================
                QUESTION
            ================================================== */}

            <label>
              Question
            </label>

            <select
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

            {/* ==================================================
                SLA
            ================================================== */}

            <label>
              SLA
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

            {/* ==================================================
                ANSWER
            ================================================== */}

            <label>
              Submission Answer
            </label>

            <input
              type="text"
              name="answer"
              placeholder="Enter Submission Answer"
              value={formData.answer}
              onChange={handleChange}
              required
              disabled={loading}
            />

            {/* ==================================================
                REMARKS
            ================================================== */}

            <label>
              Remarks
            </label>

            <textarea
              rows="4"
              name="remarks"
              placeholder="Remarks (optional)"
              value={formData.remarks}
              onChange={handleChange}
              disabled={loading}
            />

            {/* ==================================================
                ATTACHMENT
            ================================================== */}

            <label className="upload-label">
              Attachment (optional)
            </label>

            <input
              type="file"
              onChange={handleFile}
              disabled={loading}
            />

            {file && (
              <div className="selected-file">
                Selected: {file.name}
              </div>
            )}

            {/* ==================================================
                BUTTONS
            ================================================== */}

            <div className="modal-buttons">

              <button
                type="button"
                className="cancel-btn"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-btn"
                disabled={loading || loadingData}
              >

                {loading
                  ? "Creating..."
                  : "Create Point"}

              </button>

            </div>

          </form>

        )}

      </div>

    </div>
  );
}

export default CreatePointModal;
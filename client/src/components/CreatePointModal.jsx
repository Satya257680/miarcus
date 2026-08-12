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

  // ======================================================
  // UPDATE SUBMISSION ID WHEN PARENT CHANGES IT
  // ======================================================

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      submission_id: submissionId || "",
    }));
  }, [submissionId]);

  // ======================================================
  // LOAD DROPDOWN DATA
  // ======================================================

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

      const [storeRes, deptRes, questionRes] =
        await Promise.all([
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

  // ======================================================
  // CLOSE
  // ======================================================

  if (!isOpen) {
    return null;
  }

  // ======================================================
  // HANDLE CHANGE
  // ======================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ======================================================
  // HANDLE FILE
  // ======================================================

  const handleFile = (e) => {
    const selectedFile = e.target.files?.[0] || null;

    setFile(selectedFile);
  };

  // ======================================================
  // RESET FORM
  // ======================================================

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

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    resetForm();
    onClose();
  };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    // ==================================================
    // VALIDATION
    // ==================================================

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

    if (
      !formData.sla_value ||
      Number(formData.sla_value) <= 0
    ) {
      alert("Please enter a valid SLA value.");
      return;
    }

    /*
     * IMPORTANT:
     *
     * submission_id is required by the current backend/database
     * because an Action Point is linked to the checklist answer.
     *
     * DO NOT hard-code submission_id = 28.
     */

    if (!formData.submission_id) {
      alert(
        "No checklist submission is selected. Please open this Action Point from a checklist submission."
      );
      return;
    }

    // ==================================================
    // START
    // ==================================================

    setLoading(true);

    try {
      const data = new FormData();

      // ------------------------------------------------
      // CHECKLIST SUBMISSION
      // ------------------------------------------------

      data.append(
        "submission_id",
        String(formData.submission_id)
      );

      // ------------------------------------------------
      // STORE
      // ------------------------------------------------

      data.append(
        "store_id",
        String(formData.store_id)
      );

      // ------------------------------------------------
      // DEPARTMENT
      // ------------------------------------------------

      data.append(
        "department_id",
        String(formData.department_id)
      );

      // ------------------------------------------------
      // QUESTION
      // ------------------------------------------------

      data.append(
        "question_id",
        String(formData.question_id)
      );

      // ------------------------------------------------
      // ANSWER
      // ------------------------------------------------

      data.append(
        "answer",
        formData.answer || ""
      );

      // ------------------------------------------------
      // REMARKS
      // ------------------------------------------------

      data.append(
        "remarks",
        formData.remarks || ""
      );

      // ------------------------------------------------
      // SLA
      //
      // Backend can use sla_value.
      // ------------------------------------------------

      data.append(
        "sla_value",
        String(formData.sla_value)
      );

      data.append(
        "sla_type",
        formData.sla_type
      );

      // ------------------------------------------------
      // ALSO SEND sla FOR COMPATIBILITY
      // ------------------------------------------------

      data.append(
        "sla",
        `${formData.sla_value} ${formData.sla_type}`
      );

      // ------------------------------------------------
      // ATTACHMENT
      // ------------------------------------------------

      if (file) {
        data.append(
          "attachment",
          file
        );
      }

      // ==================================================
      // AUTH TOKEN
      // ==================================================

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      const headers = {};

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      // IMPORTANT:
      // Do NOT manually set Content-Type.
      //
      // Axios/browser will automatically create:
      // multipart/form-data; boundary=...
      //
      // This prevents multipart parsing problems.

      // ==================================================
      // API REQUEST
      // ==================================================

      const res = await axios.post(
        `${API}/api/action-points`,
        data,
        {
          headers,
        }
      );

      // ==================================================
      // SUCCESS
      // ==================================================

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

      // ==================================================
      // BACKEND ERROR
      // ==================================================

      if (error.response) {

        console.error(
          "STATUS:",
          error.response.status
        );

        console.error(
          "RESPONSE:",
          error.response.data
        );

        alert(
          error.response.data?.message ||
          error.response.data?.error ||
          "Unable to create Action Point."
        );

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

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="modal-overlay">

      <div className="create-modal">

        <h2>
          Create Action Point
        </h2>

        {loadingData ? (

          <div className="loading-message">
            Loading...
          </div>

        ) : (

          <form onSubmit={handleSubmit}>

            {/* ==================================================
                STORE
            ================================================== */}

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

            <input
              type="text"
              name="answer"
              placeholder="Submission Answer"
              value={formData.answer}
              onChange={handleChange}
              disabled={loading}
            />

            {/* ==================================================
                REMARKS
            ================================================== */}

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
                disabled={loading}
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
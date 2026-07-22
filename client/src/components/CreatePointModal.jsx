import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/CreatePointModal.css";

const API = "http://localhost:5000";

function CreatePointModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [stores, setStores] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [file, setFile] = useState(null);

 const [formData, setFormData] = useState({
  submission_id: 28,
    store_id: "",
    department_id: "",
    question_id: "",
    answer: "",
    remarks: "",
    sla_value: "",
    sla_type: "Hours",
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [storeRes, deptRes, questionRes] = await Promise.all([
        axios.get(`${API}/api/stores`),
        axios.get(`${API}/api/departments`),
        axios.get(`${API}/api/questions`),
      ]);

      setStores(storeRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setQuestions(questionRes.data.data || []);
    } catch (err) {
      console.log(err);
      alert("Unable to load dropdown data.");
    }
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFile = (e) => {
    setFile(e.target.files[0]);
  };

  const resetForm = () => {
    setFormData({
      submission_id: 28,
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = new FormData();

      data.append("submission_id", formData.submission_id);
      data.append("store_id", formData.store_id);
      data.append("department_id", formData.department_id);
      data.append("question_id", formData.question_id);
      data.append("answer", formData.answer);
      data.append("remarks", formData.remarks);
      data.append(
        "sla",
        `${formData.sla_value} ${formData.sla_type}`
      );

      if (file) {
        data.append("attachment", file);
      }

      const res = await axios.post(
        `${API}/api/action-points`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(res.data.message);

      resetForm();

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err) {
      console.log(err);

      if (err.response) {
        alert(err.response.data.message);
      } else {
        alert("Server Error");
      }
    }
  };
    return (
    <div className="modal-overlay">
      <div className="create-modal">
        <h2>Create Action Point</h2>

        <form onSubmit={handleSubmit}>
          {/* Store */}
          <select
            name="store_id"
            value={formData.store_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Store / Location</option>

            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.store_name} ({store.store_code})
              </option>
            ))}
          </select>

          {/* Department */}
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Department</option>

            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.department_name}
              </option>
            ))}
          </select>

          {/* Question */}
          <select
            name="question_id"
            value={formData.question_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Question</option>

            {questions.map((question) => (
              <option key={question.id} value={question.id}>
                {question.question}
              </option>
            ))}
          </select>

          {/* SLA */}
          <div className="sla-row">
            <input
              type="number"
              name="sla_value"
              placeholder="SLA Value"
              value={formData.sla_value}
              onChange={handleChange}
              required
            />

            <select
              name="sla_type"
              value={formData.sla_type}
              onChange={handleChange}
            >
              <option value="Hours">Hours</option>
              <option value="Days">Days</option>
            </select>
          </div>

          {/* Answer */}
          <input
            type="text"
            name="answer"
            placeholder="Answer (optional)"
            value={formData.answer}
            onChange={handleChange}
          />

          {/* Remarks */}
          <textarea
            rows="4"
            name="remarks"
            placeholder="Remarks (optional)"
            value={formData.remarks}
            onChange={handleChange}
          />

          {/* Attachment */}
          <label className="upload-label">
            Attachment (optional)
          </label>

          <input
            type="file"
            onChange={handleFile}
          />

          {/* Buttons */}
          <div className="modal-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-btn"
            >
              Create Point
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePointModal;
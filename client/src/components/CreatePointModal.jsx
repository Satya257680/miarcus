import { useState } from "react";
import axios from "axios";
import "../styles/CreatePointModal.css";

function CreatePointModal({ isOpen, onClose, stores = [] }) {

  const [formData, setFormData] = useState({
    store_id: "",
    department: "",
    question: "",
    sla_value: "",
    sla_type: "Hours",
    answer: "",
    comment: "",
    attachment: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFile = (e) => {
    const file = e.target.files[0];

    setFormData((prev) => ({
      ...prev,
      attachment: file ? file.name : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:5000/api/action-points",
        formData
      );

      alert(res.data.message);

      setFormData({
        store_id: "",
        department: "",
        question: "",
        sla_value: "",
        sla_type: "Hours",
        answer: "",
        comment: "",
        attachment: "",
      });

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

        <h2>Create Point</h2>

        <form onSubmit={handleSubmit}>

          <select
            name="store_id"
            value={formData.store_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Store/Location</option>

            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.store_name} ({store.store_code})
              </option>
            ))}

          </select>

          <input
            type="text"
            name="question"
            placeholder="Action Point Question/Description"
            value={formData.question}
            onChange={handleChange}
            required
          />

          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
          >
            <option value="">Select Department</option>

            <option value="Management">Management</option>
            <option value="HR">HR</option>
            <option value="Accounts">Accounts</option>
            <option value="Sales">Sales</option>

          </select>

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

          <input
            type="text"
            name="answer"
            placeholder="Answer (optional)"
            value={formData.answer}
            onChange={handleChange}
          />

          <textarea
            rows="4"
            name="comment"
            placeholder="Comment (optional)"
            value={formData.comment}
            onChange={handleChange}
          />

          <label className="upload-label">
            Attachment (optional)
          </label>

          <input
            type="file"
            onChange={handleFile}
          />

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
              Create Point
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default CreatePointModal;
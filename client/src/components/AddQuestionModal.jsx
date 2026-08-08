import { useEffect, useState } from "react";
import axios from "axios";

import {
  createQuestion,
  updateQuestion,
} from "../services/questionService";

import "../styles/AddQuestionModal.css";

function AddQuestionModal({
  question,
  onClose,
  onSuccess,
}) {
const isEdit = !!question;

const [checklistTypes, setChecklistTypes] = useState([]);
const [departments, setDepartments] = useState([]);

const [selectedDepartments, setSelectedDepartments] = useState([]);

const [formData, setFormData] = useState({

  checklist_type_id: "",

  question: "",

  sequence_no: "",

  answer_type: "Text",

  sla_value: "",

  sla_unit: "Hours",

  answer_required: false,

  status: "Active",

  departments: [],

});

// ==========================
// Load Dropdown Data
// ==========================

useEffect(() => {

  loadChecklistTypes();

  loadDepartments();

}, []);

const loadChecklistTypes = async () => {

  try {

    const res = await axios.get(
      "https://miarcus-backend.onrender.com/api/checklist-types"
    );

    setChecklistTypes(res.data.data || []);

  } catch (err) {

    console.error(err);

  }

};

const loadDepartments = async () => {

  try {

    const res = await axios.get(
      "https://miarcus-backend.onrender.com/api/departments"
    );

    setDepartments(res.data.data || []);

  } catch (err) {

    console.error(err);

  }

};

// ==========================
// Edit Mode
// ==========================


useEffect(() => {

  if (!question) return;

  const departmentIds = Array.isArray(question.department_ids)

    ? question.department_ids

    : [];

  setSelectedDepartments(departmentIds);

  setFormData({

    checklist_type_id:
      question.checklist_type_id || "",

    question:
      question.question || "",

    sequence_no:
      question.sequence_no || "",

    answer_type:
      question.answer_type || "Text",

    sla_value:
      question.sla_value || "",

    sla_unit:
      question.sla_unit || "Hours",

    answer_required:
      question.answer_required === 1 ||
      question.answer_required === true,

    status:
      question.status || "Active",

    departments:
      departmentIds,

  });

}, [question]);

// ==========================
// Handle Change
// ==========================

const handleChange = (e) => {

  const {

    name,

    value,

    checked,

    type

  } = e.target;

  setFormData((prev) => ({

    ...prev,

    [name]:

      type === "checkbox"

        ? checked

        : value,

  }));

};

// ==========================
// Department Checkbox
// ==========================

const toggleDepartment = (id) => {

  const updated = selectedDepartments.includes(id)

    ? selectedDepartments.filter(
        (item) => item !== id
      )

    : [

        ...selectedDepartments,

        id,

      ];

  setSelectedDepartments(updated);

  setFormData((prev) => ({

    ...prev,

    departments: updated,

  }));

};

const selectAllDepartments = () => {

  if (

    selectedDepartments.length ===

    departments.length

  ) {

    setSelectedDepartments([]);

    setFormData((prev) => ({

      ...prev,

      departments: [],

    }));

  } else {

    const allDepartments = departments.map(
      (dept) => dept.id
    );

    setSelectedDepartments(allDepartments);

    setFormData((prev) => ({

      ...prev,

      departments: allDepartments,

    }));

  }

};

// ==========================
// Save Question
// ==========================

const handleSubmit = async (e) => {

  e.preventDefault();

  if (!formData.checklist_type_id) {

    return alert(
      "Please select Checklist Type."
    );

  }

  if (!formData.question.trim()) {

    return alert(
      "Please enter Question."
    );

  }

  if (!formData.answer_type) {

    return alert(
      "Please select Answer Type."
    );

  }

  const payload = {

    ...formData,

    departments: selectedDepartments,

  };

  try {

    if (isEdit) {

      await updateQuestion(
        question.id,
        payload
      );

    } else {

      await createQuestion(
        payload
      );

    }

    alert(

      isEdit

        ? "Question updated successfully."

        : "Question added successfully."

    );

    onSuccess();

  } catch (err) {

    console.error(err);

    alert(
      "Unable to save question."
    );

  }

};
  return (
    <div className="modal-overlay">

      <div className="question-modal">

        <div className="modal-header">
          <h2>
            {isEdit ? "Edit Question" : "Add Question"}
          </h2>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-grid">

            {/* Checklist Type */}

            <div className="form-group">
              <label>Checklist Type *</label>

              <select
                name="checklist_type_id"
                value={formData.checklist_type_id}
                onChange={handleChange}
              >
                <option value="">
                  Select Checklist Type
                </option>

                {checklistTypes.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.checklist_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sequence */}

            <div className="form-group">
              <label>Sequence</label>

              <input
                type="number"
                name="sequence_no"
                value={formData.sequence_no}
                onChange={handleChange}
              />
            </div>

            {/* Question */}

            <div
              className="form-group"
              style={{ gridColumn: "1 / span 2" }}
            >
              <label>Question *</label>

              <textarea
                rows="3"
                name="question"
                value={formData.question}
                onChange={handleChange}
              />
            </div>

            {/* Answer Type */}

            <div className="form-group">
              <label>Answer Type</label>

              <select
                name="answer_type"
                value={formData.answer_type}
                onChange={handleChange}
              >
                <option>Text</option>
                <option>Number</option>
                <option>Yes / No</option>
                <option>Date</option>
                <option>Dropdown</option>
                <option>Image</option>
              </select>
            </div>

            {/* SLA */}

            <div className="form-group">
              <label>SLA Value</label>

              <input
                type="number"
                name="sla_value"
                value={formData.sla_value}
                onChange={handleChange}
              />
            </div>

            {/* SLA Unit */}

            <div className="form-group">
              <label>SLA Unit</label>

              <select
                name="sla_unit"
                value={formData.sla_unit}
                onChange={handleChange}
              >
                <option>Minutes</option>
                <option>Hours</option>
                <option>Days</option>
              </select>
            </div>

            {/* Departments */}

<div className="form-group">

  <div className="section-header">

    <label>Departments</label>

    <button
      type="button"
      className="select-all-btn"
      onClick={selectAllDepartments}
    >
      {selectedDepartments.length ===
      departments.length
        ? "Unselect All"
        : "Select All"}
    </button>

  </div>

  <div className="checkbox-list">

    {departments.length === 0 ? (

      <p>No Departments Found</p>

    ) : (

      departments.map((dept) => (

        <label key={dept.id}>

          <input
            type="checkbox"
            checked={selectedDepartments.includes(
              dept.id
            )}
            onChange={() =>
              toggleDepartment(dept.id)
            }
          />

          {dept.department_name}

        </label>

      ))

    )}

  </div>

</div>

            {/* Answer Required */}

            <div className="form-group checkbox-group">
              <label>

                <input
                  type="checkbox"
                  name="answer_required"
                  checked={formData.answer_required}
                  onChange={handleChange}
                />

                Answer Required

              </label>
            </div>

            {/* Status */}

            <div className="form-group">
              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

          </div>

          <div className="modal-footer">

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
              {isEdit ? "Update" : "Save"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default AddQuestionModal;
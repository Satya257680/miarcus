import { useEffect, useState } from "react";
import axios from "axios";

import {
  createQuestion,
  updateQuestion,
} from "../services/questionService";

import "../styles/AddQuestionModal.css";
import ProfessionalModal from "./common/ProfessionalModal";
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

  // =====================================================
  // LOAD DROPDOWN DATA
  // =====================================================

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
      console.error("Checklist Type Error:", err);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/departments"
      );

      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Department Error:", err);
    }
  };

  // =====================================================
  // EDIT MODE
  // =====================================================

  useEffect(() => {
    if (!question) {
      setFormData({
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

      setSelectedDepartments([]);

      return;
    }

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

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (e) => {
    const {
      name,
      value,
      checked,
      type,
    } = e.target;

    setFormData((prev) => ({
      ...prev,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =====================================================
  // TOGGLE DEPARTMENT
  // =====================================================

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

  // =====================================================
  // SELECT ALL DEPARTMENTS
  // =====================================================

  const selectAllDepartments = () => {
    if (
      departments.length > 0 &&
      selectedDepartments.length === departments.length
    ) {
      setSelectedDepartments([]);

      setFormData((prev) => ({
        ...prev,
        departments: [],
      }));

      return;
    }

    const allDepartments = departments.map(
      (dept) => dept.id
    );

    setSelectedDepartments(allDepartments);

    setFormData((prev) => ({
      ...prev,
      departments: allDepartments,
    }));
  };

  // =====================================================
  // SAVE QUESTION
  // =====================================================

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
        await createQuestion(payload);
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

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="modal-overlay question-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="question-modal question-modal-animated"
        role="dialog"
        aria-modal="true"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="question-modal-header">
          <div className="question-header-content">

            <div className="question-header-icon">
              <span>
                {isEdit ? "✎" : "+"}
              </span>
            </div>

            <div>
              <h2>
                {isEdit
                  ? "Edit Question"
                  : "Add Question"}
              </h2>

              <p>
                {isEdit
                  ? "Update checklist question details."
                  : "Create a new checklist question."}
              </p>
            </div>

          </div>

          <button
            type="button"
            className="question-close-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="question-form"
        >
          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <div className="question-section">

            <div className="question-section-title">

              <span className="question-section-line"></span>

              <div>
                <h3>Question Information</h3>

                <p>
                  Configure the checklist question.
                </p>
              </div>

            </div>

            <div className="question-form-grid">

              {/* Checklist Type */}

              <div className="question-form-group">

                <label>
                  Checklist Type
                  <span className="required">*</span>
                </label>

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

              <div className="question-form-group">

                <label>
                  Sequence
                </label>

                <input
                  type="number"
                  name="sequence_no"
                  value={formData.sequence_no}
                  onChange={handleChange}
                  placeholder="Enter sequence"
                  min="1"
                />

              </div>

              {/* Question */}

              <div className="question-form-group question-full-width">

                <label>
                  Question
                  <span className="required">*</span>
                </label>

                <textarea
                  rows="3"
                  name="question"
                  value={formData.question}
                  onChange={handleChange}
                  placeholder="Enter checklist question"
                />

              </div>

            </div>
          </div>

          {/* =================================================
              ANSWER CONFIGURATION
          ================================================= */}

          <div className="question-section">

            <div className="question-section-title">

              <span className="question-section-line"></span>

              <div>
                <h3>Answer Configuration</h3>

                <p>
                  Configure how the question should be answered.
                </p>
              </div>

            </div>

            <div className="question-form-grid">

              {/* Answer Type */}

              <div className="question-form-group">

                <label>
                  Answer Type
                </label>

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

              {/* SLA Value */}

              <div className="question-form-group">

                <label>
                  SLA Value
                </label>

                <input
                  type="number"
                  name="sla_value"
                  value={formData.sla_value}
                  onChange={handleChange}
                  placeholder="Enter SLA"
                  min="0"
                />

              </div>

              {/* SLA Unit */}

              <div className="question-form-group">

                <label>
                  SLA Unit
                </label>

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

              {/* Status */}

              <div className="question-form-group">

                <label>
                  Status
                </label>

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

            {/* Answer Required */}

            <label className="answer-required-card">

              <input
                type="checkbox"
                name="answer_required"
                checked={formData.answer_required}
                onChange={handleChange}
              />

              <span className="custom-checkbox"></span>

              <span className="answer-required-content">

                <strong>
                  Answer Required
                </strong>

                <small>
                  Require users to provide an answer.
                </small>

              </span>

            </label>

          </div>

          {/* =================================================
              DEPARTMENTS
          ================================================= */}

          <div className="question-section">

            <div className="question-section-title department-title">

              <span className="question-section-line"></span>

              <div>
                <h3>Departments</h3>

                <p>
                  Select the departments that can use this question.
                </p>
              </div>

              <button
                type="button"
                className="select-all-btn"
                onClick={selectAllDepartments}
              >
                {departments.length > 0 &&
                selectedDepartments.length ===
                  departments.length
                  ? "Unselect All"
                  : "Select All"}
              </button>

            </div>

            <div className="question-checkbox-list">

              {departments.length === 0 ? (

                <div className="question-empty-departments">
                  No Departments Found
                </div>

              ) : (

                departments.map((dept) => (

                  <label
                    key={dept.id}
                    className={
                      selectedDepartments.includes(
                        dept.id
                      )
                        ? "department-option selected"
                        : "department-option"
                    }
                  >

                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(
                        dept.id
                      )}
                      onChange={() =>
                        toggleDepartment(
                          dept.id
                        )
                      }
                    />

                    <span className="department-check"></span>

                    <span>
                      {dept.department_name}
                    </span>

                  </label>

                ))

              )}

            </div>

          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="question-modal-footer">

            <button
              type="button"
              className="question-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="question-save-btn"
            >
              <span>
                {isEdit ? "✓" : "+"}
              </span>

              {isEdit
                ? "Update Question"
                : "Save Question"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

export default AddQuestionModal;
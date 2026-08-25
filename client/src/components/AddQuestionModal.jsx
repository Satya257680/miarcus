import { useEffect, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";

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

  // =====================================================
  // DATA
  // =====================================================

  const [checklistTypes, setChecklistTypes] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedDepartments, setSelectedDepartments] =
    useState([]);

  // =====================================================
  // FORM
  // =====================================================

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
        API_BASE_URL + '/api/checklist-types'
      );

      setChecklistTypes(res.data.data || []);
    } catch (err) {
      console.error("Checklist Type Error:", err);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await axios.get(
        API_BASE_URL + '/api/departments'
      );

      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Department Error:", err);
    }
  };

  // =====================================================
  // EDIT / RESET FORM
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

    const departmentIds = Array.isArray(
      question.department_ids
    )
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

      departments: departmentIds,
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
  // SELECT / UNSELECT ALL
  // =====================================================

  const selectAllDepartments = () => {
    if (
      departments.length > 0 &&
      selectedDepartments.length ===
        departments.length
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
      alert("Please select Checklist Type.");
      return;
    }

    if (!formData.question.trim()) {
      alert("Please enter Question.");
      return;
    }

    if (!formData.answer_type) {
      alert("Please select Answer Type.");
      return;
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

      alert("Unable to save question.");
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
        aria-labelledby="question-modal-title"
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

            <div className="question-header-text">

              <h2 id="question-modal-title">
                {isEdit
                  ? "Edit Question"
                  : "Add Question"}
              </h2>

              <p>
                {isEdit
                  ? "Update checklist question details and configuration."
                  : "Create a new checklist question and configure its behaviour."}
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
              QUESTION INFORMATION
          ================================================= */}

          <section className="question-section">

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
                  <span className="required">
                    *
                  </span>
                </label>

                <select
                  name="checklist_type_id"
                  value={
                    formData.checklist_type_id
                  }
                  onChange={handleChange}
                  required
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
                  value={
                    formData.sequence_no
                  }
                  onChange={handleChange}
                  placeholder="Enter sequence"
                  min="1"
                />

              </div>

              {/* Question */}

              <div className="question-form-group question-full-width">

                <label>
                  Question
                  <span className="required">
                    *
                  </span>
                </label>

                <textarea
                  rows="3"
                  name="question"
                  value={
                    formData.question
                  }
                  onChange={handleChange}
                  placeholder="Enter checklist question"
                  required
                />

              </div>

            </div>

          </section>

          {/* =================================================
              ANSWER CONFIGURATION
          ================================================= */}

          <section className="question-section">

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
                  value={
                    formData.answer_type
                  }
                  onChange={handleChange}
                >

                  <option value="Text">
                    Text
                  </option>

                  <option value="Number">
                    Number
                  </option>

                  <option value="Yes / No">
                    Yes / No
                  </option>

                  <option value="Date">
                    Date
                  </option>

                  <option value="Dropdown">
                    Dropdown
                  </option>

                  <option value="Image">
                    Image
                  </option>

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
                  value={
                    formData.sla_value
                  }
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
                  value={
                    formData.sla_unit
                  }
                  onChange={handleChange}
                >

                  <option value="Minutes">
                    Minutes
                  </option>

                  <option value="Hours">
                    Hours
                  </option>

                  <option value="Days">
                    Days
                  </option>

                </select>

              </div>

              {/* Status */}

              <div className="question-form-group">

                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={
                    formData.status
                  }
                  onChange={handleChange}
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

            {/* Answer Required */}

            <label
              className={
                formData.answer_required
                  ? "answer-required-card active"
                  : "answer-required-card"
              }
            >

              <input
                type="checkbox"
                name="answer_required"
                checked={
                  formData.answer_required
                }
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

              <span className="answer-required-status">
                {formData.answer_required
                  ? "Required"
                  : "Optional"}
              </span>

            </label>

          </section>

          {/* =================================================
              DEPARTMENTS
          ================================================= */}

          <section className="question-section">

            <div className="question-section-title department-title">

              <span className="question-section-line"></span>

              <div>

                <h3>
                  Departments
                </h3>

                <p>
                  Select the departments that can use this question.
                </p>

              </div>

              <button
                type="button"
                className="select-all-btn"
                onClick={
                  selectAllDepartments
                }
              >
                {departments.length > 0 &&
                selectedDepartments.length ===
                  departments.length
                  ? "Unselect All"
                  : "Select All"}
              </button>

            </div>

            <div className="department-selection-summary">

              <span className="selection-count">
                {selectedDepartments.length}
              </span>

              <span>
                {selectedDepartments.length === 1
                  ? "Department selected"
                  : "Departments selected"}
              </span>

            </div>

            <div className="question-checkbox-list">

              {departments.length === 0 ? (

                <div className="question-empty-departments">

                  <span className="empty-icon">
                    !
                  </span>

                  <div>
                    <strong>
                      No Departments Found
                    </strong>

                    <small>
                      Create a department before assigning it to this question.
                    </small>
                  </div>

                </div>

              ) : (

                departments.map((dept) => {

                  const selected =
                    selectedDepartments.includes(
                      dept.id
                    );

                  return (
                    <label
                      key={dept.id}
                      className={
                        selected
                          ? "department-option selected"
                          : "department-option"
                      }
                    >

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleDepartment(
                            dept.id
                          )
                        }
                      />

                      <span className="department-check">
                        {selected ? "✓" : ""}
                      </span>

                      <span className="department-name">
                        {dept.department_name}
                      </span>

                      {selected && (
                        <span className="department-selected-label">
                          Selected
                        </span>
                      )}

                    </label>
                  );
                })

              )}

            </div>

          </section>

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

              <span className="save-icon">
                {isEdit ? "✓" : "+"}
              </span>

              <span>
                {isEdit
                  ? "Update Question"
                  : "Save Question"}
              </span>

            </button>

          </div>

        </form>

      </div>
    </div>
  );
}

export default AddQuestionModal;
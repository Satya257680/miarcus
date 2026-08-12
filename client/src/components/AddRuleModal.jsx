import React, { useEffect, useState } from "react";

import {
  createRule,
  updateRule,
} from "../services/nsoRuleService";

import { getQuestions } from "../services/questionService";

import { getDepartments } from "../services/departmentService";

import "../styles/AddRuleModal.css";
import "../../styles/common/ProfessionalModal.css";

function AddRuleModal({

  isOpen,

  onClose,

  onSuccess,

  editData = null,

}) {

  // ==========================================
  // States
  // ==========================================

  const [questions, setQuestions] = useState([]);

  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [departmentSearch, setDepartmentSearch] = useState("");

  const [form, setForm] = useState({

    trigger_column: "",

    expected_answer: "No",

    priority: "Medium",

    sla_days: 3,

    create_action_point: 1,

    mandatory: 1,

    is_active: 1,

    departments: [],

  });

  // ==========================================
  // Filter Departments
  // ==========================================

  const filteredDepartments = departments.filter(

    (department) =>

      department.department_name

        .toLowerCase()

        .includes(

          departmentSearch.toLowerCase()

        )

  );

  // ==========================================
  // Load Questions & Departments
  // ==========================================

  useEffect(() => {

    if (!isOpen) return;

    loadData();

  }, [isOpen]);

  // ==========================================
  // Populate Edit Data
  // ==========================================

  useEffect(() => {

    if (!editData) {

      setForm({

        trigger_column: "",

        expected_answer: "No",

        priority: "Medium",

        sla_days: 3,

        create_action_point: 1,

        mandatory: 1,

        is_active: 1,

        departments: [],

      });

      return;

    }

    const selectedDepartmentIds = departments

      .filter((department) => {

        const names =

          editData.departments

            ?.split(",")

            .map((item) => item.trim()) || [];

        return names.includes(

          department.department_name

        );

      })

      .map((department) => department.id);

    setForm({

      trigger_column:
        editData.trigger_column || "",

      expected_answer:
        editData.expected_answer || "No",

      priority:
        editData.priority || "Medium",

      sla_days:
        editData.sla_days || 3,

      create_action_point:
        editData.create_action_point ?? 1,

      mandatory:
        editData.mandatory ?? 1,

      is_active:
        editData.is_active ?? 1,

      departments:
        selectedDepartmentIds,

    });

  }, [

    editData,

    departments,

  ]);

  // ==========================================
  // Load Dropdown Data
  // ==========================================

  const loadData = async () => {

    try {

      setLoading(true);

      const questionRes = await getQuestions();

      const departmentRes = await getDepartments();

      setQuestions(

        questionRes.data || []

      );

      setDepartments(

        departmentRes.data || []

      );

    } catch (err) {

      console.error(err);

      alert(

        "Failed to load dropdown data."

      );

    } finally {

      setLoading(false);

    }

  };

  // ==========================================
  // Handle Input Change
  // ==========================================

  const handleChange = (e) => {

  const { name, value } = e.target;

  let newValue = value;

  if (
    name === "sla_days" ||
    name === "create_action_point" ||
    name === "mandatory" ||
    name === "is_active"
  ) {
    newValue = Number(value);
  }

  setForm((prev) => ({

    ...prev,

    [name]: newValue,

  }));

};
  // ==========================================
  // Toggle Department
  // ==========================================

  const toggleDepartment = (id) => {

    setForm((prev) => {

      const exists = prev.departments.includes(id);

      return {

        ...prev,

        departments: exists

          ? prev.departments.filter(

              (item) => item !== id

            )

          : [

              ...prev.departments,

              id,

            ],

      };

    });

  };

  // ==========================================
  // Handle Submit
  // ==========================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!form.trigger_column) {

      alert("Please select Trigger Column.");

      return;

    }

    if (form.departments.length === 0) {

      alert("Please select at least one Department.");

      return;

    }

    try {

      setSaving(true);

     const payload = {

    trigger_column: form.trigger_column,

    expected_answer: form.expected_answer,

    priority: form.priority,

    sla_days: form.sla_days,

    create_action_point: form.create_action_point,

    mandatory: form.mandatory,

    is_active: form.is_active,

    departments: form.departments,

};
      if (editData) {

        await updateRule(

          editData.id,

          payload

        );

        alert(

          "Rule updated successfully."

        );

      } else {

        await createRule(payload);

        alert(

          "Rule created successfully."

        );

      }

      if (onSuccess) {

        onSuccess();

      }

      onClose();

      setForm({

    trigger_column: "",

    expected_answer: "No",

    priority: "Medium",

    sla_days: 3,

    create_action_point: 1,

    mandatory: 1,

    is_active: 1,

    departments: [],

});
      setDepartmentSearch("");

    } catch (err) {

      console.error(err);

      alert(

        err.response?.data?.message ||

        "Failed to save rule."

      );

    } finally {

      setSaving(false);

    }

  };

  // ==========================================
  // Don't Render if Closed
  // ==========================================

  if (!isOpen) return null;

  // ==========================================
  // JSX
  // ==========================================

  return (

    <div className="modal-overlay">

      <div className="modal">

        <div className="modal-header">

          <h2>

            {editData

              ? "Edit NSO Rule"

              : "Add NSO Rule"}

          </h2>

          <button

            className="close-btn"

            onClick={onClose}

          >

            ✕

          </button>

        </div>

        {loading ? (

          <div className="loading-container">

            Loading...

          </div>

        ) : (

          <form onSubmit={handleSubmit}>

           {/* ================= Trigger Column ================= */}

<div className="form-group">

  <label>

    Trigger Column

  </label>

  <select

    name="trigger_column"

    value={form.trigger_column}

    onChange={handleChange}

    required

  >

    <option value="">

      Select Trigger Column

    </option>

    {questions.map((question) => (

      <option

        key={question.id}

        value={question.question}

      >

        {question.question}

      </option>

    ))}

  </select>

</div>

{/* ================= Expected Answer ================= */}

<div className="form-group">

  <label>

    Expected Answer

  </label>

  <select

    name="expected_answer"

    value={form.expected_answer}

    onChange={handleChange}

  >

    <option value="Yes">Yes</option>

    <option value="No">No</option>

    <option value="NA">NA</option>

  </select>

</div>

{/* ================= Priority ================= */}

<div className="form-group">

  <label>

    Priority

  </label>

  <select

    name="priority"

    value={form.priority}

    onChange={handleChange}

  >

    <option value="Low">Low</option>

    <option value="Medium">Medium</option>

    <option value="High">High</option>

    <option value="Critical">Critical</option>

  </select>

</div>

{/* ================= SLA Days ================= */}

<div className="form-group">

  <label>

    SLA Days

  </label>

  <input

    type="number"

    name="sla_days"

    min="1"

    value={form.sla_days}

    onChange={handleChange}

  />

</div>

{/* ================= Create Action Point ================= */}

<div className="form-group">

  <label>

    Create Action Point

  </label>

  <select

    name="create_action_point"

    value={form.create_action_point}

    onChange={handleChange}

  >

    <option value={1}>Yes</option>

    <option value={0}>No</option>

  </select>

</div>

{/* ================= Mandatory ================= */}

<div className="form-group">

  <label>

    Mandatory

  </label>

  <select

    name="mandatory"

    value={form.mandatory}

    onChange={handleChange}

  >

    <option value={1}>Yes</option>

    <option value={0}>No</option>

  </select>

</div>

{/* ================= Status ================= */}

<div className="form-group">

  <label>

    Status

  </label>

  <select

    name="is_active"

    value={form.is_active}

    onChange={handleChange}

  >

    <option value={1}>Active</option>

    <option value={0}>Inactive</option>

  </select>

</div>

{/* ================= Departments ================= */}

<div className="form-group full-width">

  <label>

    Assigned Departments

  </label>

  <input

    type="text"

    className="department-search"

    placeholder="Search departments..."

    value={departmentSearch}

    onChange={(e) =>

      setDepartmentSearch(

        e.target.value

      )

    }

  />

  <div className="department-box">

    {filteredDepartments.length > 0 ? (

      filteredDepartments.map((department) => (

        <label

          key={department.id}

          htmlFor={`department-${department.id}`}

          className="department-row"

        >

          <input

            id={`department-${department.id}`}

            type="checkbox"

            checked={form.departments.includes(

              department.id

            )}

            onChange={() =>

              toggleDepartment(

                department.id

              )

            }

          />

          <span>

            {department.department_name}

          </span>

        </label>

      ))

    ) : (

      <div className="no-department">

        No departments found.

      </div>

    )}

  </div>

</div>

{/* ================= Buttons ================= */}

<div className="modal-actions">

  <button

    type="submit"

    className="save-btn"

    disabled={saving}

  >

    {saving

      ? "Saving..."

      : editData

      ? "Update Rule"

      : "Create Rule"}

  </button>

  <button

    type="button"

    className="cancel-btn"

    onClick={() => {

      setForm({

        trigger_column: "",

        expected_answer: "No",

        priority: "Medium",

        sla_days: 3,

        create_action_point: 1,

        mandatory: 1,

        is_active: 1,

        departments: [],

      });

      setDepartmentSearch("");

      onClose();

    }}

  >

    Cancel

  </button>

</div>

</form>

)}

</div>

</div>

);

}

export default AddRuleModal;
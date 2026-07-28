import React, { useEffect, useState } from "react";

import {
  createRule,
  updateRule,
} from "../services/nsoRuleService";

import { getQuestions } from "../services/questionService";

import { getDepartments } from "../services/departmentService";

import "../styles/AddRuleModal.css";

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

    departments: [],

  });

  // ==========================================
  // Filter Departments
  // ==========================================

  const filteredDepartments = departments.filter((department) =>

    department.department_name
      .toLowerCase()
      .includes(departmentSearch.toLowerCase())

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

      departments: selectedDepartmentIds,

    });

  }, [editData, departments]);
  // ==========================================
// Load Dropdown Data
// ==========================================

const loadData = async () => {

  try {

    setLoading(true);

    const questionRes = await getQuestions();

    const departmentRes = await getDepartments();

    setQuestions(questionRes.data || []);

    setDepartments(departmentRes.data || []);

  } catch (err) {

    console.error(err);

    alert("Failed to load dropdown data.");

  } finally {

    setLoading(false);

  }

};

// ==========================================
// Handle Input Change
// ==========================================

const handleChange = (e) => {

  const { name, value } = e.target;

  setForm((prev) => ({

    ...prev,

    [name]: value,

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

        : [...prev.departments, id],

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

      departments: form.departments,

    };

    if (editData) {

      await updateRule(editData.id, payload);

      alert("Rule updated successfully.");

    } else {

      await createRule(payload);

      alert("Rule created successfully.");

    }

    if (onSuccess) {

      onSuccess();

    }

    onClose();

    setForm({

      trigger_column: "",

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

          {/* ================= Departments ================= */}

          <div className="form-group">

            <label>

              Assigned Departments

            </label>

            <input

              type="text"

              className="department-search"

              placeholder="Search departments..."

              value={departmentSearch}

              onChange={(e) =>
                setDepartmentSearch(e.target.value)
              }

            />

            <div className="department-box">

              {filteredDepartments.length > 0 ? (

                filteredDepartments.map((department) => (

                  <label

                    key={department.id}

                    htmlFor={`department-${department.id}`}

                    className="department-row"

                    onClick={() =>
                      toggleDepartment(department.id)
                    }

                  >

                    <input

                      id={`department-${department.id}`}

                      type="checkbox"

                      checked={form.departments.includes(
                        department.id
                      )}

                      onClick={(e) =>
                        e.stopPropagation()
                      }

                      onChange={() =>
                        toggleDepartment(department.id)
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
import React, { useEffect, useState } from "react";

import {
  createRule,
  updateRule,
} from "../services/nsoRuleService";

import { getQuestions } from "../services/questionService";
import { getDepartments } from "../services/departmentService";

import "../styles/AddRuleModal.css";

import {
  LuShieldCheck,
  LuX,
  LuListChecks,
  LuBuilding2,
  LuCircleAlert,
  LuSave,
  LuLoaderCircle,
  LuCheck,
  LuSearch,
  LuChevronDown,
  LuUsers,
} from "react-icons/lu";


function AddRuleModal({
  isOpen,
  onClose,
  onSuccess,
  editData = null,
}) {

  // =====================================================
  // DEFAULT FORM
  // =====================================================

  const getDefaultForm = () => ({
    trigger_column: "",
    expected_answer: "No",
    priority: "Medium",
    sla_days: 3,
    create_action_point: 1,
    mandatory: 1,
    is_active: 1,
    departments: [],
  });


  // =====================================================
  // STATES
  // =====================================================

  const [questions, setQuestions] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [departmentSearch, setDepartmentSearch] =
    useState("");

  const [form, setForm] = useState(
    getDefaultForm()
  );


  // =====================================================
  // FILTER DEPARTMENTS
  // =====================================================

  const filteredDepartments = departments.filter(
    (department) =>
      String(
        department.department_name || ""
      )
        .toLowerCase()
        .includes(
          departmentSearch.toLowerCase()
        )
  );


  // =====================================================
  // SELECTED DEPARTMENT COUNT
  // =====================================================

  const selectedDepartmentCount =
    form.departments.length;


  // =====================================================
  // ALL DEPARTMENTS SELECTED
  // =====================================================

  const allDepartmentsSelected =
    departments.length > 0 &&
    form.departments.length ===
      departments.length;


  // =====================================================
  // LOAD DATA WHEN MODAL OPENS
  // =====================================================

  useEffect(() => {

    if (!isOpen) {
      return;
    }

    loadData();

  }, [isOpen]);


  // =====================================================
  // LOAD EDIT DATA
  // =====================================================

  useEffect(() => {

    if (!isOpen) {
      return;
    }

    if (!editData) {

      setForm(
        getDefaultForm()
      );

      setDepartmentSearch("");

      return;
    }


    // ---------------------------------------------------
    // Convert department names to department IDs
    // ---------------------------------------------------

    const departmentNames =
      String(
        editData.departments || ""
      )
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);


    const selectedDepartmentIds =
      departments
        .filter((department) =>
          departmentNames.includes(
            department.department_name
          )
        )
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
    isOpen,
    editData,
    departments,
  ]);


  // =====================================================
  // LOAD QUESTIONS & DEPARTMENTS
  // =====================================================

  const loadData = async () => {

    try {

      setLoading(true);

      const [
        questionRes,
        departmentRes,
      ] = await Promise.all([
        getQuestions(),
        getDepartments(),
      ]);


      setQuestions(
        questionRes?.data || []
      );


      setDepartments(
        departmentRes?.data || []
      );

    } catch (err) {

      console.error(
        "NSO Rule dropdown loading error:",
        err
      );

      alert(
        "Failed to load questions and departments."
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // HANDLE INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;


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


  // =====================================================
  // TOGGLE DEPARTMENT
  // =====================================================

  const toggleDepartment = (id) => {

    setForm((prev) => {

      const exists =
        prev.departments.includes(id);


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


  // =====================================================
  // SELECT ALL DEPARTMENTS
  // =====================================================

  const toggleAllDepartments = () => {

    if (allDepartmentsSelected) {

      setForm((prev) => ({
        ...prev,
        departments: [],
      }));

      return;

    }


    setForm((prev) => ({
      ...prev,
      departments:
        departments.map(
          (department) =>
            department.id
        ),
    }));

  };


  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {

    setForm(
      getDefaultForm()
    );

    setDepartmentSearch("");

  };


  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const handleClose = () => {

    if (saving) {
      return;
    }

    resetForm();

    onClose();

  };


  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {

    e.preventDefault();


    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!form.trigger_column) {

      alert(
        "Please select Trigger Column."
      );

      return;

    }


    if (
      form.departments.length === 0
    ) {

      alert(
        "Please select at least one Department."
      );

      return;

    }


    // ---------------------------------------------------
    // PAYLOAD
    // ---------------------------------------------------

    const payload = {

      trigger_column:
        form.trigger_column,

      expected_answer:
        form.expected_answer,

      priority:
        form.priority,

      sla_days:
        Number(form.sla_days),

      create_action_point:
        Number(
          form.create_action_point
        ),

      mandatory:
        Number(form.mandatory),

      is_active:
        Number(form.is_active),

      departments:
        form.departments,

    };


    // ---------------------------------------------------
    // SAVE
    // ---------------------------------------------------

    try {

      setSaving(true);


      if (editData) {

        await updateRule(
          editData.id,
          payload
        );

        alert(
          "Rule updated successfully."
        );

      } else {

        await createRule(
          payload
        );

        alert(
          "Rule created successfully."
        );

      }


      // -------------------------------------------------
      // REFRESH PARENT
      // -------------------------------------------------

      if (
        typeof onSuccess ===
        "function"
      ) {

        await onSuccess();

      }


      resetForm();

      onClose();


    } catch (err) {

      console.error(
        "NSO Rule save error:",
        err
      );

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to save NSO Rule."
      );

    } finally {

      setSaving(false);

    }

  };


  // =====================================================
  // DO NOT RENDER WHEN CLOSED
  // =====================================================

  if (!isOpen) {
    return null;
  }


  // =====================================================
  // JSX
  // =====================================================

  return (

    <div
      className="nso-rule-modal-overlay"
      onMouseDown={(e) => {

        if (
          e.target ===
            e.currentTarget &&
          !saving
        ) {

          handleClose();

        }

      }}
    >

      <div
        className="nso-rule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nso-rule-modal-title"
      >


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="nso-rule-modal-header">

          <div className="nso-rule-header-content">


            {/* ICON */}

            <div className="nso-rule-header-icon">

              {editData ? (
                <LuListChecks />
              ) : (
                <LuShieldCheck />
              )}

            </div>


            {/* TITLE */}

            <div className="nso-rule-header-text">

              <h2
                id="nso-rule-modal-title"
              >
                {editData
                  ? "Edit NSO Rule"
                  : "Add NSO Rule"}
              </h2>


              <p>
                {editData
                  ? "Update rule conditions and action point settings."
                  : "Create a new NSO rule and define its conditions."}
              </p>

            </div>

          </div>


          {/* CLOSE */}

          <button
            type="button"
            className="nso-rule-close-btn"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close"
            title="Close"
          >

            <LuX />

          </button>

        </div>


        {/* =================================================
            BODY
        ================================================= */}

        <form
          className="nso-rule-form"
          onSubmit={handleSubmit}
        >


          {/* =================================================
              BODY SCROLL AREA
          ================================================= */}

          <div className="nso-rule-modal-body">


            {loading ? (

              /* =============================================
                 LOADING
              ============================================= */

              <div className="nso-rule-loading">

                <LuLoaderCircle
                  className="nso-rule-spinner-large"
                />

                <span>
                  Loading rule information...
                </span>

              </div>

            ) : (

              <>


                {/* =========================================
                    RULE INFORMATION
                ========================================= */}

                <section className="nso-rule-section">


                  <div className="nso-rule-section-heading">

                    <div className="nso-rule-section-icon">

                      <LuListChecks />

                    </div>


                    <div>

                      <h3>
                        Rule Information
                      </h3>

                      <p>
                        Define when this NSO rule should be triggered.
                      </p>

                    </div>

                  </div>


                  <div className="nso-rule-divider" />


                  {/* FORM GRID */}

                  <div className="nso-rule-grid">


                    {/* TRIGGER COLUMN */}

                    <div className="nso-rule-field nso-rule-field-full">

                      <label htmlFor="trigger_column">

                        Trigger Column

                        <span className="nso-rule-required">
                          *
                        </span>

                      </label>


                      <div className="nso-rule-select-wrap">

                        <select
                          id="trigger_column"
                          name="trigger_column"
                          value={
                            form.trigger_column
                          }
                          onChange={
                            handleChange
                          }
                          required
                          disabled={saving}
                        >

                          <option value="">
                            Select Trigger Column
                          </option>


                          {questions.map(
                            (question) => (

                              <option
                                key={
                                  question.id
                                }
                                value={
                                  question.question
                                }
                              >
                                {
                                  question.question
                                }
                              </option>

                            )
                          )}

                        </select>


                        <LuChevronDown />

                      </div>

                    </div>


                    {/* EXPECTED ANSWER */}

                    <div className="nso-rule-field">

                      <label htmlFor="expected_answer">

                        Expected Answer

                        <span className="nso-rule-required">
                          *
                        </span>

                      </label>


                      <div className="nso-rule-select-wrap">

                        <select
                          id="expected_answer"
                          name="expected_answer"
                          value={
                            form.expected_answer
                          }
                          onChange={
                            handleChange
                          }
                          disabled={saving}
                        >

                          <option value="Yes">
                            Yes
                          </option>

                          <option value="No">
                            No
                          </option>

                          <option value="NA">
                            NA
                          </option>

                        </select>


                        <LuChevronDown />

                      </div>

                    </div>


                    {/* PRIORITY */}

                    <div className="nso-rule-field">

                      <label htmlFor="priority">

                        Priority

                        <span className="nso-rule-required">
                          *
                        </span>

                      </label>


                      <div className="nso-rule-select-wrap">

                        <select
                          id="priority"
                          name="priority"
                          value={
                            form.priority
                          }
                          onChange={
                            handleChange
                          }
                          disabled={saving}
                        >

                          <option value="Low">
                            Low
                          </option>

                          <option value="Medium">
                            Medium
                          </option>

                          <option value="High">
                            High
                          </option>

                          <option value="Critical">
                            Critical
                          </option>

                        </select>


                        <LuChevronDown />

                      </div>

                    </div>


                    {/* SLA DAYS */}

                    <div className="nso-rule-field">

                      <label htmlFor="sla_days">

                        SLA Days

                        <span className="nso-rule-required">
                          *
                        </span>

                      </label>


                      <input
                        id="sla_days"
                        type="number"
                        name="sla_days"
                        min="1"
                        value={
                          form.sla_days
                        }
                        onChange={
                          handleChange
                        }
                        disabled={saving}
                      />

                    </div>


                    {/* CREATE ACTION POINT */}

                    <div className="nso-rule-field">

                      <label htmlFor="create_action_point">

                        Create Action Point

                      </label>


                      <div className="nso-rule-select-wrap">

                        <select
                          id="create_action_point"
                          name="create_action_point"
                          value={
                            form.create_action_point
                          }
                          onChange={
                            handleChange
                          }
                          disabled={saving}
                        >

                          <option value={1}>
                            Yes
                          </option>

                          <option value={0}>
                            No
                          </option>

                        </select>


                        <LuChevronDown />

                      </div>

                    </div>


                    {/* MANDATORY */}

                    <div className="nso-rule-field">

                      <label htmlFor="mandatory">

                        Mandatory

                      </label>


                      <div className="nso-rule-select-wrap">

                        <select
                          id="mandatory"
                          name="mandatory"
                          value={
                            form.mandatory
                          }
                          onChange={
                            handleChange
                          }
                          disabled={saving}
                        >

                          <option value={1}>
                            Yes
                          </option>

                          <option value={0}>
                            No
                          </option>

                        </select>


                        <LuChevronDown />

                      </div>

                    </div>


                    {/* STATUS */}

                    <div className="nso-rule-field">

                      <label htmlFor="is_active">

                        Status

                      </label>


                      <div className="nso-rule-select-wrap">

                        <select
                          id="is_active"
                          name="is_active"
                          value={
                            form.is_active
                          }
                          onChange={
                            handleChange
                          }
                          disabled={saving}
                        >

                          <option value={1}>
                            Active
                          </option>

                          <option value={0}>
                            Inactive
                          </option>

                        </select>


                        <LuChevronDown />

                      </div>

                    </div>


                  </div>

                </section>


                {/* =========================================
                    DEPARTMENT ASSIGNMENT
                ========================================= */}

                <section className="nso-rule-section">


                  <div className="nso-rule-section-heading">

                    <div className="nso-rule-section-icon">

                      <LuBuilding2 />

                    </div>


                    <div>

                      <h3>
                        Assign Departments
                      </h3>

                      <p>
                        Select the departments where this rule applies.
                      </p>

                    </div>

                  </div>


                  <div className="nso-rule-divider" />


                  {/* DEPARTMENT TOOLBAR */}

                  <div className="nso-rule-department-toolbar">


                    <div className="nso-rule-search">

                      <LuSearch />

                      <input
                        type="text"
                        placeholder="Search departments..."
                        value={
                          departmentSearch
                        }
                        onChange={(e) =>
                          setDepartmentSearch(
                            e.target.value
                          )
                        }
                        disabled={saving}
                      />

                    </div>


                    <button
                      type="button"
                      className="nso-rule-select-all"
                      onClick={
                        toggleAllDepartments
                      }
                      disabled={
                        saving ||
                        departments.length ===
                          0
                      }
                    >

                      {allDepartmentsSelected
                        ? "Clear All"
                        : "Select All"}

                    </button>

                  </div>


                  {/* SELECTED COUNT */}

                  <div className="nso-rule-selection-info">

                    <div>

                      <LuUsers />

                      <span>
                        Departments selected
                      </span>

                    </div>


                    <strong>
                      {selectedDepartmentCount}
                    </strong>

                  </div>


                  {/* DEPARTMENT LIST */}

                  <div className="nso-rule-department-list">


                    {filteredDepartments.length >
                    0 ? (

                      filteredDepartments.map(
                        (department) => {

                          const selected =
                            form.departments.includes(
                              department.id
                            );


                          return (

                            <label
                              key={
                                department.id
                              }
                              className={`nso-rule-department-item ${
                                selected
                                  ? "selected"
                                  : ""
                              }`}
                            >

                              <input
                                type="checkbox"
                                checked={
                                  selected
                                }
                                onChange={() =>
                                  toggleDepartment(
                                    department.id
                                  )
                                }
                                disabled={
                                  saving
                                }
                              />


                              <span className="nso-rule-custom-checkbox">

                                {selected && (
                                  <LuCheck />
                                )}

                              </span>


                              <span className="nso-rule-department-name">

                                {
                                  department.department_name
                                }

                              </span>

                            </label>

                          );

                        }
                      )

                    ) : (

                      <div className="nso-rule-empty">

                        <LuBuilding2 />

                        <span>
                          No departments found.
                        </span>

                      </div>

                    )}

                  </div>

                </section>


                {/* =========================================
                    INFORMATION NOTE
                ========================================= */}

                <div className="nso-rule-info-banner">

                  <div className="nso-rule-info-icon">

                    <LuCircleAlert />

                  </div>


                  <div>

                    <strong>
                      How this rule works
                    </strong>

                    <p>
                      When the selected trigger question
                      receives the configured expected answer,
                      this rule is evaluated. If action point
                      creation is enabled, an action point will
                      be generated according to the selected
                      priority and SLA.
                    </p>

                  </div>

                </div>


              </>

            )}

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="nso-rule-modal-footer">


            <button
              type="button"
              className="nso-rule-cancel-btn"
              onClick={handleClose}
              disabled={saving}
            >

              Cancel

            </button>


            <button
              type="submit"
              className="nso-rule-save-btn"
              disabled={
                saving ||
                loading
              }
            >

              {saving ? (

                <>

                  <LuLoaderCircle className="nso-rule-spinner" />

                  <span>
                    {editData
                      ? "Updating Rule..."
                      : "Creating Rule..."}
                  </span>

                </>

              ) : (

                <>

                  <LuSave />

                  <span>
                    {editData
                      ? "Update Rule"
                      : "Create Rule"}
                  </span>

                </>

              )}

            </button>


          </div>


        </form>

      </div>

    </div>

  );
}


export default AddRuleModal;
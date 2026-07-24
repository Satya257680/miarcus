import { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaPlus,
  FaTrash,
  FaFileExport,
  FaEdit,
} from "react-icons/fa";

import "../styles/Questions.css";

import AddQuestionModal from "../components/AddQuestionModal";

import {
  getQuestions,
  deleteQuestion,
  deleteAllQuestions,
} from "../services/questionService";

function Questions() {
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] = useState("");

  const [departmentFilter, setDepartmentFilter] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // ==========================
// RBAC
// ==========================

const permissions = JSON.parse(
  localStorage.getItem("permissions") || "{}"
);

const questionPermission =
  permissions["Questions"] || "None";

const canView =
  ["View", "Add", "Edit", "Full"].includes(
    questionPermission
  );

const canAdd =
  ["Add", "Edit", "Full"].includes(
    questionPermission
  );

const canEdit =
  ["Edit", "Full"].includes(
    questionPermission
  );

const canDelete =
  questionPermission === "Full";

  // ===============================
  // Load Questions
  // ===============================

  const loadQuestions = async () => {
    try {
      setLoading(true);

      const res = await getQuestions();

      setQuestions(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {

  if (!canView) {

    setLoading(false);

    return;

  }

  loadQuestions();

}, [canView]);

  // ===============================
  // Delete Question
  // ===============================

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;

    try {
      await deleteQuestion(id);

      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Delete failed.");
    }
  };

  // ===============================
  // Delete All
  // ===============================

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL Questions?")) return;

    try {
      await deleteAllQuestions();

      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Delete failed.");
    }
  };

  // ===============================
  // Edit
  // ===============================

  const handleEdit = (row) => {
    setSelectedQuestion(row);
    setShowModal(true);
  };

  // ===============================
  // Add
  // ===============================

  const handleAdd = () => {
    setSelectedQuestion(null);
    setShowModal(true);
  };

  // ===============================
  // Filters
  // ===============================

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        q.question?.toLowerCase().includes(search.toLowerCase()) ||
        q.checklist_name?.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        !typeFilter || q.checklist_name === typeFilter;

      const matchesDepartment =
        !departmentFilter ||
        q.departments?.includes(departmentFilter);

      return (
        matchesSearch &&
        matchesType &&
        matchesDepartment
      );
    });
  }, [
    questions,
    search,
    typeFilter,
    departmentFilter,
  ]);

  const checklistTypes = [
    ...new Set(
      questions.map((q) => q.checklist_name)
    ),
  ];

  const departments = [
    ...new Set(
      questions
        .flatMap((q) =>
          q.departments
            ? q.departments.split(", ")
            : []
        )
    ),
  ];

  return (
  <div className="questions-page">

    <div className="page-header">
      <h2>Checklist Questions</h2>
    </div>

    <div className="toolbar">

      <div className="search-box">

        <FaSearch />

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>

      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
      >
        <option value="">
          All Checklist Types
        </option>

        {checklistTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        value={departmentFilter}
        onChange={(e) => setDepartmentFilter(e.target.value)}
      >
        <option value="">
          All Departments
        </option>

        {departments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>

      {canAdd && (

        <button
          className="add-btn"
          onClick={handleAdd}
        >
          <FaPlus />
          Add Question
        </button>

      )}

      {canView && (

        <button className="export-btn">
          <FaFileExport />
          Export
        </button>

      )}

      {canDelete && (

        <button
          className="delete-btn"
          onClick={handleDeleteAll}
        >
          <FaTrash />
          Delete All
        </button>

      )}

    </div>

    {/* ===============================
        Questions Table
    =============================== */}

    <div className="table-container">

      <table className="questions-table">

        <thead>

          <tr>

            <th>Checklist Type</th>

            <th>Question</th>

            <th>Seq</th>

            <th>Answer Type</th>

            <th>SLA</th>

            <th>Departments</th>

            <th>Answer Required</th>

            <th>Status</th>

            <th width="140">Actions</th>

          </tr>

        </thead>

        <tbody>

          {loading ? (

            <tr>

              <td colSpan="9" style={{ textAlign: "center" }}>
                Loading...
              </td>

            </tr>

          ) : filteredQuestions.length === 0 ? (

            <tr>

              <td colSpan="9" style={{ textAlign: "center" }}>
                No Questions Found
              </td>

            </tr>

          ) : (

            filteredQuestions.map((row) => (

              <tr key={row.id}>

                <td>{row.checklist_name}</td>

                <td>{row.question}</td>

                <td>{row.sequence_no}</td>

                <td>{row.answer_type}</td>

                <td>
                  {row.sla_value
                    ? `${row.sla_value} ${row.sla_unit}`
                    : "-"}
                </td>

                <td>{row.departments || "-"}</td>

                <td>
                  {row.answer_required ? "Yes" : "No"}
                </td>

                <td>

                  <span
                    className={
                      row.status?.toLowerCase() === "active"
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    {row.status}
                  </span>

                </td>

                <td>

                  {canEdit && (

                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(row)}
                    >
                      <FaEdit />
                    </button>

                  )}

                  {canDelete && (

                    <button
                      className="delete-btn-table"
                      onClick={() => handleDelete(row.id)}
                    >
                      <FaTrash />
                    </button>

                  )}

                </td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </div>

    {/* ===============================
        Add / Edit Modal
    =============================== */}

    {(canAdd || canEdit) && showModal && (

      <AddQuestionModal
        question={selectedQuestion}
        onClose={() => {
          setShowModal(false);
          setSelectedQuestion(null);
        }}
        onSuccess={() => {
          setShowModal(false);
          setSelectedQuestion(null);
          loadQuestions();
        }}
      />

    )}

  </div>
);
}

export default Questions;
import React, { useEffect, useMemo, useState } from "react";

import {
  getRules,
  deleteRule,
} from "../services/nsoRuleService";

import AddRuleModal from "../components/AddRuleModal";

import "../styles/NSORules.css";

function NSORules() {

  // ==========================================
  // States
  // ==========================================

  const [rules, setRules] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editData, setEditData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  // ==========================================
// User & Permissions
// ==========================================

const user = JSON.parse(
  localStorage.getItem("user") || "{}"
);

const permissions = JSON.parse(
  localStorage.getItem("permissions") || "{}"
);

const isAdmin =
  user.administrator === true ||
  user.administrator === 1;

const permission =
  permissions["NSO Rules"] || "None";

const canView =
  isAdmin ||
  ["View", "Add", "Edit", "Full"].includes(permission);

const canAdd =
  isAdmin ||
  ["Add", "Full"].includes(permission);

const canEdit =
  isAdmin ||
  ["Edit", "Full"].includes(permission);

const canDelete =
  isAdmin ||
  permission === "Full";
  // ==========================================
  // Load Rules
  // ==========================================

  const loadRules = async () => {

    try {

      setLoading(true);

      const res = await getRules();

      setRules(res.data || []);

    } catch (err) {

      console.error(err);

      alert("Failed to load NSO Rules.");

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    loadRules();

  }, []);

  // ==========================================
  // Search
  // ==========================================

  const filteredRules = useMemo(() => {

    return rules.filter((rule) => {

      const trigger =
        rule.trigger_column?.toLowerCase() || "";

      const departments =
        rule.departments?.toLowerCase() || "";

      return (

        trigger.includes(search.toLowerCase()) ||

        departments.includes(search.toLowerCase())

      );

    });

  }, [rules, search]);

 // ==========================================
// Pagination
// ==========================================

const totalPages = Math.max(
  1,
  Math.ceil(filteredRules.length / rowsPerPage)
);

// Keep current page within valid range
const safeCurrentPage = Math.min(
  currentPage,
  totalPages
);

const indexOfLastRow =
  safeCurrentPage * rowsPerPage;

const indexOfFirstRow =
  indexOfLastRow - rowsPerPage;

const currentRows = filteredRules.slice(
  indexOfFirstRow,
  indexOfLastRow
);
// ==========================================
// Keep Page Valid
// ==========================================

useEffect(() => {

  if (currentPage > totalPages) {

    setCurrentPage(totalPages);

  }

}, [currentPage, totalPages]);
  // ==========================================
  // Open Add Modal
  // ==========================================

  const handleAdd = () => {

    setEditData(null);

    setShowModal(true);

  };

  // ==========================================
  // Open Edit Modal
  // ==========================================

  const handleEdit = (rule) => {

    setEditData(rule);

    setShowModal(true);

  };
    // ==========================================
  // Delete Rule
  // ==========================================

  const handleDelete = async (id) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this rule?"
    );

    if (!confirmDelete) return;

    try {

      await deleteRule(id);

      alert("Rule deleted successfully.");

      loadRules();

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "Failed to delete rule."
      );

    }

  };

  // ==========================================
  // No Permission
  // ==========================================

  if (!canView) {

    return (

      <div className="page-container">

        <h2>NSO Rules</h2>

        <p>You don't have permission to view this page.</p>

      </div>

    );

  }

  // ==========================================
  // JSX
  // ==========================================

  return (

    <div className="page-container">

      <div className="page-header">

        <h2>NSO Rules</h2>

        {canAdd && (

          <button

            className="add-btn"

            onClick={handleAdd}

          >

            + Add Rule

          </button>

        )}

      </div>

      {/* ================= Search ================= */}

      <div className="search-container">

        <input

          type="text"

          placeholder="Search..."

          value={search}

          onChange={(e) => {

            setSearch(e.target.value);

            setCurrentPage(1);

          }}

        />

      </div>

      {/* ================= Table ================= */}

      <div className="table-container">

        <table>

          <thead>

            <tr>

              <th>#</th>

              <th>Trigger Column</th>

              <th>Departments</th>

              <th>Actions</th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>

                <td colSpan="4">

                  Loading...

                </td>

              </tr>

            ) : currentRows.length === 0 ? (

              <tr>

                <td colSpan="4">

                  No Rules Found

                </td>

              </tr>

            ) : (

              currentRows.map((rule, index) => (

                <tr key={rule.id}>

                  <td>

                    {(currentPage - 1) * rowsPerPage + index + 1}

                  </td>

                  <td>

                    {rule.trigger_column}

                  </td>

                  <td>

                    {rule.departments}

                  </td>

                  <td>
  <div className="action-buttons">

    {canEdit && (
      <button
        className="edit-btn"
        onClick={() => handleEdit(rule)}
      >
        Edit
      </button>
    )}

    {canDelete && (
      <button
        className="delete-btn"
        onClick={() => handleDelete(rule.id)}
      >
        Delete
      </button>
    )}

  </div>
</td>
                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* ================= Modal ================= */}

      <AddRuleModal

        isOpen={showModal}

        onClose={() => {

          setShowModal(false);

          setEditData(null);

        }}

        onSuccess={() => {

          loadRules();

          setShowModal(false);

          setEditData(null);

        }}

        editData={editData}

      />
           {/* ================= Pagination ================= */}

{!loading && totalPages > 1 && (

  <div className="pagination">

    <button
      disabled={safeCurrentPage === 1}
      onClick={() =>
        setCurrentPage(safeCurrentPage - 1)
      }
    >
      Previous
    </button>

    {Array.from(
      { length: totalPages },
      (_, i) => (

        <button
          key={i + 1}
          className={
            safeCurrentPage === i + 1
              ? "active-page"
              : ""
          }
          onClick={() =>
            setCurrentPage(i + 1)
          }
        >
          {i + 1}
        </button>

      )
    )}

    <button
      disabled={safeCurrentPage === totalPages}
      onClick={() =>
        setCurrentPage(safeCurrentPage + 1)
      }
    >
      Next
    </button>

  </div>

)}

    </div>

  );

}

export default NSORules;
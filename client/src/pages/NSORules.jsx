import React, { useEffect, useRef, useState } from "react";

import {
  getRules,
  deleteRule,
  deleteAllRules,
  bulkUploadRules,
  exportRules,
} from "../services/nsoRuleService";

import AddRuleModal from "../components/AddRuleModal";
import BulkUploadModal from "../components/BulkUploadModal";

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

const [totalPages, setTotalPages] = useState(1);

const [totalRecords, setTotalRecords] = useState(0);

const [showBulkUpload, setShowBulkUpload] = useState(false);

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
  ["Add", "Edit", "Full"].includes(permission);

const canEdit =
  isAdmin ||
  ["Edit", "Full"].includes(permission);

const canDelete =
  isAdmin ||
  permission === "Full";

  // ==========================================
  // Load Rules
  // ==========================================

  const loadRules = async (

    page = currentPage,

    keyword = search

  ) => {

    try {

      setLoading(true);

      const res = await getRules(

        keyword,

        page,

        rowsPerPage

      );

      setRules(res.data || []);

      setTotalRecords(res.count || 0);

      setTotalPages(

        Math.max(

          1,

          Math.ceil(

            (res.count || 0) / rowsPerPage

          )

        )

      );

    } catch (err) {

      console.error(err);

      alert("Failed to load NSO Rules.");

    } finally {

      setLoading(false);

    }

  };

  // ==========================================
  // Load Data
  // ==========================================

  useEffect(() => {

    loadRules(

      currentPage,

      search

    );

  }, [

    currentPage,

    search

  ]);

  // ==========================================
  // Open Add Modal
  // ==========================================

      const handleAdd = () => {

  if (!canAdd) return;

  setEditData(null);

  setShowModal(true);

};

  // ==========================================
  // Open Edit Modal
  // ==========================================

 const handleEdit = (rule) => {

  if (!canEdit) return;

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
// Delete All Rules
// ==========================================

const handleDeleteAll = async () => {

  const confirmDelete = window.confirm(
    "Are you sure you want to delete ALL NSO Rules?"
  );

  if (!confirmDelete) return;

  try {

    await deleteAllRules();

    alert("All rules deleted successfully.");

    setCurrentPage(1);

    loadRules(1, "");

  } catch (err) {

    console.error(err);

    alert(

      err.response?.data?.message ||

      "Failed to delete all rules."

    );

  }

};
  // ==========================================
// Export Rules
// ==========================================

const handleExport = async () => {

  try {

    const response = await exportRules();

    const url = window.URL.createObjectURL(
      new Blob([response.data])
    );

    const link = document.createElement("a");

    link.href = url;

    link.setAttribute(
      "download",
      "NSO_Rules.csv"
    );

    document.body.appendChild(link);

    link.click();

    link.remove();

  } catch (err) {

    console.error(err);

    alert("Failed to export rules.");

  }

};

// ==========================================
// Clear Filters
// ==========================================

const handleClearFilters = () => {

  setSearch("");

  setCurrentPage(1);

  loadRules(1, "");

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

      {/* ================= Header ================= */}

      <div className="page-header">

  <h2>NSO Rules</h2>

  <div className="header-buttons">

    <button
      className="clear-btn"
      onClick={handleClearFilters}
    >
      Clear Filters
    </button>

    {canAdd && (

      <button
        className="add-btn"
        onClick={handleAdd}
      >
        + Add Rule
      </button>

    )}
    {canDelete && (

  <button
    className="delete-all-btn"
    onClick={handleDeleteAll}
  >
    Delete All
  </button>

)}
{canAdd && (
  <>
    <button
      className="bulk-upload-btn"
      onClick={() => setShowBulkUpload(true)}
    >
      Bulk Upload
    </button>

    <BulkUploadModal
      isOpen={showBulkUpload}
      onClose={() => setShowBulkUpload(false)}
      onSuccess={() => {
        loadRules(); // Replace with your actual function if it's named differently
        setShowBulkUpload(false);
      }}
      uploadFunction={bulkUploadRules}
      title="Bulk Upload NSO Rules"
    />
  </>
)}
    <button
      className="export-btn"
      onClick={handleExport}
    >
      Export
    </button>

  </div>

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

              {(canEdit || canDelete) && (

  <th>Actions</th>

)}
            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>

                <td colSpan="4">

                  Loading...

                </td>

              </tr>

            ) : rules.length === 0 ? (

              <tr>

                <td colSpan="4">

                  No Rules Found

                </td>

              </tr>

            ) : (

              rules.map((rule, index) => (

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

                  {(canEdit || canDelete) && (

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

)}
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

            disabled={currentPage === 1}

            onClick={() =>

              setCurrentPage(currentPage - 1)

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

                  currentPage === i + 1

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

            disabled={currentPage === totalPages}

            onClick={() =>

              setCurrentPage(currentPage + 1)

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
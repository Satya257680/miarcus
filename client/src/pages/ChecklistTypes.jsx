import { useEffect, useState } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaUpload,
  FaDownload,
} from "react-icons/fa";

import "../styles/ChecklistTypes.css";

import AddChecklistTypeModal from "../components/AddChecklistTypeModal";

import {
  getChecklistTypes,
  createChecklistType,
  updateChecklistType,
  deleteChecklistType,
  deleteAllChecklistTypes,
  exportChecklistTypes,
  importChecklistTypes,
} from "../services/checklistTypeService";

function ChecklistTypes() {

  // ==========================
  // States
  // ==========================

  const [checklists, setChecklists] = useState([]);
  const [filteredChecklists, setFilteredChecklists] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingChecklist, setEditingChecklist] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ==========================
  // Load Data
  // ==========================

  const fetchChecklistTypes = async () => {

    try {

      setLoading(true);

      const res = await getChecklistTypes();

      if (res.success) {

        setChecklists(res.data);
        setFilteredChecklists(res.data);

      } else {

        setChecklists([]);
        setFilteredChecklists([]);

      }

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "Unable to load Checklist Types"
      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    fetchChecklistTypes();
  }, []);

  // ==========================
  // Search
  // ==========================

  useEffect(() => {

    const keyword = search.toLowerCase();

    const filtered = checklists.filter((item) => {

      return (

        item.checklist_name?.toLowerCase().includes(keyword) ||

        item.departments?.toLowerCase().includes(keyword)

      );

    });

    setFilteredChecklists(filtered);

    setCurrentPage(1);

  }, [search, checklists]);

  // ==========================
  // Add
  // ==========================

  const handleAddChecklist = () => {

    setEditingChecklist(null);

    setShowModal(true);

  };

  // ==========================
  // Edit
  // ==========================

  const handleEdit = (item) => {

    setEditingChecklist(item);

    setShowModal(true);

  };

  // ==========================
  // Delete
  // ==========================

  const handleDelete = async (id) => {

    if (!window.confirm("Delete this Checklist Type?")) return;

    try {

      const res = await deleteChecklistType(id);

      if (res.success) {

        fetchChecklistTypes();

      }

    } catch (err) {

      console.error(err);

      alert(err.response?.data?.message || err.message);

    }

  };

  // ==========================
  // Delete All
  // ==========================

  const handleDeleteAll = async () => {

    if (!window.confirm("Delete ALL Checklist Types?")) return;

    try {

      const res = await deleteAllChecklistTypes();

      if (res.success) {

        fetchChecklistTypes();

      }

    } catch (err) {

      console.error(err);

      alert(err.response?.data?.message || err.message);

    }

  };

  // ==========================
  // Export
  // ==========================

  const handleExport = async () => {

    try {

      const response = await exportChecklistTypes();

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");

      link.href = url;

      link.download = "ChecklistTypes.xlsx";

      link.click();

    } catch (err) {

      console.error(err);

      alert("Export failed");

    }

  };

  // ==========================
  // Import
  // ==========================

  const handleImport = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    try {

      const res = await importChecklistTypes(file);

      if (res.success) {

        fetchChecklistTypes();

      }

    } catch (err) {

      console.error(err);

      alert(err.response?.data?.message || err.message);

    }

  };

  // ==========================
  // Save
  // ==========================

  const handleSave = async (data) => {

    try {

      let res;

      if (editingChecklist) {

        res = await updateChecklistType(
          editingChecklist.id,
          data
        );

      } else {

        res = await createChecklistType(data);

      }

      if (res.success) {

        setShowModal(false);

        setEditingChecklist(null);

        fetchChecklistTypes();

      }

    } catch (err) {

      console.error(err);

      alert(err.response?.data?.message || err.message);

    }

  };

  // ==========================
  // Pagination
  // ==========================

  const indexOfLastRow = currentPage * rowsPerPage;

  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const currentChecklistTypes = filteredChecklists.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  const totalPages = Math.ceil(
    filteredChecklists.length / rowsPerPage
  );
  return (
  <div className="checklist-page">

    {/* ================= Header ================= */}

    <div className="checklist-header">

      <h2>Checklist Types</h2>

      <div className="checklist-actions">

        <button
          className="add-btn"
          onClick={handleAddChecklist}
        >
          <FaPlus />
          Add Checklist
        </button>

        <button
          className="export-btn"
          onClick={handleExport}
        >
          <FaDownload />
          Export
        </button>

        <label className="import-btn">

          <FaUpload />
          Import

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleImport}
          />

        </label>

        <button
          className="delete-all-btn"
          onClick={handleDeleteAll}
        >
          <FaTrash />
          Delete All
        </button>

      </div>

    </div>

    {/* ================= Search ================= */}

    <div className="checklist-search">

      <FaSearch />

      <input
        type="text"
        placeholder="Search Checklist..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

    </div>

    {/* ================= Table ================= */}

    <div className="checklist-table-container">

      <table className="checklist-table">

        <thead>

          <tr>

            <th>#</th>

            <th>Checklist Name</th>

            <th>Departments Allowed</th>

            <th>Allow Past Submission</th>

            <th>Cutoff Time</th>

            <th>Status</th>

            <th>Actions</th>

          </tr>

        </thead>

        <tbody>

          {loading ? (

            <tr>

              <td colSpan="7" className="text-center">
                Loading...
              </td>

            </tr>

          ) : currentChecklistTypes.length === 0 ? (

            <tr>

              <td colSpan="7" className="text-center">
                No Checklist Types Found
              </td>

            </tr>

          ) : (

            currentChecklistTypes.map((item, index) => (

              <tr key={item.id}>

                <td>{indexOfFirstRow + index + 1}</td>

                <td>{item.checklist_name}</td>

                <td>{item.departments || "-"}</td>

                <td>
                  {item.allow_past_submission ? "Yes" : "No"}
                </td>

                <td>{item.cutoff_time || "-"}</td>

                <td>

                  <span
                    className={
                      item.status === "Active"
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    {item.status}
                  </span>

                </td>

  <td>
  <div className="action-buttons">

    <button
      className="edit-btn"
      onClick={() => handleEdit(item)}
      title="Edit"
    >
      Edit <FaEdit />
    </button>

    <button
      className="delete-btn"
      onClick={() => handleDelete(item.id)}
      title="Delete"
    >
      <FaTrash />
    </button>

  </div>
</td>
              </tr>

            ))

          )}

        </tbody>

      </table>

    </div>

    {/* ================= Pagination ================= */}

    <div className="pagination">

      <div className="rows-per-page">

        <span>Rows Per Page :</span>

        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>

      </div>

      <div className="page-buttons">

        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>

        <span>

          Page {currentPage} of {totalPages || 1}

        </span>

        <button
          disabled={
            currentPage === totalPages ||
            totalPages === 0
          }
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>

      </div>

    </div>

    {/* ================= Modal ================= */}

    {showModal && (

      <AddChecklistTypeModal
        checklist={editingChecklist}
        onSave={handleSave}
        onClose={() => {

          setShowModal(false);

          setEditingChecklist(null);

        }}
      />

    )}

  </div>
);

}

export default ChecklistTypes;
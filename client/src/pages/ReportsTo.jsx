import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import AddReportModal from "../components/AddReportModal";
import "../styles/ReportsTo.css";

function ReportsTo() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

 // Bulk Upload
const [showBulkModal, setShowBulkModal] = useState(false);
const [selectedFile, setSelectedFile] = useState(null);
const [uploading, setUploading] = useState(false);
  useEffect(() => {
    loadReports();
  }, []);

  // ===============================
  // Load Managers
  // ===============================
  const loadReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/reports");
      setReports(res.data.reports || []);
    } catch (err) {
      console.log(err);
    }
  };

  // ===============================
  // Bulk Upload
  // ===============================
 const handleBulkUpload = async () => {
  if (!selectedFile) {
    alert("Please select a CSV or Excel file.");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    setUploading(true);

    const res = await axios.post(
      "http://localhost:5000/api/reports/bulk-upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    alert(res.data.message);

    setSelectedFile(null);
    setShowBulkModal(false);

    loadReports();
  } catch (err) {
    console.log(err);
    alert("Bulk upload failed.");
  } finally {
    setUploading(false);
  }
};

  // ===============================
  // Delete Manager
  // ===============================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this manager?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/reports/${id}`);
      loadReports();
    } catch (err) {
      console.log(err);
    }
  };

  // ===============================
  // Edit Manager
  // ===============================
  const handleEdit = (manager) => {
    setEditData(manager);
    setShowModal(true);
  };

  const filteredReports = reports.filter((item) =>
    item.manager_name.toLowerCase().includes(search.toLowerCase())
  );

 return (
  <div className="reports-page">
    <div className="reports-header">
      <h2>Reports To</h2>

      <div className="report-actions">

        <button
          className="bulk-btn"
          onClick={() => setShowBulkModal(true)}
        >
          <FaUpload /> Bulk Add
        </button>

        <button
          className="add-report-btn"
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
        >
          <FaPlus /> Add Manager
        </button>

      </div>
    </div>

    <div className="reports-search">
      <FaSearch />
      <input
        type="text"
        placeholder="Search Manager..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    <table className="reports-table">
      <thead>
        <tr>
          <th>Manager Name</th>
          <th>Department</th>
          <th>Designation</th>
          <th>Status</th>
          <th width="150">Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredReports.length === 0 ? (
          <tr>
            <td colSpan="5" align="center">
              No Managers Found
            </td>
          </tr>
        ) : (
          filteredReports.map((manager) => (
            <tr key={manager.id}>
              <td>{manager.manager_name}</td>
              <td>{manager.department}</td>
              <td>{manager.designation}</td>
              <td>{manager.status}</td>

              <td>
                <button
                  className="edit-btn"
                  onClick={() => handleEdit(manager)}
                >
                  <FaEdit />
                </button>

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(manager.id)}
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>

    {/* Bulk Upload Modal */}
    {showBulkModal && (
      <div className="modal-overlay">
        <div className="bulk-modal">

          <h2>Bulk Add Managers</h2>

          <p>
            Upload a CSV or Excel file to create managers.
          </p>

          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />

          <div className="bulk-buttons">

            <button
              onClick={() => {
                setShowBulkModal(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleBulkUpload}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload Managers"}
            </button>

          </div>

        </div>
      </div>
    )}

    {/* Add/Edit Manager Modal */}
    {showModal && (
      <AddReportModal
        editData={editData}
        closeModal={() => setShowModal(false)}
        refresh={loadReports}
      />
    )}
  </div>
);
}

export default ReportsTo;
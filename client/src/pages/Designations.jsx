import { useEffect, useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

import "../styles/Departments.css";
import DesignationModal from "../components/designations/DesignationModal";

import {
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from "../services/designationService";

import { getDepartments } from "../services/departmentService";

function Designations() {
  const [designations, setDesignations] = useState([]);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editDesignation, setEditDesignation] = useState(null);

  // ==========================
  // Load Designations
  // ==========================

  const fetchDesignations = async () => {
    try {
      setLoading(true);

      const res = await getDesignations();

      if (res.success) {
        setDesignations(res.data);
        setFilteredDesignations(res.data);
      } else {
        setDesignations([]);
        setFilteredDesignations([]);
      }
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
        "Unable to load Designations."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Load Departments
  // ==========================

  const fetchDepartments = async () => {
    try {
      const res = await getDepartments();

      if (res.success) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDesignations();
    fetchDepartments();
  }, []);

  // ==========================
  // Search
  // ==========================

  useEffect(() => {
    const keyword = search.toLowerCase();

    const filtered = designations.filter((item) => {
      const designation =
        item.designation_name?.toLowerCase() || "";

      const department =
        item.department_name?.toLowerCase() || "";

      const description =
        item.description?.toLowerCase() || "";

      return (
        designation.includes(keyword) ||
        department.includes(keyword) ||
        description.includes(keyword)
      );
    });

    setFilteredDesignations(filtered);
  }, [search, designations]);

  // ==========================
  // Add
  // ==========================

  const handleAdd = () => {
    setEditDesignation(null);
    setShowModal(true);
  };

  // ==========================
  // Edit
  // ==========================

  const handleEdit = (designation) => {
    setEditDesignation(designation);
    setShowModal(true);
  };

  // ==========================
  // Delete
  // ==========================

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this designation?"
      )
    )
      return;

    try {
      const res = await deleteDesignation(id);

      if (res.success) {
        fetchDesignations();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
        err.message
      );
    }
  };

  // ==========================
  // Save
  // ==========================

  const handleSave = async (data) => {
    try {
      let res;

      if (editDesignation) {
        res = await updateDesignation(
          editDesignation.id,
          data
        );
      } else {
        res = await createDesignation(data);
      }

      if (res.success) {
        setShowModal(false);
        setEditDesignation(null);
        fetchDesignations();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
        err.message
      );
    }
  };
    return (
    <div className="departments-page">

      <div className="departments-header">
        <h2>Designations</h2>

        <button
          className="add-btn"
          onClick={handleAdd}
        >
          <FaPlus />
          <span>Add Designation</span>
        </button>
      </div>

      <div className="search-box">
        <FaSearch className="search-icon" />

        <input
          type="text"
          placeholder="Search Designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Description</th>
              <th>Status</th>
              <th width="150">Actions</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td colSpan="6" className="loading">
                  Loading...
                </td>
              </tr>

            ) : filteredDesignations.length === 0 ? (

              <tr>
                <td colSpan="6" className="loading">
                  No Designations Found
                </td>
              </tr>

            ) : (

              filteredDesignations.map((designation) => (

                <tr key={designation.id}>

                  <td>{designation.id}</td>

                  <td>{designation.department_name}</td>

                  <td>{designation.designation_name}</td>

                  <td>{designation.description || "-"}</td>

                  <td>
                    <span
                      className={
                        designation.status === "Active"
                          ? "status active"
                          : "status inactive"
                      }
                    >
                      {designation.status}
                    </span>
                  </td>

                  <td>

                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(designation)}
                    >
                      <FaEdit />
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(designation.id)}
                    >
                      <FaTrash />
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>
      </div>

      <DesignationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditDesignation(null);
        }}
        onSave={handleSave}
        designation={editDesignation}
        departments={departments}
      />

    </div>
  );
}

export default Designations;
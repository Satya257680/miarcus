import { useEffect, useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

import "../styles/Departments.css";
import DepartmentModal from "../components/departments/DepartmentModal";

import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../services/departmentService";

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editDepartment, setEditDepartment] = useState(null);

  // ==========================
  // Load Departments
  // ==========================

  const fetchDepartments = async () => {
    try {
      setLoading(true);

      const res = await getDepartments();

      if (res.success) {
        setDepartments(res.data);
        setFilteredDepartments(res.data);
      } else {
        setDepartments([]);
        setFilteredDepartments([]);
      }
    } catch (err) {
      console.error("Fetch Departments Error:", err);
      console.error("Response:", err.response?.data);

      alert(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to load departments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // ==========================
  // Search
  // ==========================

  useEffect(() => {
    const keyword = search.toLowerCase();

    const filtered = departments.filter((item) => {
      const name = item.department_name?.toLowerCase() || "";
      const description = item.description?.toLowerCase() || "";

      return (
        name.includes(keyword) ||
        description.includes(keyword)
      );
    });

    setFilteredDepartments(filtered);
  }, [search, departments]);

  // ==========================
  // Add Department
  // ==========================

  const handleAdd = () => {
    setEditDepartment(null);
    setShowModal(true);
  };

  // ==========================
  // Edit Department
  // ==========================

  const handleEdit = (department) => {
    setEditDepartment(department);
    setShowModal(true);
  };

  // ==========================
  // Delete Department
  // ==========================

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this department?"
      )
    ) {
      return;
    }

    try {
      const res = await deleteDepartment(id);

      if (res.success) {
        fetchDepartments();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error("Delete Error:", err);
      console.error("Response:", err.response?.data);

      alert(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message
      );
    }
  };

  // ==========================
  // Save Department
  // ==========================

  const handleSave = async (data) => {
    try {
      let res;

      if (editDepartment) {
        res = await updateDepartment(editDepartment.id, data);
      } else {
        res = await createDepartment(data);
      }

      if (res.success) {
        setShowModal(false);
        setEditDepartment(null);
        fetchDepartments();
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error("Save Error:", err);
      console.error("Backend Response:", err.response?.data);

      alert(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message
      );
    }
  };

  return (
    <div className="departments-page">

      <div className="departments-header">
        <h2>Departments</h2>

        <button
          className="add-btn"
          onClick={handleAdd}
        >
          <FaPlus />
          <span>Add Department</span>
        </button>
      </div>

      <div className="search-box">
        <FaSearch className="search-icon" />

        <input
          type="text"
          placeholder="Search Department..."
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
              <th>Description</th>
              <th>Status</th>
              <th width="150">Actions</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td colSpan="5" className="loading">
                  Loading...
                </td>
              </tr>

            ) : filteredDepartments.length === 0 ? (

              <tr>
                <td colSpan="5" className="loading">
                  No Departments Found
                </td>
              </tr>

            ) : (

              filteredDepartments.map((department) => (

                <tr key={department.id}>

                  <td>{department.id}</td>

                  <td>{department.department_name}</td>

                  <td>{department.description || "-"}</td>

                  <td>
                    <span
                      className={
                        department.status === "Active"
                          ? "status active"
                          : "status inactive"
                      }
                    >
                      {department.status}
                    </span>
                  </td>
<td>
  <div className="action-buttons">

    <button
      className="edit-btn"
      onClick={() => handleEdit(department)}
    >
      Edit <FaEdit />
    </button>

    <button
      className="delete-btn"
      onClick={() => handleDelete(department.id)}
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

      <DepartmentModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditDepartment(null);
        }}
        onSave={handleSave}
        department={editDepartment}
      />

    </div>
  );
}

export default Departments;

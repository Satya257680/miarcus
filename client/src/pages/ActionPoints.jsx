import { useEffect, useState } from "react";
import axios from "axios";

import CreatePointModal from "../components/CreatePointModal";
import "../styles/ActionPoints.css";

import {
  FaPlusSquare,
  FaDownload,
  FaRedoAlt,
  FaSearch,
} from "react-icons/fa";

function ActionPoints() {
  const [stores, setStores] = useState([]);
  const [actionPoints, setActionPoints] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchActionPoints();
  }, []);

  // ================= Fetch Stores =================

  const fetchStores = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/stores");

      console.log("Stores:", res.data);

      setStores(res.data);
    } catch (err) {
      console.error("Store Error:", err);
    }
  };

  // ================= Fetch Action Points =================

  const fetchActionPoints = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/action-points"
      );

      setActionPoints(res.data);
    } catch (err) {
      console.error("Action Point Error:", err);
    }
  };

  return (
    <div className="action-page">
      {/* ================= Filter Card ================= */}

      <div className="action-card">
        <h2 className="title">Action Points</h2>

        <div className="filter-row">
          {/* Store */}

          <select>
            <option value="">All Stores/Locations</option>

            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.store_name} ({store.store_code})
              </option>
            ))}
          </select>

          {/* Department */}

          <select>
            <option>All Departments</option>
          </select>

          {/* Status */}

          <select>
            <option>All Statuses</option>
          </select>

          {/* Checklist */}

          <select>
            <option>All Checklist Types</option>
          </select>

          {/* Dates */}

          <div className="date-group">
            <label>Start Date</label>
            <input type="date" />
          </div>

          <div className="date-group">
            <label>End Date</label>
            <input type="date" />
          </div>
        </div>

        {/* Search */}

        <div className="bottom-row">
          <div className="search-box">
            <FaSearch />

            <input
              type="text"
              placeholder="Search action points..."
            />
          </div>

          {/* Buttons */}

          <div className="button-group">
            <button
              className="create-btn"
              onClick={() => setShowModal(true)}
            >
              <FaPlusSquare />
              Create Point
            </button>

            <button className="export-btn">
              <FaDownload />
              Export CSV
            </button>

            <button className="clear-btn">
              <FaRedoAlt />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* ================= Table ================= */}

      <div className="table-container">
        <table className="action-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Store</th>
              <th>Department</th>
              <th>Question</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {actionPoints.length > 0 ? (
              actionPoints.map((item) => (
                <tr key={item.id}>
                  <td>{item.created_at}</td>
                  <td>
                    {item.store_name} ({item.store_code})
                  </td>
                  <td>{item.department}</td>
                  <td>{item.question}</td>
                  <td>{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">
                  No Action Points Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= Modal ================= */}

      <CreatePointModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          fetchActionPoints();
        }}
        stores={stores}
      />
    </div>
  );
}

export default ActionPoints;
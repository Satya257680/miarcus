import { useEffect, useState } from "react";
import axios from "axios";

import Layout from "../components/Layout";
import CreatePointModal from "../components/CreatePointModal";
import "../styles/ActionPoints.css";

import {
  FaPlusSquare,
  FaDownload,
  FaRedoAlt,
  FaSearch,
} from "react-icons/fa";

function ActionPoints() {

  // ================= States =================

  const [stores, setStores] = useState([]);
  const [actionPoints, setActionPoints] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Filters

  const [selectedStore, setSelectedStore] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedChecklist, setSelectedChecklist] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStores();
    fetchActionPoints();
  }, []);

  // ================= Fetch Stores =================

  const fetchStores = async () => {
    try {

      const res = await axios.get(
        "http://localhost:5000/api/stores"
      );

      setStores(res.data);

    } catch (err) {

      console.log(err);

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

      console.log(err);

    }

  };

  // ================= Export CSV =================

  const exportCSV = () => {

    if (actionPoints.length === 0) {
      alert("No Action Points Found");
      return;
    }

    const headers = [
      "Date",
      "Store",
      "Department",
      "Question",
      "Status",
    ];

    const rows = actionPoints.map((item) => [

      item.created_at,

      `${item.store_name} (${item.store_code})`,

      item.department,

      item.question,

      item.status,

    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "ActionPoints.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

  };

  // ================= Clear Filters =================

  const clearFilters = () => {

    setSelectedStore("");
    setSelectedDepartment("");
    setSelectedStatus("");
    setSelectedChecklist("");
    setStartDate("");
    setEndDate("");
    setSearch("");

  };

  // ================= Filter Data =================

  const filteredData = actionPoints.filter((item) => {

    const searchText = search.toLowerCase();

    const matchSearch =
      item.question?.toLowerCase().includes(searchText) ||
      item.department?.toLowerCase().includes(searchText) ||
      item.store_name?.toLowerCase().includes(searchText);

    const matchStore =
      selectedStore === "" ||
      item.store_id == selectedStore;

    const matchDepartment =
      selectedDepartment === "" ||
      item.department === selectedDepartment;

    const matchStatus =
      selectedStatus === "" ||
      item.status === selectedStatus;

    return (
      matchSearch &&
      matchStore &&
      matchDepartment &&
      matchStatus
    );

  });
  return (

<Layout>

<div className="action-page">

    {/* ================= Filter Card ================= */}

    <div className="action-card">

      <h2 className="title">Action Points</h2>

      <div className="filter-row">

        {/* Store */}

        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
        >
          <option value="">All Stores/Locations</option>

          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.store_name} ({store.store_code})
            </option>
          ))}

        </select>

        {/* Department */}

        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >

          <option value="">All Departments</option>
          <option value="Management">Management</option>
          <option value="HR">HR</option>
          <option value="Accounts">Accounts</option>
          <option value="Sales">Sales</option>

        </select>

        {/* Status */}

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >

          <option value="">All Statuses</option>
          <option value="No Action Taken">No Action Taken</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>

        </select>

        {/* Checklist */}

        <select
          value={selectedChecklist}
          onChange={(e) => setSelectedChecklist(e.target.value)}
        >

          <option value="">All Checklist Types</option>

        </select>

        {/* Dates */}

        <div className="date-group">
          <label>Start Date</label>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="date-group">
          <label>End Date</label>

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

      </div>

      {/* ================= Search ================= */}

      <div className="bottom-row">

        <div className="search-box">

          <FaSearch />

          <input
            type="text"
            placeholder="Search action points..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

        </div>

        {/* ================= Buttons ================= */}

        <div className="button-group">

          <button
            className="create-btn"
            onClick={() => setShowModal(true)}
          >
            <FaPlusSquare />
            Create Point
          </button>

          <button
            className="export-btn"
            onClick={exportCSV}
          >
            <FaDownload />
            Export CSV
          </button>

          <button
            className="clear-btn"
            onClick={clearFilters}
          >
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

          {filteredData.length > 0 ? (

            filteredData.map((item) => (

              <tr key={item.id}>

                <td>
                  {new Date(item.created_at).toLocaleDateString()}
                </td>

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

              <td
                colSpan="5"
                className="no-data"
              >
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
  </Layout>
);

}

export default ActionPoints;
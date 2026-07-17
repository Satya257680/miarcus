import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaSearch,
  FaFileExport,
  FaFileImport,
  FaInfoCircle,
} from "react-icons/fa";

import "../styles/ChecklistReports.css";

function ChecklistReports() {
  const [reports, setReports] = useState([]);

  const [search, setSearch] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

 const [store, setStore] = useState("");
const [stores, setStores] = useState([]);
  const [employee, setEmployee] = useState("");
  const [checklist, setChecklist] = useState("");
  const [employees, setEmployees] = useState([]);

// Load reports when filters change
useEffect(() => {
  loadReports();
}, [
  search,
  fromDate,
  toDate,
  store,
  employee,
  checklist
]);
useEffect(() => {
  loadStores();
  loadEmployees();
}, []);

 const loadReports = async () => {
  try {
    const res = await axios.get(
      "http://localhost:5000/api/checklist-reports",
      {
        params: {
          search,
          fromDate,
          toDate,
          store,
          employee,
          checklist,
        },
      }
    );

    setReports(res.data.reports || []);
  } catch (err) {
    console.log(err);
  }
};
const clearFilters = () => {
  setSearch("");
  setFromDate("");
  setToDate("");
  setStore("");
  setEmployee("");
  setChecklist("");

  setTimeout(() => {
    loadReports();
  }, 100);
};
const exportCSV = () => {
   window.open(
      "http://localhost:5000/api/checklist-reports/export",
      "_blank"
   );
};
const handleImport = async(e)=>{

   const file=e.target.files[0];

   if(!file) return;

   const formData=new FormData();

   formData.append("file",file);

   await axios.post(
      "http://localhost:5000/api/checklist-reports/import",
      formData
   );

   loadReports();

}
const loadStores = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/stores");
    setStores(res.data);
  } catch (err) {
    console.log(err);
  }
};
const loadEmployees = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/users");

    setEmployees(res.data.users || []);

  } catch (err) {
    console.log(err);
  }
};
  return (
    <div className="checklist-page">

      {/* Header */}

      <div className="checklist-title">

        <h2>
          Checklist Reports
          <FaInfoCircle className="info-icon" />
        </h2>

      </div>

      {/* Note */}

      <div className="note-box">
        Note: Search and filters apply instantly. CSV export will export
        filtered records.
      </div>

      {/* Filters */}

      <div className="filter-grid">

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <select
          value={checklist}
          onChange={(e) => setChecklist(e.target.value)}
        >
          <option value="">Checklist Type</option>
        </select>
<select
  value={store}
  onChange={(e) => setStore(e.target.value)}
>
  <option value="">Store</option>

  {stores.map((item) => (
    <option key={item.id} value={item.store_name}>
      {item.store_name}
    </option>
  ))}
</select>
        <select
  value={employee}
  onChange={(e) => setEmployee(e.target.value)}
>
  <option value="">Employee</option>

  {employees.map((item) => (
    <option key={item.id} value={item.full_name}>
      {item.full_name}
    </option>
  ))}
</select>
      </div>

      {/* Search */}

      <div className="search-box">

        <FaSearch />

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>

  {/* Buttons */}

<div className="toolbar">

  <button
    className="export-btn"
    onClick={exportCSV}
  >
    <FaFileExport />
    Export CSV
  </button>

  <input
    type="file"
    id="csvFile"
    hidden
    accept=".csv"
    onChange={handleImport}
  />

  <button
    className="import-btn"
    onClick={() => document.getElementById("csvFile").click()}
  >
    <FaFileImport />
    Import CSV
  </button>

  <button
    className="clear-btn"
    onClick={clearFilters}
  >
    Clear Filters
  </button>

</div>

      {/* Table */}

      <table className="report-table">

        <thead>

          <tr>

            <th>Submitted At</th>

            <th>Status</th>

            <th>Checklist</th>

            <th>Store</th>

            <th>Employee</th>

            <th>Question</th>

            <th>Answer</th>

            <th>Comment</th>

            <th>Attachment</th>

            <th>Department</th>

            <th>Device</th>

            <th>Geo Location</th>

          </tr>

        </thead>

        <tbody>

          {reports.length === 0 ? (

            <tr>

              <td colSpan="12" align="center">

                No Reports Found

              </td>

            </tr>

          ) : (

            reports.map((item) => (

              <tr key={item.id}>

                <td>{item.submitted_at}</td>

                <td>{item.status}</td>

                <td>{item.checklist_name}</td>

                <td>{item.store}</td>

                <td>{item.employee}</td>

                <td>{item.question}</td>

                <td>{item.answer}</td>

                <td>{item.comment}</td>

                <td>{item.attachment}</td>

                <td>{item.department}</td>

                <td>{item.device}</td>

                <td>{item.geo_location}</td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </div>
  );
}

export default ChecklistReports;
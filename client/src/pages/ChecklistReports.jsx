import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  FaSearch,
  FaFileExport,
  FaFileImport,
  FaEye,
  FaTrash,
  FaEdit,
  FaTimes,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaUpload
} from "react-icons/fa";

import "../styles/ChecklistReports.css";

const API = "http://localhost:5000/api";

function ChecklistReports() {

  // ===========================
  // STATES
  // ===========================
  const [showImportModal,setShowImportModal] = useState(false);
const [importFile,setImportFile] = useState(null);

  const [reports, setReports] = useState([]);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [checklistTypes, setChecklistTypes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedStore, setSelectedStore] = useState("");
  const [selectedChecklist, setSelectedChecklist] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // ===========================
// RBAC
// ===========================

const user = JSON.parse(
  localStorage.getItem("user") || "{}"
);

const permissions = JSON.parse(
  localStorage.getItem("permissions") || "{}"
);

// Administrator always gets Full Access
const isAdmin =
  user.administrator === true ||
  user.administrator === 1;

const reportPermission = isAdmin
  ? "Full"
  : permissions["Checklist Reports"] || "None";

const canView =
  ["View", "Add", "Edit", "Full"].includes(
    reportPermission
  );

const canAdd =
  ["Add", "Edit", "Full"].includes(
    reportPermission
  );

const canEdit =
  ["Edit", "Full"].includes(
    reportPermission
  );

const canDelete =
  reportPermission === "Full";

  // ===========================
// LOAD DATA
// ===========================

useEffect(() => {

  if (!canView) {

    setLoading(false);

    return;

  }

  loadData();

}, [canView]);

const loadData = async () => {

  try {

    setLoading(true);

    const results = await Promise.allSettled([

      axios.get(`${API}/checklist-reports`),

      axios.get(`${API}/stores`),

      axios.get(`${API}/checklist-types`),

      axios.get(`${API}/users`)

    ]);

    const [

      reportRes,

      storeRes,

      checklistRes,

      userRes

    ] = results;

    // ===========================
    // CHECKLIST REPORTS
    // ===========================

    if (reportRes.status === "fulfilled") {

      console.log(
        "REPORT API RESPONSE:",
        reportRes.value.data
      );

      console.log(
        "REPORTS:",
        reportRes.value.data.data
      );

      setReports(
        reportRes.value.data.data || []
      );

    } else {

      console.error(
        "Checklist Reports Error:",
        reportRes.reason
      );

      setReports([]);

    }

    // ===========================
    // STORES
    // ===========================

    if (storeRes.status === "fulfilled") {

      setStores(
        storeRes.value.data.data || []
      );

    } else {

      console.warn(
        "Stores API returned 403 or failed."
      );

      setStores([]);

    }

    // ===========================
    // CHECKLIST TYPES
    // ===========================

    if (checklistRes.status === "fulfilled") {

      setChecklistTypes(
        checklistRes.value.data.data || []
      );

    } else {

      console.warn(
        "Checklist Types API failed."
      );

      setChecklistTypes([]);

    }

    // ===========================
    // USERS
    // ===========================

    if (userRes.status === "fulfilled") {

      setUsers(
        userRes.value.data.data || []
      );

    } else {

      console.warn(
        "Users API failed."
      );

      setUsers([]);

    }

  } catch (err) {

    console.error(err);

  } finally {

    setLoading(false);

  }

};
 // ===========================
// DELETE REPORT
// ===========================

const deleteReport = async (id) => {

  if (!canDelete) {

    alert("You don't have permission to delete reports.");

    return;

  }

  if (!window.confirm("Delete this report?")) {

    return;

  }

  try {

    await axios.delete(
      `${API}/checklist-reports/${id}`
    );

    loadData();

  } catch (err) {

    console.log(err);

    alert(
      err.response?.data?.message ||
      "Unable to delete report."
    );

  }

};
  // ===========================
// VIEW REPORT
// ===========================

const viewReport = async (id) => {

  if (!canView) {

    alert("You don't have permission to view reports.");

    return;

  }

  try {

    const res = await axios.get(
      `${API}/checklist-reports/${id}`
    );

    setSelectedReport(res.data.data);

    setShowModal(true);

  } catch (err) {

    console.log(err);

    alert(
      err.response?.data?.message ||
      "Unable to load report."
    );

  }

};

// ===========================
// EDIT REPORT
// ===========================

const [showEditModal, setShowEditModal] = useState(false);

const [editingReport, setEditingReport] = useState({

  id: "",

  status: "",

  answer: "",

  remarks: ""

});

// ===========================
// UPDATE REPORT
// ===========================

const updateReport = async () => {

  if (!canEdit) {

    alert("You don't have permission to edit reports.");

    return;

  }

  try {

    await axios.put(

      `${API}/checklist-reports/${editingReport.id}`,

      {

        status: editingReport.status,

        answer: editingReport.answer,

        remarks: editingReport.remarks

      }

    );

    alert("Report Updated Successfully");

    setShowEditModal(false);

    loadData();

  } catch (error) {

    console.log(error);

    console.log(error.response);

    console.log(error.response?.data);

    alert(

      error.response?.data?.message ||

      error.message ||

      "Unable to update report."

    );

  }

};

// ===========================
// OPEN EDIT MODAL
// ===========================

const handleEdit = (item) => {

  if (!canEdit) {

    alert("You don't have permission to edit reports.");

    return;

  }

  setEditingReport({

    id: item.id,

    status: item.status || "",

    submission_date: item.submission_date || "",

    device: item.device || "",

    answer: item.answer || "",

    remarks: item.remarks || ""

  });

  setShowEditModal(true);

};
   // ===========================
// EXPORT CSV
// ===========================

const exportCSV = () => {

  if (!canView) {

    alert("You don't have permission to export reports.");

    return;

  }

  if (filteredReports.length === 0) {

    alert("No records found.");

    return;

  }

  const rows = filteredReports.map((r) => ({

    "Submitted At": r.submission_date,

    Status: r.status,

    Checklist: r.checklist_name,

    Store: r.store_name,

    Employee: r.employee_name,

    "Employee ID": r.employee_id || "-",

    Question: r.question || "-",

    Answer: r.answer || "-",

    Comment: r.remarks || "-",

    Department: r.department_name || "-",

    Latitude: r.latitude || "-",

    Longitude: r.longitude || "-",

  }));

  const csv = [

    Object.keys(rows[0]).join(","),

    ...rows.map((row) =>

      Object.values(row)

        .map((item) => `"${item}"`)

        .join(",")

    ),

  ].join("\n");

  const blob = new Blob([csv], {

    type: "text/csv;charset=utf-8;",

  });

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = "ChecklistReports.csv";

  link.click();

  window.URL.revokeObjectURL(url);

};

// ===========================
// IMPORT CSV
// ===========================

const handleImportCSV = async () => {

  if (!canAdd) {

    alert("You don't have permission to import reports.");

    return;

  }

  if (!importFile) {

    alert("Please select CSV file");

    return;

  }

  const formData = new FormData();

  formData.append(
    "file",
    importFile
  );

  try {

    const response = await axios.post(

      `${API}/checklist-reports/import`,

      formData,

      {

        headers: {

          "Content-Type": "multipart/form-data",

        },

      }

    );

    alert(response.data.message);

    setShowImportModal(false);

    setImportFile(null);

    // Refresh reports

    loadData();

  } catch (error) {

    console.error(
      "CSV IMPORT ERROR:",
      error.response?.data || error
    );

    alert(

      error.response?.data?.message ||

      "CSV upload failed"

    );

  }

};

  // ===========================
  // FILTER REPORTS
  // ===========================

  const filteredReports = useMemo(() => {

    return reports.filter((item) => {

      const searchMatch =
        !search ||
        item.store_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        item.checklist_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        item.employee_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        item.question
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        item.answer
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const storeMatch =
        !selectedStore ||
        item.store_id == selectedStore;

      const checklistMatch =
        !selectedChecklist ||
        item.checklist_type_id == selectedChecklist;

      const employeeMatch =
        !selectedEmployee ||
        item.submitted_by == selectedEmployee;

      const fromMatch =
        !fromDate ||
        new Date(item.submission_date) >=
          new Date(fromDate);

      const toMatch =
        !toDate ||
        new Date(item.submission_date) <=
          new Date(toDate + "T23:59:59");

      return (
        searchMatch &&
        storeMatch &&
        checklistMatch &&
        employeeMatch &&
        fromMatch &&
        toMatch
      );
    });

  }, [
    reports,
    search,
    selectedStore,
    selectedChecklist,
    selectedEmployee,
    fromDate,
    toDate,
  ]);

 // ===========================
// PAGINATION
// ===========================

const indexOfLast = currentPage * rowsPerPage;

const indexOfFirst = indexOfLast - rowsPerPage;

const currentReports = filteredReports.slice(
  indexOfFirst,
  indexOfLast
);

const totalPages = Math.ceil(
  filteredReports.length / rowsPerPage
);

useEffect(() => {

  setCurrentPage(1);

}, [
  search,
  selectedStore,
  selectedChecklist,
  selectedEmployee,
  fromDate,
  toDate,
  rowsPerPage,
]);


// ===========================
// ACCESS DENIED
// ===========================

if (!canView) {

  return (

    <div className="no-permission">

      <h2>Access Denied</h2>

      <p>
        You don't have permission to view Checklist Reports.
      </p>

    </div>

  );

}

// ===========================
// LOADING
// ===========================

if (loading) {

  return (

    <div className="reports-loading">

      Loading Checklist Reports...

    </div>

  );

}
  // ===========================
  // JSX START
  // ===========================

  return (
    <div className="reports-page">
            {/* ================= HEADER ================= */}

      <div className="reports-header">

        <div>

          <h2>Checklist Reports</h2>

          <p className="reports-subtitle">
            Total Reports : <strong>{filteredReports.length}</strong>
          </p>

        </div>

       
      </div>

      {/* ================= NOTE ================= */}

      <div className="report-note">

        <FaInfoCircle />

        <span>
          Reports are generated from submitted checklist
          answers. Use the filters below to find specific
          reports.
        </span>

      </div>

      {/* ================= FILTER CARD ================= */}

      <div className="reports-filter-card">

        <div className="filter-grid">

          <div className="filter-item">

            <label>From Date</label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) =>
                setFromDate(e.target.value)
              }
            />

          </div>

          <div className="filter-item">

            <label>To Date</label>

            <input
              type="date"
              value={toDate}
              onChange={(e) =>
                setToDate(e.target.value)
              }
            />

          </div>

          <div className="filter-item">

            <label>Checklist Type</label>

            <select
              value={selectedChecklist}
              onChange={(e) =>
                setSelectedChecklist(e.target.value)
              }
            >

              <option value="">
                All Checklist Types
              </option>

              {checklistTypes.map((item) => (

                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.checklist_name}
                </option>

              ))}

            </select>

          </div>

          <div className="filter-item">

            <label>Store</label>

            <select
              value={selectedStore}
              onChange={(e) =>
                setSelectedStore(e.target.value)
              }
            >

              <option value="">
                All Stores
              </option>

              {stores.map((item) => (

                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.store_name}
                </option>

              ))}

            </select>

          </div>
                    <div className="filter-item">

            <label>Employee</label>

            <select
              value={selectedEmployee}
              onChange={(e) =>
                setSelectedEmployee(e.target.value)
              }
            >

              <option value="">
                All Employees
              </option>

              {users.map((item) => (

                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>

              ))}

            </select>

          </div>

          <div className="filter-item">

            <label>Search</label>

            <div className="search-box">

              <FaSearch />

              <input
                type="text"
                placeholder="Search by store, employee, checklist, question..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

          </div>

        </div>

        <div className="button-row">

         {canView && (

<button
  className="export-btn"
  onClick={exportCSV}
>

  <FaFileExport />

  Export CSV

</button>

)}
{canAdd && (

<button
  className="import-btn"
  onClick={() => setShowImportModal(true)}
>

  <FaUpload />

  Import CSV

</button>

)}
          <button
            className="clear-btn"
            onClick={() => {

              setSearch("");

              setFromDate("");

              setToDate("");

              setSelectedStore("");

              setSelectedChecklist("");

              setSelectedEmployee("");

            }}
          >

            <FaTimes />

            Clear Filters

          </button>

          <div className="rows-box">

            <span>Rows</span>

            <select
              value={rowsPerPage}
              onChange={(e) =>
                setRowsPerPage(Number(e.target.value))
              }
            >

              <option value={10}>10</option>

              <option value={25}>25</option>

              <option value={50}>50</option>

              <option value={100}>100</option>

            </select>

          </div>

        </div>

      </div>

      {/* ================= TABLE ================= */}

      <div className="report-table">

        <table>

         <thead>
  <tr>
    <th style={{minWidth:"150px"}}>Submitted At</th>
    <th style={{minWidth:"100px"}}>Status</th>
    <th style={{minWidth:"180px"}}>Checklist</th>
    <th style={{minWidth:"150px"}}>Store</th>
    <th style={{minWidth:"170px"}}>Employee</th>
    <th style={{minWidth:"100px"}}>Employee ID</th>
    <th style={{minWidth:"260px"}}>Question</th>
    <th style={{minWidth:"140px"}}>Answer</th>
    <th style={{minWidth:"220px"}}>Comment</th>
    <th style={{minWidth:"140px"}}>Department</th>
    <th style={{minWidth:"120px"}}>Attachment</th>
    <th style={{minWidth:"170px"}}>Device</th>
    <th style={{minWidth:"150px"}}>Geo Location</th>
    <th className="action-column">Action</th>
  </tr>
</thead>

          <tbody>            {currentReports.length > 0 ? (

              currentReports.map((item) => (

                <tr key={item.id}>

                  <td>
                    {new Date(
                      item.submission_date
                    ).toLocaleString("en-GB")}
                  </td>

                  <td>
                    <span
                      className={`status-badge ${
                        item.status
                          ?.toLowerCase()
                          .replace(/\s+/g, "-") || ""
                      }`}
                    >
                      {item.status || "Pending"}
                    </span>
                  </td>

                  <td>
                    {item.checklist_name}
                  </td>

                  <td>
                    {item.store_name}
                  </td>

                  <td>
                    {item.employee_name || "-"}
                  </td>

                  <td>
                    {item.employee_id || "-"}
                  </td>

                  <td className="question-cell">
                    {item.question || "-"}
                  </td>

                  <td>
                    {item.answer || "-"}
                  </td>

                  <td>
                    {item.remarks || "-"}
                  </td>

                  <td>
                    {item.department_name || "-"}
                  </td>

                 <td>

{
  item.attachment ? (

    <a
      href={`http://localhost:5000/${item.attachment}`}
      target="_blank"
      rel="noreferrer"
    >
      View
    </a>

  ) : (

    "-"

  )
}

</td>

                  <td>
                    {item.device || "-"}
                  </td>

                  <td>

                    {item.latitude &&
                    item.longitude ? (

                      <a
                        href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="map-link"
                      >

                        <FaMapMarkerAlt />

                        View Map

                      </a>

                    ) : (

                      "-"

                    )}

                  </td>
<td className="action-column">
  <div className="action-buttons">

    {canView && (
      <button
        className="view-btn"
        onClick={() => viewReport(item.id)}
        title="View"
      >
        <FaEye />
      </button>
    )}

    {canEdit && (
      <button
        className="edit-btn"
        onClick={() => handleEdit(item)}
        title="Edit"
      >
        <FaEdit />
        <span>Edit</span>
      </button>
    )}

    {canDelete && (
      <button
        className="delete-btn"
        onClick={() => deleteReport(item.id)}
        title="Delete"
      >
        <FaTrash />
      </button>
    )}

  </div>
</td>
                </tr>

              ))

            ) : (

              <tr>

                <td
                  colSpan="14"
                  className="no-records"
                >

                  No Checklist Reports Found

                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>
            {/* ================= PAGINATION ================= */}

      <div className="reports-footer">

        <div className="pagination-info">

          Showing

          <strong>
            {" "}
            {filteredReports.length === 0
              ? 0
              : indexOfFirst + 1}
          </strong>

          -

          <strong>
            {" "}
            {Math.min(
              indexOfLast,
              filteredReports.length
            )}
          </strong>

          of

          <strong>
            {" "}
            {filteredReports.length}
          </strong>

          records

        </div>

        <div className="pagination">

          <button
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((prev) => prev - 1)
            }
          >
            Previous
          </button>

          {Array.from(
            { length: totalPages },
            (_, index) => (

              <button
                key={index + 1}
                className={
                  currentPage === index + 1
                    ? "active-page"
                    : ""
                }
                onClick={() =>
                  setCurrentPage(index + 1)
                }
              >
                {index + 1}
              </button>

            )
          )}

          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => prev + 1)
            }
          >
            Next
          </button>

        </div>

      </div>

      {/* ================= VIEW MODAL ================= */}

      {showModal && selectedReport && (

        <div className="modal-overlay">

          <div className="report-modal">

            <div className="modal-header">

              <h3>

                Checklist Report Details

              </h3>

              <button
                className="close-btn"
                onClick={() =>
                  setShowModal(false)
                }
              >

                <FaTimes />

              </button>

            </div>

            <div className="modal-body">

              <div className="detail-grid">

                <div>

                  <strong>Checklist</strong>

                  <p>
                    {selectedReport.checklist_name}
                  </p>

                </div>

                <div>

                  <strong>Store</strong>

                  <p>
                    {selectedReport.store_name}
                  </p>

                </div>

                <div>

                  <strong>Employee</strong>

                  <p>
                    {selectedReport.employee_name}
                  </p>

                </div>

                <div>

                  <strong>Employee ID</strong>

                  <p>
                    {selectedReport.employee_id || "-"}
                  </p>

                </div>

                <div>

                  <strong>Status</strong>

                  <p>
                    {selectedReport.status}
                  </p>

                </div>

                <div>

                  <strong>Submission Date</strong>

                  <p>

                    {new Date(
                      selectedReport.submission_date
                    ).toLocaleString("en-GB")}

                  </p>

                </div>

              </div>

              <hr />

              <div className="question-section">

                <h4>

                  Question

                </h4>

                <p>

                  {selectedReport.question || "-"}

                </p>

                <h4>

                  Answer

                </h4>

                <p>

                  {selectedReport.answer || "-"}

                </p>

                <h4>

                  Comment

                </h4>

                <p>

                  {selectedReport.remarks || "-"}

                </p>

              </div>

              <div className="map-section">

                {selectedReport.latitude &&
                selectedReport.longitude ? (

                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="map-link"
                  >

                    <FaMapMarkerAlt />

                    Open Location in Google Maps

                  </a>

                ) : (

                  <p>

                    Location Not Available

                  </p>

                )}

              </div>

            </div>

          </div>

        </div>

      )}

      {showEditModal && (

<div className="modal-overlay">

    <div className="report-modal">

        <div className="modal-header">

            <h3>Edit Checklist Report</h3>

            <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
            >
                <FaTimes />
            </button>

        </div>

        <div className="modal-body">

            <div className="filter-item">

                <label>Status</label>

                <select
                    value={editingReport.status}
                    onChange={(e)=>
                        setEditingReport({
                            ...editingReport,
                            status:e.target.value
                        })
                    }
                >

                    <option value="Completed">
                        Completed
                    </option>

                    <option value="Pending">
                        Pending
                    </option>

                    <option value="Failed">
                        Failed
                    </option>

                </select>

            </div>

            <br/>

            <div className="filter-item">

                <label>Answer</label>

                <input
                    type="text"
                    value={editingReport.answer}
                    onChange={(e)=>
                        setEditingReport({
                            ...editingReport,
                            answer:e.target.value
                        })
                    }
                />

            </div>

            <br/>

            <div className="filter-item">

                <label>Remarks</label>

                <textarea
                    rows="5"
                    value={editingReport.remarks}
                    onChange={(e)=>
                        setEditingReport({
                            ...editingReport,
                            remarks:e.target.value
                        })
                    }
                />

            </div>

            <div className="modal-actions">

                <button
                    className="cancel-btn"
                    onClick={() => setShowEditModal(false)}
                >
                    Cancel
                </button>

              {canEdit && (

<button
className="upload-btn"
onClick={updateReport}
>

    Save Changes

</button>

)}
            </div>

        </div>

    </div>

</div>

)}
      {/* ================= IMPORT CSV MODAL ================= */}

{showImportModal && (

<div className="modal-overlay">

  <div className="report-modal import-modal">


    <div className="modal-header">

      <h3>
        Import Checklist Reports
      </h3>


      <button

        className="close-btn"

        onClick={() =>
          setShowImportModal(false)
        }

      >

        <FaTimes />

      </button>


    </div>



    <div className="modal-body">


      <p>
        Upload a CSV file to import checklist reports.
      </p>



      <input

        type="file"

        accept=".csv"

        onChange={(e)=>
          setImportFile(
            e.target.files[0]
          )
        }

      />



      {importFile && (

        <p>

          Selected File:
          <b>
            {importFile.name}
          </b>

        </p>

      )}



      <div className="modal-actions">


        <button

          className="cancel-btn"

          onClick={()=>{

            setShowImportModal(false);

            setImportFile(null);

          }}

        >

          Cancel

        </button>



       {canAdd && (

<button
  className="upload-btn"
  onClick={handleImportCSV}
  disabled={!importFile}
>

  Upload CSV

</button>

)}


      </div>



    </div>


  </div>


</div>

)}
      
       </div>
  );
}

export default ChecklistReports;
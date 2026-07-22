import { useEffect, useState } from "react";
import axios from "axios";

import {
  FaPlus,
  FaFileCsv,
  FaEdit,
  FaTrash,
  FaEye,
} from "react-icons/fa";

import "../styles/ActionPoints.css";
import CreatePointModal from "../components/CreatePointModal";

function ActionPoints() {
  const API = "http://localhost:5000";

  // ================= STATES =================

  const [actionPoints, setActionPoints] = useState([]);
  const [stores, setStores] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [checklists, setChecklists] = useState([]);

  // ================= PAGINATION =================

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // ================= FILTERS =================

  const [search, setSearch] = useState("");
  const [store, setStore] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [checklistType, setChecklistType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ================= MODALS =================

  const [showModal, setShowModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);

const [selectedAction, setSelectedAction] = useState(null);
const [actionTaken, setActionTaken] = useState("");

const [remarks, setRemarks] = useState("");

const [completionDate, setCompletionDate] = useState("");

  // ================= EDIT DATA =================

  const [editData, setEditData] = useState({
    id: "",
    question: "",
    answer: "",
    comment: "",
    department_name: "",
    sla: "",
  });

  // ================= FETCH ACTION POINTS =================

  const fetchActionPoints = async () => {
    try {
      const res = await axios.get(`${API}/api/action-points`, {
        params: {
          page,
          limit,
          search,
          store_id: store,
          department_id: department,
          status,
          checklist_type_id: checklistType,
          start_date: startDate,
          end_date: endDate,
        },
      });

      setActionPoints(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.log("Action Point Fetch Error:", error);
    }
  };

  // ================= FETCH FILTERS =================

  const fetchFilters = async () => {
    try {
      const [storeRes, deptRes, checklistRes] = await Promise.all([
        axios.get(`${API}/api/stores`),
        axios.get(`${API}/api/departments`),
        axios.get(`${API}/api/checklist-types`),
      ]);

      setStores(storeRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setChecklists(checklistRes.data.data || []);
    } catch (error) {
      console.log("Filter Fetch Error:", error);
    }
  };

  // ================= LOAD DATA =================

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchActionPoints();
  }, [
    page,
    search,
    store,
    department,
    status,
    checklistType,
    startDate,
    endDate,
  ]);
    // ================= UPDATE ACTION POINT =================

  const updateActionPoint = async () => {
    try {
      await axios.put(
        `${API}/api/action-points/${editData.id}`,
        {
          answer: editData.answer,
          remarks: editData.comment,
          status: "No Action Taken",
        }
      );

      alert("Action Point Updated Successfully");

      setShowEdit(false);

      fetchActionPoints();
    } catch (error) {
      console.log("Update Error:", error);

      alert("Unable to update action point.");
    }
  };

  // ================= DELETE ACTION POINT =================

  const deleteActionPoint = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Action Point?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API}/api/action-points/${id}`);

      alert("Deleted Successfully");

      fetchActionPoints();
    } catch (error) {
      console.log("Delete Error:", error);

      alert("Unable to delete Action Point");
    }
  };

  const handleOpen = (item) => {

    setSelectedAction(item);

    setShowOpenModal(true);

};

const saveActionPoint = async () => {

  try {

    await axios.put(

      `${API}/api/action-points/${selectedAction.id}/take-action`,

      {

        action_taken: actionTaken,

        remarks,

        completion_date: completionDate

      }

    );

    alert("Action saved successfully.");

    setShowOpenModal(false);

    fetchActionPoints();

  }

  catch (error) {

    console.log(error);

    alert("Unable to save action.");

  }

};

  // ================= EXPORT CSV =================

  const exportCSV = () => {
    window.open(
      `${API}/api/action-points/export`,
      "_blank"
    );
  };

  // ================= CLEAR FILTERS =================

  const clearFilters = () => {
    setSearch("");
    setStore("");
    setDepartment("");
    setStatus("");
    setChecklistType("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // ================= PAGINATION =================

  const totalPages = Math.ceil(total / limit);
return (
  <div className="action-page">

    {/* ================= HEADER ================= */}

    <div className="page-header">
      <h2>Action Points</h2>
    </div>

    {/* ================= FILTER SECTION ================= */}

    <div className="action-filter">

      {/* Store */}

      <select
        value={store}
        onChange={(e) => setStore(e.target.value)}
      >
        <option value="">All Stores / Locations</option>

        {stores.map((item) => (
          <option
            key={item.id}
            value={item.id}
          >
            {item.store_name}
          </option>
        ))}
      </select>

      {/* Department */}

      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      >
        <option value="">All Departments</option>

        {departments.map((item) => (
          <option
            key={item.id}
            value={item.id}
          >
            {item.department_name}
          </option>
        ))}
      </select>

      {/* Status */}

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All Status</option>
        <option value="Opened">Opened</option>
        <option value="In Progress">In Progress</option>
        <option value="Closed">Closed</option>
        <option value="No Action Taken">
          No Action Taken
        </option>
      </select>

      {/* Checklist */}

      <select
        value={checklistType}
        onChange={(e) => setChecklistType(e.target.value)}
      >
        <option value="">All Checklist Types</option>

        {checklists.map((item) => (
          <option
            key={item.id}
            value={item.id}
          >
            {item.checklist_name}
          </option>
        ))}
      </select>

      {/* Dates */}

      <input
        type="date"
        value={startDate}
        onChange={(e) =>
          setStartDate(e.target.value)
        }
      />

      <input
        type="date"
        value={endDate}
        onChange={(e) =>
          setEndDate(e.target.value)
        }
      />

      {/* Search */}

      <input
        className="search-box"
        type="text"
        placeholder="Search Action Points..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />

      {/* Buttons */}

      <div className="action-buttons">

        <button
          className="create-btn"
          onClick={() => setShowModal(true)}
        >
          <FaPlus />
          Add Action Point
        </button>

        <button
          className="export-btn"
          onClick={exportCSV}
        >
          <FaFileCsv />
          Export CSV
        </button>

        <button
          className="clear-btn"
          onClick={clearFilters}
        >
          Clear Filters
        </button>

      </div>

    </div>

    {/* ================= TABLE ================= */}

    <div className="action-table">

      <table>

        <thead>

          <tr>

            <th>Date</th>

            <th>Store</th>

            <th>City</th>

            <th>State</th>

            <th>Checklist</th>

            <th>Question</th>

            <th>Department</th>

            <th>Answer</th>

            <th>Comment</th>

            <th>Attachment</th>

            <th>Status</th>

            <th>SLA</th>

            <th>Next Action</th>

            <th>Remarks</th>

            <th>Actions</th>

            <th>History</th>

          </tr>

        </thead>

       <tbody>

{actionPoints.length === 0 ? (

<tr>
<td colSpan="16" className="no-data">
No Action Points Found
</td>
</tr>

) : (

actionPoints.map((item) => (

<tr key={item.id}>

<td>
{item.date
? new Date(item.date).toLocaleString()
: "-"}
</td>

<td>{item.store_name}</td>

<td>{item.city || "-"}</td>

<td>{item.state || "-"}</td>

<td>{item.checklist_name}</td>

<td>{item.question}</td>

<td>{item.department_name || "-"}</td>

<td>{item.answer || "-"}</td>

<td>{item.comment || "-"}</td>

<td>

{item.attachment ? (

<a
className="view-link"
href={`${API}/${item.attachment.replace(/\\/g,"/")}`}
target="_blank"
rel="noreferrer"
>

<FaEye />

<span>View</span>

</a>

) : (

"-"

)}

</td>
<td>

<div className="status-box">

{item.status}

</div>

</td>

<td className="sla">
    {item.sla_status || "-"}
</td>
<td>

{item.next_action ? (

<button

className="open-btn"

onClick={() => handleOpen(item)}

>

{item.next_action}

</button>

) : (

"-"

)}

</td>
<td>

{item.remarks || "-"}

</td>

<td className="action-buttons-cell">

  <button
    className="edit-btn"
    onClick={() => {

      setEditData({
        id: item.id,
        question: item.question,
        department_name: item.department_name,
        answer: item.answer || "",
        comment: item.comment || "",
        sla: item.sla || ""
      });

      setShowEdit(true);

    }}
  >
    Edit <FaEdit />
  </button>

  <button
    className="delete-btn"
    onClick={() => deleteActionPoint(item.id)}
  >
    <FaTrash />
  </button>

</td>
<td>

{item.history || "-"}

</td>

</tr>

))

)}

</tbody>

</table>

</div>

{/* ================= PAGINATION ================= */}

<div className="pagination">

<button

disabled={page===1}

onClick={()=>setPage(page-1)}

>

Previous

</button>

<span>

Page {page} of {totalPages || 1}

</span>

<button

disabled={page>=totalPages}

onClick={()=>setPage(page+1)}

>

Next

</button>

<span>

Total : {total}

</span>

</div>

{/* ================= CREATE MODAL ================= */}

<CreatePointModal

isOpen={showModal}

onClose={()=>setShowModal(false)}

onSuccess={fetchActionPoints}

/>


{/* ================= EDIT MODAL ================= */}

{
showEdit && (

<div className="modal-overlay">

<div className="modal-box">

<h3>Edit Action Point</h3>

<input
type="text"
value={editData.question}
readOnly
/>

<input
type="text"
value={editData.department_name}
readOnly
/>

<div className="sla-row">

<input
type="text"
value={editData.sla}
readOnly
/>

</div>

<input
type="text"
placeholder="Answer"
value={editData.answer}
onChange={(e)=>
setEditData({
...editData,
answer:e.target.value
})
}
/>

<textarea
rows="4"
placeholder="Remarks"
value={editData.comment}
onChange={(e)=>
setEditData({
...editData,
comment:e.target.value
})
}
/>

<div className="modal-actions">

<button
className="cancel-btn"
onClick={() => setShowEdit(false)}
>
Cancel
</button>

<button
className="submit-btn"
onClick={updateActionPoint}
>
Update
</button>

</div>

</div>

</div>

)

}
{
showOpenModal && (

<div className="modal-overlay">

<div className="modal-box">

<h3>Take Action</h3>

<label>Question</label>

<input
type="text"
value={selectedAction?.question || ""}
readOnly
/>

<label>Department</label>

<input
type="text"
value={selectedAction?.department_name || ""}
readOnly
/>

<label>Answer</label>

<input
type="text"
value={selectedAction?.answer || ""}
readOnly
/>

<label>Current Status</label>

<input
type="text"
value={selectedAction?.status || ""}
readOnly
/>

<label>Action Taken</label>

<textarea
rows="4"
placeholder="Example: Product shifted to front display."
value={actionTaken}
onChange={(e)=>setActionTaken(e.target.value)}
></textarea>

<label>Remarks</label>

<textarea
rows="4"
placeholder="Enter remarks..."
value={remarks}
onChange={(e)=>setRemarks(e.target.value)}
></textarea>

<label>Completion Date</label>

<input
type="date"
value={completionDate}
onChange={(e)=>setCompletionDate(e.target.value)}
/>

<div className="modal-actions">

<button
className="submit-btn"
onClick={saveActionPoint}
>
Save
</button>

<button
className="cancel-btn"
onClick={() => setShowOpenModal(false)}
>
Close
</button>

</div>

</div>

</div>

)
}
</div>

);

}

export default ActionPoints;
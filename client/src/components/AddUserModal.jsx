import React, { useState, useEffect } from "react";
import "../styles/AddUserModal.css";
import { LuShieldCheck } from "react-icons/lu";
import { HiUserGroup } from "react-icons/hi2";
import axios from "axios";

function AddUserModal({
    onClose,
    fetchUsers,
    editingUser,
}) {

  // =========================
  // Profile
  // =========================

  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contact, setContact] = useState("");

  // =========================
  // Reports To
  // =========================

 

// =========================
// Stores
// =========================

const stores = [
  "Balasore",
  "Bhubaneswar",
  "Cuttack",
  "Rourkela",
  "Berhampur",
  "Sambalpur",
  "Kolkata",
  "Hyderabad",
  "Bangalore",
  "Delhi",
  "Mumbai",
  "Chennai",
];
// =========================
// Module Access
// =========================

const modules = [
  "Dashboard",
  "Users",
  "Stores",
  "Departments",
  "Designations",
  "Action Points",
  "Tasks",
  "Inventory",
  "Reports",
  "Settings",
];

const permissionTypes = [
  "None",
  "View",
  "Add",
  "Edit",
  "Full",
];
const handleCreateUser = async () => {

  if (
    !fullName ||
    !employeeId ||
    !email ||
    !password
  ) {
    alert("Please fill all required fields.");
    return;
  }

  try {

    setLoading(true);

    const payload = {

      fullName,
      employeeId,
      email,
      password,
      contact,

      reportsTo: selectedReport,

      department_id: departmentId,
designation_id: designationId,

      stores: selectedStores,

      permissions: modulePermissions,

      active: isActive,

      administrator: isAdmin,

    };

  if (editingUser) {

    await axios.put(
        `http://localhost:5000/api/users/${editingUser.id}`,
        payload
    );

} else {

    await axios.post(
        "http://localhost:5000/api/users",
        payload
    );

}
    alert("User Created Successfully");

    fetchUsers();

    await loadReports();

    onClose();

  } catch (err) {

    console.error("Create User Error:", err);
    console.log(err.response);

    alert(
      err.response?.data?.message ||
      err.response?.data?.error ||
      "Unable to create user."
    );

} finally {

    setLoading(false);

  }

};

const [modulePermissions, setModulePermissions] =
useState(
  modules.reduce((acc, module) => {
    acc[module] = "View";
    return acc;
  }, {})
);
const handlePermissionChange = (
  module,
  permission
) => {

  setModulePermissions({
    ...modulePermissions,
    [module]: permission,
  });

};
const [storeSearch, setStoreSearch] = useState("");

const [selectedStores, setSelectedStores] = useState([]);
const toggleStore = (store) => {

  if (selectedStores.includes(store)) {

    setSelectedStores(
      selectedStores.filter(
        (item) => item !== store
      )
    );

  } else {

    setSelectedStores([
      ...selectedStores,
      store,
    ]);

  }

};

const toggleAllStores = () => {

  if (selectedStores.length === stores.length) {

    setSelectedStores([]);

  } else {

    setSelectedStores(stores);

  }

};
// =========================
// Departments & Designations
// =========================

const [departments, setDepartments] = useState([]);
const [designations, setDesignations] = useState([]);

const [departmentId, setDepartmentId] = useState("");
const [designationId, setDesignationId] = useState("");
const [reportsList, setReportsList] = useState([]);

const [reportSearch, setReportSearch] = useState("");
const [selectedReport, setSelectedReport] = useState(null);

const [showReportList, setShowReportList] =
  useState(false);
  // =========================
// Account Settings
// =========================

const [isActive, setIsActive] = useState(true);
const [isAdmin, setIsAdmin] = useState(false);
const [loading, setLoading] = useState(false);
useEffect(() => {

    if (!editingUser) return;

    setFullName(editingUser.name || "");
    setEmployeeId(editingUser.employee_id || "");
    setEmail(editingUser.email || "");
    setPassword("");

    setDepartmentId(editingUser.department_id || "");
setDesignationId(editingUser.designation_id || "");

    setSelectedReport(
        editingUser.reports_to
            ? {
                  name: editingUser.reports_to,
              }
            : null
    );

    setIsActive(
        editingUser.status === "Active"
    );

}, [editingUser]);
useEffect(() => {
  loadReports();
  fetchDepartments();
  fetchDesignations();
}, []);
const loadReports = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/reports");

    setReportsList(
      res.data.reports.map((manager) => ({
        id: manager.id,
        name: manager.manager_name,
        email: manager.department, // optional
      }))
    );
  } catch (err) {
    console.log(err);
  }
};
const fetchDepartments = async () => {
  try {
    const res = await axios.get(
      "http://localhost:5000/api/departments"
    );

    setDepartments(res.data.data);
  } catch (err) {
    console.log(err);
  }
};

const fetchDesignations = async () => {
  try {
    const res = await axios.get(
      "http://localhost:5000/api/designations"
    );

    console.log("Designations:", res.data.data);

    setDesignations(res.data.data);
  } catch (err) {
    console.log(err);
  }
};
useEffect(() => {

    if (!editingUser) return;

    setFullName(editingUser.name || "");
    setEmployeeId(editingUser.employee_id || "");
    setEmail(editingUser.email || "");
    setPassword("");

    setDepartmentId(editingUser.department_id || "");
    setDesignationId(editingUser.designation_id || "");

    setSelectedReport(
        editingUser.reports_to
            ? {
                  name: editingUser.reports_to,
              }
            : null
    );

    setIsActive(editingUser.status === "Active");
    setIsAdmin(editingUser.is_admin || false);

}, [editingUser]);
  return (

    <div className="modal-overlay">

      <div className="add-user-modal">

        {/* =========================
            Header
        ========================== */}

        <div className="modal-header">

          <div>

           <h2>
    {editingUser
        ? "Edit User"
        : "Add User"}
</h2>

           <p>
{editingUser
    ? "Update user details."
    : "Create the account and assign permissions."}
</p>

          </div>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ✕
          </button>

        </div>

        {/* =========================
            Body
        ========================== */}

        <div className="modal-body">

         {/* =========================
    Profile & Sign-in
========================= */}

<div className="profile-card">

  <div className="profile-header">

    <div className="profile-icon">
      <LuShieldCheck size={18} />
    </div>

    <div>

      <h3>Profile & sign-in</h3>

      <p>Create the user's login credentials</p>

    </div>

  </div>

  <div className="profile-divider"></div>

  <div className="form-grid">

    {/* Full Name */}

    <div className="form-group full-width">

      <label>
        Full Name <span>*</span>
      </label>

      <input
        type="text"
        value={fullName}
        onChange={(e)=>setFullName(e.target.value)}
        placeholder="e.g. Priya Sharma"
      />

    </div>

    {/* Employee ID */}

    <div className="form-group">

      <label>
        Employee ID <span>*</span>
      </label>

      <input
        type="text"
        value={employeeId}
        onChange={(e)=>setEmployeeId(e.target.value)}
        placeholder="e.g. EMP1023"
      />

    </div>

    {/* Email */}

    <div className="form-group">

      <label>
        Email <span>*</span>
      </label>

      <input
        type="email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        placeholder="name@company.com"
      />

    </div>

    {/* Password */}

    <div className="form-group full-width">

      <label>
        Password <span>*</span>
      </label>

      <input
        type="password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        placeholder="Minimum 6 characters"
      />

    </div>

    {/* Contact */}

    <div className="form-group full-width">

      <label>
        Contact
      </label>

      <input
        type="text"
        value={contact}
        onChange={(e)=>setContact(e.target.value)}
        placeholder="Phone or alternate contact"
      />

    </div>

  </div>

</div>

    {/* =====================================
      Reports To
===================================== */}

<div className="section">

  {/* Header */}

  <div className="section-header">

    <div className="section-icon">
      <HiUserGroup size={22} />
    </div>

    <div>
      <h3>Reports To</h3>

      <p className="section-subtitle">
        Choose one or more managers from the list.
      </p>
    </div>

  </div>

  <hr className="section-divider" />

  {/* Dropdown */}

  <div className="report-dropdown">

    <input
      type="text"
      className="report-search-input"
      placeholder="Select manager..."
      value={
        selectedReport
          ? selectedReport.name
          : reportSearch
      }
      onChange={(e) => {
        setReportSearch(e.target.value);
        setSelectedReport(null);
        setShowReportList(true);
      }}
      onFocus={() => setShowReportList(true)}
    />

    <span
      className="dropdown-icon"
      onClick={() =>
        setShowReportList(!showReportList)
      }
    >
      ▼
    </span>

    {showReportList && (

      <div className="report-list">

        {reportsList
          .filter((manager) =>
            (manager.name || "")
              .toLowerCase()
              .includes(reportSearch.toLowerCase())
          )
          .map((manager) => (

            <div
              key={manager.id}
              className="report-item"
              onClick={() => {
                setSelectedReport(manager);
                setReportSearch(manager.name);
                setShowReportList(false);
              }}
            >

              <div className="report-avatar">
                {(manager.name || "?").charAt(0).toUpperCase()}
              </div>

              <div className="report-details">

                <strong>{manager.name}</strong>

                <small>{manager.email}</small>

              </div>

            </div>

          ))}

        {reportsList.length === 0 && (
          <div className="report-item">
            No Users Found
          </div>
        )}

      </div>

    )}

  </div>

</div>
 {/* =========================
    Departments
========================= */}

<div className="section">

  <div className="section-header">
    <div className="section-icon">🏢</div>

    <div>
      <h3>Department</h3>
      <p className="section-subtitle">
        Select a department.
      </p>
    </div>
  </div>

  <hr className="section-divider" />

  <select
    className="form-select"
    value={departmentId}
    onChange={(e) => {
      setDepartmentId(e.target.value);
      setDesignationId("");
    }}
  >
    <option value="">Select Department</option>

    {departments.map((dept) => (
      <option key={dept.id} value={dept.id}>
        {dept.department_name}
      </option>
    ))}
  </select>

</div>
{/* =====================================
      Designations
===================================== */}

<div className="section">

  <div className="section-header">
    <div className="section-icon">💼</div>

    <div>
      <h3>Designation</h3>
      <p className="section-subtitle">
        Select a designation.
      </p>
    </div>
  </div>

  <hr className="section-divider" />

  {/* Debug */}
  {console.log("Department ID:", departmentId)}
  {console.log("All Designations:", designations)}

  <select
    className="form-select"
    value={designationId}
    onChange={(e) => setDesignationId(e.target.value)}
  >
    <option value="">Select Designation</option>

    {designations
      .filter(
        (des) =>
          String(des.department_id) === String(departmentId)
      )
      .map((des) => (
        <option key={des.id} value={des.id}>
          {des.designation_name}
        </option>
      ))}
  </select>

</div>
{/* =====================================
      Assigned Stores
===================================== */}

<div className="section">

  <div className="section-header">

    <div className="section-icon">
      🏬
    </div>

    <div>

      <h3>Assigned Stores</h3>

      <p className="section-subtitle">
        Assign one or more stores to this user.
      </p>

    </div>

  </div>

  <hr className="section-divider" />

  <div className="store-top">

    <input
      type="text"
      className="store-search"
      placeholder="Filter stores..."
      value={storeSearch}
      onChange={(e)=>
        setStoreSearch(e.target.value)
      }
    />

  </div>

  <label className="select-all">

    <input
      type="checkbox"
      checked={
        selectedStores.length === stores.length
      }
      onChange={toggleAllStores}
    />

    Select all visible

  </label>

  <div className="store-list">

    {stores
      .filter((store)=>
        store
          .toLowerCase()
          .includes(storeSearch.toLowerCase())
      )
      .map((store)=>(

        <label
          key={store}
          className="store-item"
        >

          <input
            type="checkbox"
            checked={selectedStores.includes(store)}
            onChange={() =>
              toggleStore(store)
            }
          />

          {store}

        </label>

      ))}

  </div>

</div>
{/* =====================================
      Module Access
===================================== */}

<div className="section">

  <div className="section-header">

    <div className="section-icon">
      🔐
    </div>

    <div>

      <h3>Module Access</h3>

      <p className="section-subtitle">
        Choose the permission level for every module.
      </p>

    </div>

  </div>

  <hr className="section-divider" />

  <div className="permission-table">

    <div className="permission-head">

      <div>Module</div>

      {permissionTypes.map((type)=>(

        <div key={type}>
          {type}
        </div>

      ))}

    </div>

    {modules.map((module)=>(

      <div
        key={module}
        className="permission-row"
      >

        <div className="module-name">
          {module}
        </div>

        {permissionTypes.map((type)=>(

          <div
            key={type}
            className="permission-cell"
          >

            <input
              type="radio"
              name={module}
              checked={
                modulePermissions[module]===type
              }
              onChange={()=>
                handlePermissionChange(
                  module,
                  type
                )
              }
            />

          </div>

        ))}

      </div>

    ))}

  </div>

</div>
{/* =====================================
      Account Settings
===================================== */}

<div className="section">

  <div className="section-header">

    <div className="section-icon">
      ⚙️
    </div>

    <div>

      <h3>Account Settings</h3>

      <p className="section-subtitle">
        Configure account status.
      </p>

    </div>

  </div>

  <hr className="section-divider" />

  <div className="setting-row">

    <label>

      <input
        type="checkbox"
        checked={isActive}
        onChange={() =>
          setIsActive(!isActive)
        }
      />

      Active Account

    </label>

  </div>

  <div className="setting-row">

    <label>

      <input
        type="checkbox"
        checked={isAdmin}
        onChange={() =>
          setIsAdmin(!isAdmin)
        }
      />

      Administrator

    </label>

  </div>

</div>
{/* =========================
    Footer
========================= */}



<div className="modal-footer">

  <button
    className="cancel-btn"
    onClick={onClose}
  >
    Cancel
  </button>

  <button
    className="create-btn"
    onClick={handleCreateUser}
    disabled={loading}
  >

    {loading
? editingUser
    ? "Updating..."
    : "Creating..."
: editingUser
    ? "Update User"
    : "Create User"}
  </button>

</div>
</div>

       

      </div>

    </div>

  );
}

export default AddUserModal;
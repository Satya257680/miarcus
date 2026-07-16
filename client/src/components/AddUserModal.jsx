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

 
const departments = [
  "Accounts",
  "ASM",
  "Buying",
  "City Manager",
  "Customer Support",
  "Design",
  "HR",
  "Inventory",
  "IT",
  "Marketing",
  "Operations",
  "Sales",
];
// =========================
// Designations
// =========================

const designations = [
  "Admin",
  "Area Sales Manager",
  "Assistant Manager",
  "Cashier",
  "City Manager",
  "Department Manager",
  "HR Executive",
  "Inventory Manager",
  "Marketing Executive",
  "Sales Executive",
  "Store Manager",
  "Visual Merchandiser",
];
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

      departments: selectedDepartments,

      designations: selectedDesignations,

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

    console.error(err);

    alert("Unable to create user.");

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
const toggleDesignation = (designation) => {

  if (selectedDesignations.includes(designation)) {

    setSelectedDesignations(
      selectedDesignations.filter(
        (item) => item !== designation
      )
    );

  } else {

    setSelectedDesignations([
      ...selectedDesignations,
      designation,
    ]);

  }

};

const toggleAllDesignations = () => {

  if (
    selectedDesignations.length ===
    designations.length
  ) {

    setSelectedDesignations([]);

  } else {

    setSelectedDesignations(designations);

  }

};
const [designationSearch, setDesignationSearch] = useState("");

const [selectedDesignations, setSelectedDesignations] = useState([]);
const toggleDepartment = (dept) => {
  if (selectedDepartments.includes(dept)) {
    setSelectedDepartments(
      selectedDepartments.filter((d) => d !== dept)
    );
  } else {
    setSelectedDepartments([
      ...selectedDepartments,
      dept,
    ]);
  }
};

const toggleAllDepartments = () => {
  if (selectedDepartments.length === departments.length) {
    setSelectedDepartments([]);
  } else {
    setSelectedDepartments(departments);
  }
};
const [departmentSearch, setDepartmentSearch] = useState("");
const [selectedDepartments, setSelectedDepartments] = useState([]);

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

    setSelectedDepartments(
        editingUser.department
            ? editingUser.department.split(", ")
            : []
    );

    setSelectedDesignations(
        editingUser.designation
            ? editingUser.designation.split(", ")
            : []
    );

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
}, []);

const loadReports = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/users");

    setReportsList(
      res.data.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }))
    );
  } catch (err) {
    console.log(err);
  }
};
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

    <div className="section-icon">
      🏢
    </div>

    <div>
      <h3>Assigned Departments</h3>
      <p className="section-subtitle">
        Assign one or more departments to this user.
      </p>
    </div>

  </div>

  <hr className="section-divider" />

  <div className="department-top">

    <input
      type="text"
      className="department-search"
      placeholder="Filter departments..."
      value={departmentSearch}
      onChange={(e) =>
        setDepartmentSearch(e.target.value)
      }
    />

  </div>

  <label className="select-all">

    <input
      type="checkbox"
      checked={
        selectedDepartments.length ===
        departments.length
      }
      onChange={toggleAllDepartments}
    />

    Select all visible

  </label>

  <div className="department-list">

    {departments
      .filter((dept) =>
        dept
          .toLowerCase()
          .includes(departmentSearch.toLowerCase())
      )
      .map((dept) => (

        <label
          key={dept}
          className="department-item"
        >

          <input
            type="checkbox"
            checked={selectedDepartments.includes(dept)}
            onChange={() =>
              toggleDepartment(dept)
            }
          />

          {dept}

        </label>

      ))}

  </div>

</div>
{/* =====================================
      Designations
===================================== */}

<div className="section">

  <div className="section-header">

    <div className="section-icon">
      💼
    </div>

    <div>

      <h3>Designations</h3>

      <p className="section-subtitle">
        Assign one or more designations.
      </p>

    </div>

  </div>

  <hr className="section-divider" />

  <div className="designation-top">

    <input
      type="text"
      className="designation-search"
      placeholder="Filter designations..."
      value={designationSearch}
      onChange={(e)=>
        setDesignationSearch(e.target.value)
      }
    />

  </div>

  <label className="select-all">

    <input
      type="checkbox"
      checked={
        selectedDesignations.length ===
        designations.length
      }
      onChange={toggleAllDesignations}
    />

    Select all visible

  </label>

  <div className="designation-list">

    {designations
      .filter((item)=>
        item
          .toLowerCase()
          .includes(designationSearch.toLowerCase())
      )
      .map((item)=>(

        <label
          key={item}
          className="designation-item"
        >

          <input
            type="checkbox"
            checked={selectedDesignations.includes(item)}
            onChange={()=>
              toggleDesignation(item)
            }
          />

          {item}

        </label>

      ))}

  </div>

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
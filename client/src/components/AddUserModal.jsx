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
  const [confirmEmail, setConfirmEmail] = useState("");
  const [contact, setContact] = useState("");

 

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

  // =========================
  // Create / Update User
  // =========================

  const handleCreateUser = async () => {

    if (!fullName || !employeeId || !email) {

      alert("Please fill all required fields.");

      return;

    }

    if (!editingUser) {

      if (!confirmEmail) {

        alert("Please confirm email.");

        return;

      }

      if (email.trim() !== confirmEmail.trim()) {

        alert("Email and Confirm Email do not match.");

        return;

      }

    }

    try {

      setLoading(true);

      const payload = {

        fullName,

        employeeId,

        email,

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

        alert("User Updated Successfully");

      } else {

        await axios.post(

          "http://localhost:5000/api/users",

          payload

        );

        alert("Invitation sent successfully.");

      }

      fetchUsers();

      await loadReports();

      onClose();

    } catch (err) {

      console.error(err);

      alert(

        err.response?.data?.message ||

        err.response?.data?.error ||

        "Unable to save user."

      );

    } finally {

      setLoading(false);

    }

  };
    // =========================
  // Module Permissions
  // =========================

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

  // =========================
// Stores
// =========================

const [stores, setStores] = useState([]);

const [storeSearch, setStoreSearch] = useState("");

const [selectedStores, setSelectedStores] = useState([]);

const filteredStores = stores.filter((store) =>
  store.store_name
    ?.toLowerCase()
    .includes(storeSearch.toLowerCase())
);

// Toggle One Store

const toggleStore = (storeId) => {

  if (selectedStores.includes(storeId)) {

    setSelectedStores(
      selectedStores.filter((id) => id !== storeId)
    );

  } else {

    setSelectedStores([
      ...selectedStores,
      storeId,
    ]);

  }

};

// Toggle All Stores

const toggleAllStores = () => {

  if (
    stores.length > 0 &&
    selectedStores.length === stores.length
  ) {

    setSelectedStores([]);

  } else {

    setSelectedStores(
      stores.map((store) => store.id)
    );

  }

};
  // =========================
  // Departments & Designations
  // =========================

  const [departments, setDepartments] =
    useState([]);

  const [designations, setDesignations] =
    useState([]);

  const [departmentId, setDepartmentId] =
    useState("");

  const [designationId, setDesignationId] =
    useState("");

  // =========================
  // Reports To
  // =========================

  const [reportsList, setReportsList] =
    useState([]);

  const [reportSearch, setReportSearch] =
    useState("");

  const [selectedReport, setSelectedReport] =
    useState(null);

  const [showReportList, setShowReportList] =
    useState(false);

  // =========================
  // Account Settings
  // =========================

  const [isActive, setIsActive] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // =========================
  // Initial Load
  // =========================

  useEffect(() => {

    loadReports();

    fetchDepartments();

    fetchDesignations();

    fetchStores();

}, []);

  // =========================
  // Edit Mode
  // =========================

 useEffect(() => {

  if (!editingUser) {

    setFullName("");

    setEmployeeId("");

    setEmail("");

    setConfirmEmail("");

    setContact("");

    setDepartmentId("");

    setDesignationId("");

    setSelectedReport(null);

    setSelectedStores([]);

    setIsActive(true);

    setIsAdmin(false);

    return;

  }

  setFullName(
    editingUser.name || ""
  );

  setEmployeeId(
    editingUser.employee_id || ""
  );

  setEmail(
    editingUser.email || ""
  );

  setConfirmEmail(
    editingUser.email || ""
  );

  setContact(
    editingUser.contact || ""
  );

  setDepartmentId(
    editingUser.department_id || ""
  );

  setDesignationId(
    editingUser.designation_id || ""
  );

  setSelectedReport(

    editingUser.reports_to
      ? {
          id: editingUser.reports_to_id,
          name: editingUser.reports_to,
        }
      : null

  );

  // Restore selected stores while editing
if (
  editingUser.stores &&
  Array.isArray(editingUser.stores)
) {

  setSelectedStores(editingUser.stores);

} else {

  setSelectedStores([]);

}

  setIsActive(
    editingUser.status === "Active"
  );

  setIsAdmin(
    editingUser.is_admin || false
  );

}, [editingUser]);
  // =========================
  // Load Reports
  // =========================

  const loadReports = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/api/reports"
      );

      setReportsList(

        res.data.reports.map(
          (manager) => ({

            id: manager.id,

            name: manager.manager_name,

            email: manager.department,

          })
        )

      );

    } catch (err) {

      console.log(err);

    }

  };

  // =========================
  // Departments
  // =========================

  const fetchDepartments = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/api/departments"
      );

      setDepartments(
        res.data.data
      );

    } catch (err) {

      console.log(err);

    }

  };

  // =========================
  // Designations
  // =========================

  const fetchDesignations = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/api/designations"
      );

      setDesignations(
        res.data.data
      );

    } catch (err) {

      console.log(err);

    }

  };
  // =========================
// Stores
// =========================

const fetchStores = async () => {

  try {

    const res = await axios.get(
      "http://localhost:5000/api/stores"
    );

    setStores(res.data.data);

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

                : "Create the account and send an activation invitation."}

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

      <h3>Profile & Sign-in</h3>

      <p>

        {editingUser

          ? "Update user information."

          : "An invitation email will be sent to activate this account."}

      </p>

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
        onChange={(e) =>
          setFullName(e.target.value)
        }
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
        onChange={(e) =>
          setEmployeeId(e.target.value)
        }
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
        onChange={(e) =>
          setEmail(e.target.value)
        }
        placeholder="name@company.com"
      />

    </div>

    {/* Confirm Email (Create Only) */}

    {!editingUser && (

      <div className="form-group full-width">

        <label>

          Confirm Email <span>*</span>

        </label>

        <input
          type="email"
          value={confirmEmail}
          onChange={(e) =>
            setConfirmEmail(e.target.value)
          }
          placeholder="Re-enter email address"
        />

      </div>

    )}

    {/* Contact */}

    <div className="form-group full-width">

      <label>

        Contact

      </label>

      <input
        type="text"
        value={contact}
        onChange={(e) =>
          setContact(e.target.value)
        }
        placeholder="Phone or alternate contact"
      />

    </div>

    {/* Invitation Information */}

    {!editingUser && (

      <div className="form-group full-width">

        <div
          style={{
            background: "#eef8ff",
            border: "1px solid #b8defa",
            borderRadius: "8px",
            padding: "14px",
            color: "#205081",
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >

          <strong>

            Invitation Workflow

          </strong>

          <br />

          After clicking
          <strong> Create &amp; Send Invitation</strong>,
          an activation email will be sent to the user.

          <br /><br />

          The user will create their own password
          using the secure activation link.

        </div>

      </div>

    )}

  </div>

</div>
{/* =====================================
      Reports To
===================================== */}

<div className="section">

  <div className="section-header">

    <div className="section-icon">
      <HiUserGroup size={22} />
    </div>

    <div>

      <h3>Reports To</h3>

      <p className="section-subtitle">
        Choose a reporting manager.
      </p>

    </div>

  </div>

  <hr className="section-divider" />

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
              .includes(
                reportSearch.toLowerCase()
              )
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

                {(manager.name || "?")
                  .charAt(0)
                  .toUpperCase()}

              </div>

              <div className="report-details">

                <strong>

                  {manager.name}

                </strong>

                <small>

                  {manager.email}

                </small>

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

{/* =====================================
      Department
===================================== */}

<div className="section">

  <div className="section-header">

    <div className="section-icon">
      🏢
    </div>

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

    <option value="">
      Select Department
    </option>

    {departments.map((dept) => (

      <option
        key={dept.id}
        value={dept.id}
      >

        {dept.department_name}

      </option>

    ))}

  </select>

</div>

{/* =====================================
      Designation
===================================== */}

<div className="section">

  <div className="section-header">

    <div className="section-icon">
      💼
    </div>

    <div>

      <h3>Designation</h3>

      <p className="section-subtitle">
        Select a designation.
      </p>

    </div>

  </div>

  <hr className="section-divider" />

  <select
    className="form-select"
    value={designationId}
    onChange={(e) =>
      setDesignationId(e.target.value)
    }
  >

    <option value="">
      Select Designation
    </option>

    {designations
      .filter(
        (designation) =>

          String(designation.department_id) ===
          String(departmentId)

      )
      .map((designation) => (

        <option
          key={designation.id}
          value={designation.id}
        >

          {designation.designation_name}

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
      onChange={(e) =>
        setStoreSearch(e.target.value)
      }
    />

  </div>

  <label className="select-all">

    <input
      type="checkbox"
      checked={
        stores.length > 0 &&
        selectedStores.length === stores.length
      }
      onChange={toggleAllStores}
    />

    Select All

  </label>

  <div className="store-list">

    {filteredStores.length > 0 ? (

      filteredStores.map((store) => (

        <label
          key={store.id}
          className="store-item"
        >

          <input
            type="checkbox"
            checked={selectedStores.includes(store.id)}
            onChange={() => toggleStore(store.id)}
          />

          {store.store_name}

        </label>

      ))

    ) : (

      <div className="store-empty">

        No Stores Found

      </div>

    )}

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

      {permissionTypes.map((type) => (

        <div key={type}>

          {type}

        </div>

      ))}

    </div>

    {modules.map((module) => (

      <div
        key={module}
        className="permission-row"
      >

        <div className="module-name">

          {module}

        </div>

        {permissionTypes.map((type) => (

          <div
            key={type}
            className="permission-cell"
          >

            <input
              type="radio"
              name={module}
              checked={
                modulePermissions[module] === type
              }
              onChange={() =>
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

    {loading ? (

      editingUser

        ? "Updating..."

        : "Sending Invitation..."

    ) : (

      editingUser

        ? "Update User"

        : "Create & Send Invitation"

    )}

  </button>

</div>

{/* =========================
      End Body
========================= */}

</div>

{/* =========================
      End Modal
========================= */}

</div>

</div>

);

}

export default AddUserModal;
        
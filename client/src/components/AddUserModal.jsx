import React, { useState, useEffect } from "react";
import "../styles/AddUserModal.css";
import {
  LuShieldCheck,
  LuUsers,
  LuBuilding2,
  LuBriefcaseBusiness,
  LuStore,
  LuLockKeyhole,
  LuSettings2,
  LuUserRoundCog,
  LuX,
  LuCheck,
  LuSearch,
  LuChevronDown,
  LuLoaderCircle,
} from "react-icons/lu";
import axios from "axios";

function AddUserModal({
  onClose,
  fetchUsers,
  editingUser,
}) {
  // =====================================================
  // PROFILE
  // =====================================================

  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const [callContact, setCallContact] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [confirmWhatsappContact, setConfirmWhatsappContact] =
    useState("");

  // =====================================================
  // MODULES
  // =====================================================

  const modules = [
    "Dashboard",
    "Action Points",
    "Checklist Reports",
    "Checklist Submit",
    "Checklist Types",
    "Questions",
    "Departments",
    "Designations",
    "Store Management",
    "Users",
    "Reports To",
    "NSO Rules",
    "Profile",
    "Settings",
  ];

  const permissionTypes = [
    "None",
    "View",
    "Add",
    "Edit",
    "Full",
  ];

  // =====================================================
  // MODULE PERMISSIONS
  // =====================================================

  const createDefaultPermissions = () =>
    modules.reduce((acc, module) => {
      acc[module] = "None";
      return acc;
    }, {});

  const [modulePermissions, setModulePermissions] = useState(
    createDefaultPermissions()
  );

  const handlePermissionChange = (
    module,
    permission
  ) => {
    setModulePermissions((prev) => ({
      ...prev,
      [module]: permission,
    }));
  };

  // =====================================================
  // STORES
  // =====================================================

  const [stores, setStores] = useState([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [selectedStores, setSelectedStores] = useState([]);

  const filteredStores = stores.filter((store) =>
    String(store.store_name || "")
      .toLowerCase()
      .includes(storeSearch.toLowerCase())
  );

  const toggleStore = (storeId) => {
    setSelectedStores((prev) => {
      if (prev.includes(storeId)) {
        return prev.filter((id) => id !== storeId);
      }

      return [...prev, storeId];
    });
  };

  const allStoresSelected =
    stores.length > 0 &&
    selectedStores.length === stores.length;

  const toggleAllStores = () => {
    if (allStoresSelected) {
      setSelectedStores([]);
    } else {
      setSelectedStores(
        stores.map((store) => store.id)
      );
    }
  };

  // =====================================================
  // DEPARTMENTS / DESIGNATIONS
  // =====================================================

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");

  // =====================================================
  // REPORTS TO
  // =====================================================

  const [reportsList, setReportsList] = useState([]);
  const [reportSearch, setReportSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportList, setShowReportList] =
    useState(false);

  // =====================================================
  // ACCOUNT
  // =====================================================

  const [isActive, setIsActive] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOAD INITIAL DATA
  // =====================================================

  useEffect(() => {
    loadReports();
    fetchDepartments();
    fetchDesignations();
    fetchStores();
  }, []);

  // =====================================================
  // RESET / EDIT MODE
  // =====================================================

  useEffect(() => {
    if (!editingUser) {
      setFullName("");
      setEmployeeId("");
      setEmail("");
      setConfirmEmail("");

      setCallContact("");
      setWhatsappContact("");
      setConfirmWhatsappContact("");

      setDepartmentId("");
      setDesignationId("");

      setSelectedReport(null);
      setReportSearch("");
      setShowReportList(false);

      setSelectedStores([]);
      setStoreSearch("");

      setModulePermissions(
        createDefaultPermissions()
      );

      setIsActive(true);
      setIsAdmin(false);

      return;
    }

    setFullName(editingUser.name || "");
    setEmployeeId(
      editingUser.employee_id || ""
    );

    setEmail(editingUser.email || "");
    setConfirmEmail(
      editingUser.email || ""
    );

    setCallContact(
      editingUser.call_contact || ""
    );

    setWhatsappContact(
      editingUser.whatsapp_contact || ""
    );

    setConfirmWhatsappContact(
      editingUser.whatsapp_contact || ""
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

    setReportSearch(
      editingUser.reports_to || ""
    );

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
      Boolean(editingUser.is_admin)
    );

    if (editingUser.permissions) {
      setModulePermissions(
        editingUser.permissions
      );
    } else {
      setModulePermissions(
        createDefaultPermissions()
      );
    }
  }, [editingUser]);

  // =====================================================
  // LOAD REPORTS
  // =====================================================

  const loadReports = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/reports"
      );

      setReportsList(
        (res.data?.reports || []).map(
          (manager) => ({
            id: manager.id,
            name: manager.manager_name,
            email: manager.department,
          })
        )
      );
    } catch (err) {
      console.error(
        "Failed to load reports:",
        err
      );
    }
  };

  // =====================================================
  // LOAD DEPARTMENTS
  // =====================================================

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/departments"
      );

      setDepartments(
        res.data?.data || []
      );
    } catch (err) {
      console.error(
        "Failed to load departments:",
        err
      );
    }
  };

  // =====================================================
  // LOAD DESIGNATIONS
  // =====================================================

  const fetchDesignations = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/designations"
      );

      setDesignations(
        res.data?.data || []
      );
    } catch (err) {
      console.error(
        "Failed to load designations:",
        err
      );
    }
  };

  // =====================================================
  // LOAD STORES
  // =====================================================

  const fetchStores = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/stores"
      );

      setStores(
        res.data?.data || []
      );
    } catch (err) {
      console.error(
        "Failed to load stores:",
        err
      );
    }
  };

  // =====================================================
  // CREATE / UPDATE USER
  // =====================================================

  const handleCreateUser = async () => {
    if (
      !fullName.trim() ||
      !employeeId.trim() ||
      !email.trim() ||
      !callContact.trim() ||
      !whatsappContact.trim()
    ) {
      alert(
        "Please fill all required fields."
      );
      return;
    }

    // -----------------------------------------------
    // CREATE ONLY VALIDATION
    // -----------------------------------------------

    if (!editingUser) {
      if (!confirmEmail.trim()) {
        alert("Please confirm email.");
        return;
      }

      if (
        email.trim() !==
        confirmEmail.trim()
      ) {
        alert(
          "Email and Confirm Email do not match."
        );
        return;
      }

      if (
        !confirmWhatsappContact.trim()
      ) {
        alert(
          "Please confirm WhatsApp contact."
        );
        return;
      }

      if (
        whatsappContact.trim() !==
        confirmWhatsappContact.trim()
      ) {
        alert(
          "WhatsApp contacts do not match."
        );
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        fullName,
        employeeId,
        email,
        callContact,
        whatsappContact,
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
          `https://miarcus-backend.onrender.com/api/users/${editingUser.id}`,
          payload
        );

        alert(
          "User Updated Successfully"
        );
      } else {
        await axios.post(
          "https://miarcus-backend.onrender.com/api/users",
          payload
        );

        alert(
          "Invitation sent successfully."
        );
      }

      fetchUsers();

      await loadReports();

      onClose();
    } catch (err) {
      console.error(
        "User save error:",
        err
      );

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to save user."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // REPORT SEARCH
  // =====================================================

  const filteredReports =
    reportsList.filter((manager) =>
      String(manager.name || "")
        .toLowerCase()
        .includes(
          reportSearch.toLowerCase()
        )
    );

  // =====================================================
  // ADMINISTRATOR
  // =====================================================

  const handleAdminChange = (checked) => {
    setIsAdmin(checked);

    if (checked) {
      setIsActive(true);

      const fullPermissions = {};

      modules.forEach((module) => {
        fullPermissions[module] = "Full";
      });

      setModulePermissions(
        fullPermissions
      );
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="user-modal-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className="user-modal"
        role="dialog"
        aria-modal="true"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="user-modal-header">
          <div className="user-modal-title-area">

            <div className="user-modal-main-icon">
              {editingUser ? (
                <LuUserRoundCog />
              ) : (
                <LuShieldCheck />
              )}
            </div>

            <div>
              <h2>
                {editingUser
                  ? "Edit User"
                  : "Add User"}
              </h2>

              <p>
                {editingUser
                  ? "Update user profile, access and account settings."
                  : "Create a user account and configure access permissions."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="user-modal-close"
            onClick={onClose}
            disabled={loading}
            title="Close"
          >
            <LuX />
          </button>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="user-modal-body">

          {/* =================================================
              PROFILE
          ================================================= */}

          <section className="user-section">

            <div className="user-section-header">
              <div className="user-section-icon">
                <LuShieldCheck />
              </div>

              <div>
                <h3>
                  Profile & Sign-in
                </h3>

                <p>
                  {editingUser
                    ? "Update the user's personal and contact information."
                    : "Enter the user's details. New users will receive an activation invitation."}
                </p>
              </div>
            </div>

            <div className="user-section-divider" />

            <div className="user-form-grid">

              {/* FULL NAME */}

              <div className="user-field user-field-full">
                <label>
                  Full Name
                  <span>*</span>
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Priya Sharma"
                  autoComplete="off"
                />
              </div>

              {/* EMPLOYEE ID */}

              <div className="user-field">
                <label>
                  Employee ID
                  <span>*</span>
                </label>

                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) =>
                    setEmployeeId(
                      e.target.value
                    )
                  }
                  placeholder="e.g. EMP1023"
                  autoComplete="off"
                />
              </div>

              {/* EMAIL */}

              <div className="user-field">
                <label>
                  Email
                  <span>*</span>
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="name@company.com"
                  autoComplete="off"
                />
              </div>

              {/* CONFIRM EMAIL */}

              {!editingUser && (
                <div className="user-field user-field-full">
                  <label>
                    Confirm Email
                    <span>*</span>
                  </label>

                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) =>
                      setConfirmEmail(
                        e.target.value
                      )
                    }
                    placeholder="Re-enter email address"
                    autoComplete="off"
                  />
                </div>
              )}

              {/* CALL CONTACT */}

              <div className="user-field">
                <label>
                  Call Contact
                  <span>*</span>
                </label>

                <input
                  type="text"
                  value={callContact}
                  onChange={(e) =>
                    setCallContact(
                      e.target.value
                    )
                  }
                  placeholder="Enter Call Contact"
                  maxLength={10}
                />
              </div>

              {/* WHATSAPP */}

              <div className="user-field">
                <label>
                  WhatsApp Contact
                  <span>*</span>
                </label>

                <input
                  type="text"
                  value={whatsappContact}
                  onChange={(e) =>
                    setWhatsappContact(
                      e.target.value
                    )
                  }
                  placeholder="Enter WhatsApp Contact"
                  maxLength={10}
                />
              </div>

              {/* CONFIRM WHATSAPP */}

              {!editingUser && (
                <div className="user-field user-field-full">
                  <label>
                    Confirm WhatsApp Contact
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={
                      confirmWhatsappContact
                    }
                    onChange={(e) =>
                      setConfirmWhatsappContact(
                        e.target.value
                      )
                    }
                    placeholder="Re-enter WhatsApp Contact"
                    maxLength={10}
                  />
                </div>
              )}

              {/* INVITATION */}

              {!editingUser && (
                <div className="user-info-banner">
                  <div className="user-info-banner-icon">
                    <LuShieldCheck />
                  </div>

                  <div>
                    <strong>
                      Invitation Workflow
                    </strong>

                    <p>
                      After clicking{" "}
                      <b>
                        Create & Send Invitation
                      </b>
                      , an activation email will
                      be sent to the user. The user
                      will create their own password
                      using the secure activation link.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* =================================================
              REPORTS TO
          ================================================= */}

          <section className="user-section">

            <div className="user-section-header">
              <div className="user-section-icon">
                <LuUsers />
              </div>

              <div>
                <h3>
                  Reports To
                </h3>

                <p>
                  Choose the reporting manager for this user.
                </p>
              </div>
            </div>

            <div className="user-section-divider" />

            <div className="report-selector">

              <div className="report-input-wrap">
                <LuSearch />

                <input
                  type="text"
                  placeholder="Search manager..."
                  value={
                    selectedReport
                      ? selectedReport.name
                      : reportSearch
                  }
                  onChange={(e) => {
                    setReportSearch(
                      e.target.value
                    );
                    setSelectedReport(null);
                    setShowReportList(true);
                  }}
                  onFocus={() =>
                    setShowReportList(true)
                  }
                />

                <button
                  type="button"
                  className="report-chevron"
                  onClick={() =>
                    setShowReportList(
                      !showReportList
                    )
                  }
                >
                  <LuChevronDown />
                </button>
              </div>

              {showReportList && (
                <div className="report-results">

                  {filteredReports.length > 0 ? (
                    filteredReports.map(
                      (manager) => (
                        <button
                          type="button"
                          key={manager.id}
                          className="report-result"
                          onClick={() => {
                            setSelectedReport(
                              manager
                            );

                            setReportSearch(
                              manager.name
                            );

                            setShowReportList(
                              false
                            );
                          }}
                        >
                          <span className="report-avatar">
                            {(
                              manager.name ||
                              "?"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span className="report-result-info">
                            <strong>
                              {manager.name}
                            </strong>

                            <small>
                              {manager.email}
                            </small>
                          </span>

                          {selectedReport?.id ===
                            manager.id && (
                            <LuCheck />
                          )}
                        </button>
                      )
                    )
                  ) : (
                    <div className="report-no-results">
                      No managers found
                    </div>
                  )}

                </div>
              )}

            </div>
          </section>

          {/* =================================================
              DEPARTMENT
          ================================================= */}

          <section className="user-section">

            <div className="user-section-header">
              <div className="user-section-icon">
                <LuBuilding2 />
              </div>

              <div>
                <h3>
                  Department
                </h3>

                <p>
                  Select the department assigned to this user.
                </p>
              </div>
            </div>

            <div className="user-section-divider" />

            <div className="user-select-wrap">
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(
                    e.target.value
                  );
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

              <LuChevronDown />
            </div>

          </section>

          {/* =================================================
              DESIGNATION
          ================================================= */}

          <section className="user-section">

            <div className="user-section-header">
              <div className="user-section-icon">
                <LuBriefcaseBusiness />
              </div>

              <div>
                <h3>
                  Designation
                </h3>

                <p>
                  Select a designation within the selected department.
                </p>
              </div>
            </div>

            <div className="user-section-divider" />

            <div className="user-select-wrap">
              <select
                value={designationId}
                onChange={(e) =>
                  setDesignationId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Designation
                </option>

                {designations
                  .filter(
                    (designation) =>
                      String(
                        designation.department_id
                      ) ===
                      String(departmentId)
                  )
                  .map((designation) => (
                    <option
                      key={designation.id}
                      value={designation.id}
                    >
                      {
                        designation.designation_name
                      }
                    </option>
                  ))}
              </select>

              <LuChevronDown />
            </div>

          </section>

          {/* =================================================
              STORES
          ================================================= */}

          <section className="user-section">

            <div className="user-section-header">
              <div className="user-section-icon">
                <LuStore />
              </div>

              <div>
                <h3>
                  Assigned Stores
                </h3>

                <p>
                  Assign one or more stores to this user.
                </p>
              </div>
            </div>

            <div className="user-section-divider" />

            <div className="store-toolbar">

              <div className="store-search-wrap">
                <LuSearch />

                <input
                  type="text"
                  placeholder="Filter stores..."
                  value={storeSearch}
                  onChange={(e) =>
                    setStoreSearch(
                      e.target.value
                    )
                  }
                />
              </div>

              <button
                type="button"
                className={`select-all-stores ${
                  allStoresSelected
                    ? "selected"
                    : ""
                }`}
                onClick={
                  toggleAllStores
                }
              >
                <span className="custom-check">
                  {allStoresSelected && (
                    <LuCheck />
                  )}
                </span>

                Select All
              </button>

            </div>

            <div className="store-selection-count">
              {selectedStores.length} of{" "}
              {stores.length} stores selected
            </div>

            <div className="store-list">

              {filteredStores.length > 0 ? (
                filteredStores.map(
                  (store) => {
                    const selected =
                      selectedStores.includes(
                        store.id
                      );

                    return (
                      <button
                        type="button"
                        key={store.id}
                        className={`store-card ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleStore(
                            store.id
                          )
                        }
                      >
                        <span
                          className={`store-checkbox ${
                            selected
                              ? "checked"
                              : ""
                          }`}
                        >
                          {selected && (
                            <LuCheck />
                          )}
                        </span>

                        <span className="store-card-name">
                          {store.store_name}
                        </span>
                      </button>
                    );
                  }
                )
              ) : (
                <div className="store-empty">
                  <LuStore />
                  <span>
                    No stores found
                  </span>
                </div>
              )}

            </div>
          </section>

          {/* =================================================
              MODULE ACCESS
          ================================================= */}

          <section className="user-section">

            <div className="user-section-header">
              <div className="user-section-icon">
                <LuLockKeyhole />
              </div>

              <div>
                <h3>
                  Module Access
                </h3>

                <p>
                  Choose the permission level for every module.
                </p>
              </div>
            </div>

            <div className="user-section-divider" />

            <div className="permission-note">
              <LuLockKeyhole />

              <span>
                Administrator accounts automatically receive
                Full access to every module.
              </span>
            </div>

            <div className="permission-table-wrap">

              <div className="permission-table">

                <div className="permission-head">

                  <div className="permission-module-title">
                    Module
                  </div>

                  {permissionTypes.map(
                    (type) => (
                      <div
                        key={type}
                        className={`permission-title permission-${type.toLowerCase()}`}
                      >
                        {type}
                      </div>
                    )
                  )}

                </div>

                {modules.map((module) => (
                  <div
                    key={module}
                    className="permission-row"
                  >

                    <div className="permission-module">
                      {module}
                    </div>

                    {permissionTypes.map(
                      (type) => {
                        const checked =
                          modulePermissions[
                            module
                          ] === type;

                        return (
                          <label
                            key={type}
                            className={`permission-option ${
                              checked
                                ? "active"
                                : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name={`permission-${module}`}
                              checked={checked}
                              disabled={isAdmin}
                              onChange={() =>
                                handlePermissionChange(
                                  module,
                                  type
                                )
                              }
                            />

                            <span className="permission-radio">
                              {checked && (
                                <span />
                              )}
                            </span>
                          </label>
                        );
                      }
                    )}

                  </div>
                ))}

              </div>
            </div>
          </section>

          {/* =================================================
              ACCOUNT SETTINGS
          ================================================= */}

          <section className="user-section">

            <div className="user-section-header">
              <div className="user-section-icon">
                <LuSettings2 />
              </div>

              <div>
                <h3>
                  Account Settings
                </h3>

                <p>
                  Configure account status and administrator access.
                </p>
              </div>
            </div>

            <div className="user-section-divider" />

            <div className="account-settings">

              {/* ACTIVE */}

              <div className="setting-card">

                <div className="setting-icon active-icon">
                  <LuCheck />
                </div>

                <div className="setting-content">
                  <strong>
                    Active Account
                  </strong>

                  <span>
                    Allow this user to access the system.
                  </span>
                </div>

                <button
                  type="button"
                  className={`switch ${
                    isActive
                      ? "on"
                      : ""
                  }`}
                  onClick={() =>
                    setIsActive(
                      !isActive
                    )
                  }
                  aria-label="Toggle active account"
                >
                  <span />
                </button>

              </div>

              {/* ADMIN */}

              <div className="setting-card">

                <div className="setting-icon admin-icon">
                  <LuShieldCheck />
                </div>

                <div className="setting-content">
                  <strong>
                    Administrator
                  </strong>

                  <span>
                    Give this user Full access to all modules.
                  </span>
                </div>

                <button
                  type="button"
                  className={`switch ${
                    isAdmin
                      ? "on"
                      : ""
                  }`}
                  onClick={() =>
                    handleAdminChange(
                      !isAdmin
                    )
                  }
                  aria-label="Toggle administrator"
                >
                  <span />
                </button>

              </div>

            </div>
          </section>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="user-modal-footer">

          <button
            type="button"
            className="user-cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="user-submit-btn"
            onClick={handleCreateUser}
            disabled={loading}
          >
            {loading ? (
              <>
                <LuLoaderCircle className="loading-icon" />

                <span>
                  {editingUser
                    ? "Updating User..."
                    : "Sending Invitation..."}
                </span>
              </>
            ) : (
              <>
                {editingUser ? (
                  <LuCheck />
                ) : (
                  <LuShieldCheck />
                )}

                <span>
                  {editingUser
                    ? "Update User"
                    : "Create & Send Invitation"}
                </span>
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}

export default AddUserModal;
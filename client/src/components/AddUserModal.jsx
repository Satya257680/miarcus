import React, { useEffect, useMemo, useState } from "react";
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
  LuArrowLeft,
  LuArrowRight,
  LuUserRound,
  LuCircleAlert,
  LuClipboardCheck,
  LuMapPin,
} from "react-icons/lu";

import axios from "axios";

function AddUserModal({
  onClose,
  fetchUsers,
  editingUser,
}) {
  // =====================================================
  // STEPS
  // =====================================================

  const steps = [
    {
      id: 1,
      title: "Profile",
      shortTitle: "Profile",
      description: "Basic user information",
      icon: LuUserRound,
    },
    {
      id: 2,
      title: "Organization",
      shortTitle: "Organization",
      description: "Department & reporting",
      icon: LuBuilding2,
    },
    {
      id: 3,
      title: "Stores",
      shortTitle: "Stores",
      description: "Assign store access",
      icon: LuStore,
    },
    {
      id: 4,
      title: "Module Access",
      shortTitle: "Access",
      description: "Configure permissions",
      icon: LuLockKeyhole,
    },
    {
      id: 5,
      title: "Review",
      shortTitle: "Review",
      description: "Review & create",
      icon: LuClipboardCheck,
    },
  ];

  const [currentStep, setCurrentStep] = useState(1);

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
    "New Store Opening",
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

  const createDefaultPermissions = () =>
    modules.reduce((acc, module) => {
      acc[module] = "None";
      return acc;
    }, {});

  const [modulePermissions, setModulePermissions] =
    useState(createDefaultPermissions());

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

  const filteredStores = useMemo(() => {
    return stores.filter((store) =>
      String(store.store_name || "")
        .toLowerCase()
        .includes(storeSearch.toLowerCase())
    );
  }, [stores, storeSearch]);

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

  const filteredReports = useMemo(() => {
    return reportsList.filter((manager) =>
      String(manager.name || "")
        .toLowerCase()
        .includes(reportSearch.toLowerCase())
    );
  }, [reportsList, reportSearch]);

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
    setCurrentStep(1);

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
      setModulePermissions({
        ...createDefaultPermissions(),
        ...editingUser.permissions,
      });
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
    } else {
      setModulePermissions(
        createDefaultPermissions()
      );
    }
  };

  // =====================================================
  // STEP VALIDATION
  // =====================================================

  const validateStep = (step) => {
    // ---------------------------------------------------
    // STEP 1 - PROFILE
    // ---------------------------------------------------

    if (step === 1) {
      if (!fullName.trim()) {
        alert("Please enter Full Name.");
        return false;
      }

      if (!employeeId.trim()) {
        alert("Please enter Employee ID.");
        return false;
      }

      if (!email.trim()) {
        alert("Please enter Email.");
        return false;
      }

      if (!editingUser) {
        if (!confirmEmail.trim()) {
          alert("Please confirm Email.");
          return false;
        }

        if (
          email.trim().toLowerCase() !==
          confirmEmail.trim().toLowerCase()
        ) {
          alert(
            "Email and Confirm Email do not match."
          );
          return false;
        }
      }

      if (!callContact.trim()) {
        alert("Please enter Call Contact.");
        return false;
      }

      if (
        callContact.trim().length < 10
      ) {
        alert(
          "Call Contact must contain at least 10 digits."
        );
        return false;
      }

      if (!whatsappContact.trim()) {
        alert(
          "Please enter WhatsApp Contact."
        );
        return false;
      }

      if (
        whatsappContact.trim().length < 10
      ) {
        alert(
          "WhatsApp Contact must contain at least 10 digits."
        );
        return false;
      }

      if (!editingUser) {
        if (!confirmWhatsappContact.trim()) {
          alert(
            "Please confirm WhatsApp Contact."
          );
          return false;
        }

        if (
          whatsappContact.trim() !==
          confirmWhatsappContact.trim()
        ) {
          alert(
            "WhatsApp contacts do not match."
          );
          return false;
        }
      }

      return true;
    }

    // ---------------------------------------------------
    // STEP 2 - ORGANIZATION
    // ---------------------------------------------------

    if (step === 2) {
      if (!departmentId) {
        alert("Please select a Department.");
        return false;
      }

      if (!designationId) {
        alert("Please select a Designation.");
        return false;
      }

      if (!selectedReport) {
        alert(
          "Please select a Reporting Manager."
        );
        return false;
      }

      return true;
    }

    // ---------------------------------------------------
    // STEP 3 - STORES
    // ---------------------------------------------------

    if (step === 3) {
      if (selectedStores.length === 0) {
        alert(
          "Please assign at least one store."
        );
        return false;
      }

      return true;
    }

    // ---------------------------------------------------
    // STEP 4 - MODULE ACCESS
    // ---------------------------------------------------

    if (step === 4) {
      if (isAdmin) {
        return true;
      }

      const hasPermission = Object.values(
        modulePermissions
      ).some(
        (permission) =>
          permission !== "None"
      );

      if (!hasPermission) {
        alert(
          "Please assign access to at least one module."
        );
        return false;
      }

      return true;
    }

    return true;
  };

  // =====================================================
  // NEXT
  // =====================================================

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(
        (prev) => prev + 1
      );

      setShowReportList(false);
    }
  };

  // =====================================================
  // BACK
  // =====================================================

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(
        (prev) => prev - 1
      );

      setShowReportList(false);
    }
  };

  // =====================================================
  // GO TO STEP
  // Only completed previous steps
  // =====================================================

  const handleStepClick = (stepNumber) => {
    if (stepNumber >= currentStep) {
      return;
    }

    setCurrentStep(stepNumber);
    setShowReportList(false);
  };

  // =====================================================
  // CREATE / UPDATE USER
  // =====================================================

  const handleCreateUser = async () => {
    // Validate all steps before final submission.
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        fullName: fullName.trim(),
        employeeId: employeeId.trim(),
        email: email.trim(),
        callContact: callContact.trim(),
        whatsappContact:
          whatsappContact.trim(),

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
  // SUMMARY
  // =====================================================

  const completionPercentage =
    Math.round(
      (currentStep / steps.length) * 100
    );

  const selectedPermissionCount =
    Object.values(modulePermissions).filter(
      (permission) =>
        permission !== "None"
    ).length;

  const selectedDepartment =
    departments.find(
      (dept) =>
        String(dept.id) ===
        String(departmentId)
    );

  const selectedDesignation =
    designations.find(
      (designation) =>
        String(designation.id) ===
        String(designationId)
    );

  // =====================================================
  // RENDER PROFILE
  // =====================================================

  const renderProfileStep = () => {
    return (
      <section className="user-step-card">
        <div className="user-step-card-header">
          <div className="user-step-card-icon">
            <LuShieldCheck />
          </div>

          <div>
            <h3>Profile & Sign-in</h3>

            <p>
              Enter the user's personal and
              contact information.
            </p>
          </div>
        </div>

        <div className="user-divider" />

        <div className="user-form-grid">
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

          <div className="user-field">
            <label>
              Call Contact
              <span>*</span>
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={callContact}
              onChange={(e) =>
                setCallContact(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              placeholder="Enter Call Contact"
              maxLength={10}
            />
          </div>

          <div className="user-field">
            <label>
              WhatsApp Contact
              <span>*</span>
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={whatsappContact}
              onChange={(e) =>
                setWhatsappContact(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              placeholder="Enter WhatsApp Contact"
              maxLength={10}
            />
          </div>

          {!editingUser && (
            <div className="user-field user-field-full">
              <label>
                Confirm WhatsApp Contact
                <span>*</span>
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={
                  confirmWhatsappContact
                }
                onChange={(e) =>
                  setConfirmWhatsappContact(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder="Re-enter WhatsApp Contact"
                maxLength={10}
              />
            </div>
          )}
        </div>

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
                After completing all steps and
                clicking{" "}
                <b>
                  Create & Send Invitation
                </b>
                , the user will receive an
                activation email.
              </p>
            </div>
          </div>
        )}
      </section>
    );
  };

  // =====================================================
  // RENDER ORGANIZATION
  // =====================================================

  const renderOrganizationStep = () => {
    return (
      <section className="user-step-card">
        <div className="user-step-card-header">
          <div className="user-step-card-icon">
            <LuBuilding2 />
          </div>

          <div>
            <h3>Organization</h3>

            <p>
              Assign the user's department,
              designation and reporting manager.
            </p>
          </div>
        </div>

        <div className="user-divider" />

        <div className="organization-layout">
          <div className="user-field">
            <label>
              Department
              <span>*</span>
            </label>

            <div className="select-control">
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

                {departments.map(
                  (dept) => (
                    <option
                      key={dept.id}
                      value={dept.id}
                    >
                      {dept.department_name}
                    </option>
                  )
                )}
              </select>

              <LuChevronDown />
            </div>
          </div>

          <div className="user-field">
            <label>
              Designation
              <span>*</span>
            </label>

            <div className="select-control">
              <select
                value={designationId}
                onChange={(e) =>
                  setDesignationId(
                    e.target.value
                  )
                }
                disabled={!departmentId}
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
                  .map(
                    (designation) => (
                      <option
                        key={
                          designation.id
                        }
                        value={
                          designation.id
                        }
                      >
                        {
                          designation.designation_name
                        }
                      </option>
                    )
                  )}
              </select>

              <LuChevronDown />
            </div>
          </div>

          <div className="user-field user-field-full">
            <label>
              Reports To
              <span>*</span>
            </label>

            <div className="report-selector">
              <div className="report-input-wrap">
                <LuSearch />

                <input
                  type="text"
                  placeholder="Search reporting manager..."
                  value={
                    selectedReport
                      ? selectedReport.name
                      : reportSearch
                  }
                  onChange={(e) => {
                    setReportSearch(
                      e.target.value
                    );
                    setSelectedReport(
                      null
                    );
                    setShowReportList(
                      true
                    );
                  }}
                  onFocus={() =>
                    setShowReportList(
                      true
                    )
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
                  {filteredReports.length >
                  0 ? (
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
                              {
                                manager.name
                              }
                            </strong>

                            <small>
                              {
                                manager.email
                              }
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
          </div>
        </div>

        <div className="organization-preview">
          <div>
            <span>Department</span>
            <strong>
              {selectedDepartment
                ?.department_name ||
                "Not selected"}
            </strong>
          </div>

          <div>
            <span>Designation</span>
            <strong>
              {selectedDesignation
                ?.designation_name ||
                "Not selected"}
            </strong>
          </div>

          <div>
            <span>Reports To</span>
            <strong>
              {selectedReport?.name ||
                "Not selected"}
            </strong>
          </div>
        </div>
      </section>
    );
  };

  // =====================================================
  // RENDER STORES
  // =====================================================

  const renderStoresStep = () => {
    return (
      <section className="user-step-card">
        <div className="user-step-card-header">
          <div className="user-step-card-icon">
            <LuStore />
          </div>

          <div>
            <h3>Assigned Stores</h3>

            <p>
              Select the stores this user is
              allowed to access.
            </p>
          </div>
        </div>

        <div className="user-divider" />

        <div className="store-toolbar">
          <div className="store-search-wrap">
            <LuSearch />

            <input
              type="text"
              placeholder="Search stores..."
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

        <div className="store-selection-header">
          <div>
            <strong>
              {selectedStores.length}
            </strong>{" "}
            of {stores.length} stores selected
          </div>

          <span>
            At least one store is required
          </span>
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

                    <span className="store-card-content">
                      <LuStore />

                      <span className="store-card-name">
                        {store.store_name}
                      </span>
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
    );
  };

  // =====================================================
  // RENDER MODULE ACCESS
  // =====================================================

  const renderAccessStep = () => {
    return (
      <section className="user-step-card">
        <div className="user-step-card-header">
          <div className="user-step-card-icon">
            <LuLockKeyhole />
          </div>

          <div>
            <h3>Module Access</h3>

            <p>
              Choose the permission level for
              every module.
            </p>
          </div>
        </div>

        <div className="user-divider" />

        <div className="permission-note">
          <LuLockKeyhole />

          <span>
            Administrator accounts automatically
            receive Full access to every module.
          </span>
        </div>

        {isAdmin && (
          <div className="admin-access-banner">
            <LuShieldCheck />

            <div>
              <strong>
                Administrator Access Enabled
              </strong>

              <span>
                All modules have automatically
                been assigned Full access.
              </span>
            </div>
          </div>
        )}

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
    );
  };

  // =====================================================
  // RENDER REVIEW
  // =====================================================

  const renderReviewStep = () => {
    return (
      <section className="review-layout">
        <div className="user-step-card">
          <div className="user-step-card-header">
            <div className="user-step-card-icon">
              <LuClipboardCheck />
            </div>

            <div>
              <h3>Review User</h3>

              <p>
                Verify all information before
                creating the user account.
              </p>
            </div>
          </div>

          <div className="user-divider" />

          <div className="review-section">
            <div className="review-section-title">
              <LuUserRound />
              <span>
                Profile Information
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(1)
                }
              >
                Edit
              </button>
            </div>

            <div className="review-grid">
              <div>
                <span>Full Name</span>
                <strong>
                  {fullName || "-"}
                </strong>
              </div>

              <div>
                <span>Employee ID</span>
                <strong>
                  {employeeId || "-"}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  {email || "-"}
                </strong>
              </div>

              <div>
                <span>Call Contact</span>
                <strong>
                  {callContact || "-"}
                </strong>
              </div>

              <div>
                <span>WhatsApp Contact</span>
                <strong>
                  {whatsappContact || "-"}
                </strong>
              </div>
            </div>
          </div>

          <div className="review-section">
            <div className="review-section-title">
              <LuBuilding2 />
              <span>
                Organization
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(2)
                }
              >
                Edit
              </button>
            </div>

            <div className="review-grid">
              <div>
                <span>Department</span>
                <strong>
                  {selectedDepartment
                    ?.department_name ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Designation</span>
                <strong>
                  {selectedDesignation
                    ?.designation_name ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Reports To</span>
                <strong>
                  {selectedReport?.name ||
                    "-"}
                </strong>
              </div>
            </div>
          </div>

          <div className="review-section">
            <div className="review-section-title">
              <LuStore />
              <span>
                Assigned Stores
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(3)
                }
              >
                Edit
              </button>
            </div>

            <div className="review-store-list">
              {selectedStores.map(
                (storeId) => {
                  const store =
                    stores.find(
                      (item) =>
                        String(
                          item.id
                        ) ===
                        String(storeId)
                    );

                  return (
                    <span
                      key={storeId}
                      className="review-store-chip"
                    >
                      <LuStore />
                      {store?.store_name ||
                        `Store #${storeId}`}
                    </span>
                  );
                }
              )}
            </div>
          </div>

          <div className="review-section">
            <div className="review-section-title">
              <LuLockKeyhole />
              <span>
                Module Access
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep(4)
                }
              >
                Edit
              </button>
            </div>

            <div className="review-access-summary">
              <div className="review-access-number">
                {isAdmin
                  ? modules.length
                  : selectedPermissionCount}
              </div>

              <div>
                <strong>
                  {isAdmin
                    ? "Full Administrator Access"
                    : "Modules with Access"}
                </strong>

                <span>
                  {isAdmin
                    ? "All modules have Full permission."
                    : `${selectedPermissionCount} module(s) have access configured.`}
                </span>
              </div>
            </div>
          </div>

          <div className="review-section">
            <div className="review-section-title">
              <LuSettings2 />
              <span>
                Account Settings
              </span>
            </div>

            <div className="review-settings">
              <span
                className={`review-status ${
                  isActive
                    ? "active"
                    : "inactive"
                }`}
              >
                {isActive
                  ? "Active Account"
                  : "Inactive Account"}
              </span>

              {isAdmin && (
                <span className="review-admin">
                  <LuShieldCheck />
                  Administrator
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="review-summary-card">
          <div className="review-summary-top">
            <div className="summary-icon">
              <LuClipboardCheck />
            </div>

            <div>
              <h3>
                Ready to Submit
              </h3>

              <p>
                Everything looks good.
              </p>
            </div>
          </div>

          <div className="summary-progress">
            <div className="summary-progress-label">
              <span>
                Form Completion
              </span>

              <strong>
                100%
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: "100%",
                }}
              />
            </div>
          </div>

          <div className="summary-item">
            <LuUserRound />

            <div>
              <span>User</span>
              <strong>
                {fullName || "-"}
              </strong>
            </div>
          </div>

          <div className="summary-item">
            <LuBuilding2 />

            <div>
              <span>Department</span>
              <strong>
                {selectedDepartment
                  ?.department_name ||
                  "-"}
              </strong>
            </div>
          </div>

          <div className="summary-item">
            <LuStore />

            <div>
              <span>Stores</span>
              <strong>
                {selectedStores.length}
              </strong>
            </div>
          </div>

          <div className="summary-item">
            <LuLockKeyhole />

            <div>
              <span>Access</span>
              <strong>
                {isAdmin
                  ? "Administrator"
                  : `${selectedPermissionCount} modules`}
              </strong>
            </div>
          </div>

          <div className="summary-ready">
            <LuCheck />

            <span>
              All required information completed
            </span>
          </div>
        </div>
      </section>
    );
  };

  // =====================================================
  // CURRENT STEP
  // =====================================================

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderProfileStep();

      case 2:
        return renderOrganizationStep();

      case 3:
        return renderStoresStep();

      case 4:
        return renderAccessStep();

      case 5:
        return renderReviewStep();

      default:
        return null;
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
            STEPPER
        ================================================= */}

        <div className="user-stepper">
          {steps.map((step, index) => {
            const StepIcon = step.icon;

            const active =
              currentStep === step.id;

            const completed =
              currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  className={`step-item ${
                    active
                      ? "active"
                      : ""
                  } ${
                    completed
                      ? "completed"
                      : ""
                  }`}
                  onClick={() =>
                    handleStepClick(
                      step.id
                    )
                  }
                  disabled={
                    step.id >= currentStep
                  }
                >
                  <span className="step-circle">
                    {completed ? (
                      <LuCheck />
                    ) : (
                      <StepIcon />
                    )}
                  </span>

                  <span className="step-text">
                    <small>
                      Step {step.id}
                    </small>

                    <strong>
                      {step.shortTitle}
                    </strong>
                  </span>
                </button>

                {index <
                  steps.length - 1 && (
                  <span
                    className={`step-line ${
                      currentStep >
                      step.id
                        ? "completed"
                        : ""
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* =================================================
            PROGRESS
        ================================================= */}

        <div className="user-progress-mobile">
          <div>
            <span>
              Step {currentStep} of{" "}
              {steps.length}
            </span>

            <strong>
              {completionPercentage}%
            </strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${completionPercentage}%`,
              }}
            />
          </div>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="user-modal-body">
          {renderCurrentStep()}
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
            <LuX />
            Cancel
          </button>

          <div className="footer-navigation">
            {currentStep > 1 && (
              <button
                type="button"
                className="user-back-btn"
                onClick={handleBack}
                disabled={loading}
              >
                <LuArrowLeft />
                Back
              </button>
            )}

            {currentStep < steps.length ? (
              <button
                type="button"
                className="user-next-btn"
                onClick={handleNext}
                disabled={loading}
              >
                Next
                <LuArrowRight />
              </button>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddUserModal;
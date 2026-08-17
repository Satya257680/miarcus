import React, { useEffect, useMemo, useState } from "react";
import "../styles/AddUserModal.css";

import {
  LuShieldCheck,
  LuBuilding2,
  LuStore,
  LuLockKeyhole,
  LuSettings2,
  LuX,
  LuCheck,
  LuSearch,
  LuChevronDown,
  LuLoaderCircle,
  LuArrowLeft,
  LuArrowRight,
  LuUserRound,
  LuClipboardCheck,
  LuUserRoundCog,
  LuCircleAlert,
  LuPower,
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
      description: "Personal & contact information",
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
      title: "Access & Settings",
      shortTitle: "Access",
      description: "Permissions & account",
      icon: LuLockKeyhole,
    },
    {
      id: 5,
      title: "Review",
      shortTitle: "Review",
      description: "Verify & submit",
      icon: LuClipboardCheck,
    },
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

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
  // ORGANIZATION
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
  const [showReportList, setShowReportList] = useState(false);

  // =====================================================
  // STORES
  // =====================================================

  const [stores, setStores] = useState([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [selectedStores, setSelectedStores] = useState([]);

  // =====================================================
  // MODULE ACCESS
  // =====================================================

  const modules = [
  "Dashboard",
  "Action Points",
  "Quiz",
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
  "New Store Openings",
  "Announcements",
  "Expenses",
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

  // =====================================================
  // ACCOUNT SETTINGS
  // =====================================================

  const [isActive, setIsActive] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // =====================================================
  // FILTERED STORES
  // =====================================================

  const filteredStores = useMemo(() => {
    return stores.filter((store) =>
      String(store.store_name || "")
        .toLowerCase()
        .includes(storeSearch.toLowerCase())
    );
  }, [stores, storeSearch]);

  // =====================================================
  // FILTERED REPORTS
  // =====================================================

  const filteredReports = useMemo(() => {
    return reportsList.filter((manager) =>
      String(manager.name || "")
        .toLowerCase()
        .includes(reportSearch.toLowerCase())
    );
  }, [reportsList, reportSearch]);

  // =====================================================
  // SELECTED DATA
  // =====================================================

  const selectedDepartment = departments.find(
    (dept) =>
      String(dept.id) === String(departmentId)
  );

  const selectedDesignation = designations.find(
    (designation) =>
      String(designation.id) === String(designationId)
  );

  const selectedPermissionCount = Object.values(
    modulePermissions
  ).filter((permission) => permission !== "None").length;

  const completionPercentage = Math.round(
    (currentStep / steps.length) * 100
  );

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
      resetForm();
      return;
    }

    setFullName(editingUser.name || "");

    setEmployeeId(
      editingUser.employee_id || ""
    );

    setEmail(editingUser.email || "");
    setConfirmEmail(editingUser.email || "");

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

    setSelectedStores(
      Array.isArray(editingUser.stores)
        ? editingUser.stores
        : []
    );

    setIsActive(
      editingUser.status === "Active"
    );

    setIsAdmin(
      Boolean(editingUser.is_admin)
    );

    // Keep the normal per-module permissions exactly as saved.
    // Do not make every module Full unless Administrator is enabled.
    // Also accept the backend's possible singular Expense key and
    // normalize it to the UI module name "Expenses".
    const savedPermissions = editingUser.permissions || {};
    const normalizedPermissions = {
      ...createDefaultPermissions(),
      ...savedPermissions,
    };

    if (
      normalizedPermissions.Expenses === "None" &&
      savedPermissions.Expense &&
      savedPermissions.Expense !== "None"
    ) {
      normalizedPermissions.Expenses = savedPermissions.Expense;
    }

    setModulePermissions(normalizedPermissions);
  }, [editingUser]);

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
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
  };

  // =====================================================
  // API - REPORTS
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
    } catch (error) {
      console.error(
        "Failed to load reports:",
        error
      );
    }
  };

  // =====================================================
  // API - DEPARTMENTS
  // =====================================================

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/departments"
      );

      setDepartments(
        res.data?.data || []
      );
    } catch (error) {
      console.error(
        "Failed to load departments:",
        error
      );
    }
  };

  // =====================================================
  // API - DESIGNATIONS
  // =====================================================

  const fetchDesignations = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/designations"
      );

      setDesignations(
        res.data?.data || []
      );
    } catch (error) {
      console.error(
        "Failed to load designations:",
        error
      );
    }
  };

  // =====================================================
  // API - STORES
  // =====================================================

  const fetchStores = async () => {
    try {
      const res = await axios.get(
        "https://miarcus-backend.onrender.com/api/stores"
      );

      setStores(
        res.data?.data || []
      );
    } catch (error) {
      console.error(
        "Failed to load stores:",
        error
      );
    }
  };

  // =====================================================
  // ADMINISTRATOR
  // =====================================================

  const handleAdminChange = (checked) => {
    // Administrator is an account-level flag. It must NOT lock or
    // overwrite the user's individual module selections.
    // This allows an administrator account to still have explicit
    // module permissions selected and, importantly, lets Expenses
    // be changed just like every other module.
    setIsAdmin(checked);

    if (checked) {
      setIsActive(true);
    }
  };

  // =====================================================
  // PERMISSION CHANGE
  // =====================================================

  const handlePermissionChange = (
    module,
    permission
  ) => {
    if (isAdmin) return;

    setModulePermissions((previous) => ({
      ...previous,
      [module]: permission,
    }));
  };

  // =====================================================
  // STORE SELECTION
  // =====================================================

  const toggleStore = (storeId) => {
    setSelectedStores((previous) => {
      if (previous.includes(storeId)) {
        return previous.filter(
          (id) => id !== storeId
        );
      }

      return [
        ...previous,
        storeId,
      ];
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
  // STEP VALIDATION
  // =====================================================

  const validateStep = (step) => {
    // ---------------------------------------------------
    // STEP 1
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
    // STEP 2
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
    // STEP 3
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
    // STEP 4
    // ---------------------------------------------------

    if (step === 4) {
      if (!isActive && isAdmin) {
        alert(
          "Administrator account must remain active."
        );
        return false;
      }

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

    if (
      currentStep < steps.length
    ) {
      setCurrentStep(
        (previous) =>
          previous + 1
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
        (previous) =>
          previous - 1
      );

      setShowReportList(false);
    }
  };

  // =====================================================
  // STEP NAVIGATION
  // =====================================================

  const handleStepClick = (
    stepNumber
  ) => {
    if (
      stepNumber >= currentStep
    ) {
      return;
    }

    setCurrentStep(stepNumber);
    setShowReportList(false);
  };

  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleCreateUser = async () => {
    for (
      let step = 1;
      step <= 4;
      step++
    ) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        fullName:
          fullName.trim(),

        employeeId:
          employeeId.trim(),

        email:
          email.trim(),

        callContact:
          callContact.trim(),

        whatsappContact:
          whatsappContact.trim(),

        reportsTo:
          selectedReport,

        department_id:
          departmentId,

        designation_id:
          designationId,

        stores:
          selectedStores,

        // Always send the exact UI module names, including
        // "Expenses". This prevents the Expenses permission from
        // being dropped because of an Expense/Expenses mismatch.
        permissions: modules.reduce((acc, module) => {
          acc[module] =
            modulePermissions[module] ||
            modulePermissions[module === "Expenses" ? "Expense" : module] ||
            "None";
          return acc;
        }, {}),

        active:
          isActive,

        administrator:
          isAdmin,
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
    } catch (error) {
      console.error(
        "User save error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to save user."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER PROFILE
  // =====================================================

  const renderProfileStep = () => (
    <section className="user-page-card">
      <div className="user-page-heading">
        <div className="user-page-heading-icon">
          <LuUserRound />
        </div>

        <div>
          <h3>Profile & Sign-in</h3>

          <p>
            Enter the user's personal and
            contact information.
          </p>
        </div>
      </div>

      <div className="user-page-divider" />

      <div className="user-form-grid">
        <div className="user-field full">
          <label>
            Full Name <span>*</span>
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
            Employee ID <span>*</span>
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
            Email <span>*</span>
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
          />
        </div>

        {!editingUser && (
          <div className="user-field full">
            <label>
              Confirm Email <span>*</span>
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
            />
          </div>
        )}

        <div className="user-field">
          <label>
            Call Contact <span>*</span>
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
            WhatsApp Contact <span>*</span>
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
          <div className="user-field full">
            <label>
              Confirm WhatsApp Contact{" "}
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
              creating the account, the user
              will receive an activation email.
            </p>
          </div>
        </div>
      )}
    </section>
  );

  // =====================================================
  // RENDER ORGANIZATION
  // =====================================================

  const renderOrganizationStep = () => (
    <section className="user-page-card">
      <div className="user-page-heading">
        <div className="user-page-heading-icon">
          <LuBuilding2 />
        </div>

        <div>
          <h3>Organization</h3>

          <p>
            Assign department, designation
            and reporting manager.
          </p>
        </div>
      </div>

      <div className="user-page-divider" />

      <div className="user-form-grid">
        <div className="user-field">
          <label>
            Department <span>*</span>
          </label>

          <div className="user-select">
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
                (department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {
                      department.department_name
                    }
                  </option>
                )
              )}
            </select>

            <LuChevronDown />
          </div>
        </div>

        <div className="user-field">
          <label>
            Designation <span>*</span>
          </label>

          <div className="user-select">
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
                      key={designation.id}
                      value={designation.id}
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

        <div className="user-field full">
          <label>
            Reports To <span>*</span>
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
                  setSelectedReport(null);
                  setShowReportList(true);
                }}
                onFocus={() =>
                  setShowReportList(true)
                }
              />

              <button
                type="button"
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

                        <span>
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
        </div>
      </div>

      <div className="organization-summary">
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

  // =====================================================
  // RENDER STORES
  // =====================================================

  const renderStoresStep = () => (
    <section className="user-page-card">
      <div className="user-page-heading">
        <div className="user-page-heading-icon">
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

      <div className="user-page-divider" />

      <div className="store-toolbar">
        <div className="store-search">
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
          className={
            allStoresSelected
              ? "selected"
              : ""
          }
          onClick={
            toggleAllStores
          }
        >
          <span className="store-check">
            {allStoresSelected && (
              <LuCheck />
            )}
          </span>

          Select All
        </button>
      </div>

      <div className="store-selection-summary">
        <div>
          <strong>
            {selectedStores.length}
          </strong>

          <span>
            {" "}
            of {stores.length} stores selected
          </span>
        </div>

        <small>
          At least one store is required
        </small>
      </div>

      <div className="store-grid">
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
                  className={`store-item ${
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
                    className={`store-item-check ${
                      selected
                        ? "checked"
                        : ""
                    }`}
                  >
                    {selected && (
                      <LuCheck />
                    )}
                  </span>

                  <LuStore />

                  <span>
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
  );

  // =====================================================
  // RENDER ACCESS + SETTINGS
  // =====================================================

  const renderAccessStep = () => (
    <section className="user-page-card">
      <div className="user-page-heading">
        <div className="user-page-heading-icon">
          <LuLockKeyhole />
        </div>

        <div>
          <h3>Access & Account Settings</h3>

          <p>
            Configure module permissions,
            account activation and administrator
            access.
          </p>
        </div>
      </div>

      <div className="user-page-divider" />

      {/* ACCOUNT SETTINGS */}

      <div className="settings-section">
        <div className="settings-section-title">
          <LuSettings2 />

          <div>
            <h4>Account Settings</h4>

            <p>
              Control the user's account status
              and administrative privileges.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <div
            className={`setting-card ${
              isActive
                ? "active"
                : ""
            }`}
          >
            <div className="setting-icon">
              <LuPower />
            </div>

            <div className="setting-content">
              <strong>
                Account Status
              </strong>

              <span>
                {isActive
                  ? "User account is active"
                  : "User account is inactive"}
              </span>
            </div>

            <button
              type="button"
              className={`toggle ${
                isActive
                  ? "on"
                  : ""
              }`}
              onClick={() =>
                setIsActive(
                  !isActive
                )
              }
              disabled={isAdmin}
              aria-label="Toggle account status"
            >
              <span />
            </button>
          </div>

          <div
            className={`setting-card ${
              isAdmin
                ? "admin"
                : ""
            }`}
          >
            <div className="setting-icon">
              <LuShieldCheck />
            </div>

            <div className="setting-content">
              <strong>
                Administrator
              </strong>

              <span>
                {isAdmin
                  ? "Full system access enabled"
                  : "Standard user account"}
              </span>
            </div>

            <button
              type="button"
              className={`toggle ${
                isAdmin
                  ? "on"
                  : ""
              }`}
              onClick={(e) =>
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
      </div>

      {/* ADMIN NOTICE */}

      {isAdmin && (
        <div className="admin-banner">
          <div className="admin-banner-icon">
            <LuShieldCheck />
          </div>

          <div>
            <strong>
              Administrator Access Enabled
            </strong>

            <p>
              Administrator status is enabled, but module permissions
              remain selectable individually. Choose None, View, Add,
              Edit or Full for each module as required.
            </p>
          </div>
        </div>
      )}

      {/* PERMISSIONS */}

      <div className="permission-section">
        <div className="permission-section-header">
          <div>
            <h4>Module Permissions</h4>

            <p>
              Select the access level for each
              module.
            </p>
          </div>

          <div className="permission-count">
            <strong>
              {selectedPermissionCount}
            </strong>

            <span>modules configured</span>
          </div>
        </div>

        <div className="permission-table-wrap">
          <div className="permission-table">
            <div className="permission-header-row">
              <div>
                Module
              </div>

              {permissionTypes.map(
                (type) => (
                  <div key={type}>
                    {type}
                  </div>
                )
              )}
            </div>

            {modules.map(
              (module) => (
                <div
                  className="permission-row"
                  key={module}
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
                          className={
                            checked
                              ? "permission-option checked"
                              : "permission-option"
                          }
                        >
                          <input
                            type="radio"
                            name={`permission-${module}`}
                            checked={
                              checked
                            }
                            disabled={false}
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
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );

  // =====================================================
  // RENDER REVIEW
  // =====================================================

  const renderReviewStep = () => (
    <section className="review-page">
      <div className="user-page-card">
        <div className="user-page-heading">
          <div className="user-page-heading-icon">
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

        <div className="user-page-divider" />

        {/* PROFILE */}

        <div className="review-block">
          <div className="review-block-title">
            <div>
              <LuUserRound />
              <span>
                Profile Information
              </span>
            </div>

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

        {/* ORGANIZATION */}

        <div className="review-block">
          <div className="review-block-title">
            <div>
              <LuBuilding2 />
              <span>
                Organization
              </span>
            </div>

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

        {/* STORES */}

        <div className="review-block">
          <div className="review-block-title">
            <div>
              <LuStore />
              <span>
                Assigned Stores
              </span>
            </div>

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

        {/* ACCESS */}

        <div className="review-block">
          <div className="review-block-title">
            <div>
              <LuLockKeyhole />
              <span>
                Access & Settings
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentStep(4)
              }
            >
              Edit
            </button>
          </div>

          <div className="review-access-grid">
            <div>
              <span>Account</span>

              <strong
                className={
                  isActive
                    ? "status-active"
                    : "status-inactive"
                }
              >
                {isActive
                  ? "Active"
                  : "Inactive"}
              </strong>
            </div>

            <div>
              <span>Role</span>

              <strong>
                {isAdmin
                  ? "Administrator"
                  : "Standard User"}
              </strong>
            </div>

            <div>
              <span>Module Access</span>

              <strong>
                {`${selectedPermissionCount} configured`}
              </strong>
            </div>
          </div>
        </div>

        <div className="review-ready-banner">
          <LuCheck />

          <div>
            <strong>
              Ready to Submit
            </strong>

            <span>
              All required information has been
              completed successfully.
            </span>
          </div>
        </div>
      </div>
    </section>
  );

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
  // RIGHT SIDE SUMMARY
  // =====================================================

  const renderSummary = () => (
    <aside className="user-summary-panel">
      <div className="summary-panel-top">
        <div className="summary-panel-icon">
          <LuClipboardCheck />
        </div>

        <div>
          <h3>
            User Summary
          </h3>

          <span>
            {currentStep === 5
              ? "Ready to submit"
              : "Configuration"}
          </span>
        </div>
      </div>

      <div className="summary-progress">
        <div className="summary-progress-label">
          <span>
            Form Completion
          </span>

          <strong>
            {completionPercentage}%
          </strong>
        </div>

        <div className="summary-progress-track">
          <div
            className="summary-progress-fill"
            style={{
              width: `${completionPercentage}%`,
            }}
          />
        </div>
      </div>

      <div className="summary-items">
        <div className="summary-item">
          <LuUserRound />

          <div>
            <span>User</span>

            <strong>
              {fullName || "Not entered"}
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
                "Not selected"}
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
                ? `Administrator · ${selectedPermissionCount} modules`
                : `${selectedPermissionCount} modules`}
            </strong>
          </div>
        </div>

        <div className="summary-item">
          <LuPower />

          <div>
            <span>Account</span>

            <strong
              className={
                isActive
                  ? "summary-active"
                  : "summary-inactive"
              }
            >
              {isActive
                ? "Active"
                : "Inactive"}
            </strong>
          </div>
        </div>
      </div>

      <div className="summary-step-status">
        <LuCheck />

        <span>
          Step {currentStep} of{" "}
          {steps.length}
        </span>
      </div>
    </aside>
  );

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
        className="user-modal user-modal-wide"
        role="dialog"
        aria-modal="true"
        style={{
          width: "min(1400px, 94vw)",
          maxWidth: "1400px",
          height: "min(900px, 92vh)",
          maxHeight: "92vh",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="user-modal-header">
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
        </header>

        {/* =================================================
            STEPPER
        ================================================= */}

        <div className="user-stepper">
          {steps.map(
            (step, index) => {
              const StepIcon =
                step.icon;

              const active =
                currentStep ===
                step.id;

              const completed =
                currentStep >
                step.id;

              return (
                <React.Fragment
                  key={step.id}
                >
                  <button
                    type="button"
                    className={`user-step ${
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
                      step.id >=
                      currentStep
                    }
                  >
                    <span className="user-step-circle">
                      {completed ? (
                        <LuCheck />
                      ) : (
                        <StepIcon />
                      )}
                    </span>

                    <span className="user-step-text">
                      <small>
                        Step {step.id}
                      </small>

                      <strong>
                        {
                          step.shortTitle
                        }
                      </strong>
                    </span>
                  </button>

                  {index <
                    steps.length -
                      1 && (
                    <span
                      className={`user-step-line ${
                        completed
                          ? "completed"
                          : ""
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            }
          )}
        </div>

        {/* =================================================
            MOBILE PROGRESS
        ================================================= */}

        <div className="user-mobile-progress">
          <div>
            <span>
              Step {currentStep} of{" "}
              {steps.length}
            </span>

            <strong>
              {completionPercentage}%
            </strong>
          </div>

          <div className="mobile-progress-track">
            <div
              style={{
                width: `${completionPercentage}%`,
              }}
            />
          </div>
        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <div className="user-modal-content">
          <main className="user-main-content">
            {renderCurrentStep()}
          </main>

          {renderSummary()}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="user-modal-footer">
          <button
            type="button"
            className="user-cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            <LuX />
            Cancel
          </button>

          <div className="user-footer-navigation">
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

            {currentStep <
            steps.length ? (
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
                onClick={
                  handleCreateUser
                }
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
        </footer>
      </div>
    </div>
  );
}

export default AddUserModal;
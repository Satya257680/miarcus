import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/AddUserModal.css";

import {
  LuShieldCheck,
  LuBuilding2,
  LuStore,
  LuLockKeyhole,
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
  LuEye,
  LuEyeOff,
  LuRefreshCw,
} from "react-icons/lu";

import axios, { API_BASE_URL } from "../axiosConfig.js";
import PermissionMatrix from "./rbac/PermissionMatrix";
import {
  ALWAYS_ON_MODULES,
  LEVEL_RANK,
  MODULE_ALIASES,
  MODULE_BY_NAME,
  MODULE_NAMES,
  PAGES,
  clampLevel,
} from "../config/rbacCatalog";

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
  // SIGN-IN PASSWORD (set by the person creating this
  // account — the new user never chooses their own
  // password; it is emailed to them directly)
  // =====================================================

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Matches the server-side rule in config/security.js:
  // 8-10 characters, at least one uppercase, one lowercase,
  // one number and one special character.
  const PASSWORD_RULE =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,10}$/;

  const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    const special = "!@#$%&*";

    const pick = (chars) =>
      chars[Math.floor(Math.random() * chars.length)];

    const required = [
      pick(upper),
      pick(lower),
      pick(digits),
      pick(special),
    ];

    const all = upper + lower + digits + special;

    while (required.length < 9) {
      required.push(pick(all));
    }

    for (let i = required.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [required[i], required[j]] = [required[j], required[i]];
    }

    const generated = required.join("");

    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  };

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

  // Every module that can be granted — defined once in
  // config/rbacCatalog.js (grouped, with pages / sub-modules).
  const modules = MODULE_NAMES;

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

  // Page (sub-module) access: { "quiz.setup": false, ... }
  // Missing key = page allowed.
  const [pageAccess, setPageAccess] = useState({});

  // Prevent the edit-user data loader from overwriting changes when the
  // parent re-renders and passes a new editingUser object with the same ID.
  const initializedUserRef = useRef(null);

  // Keep the user's normal permissions so they can be restored if
  // Administrator is switched back OFF.
  const permissionsBeforeAdminRef = useRef(null);

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

  const selectedPermissionCount = isAdmin
    ? modules.length
    : modules.filter(
        (module) =>
          (modulePermissions[module] || "None") !== "None"
      ).length;

  // Pages the user will actually be able to open.
  const enabledPageCount = isAdmin
    ? PAGES.length
    : PAGES.filter((page) => {
        const level = modulePermissions[page.module] || "None";
        const module = MODULE_BY_NAME[page.module];

        return (
          !module?.adminOnly &&
          LEVEL_RANK[level] >= LEVEL_RANK[page.min || "View"] &&
          pageAccess[page.key] !== false
        );
      }).length;

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
    const userKey = editingUser?.id
      ? `edit-${editingUser.id}`
      : "new";

    // IMPORTANT:
    // Do not reload/reset the modal merely because the parent component
    // re-rendered. This was causing the Access step to jump back to the
    // initial step and permissions such as Expenses = Full to be replaced.
    if (initializedUserRef.current === userKey) {
      return;
    }

    initializedUserRef.current = userKey;
    setCurrentStep(1);
    permissionsBeforeAdminRef.current = null;

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

    const normalizePermissions = (rawPermissions) => {
      const normalized = createDefaultPermissions();

      if (Array.isArray(rawPermissions)) {
        rawPermissions.forEach((item) => {
          const moduleName =
            item?.module_name ||
            item?.module ||
            item?.name;

          const permission =
            item?.permission || "None";

          if (moduleName) {
            const uiModule =
              MODULE_ALIASES[moduleName] || moduleName;

            if (modules.includes(uiModule)) {
              const normalizedPermission =
                String(permission).trim();

              normalized[uiModule] = clampLevel(
                uiModule,
                permissionTypes.includes(
                  normalizedPermission
                )
                  ? normalizedPermission
                  : "None"
              );
            }
          }
        });

        return normalized;
      }

      if (
        rawPermissions &&
        typeof rawPermissions === "object"
      ) {
        Object.entries(rawPermissions).forEach(
          ([moduleName, permission]) => {
            const uiModule =
              MODULE_ALIASES[moduleName] || moduleName;

            if (modules.includes(uiModule)) {
              const normalizedPermission =
                String(permission).trim();

              normalized[uiModule] = clampLevel(
                uiModule,
                permissionTypes.includes(
                  normalizedPermission
                )
                  ? normalizedPermission
                  : "None"
              );
            }
          }
        );
      }

      return normalized;
    };

    const normalizedPermissions =
      normalizePermissions(
        editingUser.permissions
      );

    const adminValue =
      editingUser.is_admin ??
      editingUser.administrator ??
      false;

    const administrator =
      adminValue === true ||
      adminValue === 1 ||
      adminValue === "1" ||
      String(adminValue).toLowerCase() === "true" ||
      String(adminValue).toLowerCase() === "yes";

    setIsAdmin(administrator);

    // Page-level access saved for this user (missing = allowed).
    setPageAccess(
      editingUser.page_access &&
        typeof editingUser.page_access === "object"
        ? { ...editingUser.page_access }
        : {}
    );

    // Administrator ALWAYS starts with Full access for EVERY module.
    // The backend intentionally normalizes administrator permissions to Full,
    // so those Full values must NOT be treated as normal editable permissions.
    // When an existing administrator is switched OFF, start from None so the
    // administrator can explicitly configure the account module-by-module.
    if (administrator) {
      permissionsBeforeAdminRef.current =
        createDefaultPermissions();

      setModulePermissions(
        modules.reduce((acc, module) => {
          acc[module] = "Full";
          return acc;
        }, {})
      );

      setIsActive(true);
    } else {
      setModulePermissions(
        normalizedPermissions
      );
    }
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
    setPageAccess({});

    setIsActive(true);
    setIsAdmin(false);
    permissionsBeforeAdminRef.current = null;
  };

  // =====================================================
  // API - REPORTS
  // =====================================================

  const loadReports = async () => {
    try {
      const res = await axios.get(
        API_BASE_URL + '/api/reports'
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
        API_BASE_URL + '/api/departments'
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
        API_BASE_URL + '/api/designations'
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
        API_BASE_URL + '/api/stores'
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
    if (checked) {
      // Save the current normal permissions before switching to Admin.
      // This lets us restore them if Admin is turned OFF again.
      permissionsBeforeAdminRef.current = {
        ...modulePermissions,
      };

      // ADMIN = FULL ACCESS TO EVERY MODULE.
      // This is deliberately done in one state update so every radio
      // immediately moves to Full, including Expenses.
      const fullPermissions =
        modules.reduce((acc, module) => {
          acc[module] = "Full";
          return acc;
        }, {});

      setModulePermissions(fullPermissions);
      setIsAdmin(true);
      setIsActive(true);
      return;
    }

    // Switching Admin OFF restores the permissions that existed before
    // Admin was enabled. If there were none, fall back to None.
    const restoredPermissions =
      permissionsBeforeAdminRef.current
        ? {
            ...createDefaultPermissions(),
            ...permissionsBeforeAdminRef.current,
          }
        : createDefaultPermissions();

    setModulePermissions(
      restoredPermissions
    );
    setIsAdmin(false);
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

      if (!editingUser) {
        if (!password) {
          alert(
            "Please set a sign-in password for this user."
          );
          return false;
        }

        if (!PASSWORD_RULE.test(password)) {
          alert(
            "Password must be 8-10 characters and include an uppercase letter, a lowercase letter, a number and a special character."
          );
          return false;
        }

        if (!confirmPassword) {
          alert(
            "Please confirm the password."
          );
          return false;
        }

        if (password !== confirmPassword) {
          alert(
            "Password and Confirm Password do not match."
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

      const hasPermission = modules.some(
        (module) =>
          (modulePermissions[module] || "None") !== "None"
      );

      if (!hasPermission) {
        alert(
          "Please assign access to at least one module."
        );
        return false;
      }

      if (enabledPageCount === 0) {
        alert(
          "Please enable at least one page for this user."
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

        // Always send every module explicitly.
        // Administrator is authoritative: every module is Full.
        permissions: [...modules, ...ALWAYS_ON_MODULES].reduce(
          (acc, module) => {
            if (isAdmin || ALWAYS_ON_MODULES.includes(module)) {
              acc[module] = "Full";
            } else {
              acc[module] = clampLevel(
                module,
                modulePermissions[module] || "None"
              );
            }
            return acc;
          },
          {}
        ),

        // Page (sub-module) access — explicit on/off for every page.
        // Administrators get everything, so nothing is stored.
        pageAccess: isAdmin
          ? {}
          : PAGES.reduce((acc, page) => {
              acc[page.key] = pageAccess[page.key] !== false;
              return acc;
            }, {}),

        active:
          isActive,

        administrator:
          isAdmin,
      };

      // Only send a password when creating a brand-new account.
      // Existing users' passwords are changed exclusively from
      // Settings → Password Management.
      if (!editingUser) {
        payload.password = password;
        payload.confirmPassword = confirmPassword;
      }

      if (editingUser) {
        await axios.put(
          `${API_BASE_URL}/api/users/${editingUser.id}`,
          payload
        );

        alert(
          "User Updated Successfully"
        );
      } else {
        await axios.post(
          API_BASE_URL + '/api/users',
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

        {!editingUser && (
          <div className="user-field">
            <label>
              Sign-in Password <span>*</span>
            </label>

            <div className="user-password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8-10 characters"
                autoComplete="new-password"
                maxLength={10}
              />

              <button
                type="button"
                className="user-password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                tabIndex={-1}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? <LuEyeOff /> : <LuEye />}
              </button>
            </div>
          </div>
        )}

        {!editingUser && (
          <div className="user-field">
            <label>
              Confirm Password <span>*</span>
            </label>

            <div className="user-password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Re-enter password"
                autoComplete="new-password"
                maxLength={10}
              />
            </div>
          </div>
        )}

        {!editingUser && (
          <div className="user-field full">
            <button
              type="button"
              className="user-generate-password-btn"
              onClick={generatePassword}
            >
              <LuRefreshCw />
              Generate Strong Password
            </button>

            <p className="user-password-hint">
              Must be 8-10 characters with at least one uppercase
              letter, one lowercase letter, one number and one
              special character.
            </p>
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
              Account Credentials
            </strong>

            <p>
              This user will not create their own password. Once
              the account is created, it is active immediately and
              the password you set above is emailed directly to
              them along with their login link.
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
    <section className="user-page-card access-card">
      <div className="user-page-heading">
        <div className="user-page-heading-icon">
          <LuLockKeyhole />
        </div>

        <div>
          <h3>Access & Account Settings</h3>

          <p>
            Choose what this user can see and do — per module and
            per page. Administrator unlocks everything instantly.
          </p>
        </div>
      </div>

      <div className="user-page-divider" />

      {/* ACCOUNT SETTINGS */}

      <div className="access-settings-grid">
        <div
          className={`access-setting is-status ${
            isActive ? "is-on" : ""
          }`}
        >
          <div className="access-setting-icon">
            <LuPower />
          </div>

          <div className="access-setting-text">
            <strong>Account Status</strong>
            <span>
              {isAdmin
                ? "Administrators always stay active"
                : isActive
                ? "Active — the user can sign in"
                : "Inactive — sign-in is blocked"}
            </span>
          </div>

          <button
            type="button"
            className={`toggle ${isActive ? "on" : ""}`}
            onClick={() => setIsActive(!isActive)}
            disabled={isAdmin}
            aria-label="Toggle account status"
          >
            <span />
          </button>
        </div>

        <div
          className={`access-setting is-admin ${
            isAdmin ? "is-on" : ""
          }`}
        >
          <div className="access-setting-icon">
            <LuShieldCheck />
          </div>

          <div className="access-setting-text">
            <strong>Administrator</strong>
            <span>
              {isAdmin
                ? "Full access to every module and page"
                : "Off — access is set module by module below"}
            </span>
          </div>

          <button
            type="button"
            className={`toggle ${isAdmin ? "on" : ""}`}
            onClick={() => handleAdminChange(!isAdmin)}
            aria-label="Toggle administrator"
          >
            <span />
          </button>
        </div>
      </div>

      {/* MODULE + PAGE PERMISSIONS */}

      <div className="access-section-title">
        <div>
          <h4>Module & Page Permissions</h4>
          <p>
            Pick a level for each module, then open it to tick the
            exact pages this user should see.
          </p>
        </div>
      </div>

      <PermissionMatrix
        permissions={modulePermissions}
        pageAccess={pageAccess}
        isAdmin={isAdmin}
        onPermissionsChange={setModulePermissions}
        onPageAccessChange={setPageAccess}
      />
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
                {`${selectedPermissionCount} modules · ${enabledPageCount} pages`}
              </strong>
            </div>
          </div>

          <div className="review-access-chips">
            {isAdmin ? (
              <span className="review-access-chip level-full">
                Administrator · Full access to everything
              </span>
            ) : (
              modules
                .filter(
                  (module) =>
                    (modulePermissions[module] || "None") !== "None"
                )
                .map((module) => {
                  const level = modulePermissions[module];
                  const pages = MODULE_BY_NAME[module]?.pages || [];
                  const onPages = pages.filter(
                    (page) =>
                      LEVEL_RANK[level] >= LEVEL_RANK[page.min || "View"] &&
                      pageAccess[page.key] !== false
                  ).length;

                  return (
                    <span
                      key={module}
                      className={`review-access-chip level-${level.toLowerCase()}`}
                    >
                      <strong>{module}</strong>
                      <em>{level}</em>
                      {pages.length > 1 && (
                        <small>
                          {onPages}/{pages.length} pages
                        </small>
                      )}
                    </span>
                  );
                })
            )}
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
                ? `Administrator · all ${selectedPermissionCount} modules`
                : `${selectedPermissionCount} modules · ${enabledPageCount} pages`}
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
      className="user-modal-overlay user-modal-overlay-full"
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
        className="user-modal user-modal-wide user-modal-fullscreen"
        role="dialog"
        aria-modal="true"
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

        <div
          className={`user-modal-content ${
            currentStep === 4 ? "is-access-step" : ""
          }`}
        >
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
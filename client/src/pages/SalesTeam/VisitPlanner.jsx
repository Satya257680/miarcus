import PremiumLoader from "../../components/premium/PremiumLoader";
import { activeFilters, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../../utils/deleteScope";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaDownload,
  FaPlus,
  FaSyncAlt,
  FaTrash,
  FaUpload,
  FaCheckCircle,
  FaClock,
  FaTimes,
} from "react-icons/fa";

import PageToolbar from "../../components/common/PageToolbar";
import FilterBar from "../../components/common/FilterBar";
import Card from "../../components/common/Card";
import DataTable from "../../components/common/DataTable";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import BulkUploadModal from "../../components/common/BulkUploadModal";

import {
  createVisitPlan,
  deleteAllVisitPlans,
  deleteVisitPlan,
  exportVisitPlans,
  getSalesEmployees,
  getSalesStores,
  getVisitPlans,
  importVisitPlans,
  updateVisitPlan,
} from "../../services/salesTeamService";

import {
  canAdd,
  canDelete,
  canEdit,
  canView,
  downloadBlob,
  formatDate,
  getStoredUser,
  isAdmin,
  toInputDate,
} from "./salesTeamUtils";

import "../../styles/pages/SalesTeam.css";
import "../../styles/premium/VisitPlannerWizard.css";
import "../../styles/premium/PagePremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import InsightStrip from "../../components/premium/InsightStrip";
import { FaMapMarkedAlt, FaHourglassHalf, FaUmbrellaBeach, FaEdit as FaEditIcon, FaListUl, FaExclamationCircle, FaUserTie, FaCalendarAlt, FaStore, FaRoute } from "react-icons/fa";
import { initials, avatarTone, formatCount } from "../../utils/premiumFormat";
import { exportFromCSV } from "../../utils/exportUtils.js";

/* =========================================================
   INITIAL FORM
========================================================= */

const pad2 = (n) => String(n).padStart(2, "0");

const ymd = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const todayYmd = () => ymd(new Date());

const addDays = (value, days) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return ymd(date);
};

const daysBetween = (from, to) => {
  if (!from || !to) return 0;
  const diff = Math.round(
    (new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000
  );
  return diff >= 0 ? diff + 1 : 0;
};

const dmy = (value) => {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
};

const makeInitialForm = () => ({
  employee_id: "",
  visit_date: todayYmd(),
  end_date: todayYmd(),
  week_off: false,
  city: "",
  reason_to_travel: "",
  planned_store_ids: [],
  store_dates: {},
});

/* =========================================================
   STORE HELPERS
========================================================= */

const getStoreName = (store) =>
  store?.store_name ||
  store?.name ||
  store?.storeName ||
  store?.outlet_name ||
  store?.outletName ||
  "";

const getStoreCode = (store) =>
  store?.store_code ||
  store?.code ||
  store?.storeCode ||
  store?.store_id ||
  "";

const getStoreCity = (store) =>
  store?.city ||
  store?.store_city ||
  store?.town ||
  "";

const getStoreState = (store) =>
  store?.state ||
  store?.state_name ||
  "";

const getStoreAddress = (store) =>
  store?.address ||
  store?.store_address ||
  "";

const getStoreStatus = (store) =>
  store?.status ||
  store?.store_status ||
  store?.active_status ||
  "";

const getStoreSearchText = (store) =>
  [
    getStoreName(store),
    getStoreCode(store),
    getStoreCity(store),
    getStoreState(store),
    getStoreAddress(store),
    getStoreStatus(store),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/* =========================================================
   COMPONENT
========================================================= */

function VisitPlanner() {
  const permission = "Visit Planner";

  const user = getStoredUser();
  const admin = isAdmin();

  /* =======================================================
     DATA
  ======================================================= */

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* =======================================================
     MODALS
  ======================================================= */

  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [editing, setEditing] = useState(null);

  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  /* =======================================================
     FORM
  ======================================================= */

  const [form, setForm] = useState(makeInitialForm());

  useEffect(() => {
    if (showModal) setModalError("");
  }, [showModal]);

  // Add / Edit wizard: "details" -> "dates" (store-wise dates) -> "review"
  const [step, setStep] = useState("details");
  // Inline validation message inside the wizard (instead of browser alerts)
  const [modalError, setModalError] = useState("");
  const [excludedStores, setExcludedStores] = useState([]);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  /* =======================================================
     TABLE FILTERS
  ======================================================= */

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");

  /* =======================================================
     PAGINATION
  ======================================================= */

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  /* =========================================================
     DEPARTMENTS
  ========================================================= */

  const departments = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map((row) => row.department)
            .filter(Boolean)
        ),
      ].sort(),
    [rows]
  );

  /* =========================================================
     LOAD VISIT PLANS
  ========================================================= */

  const load = useCallback(async () => {
    if (!canView(permission)) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await getVisitPlans({
        page,
        limit,
        search,
        from,
        to,
        name: nameFilter,
        department: departmentFilter,
        store: storeFilter,
      });

      setRows(response.data?.data || []);
      setTotal(Number(response.data?.total || 0));
    } catch (error) {
      console.error("Visit planner load failed", error);

      alert(
        error.response?.data?.message ||
          "Unable to load visit plans."
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    from,
    to,
    nameFilter,
    departmentFilter,
    storeFilter,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  /* =========================================================
     LOAD EMPLOYEES + STORES
     
     IMPORTANT:
     This function is deliberately reusable because the
     Store Management data must be refreshed whenever the
     Add/Edit modal is opened.
  ========================================================= */

  const loadLookups = useCallback(async () => {
    setLookupLoading(true);

    try {
      const [employeeResponse, storeResponse] =
        await Promise.all([
          getSalesEmployees(""),
          getSalesStores(""),
        ]);

      const employeeData =
        employeeResponse?.data?.data ||
        employeeResponse?.data?.employees ||
        [];

      const storeData =
        storeResponse?.data?.data ||
        storeResponse?.data?.stores ||
        [];

      setEmployees(
        Array.isArray(employeeData)
          ? employeeData
          : []
      );

      /*
       * Do NOT slice this list.
       *
       * The backend endpoint is expected to return the
       * complete current Store Management store list.
       */
      setStores(
        Array.isArray(storeData)
          ? storeData
          : []
      );
    } catch (error) {
      console.error(
        "Sales lookup load failed",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to load employees and stores."
      );
    } finally {
      setLookupLoading(false);
    }
  }, []);

  /* =========================================================
     INITIAL LOOKUP LOAD
  ========================================================= */

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  /* =========================================================
     EMPLOYEE OPTIONS
  ========================================================= */

  const employeeOptions = useMemo(() => {
    if (admin) {
      return employees;
    }

    const currentId = Number(user?.id);

    return employees.filter(
      (employee) =>
        Number(employee.id) === currentId
    );
  }, [
    admin,
    employees,
    user?.id,
  ]);

  const filteredEmployees = useMemo(() => {
    const term =
      employeeSearch.trim().toLowerCase();

    if (!term) {
      return employeeOptions;
    }

    return employeeOptions.filter(
      (employee) =>
        `${employee.name || ""} ${
          employee.employee_id || ""
        } ${employee.email || ""}`
          .toLowerCase()
          .includes(term)
    );
  }, [
    employeeOptions,
    employeeSearch,
  ]);

  /* =========================================================
     STORE OPTIONS
     
     Uses ALL stores returned by Store Management.
     No artificial 100-store limit.
  ========================================================= */

  const filteredStores = useMemo(() => {
    const term =
      storeSearch.trim().toLowerCase();

    if (!term) {
      return stores;
    }

    return stores.filter((store) =>
      getStoreSearchText(store).includes(term)
    );
  }, [
    stores,
    storeSearch,
  ]);

  /* =========================================================
     SELECTED STORE LOOKUP
     
     This allows an existing planned store to remain visible
     even if its current status/name changed in Store Management.
  ========================================================= */

  const selectedStores = useMemo(() => {
    const selectedIds = new Set(
      form.planned_store_ids.map((id) =>
        Number(id)
      )
    );

    return stores.filter((store) =>
      selectedIds.has(Number(store.id))
    );
  }, [
    stores,
    form.planned_store_ids,
  ]);

  /* =========================================================
     RESET FORM
  ========================================================= */

  const resetForm = useCallback(() => {
    const next = makeInitialForm();

    if (!admin && user?.id) {
      next.employee_id = Number(user.id);
    }

    setForm(next);
    setStep("details");
    setExcludedStores([]);
    setEmployeeSearch("");
    setStoreSearch("");
  }, [
    admin,
    user?.id,
  ]);

  /* =========================================================
     OPEN ADD
     
     Refresh Store Management data every time.
  ========================================================= */

  const openAdd = async () => {
    setEditing(null);
    resetForm();

    /*
     * Open immediately so the user gets feedback.
     */
    setShowModal(true);

    /*
     * Always refresh the current Store Management list.
     */
    await loadLookups();
  };

  /* =========================================================
     OPEN EDIT
     
     Refresh Store Management data before displaying the
     current store list.
  ========================================================= */

  const openEdit = async (row) => {
    setEditing(row);

    const plannedStores = Array.isArray(row.planned_stores)
      ? row.planned_stores
      : [];

    const existingStoreIds = plannedStores.length
      ? plannedStores.map((store) => Number(store.store_id))
      : Array.isArray(row.planned_store_ids)
        ? row.planned_store_ids.map(Number)
        : [];

    const storeDates = {};
    plannedStores.forEach((store) => {
      if (store.visit_date) {
        storeDates[Number(store.store_id)] = String(store.visit_date).slice(0, 10);
      }
    });

    setForm({
      employee_id: row.employee_id || "",
      visit_date: toInputDate(row.visit_date),
      end_date: toInputDate(row.end_date || row.visit_date),
      week_off: Boolean(row.week_off),
      city: row.city || "",
      reason_to_travel:
        row.reason_to_travel || "",
      planned_store_ids:
        existingStoreIds,
      store_dates: storeDates,
    });

    setStep("details");
    setExcludedStores([]);
    setEmployeeSearch(row.name || "");
    setStoreSearch("");

    setShowModal(true);

    /*
     * Refresh Store Management stores.
     */
    await loadLookups();
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditing(null);
    setStep("details");
    setEmployeeSearch("");
    setStoreSearch("");
  };

  /* =========================================================
     TOGGLE STORE
  ========================================================= */

  const toggleStore = (storeId) => {
    setForm((current) => {
      const exists =
        current.planned_store_ids.some(
          (id) =>
            Number(id) === Number(storeId)
        );

      return {
        ...current,

        planned_store_ids: exists
          ? current.planned_store_ids.filter(
              (id) =>
                Number(id) !== Number(storeId)
            )
          : [
              ...current.planned_store_ids,
              Number(storeId),
            ],
      };
    });
  };

  /* =========================================================
     SELECT ALL FILTERED STORES
  ========================================================= */

  const selectAllFilteredStores = () => {
    if (!filteredStores.length) {
      return;
    }

    const filteredIds =
      filteredStores.map((store) =>
        Number(store.id)
      );

    setForm((current) => {
      const existing = new Set(
        current.planned_store_ids.map((id) =>
          Number(id)
        )
      );

      filteredIds.forEach((id) => {
        existing.add(id);
      });

      return {
        ...current,
        planned_store_ids: [
          ...existing,
        ],
      };
    });
  };

  /* =========================================================
     CLEAR FILTERED STORES
  ========================================================= */

  const clearFilteredStores = () => {
    if (!filteredStores.length) {
      return;
    }

    const filteredIds = new Set(
      filteredStores.map((store) =>
        Number(store.id)
      )
    );

    setForm((current) => ({
      ...current,
      planned_store_ids:
        current.planned_store_ids.filter(
          (id) =>
            !filteredIds.has(Number(id))
        ),
    }));
  };

  /* =========================================================
     AUTO-FILL CITY
     
     If the user selects stores and city is empty, use the
     first selected Store Management city.
  ========================================================= */

  useEffect(() => {
    if (
      form.week_off ||
      form.city ||
      selectedStores.length === 0
    ) {
      return;
    }

    const firstCity =
      getStoreCity(selectedStores[0]);

    if (firstCity) {
      setForm((current) => ({
        ...current,
        city: firstCity,
      }));
    }
  }, [
    form.week_off,
    form.city,
    selectedStores,
  ]);

  /* =========================================================
     DATE RANGE + STORE-WISE DATES
  ========================================================= */

  const totalDays = daysBetween(form.visit_date, form.end_date);

  const setRange = (fromDate, toDate) => {
    setForm((current) => {
      const nextFrom = fromDate ?? current.visit_date;
      let nextTo = toDate ?? current.end_date;
      if (nextFrom && (!nextTo || nextTo < nextFrom)) nextTo = nextFrom;

      // Keep every store date inside the new range.
      const storeDates = { ...current.store_dates };
      Object.keys(storeDates).forEach((id) => {
        if (storeDates[id] < nextFrom || storeDates[id] > nextTo) {
          delete storeDates[id];
        }
      });

      return {
        ...current,
        visit_date: nextFrom,
        end_date: nextTo,
        store_dates: storeDates,
      };
    });
  };

  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === "today") {
      setRange(todayYmd(), todayYmd());
    } else if (preset === "week") {
      const day = (now.getDay() + 6) % 7; // Monday = 0
      const monday = new Date(now);
      monday.setDate(now.getDate() - day);
      setRange(ymd(monday), addDays(ymd(monday), 6));
    } else if (preset === "month") {
      setRange(
        ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
        ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      );
    } else {
      setRange(todayYmd(), todayYmd());
    }
  };

  const storeDateFor = (storeId) =>
    form.store_dates?.[Number(storeId)] || form.visit_date;

  const setStoreDate = (storeId, value) => {
    setForm((current) => ({
      ...current,
      store_dates: {
        ...current.store_dates,
        [Number(storeId)]: value,
      },
    }));
  };

  // Spreads the selected stores over the date range, in order:
  // store 1 -> From date, store 2 -> next day, ... (wraps around).
  const autoFillDates = () => {
    const days = Math.max(1, totalDays);
    setForm((current) => {
      const storeDates = { ...current.store_dates };
      current.planned_store_ids
        .filter((id) => !excludedStores.includes(Number(id)))
        .forEach((id, index) => {
          storeDates[Number(id)] = addDays(current.visit_date, index % days);
        });
      return { ...current, store_dates: storeDates };
    });
  };

  const includedStoreIds = form.planned_store_ids
    .map(Number)
    .filter((id) => !excludedStores.includes(id));

  const storeById = (storeId) =>
    stores.find((store) => Number(store.id) === Number(storeId)) ||
    (editing?.planned_stores || []).find(
      (store) => Number(store.store_id) === Number(storeId)
    ) ||
    null;

  const validateDetails = () => {
    if (!form.employee_id) return "Please select the employee.";
    if (!form.visit_date || !form.end_date) return "Please select the From and To dates.";
    if (form.end_date < form.visit_date) return "To date cannot be before the From date.";
    if (!form.week_off && !String(form.city || "").trim()) return "City is required.";
    if (!String(form.reason_to_travel || "").trim()) return "Reason to travel is required.";
    if (String(form.reason_to_travel || "").trim().length < 5) return "Please enter a proper reason to travel (at least 5 characters).";
    if (!form.week_off && !form.planned_store_ids.length) return "Please select at least one planned store.";
    return "";
  };

  const validateDates = () => {
    if (form.week_off) return "";
    if (!includedStoreIds.length) return "Please keep at least one store selected.";
    const outside = includedStoreIds.find((id) => {
      const date = storeDateFor(id);
      return !date || date < form.visit_date || date > form.end_date;
    });
    if (outside) {
      const store = storeById(outside);
      return `Visit date for ${getStoreName(store) || store?.store_name || "a store"} must be between ${dmy(form.visit_date)} and ${dmy(form.end_date)}.`;
    }
    return "";
  };

  const goToDates = () => {
    const problem = validateDetails();
    if (problem) {
      setModalError(problem);
      return;
    }
    setModalError("");
    setExcludedStores([]);
    setStep(form.week_off ? "review" : "dates");
  };

  const goToReview = () => {
    const problem = validateDates();
    if (problem) {
      setModalError(problem);
      return;
    }
    setModalError("");
    setStep("review");
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const save = async (event) => {
    event?.preventDefault?.();

    if (step !== "review") {
      if (step === "details") goToDates();
      else goToReview();
      return;
    }

    const problem = validateDetails() || validateDates();
    if (problem) {
      setModalError(problem);
      return;
    }

    setModalError("");
    setSaving(true);

    try {
      const plannedStores = form.week_off
        ? []
        : includedStoreIds.map((id) => ({
            store_id: id,
            visit_date: storeDateFor(id),
          }));

      const payload = {
        employee_id: Number(form.employee_id),
        visit_date: form.visit_date,
        end_date: form.end_date,
        week_off: form.week_off,
        city: form.city,
        reason_to_travel: form.reason_to_travel,
        planned_stores: plannedStores,
        planned_store_ids: plannedStores.map((store) => store.store_id),
      };

      if (editing) {
        await updateVisitPlan(
          editing.id,
          payload
        );
      } else {
        await createVisitPlan(payload);
      }

      /*
       * New plans are submitted to the approval
       * workflow. The backend must keep them Pending.
       */
      setShowModal(false);
      setEditing(null);
      setStep("details");

      await load();
    } catch (error) {
      console.error(
        "Save visit plan failed",
        error
      );

      setModalError(
        error.response?.data?.message ||
          "Unable to save planned visit."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const askDelete = (id) => {
    if (!canDelete(permission)) {
      return;
    }

    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) {
      return;
    }

    try {
      await deleteVisitPlan(
        deleteId
      );

      await load();
    } catch (error) {
      console.error(
        "Delete visit plan failed",
        error
      );

      alert(
        error.response?.data?.message ||
          "Delete failed."
      );
    } finally {
      setDeleteId(null);
      setShowDeleteDialog(false);
    }
  };

  /* =========================================================
     DELETE ALL
  ========================================================= */

  // Filters applied on the list. With any set, Delete All removes only
  // the matching visit plans.
  const visitDeleteFilters = activeFilters({
    search,
    from,
    to,
    name: nameFilter,
    department: departmentFilter,
    store: storeFilter,
  });
  const isFilteredDelete = hasActiveFilters(visitDeleteFilters);

  const confirmDeleteAll = async () => {
    try {
      const response = await deleteAllVisitPlans(
        isFilteredDelete ? visitDeleteFilters : null
      );

      if (response?.data?.message) alert(response.data.message);

      setPage(1);

      await load();
    } catch (error) {
      console.error(
        "Delete all visit plans failed",
        error
      );

      alert(
        error.response?.data?.message ||
          "Delete all failed."
      );
    } finally {
      setShowDeleteAllDialog(false);
    }
  };

  /* =========================================================
     EXPORT
  ========================================================= */

  const exportCsv = async (format = "csv") => {
    try {
      const response =
        await exportVisitPlans({
          search,
          from,
          to,
          name: nameFilter,
          department:
            departmentFilter,
          store: storeFilter,
        });

      const csvText = await response.data.text();

      await exportFromCSV({
        csvText,
        filename: "visit-planner",
        format,
        title: "Visit Planner",
      });
    } catch (error) {
      console.error(
        "Visit planner export failed",
        error
      );

      alert(
        error.response?.data?.message ||
          "Export failed."
      );
    }
  };

  /* =========================================================
     BULK IMPORT
  ========================================================= */

  const importFile = async (file) => {
    const result =
      await importVisitPlans(file);

    setPage(1);

    await load();

    return result.data || result;
  };

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setNameFilter("");
    setDepartmentFilter("");
    setStoreFilter("");
    setPage(1);
  };

  /* =========================================================
     PAGE COUNT
  ========================================================= */

  const pageCount = Math.max(
    1,
    Math.ceil(total / limit)
  );

  /* =========================================================
     TABLE COLUMNS
  ========================================================= */

  const visitSummary = rows.reduce(
    (acc, row) => {
      const status = String(row.approval_status || "Pending");
      if (acc[status] !== undefined) acc[status] += 1;
      if (row.week_off) acc.weekOff += 1;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0, weekOff: 0 }
  );

  const columns = [
    {
      key: "visit_date",
      title: "Date / Period",
      render: (row) => {
        const start = formatDate(row.visit_date);
        const endValue = row.end_date || row.visit_date;
        const end =
          String(endValue).slice(0, 10) !== String(row.visit_date).slice(0, 10)
            ? formatDate(endValue)
            : null;
        const days = Number(row.total_days || 1);

        return end ? (
          <span className="sales-date-range-cell">
            <strong>{start}</strong>
            <span>to</span>
            <strong>{end}</strong>
            <small className="vp-days-pill">{days} day{days === 1 ? "" : "s"}</small>
          </span>
        ) : (
          start
        );
      },
      minWidth: "140px",
    },

    {
      key: "day_name",
      title: "Day",
      minWidth: "80px",
    },

    {
      key: "name",
      title: "Name",
      minWidth: "175px",
      render: (row) => (
        <div className="pp-cell-main">
          <span className={`pp-avatar pp-avatar--round ${avatarTone(row.name)}`}>
            {initials(row.name)}
          </span>
          <span className="pp-cell-text">
            <span className="pp-cell-title">{row.name || "—"}</span>
            <span className="pp-cell-sub">{row.designation || "—"}</span>
          </span>
        </div>
      ),
    },

    {
      key: "department",
      title: "Department",
      minWidth: "125px",
      render: (row) =>
        row.department || "—",
    },

    {
      key: "city",
      title: "City",
      minWidth: "105px",
      render: (row) =>
        row.city
          ? <span className="pp-pill pp-pill--teal"><FaMapMarkedAlt />{row.city}</span>
          : <span className="pp-dash">—</span>,
    },

    {
      key: "reason_to_travel",
      title: "Reason to travel",
      minWidth: "175px",
      render: (row) => (
        <span className="sales-wrap-cell sales-wrap-cell--compact">
          {row.reason_to_travel || "—"}
        </span>
      ),
    },

    {
      key: "planned_store_names",
      title: "Planned Stores & Dates",
      minWidth: "260px",
      render: (row) => {
        if (row.week_off) {
          return (
            <span className="pp-pill pp-pill--amber">
              <FaUmbrellaBeach />
              Week off
              {row.leave_days > 1
                ? ` · ${row.leave_days} days`
                : ""}
            </span>
          );
        }

        const list = Array.isArray(row.planned_stores) ? row.planned_stores : [];

        if (!list.length) {
          return (
            <span className="sales-wrap-cell sales-wrap-cell--planned" title={row.planned_store_names || "—"}>
              {row.planned_store_names || "—"}
            </span>
          );
        }

        return (
          <div className="vp-schedule-cell" title={row.planned_store_schedule || ""}>
            {list.slice(0, 4).map((store) => (
              <span key={store.store_id} className="vp-schedule-chip">
                <strong>{store.store_name}</strong>
                {store.visit_date ? <em>{dmy(store.visit_date)}</em> : null}
              </span>
            ))}
            {list.length > 4 && (
              <span className="vp-schedule-more">+{list.length - 4} more</span>
            )}
          </div>
        );
      },
    },

    {
      key: "remarks",
      title: "Remarks",
      minWidth: "135px",
      render: (row) => (
        <span className="sales-wrap-cell sales-wrap-cell--compact">
          {row.remarks || "—"}
        </span>
      ),
    },

    {
      key: "approval_status",
      title: "Approval",
      minWidth: "130px",
      align: "center",

      render: (row) => {
        const status = String(
          row.approval_status ||
            "Pending"
        );

        const Icon =
          status === "Approved"
            ? FaCheckCircle
            : status === "Rejected"
              ? FaTimes
              : FaClock;

        return (
          <span
            className={`pp-pill pp-pill--${status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber"}`}
          >
            <Icon />
            {status}
          </span>
        );
      },
    },

    {
      key: "actions",
      title: "Actions",
      minWidth: "130px",
      align: "center",

      render: (row) => (
        <div className="action-buttons">
          {canEdit(permission) && (
            <button
              type="button"
              className="edit-btn"
              title="Edit"
              onClick={() =>
                openEdit(row)
              }
            >
              <FaEditIcon />
              <span>Edit</span>
            </button>
          )}

          {canDelete(permission) && (
            <button
              type="button"
              className="delete-btn"
              title="Delete"
              onClick={() =>
                askDelete(row.id)
              }
            >
              <FaTrash />
              <span>Delete</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  /* =========================================================
     PERMISSION
  ========================================================= */

  if (!canView(permission)) {
    return null;
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="sales-page sales-standard-page pp-premium">
      <PremiumHero
        icon={FaMapMarkedAlt}
        eyebrow="Sales team · Field visits"
        title="Visit Planner"
        tone="indigo"
        subtitle="Plan store visits for your sales force. Every new plan stays Pending until it is approved."
        meta={[
          { label: "Visit plans", value: formatCount(total) },
          { label: "Page", value: pageCount > 1 ? `${page} of ${pageCount}` : null }
        ]}
      />

      <InsightStrip
        loading={loading}
        items={[
          { key: "view", label: "In view", value: formatCount(rows.length), hint: "Plans on this page", tone: "violet", icon: FaListUl },
          { key: "pending", label: "Pending", value: formatCount(visitSummary.Pending), hint: "Awaiting approval", tone: "amber", icon: FaHourglassHalf },
          { key: "approved", label: "Approved", value: formatCount(visitSummary.Approved), hint: "Ready to travel", tone: "green", icon: FaCheckCircle },
          { key: "rejected", label: "Rejected", value: formatCount(visitSummary.Rejected), hint: "Needs re-planning", tone: "red", icon: FaTimes },
          { key: "off", label: "Week off", value: formatCount(visitSummary.weekOff), hint: "Leave entries", tone: "blue", icon: FaUmbrellaBeach }
        ]}
      />

      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <PageToolbar
        search={search}
        setSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        placeholder="Search name, city or planned store..."
        showAdd={canAdd(permission)}
        addText="Add Planned Visit"
        onAdd={openAdd}
        showExport
        onExport={exportCsv}
        showBulk={canAdd(permission)}
        onBulk={() =>
          setShowBulkModal(true)
        }
        showDeleteAll={canDelete(
          permission
        )}
        deleteAllText={deleteAllLabel(isFilteredDelete, total)}
        onDeleteAll={() =>
          setShowDeleteAllDialog(true)
        }
      >
        <button
          type="button"
          className="toolbar-btn refresh-toolbar-btn"
          onClick={load}
          disabled={loading}
        >
          <FaSyncAlt
            className={
              loading
                ? "sales-spin"
                : ""
            }
          />
          Refresh
        </button>
      </PageToolbar>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <FilterBar
        onClear={clearFilters}
      >
        <label className="sales-global-filter">
          <span>From</span>

          <input
            type="date"
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(
                event.target.value
              );
            }}
          />
        </label>

        <label className="sales-global-filter">
          <span>To</span>

          <input
            type="date"
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(
                event.target.value
              );
            }}
          />
        </label>

        <label className="sales-global-filter">
          <span>Name</span>

          <input
            placeholder="Filter by name..."
            value={nameFilter}
            onChange={(event) => {
              setPage(1);
              setNameFilter(
                event.target.value
              );
            }}
          />
        </label>

        <label className="sales-global-filter">
          <span>Department</span>

          <select
            value={departmentFilter}
            onChange={(event) => {
              setPage(1);
              setDepartmentFilter(
                event.target.value
              );
            }}
          >
            <option value="">
              All departments
            </option>

            {departments.map(
              (department) => (
                <option
                  key={department}
                  value={department}
                >
                  {department}
                </option>
              )
            )}
          </select>
        </label>

        <label className="sales-global-filter">
          <span>
            Planned Store
          </span>

          <input
            placeholder="Filter by store..."
            value={storeFilter}
            onChange={(event) => {
              setPage(1);
              setStoreFilter(
                event.target.value
              );
            }}
          />
        </label>
      </FilterBar>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <Card
        title="Planned Visits"
        subtitle={`${total} visit plan${
          total === 1
            ? ""
            : "s"
        } found`}
        noPadding
        className="pp-sticky-first pp-sticky-last"
      >
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyTitle="No Planned Visits Found"
          emptyDescription="Create a planned visit or use Bulk Upload to add multiple visits."
          className="sales-global-table"
        />

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          totalRecords={total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setLimit(size);
          }}
        />
      </Card>

      {/* =====================================================
          BULK UPLOAD
      ===================================================== */}

      <BulkUploadModal
    moduleKey="visit-plans"
    uploadUrl={"/api/sales-team/visit-plans/import"}
        isOpen={showBulkModal}
        onClose={() =>
          setShowBulkModal(false)
        }
        title="Bulk Upload Visit Plans"
        uploadFunction={importFile}
        onSuccess={load}/>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showModal && (
        <div
          className="sales-modal-backdrop vpw-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <form
            className="sales-form-modal visit-form-modal vp-wizard vpw"
            onSubmit={save}
          >
            {/* =================================================
                HEADER
            ================================================= */}

            <div className="sales-modal-header vpw-head">
              <span className="vpw-head-icon">
                {step === "details" ? <FaRoute /> : step === "dates" ? <FaCalendarAlt /> : <FaCheckCircle />}
              </span>
              <div>
                <span className="vpw-eyebrow">Sales Team · Visit Planner</span>
                <h2>
                  {step === "details"
                    ? editing ? "Edit Planned Visit" : "Add Planned Visit"
                    : step === "dates"
                      ? "Select Stores & Dates"
                      : "Review Visit Plan"}
                </h2>
                <p>
                  {step === "details"
                    ? editing
                      ? "Changes will be sent for approval again. All fields marked * are mandatory."
                      : "New plans are always submitted as Pending. All fields marked * are mandatory."
                    : step === "dates"
                      ? `Give every store its own visit date between ${dmy(form.visit_date)} and ${dmy(form.end_date)}.`
                      : "Check the plan, then submit it for approval."}
                </p>
              </div>

              <button
                type="button"
                className="sales-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="vp-steps">
              {[
                ["details", "Plan details"],
                ["dates", "Stores & dates"],
                ["review", "Review"],
              ].map(([key, label], index) => {
                const order = ["details", "dates", "review"];
                const state =
                  order.indexOf(step) > index ? "done" : step === key ? "active" : "";
                return (
                  <span key={key} className={`vp-step ${state} ${form.week_off && key === "dates" ? "skipped" : ""}`}>
                    <b>{state === "done" ? <FaCheckCircle /> : index + 1}</b>
                    {label}
                  </span>
                );
              })}
            </div>

            {/* =================================================
                STEP 1 — DETAILS
            ================================================= */}

            {step === "details" && (
              <div className="sales-form-grid">
                {/* EMPLOYEE */}
                <label className="sales-field sales-field-full vpw-section">
                  <span>
                    <FaUserTie className="vpw-label-icon" /> Employee <b>*</b>
                  </span>

                  <select
                    value={form.employee_id}
                    disabled={!admin || saving}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        employee_id: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select employee</option>
                    {filteredEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}{" "}
                        {employee.employee_id ? `(${employee.employee_id})` : ""}
                      </option>
                    ))}
                  </select>

                  {admin && (
                    <input
                      className="sales-field-search"
                      value={employeeSearch}
                      onChange={(event) => setEmployeeSearch(event.target.value)}
                      placeholder="Search employee name, ID or email..."
                      disabled={saving}
                    />
                  )}

                  {!filteredEmployees.length && (
                    <small className="sales-field-help">No employees found.</small>
                  )}
                </label>

                {/* DATE RANGE */}
                <div className="sales-field sales-field-full vpw-section">
                  <span>
                    <FaCalendarAlt className="vpw-label-icon" /> Date Range <b>*</b>
                  </span>

                  <div className="vp-range">
                    <label className="vp-range-input">
                      <small>From</small>
                      <input
                        type="date"
                        value={form.visit_date}
                        onChange={(event) => setRange(event.target.value, undefined)}
                        required
                        disabled={saving}
                      />
                    </label>
                    <span className="vp-range-arrow">→</span>
                    <label className="vp-range-input">
                      <small>To</small>
                      <input
                        type="date"
                        value={form.end_date}
                        min={form.visit_date}
                        onChange={(event) => setRange(undefined, event.target.value)}
                        required
                        disabled={saving}
                      />
                    </label>
                  </div>

                  <div className="vp-range-meta">
                    <strong>
                      Total Days: {totalDays || "—"}
                      {totalDays === 1 ? " (single day)" : ""}
                    </strong>
                    <div className="vp-presets">
                      <button type="button" onClick={() => applyPreset("today")} disabled={saving}>Today</button>
                      <button type="button" onClick={() => applyPreset("week")} disabled={saving}>This Week</button>
                      <button type="button" onClick={() => applyPreset("month")} disabled={saving}>This Month</button>
                      <button type="button" onClick={() => applyPreset("clear")} disabled={saving}>Clear</button>
                    </div>
                  </div>
                </div>

                {/* WEEK OFF */}
                <label className="sales-check-field">
                  <input
                    type="checkbox"
                    checked={form.week_off}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        week_off: event.target.checked,
                        planned_store_ids: event.target.checked ? [] : current.planned_store_ids,
                      }))
                    }
                    disabled={saving}
                  />
                  <span>Week off / Leave</span>
                </label>

                {/* CITY */}
                <label className="sales-field sales-field-full">
                  <span>
                    <FaMapMarkedAlt className="vpw-label-icon" /> City {form.week_off ? <small className="sales-field-help">(Optional for week off / leave)</small> : <b>*</b>}
                  </span>
                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, city: event.target.value }))
                    }
                    placeholder="Enter city or select a planned store"
                    disabled={saving}
                  />
                </label>

                {/* REASON */}
                <label className="sales-field sales-field-full">
                  <span>
                    Reason to travel <b>*</b>
                  </span>
                  <textarea
                    value={form.reason_to_travel}
                    maxLength={200}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reason_to_travel: event.target.value,
                      }))
                    }
                    placeholder="Purpose of this visit..."
                    rows={3}
                    disabled={saving}
                  />
                  <small className="vp-counter">{String(form.reason_to_travel || "").length}/200</small>
                </label>

                {/* STORES */}
                {!form.week_off && (
                  <div className="sales-field sales-field-full">
                    <div className="sales-store-picker-header">
                      <div>
                        <span>
                          <FaStore className="vpw-label-icon" /> Planned stores <b>*</b>
                        </span>
                        <small className="sales-field-help">
                          Select stores now — you assign a date for each store in the next step.
                        </small>
                      </div>

                      <button
                        type="button"
                        className="sales-store-refresh-btn"
                        onClick={loadLookups}
                        disabled={lookupLoading || saving}
                      >
                        <FaSyncAlt className={lookupLoading ? "sales-spin" : ""} />
                        {lookupLoading ? "Refreshing..." : "Refresh stores"}
                      </button>
                    </div>

                    <input
                      className="sales-store-search"
                      value={storeSearch}
                      onChange={(event) => setStoreSearch(event.target.value)}
                      placeholder="Search store name, code, city, state or address..."
                      disabled={saving}
                    />

                    <div className="sales-store-picker-actions">
                      <span>
                        {filteredStores.length} matching store
                        {filteredStores.length === 1 ? "" : "s"}
                      </span>
                      <div>
                        <button type="button" onClick={selectAllFilteredStores} disabled={!filteredStores.length || saving}>
                          Select all
                        </button>
                        <button type="button" onClick={clearFilteredStores} disabled={!filteredStores.length || saving}>
                          Clear matching
                        </button>
                      </div>
                    </div>

                    <div className="sales-store-picker">
                      {lookupLoading ? (
                        <div className="sales-picker-loading">
                          <PremiumLoader compact title="Loading stores from Store Management" />
                        </div>
                      ) : filteredStores.length ? (
                        filteredStores.map((store) => {
                          const selected = form.planned_store_ids.some(
                            (id) => Number(id) === Number(store.id)
                          );
                          const storeCode = getStoreCode(store);
                          const city = getStoreCity(store);
                          const state = getStoreState(store);

                          return (
                            <label
                              key={store.id}
                              className={`sales-store-option ${selected ? "selected" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleStore(store.id)}
                                disabled={saving}
                              />
                              <span className="sales-store-option-content">
                                <strong>{getStoreName(store) || "Unnamed Store"}</strong>
                                <small>
                                  {storeCode ? `Code: ${storeCode}` : ""}
                                  {city ? ` · ${city}` : ""}
                                  {state ? ` · ${state}` : ""}
                                </small>
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="sales-picker-empty">
                          <strong>No stores found</strong>
                          <span>Try another search or refresh the Store Management list.</span>
                        </div>
                      )}
                    </div>

                    <div className="sales-selected-summary">
                      <strong>{form.planned_store_ids.length}</strong> store
                      {form.planned_store_ids.length === 1 ? "" : "s"} selected
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                STEP 2 — STORE-WISE DATES
            ================================================= */}

            {step === "dates" && (
              <div className="vp-dates">
                <div className="vp-dates-toolbar">
                  <label className="vp-select-all">
                    <input
                      type="checkbox"
                      checked={excludedStores.length === 0 && form.planned_store_ids.length > 0}
                      onChange={(event) =>
                        setExcludedStores(event.target.checked ? [] : form.planned_store_ids.map(Number))
                      }
                    />
                    Select all ({form.planned_store_ids.length})
                  </label>

                  <div className="vp-dates-actions">
                    <span className="vp-range-chip">
                      {dmy(form.visit_date)} → {dmy(form.end_date)} · {totalDays} day{totalDays === 1 ? "" : "s"}
                    </span>
                    <button type="button" className="vp-soft-btn" onClick={autoFillDates}>
                      <FaSyncAlt /> Auto Fill Dates
                    </button>
                  </div>
                </div>

                <div className="vp-dates-table-wrap">
                  <table className="vp-dates-table">
                    <thead>
                      <tr>
                        <th />
                        <th>#</th>
                        <th>Store Name (Code)</th>
                        <th>City</th>
                        <th>Visit Date</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {form.planned_store_ids.map((storeId, index) => {
                        const store = storeById(storeId);
                        const name = getStoreName(store) || store?.store_name || `Store #${storeId}`;
                        const code = getStoreCode(store) || store?.store_code;
                        const excluded = excludedStores.includes(Number(storeId));
                        const date = storeDateFor(storeId);
                        const invalid = !excluded && (date < form.visit_date || date > form.end_date);

                        return (
                          <tr key={storeId} className={excluded ? "excluded" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!excluded}
                                onChange={() =>
                                  setExcludedStores((current) =>
                                    current.includes(Number(storeId))
                                      ? current.filter((id) => id !== Number(storeId))
                                      : [...current, Number(storeId)]
                                  )
                                }
                              />
                            </td>
                            <td>{index + 1}</td>
                            <td>
                              <strong>{name}</strong>
                              {code ? <small> ({code})</small> : null}
                            </td>
                            <td>{getStoreCity(store) || store?.city || "—"}</td>
                            <td>
                              <input
                                type="date"
                                className={invalid ? "invalid" : ""}
                                value={date}
                                min={form.visit_date}
                                max={form.end_date}
                                disabled={excluded}
                                onChange={(event) => setStoreDate(storeId, event.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="vp-remove"
                                title="Remove store"
                                onClick={() => toggleStore(storeId)}
                              >
                                <FaTimes />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="vp-dates-footer">
                  <span>
                    <FaCheckCircle /> Selected Stores: <strong>{includedStoreIds.length}</strong>
                  </span>
                  <button type="button" className="vp-soft-btn" onClick={() => setStep("details")}>
                    <FaPlus /> Add More Stores
                  </button>
                </div>
              </div>
            )}

            {/* =================================================
                STEP 3 — REVIEW
            ================================================= */}

            {step === "review" && (() => {
              const employee =
                employees.find((e) => Number(e.id) === Number(form.employee_id)) ||
                (editing && Number(editing.employee_id) === Number(form.employee_id)
                  ? { name: editing.name, employee_id: editing.employee_code }
                  : null);

              const plannedRows = includedStoreIds
                .map((id) => ({ id, store: storeById(id), date: storeDateFor(id) }))
                .sort((a, b) => String(a.date).localeCompare(String(b.date)));

              return (
                <div className="vp-review">
                  <div className="vp-review-section">
                    <h4>Employee Details</h4>
                    <div className="vp-review-employee">
                      <span className={`pp-avatar pp-avatar--round ${avatarTone(employee?.name)}`}>
                        {initials(employee?.name)}
                      </span>
                      <div>
                        <strong>
                          {employee?.name || "—"}
                          {employee?.employee_id ? ` (${employee.employee_id})` : ""}
                        </strong>
                        <small>{employee?.designation || employee?.department || ""}</small>
                      </div>
                    </div>
                  </div>

                  <div className="vp-review-grid">
                    <div className="vp-review-card">
                      <small>Date Range</small>
                      <strong>{dmy(form.visit_date)} → {dmy(form.end_date)}</strong>
                      <em>Total Days: {totalDays}</em>
                    </div>
                    <div className="vp-review-card">
                      <small>City</small>
                      <strong>{form.city || "—"}</strong>
                    </div>
                    <div className="vp-review-card">
                      <small>Reason to Travel</small>
                      <strong>{form.reason_to_travel || "—"}</strong>
                    </div>
                    {form.week_off && (
                      <div className="vp-review-card">
                        <small>Type</small>
                        <strong>Week off / Leave</strong>
                      </div>
                    )}
                  </div>

                  {!form.week_off && (
                    <div className="vp-review-section">
                      <h4>Planned Stores ({plannedRows.length})</h4>
                      <div className="vp-dates-table-wrap">
                        <table className="vp-dates-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Store Name (Code)</th>
                              <th>City</th>
                              <th>Visit Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plannedRows.map(({ id, store, date }, index) => (
                              <tr key={id}>
                                <td>{index + 1}</td>
                                <td>
                                  {getStoreName(store) || store?.store_name || `Store #${id}`}
                                  {getStoreCode(store) || store?.store_code ? ` (${getStoreCode(store) || store?.store_code})` : ""}
                                </td>
                                <td>{getStoreCity(store) || store?.city || "—"}</td>
                                <td>{dmy(date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* =================================================
                ACTIONS
            ================================================= */}

            {modalError && (
              <div className="vpw-error" role="alert">
                <FaExclamationCircle /> {modalError}
                <button type="button" onClick={() => setModalError("")} aria-label="Dismiss">×</button>
              </div>
            )}

            <div className="sales-modal-actions">
              {step === "details" ? (
                <button type="button" className="modal-secondary-btn" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="modal-secondary-btn"
                  onClick={() => setStep(step === "review" && !form.week_off ? "dates" : "details")}
                  disabled={saving}
                >
                  {step === "review" ? "Edit" : "Back"}
                </button>
              )}

              {step === "details" && (
                <button type="button" className="modal-primary-btn" onClick={goToDates} disabled={saving || lookupLoading}>
                  {form.week_off ? "Next: Review" : "Next: Select Stores & Dates"} →
                </button>
              )}

              {step === "dates" && (
                <button type="button" className="modal-primary-btn" onClick={goToReview} disabled={saving}>
                  Preview &amp; Submit →
                </button>
              )}

              {step === "review" && (
                <button type="submit" className="modal-primary-btn vp-submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Submit Changes for Approval"
                      : "Submit for Approval"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      <ConfirmDialog
        open={
          showDeleteDialog
        }
        title="Delete Planned Visit"
        message="Are you sure you want to delete this planned visit?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={
          confirmDelete
        }
        onCancel={() => {
          setDeleteId(null);
          setShowDeleteDialog(
            false
          );
        }}
      />

      {/* =====================================================
          DELETE ALL CONFIRMATION
      ===================================================== */}

      <ConfirmDialog
        open={
          showDeleteAllDialog
        }
        title={isFilteredDelete ? "Delete Filtered Visit Plans" : "Delete All Visit Plans"}
        message={isFilteredDelete
          ? `${deleteAllMessage(true, total, "visit plans")} This action cannot be undone.`
          : "No filter is applied. This will delete all visit plans available to your account. This action cannot be undone."}
        confirmText={isFilteredDelete ? "Delete Filtered" : "Delete All"}
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={
          confirmDeleteAll
        }
        onCancel={() =>
          setShowDeleteAllDialog(
            false
          )
        }
      />
    </div>
  );
}

export default VisitPlanner;
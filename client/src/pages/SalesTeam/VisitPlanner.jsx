import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaDownload,
  FaInfoCircle,
  FaPlus,
  FaSyncAlt,
  FaTrash,
  FaUpload,
  FaCheckCircle,
  FaClock,
  FaTimes,
} from "react-icons/fa";

import PageHeader from "../../components/common/PageHeader";
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

/* =========================================================
   INITIAL FORM
========================================================= */

const makeInitialForm = () => ({
  employee_id: "",
  visit_date: new Date().toISOString().slice(0, 10),
  week_off: false,
  city: "",
  reason_to_travel: "",
  planned_store_ids: [],
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

    const existingStoreIds = Array.isArray(
      row.planned_store_ids
    )
      ? row.planned_store_ids
      : [];

    setForm({
      employee_id: row.employee_id || "",
      visit_date: toInputDate(row.visit_date),
      week_off: Boolean(row.week_off),
      city: row.city || "",
      reason_to_travel:
        row.reason_to_travel || "",
      planned_store_ids:
        existingStoreIds,
    });

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
     SAVE
  ========================================================= */

  const save = async (event) => {
    event.preventDefault();

    if (
      !form.employee_id ||
      !form.visit_date
    ) {
      alert(
        "Employee and date are required."
      );

      return;
    }

    if (
      !form.week_off &&
      form.planned_store_ids.length === 0
    ) {
      alert(
        "Please select at least one planned store."
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,

        employee_id: Number(
          form.employee_id
        ),

        planned_store_ids:
          form.week_off
            ? []
            : form.planned_store_ids.map(
                (id) => Number(id)
              ),
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

      await load();
    } catch (error) {
      console.error(
        "Save visit plan failed",
        error
      );

      alert(
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

  const confirmDeleteAll = async () => {
    try {
      await deleteAllVisitPlans();

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

  const exportCsv = async () => {
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

      downloadBlob(
        response.data,
        "visit-planner.csv"
      );
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

  const columns = [
    {
      key: "visit_date",
      title: "Date",
      render: (row) =>
        formatDate(row.visit_date),
      minWidth: "110px",
    },

    {
      key: "day_name",
      title: "Day",
      minWidth: "110px",
    },

    {
      key: "name",
      title: "Name",
      minWidth: "170px",
      render: (row) => (
        <strong>{row.name}</strong>
      ),
    },

    {
      key: "designation",
      title: "Designation",
      minWidth: "160px",
      render: (row) =>
        row.designation || "—",
    },

    {
      key: "department",
      title: "Department",
      minWidth: "150px",
      render: (row) =>
        row.department || "—",
    },

    {
      key: "city",
      title: "City",
      minWidth: "130px",
      render: (row) =>
        row.city || "—",
    },

    {
      key: "reason_to_travel",
      title: "Reason to travel",
      minWidth: "240px",
      render: (row) => (
        <span className="sales-wrap-cell">
          {row.reason_to_travel || "—"}
        </span>
      ),
    },

    {
      key: "planned_store_names",
      title: "Planned",
      minWidth: "260px",
      render: (row) =>
        row.week_off ? (
          <span className="sales-weekoff">
            Week off
          </span>
        ) : (
          <span className="sales-wrap-cell">
            {row.planned_store_names ||
              "—"}
          </span>
        ),
    },

    {
      key: "remarks",
      title: "Remarks",
      minWidth: "180px",
      render: (row) => (
        <span className="sales-wrap-cell">
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
            className={`sales-status-badge ${status.toLowerCase()}`}
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
        <div className="sales-action-buttons">
          {canEdit(permission) && (
            <button
              type="button"
              className="sales-icon-btn"
              title="Edit"
              onClick={() =>
                openEdit(row)
              }
            >
              Edit
            </button>
          )}

          {canDelete(permission) && (
            <button
              type="button"
              className="sales-icon-btn danger"
              title="Delete"
              onClick={() =>
                askDelete(row.id)
              }
            >
              Delete
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
    <div className="sales-page sales-standard-page">
      <PageHeader
        title={
          <>
            Visit Planner{" "}
            <FaInfoCircle className="sales-title-info" />
          </>
        }
        subtitle="Plan store visits for your sales force. Every new plan stays Pending until it is approved."
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
        isOpen={showBulkModal}
        onClose={() =>
          setShowBulkModal(false)
        }
        title="Bulk Upload Visit Plans"
        uploadFunction={importFile}
        onSuccess={load}
        acceptedFile=".csv,.xlsx,.xls"
      />

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showModal && (
        <div
          className="sales-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <form
            className="sales-form-modal visit-form-modal"
            onSubmit={save}
          >
            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div className="sales-modal-header">
              <div>
                <h2>
                  {editing
                    ? "Edit Planned Visit"
                    : "Add Planned Visit"}
                </h2>

                <p>
                  {editing
                    ? "Changes will be sent for approval again."
                    : "New plans are always submitted as Pending."}
                </p>
              </div>

              <button
                type="button"
                className="sales-modal-close"
                onClick={
                  closeModal
                }
                disabled={saving}
              >
                <FaTimes />
              </button>
            </div>

            {/* =================================================
                MODAL BODY
            ================================================= */}

            <div className="sales-form-grid">
              {/* =================================================
                  EMPLOYEE
              ================================================= */}

              <label className="sales-field sales-field-full">
                <span>
                  Employee <b>*</b>
                </span>

                <select
                  value={
                    form.employee_id
                  }
                  disabled={
                    !admin ||
                    saving
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        employee_id:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                >
                  <option value="">
                    Select employee
                  </option>

                  {filteredEmployees.map(
                    (employee) => (
                      <option
                        key={
                          employee.id
                        }
                        value={
                          employee.id
                        }
                      >
                        {employee.name}{" "}
                        {employee.employee_id
                          ? `(${employee.employee_id})`
                          : ""}
                      </option>
                    )
                  )}
                </select>

                {admin && (
                  <input
                    className="sales-field-search"
                    value={
                      employeeSearch
                    }
                    onChange={(
                      event
                    ) =>
                      setEmployeeSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search employee name, ID or email..."
                    disabled={
                      saving
                    }
                  />
                )}

                {!filteredEmployees.length && (
                  <small className="sales-field-help">
                    No employees found.
                  </small>
                )}
              </label>

              {/* =================================================
                  DATE
              ================================================= */}

              <label className="sales-field">
                <span>
                  Date <b>*</b>
                </span>

                <input
                  type="date"
                  value={
                    form.visit_date
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        visit_date:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                  disabled={saving}
                />
              </label>

              {/* =================================================
                  WEEK OFF
              ================================================= */}

              <label className="sales-check-field">
                <input
                  type="checkbox"
                  checked={
                    form.week_off
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        week_off:
                          event
                            .target
                            .checked,

                        planned_store_ids:
                          event
                            .target
                            .checked
                            ? []
                            : current.planned_store_ids,
                      })
                    )
                  }
                  disabled={
                    saving
                  }
                />

                <span>
                  Week off
                </span>
              </label>

              {/* =================================================
                  CITY
              ================================================= */}

              <label className="sales-field sales-field-full">
                <span>
                  City
                </span>

                <input
                  value={
                    form.city
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        city:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Enter city or select a planned store"
                  disabled={
                    saving
                  }
                />
              </label>

              {/* =================================================
                  REASON
              ================================================= */}

              <label className="sales-field sales-field-full">
                <span>
                  Reason to travel
                </span>

                <textarea
                  value={
                    form.reason_to_travel
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        current
                      ) => ({
                        ...current,
                        reason_to_travel:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Purpose of this visit..."
                  rows={4}
                  disabled={
                    saving
                  }
                />
              </label>

              {/* =================================================
                  STORES
              ================================================= */}

              {!form.week_off && (
                <div className="sales-field sales-field-full">
                  <div className="sales-store-picker-header">
                    <div>
                      <span>
                        Planned stores{" "}
                        <b>*</b>
                      </span>

                      <small className="sales-field-help">
                        Stores are loaded directly from Store Management.
                      </small>
                    </div>

                    <button
                      type="button"
                      className="sales-store-refresh-btn"
                      onClick={
                        loadLookups
                      }
                      disabled={
                        lookupLoading ||
                        saving
                      }
                    >
                      <FaSyncAlt
                        className={
                          lookupLoading
                            ? "sales-spin"
                            : ""
                        }
                      />

                      {lookupLoading
                        ? "Refreshing..."
                        : "Refresh stores"}
                    </button>
                  </div>

                  {/* =============================================
                      STORE SEARCH
                  ============================================= */}

                  <input
                    className="sales-store-search"
                    value={
                      storeSearch
                    }
                    onChange={(
                      event
                    ) =>
                      setStoreSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search store name, code, city, state or address..."
                    disabled={
                      saving
                    }
                  />

                  {/* =============================================
                      STORE ACTIONS
                  ============================================= */}

                  <div className="sales-store-picker-actions">
                    <span>
                      {filteredStores.length}{" "}
                      matching store
                      {filteredStores.length ===
                      1
                        ? ""
                        : "s"}
                    </span>

                    <div>
                      <button
                        type="button"
                        onClick={
                          selectAllFilteredStores
                        }
                        disabled={
                          !filteredStores.length ||
                          saving
                        }
                      >
                        Select all
                      </button>

                      <button
                        type="button"
                        onClick={
                          clearFilteredStores
                        }
                        disabled={
                          !filteredStores.length ||
                          saving
                        }
                      >
                        Clear matching
                      </button>
                    </div>
                  </div>

                  {/* =============================================
                      STORE LIST
                  ============================================= */}

                  <div className="sales-store-picker">
                    {lookupLoading ? (
                      <div className="sales-picker-loading">
                        <FaSyncAlt className="sales-spin" />

                        <span>
                          Loading stores from Store Management...
                        </span>
                      </div>
                    ) : filteredStores.length ? (
                      filteredStores.map(
                        (store) => {
                          const selected =
                            form.planned_store_ids.some(
                              (id) =>
                                Number(
                                  id
                                ) ===
                                Number(
                                  store.id
                                )
                            );

                          const storeName =
                            getStoreName(
                              store
                            ) ||
                            "Unnamed Store";

                          const storeCode =
                            getStoreCode(
                              store
                            );

                          const city =
                            getStoreCity(
                              store
                            );

                          const state =
                            getStoreState(
                              store
                            );

                          const address =
                            getStoreAddress(
                              store
                            );

                          const status =
                            getStoreStatus(
                              store
                            );

                          return (
                            <label
                              key={
                                store.id
                              }
                              className={`sales-store-option ${
                                selected
                                  ? "selected"
                                  : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selected
                                }
                                onChange={() =>
                                  toggleStore(
                                    store.id
                                  )
                                }
                                disabled={
                                  saving
                                }
                              />

                              <span className="sales-store-option-content">
                                <strong>
                                  {
                                    storeName
                                  }
                                </strong>

                                <small>
                                  {storeCode
                                    ? `Code: ${storeCode}`
                                    : ""}

                                  {city
                                    ? ` · ${city}`
                                    : ""}

                                  {state
                                    ? ` · ${state}`
                                    : ""}
                                </small>

                                {address && (
                                  <small className="sales-store-address">
                                    {address}
                                  </small>
                                )}

                                {status && (
                                  <small className="sales-store-status">
                                    {status}
                                  </small>
                                )}
                              </span>
                            </label>
                          );
                        }
                      )
                    ) : (
                      <div className="sales-picker-empty">
                        <strong>
                          No stores found
                        </strong>

                        <span>
                          Try another search or refresh the Store Management list.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* =============================================
                      SELECTED SUMMARY
                  ============================================= */}

                  <div className="sales-selected-summary">
                    <strong>
                      {
                        form
                          .planned_store_ids
                          .length
                      }
                    </strong>{" "}
                    store
                    {form
                      .planned_store_ids
                      .length === 1
                      ? ""
                      : "s"}{" "}
                    selected
                  </div>

                  {/* =============================================
                      SELECTED STORE CHIPS
                  ============================================= */}

                  {form.planned_store_ids
                    .length > 0 && (
                    <div className="sales-selected-store-list">
                      {form.planned_store_ids.map(
                        (storeId) => {
                          const selectedStore =
                            stores.find(
                              (store) =>
                                Number(
                                  store.id
                                ) ===
                                Number(
                                  storeId
                                )
                            );

                          if (
                            !selectedStore
                          ) {
                            return (
                              <span
                                key={
                                  storeId
                                }
                                className="sales-selected-store-chip"
                              >
                                Store #
                                {
                                  storeId
                                }

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleStore(
                                      storeId
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  aria-label="Remove store"
                                >
                                  <FaTimes />
                                </button>
                              </span>
                            );
                          }

                          return (
                            <span
                              key={
                                storeId
                              }
                              className="sales-selected-store-chip"
                            >
                              {getStoreName(
                                selectedStore
                              ) ||
                                `Store #${storeId}`}

                              <button
                                type="button"
                                onClick={() =>
                                  toggleStore(
                                    storeId
                                  )
                                }
                                disabled={
                                  saving
                                }
                                aria-label="Remove store"
                              >
                                <FaTimes />
                              </button>
                            </span>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* =================================================
                MODAL ACTIONS
            ================================================= */}

            <div className="sales-modal-actions">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={
                  closeModal
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="modal-primary-btn"
                disabled={
                  saving ||
                  lookupLoading
                }
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Submit Changes for Approval"
                    : "Submit for Approval"}
              </button>
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
        title="Delete All Visit Plans"
        message="This will delete all visit plans available to your account. This action cannot be undone."
        confirmText="Delete All"
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
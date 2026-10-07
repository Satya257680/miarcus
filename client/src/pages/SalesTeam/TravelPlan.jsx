import PremiumLoader from "../../components/premium/PremiumLoader";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaCommentAlt,
  FaHistory,
  FaSyncAlt,
  FaTrash,
  FaDownload,
  FaTimes,
  FaSave,
  FaStore,
  FaCheckCircle,
  FaPlaneDeparture,
  FaUsers,
  FaMapMarkerAlt,
  FaBed,
} from "react-icons/fa";

import PageToolbar from "../../components/common/PageToolbar";
import FilterBar from "../../components/common/FilterBar";
import Card from "../../components/common/Card";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import {
  getTravelPlans,
  getSalesStores,
  saveActualStores,
  getTravelPlanHistory,
  addTravelRemark,
  deleteTravelPlan,
  exportVisitPlans,
} from "../../services/salesTeamService";

import {
  canDelete,
  canEdit,
  canView,
  downloadBlob,
  formatDate,
} from "./salesTeamUtils";

import "../../styles/pages/SalesTeam.css";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import InsightStrip from "../../components/premium/InsightStrip";
import { initials, avatarTone, formatCount } from "../../utils/premiumFormat";
import { exportFromCSV } from "../../utils/exportUtils.js";
import TravelStoreSchedule from "./TravelStoreSchedule";

/* =========================================================
   TRAVEL PLAN
========================================================= */

function TravelPlan() {
  const permission = "Travel Plan";

  /* =======================================================
     DATA
  ======================================================= */

  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);

  /* =======================================================
     LOADING
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [savingActual, setSavingActual] =
    useState(null);

  const [savingRemark, setSavingRemark] =
    useState(false);

  /* =======================================================
     FILTERS
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [planListSearch, setPlanListSearch] =
    useState("");

  const [selectedPlanId, setSelectedPlanId] =
    useState(null);

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [name, setName] =
    useState("");

  const [department, setDepartment] =
    useState("");

  const [store, setStore] =
    useState("");

  /* =======================================================
     ACTUAL STORES
  ======================================================= */

  const [actual, setActual] =
    useState({});

  /* =======================================================
     REMARK / HISTORY
  ======================================================= */

  const [remarksRow, setRemarksRow] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [loadingHistory, setLoadingHistory] =
    useState(false);

  const [remarkDraft, setRemarkDraft] =
    useState("");

  const [attachment, setAttachment] =
    useState(null);

  const attachmentRef =
    useRef(null);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const [page, setPage] =
    useState(1);

  const [limit, setLimit] =
    useState(10);

  const [total, setTotal] =
    useState(0);

  /* =======================================================
     DELETE
  ======================================================= */

  const [deleteId, setDeleteId] =
    useState(null);

  /* =======================================================
     DEPARTMENTS
  ======================================================= */

  const departments = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map(
              (row) =>
                row.department
            )
            .filter(Boolean)
        ),
      ].sort(),
    [rows]
  );

  /* =======================================================
     LOAD TRAVEL PLANS
  ======================================================= */

  const load = useCallback(
    async (showRefresh = false) => {
      if (!canView(permission)) {
        setLoading(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response =
          await getTravelPlans({
            page,
            limit,
            search,
            from,
            to,
            name,
            department,
            store,
          });

        const data =
          response?.data?.data;

        const nextRows =
          Array.isArray(data)
            ? data
            : [];

        setRows(nextRows);

        setTotal(
          Number(
            response?.data?.total || 0
          )
        );

        /*
          Keep actual-store selections synchronized
          with the latest backend data.
        */
        setActual((current) => {
          const next = {};

          nextRows.forEach(
            (row) => {
              if (
                Object.prototype.hasOwnProperty.call(
                  current,
                  row.id
                )
              ) {
                next[row.id] =
                  current[row.id];
              }
            }
          );

          return next;
        });
      } catch (error) {
        console.error(
          "Unable to load Travel Plan:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Unable to load Travel Plan."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      search,
      from,
      to,
      name,
      department,
      store,
    ]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedPlanId(null);
      return;
    }

    setSelectedPlanId((current) =>
      rows.some((row) => String(row.id) === String(current))
        ? current
        : rows[0].id
    );
  }, [rows]);

  /* =======================================================
     LOAD CURRENT STORE MANAGEMENT STORES
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    getSalesStores()
      .then((response) => {
        if (!mounted) {
          return;
        }

        const data =
          response?.data?.data;

        setStores(
          Array.isArray(data)
            ? data
            : []
        );
      })
      .catch((error) => {
        console.error(
          "Unable to load stores:",
          error
        );
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     STORE MAP
  ======================================================= */

  const storeMap = useMemo(() => {
    const map = new Map();

    stores.forEach(
      (storeItem) => {
        map.set(
          Number(storeItem.id),
          storeItem
        );
      }
    );

    return map;
  }, [stores]);

  /* =======================================================
     ACTUAL STORE SELECTION
  ======================================================= */

  const getActualStoreIds = (
    row
  ) => {
    const value =
      actual[row.id] ??
      row.actual_store_ids ??
      [];

    return Array.isArray(value)
      ? value
          .map(Number)
          .filter(Boolean)
      : [];
  };

  const setSelection = (
    id,
    value
  ) => {
    setActual(
      (current) => ({
        ...current,
        [id]: [
          ...new Set(
            value
              .map(Number)
              .filter(Boolean)
          ),
        ],
      })
    );
  };

  /* =======================================================
     SAVE ACTUAL STORES
  ======================================================= */

  const save = async (
    row
  ) => {
    if (
      !canEdit(permission) ||
      savingActual === row.id
    ) {
      return;
    }

    setSavingActual(row.id);

    try {
      const selected =
        getActualStoreIds(row);

      await saveActualStores(
        row.id,
        selected
      );

      await load(true);
    } catch (error) {
      console.error(
        "Unable to save actual stores:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to save actual stores."
      );
    } finally {
      setSavingActual(null);
    }
  };

  /* =======================================================
     OPEN HISTORY
  ======================================================= */

  const openHistory = async (
    row
  ) => {
    setRemarksRow(row);
    setHistory([]);
    setRemarkDraft(
      row.remarks || ""
    );
    setAttachment(null);

    if (
      attachmentRef.current
    ) {
      attachmentRef.current.value =
        "";
    }

    setLoadingHistory(true);

    try {
      const response =
        await getTravelPlanHistory(
          row.id
        );

      setHistory(
        Array.isArray(
          response?.data?.data
        )
          ? response.data.data
          : []
      );
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
          "Unable to load history."
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  /* =======================================================
     OPEN REMARKS
  ======================================================= */

  const openRemarks = (
    row
  ) => {
    setHistory([]);
    setRemarkDraft(
      row.remarks || ""
    );
    setAttachment(null);

    if (
      attachmentRef.current
    ) {
      attachmentRef.current.value =
        "";
    }

    setRemarksRow(row);
  };

  /* =======================================================
     CLOSE REMARK MODAL
  ======================================================= */

  const closeRemarks = () => {
    if (savingRemark) {
      return;
    }

    setRemarksRow(null);
    setHistory([]);
    setRemarkDraft("");
    setAttachment(null);

    if (
      attachmentRef.current
    ) {
      attachmentRef.current.value =
        "";
    }
  };

  /* =======================================================
     SAVE REMARK
  ======================================================= */

  const saveRemark = async () => {
    if (
      !remarksRow ||
      savingRemark
    ) {
      return;
    }

    const remark =
      remarkDraft.trim();

    if (
      !remark &&
      !attachment
    ) {
      alert(
        "Please enter a remark or attach a file."
      );

      return;
    }

    setSavingRemark(true);

    try {
      await addTravelRemark(
        remarksRow.id,
        remark,
        attachment
      );

      setRemarkDraft("");
      setAttachment(null);

      if (
        attachmentRef.current
      ) {
        attachmentRef.current.value =
          "";
      }

      await load(true);

      await openHistory(
        remarksRow
      );
    } catch (error) {
      console.error(
        "Unable to save remark:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to save remark."
      );
    } finally {
      setSavingRemark(false);
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const confirmDelete =
    async () => {
      if (!deleteId) {
        return;
      }

      try {
        await deleteTravelPlan(
          deleteId
        );

        await load(true);
      } catch (error) {
        console.error(
          "Delete failed:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Delete failed."
        );
      } finally {
        setDeleteId(null);
      }
    };

  /* =======================================================
     EXPORT
  ======================================================= */

  const exportCsv =
    async (format = "csv") => {
      try {
        const response =
          await exportVisitPlans({
            search,
            from,
            to,
            name,
            department,
            store,
            approved_only: 1,
          });

        const csvText = await response.data.text();

        await exportFromCSV({
          csvText,
          filename: "travel-plan",
          format,
          title: "Travel Plan",
        });
      } catch (error) {
        console.error(
          "Export failed:",
          error
        );

        alert(
          error.response?.data?.message ||
            "Export failed."
        );
      }
    };

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters =
    () => {
      setSearch("");
      setFrom("");
      setTo("");
      setName("");
      setDepartment("");
      setStore("");
      setPage(1);
    };

  /* =======================================================
     PAGINATION
  ======================================================= */

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        total / limit
      )
    );

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const columns = [
    {
      key: "visit_date",
      title: "Date / Period",
      minWidth: "170px",
      render: (row) => {
        const start = formatDate(row.visit_date);
        const end = row.end_date && String(row.end_date).slice(0, 10) !== String(row.visit_date).slice(0, 10)
          ? formatDate(row.end_date)
          : null;

        // Every plan now has a From -> To range (not only week offs).
        return end ? (
          <span className="sales-date-range-cell">
            <strong>{start}</strong>
            <span>to</span>
            <strong>{end}</strong>
          </span>
        ) : (
          start
        );
      },
    },

    {
      key: "day_name",
      title: "Day",
      minWidth: "100px",
    },

    {
      key: "name",
      title: "Name",
      minWidth: "170px",
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
      key: "designation",
      title: "Designation",
      minWidth: "160px",
      render: (row) =>
        row.designation ||
        "—",
    },

    {
      key: "department",
      title: "Department",
      minWidth: "150px",
      render: (row) =>
        row.department
          ? <span className="pp-pill pp-pill--violet">{row.department}</span>
          : <span className="pp-dash">—</span>,
    },

    {
      key: "city",
      title: "City",
      minWidth: "130px",
      render: (row) =>
        row.city
          ? <span className="pp-city"><FaMapMarkerAlt />{row.city}</span>
          : <span className="pp-dash">—</span>,
    },

    {
      key: "planned_store_names",
      title: "Planned Stores",
      minWidth: "240px",
      render: (row) => {
        const list = Array.isArray(row.planned_stores) ? row.planned_stores : [];
        const blankDays = Array.isArray(row.day_reasons) ? row.day_reasons : [];
        if (!list.length && !blankDays.length) {
          return (
            <span className="sales-wrap-cell">
              {row.planned_store_names || "—"}
            </span>
          );
        }
        // Store-wise visit dates of the plan + reasons for days with no store.
        return (
          <TravelStoreSchedule
            stores={list}
            blankDays={blankDays}
            compact
            highlightVisit
          />
        );
      },
    },

    /* ===================================================
       ACTUAL STORES
    =================================================== */

    {
      key: "actual",
      title: "Actual Stores",
      minWidth: "270px",

      render: (row) => {
        if (row.week_off) {
          return (
            <span className="sales-weekoff">
              Week off
              {row.leave_days > 1
                ? ` · ${row.leave_days} days`
                : ""}
            </span>
          );
        }

        const selected =
          getActualStoreIds(
            row
          );

        /*
          Only show stores that belong to
          the approved plan.

          Store data itself comes from the
          current Store Management table.
        */
        const plannedIds =
          Array.isArray(
            row.planned_store_ids
          )
            ? row.planned_store_ids.map(
                Number
              )
            : [];

        const availableStores =
          stores.filter(
            (storeItem) =>
              plannedIds.includes(
                Number(
                  storeItem.id
                )
              )
          );

        return (
          <div className="actual-store-editor">
            {availableStores.length ===
            0 ? (
              <span className="sales-muted-text">
                No planned stores
              </span>
            ) : (
              <select
                multiple
                value={selected.map(
                  String
                )}
                onChange={(event) =>
                  setSelection(
                    row.id,
                    [
                      ...event.target
                        .selectedOptions,
                    ].map(
                      (option) =>
                        Number(
                          option.value
                        )
                    )
                  )
                }
                disabled={
                  !canEdit(
                    permission
                  ) ||
                  savingActual ===
                    row.id
                }
                title="Select actual visited stores"
              >
                {availableStores.map(
                  (
                    storeItem
                  ) => (
                    <option
                      key={
                        storeItem.id
                      }
                      value={
                        storeItem.id
                      }
                    >
                      {storeItem.store_name}
                      {storeItem.store_code
                        ? ` (${storeItem.store_code})`
                        : ""}
                    </option>
                  )
                )}
              </select>
            )}

            {canEdit(
              permission
            ) &&
              availableStores.length >
                0 && (
                <button
                  type="button"
                  className="mini-save-btn"
                  onClick={() =>
                    save(row)
                  }
                  disabled={
                    savingActual ===
                    row.id
                  }
                >
                  {savingActual ===
                  row.id ? (
                    <>
                      <FaSyncAlt className="sales-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <FaSave />
                      Save
                    </>
                  )}
                </button>
              )}
          </div>
        );
      },
    },

    /* ===================================================
       VISIT RATE
    =================================================== */

    {
      key: "visit_rate",
      title: "Visit Rate",
      minWidth: "120px",
      align: "center",

      render: (row) => {
        if (row.week_off) {
          return (
            <span className="sales-weekoff">
              Week off
            </span>
          );
        }

        const selected =
          getActualStoreIds(
            row
          );

        const plannedCount =
          Number(
            row.planned_store_count ||
              0
          );

        const rate =
          plannedCount > 0
            ? Math.min(
                100,
                Math.round(
                  (selected.length /
                    plannedCount) *
                    100
                )
              )
            : 0;

        return (
          <span
            className={`visit-rate ${
              rate >= 100
                ? "complete"
                : "partial"
            }`}
          >
            {rate >= 100 && (
              <FaCheckCircle />
            )}

            {rate}%
          </span>
        );
      },
    },

    /* ===================================================
       REASON
    =================================================== */

    {
      key: "reason_to_travel",
      title: "Reason to Travel",
      minWidth: "220px",

      render: (row) => (
        <div className="travel-reason-cell">
          <span className="travel-visit-highlight">
            <FaPlaneDeparture />
            {row.reason_to_travel || "Store Visit"}
          </span>
        </div>
      ),
    },

    /* ===================================================
       REMARKS
    =================================================== */

    {
      key: "remarks",
      title: "Remarks",
      minWidth: "150px",
      align: "center",

      render: (row) => (
        <button
          type="button"
          className="sales-text-link"
          onClick={() =>
            openRemarks(row)
          }
        >
          <FaCommentAlt />

          {row.remarks
            ? "View"
            : "Add remarks"}
        </button>
      ),
    },

    /* ===================================================
       HISTORY
    =================================================== */

    {
      key: "history",
      title: "History",
      minWidth: "110px",
      align: "center",

      render: (row) => (
        <button
          type="button"
          className="sales-text-link"
          onClick={() =>
            openHistory(row)
          }
        >
          <FaHistory />
          View
        </button>
      ),
    },

    /* ===================================================
       ACTIONS
    =================================================== */

    {
      key: "actions",
      title: "Actions",
      minWidth: "110px",
      align: "center",

      render: (row) =>
        canDelete(
          permission
        ) ? (
          <button
            type="button"
            className="sales-text-link danger"
            onClick={() =>
              setDeleteId(
                row.id
              )
            }
          >
            <FaTrash />
            Delete
          </button>
        ) : (
          <span>—</span>
        ),
    },
  ];


  /* =======================================================
     PREMIUM APPROVED PLAN MASTER / DETAIL VIEW
  ======================================================= */

  const planListRows = useMemo(() => {
    const query = planListSearch.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => [
      row.name,
      row.designation,
      row.department,
      row.city,
      row.visit_date,
      row.end_date,
      formatDate(row.visit_date),
      formatDate(row.end_date),
      String(row.planned_store_count || ""),
    ].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [rows, planListSearch]);

  const selectedPlan = useMemo(
    () => rows.find((row) => String(row.id) === String(selectedPlanId)) || rows[0] || null,
    [rows, selectedPlanId]
  );

  const renderPlanListItem = (row) => {
    const plannedStores = Array.isArray(row.planned_stores) ? row.planned_stores : [];
    const plannedCount = Number(row.planned_store_count || plannedStores.length || 0);
    const selected = String(row.id) === String(selectedPlan?.id);
    const start = formatDate(row.visit_date);
    const end = row.end_date && String(row.end_date).slice(0, 10) !== String(row.visit_date).slice(0, 10)
      ? formatDate(row.end_date)
      : null;

    return (
      <button
        type="button"
        className={`travel-plan-master-item ${selected ? "is-selected" : ""}`}
        key={row.id}
        onClick={() => setSelectedPlanId(row.id)}
      >
        <span className="travel-plan-master-icon"><FaPlaneDeparture /></span>
        <span className="travel-plan-master-main">
          <strong>{end ? `${start} to ${end}` : start}</strong>
          <small>{row.day_name || "Travel plan"}</small>
          <b>{row.name || "Employee"}</b>
          <small>{row.designation || "—"}</small>
          {row.city && (
            <span className="travel-plan-master-city"><FaMapMarkerAlt />{row.city}</span>
          )}
        </span>
        <span className="travel-plan-master-meta">
          <em>{plannedCount} {plannedCount === 1 ? "Store" : "Stores"}</em>
          <span><FaCheckCircle /> Approved</span>
        </span>
      </button>
    );
  };

  const renderApprovedPlanDetail = (row) => {
    if (!row) return null;

    const plannedStores = Array.isArray(row.planned_stores) ? row.planned_stores : [];
    const selectedActual = getActualStoreIds(row);
    const plannedCount = Number(row.planned_store_count || plannedStores.length || 0);
    const visitRate = plannedCount
      ? Math.min(100, Math.round((selectedActual.length / plannedCount) * 100))
      : 0;
    const start = formatDate(row.visit_date);
    const end = row.end_date && String(row.end_date).slice(0, 10) !== String(row.visit_date).slice(0, 10)
      ? formatDate(row.end_date)
      : null;
    const dateRange = end ? `${start} to ${end}` : start;

    const availableActualStores = stores.filter((storeItem) =>
      (Array.isArray(row.planned_store_ids)
        ? row.planned_store_ids
        : plannedStores.map((item) => item.store_id)
      ).map(Number).includes(Number(storeItem.id))
    );

    return (
      <article className="travel-plan-detail-shell" key={row.id}>
        <header className="travel-plan-detail-header">
          <div className="travel-plan-detail-header-date">
            <span><FaPlaneDeparture /></span>
            <div>
              <strong>{dateRange}</strong>
              <small>{row.day_name || "Travel plan"}</small>
            </div>
          </div>

          <div className="travel-plan-detail-header-person">
            <span className={`pp-avatar pp-avatar--round ${avatarTone(row.name)}`}>
              {initials(row.name)}
            </span>
            <div>
              <strong>{row.name || "Employee"}</strong>
              <small>{row.designation || "—"}</small>
            </div>
          </div>

          {row.city && (
            <div className="travel-plan-detail-header-city">
              <FaMapMarkerAlt />
              {row.city}
            </div>
          )}

          <div className="travel-plan-approved-badge">
            <FaCheckCircle /> Approved
          </div>
        </header>

        <div className="travel-plan-detail-body">
          <section className="travel-plan-detail-stores">
            <div className="travel-plan-premium-content-head">
              <div className="travel-plan-premium-title">
                <span className="travel-plan-store-icon"><FaStore /></span>
                <div>
                  <h3>Store Visits <span>({plannedStores.length})</span></h3>
                  <p>{row.reason_to_travel || "Store Visit"}</p>
                </div>
              </div>
              <span className="travel-plan-store-count">
                {plannedStores.length} of {plannedStores.length} stores
              </span>
            </div>

            {row.week_off ? (
              <div className="travel-plan-weekoff-panel">
                <span><FaBed /></span>
                <div>
                  <strong>Week off</strong>
                  <p>{row.leave_days || 1} day{Number(row.leave_days) === 1 ? "" : "s"} — no store visit planned.</p>
                </div>
              </div>
            ) : (
              <TravelStoreSchedule
                stores={plannedStores}
                blankDays={Array.isArray(row.day_reasons) ? row.day_reasons : []}
                rich
                highlightVisit
                visitRate={visitRate}
                visitReason={row.reason_to_travel || "Store Visit"}
                planRemarks={row.remarks || ""}
                onRemarks={() => openRemarks(row)}
                onHistory={() => openHistory(row)}
                onDelete={() => setDeleteId(row.id)}
                canDeleteAction={canDelete(permission)}
              />
            )}
          </section>

          <aside className="travel-plan-detail-side">
            <div className="travel-plan-side-stats">
              <div><strong>{plannedCount}</strong><span>Planned stores</span></div>
              <div><strong>{visitRate}%</strong><span>Visit rate</span></div>
            </div>

            {canEdit(permission) && !row.week_off && (
              <div className="travel-plan-actual-editor">
                <div className="travel-plan-actual-label">
                  <span>Actual stores visited</span>
                  <b>{selectedActual.length}/{plannedCount}</b>
                </div>

                {availableActualStores.length > 0 ? (
                  <select
                    multiple
                    value={selectedActual.map(String)}
                    onChange={(event) =>
                      setSelection(row.id, [...event.target.selectedOptions].map((option) => Number(option.value)))
                    }
                    disabled={savingActual === row.id}
                    aria-label="Select actual visited stores"
                  >
                    {availableActualStores.map((storeItem) => (
                      <option key={storeItem.id} value={storeItem.id}>
                        {storeItem.store_name}{storeItem.store_code ? ` (${storeItem.store_code})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="travel-plan-no-actual">No planned stores</span>
                )}

                <button
                  type="button"
                  className="travel-plan-save-btn"
                  onClick={() => save(row)}
                  disabled={savingActual === row.id}
                >
                  {savingActual === row.id ? <><FaSyncAlt className="sales-spin" /> Saving</> : <><FaSave /> Save actual</>}
                </button>
              </div>
            )}

            <div className="travel-plan-summary-actions">
              <button type="button" onClick={() => openRemarks(row)}><FaCommentAlt />{row.remarks ? "Remarks" : "Add remarks"}</button>
              <button type="button" onClick={() => openHistory(row)}><FaHistory />History</button>
              {canDelete(permission) && (
                <button type="button" className="danger" onClick={() => setDeleteId(row.id)}><FaTrash />Delete</button>
              )}
            </div>
          </aside>
        </div>
      </article>
    );
  };
  /* =======================================================
     PERMISSION
  ======================================================= */

  if (!canView(permission)) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="sales-page sales-standard-page pp-premium">

      {/* =================================================
          PREMIUM HERO + KPIs
      ================================================= */}

      <PremiumHero
        icon={FaPlaneDeparture}
        eyebrow="Sales Team · Travel"
        title="Travel Plan"
        badge="Approved plans"
        badgeTone="mint"
        subtitle="Work only with approved plans. Track actual stores, visit rate, remarks and travel history."
        meta={[
          { label: "Approved plans", value: formatCount(total) },
          { label: "This page", value: rows.length ? formatCount(rows.length) : null }
        ]}
      />

      <InsightStrip
        loading={loading}
        items={[
          { key: "total", label: "Approved plans", value: formatCount(total), hint: "Matching the filters", tone: "violet", icon: FaPlaneDeparture },
          { key: "people", label: "Travellers", value: formatCount(new Set(rows.map((r) => r.name).filter(Boolean)).size), hint: "On this page", tone: "blue", icon: FaUsers },
          { key: "cities", label: "Cities", value: formatCount(new Set(rows.map((r) => r.city).filter(Boolean)).size), hint: "On this page", tone: "green", icon: FaMapMarkerAlt },
          { key: "weekoff", label: "Week offs", value: formatCount(rows.filter((r) => r.week_off).length), hint: "On this page", tone: "amber", icon: FaBed }
        ]}
      />

      {/* =================================================
          TOOLBAR
      ================================================= */}

      <PageToolbar
        search={search}
        setSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        placeholder="Search name, city, planned store..."
        showExport
        onExport={exportCsv}
      >
        <button
          type="button"
          className="toolbar-btn refresh-toolbar-btn"
          onClick={() =>
            load(true)
          }
          disabled={
            loading ||
            refreshing
          }
        >
          <FaSyncAlt
            className={
              refreshing
                ? "sales-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </PageToolbar>

      {/* =================================================
          FILTERS
      ================================================= */}

      <FilterBar
        onClear={
          clearFilters
        }
      >
        <label className="sales-global-filter">
          <span>
            From
          </span>

          <input
            type="date"
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(
                event.target
                  .value
              );
            }}
          />
        </label>

        <label className="sales-global-filter">
          <span>
            To
          </span>

          <input
            type="date"
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(
                event.target
                  .value
              );
            }}
          />
        </label>

        <label className="sales-global-filter">
          <span>
            Name
          </span>

          <input
            placeholder="Filter by name..."
            value={name}
            onChange={(event) => {
              setPage(1);
              setName(
                event.target
                  .value
              );
            }}
          />
        </label>

        <label className="sales-global-filter">
          <span>
            Department
          </span>

          <select
            value={department}
            onChange={(event) => {
              setPage(1);
              setDepartment(
                event.target
                  .value
              );
            }}
          >
            <option value="">
              All departments
            </option>

            {departments.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </label>

        <label className="sales-global-filter">
          <span>
            Store
          </span>

          <input
            placeholder="Planned store..."
            value={store}
            onChange={(event) => {
              setPage(1);
              setStore(
                event.target
                  .value
              );
            }}
          />
        </label>
      </FilterBar>

      {/* =================================================
          PREMIUM APPROVED TRAVEL PLAN BOARD
      ================================================= */}

      <Card
        title="Approved Travel Plans"
        subtitle={`${total} approved plan${total === 1 ? "" : "s"} found`}
        noPadding
      >
        {loading ? (
          <div className="sales-loading-state travel-plan-loading">
            <PremiumLoader compact title="Loading approved travel plans" />
          </div>
        ) : rows.length === 0 ? (
          <div className="sales-empty-panel travel-plan-empty">
            <FaPlaneDeparture />
            <h3>No Approved Travel Plans</h3>
            <p>Approved plans will appear here for actual-store tracking.</p>
          </div>
        ) : (
          <div className="travel-plan-master-detail">
            <aside className="travel-plan-master-list">
              <div className="travel-plan-master-search">
                <input
                  type="search"
                  value={planListSearch}
                  onChange={(event) => setPlanListSearch(event.target.value)}
                  placeholder="Search plan, name, city or date..."
                  aria-label="Search approved travel plans"
                />
              </div>
              <div className="travel-plan-master-items">
                {planListRows.map(renderPlanListItem)}
                {!planListRows.length && (
                  <div className="travel-plan-master-empty">No matching plans.</div>
                )}
              </div>
            </aside>

            <section className="travel-plan-master-detail-panel">
              {renderApprovedPlanDetail(selectedPlan)}
            </section>
          </div>
        )}

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

      {/* =================================================
          REMARKS / HISTORY MODAL
      ================================================= */}

      {remarksRow && (
        <div
          className="sales-modal-backdrop"
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRemarks();
            }
          }}
        >
          <div className="sales-form-modal remarks-modal">

            {/* ===========================================
                MODAL HEADER
            =========================================== */}

            <div className="sales-modal-header">
              <div>
                <h2>
                  {history.length
                    ? "Travel History & Remarks"
                    : "Travel Remarks"}
                </h2>

                <p>
                  {remarksRow.name}
                  {" · "}
                  {formatDate(
                    remarksRow.visit_date
                  )}
                </p>
              </div>

              <button
                type="button"
                className="sales-modal-close"
                onClick={
                  closeRemarks
                }
                disabled={
                  savingRemark
                }
              >
                <FaTimes />
              </button>
            </div>

            {/* ===========================================
                HISTORY
            =========================================== */}

            {loadingHistory ? (
              <div className="sales-loading-state"><PremiumLoader compact title="Loading travel history" /></div>
            ) : history.length >
              0 ? (
              <div className="history-list">
                {history.map(
                  (item) => (
                    <div
                      className="history-item"
                      key={
                        item.id
                      }
                    >
                      <div>
                        <strong>
                          {item.user_name ||
                            "User"}
                        </strong>

                        <small>
                          {item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleString()
                            : "—"}
                        </small>
                      </div>

                      <p>
                        {item.remark ||
                          "No remark"}
                      </p>

                      {item.attachments && (
                        <a
                          href={
                            item.attachments
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FaDownload />
                          View attachment
                        </a>
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="sales-modal-empty">
                <FaHistory />
                <span>
                  No travel history yet.
                </span>
              </div>
            )}

            {/* ===========================================
                REMARK
            =========================================== */}

            <label className="sales-field sales-field-full">
              <span>
                Add Remark
              </span>

              <textarea
                value={
                  remarkDraft
                }
                onChange={(
                  event
                ) =>
                  setRemarkDraft(
                    event.target
                      .value
                  )
                }
                placeholder="Enter remarks..."
                rows={4}
                disabled={
                  savingRemark
                }
              />
            </label>

            {/* ===========================================
                ATTACHMENT
            =========================================== */}

            <label className="sales-field sales-field-full">
              <span>
                Attachment
              </span>

              <input
                ref={
                  attachmentRef
                }
                type="file"
                onChange={(
                  event
                ) =>
                  setAttachment(
                    event.target
                      .files?.[0] ||
                      null
                  )
                }
                disabled={
                  savingRemark
                }
              />

              {attachment && (
                <small className="sales-field-help">
                  Selected:{" "}
                  {attachment.name}
                </small>
              )}
            </label>

            {/* ===========================================
                MODAL ACTIONS
            =========================================== */}

            <div className="sales-modal-actions">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={
                  closeRemarks
                }
                disabled={
                  savingRemark
                }
              >
                Close
              </button>

              {canEdit(
                permission
              ) && (
                <button
                  type="button"
                  className="modal-primary-btn"
                  onClick={
                    saveRemark
                  }
                  disabled={
                    savingRemark ||
                    (
                      !remarkDraft.trim() &&
                      !attachment
                    )
                  }
                >
                  {savingRemark ? (
                    <>
                      <FaSyncAlt className="sales-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave />
                      Save Remark
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          DELETE CONFIRMATION
      ================================================= */}

      <ConfirmDialog
        open={Boolean(
          deleteId
        )}
        title="Delete Travel Plan"
        message="Are you sure you want to delete this approved travel plan? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={
          confirmDelete
        }
        onCancel={() =>
          setDeleteId(null)
        }
      />
    </div>
  );
}

export default TravelPlan;
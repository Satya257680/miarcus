import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useParams,
  useNavigate
} from "react-router-dom";

import {
  FaArrowLeft,
  FaHistory,
  FaPlus,
  FaEdit,
  FaBan,
  FaSyncAlt,
  FaSearch,
  FaFilter,
  FaClock,
  FaUser,
  FaDatabase,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaCalendarAlt
} from "react-icons/fa";

import {
  getBillingAudit
} from "../../services/billingService";

import "../../styles/Billing.css";

/* ======================================================
   HELPERS
====================================================== */

const normalizeLogs = (response) => {
  const data =
    response?.data?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

/* ======================================================
   ACTION
====================================================== */

const getAction = (
  action = ""
) => {
  return String(action)
    .trim()
    .toUpperCase();
};

/* ======================================================
   ACTION CONFIG
====================================================== */

const getActionConfig = (
  action
) => {
  switch (
    getAction(action)
  ) {
    case "CREATE":
      return {
        label: "Created",
        icon: FaPlus,
        className: "audit-create",
        description:
          "This billing record was created."
      };

    case "UPDATE":
      return {
        label: "Updated",
        icon: FaEdit,
        className: "audit-update",
        description:
          "This billing record was modified."
      };

    case "CANCEL":
    case "CANCELLED":
      return {
        label: "Cancelled",
        icon: FaBan,
        className: "audit-cancel",
        description:
          "This billing record was cancelled."
      };

    case "DELETE":
      return {
        label: "Deleted",
        icon: FaBan,
        className: "audit-delete",
        description:
          "This billing record was deleted."
      };

    default:
      return {
        label:
          action || "Activity",
        icon: FaHistory,
        className: "audit-default",
        description:
          "A billing activity was recorded."
      };
  }
};

/* ======================================================
   DATE FORMAT
====================================================== */

const formatDateTime = (
  value
) => {
  if (!value) {
    return {
      date: "Unknown date",
      time: "",
      full: "Unknown date"
    };
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      date: "Unknown date",
      time: "",
      full: "Unknown date"
    };
  }

  const dateText =
    date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );

  const timeText =
    date.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }
    );

  return {
    date: dateText,
    time: timeText,
    full:
      `${dateText} ${timeText}`
  };
};

/* ======================================================
   LOG DATE
====================================================== */

const getLogDate = (
  log
) => {
  return (
    log?.created_at ||
    log?.changed_at ||
    log?.updated_at ||
    log?.timestamp ||
    null
  );
};

/* ======================================================
   CHANGED BY
====================================================== */

const getChangedBy = (
  log
) => {
  return (
    log?.changed_by_name ||
    log?.changed_by ||
    log?.updated_by_name ||
    log?.updated_by ||
    log?.created_by_name ||
    log?.created_by ||
    "System"
  );
};

/* ======================================================
   EMAIL
====================================================== */

const getChangedByEmail = (
  log
) => {
  return (
    log?.changed_by_email ||
    log?.email ||
    ""
  );
};

/* ======================================================
   FORMAT AUDIT VALUE
====================================================== */

const formatAuditValue = (
  value
) => {

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "-"
  ) {
    return "-";
  }

  if (
    typeof value === "object"
  ) {
    try {
      return JSON.stringify(
        value,
        null,
        2
      );
    } catch {
      return String(value);
    }
  }

  if (
    typeof value === "string"
  ) {

    const trimmed =
      value.trim();

    if (!trimmed) {
      return "-";
    }

    try {

      const parsed =
        JSON.parse(
          trimmed
        );

      if (
        typeof parsed ===
          "object" &&
        parsed !== null
      ) {
        return JSON.stringify(
          parsed,
          null,
          2
        );
      }

    } catch {
      // Normal text.
    }

    return value;
  }

  return String(value);
};

/* ======================================================
   SEARCH TEXT
====================================================== */

const getLogSearchText = (
  log
) => {

  return [
    log?.action,
    getChangedBy(log),
    getChangedByEmail(log),
    log?.module_name,
    log?.reference_id,
    log?.record_id,
    log?.old_data,
    log?.new_data
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== undefined
    )
    .join(" ")
    .toLowerCase();
};

/* ======================================================
   AUDIT VALUE
====================================================== */

function AuditValue({
  value,
  type
}) {

  const [
    expanded,
    setExpanded
  ] = useState(false);

  const formatted =
    formatAuditValue(value);

  const isLong =
    formatted.length > 250;

  return (
    <div
      className={
        `audit-value audit-value-${type}`
      }
    >

      <div
        className="audit-value-header"
      >

        <span>
          {type === "old"
            ? "Previous Value"
            : "New Value"}
        </span>

        {type === "old" ? (
          <FaTimesCircle />
        ) : (
          <FaCheckCircle />
        )}

      </div>

      <div
        className={
          `audit-value-content ${
            !expanded && isLong
              ? "audit-value-collapsed"
              : ""
          }`
        }
      >
        <pre>
          {formatted}
        </pre>
      </div>

      {isLong && (
        <button
          type="button"
          className="audit-expand-btn"
          onClick={() =>
            setExpanded(
              (current) =>
                !current
            )
          }
        >
          {expanded ? (
            <>
              <FaChevronUp />
              Show Less
            </>
          ) : (
            <>
              <FaChevronDown />
              Show More
            </>
          )}
        </button>
      )}

    </div>
  );
}

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function BillingAudit() {

  const {
    id
  } = useParams();

  const navigate =
    useNavigate();

  /* ====================================================
     STATE
  ==================================================== */

  const [
    logs,
    setLogs
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    actionFilter,
    setActionFilter
  ] = useState("ALL");

  /* ====================================================
     LOAD AUDIT
  ==================================================== */

  const loadAuditLogs =
    useCallback(
      async (
        showRefresh = false
      ) => {

        if (!id) {

          setLogs([]);

          setLoading(false);

          setError(
            "Bill ID is missing."
          );

          return;
        }

        try {

          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await getBillingAudit(
              id
            );

          const normalizedLogs =
            normalizeLogs(
              response
            );

          const sortedLogs =
            [...normalizedLogs]
              .sort(
                (a, b) => {

                  const first =
                    new Date(
                      getLogDate(a) || 0
                    ).getTime();

                  const second =
                    new Date(
                      getLogDate(b) || 0
                    ).getTime();

                  return (
                    second - first
                  );
                }
              );

          setLogs(
            sortedLogs
          );

        } catch (err) {

          console.error(
            "Billing audit loading error:",
            err
          );

          setLogs([]);

          setError(
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Unable to load billing audit history."
          );

        } finally {

          setLoading(false);

          setRefreshing(false);
        }
      },
      [id]
    );

  /* ====================================================
     INITIAL LOAD
  ==================================================== */

  useEffect(() => {

    loadAuditLogs();

  }, [
    loadAuditLogs
  ]);

  /* ====================================================
     ACTION COUNTS
  ==================================================== */

  const actionCounts =
    useMemo(() => {

      return logs.reduce(
        (result, log) => {

          const action =
            getAction(
              log?.action
            );

          if (
            action ===
            "CREATE"
          ) {

            result.create += 1;

          } else if (
            action ===
            "UPDATE"
          ) {

            result.update += 1;

          } else if (
            action === "CANCEL" ||
            action === "CANCELLED"
          ) {

            result.cancel += 1;

          } else if (
            action ===
            "DELETE"
          ) {

            result.delete += 1;
          }

          return result;

        },
        {
          create: 0,
          update: 0,
          cancel: 0,
          delete: 0
        }
      );

    }, [logs]);

  /* ====================================================
     FILTERED LOGS
  ==================================================== */

  const filteredLogs =
    useMemo(() => {

      const keyword =
        search
          .trim()
          .toLowerCase();

      return logs.filter(
        (log) => {

          const action =
            getAction(
              log?.action
            );

          const matchesAction =
            actionFilter ===
              "ALL" ||
            (
              actionFilter ===
                "CANCEL" &&
              (
                action ===
                  "CANCEL" ||
                action ===
                  "CANCELLED"
              )
            ) ||
            action ===
              actionFilter;

          const matchesSearch =
            !keyword ||
            getLogSearchText(
              log
            ).includes(
              keyword
            );

          return (
            matchesAction &&
            matchesSearch
          );
        }
      );

    }, [
      logs,
      search,
      actionFilter
    ]);

  /* ====================================================
     LAST ACTIVITY
  ==================================================== */

  const lastActivity =
    useMemo(() => {

      if (!logs.length) {
        return null;
      }

      return getLogDate(
        logs[0]
      );

    }, [logs]);

  const lastActivityFormatted =
    formatDateTime(
      lastActivity
    );

  /* ====================================================
     FIRST ACTIVITY
  ==================================================== */

  const firstActivity =
    useMemo(() => {

      if (!logs.length) {
        return null;
      }

      return getLogDate(
        logs[logs.length - 1]
      );

    }, [logs]);

  const firstActivityFormatted =
    formatDateTime(
      firstActivity
    );

  /* ====================================================
     CLEAR FILTERS
  ==================================================== */

  const clearFilters =
    () => {

      setSearch("");

      setActionFilter(
        "ALL"
      );
    };

  /* ====================================================
     RENDER
  ==================================================== */

  return (

    <div
      className="billing-page billing-audit-page"
    >

      {/* ==================================================
          HEADER
      ================================================== */}

      <div
        className="billing-header billing-audit-header"
      >

        <div
          className="billing-header-left"
        >

          <button
            type="button"
            className="billing-back-btn"
            onClick={() =>
              navigate(-1)
            }
            title="Go back"
          >
            <FaArrowLeft />
          </button>

          <div>

            <div
              className="billing-title-row"
            >

              <span
                className="billing-title-icon"
              >
                <FaHistory />
              </span>

              <h1>
                Billing Audit History
              </h1>

            </div>

            <p>
              Complete activity history
              for billing record{" "}
              <strong>
                #{id}
              </strong>
            </p>

          </div>

        </div>

        <div
          className="billing-header-actions"
        >

          <button
            type="button"
            className="billing-secondary-btn"
            onClick={() =>
              loadAuditLogs(true)
            }
            disabled={
              loading ||
              refreshing
            }
          >

            <FaSyncAlt
              className={
                refreshing
                  ? "billing-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

        </div>

      </div>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (

        <div
          className="billing-alert billing-alert-error"
        >

          <FaExclamationTriangle />

          <div>

            <strong>
              Unable to load audit history
            </strong>

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              loadAuditLogs()
            }
          >
            Try Again
          </button>

        </div>
      )}

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <div
        className="billing-audit-summary"
      >

        {/* Total */}

        <div
          className="billing-summary-card"
        >

          <div
            className="billing-summary-icon"
          >
            <FaDatabase />
          </div>

          <div>
            <span>
              Total Activities
            </span>

            <strong>
              {logs.length}
            </strong>
          </div>

        </div>

        {/* Created */}

        <div
          className="billing-summary-card"
        >

          <div
            className="billing-summary-icon audit-summary-create"
          >
            <FaPlus />
          </div>

          <div>
            <span>
              Created
            </span>

            <strong>
              {actionCounts.create}
            </strong>
          </div>

        </div>

        {/* Updated */}

        <div
          className="billing-summary-card"
        >

          <div
            className="billing-summary-icon audit-summary-update"
          >
            <FaEdit />
          </div>

          <div>
            <span>
              Updated
            </span>

            <strong>
              {actionCounts.update}
            </strong>
          </div>

        </div>

        {/* Cancelled */}

        <div
          className="billing-summary-card"
        >

          <div
            className="billing-summary-icon audit-summary-cancel"
          >
            <FaBan />
          </div>

          <div>
            <span>
              Cancelled
            </span>

            <strong>
              {actionCounts.cancel}
            </strong>
          </div>

        </div>

        {/* Last Activity */}

        <div
          className="billing-summary-card billing-summary-last"
        >

          <div
            className="billing-summary-icon"
          >
            <FaClock />
          </div>

          <div>

            <span>
              Last Activity
            </span>

            <strong>
              {lastActivity
                ? `${lastActivityFormatted.date} ${lastActivityFormatted.time}`
                : "No activity"}
            </strong>

          </div>

        </div>

      </div>

      {/* ==================================================
          ACTIVITY PERIOD
      ================================================== */}

      {!loading &&
        logs.length > 0 && (

          <div
            className="billing-audit-period"
          >

            <div>
              <FaCalendarAlt />

              <span>
                Activity Period
              </span>

              <strong>
                {firstActivity
                  ? firstActivityFormatted.full
                  : "-"}
              </strong>
            </div>

            <span className="billing-audit-period-arrow">
              →
            </span>

            <div>
              <FaClock />

              <strong>
                {lastActivity
                  ? lastActivityFormatted.full
                  : "-"}
              </strong>
            </div>

          </div>
        )}

      {/* ==================================================
          FILTER BAR
      ================================================== */}

      <div
        className="billing-card billing-audit-filter-card"
      >

        <div
          className="billing-audit-filter-title"
        >

          <div>

            <FaFilter />

            <strong>
              Audit Activity
            </strong>

          </div>

          <span>
            Showing{" "}
            {filteredLogs.length}
            {" "}
            of{" "}
            {logs.length}
          </span>

        </div>

        <div
          className="billing-audit-filters"
        >

          {/* Search */}

          <div
            className="billing-search-box"
          >

            <FaSearch />

            <input
              type="text"
              placeholder="Search activity, user or changes..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (

              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                title="Clear search"
              >
                ×
              </button>

            )}

          </div>

          {/* Filter */}

          <div
            className="billing-filter-select"
          >

            <FaFilter />

            <select
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                All Activities
              </option>

              <option value="CREATE">
                Created
              </option>

              <option value="UPDATE">
                Updated
              </option>

              <option value="CANCEL">
                Cancelled
              </option>

              <option value="DELETE">
                Deleted
              </option>

            </select>

          </div>

          {(search ||
            actionFilter !==
              "ALL") && (

            <button
              type="button"
              className="billing-clear-filter-btn"
              onClick={
                clearFilters
              }
            >
              Clear Filters
            </button>

          )}

        </div>

      </div>

      {/* ==================================================
          LOADING
      ================================================== */}

      {loading ? (

        <div
          className="billing-card billing-loading-card"
        >

          <div
            className="billing-loader"
          />

          <h3>
            Loading audit history...
          </h3>

          <p>
            Fetching the latest activity
            records for this bill.
          </p>

        </div>

      ) : filteredLogs.length ===
        0 ? (

        /* ==================================================
           EMPTY STATE
        ================================================== */

        <div
          className="billing-card billing-empty-card"
        >

          {logs.length === 0 ? (

            <>

              <div
                className="billing-empty-icon"
              >
                <FaHistory />
              </div>

              <h3>
                No audit history yet
              </h3>

              <p>
                Important changes to this
                billing record will appear
                here automatically.
              </p>

            </>

          ) : (

            <>

              <div
                className="billing-empty-icon"
              >
                <FaSearch />
              </div>

              <h3>
                No matching activity
              </h3>

              <p>
                Try changing your search
                text or activity filter.
              </p>

              <button
                type="button"
                className="billing-secondary-btn"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>

            </>

          )}

        </div>

      ) : (

        /* ==================================================
           TIMELINE
        ================================================== */

        <div
          className="billing-card billing-audit-card"
        >

          <div
            className="billing-audit-timeline"
          >

            {filteredLogs.map(
              (log, index) => {

                const config =
                  getActionConfig(
                    log?.action
                  );

                const ActionIcon =
                  config.icon;

                const formattedDate =
                  formatDateTime(
                    getLogDate(
                      log
                    )
                  );

                const isLast =
                  index ===
                  filteredLogs.length -
                    1;

                const changedBy =
                  getChangedBy(
                    log
                  );

                const changedByEmail =
                  getChangedByEmail(
                    log
                  );

                return (

                  <div
                    className={
                      `billing-audit-item ${config.className}`
                    }
                    key={
                      log?.id ||
                      `${log?.action}-${getLogDate(
                        log
                      )}-${index}`
                    }
                  >

                    {/* ==================================================
                       TIMELINE
                    ================================================== */}

                    <div
                      className="billing-audit-line-area"
                    >

                      <div
                        className="billing-audit-dot"
                        title={
                          config.label
                        }
                      >
                        <ActionIcon />
                      </div>

                      {!isLast && (
                        <div
                          className="billing-audit-line"
                        />
                      )}

                    </div>

                    {/* ==================================================
                       CONTENT
                    ================================================== */}

                    <div
                      className="billing-audit-content"
                    >

                      {/* TOP */}

                      <div
                        className="billing-audit-top"
                      >

                        <div
                          className="billing-audit-action"
                        >

                          <span
                            className="billing-audit-action-badge"
                          >
                            <ActionIcon />
                            {config.label}
                          </span>

                          {log?.module_name && (

                            <span
                              className="billing-audit-module"
                            >
                              {log.module_name}
                            </span>

                          )}

                        </div>

                        <div
                          className="billing-audit-time"
                        >

                          <FaClock />

                          <span>
                            {formattedDate.date}
                            <br />
                            {formattedDate.time}
                          </span>

                        </div>

                      </div>

                      {/* DESCRIPTION */}

                      <div
                        className="billing-audit-description"
                      >
                        <FaEye />

                        <span>
                          {config.description}
                        </span>
                      </div>

                      {/* USER */}

                      <div
                        className="billing-audit-user"
                      >

                        <span
                          className="billing-audit-user-icon"
                        >
                          <FaUser />
                        </span>

                        <div>

                          <span>
                            Changed by
                          </span>

                          <strong>
                            {changedBy}
                          </strong>

                          {changedByEmail && (
                            <small>
                              {changedByEmail}
                            </small>
                          )}

                        </div>

                      </div>

                      {/* CHANGES */}

                      {(log?.old_data ||
                        log?.new_data) && (

                        <div
                          className="billing-audit-changes"
                        >

                          {log?.old_data && (

                            <AuditValue
                              value={
                                log.old_data
                              }
                              type="old"
                            />

                          )}

                          {log?.new_data && (

                            <AuditValue
                              value={
                                log.new_data
                              }
                              type="new"
                            />

                          )}

                        </div>

                      )}

                      {/* REFERENCE */}

                      {(log?.reference_id ||
                        log?.record_id) && (

                        <div
                          className="billing-audit-reference"
                        >

                          <FaDatabase />

                          <span>
                            Reference ID:
                          </span>

                          <strong>
                            {log.reference_id ||
                              log.record_id}
                          </strong>

                        </div>

                      )}

                    </div>

                  </div>

                );
              }
            )}

          </div>

        </div>
      )}

      {/* ==================================================
          FOOTER
      ================================================== */}

      {!loading &&
        logs.length > 0 && (

          <div
            className="billing-audit-footer"
          >

            <FaCheckCircle />

            <span>
              Audit history is automatically
              recorded for important billing
              activities.
            </span>

          </div>

        )}

    </div>
  );
}
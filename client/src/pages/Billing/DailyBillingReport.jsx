import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCalendarAlt,
  FaStore,
  FaSyncAlt,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaPercentage,
  FaChartLine,
  FaCreditCard,
  FaUniversity,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPrint,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowUp,
  FaReceipt,
} from "react-icons/fa";

import {
  getDailyReport,
  getStores,
} from "../../services/billingService";

import "../../styles/Billing.css";

/* ======================================================
   CONSTANTS
====================================================== */

const ROWS_PER_PAGE = 10;

/* ======================================================
   CURRENCY
====================================================== */

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/* ======================================================
   DATE
====================================================== */

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ======================================================
   TIME
====================================================== */

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* ======================================================
   DATE FOR INPUT
====================================================== */

const getToday = () => {
  const now = new Date();

  const offset =
    now.getTimezoneOffset();

  const localDate = new Date(
    now.getTime() -
      offset * 60 * 1000
  );

  return localDate
    .toISOString()
    .slice(0, 10);
};

/* ======================================================
   REPORT RESPONSE
====================================================== */

const getReportData = (
  response
) => {
  const data =
    response?.data?.data;

  if (
    data &&
    typeof data === "object"
  ) {
    return {
      summary:
        data.summary || {},

      details:
        Array.isArray(
          data.details
        )
          ? data.details
          : [],
    };
  }

  return {
    summary: {},
    details: [],
  };
};

/* ======================================================
   STORE RESPONSE
====================================================== */

const getStoreData = (
  response
) => {
  const data =
    response?.data?.data;

  if (
    Array.isArray(data)
  ) {
    return data;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  return [];
};

/* ======================================================
   STATUS
====================================================== */

const normalizeStatus = (
  status
) => {
  return String(
    status || "UNKNOWN"
  )
    .trim()
    .toUpperCase();
};

/* ======================================================
   STATUS CONFIG
====================================================== */

const getStatusConfig = (
  status
) => {

  switch (
    normalizeStatus(status)
  ) {

    case "PAID":
      return {
        label: "Paid",
        className: "paid",
        icon: FaCheckCircle,
      };

    case "PENDING":
      return {
        label: "Pending",
        className: "pending",
        icon: FaArrowUp,
      };

    case "CANCELLED":
    case "CANCELED":
      return {
        label: "Cancelled",
        className: "cancelled",
        icon: FaTimesCircle,
      };

    default:
      return {
        label:
          status || "Unknown",
        className: "unknown",
        icon: FaReceipt,
      };
  }
};

/* ======================================================
   PAYMENT ICON
====================================================== */

const getPaymentIcon = (
  paymentType
) => {

  const type =
    String(
      paymentType || ""
    ).toLowerCase();

  if (
    type.includes("cash")
  ) {
    return FaMoneyBillWave;
  }

  if (
    type.includes("bank")
  ) {
    return FaUniversity;
  }

  return FaCreditCard;
};

/* ======================================================
   CSV VALUE
====================================================== */

const csvValue = (
  value
) => {

  const text =
    String(
      value ?? ""
    ).replace(
      /"/g,
      '""'
    );

  return `"${text}"`;
};

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function DailyBillingReport() {

  /* ====================================================
     STATE
  ==================================================== */

  const [
    date,
    setDate
  ] = useState(
    getToday()
  );

  const [
    store,
    setStore
  ] = useState("");

  const [
    stores,
    setStores
  ] = useState([]);

  const [
    report,
    setReport
  ] = useState({
    summary: {},
    details: [],
  });

  const [
    search,
    setSearch
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState("ALL");

  const [
    paymentFilter,
    setPaymentFilter
  ] = useState("ALL");

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    storesLoading,
    setStoresLoading
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
    page,
    setPage
  ] = useState(1);

  /* ====================================================
     LOAD STORES
  ==================================================== */

  useEffect(() => {

    let mounted = true;

    const loadStores =
      async () => {

        try {

          setStoresLoading(
            true
          );

          const response =
            await getStores();

          if (!mounted) {
            return;
          }

          setStores(
            getStoreData(
              response
            )
          );

        } catch (err) {

          console.error(
            "Billing stores loading error:",
            err
          );

          if (mounted) {
            setStores([]);
          }

        } finally {

          if (mounted) {
            setStoresLoading(
              false
            );
          }
        }
      };

    loadStores();

    return () => {
      mounted = false;
    };

  }, []);

  /* ====================================================
     LOAD REPORT
  ==================================================== */

  const loadReport =
    useCallback(
      async (
        showRefresh = false
      ) => {

        if (!date) {
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
            await getDailyReport({
              date,
              store_id:
                store || undefined,
            });

          setReport(
            getReportData(
              response
            )
          );

          setPage(1);

        } catch (err) {

          console.error(
            "Daily billing report error:",
            err
          );

          setReport({
            summary: {},
            details: [],
          });

          setError(
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Unable to load the daily billing report."
          );

        } finally {

          setLoading(false);

          setRefreshing(false);
        }
      },
      [date, store]
    );

  /* ====================================================
     AUTO LOAD
  ==================================================== */

  useEffect(() => {

    loadReport();

  }, [
    loadReport
  ]);

  /* ====================================================
     SUMMARY
  ==================================================== */

  const summary =
    report.summary || {};

  const totalBills =
    Number(
      summary.total_bills || 0
    );

  const grossSales =
    Number(
      summary.subtotal || 0
    );

  const discount =
    Number(
      summary.discount || 0
    );

  const tax =
    Number(
      summary.tax ||
        summary.tax_amount ||
        0
    );

  const netTotal =
    Number(
      summary.grand_total || 0
    );

  const cash =
    Number(
      summary.cash || 0
    );

  const upi =
    Number(
      summary.upi || 0
    );

  const card =
    Number(
      summary.card || 0
    );

  const bankTransfer =
    Number(
      summary.bank_transfer || 0
    );

  const otherPayment =
    Number(
      summary.other ||
        summary.other_payment ||
        0
    );

  /* ====================================================
     PAYMENT TOTAL
  ==================================================== */

  const paymentTotal =
    cash +
    upi +
    card +
    bankTransfer +
    otherPayment;

  /* ====================================================
     PAYMENT BREAKDOWN
  ==================================================== */

  const paymentBreakdown =
    useMemo(
      () => [
        {
          key: "cash",
          label: "Cash",
          value: cash,
          icon: FaMoneyBillWave,
        },
        {
          key: "upi",
          label: "UPI",
          value: upi,
          icon: FaCreditCard,
        },
        {
          key: "card",
          label: "Card",
          value: card,
          icon: FaCreditCard,
        },
        {
          key: "bank",
          label: "Bank Transfer",
          value: bankTransfer,
          icon: FaUniversity,
        },
        {
          key: "other",
          label: "Other",
          value: otherPayment,
          icon: FaMoneyBillWave,
        },
      ],
      [
        cash,
        upi,
        card,
        bankTransfer,
        otherPayment,
      ]
    );

  /* ====================================================
     PAYMENT TYPES
  ==================================================== */

  const paymentTypes =
    useMemo(() => {

      const values =
        (report.details || [])
          .map(
            (bill) =>
              bill?.payment_type
          )
          .filter(Boolean)
          .map(
            (value) =>
              String(value)
                .trim()
                .toUpperCase()
          );

      return [
        ...new Set(values),
      ].sort();

    }, [
      report.details
    ]);

  /* ====================================================
     FILTER DETAILS
  ==================================================== */

  const filteredDetails =
    useMemo(() => {

      const keyword =
        search
          .trim()
          .toLowerCase();

      return (
        report.details || []
      ).filter(
        (bill) => {

          const status =
            normalizeStatus(
              bill?.status
            );

          const payment =
            String(
              bill?.payment_type ||
                ""
            )
              .trim()
              .toUpperCase();

          const matchesSearch =
            !keyword ||
            [
              bill?.bill_no,
              bill?.store_name,
              bill?.customer_name,
              bill?.payment_type,
              bill?.created_by_name,
              bill?.updated_by_name,
              bill?.transaction_reference,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(
                keyword
              );

          const matchesStatus =
            statusFilter ===
              "ALL" ||
            status ===
              statusFilter;

          const matchesPayment =
            paymentFilter ===
              "ALL" ||
            payment ===
              paymentFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPayment
          );
        }
      );

    }, [
      report.details,
      search,
      statusFilter,
      paymentFilter,
    ]);

  /* ====================================================
     FILTERED TOTAL
  ==================================================== */

  const filteredAmount =
    useMemo(
      () =>
        filteredDetails.reduce(
          (
            total,
            bill
          ) =>
            total +
            Number(
              bill?.grand_total ||
                0
            ),
          0
        ),
      [
        filteredDetails
      ]
    );

  /* ====================================================
     PAGINATION
  ==================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredDetails.length /
          ROWS_PER_PAGE
      )
    );

  const safePage =
    Math.min(
      page,
      totalPages
    );

  const paginatedDetails =
    useMemo(() => {

      const start =
        (safePage - 1) *
        ROWS_PER_PAGE;

      return filteredDetails.slice(
        start,
        start +
          ROWS_PER_PAGE
      );

    }, [
      filteredDetails,
      safePage,
    ]);

  useEffect(() => {

    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }

  }, [
    page,
    totalPages,
  ]);

  /* ====================================================
     PRINT
  ==================================================== */

  const handlePrint =
    () => {

      window.print();
    };

  /* ====================================================
     CSV EXPORT
  ==================================================== */

  const handleExportCSV =
    () => {

      if (
        !filteredDetails.length
      ) {
        return;
      }

      const headers = [
        "Bill No",
        "Date",
        "Time",
        "Store",
        "Customer",
        "Payment Type",
        "Transaction Reference",
        "Amount",
        "Created By",
        "Updated By",
        "Status",
      ];

      const rows =
        filteredDetails.map(
          (bill) => [
            bill?.bill_no ||
              "",
            formatDate(
              bill?.bill_date ||
                bill?.created_at
            ),
            formatTime(
              bill?.bill_date ||
                bill?.created_at
            ),
            bill?.store_name ||
              "",
            bill?.customer_name ||
              "",
            bill?.payment_type ||
              "",
            bill?.transaction_reference ||
              "",
            Number(
              bill?.grand_total ||
                0
            ).toFixed(2),
            bill?.created_by_name ||
              bill?.created_by ||
              "",
            bill?.updated_by_name ||
              bill?.updated_by ||
              "",
            bill?.status ||
              "",
          ]
        );

      const csvContent =
        [
          headers,
          ...rows,
        ]
          .map(
            (row) =>
              row
                .map(
                  csvValue
                )
                .join(",")
          )
          .join("\n");

      const blob =
        new Blob(
          [csvContent],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `billing-report-${date}${
          store
            ? `-store-${store}`
            : ""
        }.csv`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );
    };

  /* ====================================================
     CLEAR FILTERS
  ==================================================== */

  const clearFilters =
    () => {

      setSearch("");

      setStatusFilter(
        "ALL"
      );

      setPaymentFilter(
        "ALL"
      );

      setPage(1);
    };

  const hasFilters =
    Boolean(search) ||
    statusFilter !==
      "ALL" ||
    paymentFilter !==
      "ALL";

  /* ====================================================
     RENDER
  ==================================================== */

  return (

    <div
      className="billing-page billing-report-page"
    >

      {/* ==================================================
          HEADER
      ================================================== */}

      <div
        className="billing-header"
      >

        <div
          className="billing-header-left"
        >

          <div
            className="billing-title-icon"
          >
            <FaChartLine />
          </div>

          <div>

            <h1>
              Daily Billing Report
            </h1>

            <p>
              Transaction-based daily
              sales and payment summary.
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
              loadReport(true)
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

          <button
            type="button"
            className="billing-secondary-btn"
            onClick={
              handlePrint
            }
            disabled={loading}
          >
            <FaPrint />
            Print
          </button>

          <button
            type="button"
            className="billing-primary-btn"
            onClick={
              handleExportCSV
            }
            disabled={
              loading ||
              !filteredDetails.length
            }
          >
            <FaDownload />
            Export CSV
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
              Report Error
            </strong>

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              loadReport()
            }
          >
            Retry
          </button>

        </div>

      )}

      {/* ==================================================
          FILTER CARD
      ================================================== */}

      <div
        className="billing-card billing-report-filter-card"
      >

        <div
          className="billing-report-filter-heading"
        >

          <div>

            <FaFilter />

            <div>

              <strong>
                Report Filters
              </strong>

              <span>
                Select a date and store
                to view transactions.
              </span>

            </div>

          </div>

          <div
            className="billing-report-selected-date"
          >

            <FaCalendarAlt />

            {date
              ? new Date(
                  `${date}T00:00:00`
                ).toLocaleDateString(
                  "en-IN",
                  {
                    weekday:
                      "short",
                    day:
                      "2-digit",
                    month:
                      "short",
                    year:
                      "numeric",
                  }
                )
              : "-"}

          </div>

        </div>

        <div
          className="billing-grid billing-report-filters"
        >

          <label>

            <span>
              <FaCalendarAlt />
              Date
            </span>

            <input
              type="date"
              value={date}
              onChange={(
                event
              ) =>
                setDate(
                  event.target.value
                )
              }
            />

          </label>

          <label>

            <span>
              <FaStore />
              Store
            </span>

            <select
              value={store}
              onChange={(
                event
              ) =>
                setStore(
                  event.target.value
                )
              }
              disabled={
                storesLoading
              }
            >

              <option value="">
                All Stores
              </option>

              {stores.map(
                (item) => (

                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.store_name}
                  </option>

                )
              )}

            </select>

          </label>

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
            Loading daily report...
          </h3>

          <p>
            Fetching billing
            transactions and
            payment summary.
          </p>

        </div>

      ) : (

        <>

          {/* ==================================================
              SUMMARY STATISTICS
          ================================================== */}

          <div
            className="billing-report-stats"
          >

            <div
              className="billing-report-stat-card"
            >

              <div
                className="billing-report-stat-icon"
              >
                <FaFileInvoiceDollar />
              </div>

              <div>

                <span>
                  Total Bills
                </span>

                <strong>
                  {totalBills}
                </strong>

                <small>
                  Transactions
                </small>

              </div>

            </div>

            <div
              className="billing-report-stat-card"
            >

              <div
                className="billing-report-stat-icon"
              >
                <FaChartLine />
              </div>

              <div>

                <span>
                  Gross Sales
                </span>

                <strong>
                  {formatCurrency(
                    grossSales
                  )}
                </strong>

                <small>
                  Before discount
                </small>

              </div>

            </div>

            <div
              className="billing-report-stat-card"
            >

              <div
                className="billing-report-stat-icon"
              >
                <FaPercentage />
              </div>

              <div>

                <span>
                  Discount
                </span>

                <strong>
                  {formatCurrency(
                    discount
                  )}
                </strong>

                <small>
                  Total discount
                </small>

              </div>

            </div>

            <div
              className="billing-report-stat-card billing-report-stat-highlight"
            >

              <div
                className="billing-report-stat-icon"
              >
                <FaCheckCircle />
              </div>

              <div>

                <span>
                  Net Total
                </span>

                <strong>
                  {formatCurrency(
                    netTotal
                  )}
                </strong>

                <small>
                  Final billing amount
                </small>

              </div>

            </div>

          </div>

          {/* ==================================================
              TAX / PAYMENT SUMMARY
          ================================================== */}

          <div
            className="billing-report-tax-card"
          >

            <div>

              <span>
                Total Tax
              </span>

              <strong>
                {formatCurrency(
                  tax
                )}
              </strong>

            </div>

            <div>

              <span>
                Payment Collected
              </span>

              <strong>
                {formatCurrency(
                  paymentTotal
                )}
              </strong>

            </div>

            <div>

              <span>
                Report Date
              </span>

              <strong>
                {formatDate(
                  `${date}T00:00:00`
                )}
              </strong>

            </div>

            <div>

              <span>
                Filtered Amount
              </span>

              <strong>
                {formatCurrency(
                  filteredAmount
                )}
              </strong>

            </div>

          </div>

          {/* ==================================================
              PAYMENT BREAKDOWN
          ================================================== */}

          <div
            className="billing-card"
          >

            <div
              className="billing-section-heading"
            >

              <div>

                <h2>
                  Payment Breakdown
                </h2>

                <p>
                  Total amount collected
                  by payment method.
                </p>

              </div>

              <strong>
                {formatCurrency(
                  paymentTotal
                )}
              </strong>

            </div>

            <div
              className="billing-payment-grid billing-payment-grid-modern"
            >

              {paymentBreakdown.map(
                (payment) => {

                  const Icon =
                    payment.icon;

                  const percentage =
                    paymentTotal > 0
                      ? (
                          (
                            payment.value /
                            paymentTotal
                          ) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  return (

                    <div
                      className="billing-payment-card"
                      key={
                        payment.key
                      }
                    >

                      <div
                        className="billing-payment-card-top"
                      >

                        <div
                          className="billing-payment-icon"
                        >
                          <Icon />
                        </div>

                        <span>
                          {payment.label}
                        </span>

                      </div>

                      <strong>
                        {formatCurrency(
                          payment.value
                        )}
                      </strong>

                      <div
                        className="billing-payment-progress"
                      >

                        <span
                          style={{
                            width:
                              `${percentage}%`,
                          }}
                        />

                      </div>

                      <small>
                        {percentage}%
                        {" "}
                        of total
                      </small>

                    </div>

                  );
                }
              )}

            </div>

          </div>

          {/* ==================================================
              TRANSACTIONS
          ================================================== */}

          <div
            className="billing-card"
          >

            <div
              className="billing-section-heading"
            >

              <div>

                <h2>
                  Transaction Details
                </h2>

                <p>
                  Individual bills recorded
                  for this report.
                </p>

              </div>

              <div
                className="billing-result-count"
              >

                <strong>
                  {
                    filteredDetails.length
                  }
                </strong>

                {" "}
                transactions

              </div>

            </div>

            {/* FILTER TOOLBAR */}

            <div
              className="billing-toolbar billing-report-toolbar"
            >

              <div
                className="billing-search-box"
              >

                <FaSearch />

                <input
                  type="text"
                  placeholder="Search bill, store, customer or user..."
                  value={search}
                  onChange={(
                    event
                  ) => {

                    setSearch(
                      event.target.value
                    );

                    setPage(1);
                  }}
                />

                {search && (

                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    ×
                  </button>

                )}

              </div>

              <div
                className="billing-filter-select"
              >

                <FaFilter />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) => {

                    setStatusFilter(
                      event.target.value
                    );

                    setPage(1);
                  }}
                >

                  <option value="ALL">
                    All Status
                  </option>

                  <option value="PAID">
                    Paid
                  </option>

                  <option value="PENDING">
                    Pending
                  </option>

                  <option value="CANCELLED">
                    Cancelled
                  </option>

                </select>

              </div>

              <div
                className="billing-filter-select"
              >

                <FaCreditCard />

                <select
                  value={
                    paymentFilter
                  }
                  onChange={(
                    event
                  ) => {

                    setPaymentFilter(
                      event.target.value
                    );

                    setPage(1);
                  }}
                >

                  <option value="ALL">
                    All Payments
                  </option>

                  {paymentTypes.map(
                    (payment) => (

                      <option
                        key={
                          payment
                        }
                        value={
                          payment
                        }
                      >
                        {payment}
                      </option>

                    )
                  )}

                </select>

              </div>

              {hasFilters && (

                <button
                  type="button"
                  className="billing-clear-btn"
                  onClick={
                    clearFilters
                  }
                >
                  Clear Filters
                </button>

              )}

            </div>

            {/* EMPTY */}

            {filteredDetails.length ===
            0 ? (

              <div
                className="billing-empty-card"
              >

                <div
                  className="billing-empty-icon"
                >
                  <FaFileInvoiceDollar />
                </div>

                <h3>
                  No transactions found
                </h3>

                <p>
                  There are no billing
                  transactions matching
                  the selected filters.
                </p>

                {hasFilters && (

                  <button
                    type="button"
                    className="billing-secondary-btn"
                    onClick={
                      clearFilters
                    }
                  >
                    Clear Filters
                  </button>

                )}

              </div>

            ) : (

              <div
                className="billing-table-wrap"
              >

                <table
                  className="billing-table billing-report-table"
                >

                  <thead>

                    <tr>

                      <th>
                        Time
                      </th>

                      <th>
                        Bill No
                      </th>

                      <th>
                        Store
                      </th>

                      <th>
                        Customer
                      </th>

                      <th>
                        Payment
                      </th>

                      <th>
                        Amount
                      </th>

                      <th>
                        Created By
                      </th>

                      <th>
                        Updated By
                      </th>

                      <th>
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {paginatedDetails.map(
                      (bill) => {

                        const statusConfig =
                          getStatusConfig(
                            bill?.status
                          );

                        const StatusIcon =
                          statusConfig.icon;

                        const PaymentIcon =
                          getPaymentIcon(
                            bill?.payment_type
                          );

                        return (

                          <tr
                            key={
                              bill?.id ||
                              bill?.bill_no
                            }
                          >

                            {/* TIME */}

                            <td>

                              <div
                                className="billing-date-cell"
                              >

                                <strong>
                                  {formatTime(
                                    bill?.bill_date ||
                                      bill?.created_at
                                  )}
                                </strong>

                                <span>
                                  {formatDate(
                                    bill?.bill_date ||
                                      bill?.created_at
                                  )}
                                </span>

                              </div>

                            </td>

                            {/* BILL */}

                            <td>

                              <strong
                                className="billing-bill-number"
                              >
                                {bill?.bill_no ||
                                  `#${bill?.id}`}
                              </strong>

                            </td>

                            {/* STORE */}

                            <td>

                              <div
                                className="billing-table-user"
                              >

                                <span
                                  className="billing-table-icon"
                                >
                                  <FaStore />
                                </span>

                                <span>
                                  {bill?.store_name ||
                                    "-"}
                                </span>

                              </div>

                            </td>

                            {/* CUSTOMER */}

                            <td>
                              {bill?.customer_name ||
                                "-"}
                            </td>

                            {/* PAYMENT */}

                            <td>

                              <span
                                className="billing-payment-type"
                              >

                                <PaymentIcon />

                                {bill?.payment_type ||
                                  "-"}

                              </span>

                            </td>

                            {/* AMOUNT */}

                            <td>

                              <strong
                                className="billing-amount"
                              >
                                {formatCurrency(
                                  bill?.grand_total
                                )}
                              </strong>

                            </td>

                            {/* CREATED */}

                            <td>
                              {bill?.created_by_name ||
                                bill?.created_by ||
                                "-"}
                            </td>

                            {/* UPDATED */}

                            <td>
                              {bill?.updated_by_name ||
                                bill?.updated_by ||
                                "-"}
                            </td>

                            {/* STATUS */}

                            <td>

                              <span
                                className={`billing-status ${statusConfig.className}`}
                              >

                                <StatusIcon />

                                {
                                  statusConfig.label
                                }

                              </span>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

            {/* ==================================================
                PAGINATION
            ================================================== */}

            {filteredDetails.length >
              ROWS_PER_PAGE && (

              <div
                className="billing-pagination"
              >

                <div>

                  Showing{" "}

                  <strong>
                    {(safePage - 1) *
                      ROWS_PER_PAGE +
                      1}
                  </strong>

                  {" "}to{" "}

                  <strong>
                    {Math.min(
                      safePage *
                        ROWS_PER_PAGE,
                      filteredDetails.length
                    )}
                  </strong>

                  {" "}of{" "}

                  <strong>
                    {
                      filteredDetails.length
                    }
                  </strong>

                  {" "}transactions

                </div>

                <div
                  className="billing-pagination-controls"
                >

                  <button
                    type="button"
                    disabled={
                      safePage === 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                  >
                    <FaChevronLeft />
                  </button>

                  <span>

                    Page{" "}

                    <strong>
                      {safePage}
                    </strong>

                    {" "}of{" "}

                    <strong>
                      {totalPages}
                    </strong>

                  </span>

                  <button
                    type="button"
                    disabled={
                      safePage ===
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current + 1
                          )
                      )
                    }
                  >
                    <FaChevronRight />
                  </button>

                </div>

              </div>

            )}

          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div
            className="billing-report-footer"
          >

            <FaCheckCircle />

            <span>
              This report is generated
              directly from billing
              transactions. Cancelled
              bills are excluded from
              the daily totals according
              to the billing report rules.
            </span>

          </div>

        </>

      )}

    </div>
  );
}
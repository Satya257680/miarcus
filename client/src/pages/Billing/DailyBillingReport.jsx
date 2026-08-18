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
} from "react-icons/fa";

import {
  getDailyReport,
  getStores,
} from "../../services/billingService";

import "../../styles/Billing.css";

/* ======================================================
   HELPERS
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

const formatTime = (value) => {
  if (!value) return "-";

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

const formatDate = (value) => {
  if (!value) return "-";

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

const getReportData = (response) => {
  const data = response?.data?.data;

  if (data && typeof data === "object") {
    return {
      summary: data.summary || {},
      details: Array.isArray(data.details)
        ? data.details
        : [],
    };
  }

  return {
    summary: {},
    details: [],
  };
};

const getStoreData = (response) => {
  const data = response?.data?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function DailyBillingReport() {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const [date, setDate] = useState(today);

  const [store, setStore] = useState("");

  const [stores, setStores] = useState([]);

  const [report, setReport] = useState({
    summary: {},
    details: [],
  });

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [storesLoading, setStoresLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [page, setPage] = useState(1);

  const rowsPerPage = 10;

  /* ====================================================
     LOAD STORES
  ==================================================== */

  useEffect(() => {
    const loadStores = async () => {
      try {
        setStoresLoading(true);

        const response = await getStores();

        setStores(getStoreData(response));
      } catch (err) {
        console.error(
          "Billing stores loading error:",
          err
        );

        setStores([]);
      } finally {
        setStoresLoading(false);
      }
    };

    loadStores();
  }, []);

  /* ====================================================
     LOAD DAILY REPORT
  ==================================================== */

  const loadReport = useCallback(
    async (showRefresh = false) => {
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

        setReport(getReportData(response));

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
          err?.response?.data?.message ||
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
     AUTO LOAD WHEN DATE / STORE CHANGES
  ==================================================== */

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  /* ====================================================
     SUMMARY
  ==================================================== */

  const summary = report.summary || {};

  const totalBills = Number(
    summary.total_bills || 0
  );

  const grossSales = Number(
    summary.subtotal || 0
  );

  const discount = Number(
    summary.discount || 0
  );

  const tax = Number(
    summary.tax || summary.tax_amount || 0
  );

  const netTotal = Number(
    summary.grand_total || 0
  );

  const cash = Number(
    summary.cash || 0
  );

  const upi = Number(
    summary.upi || 0
  );

  const card = Number(
    summary.card || 0
  );

  const bankTransfer = Number(
    summary.bank_transfer || 0
  );

  const otherPayment = Number(
    summary.other || summary.other_payment || 0
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
     FILTER DETAILS
  ==================================================== */

  const filteredDetails = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return report.details || [];
    }

    return (report.details || []).filter(
      (bill) => {
        return [
          bill?.bill_no,
          bill?.store_name,
          bill?.payment_type,
          bill?.created_by_name,
          bill?.updated_by_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      }
    );
  }, [report.details, search]);

  /* ====================================================
     PAGINATION
  ==================================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredDetails.length /
        rowsPerPage
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const paginatedDetails = useMemo(() => {
    const start =
      (safePage - 1) *
      rowsPerPage;

    return filteredDetails.slice(
      start,
      start + rowsPerPage
    );
  }, [
    filteredDetails,
    safePage,
  ]);

  /* ====================================================
     PAYMENT BREAKDOWN
  ==================================================== */

  const paymentBreakdown = [
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
  ];

  /* ====================================================
     PRINT REPORT
  ==================================================== */

  const handlePrint = () => {
    window.print();
  };

  /* ====================================================
     CSV EXPORT
  ==================================================== */

  const handleExportCSV = () => {
    const rows = filteredDetails;

    if (!rows.length) {
      return;
    }

    const headers = [
      "Bill No",
      "Date",
      "Store",
      "Payment Type",
      "Amount",
      "Created By",
      "Updated By",
      "Status",
    ];

    const csvRows = rows.map(
      (bill) => [
        bill?.bill_no || "",
        formatDate(
          bill?.bill_date
        ),
        bill?.store_name || "",
        bill?.payment_type || "",
        Number(
          bill?.grand_total || 0
        ).toFixed(2),
        bill?.created_by_name || "",
        bill?.updated_by_name || "",
        bill?.status || "",
      ]
    );

    const csvContent = [
      headers,
      ...csvRows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const text = String(
              value ?? ""
            ).replace(/"/g, '""');

            return `"${text}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `billing-report-${date}${
      store ? `-store-${store}` : ""
    }.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* ====================================================
     RENDER
  ==================================================== */

  return (
    <div className="billing-page billing-report-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="billing-header">

        <div className="billing-header-left">

          <div className="billing-title-icon">
            <FaChartLine />
          </div>

          <div>
            <h1>
              Daily Billing Report
            </h1>

            <p>
              Transaction-based daily sales
              and payment summary.
            </p>
          </div>

        </div>

        <div className="billing-header-actions">

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
            onClick={handlePrint}
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
        <div className="billing-alert billing-alert-error">

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

      <div className="billing-card billing-report-filter-card">

        <div className="billing-report-filter-heading">

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

          <div className="billing-report-selected-date">
            <FaCalendarAlt />

            {date
              ? new Date(
                  `${date}T00:00:00`
                ).toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )
              : "-"}
          </div>

        </div>

        <div className="billing-grid billing-report-filters">

          <label>

            <span>
              <FaCalendarAlt />
              Date
            </span>

            <input
              type="date"
              value={date}
              onChange={(event) =>
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
              onChange={(event) =>
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

        <div className="billing-card billing-loading-card">

          <div className="billing-loader" />

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
          {/* ================================================
              SUMMARY STATISTICS
          ================================================= */}

          <div className="billing-report-stats">

            <div className="billing-report-stat-card">

              <div className="billing-report-stat-icon">
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

            <div className="billing-report-stat-card">

              <div className="billing-report-stat-icon">
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

            <div className="billing-report-stat-card">

              <div className="billing-report-stat-icon">
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

            <div className="billing-report-stat-card billing-report-stat-highlight">

              <div className="billing-report-stat-icon">
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

          {/* ================================================
              TAX
          ================================================= */}

          <div className="billing-report-tax-card">

            <div>
              <span>
                Total Tax
              </span>

              <strong>
                {formatCurrency(tax)}
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

          </div>

          {/* ================================================
              PAYMENT BREAKDOWN
          ================================================= */}

          <div className="billing-card">

            <div className="billing-section-heading">

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

            <div className="billing-payment-grid billing-payment-grid-modern">

              {paymentBreakdown.map(
                (payment) => {
                  const Icon =
                    payment.icon;

                  const percentage =
                    paymentTotal > 0
                      ? (
                          (payment.value /
                            paymentTotal) *
                          100
                        ).toFixed(1)
                      : 0;

                  return (
                    <div
                      className="billing-payment-card"
                      key={
                        payment.key
                      }
                    >

                      <div className="billing-payment-card-top">

                        <div className="billing-payment-icon">
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

                      <div className="billing-payment-progress">

                        <span
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                      <small>
                        {percentage}% of
                        total
                      </small>

                    </div>
                  );
                }
              )}

            </div>

          </div>

          {/* ================================================
              TRANSACTION DETAILS
          ================================================= */}

          <div className="billing-card">

            <div className="billing-section-heading">

              <div>
                <h2>
                  Transaction Details
                </h2>

                <p>
                  Individual bills recorded
                  for this report.
                </p>
              </div>

              <div className="billing-result-count">
                <strong>
                  {filteredDetails.length}
                </strong>{" "}
                transactions
              </div>

            </div>

            {/* Search */}

            <div className="billing-toolbar billing-report-toolbar">

              <div className="billing-search-box">

                <FaSearch />

                <input
                  type="text"
                  placeholder="Search bill, store, payment or user..."
                  value={search}
                  onChange={(event) => {
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

            </div>

            {/* Empty */}

            {filteredDetails.length ===
            0 ? (

              <div className="billing-empty-card">

                <div className="billing-empty-icon">
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

              </div>

            ) : (

              <div className="billing-table-wrap">

                <table className="billing-table billing-report-table">

                  <thead>

                    <tr>
                      <th>Time</th>
                      <th>Bill No</th>
                      <th>Store</th>
                      <th>Payment</th>
                      <th>Amount</th>
                      <th>Created By</th>
                      <th>Updated By</th>
                      <th>Status</th>
                    </tr>

                  </thead>

                  <tbody>

                    {paginatedDetails.map(
                      (bill) => {

                        return (
                          <tr
                            key={
                              bill?.id
                            }
                          >

                            <td>

                              <div className="billing-date-cell">

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

                            <td>

                              <strong className="billing-bill-number">
                                {bill?.bill_no ||
                                  `#${bill?.id}`}
                              </strong>

                            </td>

                            <td>

                              <div className="billing-table-user">

                                <span className="billing-table-icon">
                                  <FaStore />
                                </span>

                                <span>
                                  {bill?.store_name ||
                                    "-"}
                                </span>

                              </div>

                            </td>

                            <td>

                              <span className="billing-payment-type">

                                <FaCreditCard />

                                {bill?.payment_type ||
                                  "-"}

                              </span>

                            </td>

                            <td>

                              <strong className="billing-amount">
                                {formatCurrency(
                                  bill?.grand_total
                                )}
                              </strong>

                            </td>

                            <td>
                              {bill?.created_by_name ||
                                "-"}
                            </td>

                            <td>
                              {bill?.updated_by_name ||
                                "-"}
                            </td>

                            <td>

                              <span
                                className={`billing-status ${String(
                                  bill?.status ||
                                    "UNKNOWN"
                                ).toLowerCase()}`}
                              >

                                {String(
                                  bill?.status ||
                                    "UNKNOWN"
                                ).toUpperCase() ===
                                "PAID" ? (
                                  <FaCheckCircle />
                                ) : null}

                                {bill?.status ||
                                  "Unknown"}

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

            {/* ==============================================
                PAGINATION
            =============================================== */}

            {filteredDetails.length >
              rowsPerPage && (

              <div className="billing-pagination">

                <div>

                  Showing{" "}

                  <strong>
                    {(safePage - 1) *
                      rowsPerPage +
                      1}
                  </strong>

                  {" "}to{" "}

                  <strong>
                    {Math.min(
                      safePage *
                        rowsPerPage,
                      filteredDetails.length
                    )}
                  </strong>

                  {" "}of{" "}

                  <strong>
                    {filteredDetails.length}
                  </strong>

                  {" "}transactions

                </div>

                <div className="billing-pagination-controls">

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
                    </strong>{" "}
                    of{" "}
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

          {/* ================================================
              FOOTER
          ================================================= */}

          <div className="billing-report-footer">

            <FaCheckCircle />

            <span>
              This report is generated directly
              from billing transactions and
              excludes cancelled bills according
              to the billing report rules.
            </span>

          </div>

        </>
      )}

    </div>
  );
}
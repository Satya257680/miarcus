import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FaSearch,
  FaPlus,
  FaSyncAlt,
  FaEye,
  FaEdit,
  FaTrash,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaFilter,
  FaStore,
  FaUser,
  FaCreditCard,
  FaMoneyBillWave,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaExternalLinkAlt,
} from "react-icons/fa";

import {
  getBills,
  cancelBill,
} from "../../services/billingService";

import "../../styles/Billing.css";

/* ======================================================
   HELPERS
====================================================== */

const getBillData = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

/* ======================================================
   STATUS
====================================================== */

const normalizeStatus = (status) => {
  return String(status || "UNKNOWN")
    .trim()
    .toUpperCase();
};

const getStatusConfig = (status) => {
  switch (normalizeStatus(status)) {
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
        icon: FaClock,
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
        label: status || "Unknown",
        className: "unknown",
        icon: FaClock,
      };
  }
};

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
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* ======================================================
   PAYMENT ICON
====================================================== */

const getPaymentIcon = (paymentType) => {
  const type = String(
    paymentType || ""
  ).toLowerCase();

  if (type.includes("cash")) {
    return FaMoneyBillWave;
  }

  return FaCreditCard;
};

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function Bills() {
  const navigate = useNavigate();

  /* ====================================================
     STATE
  ==================================================== */

  const [data, setData] = useState([]);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [paymentFilter, setPaymentFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [deletingId, setDeletingId] =
    useState(null);

  const [page, setPage] = useState(1);

  const rowsPerPage = 10;

  /* ====================================================
     LOAD BILLS
  ==================================================== */

  const loadBills = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await getBills({
          search: search.trim(),
        });

        const bills =
          getBillData(response);

        setData(
          Array.isArray(bills)
            ? bills
            : []
        );
      } catch (err) {
        console.error(
          "Billing bills loading error:",
          err
        );

        setData([]);

        setError(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Unable to load billing transactions."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  /* ====================================================
     SEARCH
  ==================================================== */

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (
    event
  ) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  /* ====================================================
     PAYMENT TYPES
  ==================================================== */

  const paymentTypes = useMemo(() => {
    const values = data
      .map(
        (bill) =>
          bill?.payment_type
      )
      .filter(Boolean)
      .map((value) =>
        String(value).trim()
      );

    return [
      ...new Set(values),
    ].sort();
  }, [data]);

  /* ====================================================
     FILTER DATA
  ==================================================== */

  const filteredData = useMemo(() => {
    return data.filter((bill) => {
      const status =
        normalizeStatus(
          bill?.status
        );

      const payment = String(
        bill?.payment_type || ""
      )
        .trim()
        .toUpperCase();

      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter;

      const matchesPayment =
        paymentFilter === "ALL" ||
        payment === paymentFilter;

      return (
        matchesStatus &&
        matchesPayment
      );
    });
  }, [
    data,
    statusFilter,
    paymentFilter,
  ]);

  /* ====================================================
     SUMMARY
  ==================================================== */

  const summary = useMemo(() => {
    const total =
      filteredData.length;

    const paid =
      filteredData.filter(
        (bill) =>
          normalizeStatus(
            bill.status
          ) === "PAID"
      ).length;

    const pending =
      filteredData.filter(
        (bill) =>
          normalizeStatus(
            bill.status
          ) === "PENDING"
      ).length;

    const cancelled =
      filteredData.filter((bill) => {
        const status =
          normalizeStatus(
            bill.status
          );

        return (
          status === "CANCELLED" ||
          status === "CANCELED"
        );
      }).length;

    const totalAmount =
      filteredData.reduce(
        (sum, bill) =>
          sum +
          Number(
            bill?.grand_total || 0
          ),
        0
      );

    return {
      total,
      paid,
      pending,
      cancelled,
      totalAmount,
    };
  }, [filteredData]);

  /* ====================================================
     PAGINATION
  ==================================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredData.length /
        rowsPerPage
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const paginatedData =
    useMemo(() => {
      const start =
        (safePage - 1) *
        rowsPerPage;

      return filteredData.slice(
        start,
        start + rowsPerPage
      );
    }, [
      filteredData,
      safePage,
    ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* ====================================================
     DELETE / CANCEL BILL
  ==================================================== */

  const handleDelete = async (
    bill
  ) => {
    if (!bill?.id) {
      return;
    }

    const billNumber =
      bill.bill_no ||
      `#${bill.id}`;

    const confirmed =
      window.confirm(
        `Are you sure you want to delete/cancel bill ${billNumber}?\n\nThe bill will be marked as CANCELLED and the action will be recorded in the audit history.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        bill.id
      );

      setError("");

      /*
       * IMPORTANT:
       * The current billing backend exposes
       * cancelBill(), not a hard DELETE endpoint.
       *
       * Therefore this action safely cancels
       * the bill instead of permanently deleting
       * the database record.
       */
      await cancelBill(
        bill.id
      );

      await loadBills(true);
    } catch (err) {
      console.error(
        "Delete/cancel bill error:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Unable to cancel this bill."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ====================================================
     EDIT BILL
  ==================================================== */

  const handleEdit = (
    bill
  ) => {
    if (!bill?.id) {
      return;
    }

    if (
      normalizeStatus(
        bill.status
      ) === "CANCELLED"
    ) {
      return;
    }

    navigate(
      `/billing/bills/${bill.id}/edit`
    );
  };

  /* ====================================================
     CLEAR FILTERS
  ==================================================== */

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
    setPage(1);
  };

  const hasFilters =
    Boolean(search) ||
    statusFilter !== "ALL" ||
    paymentFilter !== "ALL";

  /* ====================================================
     RENDER
  ==================================================== */

  return (
    <div className="billing-page billing-bills-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="billing-header">

        <div className="billing-header-left">

          <div className="billing-title-icon">
            <FaFileInvoiceDollar />
          </div>

          <div>
            <h1>
              Bills
            </h1>

            <p>
              View, search and manage
              all billing transactions.
            </p>
          </div>

        </div>

        <div className="billing-header-actions">

          <button
            type="button"
            className="billing-secondary-btn"
            onClick={() =>
              loadBills(true)
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

          <Link
            className="billing-primary-link"
            to="/billing/entry"
          >
            <FaPlus />
            New Bill
          </Link>

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
              Billing Error
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              loadBills()
            }
          >
            Retry
          </button>

        </div>
      )}

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <div className="billing-summary-grid">

        <div className="billing-summary-card">

          <div className="billing-summary-icon">
            <FaFileInvoiceDollar />
          </div>

          <div>
            <span>
              Total Bills
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>

        </div>

        <div className="billing-summary-card">

          <div className="billing-summary-icon audit-summary-create">
            <FaCheckCircle />
          </div>

          <div>
            <span>
              Paid
            </span>

            <strong>
              {summary.paid}
            </strong>
          </div>

        </div>

        <div className="billing-summary-card">

          <div className="billing-summary-icon audit-summary-update">
            <FaClock />
          </div>

          <div>
            <span>
              Pending
            </span>

            <strong>
              {summary.pending}
            </strong>
          </div>

        </div>

        <div className="billing-summary-card">

          <div className="billing-summary-icon audit-summary-cancel">
            <FaTimesCircle />
          </div>

          <div>
            <span>
              Cancelled
            </span>

            <strong>
              {summary.cancelled}
            </strong>
          </div>

        </div>

        <div className="billing-summary-card">

          <div className="billing-summary-icon">
            <FaMoneyBillWave />
          </div>

          <div>
            <span>
              Total Amount
            </span>

            <strong>
              {formatCurrency(
                summary.totalAmount
              )}
            </strong>
          </div>

        </div>

      </div>

      {/* ==================================================
          MAIN CARD
      ================================================== */}

      <div className="billing-card">

        {/* ==================================================
            TOOLBAR
        ================================================== */}

        <div className="billing-toolbar billing-bills-toolbar">

          <div className="billing-search-box">

            <FaSearch />

            <input
              type="text"
              placeholder="Search bill number or customer..."
              value={
                searchInput
              }
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
            />

            {searchInput && (
              <button
                type="button"
                onClick={() =>
                  setSearchInput(
                    ""
                  )
                }
                title="Clear search"
              >
                ×
              </button>
            )}

          </div>

          <button
            type="button"
            className="billing-primary-btn"
            onClick={
              handleSearch
            }
          >
            <FaSearch />
            Search
          </button>

          <div className="billing-filter-select">

            <FaFilter />

            <select
              value={
                statusFilter
              }
              onChange={(event) => {
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

          <div className="billing-filter-select">

            <FaCreditCard />

            <select
              value={
                paymentFilter
              }
              onChange={(event) => {
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
                    key={payment}
                    value={payment.toUpperCase()}
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
              Clear
            </button>
          )}

        </div>

        {/* ==================================================
            RESULT BAR
        ================================================== */}

        <div className="billing-result-bar">

          <div>
            <strong>
              {
                filteredData.length
              }
            </strong>{" "}
            billing transaction
            {filteredData.length !==
            1
              ? "s"
              : ""}{" "}
            found
          </div>

          {hasFilters && (
            <span>
              Filters are currently
              applied
            </span>
          )}

        </div>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (

          <div className="billing-loading-card">

            <div className="billing-loader" />

            <h3>
              Loading bills...
            </h3>

            <p>
              Fetching the latest
              billing transactions.
            </p>

          </div>

        ) : paginatedData.length ===
          0 ? (

          /* ==================================================
             EMPTY
          ================================================== */

          <div className="billing-empty-card">

            <div className="billing-empty-icon">
              <FaFileInvoiceDollar />
            </div>

            <h3>
              {hasFilters
                ? "No matching bills"
                : "No bills found"}
            </h3>

            <p>
              {hasFilters
                ? "Try changing your search or filters."
                : "Create your first billing transaction to see it here."}
            </p>

            {hasFilters ? (

              <button
                type="button"
                className="billing-secondary-btn"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>

            ) : (

              <Link
                className="billing-primary-link"
                to="/billing/entry"
              >
                <FaPlus />
                Create First Bill
              </Link>

            )}

          </div>

        ) : (

          /* ==================================================
             TABLE
          ================================================== */

          <div className="billing-table-wrap">

            <table className="billing-table billing-bills-table">

              <thead>

                <tr>

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
                    Date
                  </th>

                  <th>
                    Status
                  </th>

                  <th className="billing-actions-column">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {paginatedData.map(
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

                    const isDeleting =
                      deletingId ===
                      bill?.id;

                    const isCancelled =
                      normalizeStatus(
                        bill?.status
                      ) ===
                        "CANCELLED" ||
                      normalizeStatus(
                        bill?.status
                      ) ===
                        "CANCELED";

                    return (
                      <tr
                        key={
                          bill?.id
                        }
                      >

                        {/* BILL NUMBER */}

                        <td>

                          <Link
                            className="billing-bill-number"
                            to={`/billing/bills/${bill.id}`}
                          >
                            {bill?.bill_no ||
                              `#${bill?.id}`}
                          </Link>

                        </td>

                        {/* STORE */}

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

                        {/* CUSTOMER */}

                        <td>

                          <div className="billing-table-user">

                            <span className="billing-table-icon">
                              <FaUser />
                            </span>

                            <span>
                              {bill?.customer_name ||
                                "-"}
                            </span>

                          </div>

                        </td>

                        {/* PAYMENT */}

                        <td>

                          <span className="billing-payment-type">

                            <PaymentIcon />

                            {bill?.payment_type ||
                              "-"}

                          </span>

                        </td>

                        {/* AMOUNT */}

                        <td>

                          <strong className="billing-amount">
                            {formatCurrency(
                              bill?.grand_total
                            )}
                          </strong>

                        </td>

                        {/* CREATED BY */}

                        <td>
                          {bill?.created_by_name ||
                            bill?.created_by ||
                            "-"}
                        </td>

                        {/* DATE */}

                        <td>

                          <div className="billing-date-cell">

                            <strong>
                              {formatDate(
                                bill?.created_at ||
                                  bill?.bill_date
                              )}
                            </strong>

                            <span>
                              {formatTime(
                                bill?.created_at ||
                                  bill?.bill_date
                              )}
                            </span>

                          </div>

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

                        {/* ==================================================
                            ACTIONS
                        ================================================== */}

                        <td>

                          <div className="billing-row-actions">

                            {/* VIEW */}

                            <Link
                              to={`/billing/bills/${bill.id}`}
                              className="billing-action-btn billing-action-view"
                              title="View Bill"
                              aria-label="View Bill"
                            >
                              <FaEye />
                            </Link>

                            {/* EDIT */}

                            <button
                              type="button"
                              className="billing-action-btn billing-action-edit"
                              title={
                                isCancelled
                                  ? "Cancelled bills cannot be edited"
                                  : "Edit Bill"
                              }
                              aria-label="Edit Bill"
                              disabled={
                                isCancelled
                              }
                              onClick={() =>
                                handleEdit(
                                  bill
                                )
                              }
                            >
                              <FaEdit />
                            </button>

                            {/* DELETE / CANCEL */}

                            <button
                              type="button"
                              className="billing-action-btn billing-action-delete"
                              title={
                                isCancelled
                                  ? "Bill already cancelled"
                                  : "Delete / Cancel Bill"
                              }
                              aria-label="Delete Bill"
                              disabled={
                                isCancelled ||
                                isDeleting
                              }
                              onClick={() =>
                                handleDelete(
                                  bill
                                )
                              }
                            >

                              {isDeleting ? (
                                <FaSyncAlt className="billing-spin" />
                              ) : (
                                <FaTrash />
                              )}

                            </button>

                          </div>

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

        {!loading &&
          filteredData.length >
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
                  filteredData.length
                )}
              </strong>

              {" "}of{" "}

              <strong>
                {
                  filteredData.length
                }
              </strong>

              {" "}bills

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

    </div>
  );
}
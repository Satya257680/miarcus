import PremiumLoader from "../../components/premium/PremiumLoader";
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
  FaBan,
} from "react-icons/fa";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import {
  getBills,
  cancelBill,
  deleteBill,
  deleteAllBills,
} from "../../services/billingService";

import "../../styles/Billing.css";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import "../../styles/premium/ModulesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";
import InsightStrip from "../../components/premium/InsightStrip";

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

  const [confirmAction, setConfirmAction] =
    useState(null); // { type: "cancel" | "delete" | "deleteAll", bill? }

  const [actionBusy, setActionBusy] =
    useState(false);

  const [notice, setNotice] =
    useState("");

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

  const handleCancelBill = (bill) => {
    if (!bill?.id) return;
    setConfirmAction({ type: "cancel", bill });
  };

  const handleDelete = (bill) => {
    if (!bill?.id) return;
    setConfirmAction({ type: "delete", bill });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, bill } = confirmAction;

    try {
      setActionBusy(true);
      setError("");
      if (bill?.id) setDeletingId(bill.id);

      let message = "";

      if (type === "cancel") {
        const response = await cancelBill(bill.id);
        message = response?.data?.message || "Bill cancelled.";
      } else if (type === "delete") {
        const response = await deleteBill(bill.id);
        message = response?.data?.message || "Bill deleted.";
      } else {
        const ids = filteredData.map((row) => row.id).filter(Boolean);
        const response = await deleteAllBills(hasFilters ? { ids } : { all: true });
        message = response?.data?.message || "Bills deleted.";
        setPage(1);
      }

      setNotice(message);
      setConfirmAction(null);
      await loadBills(true);
    } catch (err) {
      console.error("Bill action error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to complete this action."
      );
      setConfirmAction(null);
    } finally {
      setActionBusy(false);
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

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
    <div className="billing-page billing-bills-page pp-premium">

      <PremiumHero
        icon={FaFileInvoiceDollar}
        eyebrow="Billing · Transactions"
        title="Bills"
        badge="Live register"
        badgeTone="mint"
        subtitle="View, search and manage all billing transactions."
        meta={[
          { label: "Bills", value: String(summary.total) },
          { label: "Total amount", value: formatCurrency(summary.totalAmount) }
        ]}
        actions={<div className="pp-hero-actions-inline">

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

</div>}
      />

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

      <InsightStrip
        loading={loading}
        items={[
          { key: "total", label: "Total bills", value: summary.total, hint: "All transactions", tone: "violet", icon: FaFileInvoiceDollar, onClick: () => setStatusFilter("ALL"), active: statusFilter === "ALL" },
          { key: "paid", label: "Paid", value: summary.paid, hint: "Payment received", tone: "green", icon: FaCheckCircle },
          { key: "pending", label: "Pending", value: summary.pending, hint: "Awaiting payment", tone: "amber", icon: FaClock },
          { key: "cancelled", label: "Cancelled", value: summary.cancelled, hint: "Voided bills", tone: "red", icon: FaTimesCircle },
          { key: "amount", label: "Total amount", value: formatCurrency(summary.totalAmount), hint: "Across all bills", tone: "blue", icon: FaMoneyBillWave }
        ]}
      />

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
              Clear Filters
            </button>
          )}

          <button
            type="button"
            className="billing-delete-all-btn"
            disabled={!filteredData.length}
            onClick={() => setConfirmAction({ type: "deleteAll" })}
          >
            <FaTrash />
            {hasFilters ? `Delete Filtered (${filteredData.length})` : "Delete All"}
          </button>

        </div>

        {notice && (
          <div className="billing-alert billing-alert-success">
            <FaCheckCircle />
            <div>
              <strong>Done</strong>
              <span>{notice}</span>
            </div>
          </div>
        )}

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
        <PremiumLoader compact title="Loading bills" />
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

                            {/* CANCEL (soft) */}

                            {!isCancelled && (
                              <button
                                type="button"
                                className="billing-action-btn billing-action-cancel"
                                title="Cancel Bill (keeps the record)"
                                aria-label="Cancel Bill"
                                disabled={isDeleting}
                                onClick={() => handleCancelBill(bill)}
                              >
                                <FaBan />
                              </button>
                            )}

                            {/* DELETE (permanent) */}

                            <button
                              type="button"
                              className="billing-action-btn billing-action-delete"
                              title="Delete Bill permanently"
                              aria-label="Delete Bill"
                              disabled={isDeleting}
                              onClick={() => handleDelete(bill)}
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

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === "cancel"
            ? "Cancel Bill"
            : confirmAction?.type === "delete"
              ? "Delete Bill"
              : hasFilters
                ? "Delete Filtered Bills"
                : "Delete All Bills"
        }
        message={
          confirmAction?.type === "cancel"
            ? `Cancel bill ${confirmAction.bill?.bill_no || `#${confirmAction.bill?.id}`}? It stays in the register as CANCELLED and the change is recorded in the audit history.`
            : confirmAction?.type === "delete"
              ? `Permanently delete bill ${confirmAction.bill?.bill_no || `#${confirmAction.bill?.id}`} with its items and payments? This cannot be undone.`
              : hasFilters
                ? `Permanently delete the ${filteredData.length} bill(s) that match the current search and filters? This cannot be undone.`
                : "No filter is applied. EVERY bill, with its items and payments, will be permanently deleted. This cannot be undone."
        }
        confirmText={actionBusy ? "Working..." : confirmAction?.type === "cancel" ? "Cancel Bill" : "Delete"}
        cancelText="Close"
        confirmVariant="danger"
        onConfirm={runConfirmedAction}
        onCancel={() => !actionBusy && setConfirmAction(null)}
      />

    </div>
  );
}
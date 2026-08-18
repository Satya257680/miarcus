import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaStore,
  FaUser,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaCreditCard,
  FaMoneyBillWave,
  FaUniversity,
  FaSave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaCalculator,
} from "react-icons/fa";

import {
  createBill,
  getStores,
} from "../../services/billingService";

import "../../styles/Billing.css";

/* ======================================================
   CONSTANTS
====================================================== */

const createBlankItem = () => ({
  product_name: "",
  quantity: 1,
  rate: 0,
  discount: 0,
});

const PAYMENT_TYPES = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Other",
];

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

const getCurrentDateTime = () => {
  const now = new Date();

  const offset =
    now.getTimezoneOffset();

  const localDate = new Date(
    now.getTime() -
      offset * 60 * 1000
  );

  return localDate
    .toISOString()
    .slice(0, 16);
};

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function BillingEntry() {
  const navigate = useNavigate();

  /* ====================================================
     STATE
  ==================================================== */

  const [stores, setStores] = useState([]);

  const [storesLoading, setStoresLoading] =
    useState(true);

  const [form, setForm] = useState({
    bill_no: "",
    store_id: "",
    customer_name: "",
    bill_date: getCurrentDateTime(),
    discount: 0,
    tax: 0,
    payment_type: "Cash",
    transaction_reference: "",
  });

  const [items, setItems] = useState([
    createBlankItem(),
  ]);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [errors, setErrors] =
    useState({});

  /* ====================================================
     LOAD STORES
  ==================================================== */

  useEffect(() => {
    const loadStores = async () => {
      try {
        setStoresLoading(true);

        const response =
          await getStores();

        const storeData =
          Array.isArray(
            response?.data?.data
          )
            ? response.data.data
            : [];

        setStores(storeData);
      } catch (error) {
        console.error(
          "Unable to load stores:",
          error
        );

        setStores([]);

        setMessage(
          "Unable to load stores. Please refresh the page."
        );

        setMessageType("error");
      } finally {
        setStoresLoading(false);
      }
    };

    loadStores();
  }, []);

  /* ====================================================
     FORM UPDATE
  ==================================================== */

  const updateForm = useCallback(
    (field, value) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));

      setErrors((current) => ({
        ...current,
        [field]: "",
      }));

      setMessage("");
    },
    []
  );

  /* ====================================================
     ITEM UPDATE
  ==================================================== */

  const updateItem = (
    index,
    field,
    value
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    setErrors((current) => ({
      ...current,
      items: "",
    }));

    setMessage("");
  };

  /* ====================================================
     ADD ITEM
  ==================================================== */

  const addItem = () => {
    setItems((current) => [
      ...current,
      createBlankItem(),
    ]);
  };

  /* ====================================================
     REMOVE ITEM
  ==================================================== */

  const removeItem = (index) => {
    if (items.length === 1) {
      return;
    }

    setItems((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  /* ====================================================
     ITEM CALCULATIONS
  ==================================================== */

  const itemCalculations = useMemo(() => {
    return items.map((item) => {
      const quantity =
        Number(item.quantity) || 0;

      const rate =
        Number(item.rate) || 0;

      const discount =
        Number(item.discount) || 0;

      const gross =
        quantity * rate;

      const amount = Math.max(
        0,
        gross - discount
      );

      return {
        gross,
        discount,
        amount,
      };
    });
  }, [items]);

  /* ====================================================
     TOTALS
  ==================================================== */

  const totals = useMemo(() => {
    const grossSubtotal =
      itemCalculations.reduce(
        (sum, item) =>
          sum + item.gross,
        0
      );

    const itemDiscount =
      itemCalculations.reduce(
        (sum, item) =>
          sum + item.discount,
        0
      );

    const invoiceDiscount =
      Number(form.discount) || 0;

    const totalDiscount =
      itemDiscount +
      invoiceDiscount;

    const tax =
      Number(form.tax) || 0;

    const grandTotal = Math.max(
      0,
      grossSubtotal -
        totalDiscount +
        tax
    );

    return {
      grossSubtotal,
      itemDiscount,
      invoiceDiscount,
      totalDiscount,
      tax,
      grandTotal,
    };
  }, [
    itemCalculations,
    form.discount,
    form.tax,
  ]);

  /* ====================================================
     VALIDATION
  ==================================================== */

  const validateForm = () => {
    const nextErrors = {};

    if (!form.bill_no.trim()) {
      nextErrors.bill_no =
        "Bill number is required.";
    }

    if (!form.store_id) {
      nextErrors.store_id =
        "Please select a store.";
    }

    if (!form.bill_date) {
      nextErrors.bill_date =
        "Bill date is required.";
    }

    const validItems =
      items.filter(
        (item) =>
          item.product_name.trim()
      );

    if (!validItems.length) {
      nextErrors.items =
        "Add at least one product or service.";
    }

    items.forEach(
      (item, index) => {
        if (
          item.product_name.trim()
        ) {
          const quantity =
            Number(item.quantity);

          const rate =
            Number(item.rate);

          if (
            !quantity ||
            quantity <= 0
          ) {
            nextErrors[
              `item_${index}`
            ] =
              "Quantity must be greater than 0.";
          }

          if (
            rate < 0 ||
            Number.isNaN(rate)
          ) {
            nextErrors[
              `item_${index}`
            ] =
              "Rate cannot be negative.";
          }
        }
      }
    );

    const discount =
      Number(form.discount) || 0;

    const tax =
      Number(form.tax) || 0;

    if (discount < 0) {
      nextErrors.discount =
        "Discount cannot be negative.";
    }

    if (tax < 0) {
      nextErrors.tax =
        "Tax cannot be negative.";
    }

    if (
      form.payment_type !== "Cash" &&
      !form.transaction_reference.trim()
    ) {
      nextErrors.transaction_reference =
        "Transaction reference is required for this payment type.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  /* ====================================================
     SUBMIT BILL
  ==================================================== */

  const submit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setMessage(
        "Please correct the highlighted fields."
      );

      setMessageType("error");

      return;
    }

    try {
      setSaving(true);

      setMessage("");

      setMessageType("");

      const validItems =
        items
          .filter(
            (item) =>
              item.product_name.trim()
          )
          .map((item, index) => {
            const quantity =
              Number(
                item.quantity
              ) || 0;

            const rate =
              Number(item.rate) || 0;

            const discount =
              Number(
                item.discount
              ) || 0;

            const gross =
              quantity * rate;

            const amount = Math.max(
              0,
              gross - discount
            );

            return {
              product_name:
                item.product_name.trim(),

              quantity,

              rate,

              discount,

              amount,
            };
          });

      const payload = {
        ...form,

        subtotal:
          totals.grossSubtotal,

        discount:
          totals.totalDiscount,

        tax:
          totals.tax,

        grand_total:
          totals.grandTotal,

        payment_amount:
          totals.grandTotal,

        items: validItems,
      };

      await createBill(payload);

      setMessage(
        "Bill created successfully."
      );

      setMessageType("success");

      setTimeout(() => {
        navigate("/billing/bills");
      }, 900);
    } catch (error) {
      console.error(
        "Create billing error:",
        error
      );

      setMessage(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Failed to create bill. Please try again."
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  /* ====================================================
     CANCEL
  ==================================================== */

  const handleCancel = () => {
    if (saving) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to leave this billing entry? Unsaved changes will be lost."
      );

    if (confirmed) {
      navigate("/billing/bills");
    }
  };

  /* ====================================================
     PAYMENT ICON
  ==================================================== */

  const getPaymentIcon = (
    paymentType
  ) => {
    switch (paymentType) {
      case "Cash":
        return <FaMoneyBillWave />;

      case "Bank Transfer":
        return <FaUniversity />;

      default:
        return <FaCreditCard />;
    }
  };

  /* ====================================================
     RENDER
  ==================================================== */

  return (
    <div className="billing-page billing-entry-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="billing-header">

        <div className="billing-header-left">

          <button
            type="button"
            className="billing-back-btn"
            onClick={() =>
              navigate(
                "/billing/bills"
              )
            }
            disabled={saving}
            title="Back to Bills"
          >
            <FaArrowLeft />
          </button>

          <div className="billing-title-icon">
            <FaFileInvoiceDollar />
          </div>

          <div>
            <h1>
              Billing Entry
            </h1>

            <p>
              Create a new customer
              bill and payment record.
            </p>
          </div>

        </div>

      </div>

      {/* ==================================================
          MESSAGE
      ================================================== */}

      {message && (
        <div
          className={`billing-alert ${
            messageType ===
            "success"
              ? "billing-alert-success"
              : "billing-alert-error"
          }`}
        >

          {messageType ===
          "success" ? (
            <FaCheckCircle />
          ) : (
            <FaExclamationTriangle />
          )}

          <div>
            <strong>
              {messageType ===
              "success"
                ? "Success"
                : "Please check the form"}
            </strong>

            <span>
              {message}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setMessageType("");
            }}
          >
            <FaTimes />
          </button>

        </div>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

      <form
        className="billing-card billing-entry-card"
        onSubmit={submit}
      >

        {/* ==================================================
            BILL INFORMATION
        ================================================== */}

        <div className="billing-section">

          <div className="billing-section-title">

            <div>
              <h3>
                Bill Information
              </h3>

              <p>
                Enter the basic details
                for this transaction.
              </p>
            </div>

          </div>

          <div className="billing-grid">

            {/* Bill Number */}

            <label
              className={
                errors.bill_no
                  ? "billing-field-error"
                  : ""
              }
            >

              <span>
                <FaFileInvoiceDollar />
                Bill No
                <em>*</em>
              </span>

              <input
                type="text"
                placeholder="INV-1001"
                required
                value={
                  form.bill_no
                }
                onChange={(event) =>
                  updateForm(
                    "bill_no",
                    event.target.value
                  )
                }
              />

              {errors.bill_no && (
                <small>
                  {errors.bill_no}
                </small>
              )}

            </label>

            {/* Store */}

            <label
              className={
                errors.store_id
                  ? "billing-field-error"
                  : ""
              }
            >

              <span>
                <FaStore />
                Store
                <em>*</em>
              </span>

              <select
                required
                value={
                  form.store_id
                }
                disabled={
                  storesLoading ||
                  saving
                }
                onChange={(event) =>
                  updateForm(
                    "store_id",
                    event.target.value
                  )
                }
              >

                <option value="">
                  {storesLoading
                    ? "Loading stores..."
                    : "Select store"}
                </option>

                {stores.map(
                  (store) => (
                    <option
                      key={store.id}
                      value={
                        store.id
                      }
                    >
                      {
                        store.store_name
                      }
                    </option>
                  )
                )}

              </select>

              {errors.store_id && (
                <small>
                  {errors.store_id}
                </small>
              )}

            </label>

            {/* Customer */}

            <label>

              <span>
                <FaUser />
                Customer Name
              </span>

              <input
                type="text"
                placeholder="Enter customer name"
                value={
                  form.customer_name
                }
                onChange={(event) =>
                  updateForm(
                    "customer_name",
                    event.target.value
                  )
                }
              />

            </label>

            {/* Date */}

            <label
              className={
                errors.bill_date
                  ? "billing-field-error"
                  : ""
              }
            >

              <span>
                <FaCalendarAlt />
                Bill Date
                <em>*</em>
              </span>

              <input
                type="datetime-local"
                required
                value={
                  form.bill_date
                }
                onChange={(event) =>
                  updateForm(
                    "bill_date",
                    event.target.value
                  )
                }
              />

              {errors.bill_date && (
                <small>
                  {errors.bill_date}
                </small>
              )}

            </label>

          </div>

        </div>

        {/* ==================================================
            BILL ITEMS
        ================================================== */}

        <div className="billing-section">

          <div className="billing-section-title">

            <div>
              <h3>
                Bill Items
              </h3>

              <p>
                Add products or services
                included in this bill.
              </p>
            </div>

            <button
              type="button"
              className="billing-secondary-btn"
              onClick={addItem}
              disabled={saving}
            >
              <FaPlus />
              Add Item
            </button>

          </div>

          {errors.items && (
            <div className="billing-inline-error">
              <FaExclamationTriangle />
              {errors.items}
            </div>
          )}

          {/* Item Header */}

          <div className="billing-item-header">

            <span>
              Product / Service
            </span>

            <span>
              Quantity
            </span>

            <span>
              Rate
            </span>

            <span>
              Item Discount
            </span>

            <span>
              Amount
            </span>

            <span />

          </div>

          {/* Items */}

          <div className="billing-items-list">

            {items.map(
              (item, index) => {
                const calculation =
                  itemCalculations[
                    index
                  ];

                return (
                  <div
                    className={`billing-item-row ${
                      errors[
                        `item_${index}`
                      ]
                        ? "billing-item-error"
                        : ""
                    }`}
                    key={index}
                  >

                    {/* Product */}

                    <div className="billing-item-product">

                      <input
                        type="text"
                        placeholder="Product / Service"
                        value={
                          item.product_name
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            index,
                            "product_name",
                            event.target
                              .value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* Quantity */}

                    <div>

                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={
                          item.quantity
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            index,
                            "quantity",
                            event.target
                              .value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* Rate */}

                    <div>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.rate
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            index,
                            "rate",
                            event.target
                              .value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* Item Discount */}

                    <div>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.discount
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            index,
                            "discount",
                            event.target
                              .value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* Amount */}

                    <div className="billing-item-amount">
                      {formatCurrency(
                        calculation.amount
                      )}
                    </div>

                    {/* Remove */}

                    <button
                      type="button"
                      className="billing-icon-button billing-delete-item"
                      title="Remove item"
                      disabled={
                        items.length ===
                          1 ||
                        saving
                      }
                      onClick={() =>
                        removeItem(
                          index
                        )
                      }
                    >
                      <FaTrash />
                    </button>

                    {errors[
                      `item_${index}`
                    ] && (
                      <small className="billing-item-error-message">
                        {
                          errors[
                            `item_${index}`
                          ]
                        }
                      </small>
                    )}

                  </div>
                );
              }
            )}

          </div>

          {/* Item subtotal */}

          <div className="billing-items-summary">

            <span>
              Items Subtotal
            </span>

            <strong>
              {formatCurrency(
                totals.grossSubtotal
              )}
            </strong>

          </div>

        </div>

        {/* ==================================================
            PAYMENT & ADJUSTMENTS
        ================================================== */}

        <div className="billing-section">

          <div className="billing-section-title">

            <div>
              <h3>
                Payment & Adjustments
              </h3>

              <p>
                Apply discounts, taxes
                and select the payment
                method.
              </p>
            </div>

          </div>

          <div className="billing-grid">

            {/* Discount */}

            <label
              className={
                errors.discount
                  ? "billing-field-error"
                  : ""
              }
            >

              <span>
                Discount
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.discount
                }
                onChange={(event) =>
                  updateForm(
                    "discount",
                    event.target.value
                  )
                }
                disabled={saving}
              />

              {errors.discount && (
                <small>
                  {errors.discount}
                </small>
              )}

            </label>

            {/* Tax */}

            <label
              className={
                errors.tax
                  ? "billing-field-error"
                  : ""
              }
            >

              <span>
                Tax
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.tax
                }
                onChange={(event) =>
                  updateForm(
                    "tax",
                    event.target.value
                  )
                }
                disabled={saving}
              />

              {errors.tax && (
                <small>
                  {errors.tax}
                </small>
              )}

            </label>

            {/* Payment Type */}

            <label>

              <span>
                <FaCreditCard />
                Payment Type
              </span>

              <select
                value={
                  form.payment_type
                }
                onChange={(event) =>
                  updateForm(
                    "payment_type",
                    event.target.value
                  )
                }
                disabled={saving}
              >

                {PAYMENT_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}

              </select>

            </label>

            {/* Reference */}

            <label
              className={
                errors.transaction_reference
                  ? "billing-field-error"
                  : ""
              }
            >

              <span>
                {getPaymentIcon(
                  form.payment_type
                )}

                Transaction Reference

                {form.payment_type !==
                  "Cash" && (
                  <em>*</em>
                )}
              </span>

              <input
                type="text"
                placeholder={
                  form.payment_type ===
                  "Cash"
                    ? "Optional"
                    : "Enter transaction reference"
                }
                value={
                  form.transaction_reference
                }
                onChange={(event) =>
                  updateForm(
                    "transaction_reference",
                    event.target.value
                  )
                }
                disabled={saving}
              />

              {errors.transaction_reference && (
                <small>
                  {
                    errors.transaction_reference
                  }
                </small>
              )}

            </label>

          </div>

        </div>

        {/* ==================================================
            TOTAL SUMMARY
        ================================================== */}

        <div className="billing-total-panel">

          <div className="billing-total-icon">
            <FaCalculator />
          </div>

          <div className="billing-total-breakdown">

            <div>
              <span>
                Subtotal
              </span>

              <strong>
                {formatCurrency(
                  totals.grossSubtotal
                )}
              </strong>
            </div>

            <div>
              <span>
                Item Discount
              </span>

              <strong className="billing-discount-value">
                -
                {formatCurrency(
                  totals.itemDiscount
                )}
              </strong>
            </div>

            <div>
              <span>
                Bill Discount
              </span>

              <strong className="billing-discount-value">
                -
                {formatCurrency(
                  totals.invoiceDiscount
                )}
              </strong>
            </div>

            <div>
              <span>
                Tax
              </span>

              <strong>
                +
                {formatCurrency(
                  totals.tax
                )}
              </strong>
            </div>

            <div className="billing-grand-total-row">

              <span>
                Grand Total
              </span>

              <strong>
                {formatCurrency(
                  totals.grandTotal
                )}
              </strong>

            </div>

          </div>

        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="billing-actions">

          <button
            type="button"
            className="billing-secondary-btn"
            onClick={
              handleCancel
            }
            disabled={saving}
          >
            <FaTimes />
            Cancel
          </button>

          <button
            type="submit"
            className="billing-primary-btn"
            disabled={
              saving ||
              storesLoading
            }
          >

            {saving ? (
              <>
                <span className="billing-button-spinner" />
                Saving Bill...
              </>
            ) : (
              <>
                <FaSave />
                Create Bill
              </>
            )}

          </button>

        </div>

      </form>

    </div>
  );
}
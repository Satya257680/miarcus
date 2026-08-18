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
  FaSpinner,
  FaReceipt,
} from "react-icons/fa";

import {
  createBill,
  getStores,
} from "../../services/billingService";

import "../../styles/Billing.css";

/* ======================================================
   CONSTANTS
====================================================== */

const REQUEST_TIMEOUT = 30000;

const PAYMENT_TYPES = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Other",
];

/* ======================================================
   CREATE BLANK ITEM
====================================================== */

const createBlankItem = () => ({
  product_name: "",
  quantity: 1,
  rate: 0,
  discount: 0,
});

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
   CURRENT LOCAL DATE/TIME
====================================================== */

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
   ERROR MESSAGE
====================================================== */

const getErrorMessage = (
  error
) => {
  if (
    error?.code ===
    "ECONNABORTED"
  ) {
    return (
      "The billing request took too long. " +
      "Please check whether the backend server is running."
    );
  }

  if (
    error?.response?.data?.message
  ) {
    return error.response.data.message;
  }

  if (
    error?.response?.status === 401
  ) {
    return (
      "Your session has expired. Please login again."
    );
  }

  if (
    error?.response?.status === 403
  ) {
    return (
      "You do not have permission to create bills."
    );
  }

  if (
    error?.response?.status === 404
  ) {
    return (
      "Billing API endpoint was not found. Check the backend route."
    );
  }

  if (
    error?.response?.status >= 500
  ) {
    return (
      "The server encountered an error while creating the bill."
    );
  }

  if (error?.message) {
    return error.message;
  }

  return (
    "Failed to create bill. Please try again."
  );
};

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function BillingEntry() {

  const navigate =
    useNavigate();

  /* ====================================================
     STATE
  ==================================================== */

  const [
    stores,
    setStores
  ] = useState([]);

  const [
    storesLoading,
    setStoresLoading
  ] = useState(true);

  const [
    form,
    setForm
  ] = useState({
    bill_no: "",
    store_id: "",
    customer_name: "",
    bill_date:
      getCurrentDateTime(),
    discount: 0,
    tax: 0,
    payment_type: "Cash",
    transaction_reference: "",
  });

  const [
    items,
    setItems
  ] = useState([
    createBlankItem(),
  ]);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState("");

  const [
    messageType,
    setMessageType
  ] = useState("");

  const [
    errors,
    setErrors
  ] = useState({});

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

          const storeData =
            Array.isArray(
              response?.data?.data
            )
              ? response.data.data
              : [];

          setStores(
            storeData
          );

        } catch (error) {

          console.error(
            "Unable to load stores:",
            error
          );

          if (!mounted) {
            return;
          }

          setStores([]);

          setMessage(
            getErrorMessage(
              error
            )
          );

          setMessageType(
            "error"
          );

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
     FORM UPDATE
  ==================================================== */

  const updateForm =
    useCallback(
      (
        field,
        value
      ) => {

        setForm(
          (current) => ({
            ...current,
            [field]: value,
          })
        );

        setErrors(
          (current) => ({
            ...current,
            [field]: "",
          })
        );

        setMessage("");
        setMessageType("");
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

    setItems(
      (current) =>
        current.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        )
    );

    setErrors(
      (current) => ({
        ...current,
        items: "",
        [`item_${index}`]: "",
      })
    );

    setMessage("");
    setMessageType("");
  };

  /* ====================================================
     ADD ITEM
  ==================================================== */

  const addItem = () => {

    setItems(
      (current) => [
        ...current,
        createBlankItem(),
      ]
    );
  };

  /* ====================================================
     REMOVE ITEM
  ==================================================== */

  const removeItem = (
    index
  ) => {

    if (
      items.length === 1
    ) {
      return;
    }

    setItems(
      (current) =>
        current.filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
    );
  };

  /* ====================================================
     ITEM CALCULATIONS
  ==================================================== */

  const itemCalculations =
    useMemo(() => {

      return items.map(
        (item) => {

          const quantity =
            Number(
              item.quantity
            ) || 0;

          const rate =
            Number(
              item.rate
            ) || 0;

          const discount =
            Number(
              item.discount
            ) || 0;

          const gross =
            quantity * rate;

          const amount =
            Math.max(
              0,
              gross - discount
            );

          return {
            gross,
            discount,
            amount,
          };
        }
      );

    }, [items]);

  /* ====================================================
     TOTALS
  ==================================================== */

  const totals =
    useMemo(() => {

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
        Math.max(
          0,
          Number(
            form.discount
          ) || 0
        );

      const totalDiscount =
        itemDiscount +
        invoiceDiscount;

      const tax =
        Math.max(
          0,
          Number(
            form.tax
          ) || 0
        );

      const grandTotal =
        Math.max(
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

  const validateForm =
    () => {

      const nextErrors = {};

      if (
        !form.bill_no.trim()
      ) {

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

      if (
        !validItems.length
      ) {

        nextErrors.items =
          "Add at least one product or service.";
      }

      items.forEach(
        (item, index) => {

          if (
            !item.product_name.trim()
          ) {
            return;
          }

          const quantity =
            Number(
              item.quantity
            );

          const rate =
            Number(
              item.rate
            );

          const discount =
            Number(
              item.discount
            );

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
            Number.isNaN(
              rate
            ) ||
            rate < 0
          ) {

            nextErrors[
              `item_${index}`
            ] =
              "Rate cannot be negative.";
          }

          if (
            Number.isNaN(
              discount
            ) ||
            discount < 0
          ) {

            nextErrors[
              `item_${index}`
            ] =
              "Discount cannot be negative.";
          }
        }
      );

      const discount =
        Number(
          form.discount
        ) || 0;

      const tax =
        Number(
          form.tax
        ) || 0;

      if (
        discount < 0
      ) {

        nextErrors.discount =
          "Discount cannot be negative.";
      }

      if (
        tax < 0
      ) {

        nextErrors.tax =
          "Tax cannot be negative.";
      }

      if (
        form.payment_type !==
          "Cash" &&
        !form.transaction_reference.trim()
      ) {

        nextErrors.transaction_reference =
          "Transaction reference is required for this payment type.";
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

  /* ====================================================
     CREATE BILL
  ==================================================== */

  const submit = async (
    event
  ) => {

    event.preventDefault();

    if (saving) {
      return;
    }

    if (!validateForm()) {

      setMessage(
        "Please correct the highlighted fields."
      );

      setMessageType(
        "error"
      );

      return;
    }

    try {

      setSaving(true);

      setMessage("");
      setMessageType("");

      /* ----------------------------------------------
         PREPARE ITEMS
      ---------------------------------------------- */

      const validItems =
        items
          .filter(
            (item) =>
              item.product_name.trim()
          )
          .map(
            (item) => {

              const quantity =
                Number(
                  item.quantity
                ) || 0;

              const rate =
                Number(
                  item.rate
                ) || 0;

              const discount =
                Number(
                  item.discount
                ) || 0;

              const gross =
                quantity * rate;

              const amount =
                Math.max(
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
            }
          );

      /* ----------------------------------------------
         PAYLOAD
      ---------------------------------------------- */

      const payload = {
        bill_no:
          form.bill_no.trim(),

        store_id:
          form.store_id,

        customer_name:
          form.customer_name.trim(),

        bill_date:
          form.bill_date,

        subtotal:
          Number(
            totals.grossSubtotal
          ),

        discount:
          Number(
            totals.totalDiscount
          ),

        tax:
          Number(
            totals.tax
          ),

        grand_total:
          Number(
            totals.grandTotal
          ),

        payment_type:
          form.payment_type,

        payment_amount:
          Number(
            totals.grandTotal
          ),

        transaction_reference:
          form.transaction_reference.trim(),

        items:
          validItems,
      };

      console.log(
        "Creating billing payload:",
        payload
      );

      /* ----------------------------------------------
         CREATE BILL
      ---------------------------------------------- */

      const response =
        await createBill(
          payload
        );

      console.log(
        "Billing API response:",
        response
      );

      /* ----------------------------------------------
         SUCCESS
      ---------------------------------------------- */

      if (
        response?.data?.success ===
        false
      ) {

        throw new Error(
          response?.data?.message ||
          "Unable to create bill."
        );
      }

      setMessage(
        response?.data?.message ||
        "Bill created successfully."
      );

      setMessageType(
        "success"
      );

      /* ----------------------------------------------
         REDIRECT
      ---------------------------------------------- */

      setTimeout(() => {

        navigate(
          "/billing/bills"
        );

      }, 900);

    } catch (error) {

      console.error(
        "Create billing error:",
        error
      );

      setMessage(
        getErrorMessage(
          error
        )
      );

      setMessageType(
        "error"
      );

    } finally {

      setSaving(false);
    }
  };

  /* ====================================================
     CANCEL
  ==================================================== */

  const handleCancel =
    () => {

      if (saving) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to leave this billing entry? Unsaved changes will be lost."
        );

      if (
        confirmed
      ) {

        navigate(
          "/billing/bills"
        );
      }
    };

  /* ====================================================
     PAYMENT ICON
  ==================================================== */

  const getPaymentIcon =
    (paymentType) => {

      switch (
        paymentType
      ) {

        case "Cash":
          return (
            <FaMoneyBillWave />
          );

        case "Bank Transfer":
          return (
            <FaUniversity />
          );

        case "UPI":
          return (
            <FaCreditCard />
          );

        case "Card":
          return (
            <FaCreditCard />
          );

        default:
          return (
            <FaCreditCard />
          );
      }
    };

  /* ====================================================
     RENDER
  ==================================================== */

  return (

    <div
      className="billing-page billing-entry-page"
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

          <div
            className="billing-title-icon"
          >
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
                : "Billing Error"}
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

        <div
          className="billing-section"
        >

          <div
            className="billing-section-title"
          >

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

          <div
            className="billing-grid"
          >

            {/* BILL NO */}

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
                disabled={saving}
              />

              {errors.bill_no && (
                <small>
                  {errors.bill_no}
                </small>
              )}

            </label>

            {/* STORE */}

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
                      value={store.id}
                    >
                      {store.store_name}
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

            {/* CUSTOMER */}

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
                disabled={saving}
              />

            </label>

            {/* DATE */}

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
                disabled={saving}
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

        <div
          className="billing-section"
        >

          <div
            className="billing-section-title"
          >

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

            <div
              className="billing-inline-error"
            >
              <FaExclamationTriangle />
              {errors.items}
            </div>

          )}

          {/* ITEM HEADER */}

          <div
            className="billing-item-header"
          >

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

          {/* ITEMS */}

          <div
            className="billing-items-list"
          >

            {items.map(
              (
                item,
                index
              ) => {

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

                    {/* PRODUCT */}

                    <div
                      className="billing-item-product"
                    >

                      <input
                        type="text"
                        placeholder="Product / Service"
                        value={
                          item.product_name
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "product_name",
                            event.target.value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* QUANTITY */}

                    <div>

                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={
                          item.quantity
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* RATE */}

                    <div>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.rate
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "rate",
                            event.target.value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* ITEM DISCOUNT */}

                    <div>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.discount
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "discount",
                            event.target.value
                          )
                        }
                        disabled={saving}
                      />

                    </div>

                    {/* AMOUNT */}

                    <div
                      className="billing-item-amount"
                    >
                      {formatCurrency(
                        calculation.amount
                      )}
                    </div>

                    {/* DELETE */}

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

                      <small
                        className="billing-item-error-message"
                      >
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

          {/* ITEM SUBTOTAL */}

          <div
            className="billing-items-summary"
          >

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
            PAYMENT
        ================================================== */}

        <div
          className="billing-section"
        >

          <div
            className="billing-section-title"
          >

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

          <div
            className="billing-grid"
          >

            {/* DISCOUNT */}

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

            {/* TAX */}

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

            {/* PAYMENT TYPE */}

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

            {/* REFERENCE */}

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

        <div
          className="billing-total-panel"
        >

          <div
            className="billing-total-icon"
          >
            <FaCalculator />
          </div>

          <div
            className="billing-total-breakdown"
          >

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

              <strong
                className="billing-discount-value"
              >
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

              <strong
                className="billing-discount-value"
              >
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

            <div
              className="billing-grand-total-row"
            >

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

        <div
          className="billing-actions"
        >

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
                <FaSpinner
                  className="billing-spin"
                />

                Creating Bill...
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
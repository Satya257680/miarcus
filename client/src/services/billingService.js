import axios from "axios";

/* ======================================================
   BILLING API CONFIGURATION
====================================================== */

const API = "/api/billing";

/*
 * Prevent billing requests from hanging forever.
 *
 * 30 seconds is enough for normal billing operations.
 */
const BILLING_TIMEOUT = 30000;

/* ======================================================
   AXIOS CONFIG
====================================================== */

const billingRequest = axios.create({
  baseURL: "",
  timeout: BILLING_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ======================================================
   ERROR HANDLER
====================================================== */

const handleBillingError = (error) => {
  console.error(
    "Billing API Error:",
    error
  );

  /*
   * Do not replace the Axios error object.
   * Components can still access:
   *
   * error.response
   * error.response.data
   * error.response.status
   */

  if (
    error?.code ===
    "ECONNABORTED"
  ) {
    error.message =
      "Billing request timed out. Please check whether the backend server is running.";
  }

  if (
    error?.response?.status === 401
  ) {
    error.message =
      error?.response?.data?.message ||
      "Your session has expired. Please login again.";
  }

  if (
    error?.response?.status === 403
  ) {
    error.message =
      error?.response?.data?.message ||
      "You do not have permission to perform this billing action.";
  }

  if (
    error?.response?.status === 404
  ) {
    error.message =
      error?.response?.data?.message ||
      "Billing API endpoint was not found.";
  }

  if (
    error?.response?.status >= 500
  ) {
    error.message =
      error?.response?.data?.message ||
      "Billing server error. Please check the backend.";
  }

  return Promise.reject(
    error
  );
};

/* ======================================================
   RESPONSE INTERCEPTOR
====================================================== */

billingRequest.interceptors.response.use(
  (response) =>
    response,

  (error) =>
    handleBillingError(
      error
    )
);

/* ======================================================
   REQUEST INTERCEPTOR
====================================================== */

/*
 * The authentication middleware on the backend
 * should receive the existing application token/session.
 *
 * We intentionally do not create a separate
 * authentication mechanism for Billing.
 */

billingRequest.interceptors.request.use(
  (config) => {

    console.log(
      `[Billing API] ${String(
        config.method
      ).toUpperCase()} ${config.url}`
    );

    return config;
  },

  (error) =>
    Promise.reject(
      error
    )
);

/* ======================================================
   BILLS
====================================================== */

/**
 * Get all billing transactions.
 *
 * Supported parameters:
 *
 * search
 * store_id
 * status
 * payment_type
 * date
 * page
 * limit
 *
 * Example:
 *
 * getBills({
 *   search: "INV-1001",
 *   store_id: 2,
 *   status: "PAID"
 * });
 */
export const getBills = (
  params = {}
) =>
  billingRequest.get(
    API,
    {
      params,
    }
  );

/* ======================================================
   GET SINGLE BILL
====================================================== */

/**
 * Get one bill by ID.
 *
 * Returns:
 *
 * - Bill
 * - Store
 * - Customer
 * - Items
 * - Payments
 * - Created By
 * - Updated By
 */
export const getBill = (
  id
) => {

  if (!id) {
    return Promise.reject(
      new Error(
        "Bill ID is required."
      )
    );
  }

  return billingRequest.get(
    `${API}/${id}`
  );
};

/* ======================================================
   CREATE BILL
====================================================== */

/**
 * Create a new bill.
 *
 * Creates:
 *
 * - Bill
 * - Bill Items
 * - Payment
 * - CREATE Audit
 */
export const createBill = (
  data
) => {

  if (!data) {
    return Promise.reject(
      new Error(
        "Billing data is required."
      )
    );
  }

  return billingRequest.post(
    API,
    data
  );
};

/* ======================================================
   UPDATE BILL
====================================================== */

/**
 * Update an existing bill.
 *
 * PUT /api/billing/:id
 */
export const updateBill = (
  id,
  data
) => {

  if (!id) {
    return Promise.reject(
      new Error(
        "Bill ID is required."
      )
    );
  }

  if (!data) {
    return Promise.reject(
      new Error(
        "Billing update data is required."
      )
    );
  }

  return billingRequest.put(
    `${API}/${id}`,
    data
  );
};

/* ======================================================
   CANCEL BILL
====================================================== */

/**
 * Cancel / soft-delete a bill.
 *
 * IMPORTANT:
 *
 * This does NOT physically delete
 * the billing record.
 *
 * Backend:
 *
 * POST /api/billing/:id/cancel
 *
 * The bill remains available for:
 *
 * - Reports
 * - Audit
 * - History
 * - Management review
 */
export const cancelBill = (
  id
) => {

  if (!id) {
    return Promise.reject(
      new Error(
        "Bill ID is required."
      )
    );
  }

  return billingRequest.post(
    `${API}/${id}/cancel`
  );
};

/* ======================================================
   DAILY REPORT
====================================================== */

/**
 * Get daily billing report.
 *
 * Example:
 *
 * getDailyReport({
 *   date: "2026-08-18",
 *   store_id: 1
 * });
 *
 * Returns:
 *
 * summary
 * details
 */
export const getDailyReport = (
  params = {}
) =>
  billingRequest.get(
    `${API}/reports/daily`,
    {
      params,
    }
  );

/* ======================================================
   BILLING AUDIT
====================================================== */

/**
 * Get audit history for a bill.
 *
 * Example:
 *
 * getBillingAudit(15);
 *
 * Returns:
 *
 * CREATE
 * UPDATE
 * CANCEL
 *
 * together with:
 *
 * - Changed By
 * - Old Data
 * - New Data
 * - Date
 * - Time
 */
export const getBillingAudit = (
  id
) => {

  if (!id) {
    return Promise.reject(
      new Error(
        "Bill ID is required."
      )
    );
  }

  return billingRequest.get(
    `${API}/audit/${id}`
  );
};

/* ======================================================
   STORES
====================================================== */

/**
 * Get available stores.
 *
 * Billing uses the existing
 * Stores API.
 *
 * IMPORTANT:
 *
 * The Stores API may return data in
 * different formats depending on the
 * backend response.
 *
 * Supported formats:
 *
 * 1. { success: true, data: [...] }
 * 2. { data: [...] }
 * 3. { stores: [...] }
 * 4. [...]
 *
 * We normalize all of them into:
 *
 * response.data.data = [...]
 *
 * while still returning the normal
 * Axios response object.
 */
export const getStores = async () => {

  const response =
    await billingRequest.get(
      "/api/stores"
    );

  console.log(
    "[Billing API] Stores response:",
    response.data
  );

  /* ====================================================
     NORMALIZE STORE DATA
  ==================================================== */

  let stores = [];

  /*
   * Format:
   *
   * {
   *   success: true,
   *   data: [...]
   * }
   */
  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    stores =
      response.data.data;
  }

  /*
   * Format:
   *
   * {
   *   stores: [...]
   * }
   */
  else if (
    Array.isArray(
      response?.data?.stores
    )
  ) {
    stores =
      response.data.stores;
  }

  /*
   * Format:
   *
   * [...]
   */
  else if (
    Array.isArray(
      response?.data
    )
  ) {
    stores =
      response.data;
  }

  /*
   * Safety fallback
   */
  else {
    stores = [];
  }

  /* ====================================================
     NORMALIZED RESPONSE
  ==================================================== */

  response.data = {
    ...(response.data &&
    typeof response.data ===
      "object" &&
    !Array.isArray(
      response.data
    )
      ? response.data
      : {}),

    data: stores,
  };

  console.log(
    "[Billing API] Normalized stores:",
    stores
  );

  return response;
};

/* ======================================================
   OPTIONAL DEFAULT EXPORT
====================================================== */

const billingService = {
  getBills,
  getBill,
  createBill,
  updateBill,
  cancelBill,
  getDailyReport,
  getBillingAudit,
  getStores,
};

export default billingService;
import axios from "axios";

/* ======================================================
   BILLING API
====================================================== */

const API = "/api/billing";

/* ======================================================
   BILLS
====================================================== */

/**
 * Get all billing transactions
 *
 * Supported params can include:
 * - search
 * - store_id
 * - status
 * - payment_type
 * - date
 * - page
 * - limit
 */
export const getBills = (params = {}) =>
  axios.get(API, {
    params,
  });

/**
 * Get one bill by ID
 */
export const getBill = (id) =>
  axios.get(`${API}/${id}`);

/**
 * Create a new bill
 */
export const createBill = (data) =>
  axios.post(API, data);

/**
 * Update an existing bill
 */
export const updateBill = (
  id,
  data
) =>
  axios.put(
    `${API}/${id}`,
    data
  );

/**
 * Cancel / soft-delete a bill
 *
 * IMPORTANT:
 * This should NOT physically delete the
 * billing record because billing records
 * need to remain available for audit.
 */
export const cancelBill = (id) =>
  axios.post(
    `${API}/${id}/cancel`
  );

/* ======================================================
   DAILY REPORT
====================================================== */

/**
 * Get daily billing report
 *
 * Example:
 *
 * getDailyReport({
 *   date: "2026-08-18",
 *   store_id: 1
 * })
 */
export const getDailyReport = (
  params = {}
) =>
  axios.get(
    `${API}/reports/daily`,
    {
      params,
    }
  );

/* ======================================================
   AUDIT
====================================================== */

/**
 * Get audit history for a specific bill
 *
 * Example:
 *
 * getBillingAudit(15)
 */
export const getBillingAudit = (
  id
) =>
  axios.get(
    `${API}/audit/${id}`
  );

/* ======================================================
   STORES
====================================================== */

/**
 * Get available stores
 */
export const getStores = () =>
  axios.get("/api/stores");
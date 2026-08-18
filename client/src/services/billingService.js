import "../axiosConfig";
import axios from "axios";

/* ======================================================
   MIARCUS BILLING API SERVICE
====================================================== */

const API = "/api/billing";
const REQUEST_TIMEOUT = 30000;

/* ======================================================
   HELPERS
====================================================== */

const requestConfig = (extra = {}) => ({
  timeout: REQUEST_TIMEOUT,
  ...extra,
});

const requireId = (id, label = "Bill ID") => {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    return Promise.reject(
      new Error(`${label} is required.`)
    );
  }

  return null;
};

/* ======================================================
   BILLS
====================================================== */

export const getBills = (params = {}) =>
  axios.get(
    API,
    requestConfig({ params })
  );

export const getBill = (id) => {
  const error = requireId(id);

  if (error) {
    return error;
  }

  return axios.get(
    `${API}/${id}`,
    requestConfig()
  );
};

export const createBill = (data) => {
  if (!data) {
    return Promise.reject(
      new Error("Billing data is required.")
    );
  }

  return axios.post(
    API,
    data,
    requestConfig()
  );
};

export const updateBill = (id, data) => {
  const error = requireId(id);

  if (error) {
    return error;
  }

  if (!data) {
    return Promise.reject(
      new Error(
        "Billing update data is required."
      )
    );
  }

  return axios.put(
    `${API}/${id}`,
    data,
    requestConfig()
  );
};

export const cancelBill = (id) => {
  const error = requireId(id);

  if (error) {
    return error;
  }

  return axios.post(
    `${API}/${id}/cancel`,
    {},
    requestConfig()
  );
};

/* ======================================================
   DAILY REPORT
====================================================== */

export const getDailyReport = (
  params = {}
) =>
  axios.get(
    `${API}/reports/daily`,
    requestConfig({ params })
  );

/* ======================================================
   BILLING AUDIT
====================================================== */

export const getBillingAudit = (id) => {
  const error = requireId(id);

  if (error) {
    return error;
  }

  return axios.get(
    `${API}/audit/${id}`,
    requestConfig()
  );
};

/* ======================================================
   BILLING STORE LIST
====================================================== */

/*
 * Billing now uses its own store-list endpoint:
 *
 * GET /api/billing/stores
 *
 * This is intentional.
 *
 * It prevents Billing Entry from depending on
 * "Store Management -> View" permission and keeps
 * the Billing module self-contained.
 *
 * The request uses the application's shared Axios
 * configuration from axiosConfig.js, so the existing
 * JWT Authorization header is automatically attached.
 */

export const getStores = () =>
  axios.get(
    `${API}/stores`,
    requestConfig()
  );

/* ======================================================
   DEFAULT EXPORT
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

import axios from "axios";

/* ======================================================
   API
====================================================== */

const api = "/api/sales-team";

/* ======================================================
   EMPLOYEES
====================================================== */

export const getSalesEmployees = (
  search = ""
) =>
  axios.get(
    `${api}/employees`,
    {
      params: {
        search,
      },
    }
  );

/* ======================================================
   STORES
   Uses the current Store Management data
====================================================== */

export const getSalesStores = (
  search = ""
) =>
  axios.get(
    `${api}/stores`,
    {
      params: {
        search,
      },
    }
  );

/* ======================================================
   VISIT PLANNER
====================================================== */

export const getVisitPlans = (
  params = {}
) =>
  axios.get(
    `${api}/visit-plans`,
    {
      params,
    }
  );

export const createVisitPlan = (
  payload
) =>
  axios.post(
    `${api}/visit-plans`,
    payload
  );

export const updateVisitPlan = (
  id,
  payload
) =>
  axios.put(
    `${api}/visit-plans/${id}`,
    payload
  );

export const deleteVisitPlan = (
  id
) =>
  axios.delete(
    `${api}/visit-plans/${id}`
  );

export const deleteAllVisitPlans = () =>
  axios.delete(
    `${api}/visit-plans`
  );

/* ======================================================
   VISIT PLAN BULK IMPORT
====================================================== */

export const importVisitPlans = (
  file
) => {
  const form = new FormData();

  form.append(
    "file",
    file
  );

  return axios.post(
    `${api}/visit-plans/import`,
    form,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );
};

/* ======================================================
   VISIT PLAN EXPORT
====================================================== */

export const exportVisitPlans = (
  params = {}
) =>
  axios.get(
    `${api}/visit-plans/export`,
    {
      params,
      responseType: "blob",
    }
  );

/* ======================================================
   TRAVEL PLAN
====================================================== */

export const getTravelPlans = (
  params = {}
) =>
  axios.get(
    `${api}/travel-plans`,
    {
      params,
    }
  );

/* ======================================================
   ACTUAL STORES
====================================================== */

export const saveActualStores = (
  id,
  storeIds = []
) =>
  axios.put(
    `${api}/travel-plans/${id}/actual-stores`,
    {
      store_ids:
        Array.isArray(storeIds)
          ? storeIds
          : [],
    }
  );

/* ======================================================
   TRAVEL PLAN HISTORY
====================================================== */

export const getTravelPlanHistory = (
  id
) =>
  axios.get(
    `${api}/travel-plans/${id}/history`
  );

/* ======================================================
   TRAVEL PLAN REMARKS
====================================================== */

export const addTravelRemark = (
  id,
  remark = "",
  attachment = null
) => {
  const form =
    new FormData();

  form.append(
    "remark",
    remark || ""
  );

  if (attachment) {
    form.append(
      "attachment",
      attachment
    );
  }

  return axios.post(
    `${api}/travel-plans/${id}/remarks`,
    form,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );
};

/* ======================================================
   DELETE TRAVEL PLAN
====================================================== */

export const deleteTravelPlan = (
  id
) =>
  axios.delete(
    `${api}/travel-plans/${id}`
  );

/* ======================================================
   TRAVEL PLAN APPROVALS
====================================================== */

export const getTravelPlanApprovals =
  () =>
    axios.get(
      `${api}/approvals`
    );

/* ======================================================
   APPROVE
====================================================== */

export const approveTravelPlan = (
  employeeId,
  month
) =>
  axios.post(
    `${api}/approvals/approve`,
    {
      employee_id:
        employeeId,

      month,
    }
  );

/* ======================================================
   REJECT
   Reason is sent to backend.
====================================================== */

export const rejectTravelPlan = (
  employeeId,
  month,
  reason = ""
) =>
  axios.post(
    `${api}/approvals/reject`,
    {
      employee_id:
        employeeId,

      month,

      reason:
        String(reason || "")
          .trim(),
    }
  );

/* ======================================================
   SALES REVIEW
====================================================== */

export const getSalesReview = (
  params = {}
) =>
  axios.get(
    `${api}/sales-review`,
    {
      params,
    }
  );

/* ======================================================
   SALES REVIEW BULK UPLOAD
====================================================== */

export const uploadSalesReview = (
  file
) => {
  const form =
    new FormData();

  form.append(
    "file",
    file
  );

  return axios.post(
    `${api}/sales-review/upload`,
    form
  );
};

/* ======================================================
   DELETE ALL SALES REVIEW
====================================================== */

export const deleteAllSalesReview =
  () =>
    axios.delete(
      `${api}/sales-review`
    );

/* ======================================================
   SALES REVIEW BENCHMARKS
====================================================== */

export const updateSalesBenchmark = (
  payload
) =>
  axios.put(
    `${api}/sales-review/benchmarks`,
    payload
  );

/* ======================================================
   SALES REVIEW EXPORT
====================================================== */

export const exportSalesReview = (
  params = {}
) =>
  axios.get(
    `${api}/sales-review/export`,
    {
      params,
      responseType: "blob",
    }
  );

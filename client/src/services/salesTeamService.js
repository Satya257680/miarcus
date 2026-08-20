import axios from "axios";

const api = "/api/sales-team";

export const getSalesEmployees = (search = "") =>
  axios.get(`${api}/employees`, { params: { search } });

export const getSalesStores = (search = "") =>
  axios.get(`${api}/stores`, { params: { search } });

export const getVisitPlans = (params = {}) =>
  axios.get(`${api}/visit-plans`, { params });

export const createVisitPlan = (payload) =>
  axios.post(`${api}/visit-plans`, payload);

export const updateVisitPlan = (id, payload) =>
  axios.put(`${api}/visit-plans/${id}`, payload);

export const deleteVisitPlan = (id) =>
  axios.delete(`${api}/visit-plans/${id}`);

export const deleteAllVisitPlans = () =>
  axios.delete(`${api}/visit-plans`);

export const importVisitPlans = (file) => {
  const form = new FormData();
  form.append("file", file);

  return axios.post(`${api}/visit-plans/import`, form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const exportVisitPlans = (params = {}) =>
  axios.get(`${api}/visit-plans/export`, {
    params,
    responseType: "blob",
  });

export const getTravelPlans = (params = {}) =>
  axios.get(`${api}/travel-plans`, { params });

export const saveActualStores = (id, storeIds) =>
  axios.put(`${api}/travel-plans/${id}/actual-stores`, {
    store_ids: storeIds,
  });

export const getTravelPlanHistory = (id) =>
  axios.get(`${api}/travel-plans/${id}/history`);

/* ======================================================
   TRAVEL PLAN REMARKS
   ====================================================== */

export const addTravelRemark = (
  id,
  remark = "",
  attachment = null
) => {
  const form = new FormData();

  form.append("remark", remark || "");

  if (attachment) {
    form.append("attachment", attachment);
  }

  return axios.post(
    `${api}/travel-plans/${id}/remarks`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

export const deleteTravelPlan = (id) =>
  axios.delete(`${api}/travel-plans/${id}`);

/* ======================================================
   TRAVEL PLAN APPROVALS
   ====================================================== */

export const getTravelPlanApprovals = () =>
  axios.get(`${api}/approvals`);

export const approveTravelPlan = (employeeId, month) =>
  axios.post(`${api}/approvals/approve`, {
    employee_id: employeeId,
    month,
  });

export const rejectTravelPlan = (
  employeeId,
  month,
  reason = ""
) =>
  axios.post(`${api}/approvals/reject`, {
    employee_id: employeeId,
    month,
    reason,
  });

/* ======================================================
   SALES REVIEW
   ====================================================== */

export const getSalesReview = (params = {}) =>
  axios.get(`${api}/sales-review`, { params });

export const uploadSalesReview = (file) => {
  const form = new FormData();

  form.append("file", file);

  return axios.post(
    `${api}/sales-review/upload`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

export const deleteAllSalesReview = () =>
  axios.delete(`${api}/sales-review`);

export const updateSalesBenchmark = (payload) =>
  axios.put(
    `${api}/sales-review/benchmarks`,
    payload
  );

export const exportSalesReview = (params = {}) =>
  axios.get(`${api}/sales-review/export`, {
    params,
    responseType: "blob",
  });
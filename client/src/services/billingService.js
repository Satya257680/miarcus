import axios from "axios";

const API = "/api/billing";
export const getBills = params => axios.get(API, { params });
export const getBill = id => axios.get(`${API}/${id}`);
export const createBill = data => axios.post(API, data);
export const updateBill = (id, data) => axios.put(`${API}/${id}`, data);
export const cancelBill = id => axios.post(`${API}/${id}/cancel`);
export const getDailyReport = params => axios.get(`${API}/reports/daily`, { params });
export const getBillingAudit = id => axios.get(`${API}/audit/${id}`);
export const getStores = () => axios.get("/api/stores");

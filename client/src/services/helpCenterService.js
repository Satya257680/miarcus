import axios from "../axiosConfig";

const API = "/api/help-center";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

export const getHelpArticles = () => axios.get(`${API}/articles`, auth());
export const getPublicHelpArticles = () => axios.get(`${API}/public/articles`);
export const askPublicZarvis = (question, history = [], language = "auto") => axios.post(`${API}/public/zarvis/ask`, { question, history, language });
export const getHelpArticle = (id) => axios.get(`${API}/articles/${id}`, auth());
export const askZarvis = (question, history = [], language = "auto") => axios.post(`${API}/zarvis/ask`, { question, history, language }, auth());
export const createHelpTicket = (payload) => axios.post(`${API}/tickets`, payload, auth());
export const getMyHelpTickets = () => axios.get(`${API}/tickets`, auth());
export const getHelpTicket = (id) => axios.get(`${API}/tickets/${id}`, auth());
export const replyHelpTicket = (id, message) => axios.post(`${API}/tickets/${id}/reply`, { message }, auth());

export const getAdminHelpArticles = () => axios.get(`${API}/admin/articles`, auth());
export const createAdminHelpArticle = (payload) => axios.post(`${API}/admin/articles`, payload, auth());
export const updateAdminHelpArticle = (id, payload) => axios.put(`${API}/admin/articles/${id}`, payload, auth());
export const deleteAdminHelpArticle = (id) => axios.delete(`${API}/admin/articles/${id}`, auth());
export const getAdminHelpTickets = (status = "all") => axios.get(`${API}/admin/tickets`, { ...auth(), params: { status } });
export const updateAdminHelpTicket = (id, payload) => axios.put(`${API}/admin/tickets/${id}`, payload, auth());

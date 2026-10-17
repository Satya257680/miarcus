import axios, { API_BASE_URL } from "../axiosConfig.js";
const API = `${API_BASE_URL}/api/issue-control-rules`;
const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
export const getIssueRules = async () => (await axios.get(API, cfg())).data;
// Every checklist question with its checklist type and rule state.
export const getIssueRuleQuestions = async () => (await axios.get(`${API}/questions`, cfg())).data;
export const createIssueRule = async (body) => (await axios.post(API, body, cfg())).data;
export const updateIssueRule = async (id, body) => (await axios.put(`${API}/${id}`, body, cfg())).data;
// Activate (1) / deactivate (0) a single rule.
export const setIssueRuleStatus = async (id, isActive) => (await axios.patch(`${API}/${id}/status`, { is_active: isActive ? 1 : 0 }, cfg())).data;
export const deleteIssueRule = async (id) => (await axios.delete(`${API}/${id}`, cfg())).data;
export const deleteAllIssueRules = async () => (await axios.delete(`${API}/delete-all`, cfg())).data;

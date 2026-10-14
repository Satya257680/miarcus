import axios, { API_BASE_URL } from "../axiosConfig.js";
const API = `${API_BASE_URL}/api/issue-control-rules`;
const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
export const getIssueRules = async () => (await axios.get(API, cfg())).data;
export const createIssueRule = async (body) => (await axios.post(API, body, cfg())).data;
export const updateIssueRule = async (id, body) => (await axios.put(`${API}/${id}`, body, cfg())).data;
export const deleteIssueRule = async (id) => (await axios.delete(`${API}/${id}`, cfg())).data;
export const deleteAllIssueRules = async () => (await axios.delete(`${API}/delete-all`, cfg())).data;

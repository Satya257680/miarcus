import axios from "axios";

const API = "http://localhost:5000/api/questions";

// ==========================
// Get All Questions
// ==========================
export const getQuestions = async () => {
  const res = await axios.get(API);
  return res.data;
};

// ==========================
// Get Single Question
// ==========================
export const getQuestionById = async (id) => {
  const res = await axios.get(`${API}/${id}`);
  return res.data;
};

// ==========================
// Create Question
// ==========================
export const createQuestion = async (data) => {
  const res = await axios.post(API, data);
  return res.data;
};

// ==========================
// Update Question
// ==========================
export const updateQuestion = async (id, data) => {
  const res = await axios.put(`${API}/${id}`, data);
  return res.data;
};

// ==========================
// Delete Question
// ==========================
export const deleteQuestion = async (id) => {
  const res = await axios.delete(`${API}/${id}`);
  return res.data;
};

// ==========================
// Delete All Questions
// ==========================
export const deleteAllQuestions = async () => {
  const res = await axios.delete(`${API}/delete-all`);
  return res.data;
};
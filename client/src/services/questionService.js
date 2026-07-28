import axios from "axios";

const API = "http://localhost:5000/api/questions";

// ==============================
// Axios Config
// ==============================

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// ==============================
// Get All Questions
// ==============================

export const getQuestions = async () => {
  const res = await axios.get(API, authConfig());
  return res.data;
};

// ==============================
// Get Question By ID
// ==============================

export const getQuestionById = async (id) => {
  const res = await axios.get(
    `${API}/${id}`,
    authConfig()
  );

  return res.data;
};

// ==============================
// Create Question
// ==============================

export const createQuestion = async (data) => {
  const res = await axios.post(
    API,
    data,
    authConfig()
  );

  return res.data;
};

// ==============================
// Update Question
// ==============================

export const updateQuestion = async (id, data) => {
  const res = await axios.put(
    `${API}/${id}`,
    data,
    authConfig()
  );

  return res.data;
};

// ==============================
// Delete Question
// ==============================

export const deleteQuestion = async (id) => {
  const res = await axios.delete(
    `${API}/${id}`,
    authConfig()
  );

  return res.data;
};

// ==============================
// Delete All Questions
// ==============================

export const deleteAllQuestions = async () => {
  const res = await axios.delete(
    `${API}/delete-all`,
    authConfig()
  );

  return res.data;
};
import axios, { API_BASE_URL } from "../axiosConfig.js";

const API = API_BASE_URL + '/api/users';

// ==============================
// Axios Config
// ==============================

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// ==============================
// Get All Users
// ==============================

export const getUsers = async () => {
  const response = await axios.get(
    API,
    authConfig()
  );

  return response.data;
};

// ==============================
// Get User By ID
// ==============================

export const getUserById = async (id) => {
  const response = await axios.get(
    `${API}/${id}`,
    authConfig()
  );

  return response.data;
};

// ==============================
// Create User
// ==============================

export const createUser = async (data) => {
  const response = await axios.post(
    API,
    data,
    authConfig()
  );

  return response.data;
};

// ==============================
// Update User
// ==============================

export const updateUser = async (id, data) => {
  const response = await axios.put(
    `${API}/${id}`,
    data,
    authConfig()
  );

  return response.data;
};

// ==============================
// Delete User
// ==============================

export const deleteUser = async (id) => {
  const response = await axios.delete(
    `${API}/${id}`,
    authConfig()
  );

  return response.data;
};

// ==============================
// Delete All Users
// ==============================

export const deleteAllUsers = async () => {
  const response = await axios.delete(
    `${API}/delete-all`,
    authConfig()
  );

  return response.data;
};
import axios from "axios";

const API = "http://localhost:5000/api/departments";

// ==============================
// Axios Config
// ==============================

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// ==============================
// Get All Departments
// ==============================

export const getDepartments = async () => {
  const response = await axios.get(
    API,
    authConfig()
  );

  return response.data;
};

// ==============================
// Get Department By ID
// ==============================

export const getDepartmentById = async (id) => {
  const response = await axios.get(
    `${API}/${id}`,
    authConfig()
  );

  return response.data;
};

// ==============================
// Create Department
// ==============================

export const createDepartment = async (data) => {
  const response = await axios.post(
    API,
    data,
    authConfig()
  );

  return response.data;
};

// ==============================
// Update Department
// ==============================

export const updateDepartment = async (id, data) => {
  const response = await axios.put(
    `${API}/${id}`,
    data,
    authConfig()
  );

  return response.data;
};

// ==============================
// Delete Department
// ==============================

export const deleteDepartment = async (id) => {
  const response = await axios.delete(
    `${API}/${id}`,
    authConfig()
  );

  return response.data;
};

// ==============================
// Delete All Departments
// ==============================

export const deleteAllDepartments = async () => {
  const response = await axios.delete(
    `${API}/delete-all`,
    authConfig()
  );

  return response.data;
};
import axios from "axios";

const API = "http://localhost:5000/api/departments";

// Get All Departments
export const getDepartments = async () => {
  const response = await axios.get(API);
  return response.data;
};

// Create Department
export const createDepartment = async (data) => {
  const response = await axios.post(API, data);
  return response.data;
};

// Update Department
export const updateDepartment = async (id, data) => {
  const response = await axios.put(`${API}/${id}`, data);
  return response.data;
};

// Delete Department
export const deleteDepartment = async (id) => {
  const response = await axios.delete(`${API}/${id}`);
  return response.data;
};
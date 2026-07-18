import axios from "axios";

const API = "http://localhost:5000/api/designations";

// Get All Designations
export const getDesignations = async () => {
  const response = await axios.get(API);
  return response.data;
};

// Create Designation
export const createDesignation = async (data) => {
  const response = await axios.post(API, data);
  return response.data;
};

// Update Designation
export const updateDesignation = async (id, data) => {
  const response = await axios.put(`${API}/${id}`, data);
  return response.data;
};

// Delete Designation
export const deleteDesignation = async (id) => {
  const response = await axios.delete(`${API}/${id}`);
  return response.data;
};
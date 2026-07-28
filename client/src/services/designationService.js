import axios from "axios";

const API = "http://localhost:5000/api/designations";

// ==============================
// Axios Config
// ==============================

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// ==============================
// Get All Designations
// ==============================

export const getDesignations = async () => {
  const response = await axios.get(
    API,
    authConfig()
  );

  return response.data;
};

// ==============================
// Get Designation By ID
// ==============================

export const getDesignationById = async (id) => {
  const response = await axios.get(
    `${API}/${id}`,
    authConfig()
  );

  return response.data;
};

// ==============================
// Create Designation
// ==============================

export const createDesignation = async (data) => {
  const response = await axios.post(
    API,
    data,
    authConfig()
  );

  return response.data;
};

// ==============================
// Update Designation
// ==============================

export const updateDesignation = async (id, data) => {
  const response = await axios.put(
    `${API}/${id}`,
    data,
    authConfig()
  );

  return response.data;
};

// ==============================
// Delete Designation
// ==============================

export const deleteDesignation = async (id) => {
  const response = await axios.delete(
    `${API}/${id}`,
    authConfig()
  );

  return response.data;
};

// ==============================
// Delete All Designations
// ==============================

export const deleteAllDesignations = async () => {
  const response = await axios.delete(
    `${API}/delete-all`,
    authConfig()
  );

  return response.data;
};
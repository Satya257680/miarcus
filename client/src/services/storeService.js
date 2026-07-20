import axios from "axios";

const API = "http://localhost:5000/api/stores";

// ==============================
// Get All Stores
// ==============================

export const getStores = async () => {
  const res = await axios.get(API);
  return res.data;
};

// ==============================
// Create Store
// ==============================

export const createStore = async (data) => {
  const res = await axios.post(API, data);
  return res.data;
};

// ==============================
// Update Store
// ==============================

export const updateStore = async (id, data) => {
  const res = await axios.put(`${API}/${id}`, data);
  return res.data;
};

// ==============================
// Delete Store
// ==============================

export const deleteStore = async (id) => {
  const res = await axios.delete(`${API}/${id}`);
  return res.data;
};

// ==============================
// Delete All Stores
// ==============================

export const deleteAllStores = async () => {
  const res = await axios.delete(`${API}/delete-all`);
  return res.data;
};

// ==============================
// Import Stores (CSV)
// ==============================

export const importStores = async (file) => {
  const formData = new FormData();

  formData.append("file", file);

  const res = await axios.post(
    `${API}/import`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
};
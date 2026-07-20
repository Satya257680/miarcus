import axios from "axios";

const API_URL = "http://localhost:5000/api/checklist-types";

// ========================================
// Get All Checklist Types
// ========================================

export const getChecklistTypes = async () => {
  const { data } = await axios.get(API_URL);
  return data;
};

// ========================================
// Get Checklist Type By ID
// ========================================

export const getChecklistTypeById = async (id) => {
  const { data } = await axios.get(`${API_URL}/${id}`);
  return data;
};

// ========================================
// Create Checklist Type
// ========================================

export const createChecklistType = async (payload) => {
  const { data } = await axios.post(API_URL, payload);
  return data;
};

// ========================================
// Update Checklist Type
// ========================================

export const updateChecklistType = async (id, payload) => {
  const { data } = await axios.put(`${API_URL}/${id}`, payload);
  return data;
};

// ========================================
// Delete Checklist Type
// ========================================

export const deleteChecklistType = async (id) => {
  const { data } = await axios.delete(`${API_URL}/${id}`);
  return data;
};

// ========================================
// Delete All Checklist Types
// ========================================

export const deleteAllChecklistTypes = async () => {
  try {
    const response = await axios.delete(`${API_URL}/delete-all`);

    console.log("✅ Delete All Response:", response.data);

    return response.data;
  } catch (err) {
    console.error("❌ Delete All Error");
    console.log("Status:", err.response?.status);
    console.log("URL:", err.config?.url);
    console.log("Response:", err.response?.data);

    throw err;
  }
};

// ========================================
// Export Checklist Types
// ========================================

export const exportChecklistTypes = async () => {
  try {
    const response = await axios.get(`${API_URL}/export`, {
      responseType: "blob",
    });

    return response;
  } catch (err) {
    console.error("❌ Export Error");
    console.log("Status:", err.response?.status);
    console.log("URL:", err.config?.url);
    console.log("Response:", err.response?.data);

    throw err;
  }
};

// ========================================
// Import Checklist Types
// ========================================

export const importChecklistTypes = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await axios.post(
      `${API_URL}/import`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return data;
  } catch (err) {
    console.error("❌ Import Error");
    console.log("Status:", err.response?.status);
    console.log("URL:", err.config?.url);
    console.log("Response:", err.response?.data);

    throw err;
  }
};
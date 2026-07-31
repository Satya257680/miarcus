import axios from "axios";

const API = "http://localhost:5000/api/dashboard";

// ==============================
// Axios Config
// ==============================

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// ==============================
// Get Dashboard Statistics
// ==============================

export const getDashboardStats = async () => {
  const response = await axios.get(
    `${API}/stats`,
    authConfig()
  );

  return response.data;
};
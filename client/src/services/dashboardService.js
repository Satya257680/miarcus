import axios from "axios";

const API = "https://miarcus-backend.onrender.com/api/dashboard";

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

// ==============================
// Get Recent Activities
// ==============================

export const getRecentActivities = async () => {

    const response = await axios.get(

        `${API}/recent-activities`,

        authConfig()

    );

    return response.data;

};
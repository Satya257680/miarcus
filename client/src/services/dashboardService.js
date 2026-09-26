import axios, { API_BASE_URL } from "../axiosConfig.js";

const API = API_BASE_URL + '/api/dashboard';

// ==============================
// Axios Config
// ==============================

const authConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
    },
    // Cache-buster so the dashboard always shows live numbers
    // (never a stale browser / proxy cached response).
    params: { _ts: Date.now() },
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

// ======================================================
// Get NSO Business Summary
// ======================================================

export const getNSOSummary = async () => {
    const response = await axios.get(`${API}/nso-summary`, authConfig());
    return response.data;
};

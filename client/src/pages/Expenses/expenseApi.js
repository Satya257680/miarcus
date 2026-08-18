import axios from "axios";

// Expense API is intentionally independent from the global axiosConfig.
// This makes the Expense module work on Vercel without requiring
// `npm start` or a local backend.
const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const configuredUrl = import.meta.env.VITE_EXPENSE_API_URL?.trim();

const baseURL =
    (configuredUrl || (isLocal
        ? "http://localhost:5000"
        : "https://miarcus-backend.onrender.com"))
        .replace(/\/+$/, "");

const expenseApi = axios.create({
    baseURL,
    withCredentials: false,
    timeout: 120000
});

expenseApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export { baseURL as expenseApiBaseURL };
export default expenseApi;

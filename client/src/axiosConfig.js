import axios from "axios";

// ======================================================
// MIARCUS AXIOS CONFIGURATION
// ======================================================

// Vite environment variable:
//
// Local:
// VITE_API_URL=http://localhost:5000
//
// Production:
// VITE_API_URL=https://miarcus-backend.onrender.com
//
// IMPORTANT:
// Do NOT add /api here.
// API routes already contain /api/...
// ======================================================

const API_URL =
    import.meta.env.VITE_API_URL?.trim() ||
    "http://localhost:5000";

// Remove accidental trailing slash
const cleanApiUrl = API_URL.replace(/\/+$/, "");

console.log("==============================================");
console.log("MIARCUS FRONTEND API CONFIGURATION");
console.log("API URL :", cleanApiUrl);
console.log("MODE    :", import.meta.env.MODE);
console.log("==============================================");

// ======================================================
// AXIOS DEFAULT CONFIG
// ======================================================

axios.defaults.baseURL = cleanApiUrl;

// Do not send browser cookies.
// Authentication is handled using JWT in localStorage.
axios.defaults.withCredentials = false;

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
//
// Adds JWT token automatically to protected requests.
//
// Login and Forgot Password do not have a token,
// therefore Authorization will simply not be added.
// ======================================================

axios.interceptors.request.use(
    (config) => {

        const token =
            localStorage.getItem("token");

        if (token) {

            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================
//
// 401 means:
// - JWT expired
// - JWT invalid
// - User deactivated
// - Protected session expired
//
// IMPORTANT:
// We do NOT logout for 400, 403, 404 or 500.
// ======================================================

axios.interceptors.response.use(
    (response) => {

        return response;
    },

    (error) => {

        const status =
            error.response?.status;

        // --------------------------------------------------
        // 401 UNAUTHORIZED
        // --------------------------------------------------

        if (status === 401) {

            const message =
                error.response?.data?.message ||
                "Your session has expired. Please login again.";

            // Avoid repeatedly showing alerts
            // during multiple failed API requests.
            const alreadyOnLoginPage =
                window.location.pathname === "/" ||
                window.location.pathname === "/login";

            if (!alreadyOnLoginPage) {
                alert(message);
            }

            // ----------------------------------------------
            // CLEAR LOCAL STORAGE
            // ----------------------------------------------

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("permissions");
            localStorage.removeItem("userId");
            localStorage.removeItem("userName");
            localStorage.removeItem("employeeId");
            localStorage.removeItem("email");
            localStorage.removeItem("departmentId");
            localStorage.removeItem("profilePhoto");

            // ----------------------------------------------
            // CLEAR SESSION STORAGE
            // ----------------------------------------------

            sessionStorage.clear();

            // ----------------------------------------------
            // REDIRECT LOGIN
            // ----------------------------------------------

            if (!alreadyOnLoginPage) {

                window.location.replace("/");
            }
        }

        return Promise.reject(error);
    }
);

// ======================================================
// EXPORT
// ======================================================

export default axios;
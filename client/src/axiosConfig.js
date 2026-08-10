import axios from "axios";

// ======================================================
// AXIOS CONFIGURATION
// ======================================================
//
// Vite environment variable:
//
// Local development:
// VITE_API_URL=http://localhost:5000
//
// Vercel production:
// VITE_API_URL=https://miarcus-backend.onrender.com
//
// ======================================================

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    console.error(
        "❌ VITE_API_URL is not configured. " +
        "Please add VITE_API_URL to your .env file or Vercel Environment Variables."
    );
}

// ======================================================
// SET AXIOS BASE URL
// ======================================================

axios.defaults.baseURL = API_URL;

// ======================================================
// DEFAULT HEADERS
// ======================================================

axios.defaults.headers.common["Accept"] = "application/json";

// ======================================================
// SEND JWT TOKEN WITH EVERY REQUEST
// ======================================================

axios.interceptors.request.use(
    (config) => {

        const token = localStorage.getItem("token");

        if (token) {

            config.headers = config.headers || {};

            config.headers.Authorization = `Bearer ${token}`;
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
// Automatically logs the user out when backend returns
// HTTP 401 Unauthorized.
//
// ======================================================

axios.interceptors.response.use(

    // --------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------

    (response) => {
        return response;
    },

    // --------------------------------------------------
    // ERROR RESPONSE
    // --------------------------------------------------

    (error) => {

        // ==============================================
        // 401 - UNAUTHORIZED
        // ==============================================

        if (error.response?.status === 401) {

            const message =
                error.response?.data?.message ||
                "Your session has expired. Please login again.";

            alert(message);

            // ------------------------------------------
            // CLEAR LOCAL STORAGE
            // ------------------------------------------

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("permissions");
            localStorage.removeItem("userId");
            localStorage.removeItem("userName");
            localStorage.removeItem("employeeId");
            localStorage.removeItem("email");
            localStorage.removeItem("departmentId");
            localStorage.removeItem("profilePhoto");

            // ------------------------------------------
            // CLEAR SESSION STORAGE
            // ------------------------------------------

            sessionStorage.clear();

            // ------------------------------------------
            // REDIRECT TO LOGIN
            // ------------------------------------------

            window.location.href = "/";
        }

        // ------------------------------------------
        // RETURN ERROR TO CALLING COMPONENT
        // ------------------------------------------

        return Promise.reject(error);
    }
);

// ======================================================
// EXPORT AXIOS
// ======================================================

export default axios;
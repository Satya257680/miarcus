import axios from "axios";

// ======================================================
// AXIOS DEFAULT CONFIG
// ======================================================

axios.defaults.baseURL = "http://localhost:5000";

// ======================================================
// SEND JWT TOKEN IN EVERY REQUEST
// ======================================================

axios.interceptors.request.use(

    (config) => {

        const token = localStorage.getItem("token");

        if (token) {

            config.headers.Authorization = `Bearer ${token}`;

        }

        return config;

    },

    (error) => {

        return Promise.reject(error);

    }

);

// ======================================================
// AUTO LOGOUT IF USER IS DEACTIVATED
// ======================================================

axios.interceptors.response.use(

    (response) => response,

    (error) => {

        if (error.response?.status === 401) {

            // Show message received from backend
            alert(

                error.response?.data?.message ||

                "Your session has expired."

            );

            // Clear Local Storage
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("permissions");
            localStorage.removeItem("userId");
            localStorage.removeItem("userName");
            localStorage.removeItem("employeeId");
            localStorage.removeItem("email");
            localStorage.removeItem("departmentId");
            localStorage.removeItem("profilePhoto");

            // Clear Session Storage
            sessionStorage.clear();

            // Redirect to Login
            window.location.href = "/";

        }

        return Promise.reject(error);

    }

);

export default axios;
import axios from "axios";

// ======================================================
// MIARCUS AXIOS CONFIGURATION
// ======================================================
//
// Normal API requests:
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


// ======================================================
// MAIN API URL
// ======================================================

const API_URL =
    import.meta.env.VITE_API_URL?.trim() ||
    "https://miarcus-backend.onrender.com";


// Remove accidental trailing slash
const cleanApiUrl =
    API_URL.replace(/\/+$/, "");

// Canonical API origin used by modules instead of hard-coded deployment URLs.
const API_BASE_URL = cleanApiUrl;


// ======================================================
// QUIZ API URL
// ======================================================
//
// Quiz module is forced to use the deployed backend.
//
// This prevents Quiz requests from accidentally going
// to localhost while the rest of the application keeps
// using the normal API configuration.
//
// If VITE_QUIZ_API_URL exists, it will be used.
// Otherwise Render backend is used.
// ======================================================

const QUIZ_API_URL =
    import.meta.env.VITE_QUIZ_API_URL?.trim() ||
    cleanApiUrl;

const cleanQuizApiUrl =
    QUIZ_API_URL.replace(/\/+$/, "");


// ======================================================
// DEBUG INFORMATION
// ======================================================

console.log(
    "=============================================="
);

console.log(
    "MIARCUS FRONTEND API CONFIGURATION"
);

console.log(
    "MAIN API URL  :",
    cleanApiUrl
);

console.log(
    "QUIZ API URL  :",
    cleanQuizApiUrl
);

console.log(
    "MODE          :",
    import.meta.env.MODE
);

console.log(
    "=============================================="
);


// ======================================================
// AXIOS DEFAULT CONFIG
// ======================================================
//
// All normal application APIs continue using the
// existing VITE_API_URL configuration.
//
// Example:
//
// /api/users
// /api/stores
// /api/departments
// /api/action-points
// /api/checklists
//
// etc.
// ======================================================

axios.defaults.baseURL =
    cleanApiUrl;


// Do not send browser cookies.
// Authentication is handled using JWT.
axios.defaults.withCredentials =
    false;


// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
//
// Automatically:
//
// 1. Adds JWT token
// 2. Detects Quiz requests
// 3. Sends Quiz requests to Render
//
// Quiz examples:
//
// /api/quiz
// /api/quiz/1
// /api/quiz/1/questions
// /api/quiz/public/ABC123
// /api/quiz/public/ABC123/start
// /api/quiz/public/session/XYZ/submit
// /api/quiz/email/send
// /api/quiz/reports
//
// All of them are routed to:
//
// https://miarcus-backend.onrender.com
//
// Other modules continue using:
//
// VITE_API_URL
// ======================================================

axios.interceptors.request.use(

    (config) => {

        // ==================================================
        // REQUEST URL
        // ==================================================

        const requestUrl =
            String(
                config.url || ""
            ).trim();


        // ==================================================
        // CHECK WHETHER THIS IS A QUIZ REQUEST
        // ==================================================

        const isQuizRequest =
            requestUrl === "/api/quiz" ||
            requestUrl.startsWith(
                "/api/quiz/"
            ) ||
            requestUrl === "api/quiz" ||
            requestUrl.startsWith(
                "api/quiz/"
            );


        // ==================================================
        // QUIZ BASE URL
        // ==================================================

        if (isQuizRequest) {

            config.baseURL =
                cleanQuizApiUrl;

        } else {

            // ==================================================
            // NORMAL API BASE URL
            // ==================================================

            config.baseURL =
                cleanApiUrl;
        }


        // ==================================================
        // JWT TOKEN
        // ==================================================

        const token =
            localStorage.getItem(
                "token"
            );


        if (token) {

            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }


        // ==================================================
        // DEBUG
        // ==================================================

        if (isQuizRequest) {

            console.log(
                "QUIZ API REQUEST:",
                `${config.baseURL}${requestUrl}`
            );

        }


        return config;
    },


    (error) => {

        return Promise.reject(
            error
        );
    }
);


// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================
//
// 401 means:
//
// - JWT expired
// - JWT invalid
// - User deactivated
// - Protected session expired
//
// IMPORTANT:
// We do NOT logout for:
//
// 400
// 403
// 404
// 500
//
// ======================================================

axios.interceptors.response.use(

    (response) => {

        return response;
    },


    (error) => {

        const status =
            error.response?.status;


        // ==================================================
        // 401 UNAUTHORIZED
        // ==================================================

        if (status === 401) {

            const message =
                error.response?.data?.message ||
                "Your session has expired. Please login again.";


            // ==================================================
            // CHECK LOGIN PAGE
            // ==================================================

            const alreadyOnLoginPage =
                window.location.pathname === "/" ||
                window.location.pathname === "/login";


            // ==================================================
            // SHOW MESSAGE
            // ==================================================

            if (!alreadyOnLoginPage) {

                alert(
                    message
                );
            }


            // ==================================================
            // CLEAR LOCAL STORAGE
            // ==================================================

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user"
            );

            localStorage.removeItem(
                "permissions"
            );

            localStorage.removeItem(
                "userId"
            );

            localStorage.removeItem(
                "userName"
            );

            localStorage.removeItem(
                "employeeId"
            );

            localStorage.removeItem(
                "email"
            );

            localStorage.removeItem(
                "departmentId"
            );

            localStorage.removeItem(
                "profilePhoto"
            );


            // ==================================================
            // CLEAR SESSION STORAGE
            // ==================================================

            sessionStorage.clear();


            // ==================================================
            // REDIRECT LOGIN
            // ==================================================

            if (!alreadyOnLoginPage) {

                window.location.replace(
                    "/"
                );
            }
        }


        return Promise.reject(
            error
        );
    }
);


// ======================================================
// EXPORT
// ======================================================

export { API_BASE_URL, cleanApiUrl, cleanQuizApiUrl };

export default axios;
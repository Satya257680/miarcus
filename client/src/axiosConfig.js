import axios from "axios";

// ======================================================
// MIARCUS AXIOS CONFIGURATION
// ======================================================
//
// Production server:
// https://rytual2.miarcus.com
//
// Backend is running internally on:
// http://127.0.0.1:5000
//
// IIS reverse proxy handles:
//
// https://rytual2.miarcus.com/api/*
//              ↓
// http://127.0.0.1:5000/api/*
//
// IMPORTANT:
// Do NOT add /api to the base URL here.
// API routes already contain /api/...
// ======================================================


// ======================================================
// MAIN API URL
// ======================================================
//
// Local development:
// VITE_API_URL=http://localhost:5000
//
// Production:
// VITE_API_URL=https://rytual2.miarcus.com
//
// If VITE_API_URL is not configured,
// the production MIARCUS server is used.
// ======================================================

const API_URL =
    import.meta.env.VITE_API_URL?.trim() ||
    "https://rytual2.miarcus.com";


// ======================================================
// REMOVE ACCIDENTAL TRAILING SLASH
// ======================================================

const cleanApiUrl =
    API_URL.replace(/\/+$/, "");


// ======================================================
// CANONICAL API BASE URL
// ======================================================

const API_BASE_URL =
    cleanApiUrl;


// ======================================================
// QUIZ API URL
// ======================================================
//
// Quiz requests use VITE_QUIZ_API_URL if configured.
//
// Otherwise they use the same MIARCUS production
// server as the normal API.
//
// Example:
//
// /api/quiz
// /api/quiz/1
// /api/quiz/1/questions
// /api/quiz/public/ABC123
//
// All requests are routed through IIS:
//
// https://rytual2.miarcus.com/api/quiz/...
//
// IIS then forwards them internally to:
//
// http://127.0.0.1:5000/api/quiz/...
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
// All normal application APIs use the MIARCUS server.
//
// Examples:
//
// /api/users
// /api/stores
// /api/departments
// /api/action-points
// /api/checklists
// /api/questions
// /api/reports
//
// Final URLs become:
//
// https://rytual2.miarcus.com/api/users
// https://rytual2.miarcus.com/api/stores
// etc.
// ======================================================

axios.defaults.baseURL =
    cleanApiUrl;


// ======================================================
// COOKIE CONFIGURATION
// ======================================================
//
// Authentication is handled using JWT.
// Browser cookies are not required.
// ======================================================

axios.defaults.withCredentials =
    false;


// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
//
// Automatically:
//
// 1. Detects Quiz requests
// 2. Selects the correct API base URL
// 3. Adds JWT token when available
//
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
        // SELECT API BASE URL
        // ==================================================

        if (isQuizRequest) {

            config.baseURL =
                cleanQuizApiUrl;

        } else {

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
        // DEBUG INFORMATION
        // ==================================================

        console.log(
            "MIARCUS API REQUEST:",
            `${config.baseURL}${requestUrl}`
        );


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
// We do NOT automatically logout for:
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
            // REDIRECT TO LOGIN
            // ==================================================

            if (!alreadyOnLoginPage) {

                window.location.replace(
                    "/login"
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

export {
    API_BASE_URL,
    cleanApiUrl,
    cleanQuizApiUrl
};

export default axios;
import axios from "axios";

// ======================================================
// MIARCUS AXIOS CONFIGURATION
// ======================================================
//
// Production:
// https://rytual2.miarcus.com
//
// Backend:
// http://127.0.0.1:5000
//
// IIS reverse proxy:
//
// https://rytual2.miarcus.com/api/*
//              ↓
// http://127.0.0.1:5000/api/*
//
// IMPORTANT:
// API_BASE_URL must NOT contain /api.
// ======================================================


// ======================================================
// MAIN API URL
// ======================================================

const API_URL =
    import.meta.env.VITE_API_URL?.trim() ||
    "https://rytual2.miarcus.com";


// ======================================================
// REMOVE TRAILING SLASHES
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

axios.defaults.baseURL =
    cleanApiUrl;

axios.defaults.withCredentials =
    false;


// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
//
// This interceptor prevents accidental URLs such as:
//
// https://rytual2.miarcus.comhttps://rytual2.miarcus.com/api/auth/login
//
// It converts full MIARCUS URLs into relative API paths:
//
// https://rytual2.miarcus.com/api/auth/login
//
// becomes:
//
// /api/auth/login
//
// Axios then combines it with:
//
// https://rytual2.miarcus.com
//
// Result:
//
// https://rytual2.miarcus.com/api/auth/login
// ======================================================

axios.interceptors.request.use(

    (config) => {

        // ==================================================
        // GET REQUEST URL
        // ==================================================

        let requestUrl =
            String(
                config.url || ""
            ).trim();


        // ==================================================
        // REMOVE ACCIDENTAL DUPLICATED DOMAIN
        // ==================================================
        //
        // Handles:
        //
        // https://rytual2.miarcus.comhttps://rytual2.miarcus.com/api/auth/login
        //
        // Converts to:
        //
        // https://rytual2.miarcus.com/api/auth/login
        // ==================================================

        const duplicatedDomain =
            `${cleanApiUrl}${cleanApiUrl}`;

        if (
            requestUrl.startsWith(
                duplicatedDomain
            )
        ) {

            requestUrl =
                requestUrl.substring(
                    cleanApiUrl.length
                );

        }


        // ==================================================
        // CONVERT FULL MIARCUS URL TO RELATIVE URL
        // ==================================================
        //
        // If another part of the application sends:
        //
        // https://rytual2.miarcus.com/api/auth/login
        //
        // convert it to:
        //
        // /api/auth/login
        //
        // This prevents baseURL duplication.
        // ==================================================

        if (
            requestUrl.startsWith(
                cleanApiUrl
            )
        ) {

            requestUrl =
                requestUrl.substring(
                    cleanApiUrl.length
                );

        }


        // ==================================================
        // MAKE SURE API PATH STARTS WITH /
        // ==================================================

        if (
            requestUrl &&
            !requestUrl.startsWith("/") &&
            !requestUrl.startsWith("http://") &&
            !requestUrl.startsWith("https://")
        ) {

            requestUrl =
                `/${requestUrl}`;

        }


        // ==================================================
        // SAVE NORMALIZED URL
        // ==================================================

        config.url =
            requestUrl;


        // ==================================================
        // CHECK QUIZ REQUEST
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
            `${config.baseURL}${config.url}`
        );


        // ==================================================
        // RETURN CONFIG
        // ==================================================

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
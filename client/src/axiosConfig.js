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

// Development builds only: production must not print the deployment
// topology (API hosts) into every user's browser console.
if (import.meta.env.DEV) {

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

}


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

        // Request URLs can contain ?token= values, so they are only
        // logged in development builds, with the query string removed.
        if (import.meta.env.DEV) {
            console.debug(
                "MIARCUS API REQUEST:",
                `${config.baseURL || ""}${String(config.url || "").split("?")[0]}`
            );
        }


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
//
// Several requests usually fail with 401 at the same moment when a
// session expires (dashboard widgets, notifications, chat polling …).
// Handle the expiry ONCE per page load: one message, one cleanup, one
// redirect — instead of a stack of alert() boxes and racing redirects.

let sessionExpiryHandled = false;


// ======================================================
// TRANSIENT NETWORK / GATEWAY RETRY
// ======================================================
//
// Store connections drop for a moment now and then (DevTools:
// ERR_CONNECTION_RESET, ERR_HTTP2_PROTOCOL_ERROR, or a 502/503/504
// from the IIS reverse proxy while the API restarts). A READ request
// that failed that way is simply sent again — up to 2 more times,
// after ~0.6 s and ~1.5 s (with jitter).
//
// Never retried automatically:
//   • POST / PUT / PATCH / DELETE (could create duplicates) — unless
//     the caller opts in with `retryOnNetworkError: true` and makes the
//     request idempotent itself (see LocationTrackingGate.jsx)
//   • requests the app cancelled, or that hit their own timeout
//   • real answers such as 400 / 401 / 403 / 404 / 500
//   • anything with `noRetry: true` in its config
// ======================================================

const RETRY_STATUSES = new Set([502, 503, 504]);
const SAFE_METHODS = new Set(["get", "head", "options"]);
const MAX_RETRIES = 2;

const isTransientFailure = (error) => {
    if (axios.isCancel?.(error) || error?.code === "ERR_CANCELED") return false;
    // Our own `timeout` fired: the request may still be running on the server.
    if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") return false;

    const status = error?.response?.status;
    if (status) return RETRY_STATUSES.has(status);

    // No response at all = the connection dropped (reset / protocol error).
    return error?.code === "ERR_NETWORK" || error?.message === "Network Error";
};

const shouldRetry = (error) => {
    const config = error?.config;
    if (!config || config.noRetry) return false;
    if ((config.__miarcusRetryCount || 0) >= MAX_RETRIES) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    if (config.signal?.aborted) return false;

    const method = String(config.method || "get").toLowerCase();
    const allowed =
        SAFE_METHODS.has(method) ||
        (config.retryOnNetworkError === true && !error?.response);

    return allowed && isTransientFailure(error);
};

const retryDelay = (attempt) =>
    Math.round((attempt === 1 ? 600 : 1500) * (0.75 + Math.random() * 0.5));

axios.interceptors.response.use(

    (response) => {

        return response;

    },


    (error) => {

        if (shouldRetry(error)) {

            const config = error.config;

            config.__miarcusRetryCount =
                (config.__miarcusRetryCount || 0) + 1;

            return new Promise((resolve) =>
                setTimeout(resolve, retryDelay(config.__miarcusRetryCount))
            ).then(() => axios(config));

        }

        const status =
            error.response?.status;


        // ==================================================
        // 401 UNAUTHORIZED
        // ==================================================

        if (status === 401 && !sessionExpiryHandled) {

            const message =
                error.response?.data?.message ||
                "Your session has expired. Please login again.";


            // ==================================================
            // CHECK LOGIN PAGE
            // ==================================================

            const alreadyOnLoginPage =
                window.location.pathname === "/login";

            // Only lock the handler when we are actually leaving the page;
            // on the login page itself a 401 (wrong password) must keep
            // working normally for the next attempt.
            if (!alreadyOnLoginPage) {
                sessionExpiryHandled = true;
            }


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
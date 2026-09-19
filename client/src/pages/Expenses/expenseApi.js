import axios from "../../axiosConfig.js";

// Expense API is intentionally independent from the global axiosConfig.
// This makes the Expense module work on Vercel without requiring
// `npm start` or a local backend.
const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const configuredUrl = import.meta.env.VITE_EXPENSE_API_URL?.trim();

// ==========================================================
// WHY THIS ISN'T `API_BASE_URL` FROM axiosConfig.js
// ==========================================================
//
// Every Expense page below calls this instance with a path that
// already starts with "/api/..." (e.g. `axios.get("/api/stores")`),
// exactly like every other page in the app does through the global
// axios instance.
//
// On the IIS deployment, `VITE_API_URL` is set to the relative,
// same-origin reverse-proxy prefix "/api" (see axiosConfig.js), so
// `API_BASE_URL` there is literally the string "/api". The global
// axios instance gets away with this because axiosConfig.js attaches
// a request interceptor that detects and strips an accidental
// doubled "/api/api/..." back down to a single "/api/...". That
// interceptor is registered on the default `axios` export only —
// axios interceptors are per-instance, so this separate
// `axios.create(...)` instance never receives it.
//
// The result: baseURL "/api" + a call path of "/api/stores" produced
// "/api/api/stores", which the backend correctly 404s (only
// "/api/stores" exists) — this is exactly what showed up as
// "Store" / "types" / "expenses" 404s and "No active stores are
// available" on the Expense pages in production.
//
// Fixing this here (rather than editing every call site) keeps this
// instance correct however VITE_API_URL is configured: in production,
// with no separate expense API configured, requests are left
// relative to the current page's own origin (baseURL ""), so a call
// path's own "/api/..." prefix is the only one that ever applies —
// the browser/reverse-proxy resolves it the same way every other
// page's "/api/..." request already does.
// ==========================================================

const baseURL =
    (configuredUrl || (isLocal
        ? "http://localhost:5000"
        : ""))
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

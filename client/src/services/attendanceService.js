import axios from "axios";

// ======================================================
// API CONFIGURATION
// ======================================================

const API =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

const BASE_URL = `${API}/api/attendance`;

// ======================================================
// AUTHORIZATION
// ======================================================

const getAuthConfig = () => ({
    headers: {
        Authorization: `Bearer ${
            localStorage.getItem("token") || ""
        }`,
    },
});

// ======================================================
// ATTENDANCE CONTEXT
// ======================================================

export const getAttendanceContext = (date) => {
    return axios
        .get(`${BASE_URL}/context`, {
            ...getAuthConfig(),
            params: {
                date,
            },
        })
        .then((response) => response.data);
};

// ======================================================
// CHECK-IN
// ======================================================

export const checkIn = (formData) => {
    return axios
        .post(`${BASE_URL}/check-in`, formData, {
            ...getAuthConfig(),
            headers: {
                ...getAuthConfig().headers,
                "Content-Type": "multipart/form-data",
            },
        })
        .then((response) => response.data);
};

// ======================================================
// CHECK-OUT
// ======================================================

export const checkOut = (formData) => {
    return axios
        .post(`${BASE_URL}/check-out`, formData, {
            ...getAuthConfig(),
            headers: {
                ...getAuthConfig().headers,
                "Content-Type": "multipart/form-data",
            },
        })
        .then((response) => response.data);
};

// ======================================================
// ATTENDANCE REPORTS
// ======================================================

export const getAttendanceReports = (params) => {
    return axios
        .get(`${BASE_URL}/reports`, {
            ...getAuthConfig(),
            params,
        })
        .then((response) => response.data);
};

// ======================================================
// EMPLOYEES
// ======================================================

export const getAttendanceEmployees = () => {
    return axios
        .get(
            `${BASE_URL}/employees`,
            getAuthConfig()
        )
        .then((response) => response.data);
};

// ======================================================
// STORES
// ======================================================

export const getAttendanceStores = () => {
    return axios
        .get(
            `${BASE_URL}/stores`,
            getAuthConfig()
        )
        .then((response) => response.data);
};
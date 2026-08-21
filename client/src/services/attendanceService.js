import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const BASE_URL = `${API}/api/attendance`;

const getAuthConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
});

export const getAttendanceContext = (date) =>
    axios
        .get(`${BASE_URL}/context`, {
            ...getAuthConfig(),
            params: { date },
        })
        .then((response) => response.data);

export const checkIn = (formData) =>
    axios
        .post(`${BASE_URL}/check-in`, formData, {
            ...getAuthConfig(),
            headers: {
                ...getAuthConfig().headers,
                "Content-Type": "multipart/form-data",
            },
        })
        .then((response) => response.data);

export const checkOut = (formData) =>
    axios
        .post(`${BASE_URL}/check-out`, formData, {
            ...getAuthConfig(),
            headers: {
                ...getAuthConfig().headers,
                "Content-Type": "multipart/form-data",
            },
        })
        .then((response) => response.data);

export const getAttendanceReports = (params) =>
    axios
        .get(`${BASE_URL}/reports`, {
            ...getAuthConfig(),
            params,
        })
        .then((response) => response.data);

export const getAttendanceEmployees = () =>
    axios
        .get(`${BASE_URL}/employees`, getAuthConfig())
        .then((response) => response.data);

export const getAttendanceStores = () =>
    axios
        .get(`${BASE_URL}/stores`, getAuthConfig())
        .then((response) => response.data);

export const deleteAttendanceRecord = (id) =>
    axios
        .delete(`${BASE_URL}/${id}`, getAuthConfig())
        .then((response) => response.data);

export const deleteAllAttendance = () =>
    axios
        .delete(`${BASE_URL}/delete-all`, getAuthConfig())
        .then((response) => response.data);

export const getAttendancePhotoUrl = (photoPath) => {
    if (!photoPath) return "";
    if (/^https?:\/\//i.test(photoPath)) return photoPath;
    return `${API}${photoPath.startsWith("/") ? "" : "/"}${photoPath}`;
};

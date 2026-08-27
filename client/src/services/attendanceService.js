import axios from "axios";

// ======================================================
// API CONFIGURATION
// ======================================================

const API =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

const BASE_URL =
    `${API}/api/attendance`;

// ======================================================
// AUTH CONFIG
// ======================================================

const getAuthConfig = () => ({
    headers: {
        Authorization:
            `Bearer ${localStorage.getItem("token") || ""}`,
    },
});

// ======================================================
// MULTIPART AUTH CONFIG
// ======================================================

const getMultipartConfig = () => ({
    headers: {
        Authorization:
            `Bearer ${localStorage.getItem("token") || ""}`,
    },
});

// ======================================================
// ATTENDANCE CONTEXT
// ======================================================

export const getAttendanceContext = (
    date
) =>
    axios
        .get(
            `${BASE_URL}/context`,
            {
                ...getAuthConfig(),

                params: {
                    date,
                },
            }
        )
        .then(
            (response) =>
                response.data
        );

// ======================================================
// CHECK-IN
// ======================================================
//
// IMPORTANT:
// The frontend does NOT send check-in time.
//
// Backend automatically generates the actual
// India Standard Time timestamp.
//
// FormData should contain:
// - photo
// - latitude
// - longitude
// - accuracy
// - remarks
// ======================================================

export const checkIn = (
    formData
) =>
    axios
        .post(
            `${BASE_URL}/check-in`,
            formData,
            getMultipartConfig()
        )
        .then(
            (response) =>
                response.data
        );

// ======================================================
// CHECK-OUT
// ======================================================
//
// A fresh automatic photo should be included.
//
// Backend generates the actual checkout time.
// ======================================================

export const checkOut = (
    formData
) =>
    axios
        .post(
            `${BASE_URL}/check-out`,
            formData,
            getMultipartConfig()
        )
        .then(
            (response) =>
                response.data
        );

// ======================================================
// ATTENDANCE REPORTS
// ======================================================

export const getAttendanceReports = (
    params = {}
) =>
    axios
        .get(
            `${BASE_URL}/reports`,
            {
                ...getAuthConfig(),
                params,
            }
        )
        .then(
            (response) =>
                response.data
        );

// ======================================================
// EMPLOYEES
// ======================================================

export const getAttendanceEmployees = () =>
    axios
        .get(
            `${BASE_URL}/employees`,
            getAuthConfig()
        )
        .then(
            (response) =>
                response.data
        );

// ======================================================
// STORES
// ======================================================

export const getAttendanceStores = () =>
    axios
        .get(
            `${BASE_URL}/stores`,
            getAuthConfig()
        )
        .then(
            (response) =>
                response.data
        );

// ======================================================
// DELETE SINGLE ATTENDANCE
// ======================================================

export const deleteAttendanceRecord = (
    id
) => {
    if (!id) {
        return Promise.reject(
            new Error(
                "Attendance record ID is required."
            )
        );
    }

    return axios
        .delete(
            `${BASE_URL}/${id}`,
            getAuthConfig()
        )
        .then(
            (response) =>
                response.data
        );
};

// ======================================================
// DELETE ALL ATTENDANCE
// ======================================================

export const deleteAllAttendance = () =>
    axios
        .delete(
            `${BASE_URL}/delete-all`,
            getAuthConfig()
        )
        .then(
            (response) =>
                response.data
        );

// ======================================================
// ATTENDANCE PHOTO ACCESS
// ======================================================
//
// Fetch the protected attendance image with the normal Bearer token and
// expose it to the browser as a temporary object URL. This avoids relying on
// an <img> request being able to send Authorization headers.
//
export const getAttendancePhotoAccess = async (attendanceId, photoType) => {
    if (!attendanceId || !["check-in", "check-out"].includes(photoType)) {
        throw new Error("Invalid attendance photo request.");
    }

    const response = await axios.get(
        `${BASE_URL}/photo/${attendanceId}/${photoType}`,
        {
            ...getAuthConfig(),
            responseType: "blob",
        }
    );

    if (!response.data || response.data.size === 0) {
        throw new Error("Attendance photo is empty.");
    }

    return URL.createObjectURL(response.data);
};

export const getAttendancePhotoDetails = (attendanceId, photoType) =>
    axios
        .get(
            `${BASE_URL}/photo/${attendanceId}/${photoType}/details`,
            getAuthConfig()
        )
        .then(response => response.data);

export const downloadAttendancePhoto = async (attendanceId, photoType, fileName = "attendance-photo.jpg") => {
    const response = await axios.get(
        `${BASE_URL}/photo/${attendanceId}/${photoType}/download`,
        {
            ...getAuthConfig(),
            responseType: "blob",
        }
    );

    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName || "attendance-photo.jpg";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const deleteAttendancePhoto = (attendanceId, photoType) =>
    axios
        .delete(
            `${BASE_URL}/photo/${attendanceId}/${photoType}`,
            getAuthConfig()
        )
        .then(response => response.data);

// ======================================================
// ATTENDANCE PHOTO URL
// ======================================================
//
// Handles:
// 1. Absolute URL
// 2. /uploads/attendance/photo.jpg
// 3. uploads/attendance/photo.jpg
//
// This is used by the Photo View modal.
// ======================================================

export const getAttendancePhotoUrl = (
    photoPath
) => {
    if (!photoPath) {
        return "";
    }

    const value =
        String(photoPath).trim();

    if (!value) {
        return "";
    }

    // Already an absolute URL.
    if (
        /^https?:\/\//i.test(value)
    ) {
        return value;
    }

    const normalizedPath =
        value.startsWith("/")
            ? value
            : `/${value}`;

    return `${API}${normalizedPath}`;
};

// ======================================================
// OPTIONAL HELPER
// ======================================================
//
// Useful when the UI needs to refresh the current
// attendance context after check-in/check-out.
// ======================================================

export const refreshAttendanceContext = () =>
    getAttendanceContext(
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Asia/Kolkata",

                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }
        ).format(
            new Date()
        )
    );
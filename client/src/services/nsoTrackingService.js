import axios from "axios";

// ======================================================
// BASE URL
// ======================================================

const BASE_URL = "https://miarcus-backend.onrender.com/api";

// ======================================================
// AUTH CONFIG
// ======================================================

const authConfig = () => ({
    headers: {
        Authorization:
            `Bearer ${localStorage.getItem("token")}`
    }
});

// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

export const getNSOTracking = (
    search = "",
    page = 1,
    limit = 10
) => {

    return axios.get(
        `${BASE_URL}/nso-tracking`,
        {
            ...authConfig(),

            params: {
                search,
                page,
                limit
            }
        }
    );

};

// ======================================================
// GET NSO TRACKING BY ID
// ======================================================

export const getNSOTrackingById = (id) => {

    return axios.get(
        `${BASE_URL}/nso-tracking/${id}`,
        authConfig()
    );

};

// ======================================================
// GET TRACKING BY STORE OPENING
// ======================================================

export const getTrackingByStoreOpening = (id) => {

    return axios.get(
        `${BASE_URL}/nso-tracking/store/${id}`,
        authConfig()
    );

};


// ======================================================
// GET NSO PROJECT SUMMARY
// ======================================================

export const getNSOProjectSummary = (id) => {
    return axios.get(
        `${BASE_URL}/nso-tracking/store/${id}/summary`,
        authConfig()
    );
};

// ======================================================
// CREATE NSO TRACKING
// ======================================================

export const createNSOTracking = (data) => {

    return axios.post(
        `${BASE_URL}/nso-tracking`,
        data,
        authConfig()
    );

};

// ======================================================
// UPDATE NSO TRACKING
// ======================================================

export const updateNSOTracking = (
    id,
    data
) => {

    return axios.put(
        `${BASE_URL}/nso-tracking/${id}`,
        data,
        authConfig()
    );

};

// ======================================================
// UPDATE NSO TRACKING STATUS
// ======================================================

export const updateNSOTrackingStatus = (
    id,
    status
) => {

    return axios.patch(
        `${BASE_URL}/nso-tracking/status/${id}`,
        {
            status
        },
        authConfig()
    );

};

// ======================================================
// DELETE SINGLE NSO TRACKING
// ======================================================

export const deleteNSOTracking = (id) => {

    return axios.delete(
        `${BASE_URL}/nso-tracking/${id}`,
        authConfig()
    );

};

// ======================================================
// DELETE ALL NSO TRACKING
// ======================================================

export const deleteAllNSOTracking = () => {

    return axios.delete(
        `${BASE_URL}/nso-tracking/delete-all`,
        authConfig()
    );

};

// ======================================================
// EXPORT NSO TRACKING
// ======================================================

export const exportNSOTracking = () => {

    return axios.get(
        `${BASE_URL}/nso-tracking/export`,
        {
            ...authConfig(),

            responseType: "blob"
        }
    );

};

// ======================================================
// IMPORT NSO TRACKING
// ======================================================

export const importNSOTracking = (file) => {

    const formData = new FormData();

    formData.append(
        "file",
        file
    );

    return axios.post(
        `${BASE_URL}/nso-tracking/import`,
        formData,
        {
            headers: {
                Authorization:
                    `Bearer ${localStorage.getItem("token")}`,

                "Content-Type":
                    "multipart/form-data"
            }
        }
    );

};

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
    getNSOTracking,
    getNSOTrackingById,
    getTrackingByStoreOpening,
    getNSOProjectSummary,
    createNSOTracking,
    updateNSOTracking,
    updateNSOTrackingStatus,
    deleteNSOTracking,
    deleteAllNSOTracking,
    exportNSOTracking,
    importNSOTracking
};
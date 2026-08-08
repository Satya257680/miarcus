import axios from "axios";

const API = "https://miarcus-backend.onrender.com/api/activities";

const getToken = () => {
    return localStorage.getItem("token");
};

const headers = () => ({
    Authorization: `Bearer ${getToken()}`
});

// ======================================================
// GET ALL ACTIVITIES
// ======================================================

export const getActivities = (params = {}) => {
    return axios.get(API, {
        headers: headers(),
        params
    });
};

// ======================================================
// GET ACTIVITY BY ID
// ======================================================

export const getActivityById = (id) => {
    return axios.get(`${API}/${id}`, {
        headers: headers()
    });
};

// ======================================================
// GET ACTIVITY DETAILS
// ======================================================

export const getActivityDetails = (id) => {
    return axios.get(`${API}/${id}/details`, {
        headers: headers()
    });
};

// ======================================================
// GET ACTIVITY COMMENTS
// ======================================================

export const getActivityComments = (id) => {
    return axios.get(`${API}/${id}/comments`, {
        headers: headers()
    });
};

// ======================================================
// ADD ACTIVITY COMMENT
// ======================================================

export const addActivityComment = (id, comment) => {
    return axios.post(
        `${API}/${id}/comments`,
        {
            comment
        },
        {
            headers: headers()
        }
    );
};

// ======================================================
// GET ACTIVITY FILES
// ======================================================

export const getActivityFiles = (id) => {
    return axios.get(`${API}/${id}/files`, {
        headers: headers()
    });
};

// ======================================================
// UPLOAD ACTIVITY FILE
// ======================================================

export const uploadActivityFile = (id, file) => {

    const formData = new FormData();

    formData.append("file", file);

    return axios.post(

        `${API}/${id}/files`,

        formData,

        {

            headers: {

                ...headers(),

                "Content-Type": "multipart/form-data"

            }

        }

    );

};

// ======================================================
// DELETE ACTIVITY FILE
// ======================================================

export const deleteActivityFile = (fileId) => {

    return axios.delete(

        `${API}/files/${fileId}`,

        {

            headers: headers()

        }

    );

};

// ======================================================
// GET ACTIVITY NOTIFICATIONS
// ======================================================

export const getActivityNotifications = (id) => {
    return axios.get(`${API}/${id}/notifications`, {
        headers: headers()
    });
};

// ======================================================
// GET ACTIVITY MENTIONS
// ======================================================

export const getActivityMentions = (id) => {
    return axios.get(`${API}/${id}/mentions`, {
        headers: headers()
    });
};

// ======================================================
// GET ACTIVITY TIMELINE
// ======================================================

export const getActivityTimeline = (id) => {
    return axios.get(`${API}/${id}/timeline`, {
        headers: headers()
    });
};
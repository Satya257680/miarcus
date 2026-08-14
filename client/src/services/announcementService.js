import axios from "../axiosConfig";

// ======================================================
// ANNOUNCEMENT API
// ======================================================
//
// Local development:
//   http://localhost:5000
//
// Production:
//   https://miarcus-backend.onrender.com
//
// Announcement intentionally uses its own API base so
// adding this module does not require changing the
// existing modules.
// ======================================================

const API_BASE =
    import.meta.env.VITE_API_URL?.trim() ||
    (import.meta.env.PROD
        ? "https://miarcus-backend.onrender.com"
        : "http://localhost:5000");

const API = `${API_BASE.replace(/\/+$/, "")}/api/announcements`;

// ======================================================
// GET ANNOUNCEMENTS
// ======================================================

const getAll = async (params = {}) => {
    const response = await axios.get(API, {
        params
    });

    return response.data;
};

// ======================================================
// GET USERS
// Used for "Specific Users"
// ======================================================

const getUsers = async (search = "") => {
    const response = await axios.get(`${API}/users`, {
        params: {
            search
        }
    });

    return response.data;
};

// ======================================================
// CREATE ANNOUNCEMENT
// ======================================================

const create = async (formData) => {
    const response = await axios.post(
        API,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
};

// ======================================================
// MARK ANNOUNCEMENT AS READ
// ======================================================

const markRead = async (id) => {
    const response = await axios.put(
        `${API}/${id}/read`
    );

    return response.data;
};

// ======================================================
// GET DELIVERY / READ COUNTS
// ======================================================

const getCounts = async (id) => {
    const response = await axios.get(
        `${API}/${id}/counts`
    );

    return response.data;
};

// ======================================================
// DELETE ANNOUNCEMENT
// ======================================================

const remove = async (id) => {
    const response = await axios.delete(
        `${API}/${id}`
    );

    return response.data;
};

// ======================================================
// EXPORT
// ======================================================

const announcementService = {
    getAll,
    getUsers,
    create,
    markRead,
    getCounts,
    delete: remove
};

export default announcementService;
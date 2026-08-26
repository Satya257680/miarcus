import axios, { API_BASE_URL } from "../axiosConfig.js";

// Announcement API base is isolated so this module works in both
// local development and Vercel/Render production.
const API_BASE =
    import.meta.env.VITE_API_URL?.trim() ||
    (import.meta.env.PROD
        ? API_BASE_URL
        : "http://localhost:5000");

const API = `${API_BASE.replace(/\/+$/, "")}/api/announcements`;

const getAll = async (params = {}) => {
    const response = await axios.get(API, { params });
    return response.data;
};

const getUsers = async (search = "") => {
    const response = await axios.get(`${API}/users`, { params: { search } });
    return response.data;
};

const create = async (formData) => {
    const response = await axios.post(API, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
};

const update = async (id, formData) => {
    const response = await axios.put(`${API}/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
};

const markRead = async (id) => {
    const response = await axios.put(`${API}/${id}/read`);
    return response.data;
};

const getRecipients = async (id) => {
    const response = await axios.get(`${API}/${id}/recipients`);
    return response.data;
};

const getCounts = async (id) => {
    const response = await axios.get(`${API}/${id}/counts`);
    return response.data;
};

const getAttachmentUrl = async (id, download = false) => {
    const response = await axios.get(
        `${API}/${id}/attachment-token`
    );

    const token = encodeURIComponent(
        String(response.data?.token || "")
    );

    if (!token) {
        throw new Error("Unable to authorize announcement attachment");
    }

    // In production, load the actual file through the Vercel /api rewrite.
    // This keeps the browser same-origin and avoids the private Render
    // /uploads endpoint being blocked by browser security headers.
    const base =
        import.meta.env.PROD
            ? window.location.origin
            : API_BASE;

    return `${base}/api/announcements/${encodeURIComponent(
        String(id)
    )}/attachment?token=${token}${
        download ? "&download=1" : ""
    }`;
};

const remove = async (id) => {
    const response = await axios.delete(`${API}/${id}`);
    return response.data;
};

const deleteAll = async () => {
    const response = await axios.delete(`${API}/delete-all`);
    return response.data;
};

const bulkUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API}/bulk-upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return response.data;
};

const exportAnnouncements = async () => {
    return axios.get(`${API}/export`, { responseType: "blob" });
};

const announcementService = {
    getAll,
    getUsers,
    create,
    update,
    getRecipients,
    markRead,
    getCounts,
    getAttachmentUrl,
    delete: remove,
    deleteAll,
    bulkUpload,
    export: exportAnnouncements
};

export default announcementService;

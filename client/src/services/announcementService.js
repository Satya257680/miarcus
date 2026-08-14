import axios from "../axiosConfig";

const announcementService = {
    getAll: async (params = {}) => {
        const response = await axios.get("/api/announcements", { params });
        return response.data;
    },

    getUsers: async (search = "") => {
        const response = await axios.get("/api/announcements/users", {
            params: { search }
        });
        return response.data;
    },

    create: async (formData) => {
        const response = await axios.post("/api/announcements", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    },

    markRead: async (id) => {
        const response = await axios.put(`/api/announcements/${id}/read`);
        return response.data;
    },

    getCounts: async (id) => {
        const response = await axios.get(`/api/announcements/${id}/counts`);
        return response.data;
    },

    delete: async (id) => {
        const response = await axios.delete(`/api/announcements/${id}`);
        return response.data;
    }
};

export default announcementService;

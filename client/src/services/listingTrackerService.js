import axios from "../axiosConfig";

const BASE = "/api/listing-tracker";

export const fetchListingTracker = (params = {}) =>
    axios.get(BASE, { params });

export const fetchListingSummary = (params = {}) =>
    axios.get(`${BASE}/summary`, { params });

export const createListing = (payload) =>
    axios.post(BASE, payload);

export const updateListing = (id, payload) =>
    axios.put(`${BASE}/${id}`, payload);

export const deleteListing = (id) =>
    axios.delete(`${BASE}/${id}`);

export const deleteAllListings = () =>
    axios.delete(BASE);

export const importListings = (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axios.post(`${BASE}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const exportListings = (params = {}) =>
    axios.get(`${BASE}/export`, {
        params,
        responseType: "blob",
    });

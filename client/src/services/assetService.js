import axios from "axios";

const API = "https://miarcus-backend.onrender.com/api/assets";

const authConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
});

export const fetchAssets = async (type, params = {}) => {
    const response = await axios.get(`${API}/${type}`, {
        ...authConfig(),
        params,
    });
    return response.data;
};

export const fetchAssetOptions = async () => {
    const response = await axios.get(`${API}/options`, authConfig());
    return response.data?.data || { departments: [], stores: [] };
};

export const createAsset = async (type, formData) => {
    const response = await axios.post(`${API}/${type}`, formData, {
        ...authConfig(),
        headers: {
            ...authConfig().headers,
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const updateAsset = async (type, id, formData) => {
    const response = await axios.put(`${API}/${type}/${id}`, formData, {
        ...authConfig(),
        headers: {
            ...authConfig().headers,
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const deleteAsset = async (type, id) => {
    const response = await axios.delete(`${API}/${type}/${id}`, authConfig());
    return response.data;
};

export const importAssets = async (type, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API}/${type}/import`, formData, {
        ...authConfig(),
        headers: {
            ...authConfig().headers,
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};

export const exportAssets = async (type, params = {}) => {
    const response = await axios.get(`${API}/${type}/export`, {
        ...authConfig(),
        params,
        responseType: "blob",
    });
    return response.data;
};

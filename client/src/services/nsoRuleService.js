import axios from "axios";

const API = "http://localhost:5000/api/nso-rules";

// ==============================
// Axios Config
// ==============================

const authConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
});

// ==============================
// Get All NSO Rules
// Search + Pagination
// ==============================

export const getRules = async (

    search = "",

    page = 1,

    limit = 10

) => {

    const response = await axios.get(

        API,

        {

            ...authConfig(),

            params: {

                search,

                page,

                limit,

            },

        }

    );

    return response.data;

};

// ==============================
// Get NSO Rule By ID
// ==============================

export const getRuleById = async (id) => {

    const response = await axios.get(

        `${API}/${id}`,

        authConfig()

    );

    return response.data;

};

// ==============================
// Create NSO Rule
// ==============================

export const createRule = async (data) => {

    const response = await axios.post(

        API,

        data,

        authConfig()

    );

    return response.data;

};

// ==============================
// Bulk Upload NSO Rules
// ==============================

export const bulkUploadRules = async (file) => {

    const formData = new FormData();

    formData.append("file", file);

    const response = await axios.post(

        `${API}/bulk-upload`,

        formData,

        {

            headers: {

                Authorization: `Bearer ${localStorage.getItem("token")}`,

                "Content-Type": "multipart/form-data"

            }

        }

    );

    return response.data;

};

// ==============================
// Update NSO Rule
// ==============================

export const updateRule = async (id, data) => {

    const response = await axios.put(

        `${API}/${id}`,

        data,

        authConfig()

    );

    return response.data;

};

// ==============================
// Delete NSO Rule
// ==============================

export const deleteRule = async (id) => {

    const response = await axios.delete(

        `${API}/${id}`,

        authConfig()

    );

    return response.data;

};

// ==============================
// Delete All NSO Rules
// ==============================

export const deleteAllRules = async () => {

    const response = await axios.delete(

        `${API}/delete-all`,

        authConfig()

    );

    return response.data;

};

// ==============================
// Export NSO Rules
// ==============================

export const exportRules = async () => {

    const response = await axios.get(

        `${API}/export`,

        {

            ...authConfig(),

            responseType: "blob",

        }

    );

    return response;

};
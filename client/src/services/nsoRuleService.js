import axios, { API_BASE_URL } from "../axiosConfig.js";

const API = API_BASE_URL + '/api/nso-rules';

// ======================================================
// AUTH CONFIG
// ======================================================

const authConfig = () => ({

    headers: {

        Authorization: `Bearer ${localStorage.getItem("token")}`

    }

});

// ======================================================
// GET ALL NSO RULES
// SEARCH + PAGINATION
// ======================================================

export const getRules = async ({

    search = "",

    page = 1,

    limit = 10

} = {}) => {

    const { data } = await axios.get(

        API,

        {

            ...authConfig(),

            params: {

                search,

                page,

                limit

            }

        }

    );

    return data;

};

// ======================================================
// GET RULE BY ID
// ======================================================

export const getRuleById = async (id) => {

    const { data } = await axios.get(

        `${API}/${id}`,

        authConfig()

    );

    return data;

};

// ======================================================
// CREATE RULE
// ======================================================

export const createRule = async (payload) => {

    const { data } = await axios.post(

        API,

        payload,

        authConfig()

    );

    return data;

};

// ======================================================
// UPDATE RULE
// ======================================================

export const updateRule = async (

    id,

    payload

) => {

    const { data } = await axios.put(

        `${API}/${id}`,

        payload,

        authConfig()

    );

    return data;

};

// ======================================================
// DELETE SINGLE RULE
// ======================================================

export const deleteRule = async (id) => {

    const { data } = await axios.delete(

        `${API}/${id}`,

        authConfig()

    );

    return data;

};

// ======================================================
// DELETE ALL RULES
// ======================================================

export const deleteAllRules = async () => {

    const { data } = await axios.delete(

        `${API}/delete-all`,

        authConfig()

    );

    return data;

};

// ======================================================
// BULK UPLOAD RULES
// ======================================================

export const bulkUploadRules = async (file) => {

    const formData = new FormData();

    formData.append("file", file);

    const { data } = await axios.post(

        `${API}/bulk-upload`,

        formData,

        {

            headers: {

                Authorization: `Bearer ${localStorage.getItem("token")}`,

                "Content-Type": "multipart/form-data"

            }

        }

    );

    return data;

};

// ======================================================
// EXPORT RULES
// ======================================================

export const exportRules = async () => {

    return axios.get(

        `${API}/export`,

        {

            ...authConfig(),

            responseType: "blob"

        }

    );

};
import axios, { API_BASE_URL } from "../axiosConfig.js";

// ======================================================
// BASE URL
// ======================================================

const BASE_URL = API_BASE_URL + '/api';

// ======================================================
// AUTH CONFIG
// ======================================================

const authConfig = () => ({

    headers: {

        Authorization: `Bearer ${localStorage.getItem("token")}`

    }

});

// ======================================================
// GET ALL
// SEARCH + PAGINATION
// ======================================================

export const getNewStoreOpenings = (params) => {

    return axios.get(

        `${BASE_URL}/new-store-openings`,

        {

            ...authConfig(),

            params

        }

    );

};

// ======================================================
// GET BY ID
// ======================================================

export const getNewStoreOpening = (id) => {

    return axios.get(

        `${BASE_URL}/new-store-openings/${id}`,

        authConfig()

    );

};

// ======================================================
// CREATE
// ======================================================

export const createNewStoreOpening = (formData) => {

    return axios.post(

        `${BASE_URL}/new-store-openings`,

        formData,

        authConfig()

    );

};

// ======================================================
// UPDATE
// ======================================================

export const updateNewStoreOpening = (

    id,

    formData

) => {

    return axios.put(

        `${BASE_URL}/new-store-openings/${id}`,

        formData,

        authConfig()

    );

};

// ======================================================
// DELETE
// ======================================================

export const deleteNewStoreOpening = (id) => {

    return axios.delete(

        `${BASE_URL}/new-store-openings/${id}`,

        authConfig()

    );

};

// ======================================================
// DELETE ALL
// ======================================================

// ids (optional): when the list is searched/filtered only these projects are deleted.
export const deleteAllNewStoreOpenings = (ids) => {

    return axios.delete(

        `${BASE_URL}/new-store-openings/delete-all`,

        Array.isArray(ids)
            ? { ...authConfig(), data: { scope: "filtered", ids } }
            : authConfig()

    );

};

// ======================================================
// BULK IMPORT
// ======================================================

export const bulkUploadNewStoreOpenings = async (file) => {

    const formData = new FormData();

    formData.append("file", file);

    const response = await axios.post(

        `${BASE_URL}/new-store-openings/bulk-upload`,

        formData,

        authConfig()

    );

    return response.data;

};

// ======================================================
// EXPORT CSV
// ======================================================

export const exportNewStoreOpenings = (params) => {

    return axios.get(

        `${BASE_URL}/new-store-openings/export`,

        {

            ...authConfig(),

            params,

            responseType: "blob"

        }

    );

};
import axios from "axios";

// ======================================================
// BASE URL
// ======================================================

const BASE_URL = "http://localhost:5000/api";

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

        {

            headers: {

                Authorization: `Bearer ${localStorage.getItem("token")}`,

                "Content-Type": "multipart/form-data"

            }

        }

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

        {

            headers: {

                Authorization: `Bearer ${localStorage.getItem("token")}`,

                "Content-Type": "multipart/form-data"

            }

        }

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

export const deleteAllNewStoreOpenings = () => {

    return axios.delete(

        `${BASE_URL}/new-store-openings/delete-all`,

        authConfig()

    );

};

// ======================================================
// BULK IMPORT
// ======================================================

export const bulkUploadNewStoreOpenings = (formData) => {

    return axios.post(

        `${BASE_URL}/new-store-openings/bulk-upload`,

        formData,

        {

            headers: {

                Authorization: `Bearer ${localStorage.getItem("token")}`,

                "Content-Type": "multipart/form-data"

            }

        }

    );

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
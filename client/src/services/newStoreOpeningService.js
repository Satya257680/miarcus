import axios from "axios";

// ======================================================
// BASE URL
// ======================================================

const BASE_URL = "http://localhost:5000/api";

// ======================================================
// GET ALL
// ======================================================

export const getNewStoreOpenings = (params) => {

    return axios.get(

        `${BASE_URL}/new-store-openings`,

        { params }

    );

};

// ======================================================
// GET BY ID
// ======================================================

export const getNewStoreOpening = (id) => {

    return axios.get(

        `${BASE_URL}/new-store-openings/${id}`

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

                "Content-Type": "multipart/form-data"

            }

        }

    );

};

// ======================================================
// UPDATE
// ======================================================

export const updateNewStoreOpening = (id, formData) => {

    return axios.put(

        `${BASE_URL}/new-store-openings/${id}`,

        formData,

        {

            headers: {

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

        `${BASE_URL}/new-store-openings/${id}`

    );

};

// ======================================================
// EXPORT CSV
// ======================================================

export const exportNewStoreOpenings = (params) => {

    return axios.get(

        `${BASE_URL}/new-store-openings/export`,

        {

            params,

            responseType: "blob"

        }

    );

};
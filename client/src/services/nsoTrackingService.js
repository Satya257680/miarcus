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

        Authorization:
        `Bearer ${localStorage.getItem("token")}`

    }

});


// ======================================================
// GET ALL NSO TRACKING
// SEARCH + PAGINATION
// ======================================================

export const getNSOTracking = (

    search = "",

    page = 1,

    limit = 10

) => {


    return axios.get(

        `${BASE_URL}/nso-tracking`,

        {

            ...authConfig(),

            params: {

                search,

                page,

                limit

            }

        }

    );


};





// ======================================================
// GET BY ID
// ======================================================

export const getNSOTrackingById = (id) => {


    return axios.get(

        `${BASE_URL}/nso-tracking/${id}`,

        authConfig()

    );


};






// ======================================================
// GET BY STORE OPENING
// ======================================================

export const getTrackingByStoreOpening = (id) => {


    return axios.get(

        `${BASE_URL}/nso-tracking/store/${id}`,

        authConfig()

    );


};






// ======================================================
// CREATE NSO TRACKING
// ======================================================

export const createNSOTracking = (data) => {


    return axios.post(

        `${BASE_URL}/nso-tracking`,

        data,

        authConfig()

    );


};







// ======================================================
// UPDATE NSO TRACKING
// ======================================================

export const updateNSOTracking = (

    id,

    data

) => {


    return axios.put(

        `${BASE_URL}/nso-tracking/${id}`,

        data,

        authConfig()

    );


};







// ======================================================
// UPDATE STATUS
// ======================================================

export const updateNSOTrackingStatus = (

    id,

    status

) => {


    return axios.patch(

        `${BASE_URL}/nso-tracking/status/${id}`,

        {

            status

        },

        authConfig()

    );


};







// ======================================================
// DELETE SINGLE
// ======================================================

export const deleteNSOTracking = (id) => {


    return axios.delete(

        `${BASE_URL}/nso-tracking/${id}`,

        authConfig()

    );


};







// ======================================================
// DELETE ALL
// ======================================================

export const deleteAllNSOTracking = () => {


    return axios.delete(

        `${BASE_URL}/nso-tracking/delete-all`,

        authConfig()

    );


};







// ======================================================
// EXPORT CSV
// ======================================================

export const exportNSOTracking = () => {


    return axios.get(

        `${BASE_URL}/nso-tracking/export`,

        {

            ...authConfig(),

            responseType:"blob"

        }

    );


};







// ======================================================
// IMPORT (READY)
// ======================================================

export const importNSOTracking = (file) => {


    const formData = new FormData();


    formData.append(

        "file",

        file

    );



    return axios.post(

        `${BASE_URL}/nso-tracking/import`,

        formData,

        {

            headers: {

                Authorization:
                `Bearer ${localStorage.getItem("token")}`,

                "Content-Type":
                "multipart/form-data"

            }

        }

    );


};
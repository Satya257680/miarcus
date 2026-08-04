import axios from "axios";

const API = "http://localhost:5000/api/designations";

// ======================================================
// AUTH CONFIG
// ======================================================

const authConfig = () => ({

    headers: {

        Authorization: `Bearer ${localStorage.getItem("token")}`

    }

});

// ======================================================
// UPLOAD CONFIG
// ======================================================

const uploadConfig = () => ({

    headers: {

        Authorization: `Bearer ${localStorage.getItem("token")}`

    }

});

// ======================================================
// GET ALL DESIGNATIONS
// ======================================================

export const getDesignations = async () => {

    const response = await axios.get(

        API,

        authConfig()

    );

    return response.data;

};

// ======================================================
// GET DESIGNATION BY ID
// ======================================================

export const getDesignationById = async (id) => {

    const response = await axios.get(

        `${API}/${id}`,

        authConfig()

    );

    return response.data;

};

// ======================================================
// CREATE DESIGNATION
// ======================================================

export const createDesignation = async (designation) => {

    const response = await axios.post(

        API,

        designation,

        authConfig()

    );

    return response.data;

};

// ======================================================
// UPDATE DESIGNATION
// ======================================================

export const updateDesignation = async (id, designation) => {

    const response = await axios.put(

        `${API}/${id}`,

        designation,

        authConfig()

    );

    return response.data;

};

// ======================================================
// DELETE DESIGNATION
// ======================================================

export const deleteDesignation = async (id) => {

    const response = await axios.delete(

        `${API}/${id}`,

        authConfig()

    );

    return response.data;

};

// ======================================================
// DELETE ALL DESIGNATIONS
// ======================================================

export const deleteAllDesignations = async () => {

    const response = await axios.delete(

        `${API}/delete-all`,

        authConfig()

    );

    return response.data;

};

// ======================================================
// EXPORT DESIGNATIONS
// ======================================================

export const exportDesignations = async () => {

    const response = await axios.get(

        `${API}/export`,

        authConfig()

    );

    return response.data;

};

// ======================================================
// BULK UPLOAD DESIGNATIONS
// ======================================================

export const bulkUploadDesignations = async (file) => {

    const formData = new FormData();

    formData.append("file", file);

    const response = await axios.post(

        `${API}/bulk-upload`,

        formData,

        uploadConfig()

    );

    return response.data;

};

// ======================================================
// DOWNLOAD SAMPLE FILE
// ======================================================

export const downloadDesignationSample = () => {

    window.open(

        `${API}/sample`,

        "_blank"

    );

};
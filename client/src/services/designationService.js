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
// MULTIPART CONFIG
// ======================================================

const uploadConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "multipart/form-data"
    }
});

// ======================================================
// GET ALL DESIGNATIONS
// ======================================================

export const getDesignations = async () => {
    try {

        const response = await axios.get(
            API,
            authConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Get Designations Error:", error);

        throw error;

    }
};

// ======================================================
// GET DESIGNATION BY ID
// ======================================================

export const getDesignationById = async (id) => {
    try {

        const response = await axios.get(
            `${API}/${id}`,
            authConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Get Designation Error:", error);

        throw error;

    }
};

// ======================================================
// CREATE DESIGNATION
// ======================================================

export const createDesignation = async (designation) => {
    try {

        const response = await axios.post(
            API,
            designation,
            authConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Create Designation Error:", error);

        throw error;

    }
};

// ======================================================
// UPDATE DESIGNATION
// ======================================================

export const updateDesignation = async (id, designation) => {
    try {

        const response = await axios.put(
            `${API}/${id}`,
            designation,
            authConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Update Designation Error:", error);

        throw error;

    }
};

// ======================================================
// DELETE DESIGNATION
// ======================================================

export const deleteDesignation = async (id) => {
    try {

        const response = await axios.delete(
            `${API}/${id}`,
            authConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Delete Designation Error:", error);

        throw error;

    }
};

// ======================================================
// DELETE ALL DESIGNATIONS
// ======================================================

export const deleteAllDesignations = async () => {
    try {

        const response = await axios.delete(
            `${API}/delete-all`,
            authConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Delete All Designations Error:", error);

        throw error;

    }
};

// ======================================================
// EXPORT DESIGNATIONS
// ======================================================

export const exportDesignations = async () => {
    try {

        const response = await axios.get(
            `${API}/export`,
            authConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Export Designations Error:", error);

        throw error;

    }
};

// ======================================================
// BULK UPLOAD DESIGNATIONS
// ======================================================

export const bulkUploadDesignations = async (formData) => {
    try {

        const response = await axios.post(
            `${API}/bulk-upload`,
            formData,
            uploadConfig()
        );

        return response.data;

    } catch (error) {

        console.error("Bulk Upload Designations Error:", error);

        throw error;

    }
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
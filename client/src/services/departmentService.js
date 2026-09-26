import axios, { API_BASE_URL } from "../axiosConfig.js";

const API = API_BASE_URL + '/api/departments';

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
// GET ALL DEPARTMENTS
// ======================================================

export const getDepartments = async () => {

    const response = await axios.get(

        API,

        authConfig()

    );

    return response.data;

};

// ======================================================
// GET DEPARTMENT BY ID
// ======================================================

export const getDepartmentById = async (id) => {

    const response = await axios.get(

        `${API}/${id}`,

        authConfig()

    );

    return response.data;

};

// ======================================================
// CREATE DEPARTMENT
// ======================================================

export const createDepartment = async (data) => {

    const response = await axios.post(

        API,

        data,

        authConfig()

    );

    return response.data;

};

// ======================================================
// UPDATE DEPARTMENT
// ======================================================

export const updateDepartment = async (id, data) => {

    const response = await axios.put(

        `${API}/${id}`,

        data,

        authConfig()

    );

    return response.data;

};

// ======================================================
// DELETE DEPARTMENT
// ======================================================

export const deleteDepartment = async (id) => {

    const response = await axios.delete(

        `${API}/${id}`,

        authConfig()

    );

    return response.data;

};

// ======================================================
// DELETE ALL DEPARTMENTS
// ======================================================

// ids (optional): when the list is filtered only these departments are deleted.
export const deleteAllDepartments = async (ids) => {

    const response = await axios.delete(

        `${API}/delete-all`,

        Array.isArray(ids)
            ? { ...authConfig(), data: { scope: "filtered", ids } }
            : authConfig()

    );

    return response.data;

};

// ======================================================
// EXPORT DEPARTMENTS
// ======================================================

export const exportDepartments = async () => {

    const response = await axios.get(

        `${API}/export`,

        authConfig()

    );

    return response.data;

};

// ======================================================
// BULK UPLOAD DEPARTMENTS
// ======================================================

export const bulkUploadDepartments = async (file) => {

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

export const downloadDepartmentSample = () => {

    window.open(

        `${API}/sample`,

        "_blank"

    );

};
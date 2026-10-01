import axios from "../axiosConfig.js";

// ======================================================
// GLOBAL BULK UPLOAD API
// Shared by the Bulk Upload modal of every module.
// See server/routes/bulkUploadRoutes.js
// ======================================================

const BASE = "/api/bulk-upload";

export function bulkAuthHeaders() {
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Column definitions of a module (Required Columns table + sample preview).
export async function getBulkModule(moduleKey) {
    const response = await axios.get(`${BASE}/modules/${moduleKey}`, {
        headers: bulkAuthHeaders()
    });
    return response?.data?.data || null;
}

// Column Validation preview — nothing is saved.
export async function inspectBulkFile(moduleKey, file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`${BASE}/modules/${moduleKey}/inspect`, formData, {
        headers: bulkAuthHeaders()
    });
    return response?.data?.data || null;
}

// Downloads the module's sample file ("xlsx" or "csv").
export async function downloadBulkSample(moduleKey, format = "xlsx") {
    const response = await axios.get(`${BASE}/modules/${moduleKey}/sample`, {
        params: { format },
        responseType: "blob",
        headers: bulkAuthHeaders()
    });

    const disposition = response.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match ? match[1] : `${moduleKey}_Sample.${format}`;

    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default {
    getBulkModule,
    inspectBulkFile,
    downloadBulkSample,
    bulkAuthHeaders
};

import axios, { API_BASE_URL } from "../axiosConfig";

// Thin wrapper for the Learning & Development API.
const base = `${API_BASE_URL}/api/lnd`;

export const fullUrl = (path) => (path ? `${API_BASE_URL}${path}` : "");

export const errorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

const get = (path, config) => axios.get(`${base}${path}`, config).then((r) => r.data);
const post = (path, body, config) => axios.post(`${base}${path}`, body, config).then((r) => r.data);
const put = (path, body) => axios.put(`${base}${path}`, body).then((r) => r.data);
const del = (path) => axios.delete(`${base}${path}`).then((r) => r.data);

export const lndApi = {
  // learner
  overview: () => get("/overview"),
  program: (id) => get(`/programs/${id}`),
  module: (id) => get(`/modules/${id}`),
  complete: (id) => post(`/modules/${id}/complete`, {}),
  examStart: (id) => post(`/modules/${id}/exam/start`, {}),
  examSubmit: (attemptId, answers) => post(`/exam/${attemptId}/submit`, { answers }),
  certificate: (programId) => get(`/programs/${programId}/certificate`),
  certificates: () => get("/certificates"),

  // admin
  adminPrograms: () => get("/admin/programs"),
  adminProgram: (id) => get(`/admin/programs/${id}`),
  createProgram: (body) => post("/admin/programs", body),
  updateProgram: (id, body) => put(`/admin/programs/${id}`, body),
  deleteProgram: (id) => del(`/admin/programs/${id}`),
  saveAssignments: (id, assignments) => put(`/admin/programs/${id}/assignments`, { assignments }),
  uploadProgramThumb: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return post(`/admin/programs/${id}/thumb`, form, { timeout: 0 });
  },
  createModule: (body) => post("/admin/modules", body),
  updateModule: (id, body) => put(`/admin/modules/${id}`, body),
  deleteModule: (id) => del(`/admin/modules/${id}`),
  reorderModules: (ids) => put("/admin/modules/reorder", { ids }),
  uploadMedia: (moduleId, files, onProgress) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    return post(`/admin/modules/${moduleId}/media`, form, {
      timeout: 0,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },
  deleteMedia: (id) => del(`/admin/media/${id}`),
  questions: (moduleId) => get(`/admin/modules/${moduleId}/questions`),
  saveQuestions: (moduleId, questions) => put(`/admin/modules/${moduleId}/questions`, { questions }),
  lookups: () => get("/admin/lookups"),
  report: () => get("/admin/report"),
  reportCertificate: (userId, programId) => get(`/admin/report/${userId}/${programId}/certificate`),
  updateReportProgress: (userId, programId, completed) => put(`/admin/report/${userId}/${programId}`, { completed }),
  deleteReportProgress: (userId, programId) => del(`/admin/report/${userId}/${programId}`),
  seed: () => post("/admin/seed", {}),
};

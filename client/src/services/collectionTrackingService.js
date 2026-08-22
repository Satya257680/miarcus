import axios from "axios";

/*
|--------------------------------------------------------------------------
| Collection Tracking API
|--------------------------------------------------------------------------
| All Collection Tracking API communication stays in this service.
| Components should NOT call axios directly.
|--------------------------------------------------------------------------
*/

const API =
  "https://miarcus-backend.onrender.com/api/collection-tracking";

/* =========================================================
   AUTH
========================================================= */

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

/* =========================================================
   FILE UPLOAD AUTH
========================================================= */

const uploadConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "multipart/form-data",
  },
});

/* =========================================================
   MASTER DATA / CONFIGURATION
========================================================= */

/**
 * Get Collection Tracking configuration fields.
 *
 * @param {string} stage
 */
export const getConfigs = async (stage = "") => {
  const response = await axios.get(`${API}/configs`, {
    ...authConfig(),
    params: stage ? { stage } : {},
  });

  return response;
};

/**
 * Save Master Data configuration.
 *
 * @param {string} stage
 * @param {Array} fields
 */
export const updateConfigs = async (
  stage,
  fields
) => {
  const response = await axios.put(
    `${API}/configs/${encodeURIComponent(stage)}`,
    { fields },
    authConfig()
  );

  return response;
};

/* =========================================================
   PRODUCTS
========================================================= */

/**
 * Get Collection Tracking products.
 *
 * @param {Object} params
 */
export const getProducts = async (
  params = {}
) => {
  const response = await axios.get(
    `${API}/products`,
    {
      ...authConfig(),
      params,
    }
  );

  return response;
};

/**
 * Get one Collection Tracking product.
 *
 * @param {string|number} id
 */
export const getProduct = async (id) => {
  const response = await axios.get(
    `${API}/products/${id}`,
    authConfig()
  );

  return response;
};

/**
 * Create a new Collection Tracking product.
 *
 * @param {Object} data
 */
export const createProduct = async (
  data
) => {
  const response = await axios.post(
    `${API}/products`,
    data,
    authConfig()
  );

  return response;
};

/**
 * Update a product's current stage.
 *
 * @param {string|number} id
 * @param {Object} data
 */
export const updateProductStage = async (
  id,
  data
) => {
  const response = await axios.put(
    `${API}/products/${id}/stage`,
    data,
    authConfig()
  );

  return response;
};

/**
 * Delete one product.
 *
 * @param {string|number} id
 */
export const deleteProduct = async (
  id
) => {
  const response = await axios.delete(
    `${API}/products/${id}`,
    authConfig()
  );

  return response;
};

/**
 * Delete all Collection Tracking products.
 */
export const deleteAllProducts = async () => {
  const response = await axios.delete(
    `${API}/products`,
    authConfig()
  );

  return response;
};

/* =========================================================
   BULK UPLOAD
========================================================= */

/**
 * Upload CSV/XLS/XLSX Collection Tracking data.
 *
 * @param {File|FormData} file
 */
export const bulkUploadProducts = async (
  file
) => {
  /*
   * Supports both:
   *
   * bulkUploadProducts(file)
   *
   * and
   *
   * bulkUploadProducts(formData)
   *
   * so existing code does not break.
   */

  let formData;

  if (file instanceof FormData) {
    formData = file;
  } else {
    formData = new FormData();
    formData.append("file", file);
  }

  const response = await axios.post(
    `${API}/products/bulk`,
    formData,
    uploadConfig()
  );

  return response;
};

/* =========================================================
   EXPORT
========================================================= */

/**
 * Export Collection Tracking products as CSV.
 */
export const exportProducts = async () => {
  return axios.get(
    `${API}/products/export`,
    {
      ...authConfig(),
      responseType: "blob",
    }
  );
};

/* =========================================================
   COMMENTS / REMARKS
========================================================= */

/**
 * Add a remark/comment to a product.
 *
 * This endpoint is responsible for the backend workflow
 * that can notify the previous stage.
 *
 * @param {string|number} id
 * @param {Object} data
 */
export const addProductComment = async (
  id,
  data
) => {
  const response = await axios.post(
    `${API}/products/${id}/comments`,
    data,
    authConfig()
  );

  return response;
};

/* =========================================================
   REQUESTS
========================================================= */

/**
 * Create a request for a product.
 *
 * @param {string|number} id
 * @param {Object} data
 */
export const createProductRequest = async (
  id,
  data
) => {
  const response = await axios.post(
    `${API}/products/${id}/requests`,
    data,
    authConfig()
  );

  return response;
};

/**
 * Get Collection Tracking requests.
 *
 * @param {string} status
 */
export const getRequests = async (
  status = ""
) => {
  const response = await axios.get(
    `${API}/requests`,
    {
      ...authConfig(),
      params: status
        ? { status }
        : {},
    }
  );

  return response;
};

/**
 * Approve or reject a request.
 *
 * @param {string|number} id
 * @param {string} status
 */
export const reviewRequest = async (
  id,
  status
) => {
  const response = await axios.put(
    `${API}/requests/${id}`,
    { status },
    authConfig()
  );

  return response;
};

/* =========================================================
   INSIGHT
========================================================= */

/**
 * Get live Collection Tracking insight.
 */
export const getInsight = async () => {
  const response = await axios.get(
    `${API}/insight`,
    authConfig()
  );

  return response;
};

/* =========================================================
   COLLECTION PERMISSIONS
========================================================= */

/**
 * Get Collection Tracking permissions.
 */
export const getPermissions = async () => {
  const response = await axios.get(
    `${API}/permissions`,
    authConfig()
  );

  return response;
};

/**
 * Save Collection Tracking permissions.
 *
 * @param {Array} items
 */
export const updatePermissions = async (
  items
) => {
  const response = await axios.put(
    `${API}/permissions`,
    { items },
    authConfig()
  );

  return response;
};

/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

/*
 * These aliases allow older Collection Tracking
 * components to continue working while everything
 * moves to the service architecture.
 */

export const getCollectionConfigs =
  getConfigs;

export const saveCollectionConfig =
  updateConfigs;

export const getCollectionProducts =
  getProducts;

export const getCollectionProductById =
  getProduct;

export const createCollectionProduct =
  createProduct;

export const updateCollectionProductStage =
  updateProductStage;

export const deleteCollectionProduct =
  deleteProduct;

export const deleteAllCollectionProducts =
  deleteAllProducts;

export const bulkUploadCollectionProducts =
  bulkUploadProducts;

export const exportCollectionProducts =
  exportProducts;

export const addCollectionComment =
  addProductComment;

export const createCollectionRequest =
  createProductRequest;

export const getCollectionRequests =
  getRequests;

export const reviewCollectionRequest =
  reviewRequest;

export const getCollectionInsight =
  getInsight;

export const getCollectionPermissions =
  getPermissions;

export const saveCollectionPermissions =
  updatePermissions;
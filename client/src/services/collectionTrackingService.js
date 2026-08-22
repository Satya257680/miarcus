import "../axiosConfig";
import axios from "axios";

/*
|--------------------------------------------------------------------------
| MIARCUS Collection Tracking Service
|--------------------------------------------------------------------------
| Collection Tracking pages use this service for every API request.
| No component talks directly to the backend URL.
|--------------------------------------------------------------------------
*/

const API = "/api/collection-tracking";

/* =========================================================
   AUTH
========================================================= */

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

/*
 * Let Axios/browser create the multipart boundary automatically.
 * Setting Content-Type manually can remove the boundary in some
 * browser/proxy combinations.
 */
const uploadConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

/* =========================================================
   HELPERS
========================================================= */

const hasAttachments = (attachments) =>
  Array.isArray(attachments) &&
  attachments.some((item) => item?.file);

const buildMultipartBody = ({
  product_code,
  product_name,
  data = {},
  attachments = [],
  extra = {},
}) => {
  const formData = new FormData();

  if (product_code !== undefined) {
    formData.append(
      "product_code",
      String(product_code)
    );
  }

  if (product_name !== undefined) {
    formData.append(
      "product_name",
      String(product_name)
    );
  }

  formData.append(
    "data",
    JSON.stringify(data || {})
  );

  Object.entries(extra || {}).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null
      ) {
        formData.append(
          key,
          typeof value === "string"
            ? value
            : JSON.stringify(value)
        );
      }
    }
  );

  const attachmentMeta = [];

  (attachments || []).forEach((item) => {
    if (!item?.file) return;

    formData.append(
      "attachments",
      item.file,
      item.file.name
    );

    attachmentMeta.push({
      field_name:
        item.field_name ||
        "Attachments",
    });
  });

  formData.append(
    "attachment_meta",
    JSON.stringify(attachmentMeta)
  );

  return formData;
};

/* =========================================================
   MASTER DATA
========================================================= */

export const getConfigs = async (
  stage = ""
) =>
  axios.get(
    `${API}/configs`,
    {
      ...authConfig(),
      params: stage
        ? { stage }
        : {},
    }
  );

export const updateConfigs = async (
  stage,
  fields
) =>
  axios.put(
    `${API}/configs/${encodeURIComponent(
      stage
    )}`,
    {
      fields,
    },
    authConfig()
  );

/* =========================================================
   PRODUCTS
========================================================= */

export const getProducts = async (
  params = {}
) =>
  axios.get(
    `${API}/products`,
    {
      ...authConfig(),
      params,
    }
  );

export const getProduct = async (
  id
) =>
  axios.get(
    `${API}/products/${id}`,
    authConfig()
  );

export const createProduct = async (
  payload = {}
) => {
  const {
    product_code,
    product_name,
    data = {},
    attachments = [],
  } = payload;

  if (hasAttachments(attachments)) {
    const formData =
      buildMultipartBody({
        product_code,
        product_name,
        data,
        attachments,
      });

    return axios.post(
      `${API}/products`,
      formData,
      uploadConfig()
    );
  }

  return axios.post(
    `${API}/products`,
    {
      product_code,
      product_name,
      data,
    },
    authConfig()
  );
};

export const updateProductStage = async (
  id,
  payload = {}
) => {
  const {
    stage,
    data = {},
    next_stage = null,
    note = null,
    attachments = [],
  } = payload;

  if (hasAttachments(attachments)) {
    const formData =
      buildMultipartBody({
        data,
        attachments,
        extra: {
          stage,
          next_stage,
          note,
        },
      });

    return axios.put(
      `${API}/products/${id}/stage`,
      formData,
      uploadConfig()
    );
  }

  return axios.put(
    `${API}/products/${id}/stage`,
    {
      stage,
      data,
      next_stage,
      note,
    },
    authConfig()
  );
};

export const deleteProduct = async (
  id
) =>
  axios.delete(
    `${API}/products/${id}`,
    authConfig()
  );

export const deleteAllProducts =
  async () =>
    axios.delete(
      `${API}/products`,
      authConfig()
    );

/* =========================================================
   BULK UPLOAD
========================================================= */

export const bulkUploadProducts =
  async (file) => {
    const formData =
      file instanceof FormData
        ? file
        : (() => {
            const value =
              new FormData();

            value.append(
              "file",
              file
            );

            return value;
          })();

    return axios.post(
      `${API}/products/bulk`,
      formData,
      uploadConfig()
    );
  };

/* =========================================================
   EXPORT
========================================================= */

export const exportProducts = async () =>
  axios.get(
    `${API}/products/export`,
    {
      ...authConfig(),
      responseType: "blob",
    }
  );

/* =========================================================
   COMMENTS / REMARKS
========================================================= */

export const addProductComment =
  async (
    id,
    data
  ) =>
    axios.post(
      `${API}/products/${id}/comments`,
      data,
      authConfig()
    );

/* =========================================================
   REQUESTS
========================================================= */

export const createProductRequest =
  async (
    id,
    data
  ) =>
    axios.post(
      `${API}/products/${id}/requests`,
      data,
      authConfig()
    );

export const getRequests = async (
  status = ""
) =>
  axios.get(
    `${API}/requests`,
    {
      ...authConfig(),
      params: status
        ? { status }
        : {},
    }
  );

export const reviewRequest = async (
  id,
  status
) =>
  axios.put(
    `${API}/requests/${id}`,
    {
      status,
    },
    authConfig()
  );

/* =========================================================
   INSIGHT
========================================================= */

export const getInsight = async () =>
  axios.get(
    `${API}/insight`,
    authConfig()
  );

/* =========================================================
   PERMISSIONS
========================================================= */

export const getPermissions = async () =>
  axios.get(
    `${API}/permissions`,
    authConfig()
  );

export const updatePermissions =
  async (items) =>
    axios.put(
      `${API}/permissions`,
      {
        items,
      },
      authConfig()
    );

/* =========================================================
   BACKWARD COMPATIBILITY
========================================================= */

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

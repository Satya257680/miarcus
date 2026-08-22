import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaCommentDots,
  FaDownload,
  FaEye,
  FaFileUpload,
  FaPlus,
  FaSave,
  FaTrash,
  FaPaperPlane,
} from "react-icons/fa";

import {
  getProducts,
  exportProducts,
  deleteProduct,
  deleteAllProducts,
  bulkUploadProducts,
  getProduct,
  getConfigs,
  updateProductStage,
  addProductComment,
  updateConfigs,
  getInsight,
  getRequests,
  reviewRequest,
  getPermissions,
  updatePermissions,
  createProduct,
} from "../../services/collectionTrackingService";

import "./CollectionTracking.css";

const STAGES = [
  "Designer",
  "Buyer",
  "Tech Team",
  "Quality",
  "E-Com",
  "Warehouse",
];

const inputType = (type) =>
  ["select", "multiselect", "date", "textarea"].includes(type)
    ? type
    : "text";

/* =========================================================
   COMMON HERO
========================================================= */

function Hero({ title, subtitle, children }) {
  return (
    <div className="ct-hero">
      <div>
        <div className="ct-kicker">
          Collection Tracking · Product Workflow
        </div>

        <h1>{title}</h1>

        <p>{subtitle}</p>
      </div>

      {children && <div>{children}</div>}
    </div>
  );
}

/* =========================================================
   STAGE ARROW NAVIGATION
========================================================= */

function StageNavigator({ currentStage, onStageChange }) {
  const currentIndex = Math.max(0, STAGES.indexOf(currentStage));

  const goPrevious = () => {
    if (currentIndex > 0) {
      onStageChange(STAGES[currentIndex - 1]);
    }
  };

  const goNext = () => {
    if (currentIndex < STAGES.length - 1) {
      onStageChange(STAGES[currentIndex + 1]);
    }
  };

  return (
    <div className="ct-stage-navigation">
      <button
        type="button"
        className="ct-stage-arrow"
        disabled={currentIndex === 0}
        onClick={goPrevious}
        title="Previous stage"
      >
        <FaArrowLeft />
      </button>

      <div className="ct-stage-track">
        {STAGES.map((stage, index) => {
          const active = index === currentIndex;
          const completed = index < currentIndex;

          return (
            <React.Fragment key={stage}>
              <button
                type="button"
                className={[
                  "ct-stage-step",
                  active ? "active" : "",
                  completed ? "completed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onStageChange(stage)}
              >
                <span className="ct-stage-number">{index + 1}</span>

                <span className="ct-stage-name">{stage}</span>
              </button>

              {index < STAGES.length - 1 && (
                <span
                  className={`ct-stage-connector ${
                    index < currentIndex ? "completed" : ""
                  }`}
                >
                  <FaArrowRight />
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <button
        type="button"
        className="ct-stage-arrow"
        disabled={currentIndex === STAGES.length - 1}
        onClick={goNext}
        title="Next stage"
      >
        <FaArrowRight />
      </button>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  field,
  value,
  onChange,
  readonly = false,
}) {
  const type = inputType(field.display_type);
  const options = field.options || [];

  const isAttachment =
    field.display_type?.startsWith("attachment");

  return (
    <div
      className={`ct-field ${
        type === "textarea" ? "full" : ""
      }`}
    >
      <label>
        {field.field_name}

        {field.is_mandatory && (
          <span className="req">*</span>
        )}
      </label>

      {type === "textarea" ? (
        <textarea
          className={`ct-textarea ${
            readonly ? "ct-readonly" : ""
          }`}
          disabled={readonly}
          value={value || ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      ) : type === "select" ? (
        <select
          className={`ct-select ${
            readonly ? "ct-readonly" : ""
          }`}
          disabled={readonly}
          value={value || ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        >
          <option value="">Select...</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : type === "multiselect" ? (
        <select
          className={`ct-select ${
            readonly ? "ct-readonly" : ""
          }`}
          disabled={readonly}
          multiple
          value={
            Array.isArray(value)
              ? value
              : value
              ? [value]
              : []
          }
          onChange={(event) =>
            onChange(
              Array.from(
                event.target.selectedOptions
              ).map((option) => option.value)
            )
          }
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : type === "date" ? (
        <input
          className={`ct-input ${
            readonly ? "ct-readonly" : ""
          }`}
          type="date"
          disabled={readonly}
          value={value || ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      ) : isAttachment ? (
        <input
          className="ct-input"
          type="file"
          multiple={field.display_type.includes(
            "multiple"
          )}
          disabled={readonly}
          onChange={(event) =>
            onChange(
              Array.from(
                event.target.files || []
              )
                .map((file) => file.name)
                .join(", ")
            )
          }
        />
      ) : (
        <input
          className={`ct-input ${
            readonly ? "ct-readonly" : ""
          }`}
          disabled={readonly}
          value={value || ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   PRODUCT LIST
========================================================= */

function ProductList() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageSize = 12;

  const loadProducts = async () => {
    try {
      setLoading(true);

      const response = await getProducts({
        search: query,
        stage,
        status,
        page,
        pageSize,
      });

      setRows(response?.data?.rows || []);
      setTotal(response?.data?.total || 0);
    } catch (error) {
      console.error(
        "Collection Tracking products error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Unable to load collection products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [query, stage, status, page]);

  const handleExport = async () => {
    try {
      const response = await exportProducts();

      const blob = new Blob(
        [response.data],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download =
        "collection-tracking.csv";

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      alert("Unable to export collection data.");
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this collection product?"
      )
    ) {
      return;
    }

    try {
      await deleteProduct(id);

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to delete product."
      );
    }
  };

  const handleDeleteAll = async () => {
    if (!total) {
      alert("There are no collection products to delete.");
      return;
    }

    if (
      !window.confirm(
        "Delete ALL collection products? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteAllProducts();

      setPage(1);

      await loadProducts();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to delete all products."
      );
    }
  };

  const handleBulkUpload = async () => {
    if (!file) {
      alert("Please select a CSV or Excel file.");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("file", file);

      await bulkUploadProducts(formData);

      setBulkOpen(false);
      setFile(null);

      setPage(1);

      await loadProducts();

      alert("Products uploaded successfully.");
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Bulk upload failed."
      );
    }
  };

  return (
    <div className="ct-shell">
      <Hero
        title="Collection Tracking"
        subtitle="Move one product through Designer → Buyer → Tech Team → Quality → E-Com → Warehouse."
      >
        <div className="ct-toolbar">
          <button
            type="button"
            className="ct-btn light"
            onClick={() => setBulkOpen(true)}
          >
            <FaFileUpload />
            Bulk Upload
          </button>

          <button
            type="button"
            className="ct-btn primary"
            onClick={() =>
              navigate(
                "/collection-tracking/add-products"
              )
            }
          >
            <FaPlus />
            Add Product
          </button>

          <button
            type="button"
            className="ct-btn light"
            onClick={handleExport}
          >
            <FaDownload />
            Export CSV
          </button>

          <button
            type="button"
            className="ct-btn danger"
            onClick={handleDeleteAll}
          >
            <FaTrash />
            Delete All
          </button>
        </div>
      </Hero>

      <div className="ct-card">
        <div className="ct-toolbar">
          <input
            className="ct-input ct-search"
            placeholder="Search product code or product name..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />

          <select
            className="ct-select"
            value={stage}
            onChange={(event) => {
              setStage(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All stages</option>

            {STAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="ct-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All status</option>
            <option value="In Progress">
              In Progress
            </option>
            <option value="Completed">
              Completed
            </option>
          </select>
        </div>

        <div className="ct-table-wrapper">
          <table className="ct-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="ct-empty"
                  >
                    Loading collection products...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <b>{row.product_code}</b>

                      <div className="ct-muted">
                        {row.product_name ||
                          "Unnamed product"}
                      </div>
                    </td>

                    <td>
                      <span className="ct-chip">
                        {row.current_stage}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`ct-badge ${
                          row.status === "Completed"
                            ? "done"
                            : "progress"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td>
                      {row.creator_name || "—"}
                    </td>

                    <td>
                      {row.updated_at
                        ? new Date(
                            row.updated_at
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td>
                      <div className="ct-row-actions">
                        <button
                          type="button"
                          className="ct-btn light"
                          onClick={() =>
                            navigate(
                              `/collection-tracking/sku-details/${row.id}`
                            )
                          }
                        >
                          <FaEye />
                          View
                        </button>

                        <button
                          type="button"
                          className="ct-btn danger"
                          onClick={() =>
                            handleDelete(row.id)
                          }
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="ct-empty"
                  >
                    No collection products match your
                    filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ct-pagination">
          <button
            type="button"
            className="ct-btn light"
            disabled={page <= 1}
            onClick={() =>
              setPage((value) =>
                Math.max(1, value - 1)
              )
            }
          >
            <FaArrowLeft />
            Previous
          </button>

          <span
            className="ct-muted"
            style={{ padding: 10 }}
          >
            Page {page} · {total} records
          </span>

          <button
            type="button"
            className="ct-btn light"
            disabled={
              page * pageSize >= total
            }
            onClick={() =>
              setPage((value) => value + 1)
            }
          >
            Next
            <FaArrowRight />
          </button>
        </div>
      </div>

      {bulkOpen && (
        <div className="ct-modal-backdrop">
          <div
            className="ct-card"
            style={{
              width: 600,
              maxWidth: "95vw",
              margin: 0,
            }}
          >
            <h3>Bulk Upload Products</h3>

            <p className="ct-muted">
              Upload CSV or Excel data using
              product_code, product_name and
              Master Data field names.
            </p>

            <div className="ct-file">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(event) =>
                  setFile(
                    event.target.files?.[0] ||
                      null
                  )
                }
              />

              <p className="ct-muted">
                {file?.name ||
                  "Choose a CSV or Excel file"}
              </p>
            </div>

            <div className="ct-actions">
              <button
                type="button"
                className="ct-btn light"
                onClick={() => {
                  setBulkOpen(false);
                  setFile(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ct-btn primary"
                disabled={!file}
                onClick={handleBulkUpload}
              >
                <FaFileUpload />
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ADD PRODUCT
========================================================= */

function AddProduct() {
  const navigate = useNavigate();

  const [fields, setFields] = useState([]);
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response =
          await getConfigs("Designer");

        setFields(
          response?.data?.configs || []
        );
      } catch (error) {
        console.error(error);

        alert(
          "Unable to load Designer fields."
        );
      }
    };

    load();
  }, []);

  const saveProduct = async () => {
    const missing = fields.find(
      (field) =>
        field.is_mandatory &&
        !data[field.field_name]
    );

    if (missing) {
      alert(
        `Please fill ${missing.field_name}`
      );

      return;
    }

    setSaving(true);

    try {
      const response =
        await createProduct({
          product_code:
            data["SKU"] ||
            data["Article Name"] ||
            undefined,

          product_name:
            data["Product Name"],

          data,
        });

      const productId =
        response?.data?.product?.id;

      if (!productId) {
        throw new Error(
          "Product created but no product ID was returned."
        );
      }

      navigate(
        `/collection-tracking/sku-details/${productId}`
      );
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to create product."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-shell">
      <Hero
        title="Add Product"
        subtitle="Create the product once. Later teams receive previous information automatically."
      />

      <div className="ct-card">
        <div className="ct-form-grid">
          {fields.map((field) => (
            <Field
              key={field.id}
              field={field}
              value={data[field.field_name]}
              onChange={(value) =>
                setData((previous) => ({
                  ...previous,
                  [field.field_name]: value,
                }))
              }
            />
          ))}
        </div>

        <div className="ct-actions">
          <button
            type="button"
            className="ct-btn light"
            onClick={() =>
              navigate("/collection-tracking")
            }
          >
            <FaArrowLeft />
            Cancel
          </button>

          <button
            type="button"
            className="ct-btn primary"
            disabled={saving}
            onClick={saveProduct}
          >
            <FaSave />
            {saving
              ? "Creating..."
              : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PRODUCT DETAILS / WORKFLOW
========================================================= */

function Details() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [result, setResult] = useState(null);
  const [configs, setConfigs] = useState([]);

  const [stage, setStage] =
    useState("Designer");

  const [data, setData] = useState({});
  const [comment, setComment] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const loadProduct = async (
    preserveStage = true
  ) => {
    try {
      const [
        productResponse,
        configResponse,
      ] = await Promise.all([
        getProduct(id),
        getConfigs(),
      ]);

      const product =
        productResponse?.data;

      const availableConfigs =
        configResponse?.data?.configs || [];

      setResult(product);
      setConfigs(availableConfigs);

      const productStage =
        product?.product?.current_stage ||
        "Designer";

      if (!preserveStage) {
        setStage(productStage);

        setData(
          product?.product?.stage_data?.[
            productStage
          ] || {}
        );
      } else {
        setData(
          product?.product?.stage_data?.[
            stage
          ] || {}
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to load product."
      );
    }
  };

  useEffect(() => {
    loadProduct(false);
  }, [id]);

  useEffect(() => {
    if (!result) return;

    setData(
      result.product?.stage_data?.[
        stage
      ] || {}
    );
  }, [stage, result]);

  const fields = useMemo(
    () =>
      configs.filter(
        (field) =>
          field.stage_name === stage
      ),
    [configs, stage]
  );

  const currentIndex = Math.max(
    0,
    STAGES.indexOf(stage)
  );

  const previousStage =
    currentIndex > 0
      ? STAGES[currentIndex - 1]
      : null;

  const nextStage =
    currentIndex <
    STAGES.length - 1
      ? STAGES[currentIndex + 1]
      : null;

  /*
   * Merge previous stage information.
   *
   * Earlier stage data is visible to the current
   * team. The current team's own values are placed
   * over the copied values.
   */
  const mergedData = useMemo(() => {
    if (!result?.product) {
      return {};
    }

    const merged = {};

    for (
      let index = 0;
      index <= currentIndex;
      index += 1
    ) {
      const stageName =
        STAGES[index];

      Object.assign(
        merged,
        result.product.stage_data?.[
          stageName
        ] || {}
      );
    }

    Object.assign(merged, data);

    return merged;
  }, [
    result,
    currentIndex,
    data,
  ]);

  const changeStage = (newStage) => {
    if (!STAGES.includes(newStage)) {
      return;
    }

    setStage(newStage);
  };

  const saveStage = async (
    moveToNext = false
  ) => {
    const missing = fields.find(
      (field) =>
        field.is_mandatory &&
        !mergedData[field.field_name]
    );

    if (missing) {
      alert(
        `Please fill ${missing.field_name}`
      );

      return;
    }

    if (
      moveToNext &&
      !nextStage
    ) {
      return;
    }

    setSaving(true);

    try {
      await updateProductStage(
        id,
        {
          stage,
          data: mergedData,
          next_stage: moveToNext
            ? nextStage
            : null,
        }
      );

      await loadProduct(true);

      alert(
        moveToNext
          ? `Update sent to ${nextStage}. The previous team was notified.`
          : "Update saved successfully. The previous team was notified."
      );
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to save product update."
      );
    } finally {
      setSaving(false);
    }
  };

  const sendRemark = async () => {
    if (!comment.trim()) {
      alert("Please write a remark first.");

      return;
    }

    try {
      await addProductComment(id, {
        stage,
        comment:
          comment.trim(),
      });

      setComment("");

      await loadProduct(true);

      alert(
        "Remark sent through website notification and email."
      );
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to send remark."
      );
    }
  };

  if (!result) {
    return (
      <div className="ct-shell">
        <div className="ct-card ct-empty">
          Loading product...
        </div>
      </div>
    );
  }

  return (
    <div className="ct-shell">
      <Hero
        title={
          result.product
            .product_code
        }
        subtitle={
          result.product
            .product_name ||
          "Collection product"
        }
      >
        <span className="ct-badge progress">
          {result.product.current_stage}
        </span>
      </Hero>

      <div className="ct-card">
        <div className="ct-stage-head">
          <div>
            <h3>
              {stage} Workspace
            </h3>

            <div className="ct-muted">
              Information from previous stages
              is automatically available.
              Read-only fields cannot be changed
              by the current stage.
            </div>
          </div>

          <span className="ct-chip">
            Step {currentIndex + 1} /{" "}
            {STAGES.length}
          </span>
        </div>

        {/* =================================================
            PROGRESS BAR
        ================================================= */}

        <div
          className="ct-progress"
          style={{
            margin: "18px 0",
          }}
        >
          <span
            style={{
              width: `${
                ((currentIndex + 1) /
                  STAGES.length) *
                100
              }%`,
            }}
          />
        </div>

        {/* =================================================
            STAGE ARROWS
        ================================================= */}

        <StageNavigator
          currentStage={stage}
          onStageChange={changeStage}
        />

        {/* =================================================
            CURRENT STAGE FIELDS
        ================================================= */}

        <div className="ct-form-grid">
          {fields.map((field) => (
            <Field
              key={field.id}
              field={field}
              readonly={
                field.display_type ===
                "readonly"
              }
              value={
                mergedData[
                  field.field_name
                ]
              }
              onChange={(value) =>
                setData((previous) => ({
                  ...previous,
                  [field.field_name]:
                    value,
                }))
              }
            />
          ))}
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="ct-actions">
          <button
            type="button"
            className="ct-btn light"
            onClick={() =>
              navigate(
                "/collection-tracking"
              )
            }
          >
            <FaArrowLeft />
            Back
          </button>

          <button
            type="button"
            className="ct-btn light"
            disabled={saving}
            onClick={() =>
              saveStage(false)
            }
          >
            <FaSave />
            {saving
              ? "Saving..."
              : "Save Update"}
          </button>

          {nextStage && (
            <button
              type="button"
              className="ct-btn primary"
              disabled={saving}
              onClick={() =>
                saveStage(true)
              }
            >
              <FaPaperPlane />
              Submit to {nextStage}
              <FaArrowRight />
            </button>
          )}
        </div>

        {/* =================================================
            PREVIOUS / NEXT QUICK ACTION
        ================================================= */}

        <div
          className="ct-actions"
          style={{
            justifyContent:
              "space-between",
            marginTop: 12,
          }}
        >
          <button
            type="button"
            className="ct-btn light"
            disabled={!previousStage}
            onClick={() =>
              previousStage &&
              changeStage(
                previousStage
              )
            }
          >
            <FaArrowLeft />
            Previous:{" "}
            {previousStage ||
              "Start"}
          </button>

          <button
            type="button"
            className="ct-btn light"
            disabled={!nextStage}
            onClick={() =>
              nextStage &&
              changeStage(nextStage)
            }
          >
            Next:{" "}
            {nextStage ||
              "Completed"}
            <FaArrowRight />
          </button>
        </div>

        {/* =================================================
            REMARK / UPDATE
        ================================================= */}

        <div
          className="ct-card"
          style={{
            marginTop: 18,
            boxShadow: "none",
            borderStyle: "dashed",
          }}
        >
          <h3>
            <FaCommentDots />
            {" "}Remark / Update
          </h3>

          <p className="ct-muted">
            Write an update for the previous
            team. The system will save it in the
            product history and send a website
            notification and email.
          </p>

          <textarea
            className="ct-textarea"
            placeholder="Write a remark for the previous team..."
            value={comment}
            onChange={(event) =>
              setComment(
                event.target.value
              )
            }
          />

          <div className="ct-actions">
            <button
              type="button"
              className="ct-btn teal"
              onClick={sendRemark}
            >
              <FaPaperPlane />
              Send Remark
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================
          ACTIVITY HISTORY
      =================================================== */}

      <div className="ct-card">
        <h3>
          Activity & Remarks
        </h3>

        {(result.comments || [])
          .length === 0 &&
          (result.history || [])
            .length === 0 && (
            <div className="ct-empty">
              No activity or remarks yet.
            </div>
          )}

        {(result.comments || []).map(
          (commentItem) => (
            <div
              className="ct-comment"
              key={`comment-${commentItem.id}`}
            >
              <b>
                {commentItem.user_name ||
                  "User"}
              </b>

              <span className="ct-muted">
                {" "}·{" "}
                {commentItem.stage_name}
                {" "}·{" "}
                {new Date(
                  commentItem.created_at
                ).toLocaleString()}
              </span>

              <div>
                {commentItem.comment}
              </div>
            </div>
          )
        )}

        {(result.history || []).map(
          (historyItem) => (
            <div
              className="ct-history"
              key={`history-${historyItem.id}`}
            >
              <b>
                {historyItem.action}
                {" "}·{" "}
                {historyItem.stage_name}
              </b>

              <div className="ct-muted">
                {historyItem.user_name ||
                  "User"}
                {" "}·{" "}
                {new Date(
                  historyItem.created_at
                ).toLocaleString()}
              </div>

              {historyItem.note && (
                <div>
                  {historyItem.note}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MASTER DATA
========================================================= */

function MasterData() {
  const [stage, setStage] =
    useState("Designer");

  const [fields, setFields] =
    useState([]);

  const [saving, setSaving] =
    useState(false);

  const load = async () => {
    try {
      const response =
        await getConfigs(stage);

      setFields(
        response?.data?.configs || []
      );
    } catch (error) {
      console.error(error);

      alert(
        "Unable to load Master Data."
      );
    }
  };

  useEffect(() => {
    load();
  }, [stage]);

  const updateField = (
    index,
    key,
    value
  ) => {
    setFields((current) =>
      current.map(
        (field, fieldIndex) =>
          fieldIndex === index
            ? {
                ...field,
                [key]: value,
              }
            : field
      )
    );
  };

  const addField = () => {
    setFields((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        field_name: "New Field",
        display_type: "text",
        is_mandatory: false,
        options: [],
      },
    ]);
  };

  const save = async () => {
    setSaving(true);

    try {
      await updateConfigs(
        stage,
        fields
      );

      alert(
        "Master Data saved successfully."
      );

      await load();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to save Master Data."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-shell">
      <Hero
        title="Master Data"
        subtitle="Control the fields used by every Collection Tracking stage."
      >
        <button
          type="button"
          className="ct-btn primary"
          onClick={save}
          disabled={saving}
        >
          <FaSave />
          {saving
            ? "Saving..."
            : "Save Master Data"}
        </button>
      </Hero>

      <div className="ct-card">
        <div className="ct-tabs">
          {STAGES.map((item) => (
            <button
              type="button"
              className={`ct-tab ${
                item === stage
                  ? "active"
                  : ""
              }`}
              key={item}
              onClick={() =>
                setStage(item)
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="ct-table-wrapper">
          <table className="ct-table">
            <thead>
              <tr>
                <th>
                  Requirement
                </th>

                <th>
                  Field
                </th>

                <th>
                  Display Type
                </th>

                <th>
                  Dropdown Options
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {fields.map(
                (field, index) => (
                  <tr
                    key={
                      field.id ||
                      index
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className={`ct-tab ${
                          field.is_mandatory
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          updateField(
                            index,
                            "is_mandatory",
                            !field.is_mandatory
                          )
                        }
                      >
                        {field.is_mandatory
                          ? "Mandatory"
                          : "Optional"}
                      </button>
                    </td>

                    <td>
                      <input
                        className="ct-input"
                        value={
                          field.field_name ||
                          ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            index,
                            "field_name",
                            event.target
                              .value
                          )
                        }
                      />
                    </td>

                    <td>
                      <select
                        className="ct-select"
                        value={
                          field.display_type ||
                          "text"
                        }
                        onChange={(
                          event
                        ) =>
                          updateField(
                            index,
                            "display_type",
                            event.target
                              .value
                          )
                        }
                      >
                        {[
                          "text",
                          "textarea",
                          "select",
                          "multiselect",
                          "date",
                          "attachment-single",
                          "attachment-multiple",
                          "readonly",
                        ].map(
                          (type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {type}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td>
                      {[
                        "select",
                        "multiselect",
                      ].includes(
                        field.display_type
                      ) ? (
                        <textarea
                          className="ct-textarea"
                          value={(
                            field.options ||
                            []
                          ).join(", ")}
                          onChange={(
                            event
                          ) =>
                            updateField(
                              index,
                              "options",
                              event.target.value
                                .split(
                                  ","
                                )
                                .map(
                                  (
                                    item
                                  ) =>
                                    item.trim()
                                )
                                .filter(
                                  Boolean
                                )
                            )
                          }
                          placeholder="Option A, Option B, Option C"
                        />
                      ) : (
                        <span className="ct-muted">
                          {field.display_type ===
                          "readonly"
                            ? "Read-only / copied from previous stage"
                            : "No option list required"}
                        </span>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ct-btn danger"
                        onClick={() =>
                          setFields(
                            (current) =>
                              current.filter(
                                (
                                  _,
                                  fieldIndex
                                ) =>
                                  fieldIndex !==
                                  index
                              )
                          )
                        }
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="ct-actions">
          <button
            type="button"
            className="ct-btn light"
            onClick={addField}
          >
            <FaPlus />
            Add Field
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INSIGHT
========================================================= */

function Insight() {
  const [data, setData] =
    useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response =
          await getInsight();

        setData(response?.data);
      } catch (error) {
        console.error(error);

        alert(
          "Unable to load Collection Tracking insight."
        );
      }
    };

    load();
  }, []);

  const total =
    data?.summary?.total || 0;

  return (
    <div className="ct-shell">
      <Hero
        title="Insight"
        subtitle="Live numbers from Collection Tracking."
      />

      <div className="ct-grid">
        <div className="ct-stat">
          <small>
            Total Products
          </small>

          <strong>
            {total}
          </strong>
        </div>

        <div className="ct-stat">
          <small>
            Unique Product Names
          </small>

          <strong>
            {data?.summary?.products ||
              0}
          </strong>
        </div>

        {STAGES.slice(0, 2).map(
          (item) => (
            <div
              className="ct-stat"
              key={item}
            >
              <small>
                {item}
              </small>

              <strong>
                {data?.stages?.find(
                  (stageItem) =>
                    stageItem.stage ===
                    item
                )?.count || 0}
              </strong>
            </div>
          )
        )}
      </div>

      <div className="ct-card">
        <h3>
          Stage Distribution
        </h3>

        {(data?.stages || []).map(
          (item) => {
            const percentage =
              total > 0
                ? Math.min(
                    100,
                    (item.count /
                      total) *
                      100
                  )
                : 0;

            return (
              <div
                key={item.stage}
                style={{
                  margin:
                    "13px 0",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <b>
                    {item.stage}
                  </b>

                  <span>
                    {item.count}
                  </span>
                </div>

                <div className="ct-progress">
                  <span
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

/* =========================================================
   REQUESTS
========================================================= */

function Requests() {
  const [rows, setRows] =
    useState([]);

  const load = async () => {
    try {
      const response =
        await getRequests(
          "Pending"
        );

      setRows(
        response?.data?.requests ||
          []
      );
    } catch (error) {
      console.error(error);

      alert(
        "Unable to load requests."
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (
    id,
    status
  ) => {
    try {
      await reviewRequest(
        id,
        status
      );

      await load();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to update request."
      );
    }
  };

  return (
    <div className="ct-shell">
      <Hero
        title="Requests"
        subtitle="Requests from one team to another appear here for review."
      />

      <div className="ct-card">
        {rows.length ? (
          rows.map((request) => (
            <div
              className="ct-request"
              key={request.id}
            >
              <div>
                <b>
                  {request.product_code}
                </b>

                {" — "}

                {request.product_name ||
                  "Unnamed"}

                <div className="ct-muted">
                  {request.from_stage}
                  {" → "}
                  {request.to_stage}
                  {" · requested by "}
                  {request.requester_name ||
                    "User"}
                </div>

                {request.note && (
                  <p>
                    {request.note}
                  </p>
                )}
              </div>

              <div className="ct-row-actions">
                <button
                  type="button"
                  className="ct-btn primary"
                  onClick={() =>
                    review(
                      request.id,
                      "Approved"
                    )
                  }
                >
                  <FaCheck />
                  Approve
                </button>

                <button
                  type="button"
                  className="ct-btn danger"
                  onClick={() =>
                    review(
                      request.id,
                      "Rejected"
                    )
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="ct-empty">
            No pending requests.
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PERMISSIONS
========================================================= */

function Permissions() {
  const [departments, setDepartments] =
    useState([]);

  const [mapping, setMapping] =
    useState({});

  const [crossDepartment, setCrossDepartment] =
    useState({});

  const load = async () => {
    try {
      const response =
        await getPermissions();

      setDepartments(
        response?.data?.departments ||
          []
      );

      const departmentMap = {};
      const crossMap = {};

      (
        response?.data
          ?.permissions || []
      ).forEach((item) => {
        departmentMap[
          item.stage_name
        ] = item.department_id;

        crossMap[
          item.stage_name
        ] =
          item.cross_department;
      });

      setMapping(
        departmentMap
      );

      setCrossDepartment(
        crossMap
      );
    } catch (error) {
      console.error(error);

      alert(
        "Unable to load Collection Permissions."
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      const items = STAGES.map(
        (stage) => ({
          stage_name: stage,
          department_id:
            mapping[stage] ||
            null,
          cross_department:
            !!crossDepartment[
              stage
            ],
        })
      ).filter(
        (item) =>
          item.department_id
      );

      await updatePermissions(
        items
      );

      alert(
        "Collection permissions saved successfully."
      );
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Unable to save permissions."
      );
    }
  };

  return (
    <div className="ct-shell">
      <Hero
        title="Collection Permissions"
        subtitle="Connect each workflow stage to the department responsible for it."
      >
        <button
          type="button"
          className="ct-btn primary"
          onClick={save}
        >
          <FaSave />
          Save
        </button>
      </Hero>

      <div className="ct-card">
        <div className="ct-alert">
          Each stage has one main department.
          Cross-department view can be enabled
          when another team needs to see the stage.
        </div>

        {STAGES.map(
          (stage, index) => (
            <div
              className="ct-stage"
              key={stage}
            >
              <div className="ct-stage-head">
                <div>
                  <h3>
                    {stage}
                  </h3>

                  <div className="ct-muted">
                    Stage {index + 1}
                  </div>
                </div>

                <span className="ct-chip">
                  Access control
                </span>
              </div>

              <div className="ct-stage-body">
                <select
                  className="ct-select"
                  value={
                    mapping[stage] ||
                    ""
                  }
                  onChange={(event) =>
                    setMapping(
                      (current) => ({
                        ...current,
                        [stage]:
                          event.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="">
                    Select department
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {
                          department.department_name
                        }
                      </option>
                    )
                  )}
                </select>

                <label
                  style={{
                    display:
                      "block",
                    marginTop: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      !!crossDepartment[
                        stage
                      ]
                    }
                    onChange={(event) =>
                      setCrossDepartment(
                        (current) => ({
                          ...current,
                          [stage]:
                            event.target
                              .checked,
                        })
                      )
                    }
                  />

                  {" "}
                  Allow cross-department
                  view
                </label>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   EXPORTS
========================================================= */

export {
  ProductList,
  AddProduct,
  Details,
  MasterData,
  Insight,
  Requests,
  Permissions,
};

export default ProductList;
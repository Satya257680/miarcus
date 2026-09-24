import { API_BASE_URL } from "../../axiosConfig.js";
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
  FaChevronDown,
  FaTimes,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaUsers,
  FaBoxOpen,
  FaChartPie,
  FaFilter,
  FaEdit,
  FaEnvelopeOpenText,
  FaUserTie,
  FaShoppingCart,
  FaCogs,
  FaMedal,
  FaTruck,
  FaWarehouse,
  FaShieldAlt,
  FaDatabase,
  FaListAlt,
  FaSlidersH,
  FaPaperclip,
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
import ExportButton from "../../components/common/ExportButton";
import { exportFromCSV } from "../../utils/exportUtils.js";

const STAGES = [
  "Designer",
  "Buyer",
  "Tech Team",
  "Quality",
  "E-Com",
  "Warehouse",
];

const inputType = (type) =>
  ["select", "multiselect", "date", "textarea"].includes(
    type
  )
    ? type
    : "text";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  API_BASE_URL
).replace(/\/+$/, "");

const isAttachmentType = (type) =>
  String(type || "").startsWith("attachment");

const hasFieldValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value === null || value === undefined) {
    return false;
  }

  return String(value).trim() !== "";
};

/*
 * Convert the current stage state into:
 * 1. JSON-safe data
 * 2. real File objects that must be uploaded
 *
 * The server stores uploaded files as attachment metadata
 * inside the stage's JSON data.
 */
const buildStageSubmission = (
  source = {},
  fields = []
) => {
  const data = {};
  const attachments = [];

  Object.entries(source || {}).forEach(
    ([fieldName, value]) => {
      const field = fields.find(
        (item) =>
          item.field_name === fieldName
      );

      if (
        field &&
        isAttachmentType(
          field.display_type
        )
      ) {
        const values = Array.isArray(value)
          ? value
          : value
            ? [value]
            : [];

        data[fieldName] = values
          .filter(
            (item) =>
              !(item instanceof File)
          )
          .map((item) => item);

        values
          .filter(
            (item) =>
              item instanceof File
          )
          .forEach((file) => {
            attachments.push({
              file,
              field_name: fieldName,
            });
          });

        return;
      }

      data[fieldName] = value;
    }
  );

  return {
    data,
    attachments,
  };
};

/* =========================================================
   COMMON HERO
========================================================= */

function Hero({ title, subtitle, children, art, icon: HeroIcon = FaBoxOpen }) {
  return (
    <div className={`ct-hero ${art ? "has-art" : ""}`}>
      <div className="ct-hero-copy">
        <div className="ct-kicker">
          Collection Tracking · Product Workflow
        </div>

        <div className="ct-hero-title-row">
          <span className="ct-hero-icon"><HeroIcon /></span>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="ct-hero-visual">
        {art && (
          <img
            className="ct-hero-art"
            src={art}
            alt=""
            aria-hidden="true"
          />
        )}

        {children && (
          <div className="ct-hero-actions">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   STAGE ARROW NAVIGATION
========================================================= */

function StageNavigator({ currentStage, workflowStage, onStageChange }) {
  const currentIndex = Math.max(0, STAGES.indexOf(currentStage));
  const workflowIndex = Math.max(
    0,
    STAGES.indexOf(workflowStage)
  );

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
        aria-label="Preview previous stage"
        title="Preview previous stage"
      >
        <FaArrowLeft />
      </button>

      <div className="ct-stage-track">
        {STAGES.map((stage, index) => {
          const active = index === currentIndex;
          const completed = index < workflowIndex;
          const future = index > workflowIndex;
          const currentWorkflow = index === workflowIndex;

          return (
            <React.Fragment key={stage}>
              <button
                type="button"
                className={[
                  "ct-stage-step",
                  active ? "active" : "",
                  completed ? "completed" : "",
                  future ? "preview" : "",
                  currentWorkflow ? "workflow-current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onStageChange(stage)}
                aria-current={active ? "step" : undefined}
                title={
                  currentWorkflow
                    ? `${stage} — current workflow stage`
                    : future
                      ? `Preview ${stage} — read-only until the product reaches this stage`
                      : `Preview ${stage}`
                }
              >
                <span className="ct-stage-number">
                  {completed ? <FaCheck /> : index + 1}
                </span>

                <span className="ct-stage-name">{stage}</span>

                <span className="ct-stage-status">
                  {currentWorkflow
                    ? "Current"
                    : completed
                      ? "Done"
                      : "Preview"}
                </span>
              </button>

              {index < STAGES.length - 1 && (
                <span
                  className={`ct-stage-connector ${
                    index < workflowIndex ? "completed" : ""
                  }`}
                  aria-hidden="true"
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
        aria-label="Preview next stage"
        title="Preview next stage"
      >
        <FaArrowRight />
      </button>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function MultiSelectField({ field, value, onChange, readonly = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = React.useRef(null);
  const options = Array.isArray(field.options) ? field.options : [];
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const filtered = options.filter((option) =>
    String(option).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = (option) => {
    if (readonly) return;
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option]
    );
  };

  const selectAll = () => {
    if (readonly) return;
    onChange([...new Set([...selected, ...options])]);
  };

  const clearAll = () => {
    if (readonly) return;
    onChange([]);
  };

  return (
    <div className="ct-multi" ref={ref}>
      <button
        type="button"
        className={`ct-multi-trigger ${readonly ? "ct-readonly" : ""}`}
        disabled={readonly}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="ct-multi-values">
          {selected.length ? selected.map((item) => (
            <span className="ct-value-chip" key={item}>
              {item}
              {!readonly && (
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(item);
                  }}
                >
                  <FaTimes />
                </button>
              )}
            </span>
          )) : (
            <span className="ct-placeholder">Select multiple...</span>
          )}
        </div>
        <span className="ct-multi-meta">
          {selected.length > 0 && <b>{selected.length} selected</b>}
          <FaChevronDown className={open ? "is-open" : ""} />
        </span>
      </button>

      {open && !readonly && (
        <div className="ct-multi-menu">
          <div className="ct-multi-search">
            <FaSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${field.field_name.toLowerCase()}...`}
              autoFocus
            />
          </div>

          <div className="ct-multi-options">
            {filtered.map((option) => {
              const checked = selected.includes(option);
              return (
                <label className={`ct-multi-option ${checked ? "checked" : ""}`} key={option}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(option)}
                  />
                  <span className="ct-checkbox"><FaCheckCircle /></span>
                  <span>{option}</span>
                </label>
              );
            })}
            {!filtered.length && <div className="ct-multi-empty">No options found.</div>}
          </div>

          <div className="ct-multi-footer">
            <span>{selected.length} selected</span>
            <div>
              <button type="button" onClick={selectAll}>Select all</button>
              <button type="button" onClick={clearAll}>Clear all</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ field, value, onChange, readonly = false }) {
  const type = inputType(field.display_type);
  const options = Array.isArray(field.options) ? field.options : [];
  const isAttachment = isAttachmentType(field.display_type);
  const attachmentValues = Array.isArray(value) ? value : value ? [value] : [];

  return (
    <div className={`ct-field ${type === "textarea" ? "full" : ""}`}>
      <label>
        <span>{field.field_name}</span>
        {field.is_mandatory && <span className="req">*</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          className={`ct-textarea ${readonly ? "ct-readonly" : ""}`}
          disabled={readonly}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : type === "select" ? (
        <div className="ct-select-wrap">
          <select
            className={`ct-select ${readonly ? "ct-readonly" : ""}`}
            disabled={readonly}
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">Select...</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      ) : type === "multiselect" ? (
        <MultiSelectField field={field} value={value} onChange={onChange} readonly={readonly} />
      ) : type === "date" ? (
        <input
          className={`ct-input ${readonly ? "ct-readonly" : ""}`}
          type="date"
          disabled={readonly}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : isAttachment ? (
        <div className="ct-attachment-field">
          <input
            className="ct-input"
            type="file"
            multiple={field.display_type.includes("multiple")}
            disabled={readonly}
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files || []);
              if (!selectedFiles.length) return;
              const existing = attachmentValues.filter((item) => !(item instanceof File));
              onChange([...existing, ...selectedFiles]);
            }}
          />
          {attachmentValues.length > 0 && (
            <div className="ct-attachment-list">
              {attachmentValues.map((item, index) => {
                const name = item?.originalname || item?.name || String(item || "");
                const url = item?.url ? (item.url.startsWith("http") ? item.url : `${API_ORIGIN}${item.url}`) : null;
                return (
                  <div className="ct-attachment-item" key={`${name}-${index}`}>
                    {url ? <a href={url} target="_blank" rel="noreferrer">{name}</a> : <span>{name}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <input
          className={`ct-input ${readonly ? "ct-readonly" : ""}`}
          disabled={readonly}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

const DEFAULT_PRODUCT_IMAGE =
  "/collection-tracking/blue-bear-tshirt.png";

const STAGE_META = {
  Designer: { icon: FaUserTie, tone: "designer" },
  Buyer: { icon: FaShoppingCart, tone: "buyer" },
  "Tech Team": { icon: FaCogs, tone: "tech" },
  Quality: { icon: FaMedal, tone: "quality" },
  "E-Com": { icon: FaTruck, tone: "ecom" },
  Warehouse: { icon: FaWarehouse, tone: "warehouse" },
};

const getStageMeta = (stage) =>
  STAGE_META[stage] || {
    icon: FaBoxOpen,
    tone: "default",
  };

const getProductImage = (row) => {
  const source =
    typeof row?.data === "string"
      ? (() => {
          try {
            return JSON.parse(row.data);
          } catch {
            return {};
          }
        })()
      : row?.data || {};

  const candidates = [
    row?.image_url,
    row?.image,
    row?.thumbnail,
    source?.image_url,
    source?.image,
    Array.isArray(source?.images) ? source.images[0] : source?.images,
    Array.isArray(source?.attachments)
      ? source.attachments[0]?.url || source.attachments[0]
      : source?.attachments,
  ];

  const value = candidates.find(
    (item) =>
      typeof item === "string" &&
      item.trim()
  );

  if (!value) return DEFAULT_PRODUCT_IMAGE;

  return value.startsWith("http")
    ? value
    : `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

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

  const handleExport = async (format = "csv") => {
    try {
      const response = await exportProducts();

      const csvText = await response.data.text();

      await exportFromCSV({
        csvText,
        filename: "collection-tracking",
        format,
        title: "Collection Tracking",
      });
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
        title="SKU Details"
        subtitle="Manage and track product SKUs across the complete Collection Tracking workflow."
        art="/collection-tracking/sku-details-hero.png"
        icon={FaBoxOpen}
      >
        <div className="ct-toolbar">
          <button
            type="button"
            className="ct-btn primary ct-btn-glow"
            onClick={() => navigate("/collection-tracking/add-products")}
          >
            <FaPlus />
            Add Details
          </button>

          <button
            type="button"
            className="ct-btn light ct-btn-soft"
            onClick={() => setBulkOpen(true)}
          >
            <FaFileUpload />
            Bulk Upload
          </button>

          <button
            type="button"
            className="ct-btn primary ct-btn-glow"
            onClick={() =>
              navigate(
                "/collection-tracking/add-products"
              )
            }
          >
            <FaPlus />
            Add Product
          </button>

          <ExportButton onExport={handleExport} />

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

      <div className="ct-mini-stats">
        <div><span><FaBoxOpen /></span><small>Total SKUs</small><strong>{total.toLocaleString()}</strong></div>
        <div><span><FaClock /></span><small>Current View</small><strong>{rows.length}</strong></div>
        <div><span><FaUsers /></span><small>Workflow Stages</small><strong>{STAGES.length}</strong></div>
        <div><span><FaChartPie /></span><small>Live Status</small><strong>{loading ? "…" : "Live"}</strong></div>
      </div>

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

        <div className="ct-table-wrapper ct-premium-table">
          <table className="ct-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product Details</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Updated</th>
                <th className="ct-action-head">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <div className="ct-empty ct-empty-loading">
                      <span className="ct-empty-icon"><FaBoxOpen /></span>
                      <b>Loading your collection...</b>
                      <small>Fetching the latest workflow products.</small>
                    </div>
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row, index) => {
                  const stageMeta = getStageMeta(row.current_stage);
                  const StageIcon = stageMeta.icon;

                  return (
                    <tr key={row.id}>
                      <td className="ct-index-cell">
                        <span>{(page - 1) * pageSize + index + 1}</span>
                      </td>

                      <td>
                        <div className="ct-product-cell ct-product-cell-large">
                          <img
                            src={getProductImage(row)}
                            alt={row.product_name || "Product"}
                            className="ct-product-thumb"
                            onError={(event) => {
                              event.currentTarget.src =
                                DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                          <div>
                            <b>{row.product_name || "Blue Bear T-Shirt"}</b>
                            <small>SKU: {row.product_code || "—"}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`ct-stage-pill ${stageMeta.tone}`}>
                          <StageIcon />
                          {row.current_stage || "Designer"}
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
                          <span className="ct-status-dot" />
                          {row.status || "In Progress"}
                        </span>
                      </td>

                      <td>
                        <div className="ct-person-cell">
                          <span className="ct-avatar">{String(row.creator_name || "U").charAt(0).toUpperCase()}</span>
                          <span>{row.creator_name || "—"}</span>
                        </div>
                      </td>

                      <td>
                        <span className="ct-date-text">
                          {row.updated_at
                            ? new Date(row.updated_at).toLocaleString("en-IN")
                            : "—"}
                        </span>
                      </td>

                      <td className="ct-action-cell">
                        <div className="ct-row-actions ct-centered-actions">
                          <button
                            type="button"
                            className="ct-btn light"
                            onClick={() =>
                              navigate(`/collection-tracking/sku-details/${row.id}`)
                            }
                          >
                            <FaEye />
                            View
                          </button>

                          <button
                            type="button"
                            className="ct-btn teal"
                            onClick={() =>
                              navigate(`/collection-tracking/sku-details/${row.id}`)
                            }
                          >
                            <FaEdit />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="ct-btn danger ct-icon-btn"
                            onClick={() => handleDelete(row.id)}
                            aria-label="Delete product"
                            title="Delete product"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="ct-empty ct-empty-state">
                      <span className="ct-empty-icon"><FaEnvelopeOpenText /></span>
                      <b>No products yet</b>
                      <small>
                        Nothing is available for the selected filters.
                        Add a product or upload your collection to get started.
                      </small>
                      <button
                        type="button"
                        className="ct-btn primary"
                        onClick={() => navigate("/collection-tracking/add-products")}
                      >
                        <FaPlus />
                        Add Product
                      </button>
                    </div>
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

  const [fields, setFields] =
    useState([]);

  const [data, setData] =
    useState({});

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response =
          await getConfigs(
            "Designer"
          );

        if (mounted) {
          setFields(
            response?.data
              ?.configs || []
          );
        }
      } catch (error) {
        console.error(
          "Collection Tracking Designer fields:",
          error
        );

        if (mounted) {
          alert(
            error?.response
              ?.data?.message ||
              "Unable to load Designer fields."
          );
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const saveProduct =
    async () => {
      const missing =
        fields.find(
          (field) =>
            field.is_mandatory &&
            !hasFieldValue(
              data[
                field.field_name
              ]
            )
        );

      if (missing) {
        alert(
          `Please fill ${missing.field_name}`
        );
        return;
      }

      setSaving(true);

      try {
        const submission =
          buildStageSubmission(
            data,
            fields
          );

        const response =
          await createProduct({
            product_code:
              data["SKU"] ||
              undefined,

            product_name:
              data["Product Name"] ||
              "",

            data:
              submission.data,

            attachments:
              submission.attachments,
          });

        const productId =
          response?.data
            ?.product?.id;

        if (!productId) {
          throw new Error(
            "Product created but no product ID was returned."
          );
        }

        navigate(
          `/collection-tracking/sku-details/${productId}`
        );
      } catch (error) {
        console.error(
          "Collection Tracking create product:",
          error
        );

        alert(
          error?.response?.data
            ?.message ||
            error?.message ||
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
        art="/collection-tracking/add-product-hero.png"
        icon={FaBoxOpen}
      />

      <div className="ct-card">
        <div className="ct-alert">
          Fill the Designer information
          once. After creation, the same
          product moves through Buyer,
          Tech Team, Quality, E-Com and
          Warehouse.
        </div>

        <div className="ct-form-grid">
          {fields.map(
            (field) => (
              <Field
                key={field.id}
                field={field}
                value={
                  data[
                    field.field_name
                  ]
                }
                onChange={(
                  value
                ) =>
                  setData(
                    (previous) => ({
                      ...previous,
                      [field.field_name]:
                        value,
                    })
                  )
                }
              />
            )
          )}
        </div>

        <div className="ct-actions">
          <button
            type="button"
            className="ct-btn light"
            disabled={saving}
            onClick={() =>
              navigate(
                "/collection-tracking"
              )
            }
          >
            <FaArrowLeft />
            Cancel
          </button>

          <button
            type="button"
            className="ct-btn primary"
            disabled={saving}
            onClick={
              saveProduct
            }
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

  const [result, setResult] =
    useState(null);

  const [configs, setConfigs] =
    useState([]);

  const [stage, setStage] =
    useState("Designer");

  const [data, setData] =
    useState({});

  const [comment, setComment] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const loadProduct =
    async ({
      keepSelectedStage = false,
    } = {}) => {
      try {
        const [
          productResponse,
          configResponse,
        ] = await Promise.all([
          getProduct(id),
          getConfigs(),
        ]);

        const payload =
          productResponse?.data;

        const product =
          payload?.product;

        if (!product) {
          throw new Error(
            "Collection product not found."
          );
        }

        const availableConfigs =
          configResponse?.data
            ?.configs || [];

        const workflowStage =
          product.current_stage ||
          "Designer";

        const selectedStage =
          keepSelectedStage &&
          STAGES.includes(stage)
            ? stage
            : workflowStage;

        setResult(payload);
        setConfigs(
          availableConfigs
        );
        setStage(
          selectedStage
        );
        setData(
          product.stage_data?.[
            selectedStage
          ] || {}
        );
      } catch (error) {
        console.error(
          "Collection Tracking product load:",
          error
        );

        alert(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to load product."
        );
      }
    };

  useEffect(() => {
    loadProduct({
      keepSelectedStage:
        false,
    });
    // Product ID is the only dependency here.
    // Stage changes are handled by changeStage().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const workflowStage =
    result?.product
      ?.current_stage ||
    "Designer";

  const workflowIndex = Math.max(
    0,
    STAGES.indexOf(
      workflowStage
    )
  );

  const selectedIndex = Math.max(
    0,
    STAGES.indexOf(stage)
  );

  const previousStage =
    selectedIndex > 0
      ? STAGES[
          selectedIndex - 1
        ]
      : null;

  const nextSelectedStage =
    selectedIndex <
    STAGES.length - 1
      ? STAGES[
          selectedIndex + 1
        ]
      : null;

  const nextWorkflowStage =
    workflowIndex <
    STAGES.length - 1
      ? STAGES[
          workflowIndex + 1
        ]
      : null;

  const canEdit =
    stage === workflowStage;

  const fields = useMemo(
    () =>
      configs.filter(
        (field) =>
          field.stage_name ===
          stage
      ),
    [configs, stage]
  );

  /*
   * Previous stage data is shown automatically.
   * The current stage's own values override copied values.
   */
  const mergedData =
    useMemo(() => {
      if (!result?.product) {
        return {};
      }

      const merged = {};

      for (
        let index = 0;
        index <= selectedIndex;
        index += 1
      ) {
        const stageName =
          STAGES[index];

        Object.assign(
          merged,
          result.product
            .stage_data?.[
            stageName
          ] || {}
        );
      }

      Object.assign(
        merged,
        data
      );

      return merged;
    }, [
      result,
      selectedIndex,
      data,
    ]);

  const changeStage =
    (newStage) => {
      if (
        !STAGES.includes(
          newStage
        )
      ) {
        return;
      }

      setStage(newStage);

      setData(
        result?.product
          ?.stage_data?.[
          newStage
        ] || {}
      );
    };

  const saveStage =
    async (
      moveToNext = false
    ) => {
      if (!canEdit) {
        alert(
          `This product is currently in ${workflowStage}. You can view ${stage}, but only the current stage can be edited.`
        );
        return;
      }

      const missing =
        fields.find(
          (field) =>
            field.is_mandatory &&
            !hasFieldValue(
              mergedData[
                field.field_name
              ]
            )
        );

      if (missing) {
        alert(
          `Please fill ${missing.field_name}`
        );
        return;
      }

      if (
        moveToNext &&
        !nextWorkflowStage
      ) {
        return;
      }

      setSaving(true);

      try {
        const submission =
          buildStageSubmission(
            data,
            fields
          );

        await updateProductStage(
          id,
          {
            stage,
            data:
              submission.data,
            attachments:
              submission.attachments,
            next_stage:
              moveToNext
                ? nextWorkflowStage
                : null,
          }
        );

        if (moveToNext) {
          /*
           * The backend changes current_stage.
           * Reload without preserving the old selected stage
           * so the UI immediately opens the new team's workspace.
           */
          await loadProduct({
            keepSelectedStage:
              false,
          });
        } else {
          await loadProduct({
            keepSelectedStage:
              true,
          });
        }

        alert(
          moveToNext
            ? `Update sent to ${nextWorkflowStage}. The previous team was notified.`
            : "Update saved successfully. The previous team was notified."
        );
      } catch (error) {
        console.error(
          "Collection Tracking stage save:",
          error
        );

        alert(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to save product update."
        );
      } finally {
        setSaving(false);
      }
    };

  const sendRemark =
    async () => {
      if (!canEdit) {
        alert(
          `Remarks can only be sent from the current stage (${workflowStage}).`
        );
        return;
      }

      const trimmed =
        comment.trim();

      if (!trimmed) {
        alert(
          "Please write a remark first."
        );
        return;
      }

      try {
        await addProductComment(
          id,
          {
            stage:
              workflowStage,
            comment:
              trimmed,
          }
        );

        setComment("");

        await loadProduct({
          keepSelectedStage:
            true,
        });

        alert(
          "Remark sent through website notification and email."
        );
      } catch (error) {
        console.error(
          "Collection Tracking remark:",
          error
        );

        alert(
          error?.response
            ?.data?.message ||
            error?.message ||
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
        <span
          className={`ct-badge ${
            result.product
              .status ===
            "Completed"
              ? "done"
              : "progress"
          }`}
        >
          {result.product
            .current_stage}
        </span>
      </Hero>

      <div className="ct-card">
        <div className="ct-stage-head">
          <div>
            <h3>
              {stage} Workspace
            </h3>

            <div className="ct-muted">
              Current workflow stage:
              {" "}
              <b>
                {workflowStage}
              </b>
              . Previous information is
              automatically available.
            </div>
          </div>

          <span className="ct-chip">
            Step{" "}
            {selectedIndex + 1}
            {" / "}
            {STAGES.length}
          </span>
        </div>

        {!canEdit && (
          <div className="ct-alert">
            You are viewing{" "}
            <b>{stage}</b>.
            This is a read-only preview because
            the product is currently at{" "}
            <b>{workflowStage}</b>.
            Use the arrows to review stages
            without changing the workflow.
          </div>
        )}

        <div
          className="ct-progress"
          style={{
            margin:
              "18px 0",
          }}
        >
          <span
            style={{
              width: `${
                ((workflowIndex + 1) /
                  STAGES.length) *
                100
              }%`,
            }}
          />
        </div>

        <StageNavigator
          currentStage={
            stage
          }
          workflowStage={
            workflowStage
          }
          onStageChange={
            changeStage
          }
        />

        <div
          className={`ct-workflow-banner ${
            canEdit
              ? "current"
              : "preview"
          }`}
        >
          <div>
            <strong>
              {canEdit
                ? `You are working on ${workflowStage}`
                : `You are previewing ${stage}`}
            </strong>

            <span>
              {canEdit
                ? nextWorkflowStage
                  ? ` Save this stage, then submit it to ${nextWorkflowStage}.`
                  : " This is the final stage. Saving completes the workflow."
                : ` The product is currently at ${workflowStage}. ${stage} is read-only until the workflow reaches it.`}
            </span>
          </div>

          {canEdit &&
            nextWorkflowStage && (
              <button
                type="button"
                className="ct-btn primary"
                disabled={saving}
                onClick={() =>
                  saveStage(true)
                }
              >
                <FaPaperPlane />
                Send to{" "}
                {nextWorkflowStage}
                <FaArrowRight />
              </button>
            )}
        </div>

        <div className="ct-form-grid">
          {fields.map(
            (field) => (
              <Field
                key={field.id}
                field={field}
                readonly={
                  !canEdit ||
                  field.display_type ===
                    "readonly"
                }
                value={
                  mergedData[
                    field.field_name
                  ]
                }
                onChange={(
                  value
                ) =>
                  setData(
                    (
                      previous
                    ) => ({
                      ...previous,
                      [field.field_name]:
                        value,
                    })
                  )
                }
              />
            )
          )}
        </div>

        <div className="ct-actions">
          <button
            type="button"
            className="ct-btn light"
            disabled={saving}
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
            disabled={
              saving ||
              !canEdit
            }
            onClick={() =>
              saveStage(
                false
              )
            }
          >
            <FaSave />
            {saving
              ? "Saving..."
              : "Save Update"}
          </button>

          {nextWorkflowStage &&
            canEdit && (
              <button
                type="button"
                className="ct-btn primary"
                disabled={
                  saving
                }
                onClick={() =>
                  saveStage(
                    true
                  )
                }
              >
                <FaPaperPlane />
                Submit to{" "}
                {
                  nextWorkflowStage
                }
                <FaArrowRight />
              </button>
            )}
        </div>

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
            disabled={
              !previousStage
            }
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
            disabled={
              !nextSelectedStage
            }
            onClick={() =>
              nextSelectedStage &&
              changeStage(
                nextSelectedStage
              )
            }
          >
            Next:{" "}
            {nextSelectedStage ||
              "Completed"}
            <FaArrowRight />
          </button>
        </div>

        <div
          className="ct-card"
          style={{
            marginTop: 18,
            boxShadow:
              "none",
            borderStyle:
              "dashed",
          }}
        >
          <h3>
            <FaCommentDots />
            {" "}
            Remark / Update
          </h3>

          <p className="ct-muted">
            Write an update for the
            previous team. The system
            saves it in the product
            history and sends a website
            notification and email.
          </p>

          <textarea
            className="ct-textarea"
            disabled={!canEdit}
            placeholder={
              canEdit
                ? "Write a remark for the previous team..."
                : "Open the current workflow stage to send a remark."
            }
            value={comment}
            onChange={(
              event
            ) =>
              setComment(
                event.target.value
              )
            }
          />

          <div className="ct-actions">
            <button
              type="button"
              className="ct-btn teal"
              disabled={
                !canEdit ||
                !comment.trim()
              }
              onClick={
                sendRemark
              }
            >
              <FaPaperPlane />
              Send Remark
            </button>
          </div>
        </div>
      </div>

      <div className="ct-card">
        <h3>
          Activity & Remarks
        </h3>

        {(result.comments ||
          []).length === 0 &&
          (result.history ||
            []).length === 0 && (
            <div className="ct-empty">
              No activity or remarks yet.
            </div>
          )}

        {(result.comments ||
          []).map(
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
                {" "}
                ·{" "}
                {
                  commentItem.stage_name
                }
                {" "}
                ·{" "}
                {new Date(
                  commentItem.created_at
                ).toLocaleString()}
              </span>

              <div>
                {
                  commentItem.comment
                }
              </div>
            </div>
          )
        )}

        {(result.history ||
          []).map(
          (historyItem) => (
            <div
              className="ct-history"
              key={`history-${historyItem.id}`}
            >
              <b>
                {
                  historyItem.action
                }
                {" "}
                ·{" "}
                {
                  historyItem.stage_name
                }
              </b>

              <div className="ct-muted">
                {
                  historyItem.user_name ||
                  "User"
                }
                {" "}
                ·{" "}
                {new Date(
                  historyItem.created_at
                ).toLocaleString()}
              </div>

              {historyItem.note && (
                <div>
                  {
                    historyItem.note
                  }
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
  const [stage, setStage] = useState("Designer");
  const [fields, setFields] = useState([]);
  const [masterSearch, setMasterSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const response = await getConfigs(stage);
      setFields(response?.data?.configs || []);
    } catch (error) {
      console.error(error);
      alert("Unable to load Master Data.");
    }
  };

  useEffect(() => {
    load();
  }, [stage]);

  const updateField = (index, key, value) => {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index
          ? { ...field, [key]: value }
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
        is_active: true,
        options: [],
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateConfigs(stage, fields);
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

  const StageIcon = getStageMeta(stage).icon;
  const visibleFields = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) =>
      String(field.field_name || "")
        .toLowerCase()
        .includes(masterSearch.trim().toLowerCase())
    );

  return (
    <div className="ct-shell">
      <Hero
        title="Master Data"
        subtitle="Control and manage the fields used at every stage of Collection Tracking."
        art="/collection-tracking/master-data-hero.png"
        icon={FaDatabase}
      >
        <button
          type="button"
          className="ct-btn primary ct-btn-glow"
          onClick={save}
          disabled={saving}
        >
          <FaSave />
          {saving ? "Saving..." : "Save Master Data"}
        </button>
      </Hero>

      <div className="ct-stage-tabs">
        {STAGES.map((item) => {
          const MetaIcon = getStageMeta(item).icon;
          return (
            <button
              type="button"
              className={`ct-stage-tab ${item === stage ? "active" : ""}`}
              key={item}
              onClick={() => setStage(item)}
            >
              <MetaIcon />
              <span>{item}</span>
            </button>
          );
        })}
      </div>

      <div className="ct-card ct-master-card">
        <div className="ct-section-title">
          <div>
            <h3><StageIcon /> Fields Configuration</h3>
            <span>Define and manage the fields required for the {stage} stage.</span>
          </div>

          <div className="ct-master-tools">
            <div className="ct-search-box">
              <FaSearch />
              <input
                placeholder="Search fields..."
                value={masterSearch}
                onChange={(event) => setMasterSearch(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="ct-select stage-selector"
              onClick={() => setStage(stage)}
            >
              <StageIcon /> {stage} <FaChevronDown />
            </button>
            <button
              type="button"
              className="ct-btn primary"
              onClick={addField}
            >
              <FaPlus />
              Add Field
            </button>
          </div>
        </div>

        <div className="ct-table-wrapper ct-premium-table">
          <table className="ct-table ct-master-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Requirement</th>
                <th>Field Name</th>
                <th>Display Type</th>
                <th>Dropdown Options / Default Value</th>
                <th>Status</th>
                <th className="ct-action-head">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleFields.length ? visibleFields.map(({ field, index }) => (
                <tr key={field.id || index}>
                  <td className="ct-index-cell">{index + 1}</td>
                  <td>
                    <button
                      type="button"
                      className={`ct-requirement ${field.is_mandatory ? "mandatory" : "optional"}`}
                      onClick={() =>
                        updateField(index, "is_mandatory", !field.is_mandatory)
                      }
                    >
                      {field.is_mandatory ? "★ Mandatory" : "◌ Optional"}
                    </button>
                  </td>
                  <td>
                    <div className="ct-field-name-cell">
                      <span className="ct-field-icon"><FaListAlt /></span>
                      <input
                        className="ct-input"
                        value={field.field_name || ""}
                        onChange={(event) =>
                          updateField(index, "field_name", event.target.value)
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <select
                      className="ct-select"
                      value={field.display_type || "text"}
                      onChange={(event) =>
                        updateField(index, "display_type", event.target.value)
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
                      ].map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {["select", "multiselect"].includes(field.display_type) ? (
                      <textarea
                        className="ct-textarea ct-options-input"
                        value={(field.options || []).join(", ")}
                        onChange={(event) =>
                          updateField(
                            index,
                            "options",
                            event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="Option A, Option B, Option C"
                      />
                    ) : (
                      <span className="ct-muted">
                        {field.display_type === "readonly"
                          ? "Read-only / copied from previous stage"
                          : "No option list required"}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`ct-status-toggle ${field.is_active === false ? "off" : ""}`}
                      onClick={() =>
                        updateField(
                          index,
                          "is_active",
                          field.is_active !== false
                        )
                      }
                    >
                      <span />
                      {field.is_active === false ? "Inactive" : "Active"}
                    </button>
                  </td>
                  <td className="ct-action-cell">
                    <button
                      type="button"
                      className="ct-btn danger ct-icon-btn"
                      onClick={() =>
                        setFields((current) =>
                          current.filter((_, fieldIndex) => fieldIndex !== index)
                        )
                      }
                      title="Remove field"
                      aria-label="Remove field"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7">
                    <div className="ct-empty ct-empty-state">
                      <span className="ct-empty-icon"><FaDatabase /></span>
                      <b>No fields configured</b>
                      <small>Add the first field for the {stage} stage.</small>
                      <button type="button" className="ct-btn primary" onClick={addField}>
                        <FaPlus /> Add Field
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INSIGHT
========================================================= */

function Insight() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getInsight();
        setData(response?.data);
      } catch (error) {
        console.error(error);
        alert("Unable to load Collection Tracking insight.");
      }
    };
    load();
  }, []);

  const total = Number(data?.summary?.total || 0);
  const stageRows = (data?.stages || []).map((item) => ({ ...item, count: Number(item.count || 0) }));
  const maxStage = Math.max(...stageRows.map((item) => item.count), 1);
  const stageColors = ["#6b3ff0", "#3f8cff", "#22b8d6", "#ff9f43", "#f15b9a", "#25c58a"];
  const completed = stageRows.find((item) => item.stage === "Warehouse")?.count || 0;
  const progress = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  let cumulative = 0;
  const donutSegments = stageRows.map((item, index) => {
    const start = cumulative;
    const size = total ? (item.count / total) * 100 : 0;
    cumulative += size;
    return `${stageColors[index % stageColors.length]} ${start}% ${cumulative}%`;
  }).join(", ");

  return (
    <div className="ct-shell">
      <Hero
        title="Insight"
        subtitle="Live numbers and workflow progress across every Collection Tracking stage."
        art="/collection-tracking/insight-hero.png"
        icon={FaChartPie}
      />

      <div className="ct-grid ct-insight-stats">
        <div className="ct-stat"><span className="ct-stat-icon purple"><FaBoxOpen /></span><small>Total Products</small><strong>{total.toLocaleString()}</strong><em>Live workflow volume</em></div>
        <div className="ct-stat"><span className="ct-stat-icon blue"><FaUsers /></span><small>Unique Product Names</small><strong>{Number(data?.summary?.products || 0).toLocaleString()}</strong><em>Distinct products</em></div>
        <div className="ct-stat"><span className="ct-stat-icon cyan"><FaChartPie /></span><small>Active Stages</small><strong>{stageRows.length}</strong><em>Configured workflow</em></div>
        <div className="ct-stat"><span className="ct-stat-icon green"><FaCheckCircle /></span><small>Workflow Progress</small><strong>{progress}%</strong><em>Reached Warehouse</em></div>
      </div>

      <div className="ct-insight-grid">
        <div className="ct-card ct-chart-card">
          <div className="ct-section-title"><div><h3>Overall Workflow Progress</h3><span>Product distribution across the complete workflow.</span></div><span className="ct-live-dot">LIVE</span></div>
          <div className="ct-donut-row">
            <div className="ct-donut" style={{ background: `conic-gradient(${donutSegments || "#ececf5 0 100%"})` }}><div><strong>{total.toLocaleString()}</strong><span>Products</span></div></div>
            <div className="ct-legend">
              {stageRows.map((item, index) => <div key={item.stage}><i style={{ background: stageColors[index % stageColors.length] }} /><span>{item.stage}</span><b>{item.count}</b><small>{total ? Math.round(item.count / total * 100) : 0}%</small></div>)}
            </div>
          </div>
        </div>

        <div className="ct-card ct-chart-card">
          <div className="ct-section-title"><div><h3>Stage-wise Distribution</h3><span>Current product volume by team.</span></div><span className="ct-chart-label">STAGES</span></div>
          <div className="ct-bars">
            {stageRows.map((item, index) => <div className="ct-bar-item" key={item.stage}><div className="ct-bar-value">{item.count}</div><div className="ct-bar-track"><span style={{ height: `${Math.max(7, item.count / maxStage * 100)}%`, background: stageColors[index % stageColors.length] }} /></div><small>{item.stage}</small></div>)}
          </div>
        </div>
      </div>

      <div className="ct-card ct-workflow-card">
        <div className="ct-section-title"><div><h3>Team Workflow Progress</h3><span>See how products move from Designer to Warehouse.</span></div></div>
        <div className="ct-flow-grid">
          {STAGES.map((stage, index) => {
            const item = stageRows.find((row) => row.stage === stage);
            const count = item?.count || 0;
            const pct = total ? Math.round(count / total * 100) : 0;
            return <React.Fragment key={stage}>
              <div className="ct-flow-stage"><div className="ct-flow-circle" style={{ background: `conic-gradient(${stageColors[index % stageColors.length]} ${pct}%, #ececf5 0)` }}><div><FaBoxOpen /></div></div><b>{stage}</b><span>{count.toLocaleString()} / {total.toLocaleString()}</span><small>{pct}%</small><div className="ct-flow-line"><span style={{ width: `${pct}%`, background: stageColors[index % stageColors.length] }} /></div></div>
              {index < STAGES.length - 1 && <div className="ct-flow-arrow">›</div>}
            </React.Fragment>;
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REQUESTS
========================================================= */

function Requests() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const response = await getRequests(status === "All" ? "" : status);
      setRows(response?.data?.requests || []);
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          "Unable to load requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const review = async (id, nextStatus) => {
    try {
      await reviewRequest(id, nextStatus);
      await load();
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          "Unable to update request."
      );
    }
  };

  const filteredRows = rows.filter((request) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return [
      request.id,
      request.product_code,
      request.product_name,
      request.from_stage,
      request.to_stage,
      request.requester_name,
      request.status,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(term)
      );
  });

  return (
    <div className="ct-shell">
      <Hero
        title="Requests"
        subtitle="Requests from one team to another appear here for review."
        art="/collection-tracking/requests-hero.png"
        icon={FaEnvelopeOpenText}
      >
        <div className="ct-request-hero-badge">
          <FaPaperPlane />
          Next-team workflow
        </div>
      </Hero>

      <div className="ct-card ct-request-card">
        <div className="ct-request-tabs">
          {[
            ["All", "All Requests", <FaEnvelopeOpenText />],
            ["Pending", "Pending", <FaClock />],
            ["Approved", "Approved", <FaCheckCircle />],
            ["Rejected", "Rejected", <FaTimes />],
          ].map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              className={status === value ? "active" : ""}
              onClick={() => setStatus(value)}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="ct-toolbar ct-request-toolbar">
          <div className="ct-search-box ct-request-search">
            <FaSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by request ID, product, or submitted by..."
            />
          </div>

          <select
            className="ct-select ct-filter-select"
            value=""
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Quick filter"
          >
            <option value="">All stages</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>

          <button
            type="button"
            className="ct-btn light"
            onClick={load}
            disabled={loading}
          >
            <FaFilter />
            Refresh
          </button>
        </div>

        <div className="ct-table-wrapper ct-premium-table">
          <table className="ct-table ct-request-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Request ID</th>
                <th>Product / Details</th>
                <th>From Team</th>
                <th>To Team</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Submitted On</th>
                <th className="ct-action-head">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((request, index) => {
                const fromMeta = getStageMeta(request.from_stage);
                const toMeta = getStageMeta(request.to_stage);
                const FromIcon = fromMeta.icon;
                const ToIcon = toMeta.icon;

                return (
                  <tr key={request.id}>
                    <td className="ct-index-cell">{index + 1}</td>

                    <td>
                      <b className="ct-request-id">
                        REQ-{String(request.id).padStart(6, "0")}
                      </b>
                    </td>

                    <td>
                      <div className="ct-product-cell ct-product-cell-large">
                        <img
                          src={getProductImage(request)}
                          alt={request.product_name || "Product"}
                          className="ct-product-thumb"
                          onError={(event) => {
                            event.currentTarget.src =
                              DEFAULT_PRODUCT_IMAGE;
                          }}
                        />
                        <div>
                          <b>{request.product_name || "Blue Bear T-Shirt"}</b>
                          <small>
                            {request.product_code || "SKU not assigned"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="ct-team-pill">
                        <FromIcon />
                        {request.from_stage || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="ct-team-pill next">
                        <ToIcon />
                        {request.to_stage || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="ct-flow-pill">
                        <span>{request.from_stage || "—"}</span>
                        <b>→</b>
                        <span>{request.to_stage || "—"}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`ct-status-pill ${String(request.status || "").toLowerCase()}`}>
                        {request.status || "Pending"}
                      </span>
                    </td>

                    <td>
                      <div className="ct-date-cell">
                        {request.created_at
                          ? new Date(request.created_at).toLocaleDateString("en-IN")
                          : "—"}
                        <small>
                          {request.requester_name
                            ? `by ${request.requester_name}`
                            : "Workflow request"}
                        </small>
                      </div>
                    </td>

                    <td className="ct-action-cell">
                      <div className="ct-row-actions ct-centered-actions">
                        {status === "Pending" || status === "All" ? (
                          <>
                            <button
                              type="button"
                              className="ct-btn primary"
                              onClick={() => review(request.id, "Approved")}
                            >
                              <FaCheck /> Approve
                            </button>
                            <button
                              type="button"
                              className="ct-btn danger"
                              onClick={() => review(request.id, "Rejected")}
                            >
                              <FaTimes /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="ct-reviewed">
                            <FaCheckCircle /> Reviewed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredRows.length && (
                <tr>
                  <td colSpan="9">
                    <div className="ct-empty ct-email-empty">
                      <span className="ct-empty-icon"><FaEnvelopeOpenText /></span>
                      <b>{loading ? "Loading requests..." : "Nothing here yet"}</b>
                      <small>
                        {loading
                          ? "We're checking the workflow queue."
                          : `No ${status === "All" ? "" : status.toLowerCase() + " "}requests are available right now.`}
                      </small>
                      {!loading && (
                        <button type="button" className="ct-btn light" onClick={load}>
                          <FaFilter /> Refresh
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Permissions() {
  const [departments, setDepartments] = useState([]);
  const [mapping, setMapping] = useState({});
  const [crossDepartment, setCrossDepartment] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const response = await getPermissions();

      setDepartments(response?.data?.departments || []);

      const departmentMap = {};
      const crossMap = {};

      (response?.data?.permissions || []).forEach((item) => {
        departmentMap[item.stage_name] = item.department_id;
        crossMap[item.stage_name] = item.cross_department;
      });

      setMapping(departmentMap);
      setCrossDepartment(crossMap);
    } catch (error) {
      console.error(error);
      alert("Unable to load Collection Permissions.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);

    try {
      const items = STAGES.map((stage) => ({
        stage_name: stage,
        department_id: mapping[stage] || null,
        cross_department: !!crossDepartment[stage],
      })).filter((item) => item.department_id);

      await updatePermissions(items);
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          "Unable to save permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-shell">
      <Hero
        title="Collection Permissions"
        subtitle="Connect each workflow stage to the department responsible for it."
        art="/collection-tracking/permissions-hero.png"
        icon={FaShieldAlt}
      >
        <button
          type="button"
          className="ct-btn primary ct-btn-glow"
          onClick={save}
          disabled={saving}
        >
          <FaSave />
          {saving ? "Saving..." : "Save Permissions"}
        </button>
      </Hero>

      <div className="ct-card ct-permissions-card">
        <div className="ct-alert ct-permission-alert">
          <FaShieldAlt />
          <div>
            <b>Stage access control</b>
            <span>
              Each stage has one main department. Enable cross-department view
              when another team needs visibility.
            </span>
          </div>
        </div>

        <div className="ct-permission-list">
          {STAGES.map((stage, index) => {
            const MetaIcon = getStageMeta(stage).icon;
            const tone = getStageMeta(stage).tone;

            return (
              <div className={`ct-permission-row ${tone}`} key={stage}>
                <div className="ct-permission-stage">
                  <span className="ct-permission-number">{index + 1}</span>
                  <span className="ct-permission-icon"><MetaIcon /></span>
                  <div>
                    <b>{stage}</b>
                    <small>Stage {index + 1}</small>
                  </div>
                </div>

                <div className="ct-permission-select">
                  <label>Responsible department</label>
                  <select
                    className="ct-select"
                    value={mapping[stage] || ""}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [stage]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="ct-cross-toggle">
                  <input
                    type="checkbox"
                    checked={!!crossDepartment[stage]}
                    onChange={(event) =>
                      setCrossDepartment((current) => ({
                        ...current,
                        [stage]: event.target.checked,
                      }))
                    }
                  />
                  <span className="ct-checkbox-ui" />
                  <span>
                    <b>Allow cross-department view</b>
                    <small>Let other teams see this stage</small>
                  </span>
                </label>

                <button
                  type="button"
                  className="ct-access-btn"
                  onClick={() =>
                    document
                      .querySelector(
                        `.ct-permission-row.${tone} select`
                      )
                      ?.focus()
                  }
                >
                  <FaShieldAlt />
                  Access control
                </button>
              </div>
            );
          })}
        </div>
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
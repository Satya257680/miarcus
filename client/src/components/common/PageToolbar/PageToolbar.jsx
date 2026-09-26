import {
  FaSearch,
  FaPlus,
  FaUpload,
  FaTrash,
} from "react-icons/fa";

import ExportButton from "../ExportButton/ExportButton";

import "../../../styles/common/PageToolbar.css";

function PageToolbar({

  // ==========================================
  // Search
  // ==========================================

  search = "",
  setSearch = () => {},
  placeholder = "Search...",
  searchPlaceholder,

  // ==========================================
  // Add
  // ==========================================

  showAdd = false,
  addText = "Add",
  addLabel,
  onAdd,

  // ==========================================
  // Export
  // ==========================================

  showExport = false,
  onExport,
  exportFormats = ["csv", "xlsx", "pdf"],
  exportLoading = false,

  // ==========================================
  // Bulk Upload
  // ==========================================

  showBulk = false,
  showBulkUpload = false,
  onBulk,
  onBulkUpload,

  // ==========================================
  // Delete All
  // ==========================================

  showDeleteAll = false,
  onDeleteAll,
  deleteAllText = "Delete All",

  // ==========================================
  // Extra Buttons
  // ==========================================

  children,

}) {

  const bulkVisible = showBulk || showBulkUpload;

  const bulkHandler = onBulk || onBulkUpload;

  const addButtonText = addLabel || addText;

  return (

    <div className="page-toolbar">

      {/* ======================================
          Search
      ====================================== */}

      <div className="toolbar-search">

        <FaSearch className="toolbar-search-icon" />

        <input
          type="text"
          placeholder={searchPlaceholder || placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>

      {/* ======================================
          Buttons
      ====================================== */}

      <div className="toolbar-buttons">

        {showAdd && (

          <button
            className="toolbar-btn add-btn"
            onClick={onAdd}
          >
            <FaPlus />
            {addButtonText}
          </button>

        )}

        {showExport && (

          <ExportButton
            onExport={onExport}
            formats={exportFormats}
            loading={exportLoading}
          />

        )}

        {bulkVisible && (

          <button
            className="toolbar-btn bulk-btn"
            onClick={bulkHandler}
          >
            <FaUpload />
            Bulk Upload
          </button>

        )}

        {showDeleteAll && (

          <button
            className="toolbar-btn delete-btn"
            onClick={onDeleteAll}
          >
            <FaTrash />
            {deleteAllText}
          </button>

        )}

        {children}

      </div>

    </div>

  );

}

export default PageToolbar;
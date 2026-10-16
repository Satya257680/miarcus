import { useEffect, useRef, useState } from "react";

import {
  FaSearch,
  FaTimes,
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

  // When > 0, typing only updates the box; the search is applied once
  // the user stops typing for this many ms, or immediately on Enter.
  // 0 (default) keeps the old "search on every keystroke" behaviour,
  // which is fine for pages that filter in the browser (e.g. Users).
  debounceMs = 0,

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

  // ==========================================
  // Debounced search (opt-in via debounceMs)
  // ==========================================

  const deferred = Number(debounceMs) > 0;

  const [draft, setDraft] = useState(search || "");

  const timerRef = useRef(null);

  // Keep the box in sync when the page changes `search` itself
  // (e.g. "Clear Filters").
  // Only overwrite what's typed when it really differs (ignoring
  // spaces at the ends), so a pause after "mrpl " keeps the space.
  useEffect(() => {
    const applied = String(search || "");
    setDraft((current) =>
      current.trim() === applied.trim() ? current : applied
    );
  }, [search]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const commitSearch = (value) => {
    clearTimeout(timerRef.current);
    const next = String(value ?? "").trim();
    if (next !== String(search || "").trim()) {
      setSearch(next);
    }
  };

  const handleSearchChange = (value) => {
    if (!deferred) {
      setSearch(value);
      return;
    }
    setDraft(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commitSearch(value), Number(debounceMs));
  };

  const handleSearchKeyDown = (e) => {
    if (deferred && e.key === "Enter") {
      e.preventDefault();
      commitSearch(draft);
    }
  };

  const handleSearchClear = () => {
    setDraft("");
    commitSearch("");
  };

  const inputValue = deferred ? draft : search;

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
          value={inputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={deferred ? () => commitSearch(draft) : undefined}
          autoComplete="off"
          enterKeyHint="search"
        />

        {deferred && draft && (
          <button
            type="button"
            className="toolbar-search-clear"
            onClick={handleSearchClear}
            title="Clear search"
            aria-label="Clear search"
          >
            <FaTimes />
          </button>
        )}

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
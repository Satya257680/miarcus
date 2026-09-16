import { useEffect, useRef, useState } from "react";
import {
  FaFileExport,
  FaChevronDown,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
} from "react-icons/fa";

import "../../../styles/common/ExportButton.css";

const FORMAT_META = {
  csv: { label: "CSV", icon: FaFileCsv },
  xlsx: { label: "Excel (XLSX)", icon: FaFileExcel },
  pdf: { label: "PDF", icon: FaFilePdf },
};

/**
 * Export button with a CSV / XLSX / PDF dropdown.
 *
 * Usage:
 *   <ExportButton onExport={(format) => handleExport(format)} />
 *
 * `onExport` is called with the chosen format ("csv" | "xlsx" | "pdf").
 */
function ExportButton({
  onExport,
  formats = ["csv", "xlsx", "pdf"],
  loading = false,
  text = "Export",
  disabled = false,
  align = "right",
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const isDisabled = loading || disabled;

  const handleToggle = () => {
    if (isDisabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (format) => {
    setOpen(false);
    onExport?.(format);
  };

  return (
    <div className="export-button-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="export-button"
        onClick={handleToggle}
        disabled={isDisabled}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <FaFileExport />
        {loading ? "Exporting..." : text}
        {formats.length > 1 && <FaChevronDown className="export-button-caret" />}
      </button>

      {open && (
        <div className={`export-menu export-menu-${align}`}>
          {formats.map((format) => {
            const meta = FORMAT_META[format] || {
              label: format.toUpperCase(),
              icon: FaFileExport,
            };
            const Icon = meta.icon;

            return (
              <button
                type="button"
                key={format}
                className="export-menu-item"
                onClick={() => handleSelect(format)}
              >
                <Icon className={`export-menu-icon export-menu-icon-${format}`} />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExportButton;

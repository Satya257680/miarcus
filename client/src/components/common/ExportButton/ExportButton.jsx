import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const ALL_FORMATS = ["csv", "xlsx", "pdf"];

/**
 * Export button with a CSV / Excel (XLSX) / PDF dropdown.
 *
 * Usage:
 *   <ExportButton onExport={(format) => handleExport(format)} />
 *
 * `onExport` is called with the chosen format ("csv" | "xlsx" | "pdf").
 *
 * FIX: the dropdown is rendered in a portal on <body> with fixed
 * positioning. Before, it was an absolutely positioned child of the
 * button, so on pages that place the button inside a hero/card with
 * `overflow: hidden` (SKU Details, Training Report, Checklist Tracker,
 * ...) the menu was cut off and only "CSV" / "Excel" were visible —
 * PDF could not be reached. Now all three formats always show, and
 * the menu flips above the button when there is no room below.
 */
function ExportButton({
  onExport,
  formats = ALL_FORMATS,
  loading = false,
  text = "Export",
  disabled = false,
  align = "right",
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Always offer every format unless a page explicitly narrows it to
  // a known subset.
  const list = (Array.isArray(formats) && formats.length ? formats : ALL_FORMATS).filter(
    (format, index, arr) => arr.indexOf(format) === index
  );

  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = Math.max(180, rect.width);
    const menuHeight = menuRef.current?.offsetHeight || list.length * 40 + 14;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + gap + 8 && rect.top > menuHeight + gap;

    let left = align === "left" ? rect.left : rect.right - menuWidth;
    left = Math.min(Math.max(8, left), window.innerWidth - menuWidth - 8);

    setPosition({
      top: openUp ? rect.top - menuHeight - gap : rect.bottom + gap,
      left,
      width: menuWidth,
    });
  }, [align, list.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      if (
        wrapperRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  const isDisabled = loading || disabled;

  const handleToggle = () => {
    if (isDisabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (format) => {
    setOpen(false);
    onExport?.(format);
  };

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            className="export-menu export-menu-portal"
            role="menu"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              minWidth: position.width,
              right: "auto",
              zIndex: 10050,
            }}
          >
            {list.map((format) => {
              const meta = FORMAT_META[format] || {
                label: format.toUpperCase(),
                icon: FaFileExport,
              };
              const Icon = meta.icon;

              return (
                <button
                  type="button"
                  key={format}
                  role="menuitem"
                  className="export-menu-item"
                  onClick={() => handleSelect(format)}
                >
                  <Icon className={`export-menu-icon export-menu-icon-${format}`} />
                  {meta.label}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="export-button-wrapper" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="export-button"
        onClick={handleToggle}
        disabled={isDisabled}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <FaFileExport />
        {loading ? "Exporting..." : text}
        {list.length > 1 && <FaChevronDown className="export-button-caret" />}
      </button>

      {menu}
    </div>
  );
}

export default ExportButton;

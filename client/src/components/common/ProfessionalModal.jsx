import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

import "../../styles/common/ProfessionalModal.css";

function ProfessionalModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  width = "760px",
  className = "",
  closeOnOverlay = true,
}) {
  // =====================================================
  // ESCAPE KEY + BODY SCROLL LOCK
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscape);

    document.body.classList.add("professional-modal-open");

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.classList.remove("professional-modal-open");
    };
  }, [isOpen, onClose]);

  // =====================================================
  // DON'T RENDER WHEN CLOSED
  // =====================================================

  if (!isOpen) {
    return null;
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="professional-modal-overlay"
      onMouseDown={(event) => {
        if (
          closeOnOverlay &&
          event.target === event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <div
        className={`professional-modal ${className}`}
        style={{
          "--professional-modal-width": width,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-modal-title"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <div className="professional-modal-header">
          <div className="professional-modal-heading">
            {icon && (
              <div className="professional-modal-icon">
                {icon}
              </div>
            )}

            <div className="professional-modal-title-area">
              <h2 id="professional-modal-title">
                {title}
              </h2>

              {subtitle && (
                <p>{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="professional-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* =================================================
            BODY
            ================================================= */}

        <div className="professional-modal-body">
          {children}
        </div>

        {/* =================================================
            FOOTER
            ================================================= */}

        {footer && (
          <div className="professional-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfessionalModal;
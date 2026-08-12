import { useEffect } from "react";
import "../../styles/common/ProfessionalModal.css";

function ProfessionalModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon = "+",
  children,
  footer,
  size = "medium",
  scrollable = false,
  closeOnOverlay = true,
  showFooter = true,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (
      closeOnOverlay &&
      event.target === event.currentTarget
    ) {
      onClose();
    }
  };

  return (
    <div
      className="professional-modal-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`professional-modal professional-modal-${size} ${
          scrollable
            ? "professional-modal-scrollable"
            : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-modal-title"
      >
        {/* ================================
            HEADER
        ================================= */}
        <div className="professional-modal-header">
          <div className="professional-modal-heading">
            <div className="professional-modal-icon">
              {icon}
            </div>

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
            aria-label="Close modal"
          >
            <span>×</span>
          </button>
        </div>

        {/* ================================
            CONTENT
        ================================= */}
        <div className="professional-modal-content">
          {children}
        </div>

        {/* ================================
            FOOTER
        ================================= */}
        {showFooter && (
          <div className="professional-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfessionalModal;
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../../styles/common/ConfirmDialog.css";

function GlassConfirmDialog({
  title = "Delete Record",
  message = "Are you sure you want to delete this record?",
  confirmText = "Delete Record",
  cancelText = "Cancel",
  recordName = "",
  email = "",
  department = "",
  role = "",
  status = "",
  danger = true,
  onConfirm,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel]);

  const handleConfirm = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await onConfirm();
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="confirm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <span className="confirm-orbit confirm-orbit--one" />
        <span className="confirm-orbit confirm-orbit--two" />

        <header className="confirm-header">
          <div className={`confirm-icon ${danger ? "is-danger" : ""}`}>
            {danger ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 8v5m0 4h.01M10.3 3.9 1.8 19a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3l-8.5-15.1a2 2 0 0 0-3.4 0Z" />
              </svg>
            )}
          </div>

          <div className="confirm-heading-copy">
            <span className="confirm-eyebrow">M I A R C U S</span>
            <h2 id="confirm-title">
              {title.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="confirm-title-accent">
                {title.split(" ").slice(-1).join("")}
              </span>
            </h2>
          </div>

          <button
            type="button"
            className="confirm-close"
            aria-label="Close confirmation"
            disabled={loading}
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <div className="confirm-body">
          <p id="confirm-message">{message}</p>

          {recordName && (
            <div className="confirm-context-card">
              <span className="confirm-scope">Selected record</span>

              <div className="confirm-record">
                <div className="confirm-record-avatar">
                  {recordName.trim().charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong className="confirm-record-name">
                    {recordName}
                  </strong>
                  {email && <p className="confirm-record-email">{email}</p>}
                </div>
              </div>

              {(department || role || status) && (
                <div className="confirm-record-details">
                  {department && (
                    <div>
                      <span>Department</span>
                      <strong>{department}</strong>
                    </div>
                  )}

                  {role && (
                    <div>
                      <span>Role</span>
                      <strong>{role}</strong>
                    </div>
                  )}

                  {status && (
                    <div>
                      <span>Status</span>
                      <strong className="confirm-status">{status}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {danger && (
            <div className="confirm-warning">
              <span className="confirm-warning-icon">!</span>
              <div>
                <strong>This action cannot be undone!</strong>
                <p>
                  The selected data will be permanently removed. Please
                  confirm before continuing.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="confirm-footer">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={onCancel}
          >
            <span aria-hidden="true">×</span> {cancelText}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            disabled={loading}
            onClick={handleConfirm}
          >
            <svg
              className="confirm-button-trash"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
            </svg>
            {loading ? "Please wait..." : confirmText}
          </button>
        </footer>
      </section>
    </div>
  );
}

/**
 * Usage:
 * const confirmed = await confirmWithGlass({
 *   title: "Delete User",
 *   message: "Are you sure you want to delete this user?",
 *   recordName: user.name,
 *   email: user.email,
 * });
 *
 * if (confirmed) {
 *   // Run your existing delete API request.
 * }
 */
export default function confirmWithGlass(input = {}) {
  // Existing modules may pass a plain message string; newer callers can pass
  // an options object with record context. Support both forms.
  const options = typeof input === "string" ? { message: input } : (input || {});

  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.className = "confirm-dialog-root";
    document.body.appendChild(container);

    const root = createRoot(container);
    let settled = false;

    const cleanup = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);

      requestAnimationFrame(() => {
        root.unmount();
        container.remove();
      });
    };

    root.render(
      <GlassConfirmDialog
        {...options}
        onConfirm={async () => {
          try {
            if (options.onConfirm) await options.onConfirm();
            cleanup(true);
          } catch (error) {
            cleanup(false);
            throw error;
          }
        }}
        onCancel={() => cleanup(false)}
      />
    );
  });
}
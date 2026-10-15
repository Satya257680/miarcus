
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../../styles/common/ConfirmDialog.css";

function MiarcusLogo() {
  return (
    <svg
      className="confirm-miarcus-logo"
      viewBox="0 0 210 88"
      role="img"
      aria-label="MIARCUS"
    >
      <g fill="currentColor">
        <path d="M8 47V13h9l12 16 12-16h9v34h-10V29L29 43 18 29v18z" />
        <rect x="58" y="25" width="10" height="22" rx="2" />
        <circle cx="63" cy="16" r="5" />
      </g>
      <g transform="translate(78 5)">
        <path d="M0 40 A40 40 0 0 1 80 40 L68 40 A28 28 0 0 0 12 40Z" fill="#f06a45" />
        <path d="M12 40 A28 28 0 0 1 68 40 L58 40 A18 18 0 0 0 22 40Z" fill="#ffad65" />
        <path d="M22 40 A18 18 0 0 1 58 40 L48 40 A8 8 0 0 0 32 40Z" fill="#ffe66d" />
        <path d="M32 40 A8 8 0 0 1 48 40 L32 40Z" fill="#8ed7ca" />
      </g>
      <text
        x="8"
        y="78"
        fontSize="31"
        fontWeight="800"
        letterSpacing="-.7"
        fill="currentColor"
      >
        arcus
      </text>
    </svg>
  );
}

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
      if (onConfirm) await onConfirm();
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const titleParts = title.trim().split(/\s+/);
  const titleStart = titleParts.slice(0, -1).join(" ");
  const titleEnd = titleParts.at(-1) || "";

  return (
    <div
      className="confirm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      {/* Decorative neon rings */}
      <div className="confirm-neon-orbit confirm-neon-orbit--one" aria-hidden="true" />
      <div className="confirm-neon-orbit confirm-neon-orbit--two" aria-hidden="true" />
      <div className="confirm-neon-orbit confirm-neon-orbit--three" aria-hidden="true" />

      {/* Floating ice cubes */}
      <span className="confirm-ice-cube confirm-ice-cube--one" aria-hidden="true" />
      <span className="confirm-ice-cube confirm-ice-cube--two" aria-hidden="true" />
      <span className="confirm-ice-cube confirm-ice-cube--three" aria-hidden="true" />
      <span className="confirm-ice-cube confirm-ice-cube--four" aria-hidden="true" />

      {/* Colored particles */}
      <span className="confirm-neon-particle confirm-particle--one" aria-hidden="true" />
      <span className="confirm-neon-particle confirm-particle--two" aria-hidden="true" />
      <span className="confirm-neon-particle confirm-particle--three" aria-hidden="true" />
      <span className="confirm-neon-particle confirm-particle--four" aria-hidden="true" />
      <span className="confirm-neon-particle confirm-particle--five" aria-hidden="true" />

      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <span className="confirm-orbit confirm-orbit--one" aria-hidden="true" />
        <span className="confirm-orbit confirm-orbit--two" aria-hidden="true" />

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
            <MiarcusLogo />
            <h2 id="confirm-title">
              {titleStart}{" "}
              <span className="confirm-title-accent">{titleEnd}</span>
            </h2>
            <p className="confirm-subtitle">{message}</p>
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
          {recordName && (
            <div className="confirm-context-card">
              <span className="confirm-scope">Selected record</span>

              <div className="confirm-record">
                <div className="confirm-record-avatar">
                  {recordName.trim().charAt(0).toUpperCase()}
                </div>

                <div className="confirm-record-identity">
                  <strong className="confirm-record-name">{recordName}</strong>
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
                  All related data may also be removed. Please confirm
                  before continuing.
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="confirm-footer">
          <button
            type="button"
            className="confirm-cancel-button"
            disabled={loading}
            onClick={onCancel}
          >
            <span aria-hidden="true">×</span> {cancelText}
          </button>

          <button
            type="button"
            className="confirm-delete-button"
            disabled={loading}
            onClick={handleConfirm}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
            </svg>
            {loading ? "Please wait..." : confirmText}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function confirmWithGlass(input = {}) {
  const options =
    typeof input === "string" ? { message: input } : input || {};

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
        onCancel={() => cleanup(false)}
        onConfirm={async () => {
          try {
            if (options.onConfirm) await options.onConfirm();
            cleanup(true);
          } catch (error) {
            console.error("Delete/confirmation failed:", error);
            cleanup(false);
          }
        }}
      />
    );
  });
}

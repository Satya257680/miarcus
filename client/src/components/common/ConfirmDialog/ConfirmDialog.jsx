import { useEffect } from "react";
import { createPortal } from "react-dom";
import "../../../styles/common/ConfirmDialog.css";
import Button from "../Button";

function ConfirmDialog({
  open = false, isOpen = false,
  title = "Confirm Action", message = "Are you sure you want to continue?",
  confirmText = "Confirm", cancelText = "Cancel",
  confirmVariant = "danger", confirmType,
  loading = false, closeOnOverlay = true,
  onConfirm, onCancel,
  // Optional context for richer delete confirmations. Existing callers remain compatible.
  recordName = "", recordCount, scope = "", details = "",
}) {
  const visible = open || isOpen;
  const buttonVariant = confirmType || confirmVariant;
  const destructive = /delete|remove|permanent/i.test(`${title} ${confirmText}`);
  const count = Number.isFinite(Number(recordCount)) && recordCount !== "" ? Number(recordCount) : null;

  useEffect(() => {
    if (!visible) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape" && !loading) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [visible, loading, onCancel]);

  if (!visible) return null;
  const dialog = (
    <div className="confirm-overlay" onMouseDown={(e) => {
      if (closeOnOverlay && e.target === e.currentTarget && !loading) onCancel?.();
    }}>
      <section className={`confirm-dialog ${destructive ? "confirm-dialog--danger" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        <div className="confirm-orbit confirm-orbit--one" />
        <div className="confirm-orbit confirm-orbit--two" />
        <header className="confirm-header">
          <span className={`confirm-icon ${destructive ? "is-danger" : ""}`} aria-hidden="true">
            {destructive ? <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" /></svg> : <svg viewBox="0 0 24 24"><path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>}
          </span>
          <div className="confirm-heading-copy">
            <span className="confirm-eyebrow">MIARCUS SECURE ACTION</span>
            <h2 id="confirm-dialog-title">{title}</h2>
          </div>
          <button className="confirm-close" type="button" onClick={onCancel} disabled={loading} aria-label="Close confirmation">×</button>
        </header>
        <div className="confirm-body">
          <p id="confirm-dialog-message">{message}</p>
          {(recordName || scope || count !== null || details) && (
            <div className="confirm-context-card">
              {scope && <span className="confirm-scope">{scope}</span>}
              {recordName && <strong className="confirm-record-name">{recordName}</strong>}
              {count !== null && <div className="confirm-count-row"><span className="confirm-count-glyph">▤</span><span><small>Records affected</small><strong>{count.toLocaleString()} {count === 1 ? "record" : "records"}</strong></span></div>}
              {details && <p className="confirm-details">{details}</p>}
            </div>
          )}
          {destructive && <div className="confirm-warning"><span aria-hidden="true">!</span><span>This action may be permanent. Review the scope before continuing.</span></div>}
        </div>
        <footer className="confirm-footer">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelText}</Button>
          <Button variant={buttonVariant} onClick={onConfirm} loading={loading}>{destructive && <span className="confirm-button-trash" aria-hidden="true">▤</span>}{confirmText}</Button>
        </footer>
      </section>
    </div>
  );
  return createPortal(dialog, document.body);
}

export default ConfirmDialog;

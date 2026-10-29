import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
    FaTimes,
    FaCloudUploadAlt,
    FaFileAlt,
    FaExclamationTriangle,
    FaMoneyBillWave,
    FaEnvelope
} from "react-icons/fa";
import { openAttachment } from "../../utils/attachments";
import { statusLabel, statusClass, MAX_FILE_MB, FILE_ACCEPT, getAccess } from "./pettyCashUtils";

// ======================================================
// PETTY CASH – SHARED HELPERS & UI PIECES
// Used by the dashboard, detail, new/edit advance and the
// Manage Expenses / Deposits / Audit Trail pages.
// ======================================================

// ------------------------------------------------------
// Sub navigation shown on every Petty Cash page
// ------------------------------------------------------
export function PettyNav() {
    const access = getAccess();
    const items = [
        { to: "/petty-cash", label: "Dashboard", icon: FaMoneyBillWave, end: true },
        ...(access.admin ? [{ to: "/petty-cash/email-settings", label: "Email Notifications", icon: FaEnvelope }] : [])
    ];
    return (
        <nav className="pc-subnav" aria-label="Petty Cash sections">
            {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `pc-subnav-item ${isActive ? "is-active" : ""}`}>
                    <Icon /> <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}

// ------------------------------------------------------
// Modal
// ------------------------------------------------------
export function PcModal({ title, eyebrow = "Petty Cash", icon: Icon, children, onClose, width = 720 }) {
    return (
        <div className="pc-modal-backdrop" onMouseDown={onClose}>
            <div className="pc-modal" style={{ width: `min(${width}px, 100%)` }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="pc-modal-head">
                    {Icon && <span className="pc-modal-icon"><Icon /></span>}
                    <div>
                        <span className="pc-eyebrow">{eyebrow}</span>
                        <h2>{title}</h2>
                    </div>
                    <button type="button" className="pc-modal-close" onClick={onClose} aria-label="Close"><FaTimes /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

// In-app confirmation (replaces the browser's window.confirm popup)
export function ConfirmModal({ title, message, confirmText = "Confirm", tone = "danger", busy = false, onConfirm, onCancel }) {
    return (
        <PcModal title={title} eyebrow="Please confirm" icon={FaExclamationTriangle} onClose={busy ? () => {} : onCancel} width={480}>
            <div className="pc-confirm-body">{message}</div>
            <div className="pc-modal-foot">
                <button type="button" className="pc-btn pc-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
                <button type="button" className={`pc-btn ${tone === "danger" ? "pc-btn--danger" : "pc-btn--primary"}`} onClick={onConfirm} disabled={busy}>
                    {busy ? "Please wait..." : confirmText}
                </button>
            </div>
        </PcModal>
    );
}

// ------------------------------------------------------
// Drag & drop file picker (mandatory documents)
// ------------------------------------------------------
export function FileDrop({ file, onChange, error, label = "Upload bill, receipt or supporting document", existingName }) {
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);

    const pick = (picked) => onChange(picked || null);

    return (
        <div
            className={`pc-drop ${drag ? "is-drag" : ""} ${error ? "is-invalid" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        >
            <input ref={inputRef} type="file" hidden accept={FILE_ACCEPT} onChange={(e) => pick(e.target.files?.[0])} />
            {file ? (
                <div className="pc-drop-file">
                    <FaFileAlt />
                    <div>
                        <strong>{file.name}</strong>
                        <small>{(file.size / 1024 / 1024).toFixed(2)} MB · click to replace</small>
                    </div>
                    <button type="button" className="pc-drop-remove" onClick={(e) => { e.stopPropagation(); pick(null); if (inputRef.current) inputRef.current.value = ""; }} aria-label="Remove file"><FaTimes /></button>
                </div>
            ) : (
                <>
                    <FaCloudUploadAlt className="pc-drop-icon" />
                    <div>
                        <strong><span>Choose File</span> or drag and drop</strong>
                        <small>{existingName ? `Current: ${existingName} — choose a file to replace it` : label}</small>
                        <em>Allowed: Image, PDF, Excel, CSV, Word (Max {MAX_FILE_MB}MB)</em>
                    </div>
                </>
            )}
        </div>
    );
}

export function FileLink({ path, name }) {
    if (!path) return <span className="pc-muted">—</span>;
    return (
        // Consistent attachment link: the column reads "View"; the file
        // name stays available as the tooltip / accessible label.
        <button
            type="button"
            className="pc-file-link"
            onClick={() => openAttachment(path)}
            title={name || "Open file"}
            aria-label={name ? `View ${name}` : "View file"}
        >
            <FaFileAlt /> <span>View</span>
        </button>
    );
}

export function StatusPill({ status }) {
    return <span className={`pc-status pc-status--${statusClass(status)}`}>{statusLabel(status)}</span>;
}

export function Field({ label, required = true, error, children, full = false, hint }) {
    return (
        <label className={`pc-field ${full ? "pc-field--full" : ""} ${error ? "is-invalid" : ""}`}>
            <span className="pc-label">{label}{required && <b> *</b>}</span>
            {children}
            {error ? <small className="pc-field-error">{error}</small> : hint ? <small className="pc-field-hint">{hint}</small> : null}
        </label>
    );
}

export function Pager({ pager }) {
    if (pager.total === 0) return null;
    const nums = [];
    for (let i = Math.max(1, pager.page - 2); i <= Math.min(pager.pages, pager.page + 2); i += 1) nums.push(i);
    return (
        <div className="pc-pager">
            <span>Showing {pager.from} to {pager.to} of {pager.total} records</span>
            <div>
                <button type="button" disabled={pager.page <= 1} onClick={() => pager.setPage(pager.page - 1)}>Previous</button>
                {nums.map((n) => (
                    <button type="button" key={n} className={n === pager.page ? "is-active" : ""} onClick={() => pager.setPage(n)}>{n}</button>
                ))}
                <button type="button" disabled={pager.page >= pager.pages} onClick={() => pager.setPage(pager.page + 1)}>Next ›</button>
            </div>
        </div>
    );
}

export function SortTh({ label, k, sort, setSort, className = "" }) {
    const active = sort.key === k;
    return (
        <th className={`pc-sortable ${className}`} onClick={() => setSort({ key: k, dir: active && sort.dir === "asc" ? "desc" : "asc" })}>
            {label} <span className={`pc-sort ${active ? "is-active" : ""}`}>{active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
        </th>
    );
}

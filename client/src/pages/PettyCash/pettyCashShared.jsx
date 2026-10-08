import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
    FaTimes,
    FaCloudUploadAlt,
    FaFileAlt,
    FaExclamationTriangle,
    FaMoneyBillWave,
    FaPlusCircle,
    FaListAlt,
    FaReceipt,
    FaUniversity,
    FaHistory,
    FaEnvelope
} from "react-icons/fa";
import { openAttachment } from "../../utils/attachments";

// ======================================================
// PETTY CASH – SHARED HELPERS & UI PIECES
// Used by the dashboard, detail, new/edit advance and the
// Manage Expenses / Deposits / Audit Trail pages.
// ======================================================

export const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

export const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "2026-10-01" / ISO string -> "01-10-2026"
export const dmy = (value) => {
    if (!value) return "—";
    const raw = String(value);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m && raw.length <= 10) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

export const dateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function statusLabel(status) {
    if (String(status || "").toUpperCase() === "PARTIALLY_SETTLED") return "In Progress";
    return String(status || "OPEN")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusClass(status) {
    const s = String(status || "OPEN").toUpperCase();
    if (s === "PARTIALLY_SETTLED") return "progress";
    return s.toLowerCase();
}

export const EXPENSE_TYPES = ["Stationery", "Maintenance", "Travel", "Food", "Utilities", "Office Supplies", "Courier", "Repairs", "Other"];

export const MAX_FILE_MB = 10;
export const FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv";

export function validateFile(file) {
    if (!file) return "Please attach the supporting document.";
    if (file.size > MAX_FILE_MB * 1024 * 1024) return `File is larger than ${MAX_FILE_MB} MB.`;
    const ext = String(file.name || "").toLowerCase().split(".").pop();
    if (!FILE_ACCEPT.replace(/\./g, "").split(",").includes(ext)) return "This file type is not allowed.";
    return "";
}

export function getAccess() {
    let user = {};
    let permissions = {};
    try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* ignore */ }
    try { permissions = JSON.parse(localStorage.getItem("permissions") || "{}"); } catch { /* ignore */ }

    const admin = [true, 1, "1"].includes(user?.is_admin) || [true, 1, "1"].includes(user?.administrator);
    const level = { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 };
    const current = level[permissions?.["Petty Cash"] || permissions?.Expenses] || 0;
    const userId = Number(user?.id || user?.user_id || localStorage.getItem("userId") || 0);

    return {
        userId,
        admin,
        canAdd: admin || current >= level.Add,
        canEdit: admin || current >= level.Edit
    };
}

export const apiError = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

// ------------------------------------------------------
// Sub navigation shown on every Petty Cash page
// ------------------------------------------------------
export function PettyNav() {
    const access = getAccess();
    const items = [
        { to: "/petty-cash", label: "Dashboard", icon: FaMoneyBillWave, end: true },
        { to: "/petty-cash/deposits", label: "Manage Deposits", icon: FaUniversity },
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
        <button type="button" className="pc-file-link" onClick={() => openAttachment(path)} title={name || "Open file"}>
            <FaFileAlt /> <span>{name || "View file"}</span>
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

// Simple client-side pager
export function usePager(rows, size = 10) {
    const [page, setPage] = useState(1);
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const safe = Math.min(page, pages);
    return {
        page: safe,
        pages,
        setPage,
        slice: rows.slice((safe - 1) * size, safe * size),
        from: rows.length ? (safe - 1) * size + 1 : 0,
        to: Math.min(safe * size, rows.length),
        total: rows.length
    };
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

// Sorting helper
export function sortRows(rows, sort) {
    if (!sort?.key) return rows;
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        const nx = Number(x);
        const ny = Number(y);
        if (x !== null && y !== null && x !== "" && y !== "" && Number.isFinite(nx) && Number.isFinite(ny)) return (nx - ny) * dir;
        return String(x ?? "").localeCompare(String(y ?? ""), "en", { numeric: true }) * dir;
    });
}

export function SortTh({ label, k, sort, setSort, className = "" }) {
    const active = sort.key === k;
    return (
        <th className={`pc-sortable ${className}`} onClick={() => setSort({ key: k, dir: active && sort.dir === "asc" ? "desc" : "asc" })}>
            {label} <span className={`pc-sort ${active ? "is-active" : ""}`}>{active ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
        </th>
    );
}

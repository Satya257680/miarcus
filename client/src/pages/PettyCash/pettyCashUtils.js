import { useState } from "react";

// ======================================================
// PETTY CASH – SHARED HELPERS (no JSX)
// Formatting, validation, access and table helpers used by the
// Petty Cash pages. UI pieces live in pettyCashShared.jsx; keeping
// plain functions here lets React Fast Refresh reload those
// components safely.
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

// Readable name for an audit-trail action.
const AUDIT_LABEL = {
    CREATE_ADVANCE: "Advance created",
    UPDATE_ADVANCE: "Advance edited",
    ADD_EXPENSE: "Expense added",
    ADD_DEPOSIT: "Deposit recorded",
    SETTLE: "Advance settled",
    DELETE: "Advance deleted",
    DELETE_BULK: "Advance deleted (bulk)"
};

export const auditLabel = (action) => AUDIT_LABEL[action] || String(action || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

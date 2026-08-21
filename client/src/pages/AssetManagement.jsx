import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaPlus,
    FaDownload,
    FaColumns,
    FaSearch,
    FaInfoCircle,
    FaMapMarkerAlt,
    FaTimes,
    FaEdit,
    FaTrash,
    FaPaperclip,
    FaExternalLinkAlt,
    FaFilter,
    FaBroom,
    FaCalendarAlt,
    FaCloudUploadAlt,
    FaChevronDown,
    FaBullhorn,
    FaBalanceScale,
} from "react-icons/fa";
import BulkUploadModal from "../components/common/BulkUploadModal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
    createAsset,
    deleteAllAssets,
    deleteAsset,
    exportAssets,
    fetchAssetOptions,
    fetchAssets,
    importAssets,
    updateAsset,
} from "../services/assetService";
import "../styles/pages/AssetManagement.css";

const API = "https://miarcus-backend.onrender.com";

const MARKETING_COLUMNS = [
    ["particular_name", "Particular Name"],
    ["store_name", "Store Name"],
    ["category", "Category"],
    ["type", "Type"],
    ["rate", "Rate"],
    ["size", "Size"],
    ["color", "Color"],
    ["brand", "Brand"],
    ["department_name", "Department"],
    ["location_address", "Location/Address"],
    ["email", "Email"],
    ["mobile", "Mobile"],
    ["buy_date", "Buy Date"],
    ["expiry_date", "Expiry Date"],
    ["days_to_expire", "Days to Expire"],
    ["status", "Status"],
    ["remark", "Remark"],
    ["attachments", "Attachments"],
    ["created_at", "Created At"],
];

const LEGAL_COLUMNS = [
    ["name", "Name"],
    ["store_name", "Store Name"],
    ["department_name", "Department"],
    ["location_address", "Location/Address"],
    ["remark", "Remark"],
    ["short_description", "Short Description"],
    ["attachments", "Attachments"],
    ["created_at", "Created At"],
    ["date_of_issue", "Date of Issue"],
    ["status", "Status"],
    ["custom_field", "Custom Field"],
];

const MARKETING_DEFAULT = {
    department_id: "",
    store_id: "",
    particular_name: "",
    category: "",
    type: "",
    size: "",
    color: "",
    brand: "",
    rate: "",
    buy_date: "",
    expiry_date: "",
    location_address: "",
    email: "",
    mobile: "",
    remark: "",
    additional_fields: [],
    location_lat: "",
    location_lng: "",
};

const LEGAL_DEFAULT = {
    name: "",
    department_id: "",
    store_id: "",
    location_address: "",
    status: "Unresolved",
    date_of_issue: "",
    short_description: "",
    remark: "",
    custom_field_name: "",
    custom_field_value: "",
};

const getPermissions = () => {
    let user = {};
    let permissions = {};

    try {
        user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {}

    try {
        permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    } catch {}

    const admin =
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.administrator === "1" ||
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        user?.is_admin === "1";

    const permission = permissions?.["Asset Master"] || "None";

    const canView = ["View", "Add", "Edit", "Full"].includes(permission);

    return {
        canView: admin || canView,
        canAdd: admin || ["Add", "Edit", "Full"].includes(permission),
        canEdit: admin || ["Edit", "Full"].includes(permission),
        canDelete: admin || permission === "Full",
    };
};

const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB");
};

const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2,
    }).format(number);
};

const toInputDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toISOString().slice(0, 10);
};

const attachmentUrl = (item) => {
    if (!item) return "";
    if (item.url) return item.url.startsWith("http") ? item.url : `${API}${item.url}`;
    return `${API}/uploads/${item.filename || ""}`;
};

function Field({ label, children, full = false }) {
    return (
        <label className={`asset-field ${full ? "full" : ""}`}>
            <span>{label}</span>
            {children}
        </label>
    );
}

function AssetModal({ type, open, initialData, options, onClose, onSaved }) {
    const isMarketing = type === "marketing";
    const [form, setForm] = useState(isMarketing ? MARKETING_DEFAULT : LEGAL_DEFAULT);
    const [files, setFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        if (initialData) {
            if (isMarketing) {
                setForm({
                    ...MARKETING_DEFAULT,
                    ...initialData,
                    buy_date: toInputDate(initialData.buy_date),
                    expiry_date: toInputDate(initialData.expiry_date),
                    additional_fields: Array.isArray(initialData.additional_fields)
                        ? initialData.additional_fields
                        : [],
                });
            } else {
                setForm({
                    ...LEGAL_DEFAULT,
                    ...initialData,
                    date_of_issue: toInputDate(initialData.date_of_issue),
                    custom_field_name: initialData.custom_field_name || initialData.custom_field?.name || "",
                    custom_field_value: initialData.custom_field_value || initialData.custom_field?.value || "",
                });
            }
        } else {
            setForm(isMarketing ? MARKETING_DEFAULT : LEGAL_DEFAULT);
        }
        setFiles([]);
        setError("");
    }, [open, initialData, isMarketing]);

    const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const locate = () => {
        if (!navigator.geolocation) {
            setError("Location services are not available in this browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setForm((prev) => ({
                    ...prev,
                    location_lat: coords.latitude.toFixed(6),
                    location_lng: coords.longitude.toFixed(6),
                    location_address:
                        prev.location_address ||
                        `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
                }));
            },
            () => setError("Unable to read your current location. Please enter the address manually."),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const addAdditionalField = () => {
        setForm((prev) => ({
            ...prev,
            additional_fields: [
                ...(prev.additional_fields || []),
                { name: "", value: "" },
            ],
        }));
    };

    const updateAdditionalField = (index, key, value) => {
        setForm((prev) => ({
            ...prev,
            additional_fields: prev.additional_fields.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item
            ),
        }));
    };

    const removeAdditionalField = (index) => {
        setForm((prev) => ({
            ...prev,
            additional_fields: prev.additional_fields.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const payload = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (key === "additional_fields") {
                    payload.append(key, JSON.stringify(value || []));
                } else if (value !== undefined && value !== null) {
                    payload.append(key, value);
                }
            });
            files.forEach((file) => payload.append("attachments", file));

            if (initialData?.id) {
                await updateAsset(type, initialData.id, payload);
            } else {
                await createAsset(type, payload);
            }

            onSaved();
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to save the asset.");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="asset-modal-backdrop" role="presentation">
            <div className="asset-modal" role="dialog" aria-modal="true">
                <div className="asset-modal-header">
                    <h2>{initialData ? "Edit" : "Add"} {isMarketing ? "Asset" : "Legal Asset"}</h2>
                    <button type="button" className="asset-icon-button" onClick={onClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={submit} className="asset-modal-body">
                    {isMarketing ? (
                        <div className="asset-form-grid">
                            <Field label="Department">
                                <select value={form.department_id} onChange={(e) => setValue("department_id", e.target.value)}>
                                    <option value="">Select an option</option>
                                    {options.departments.map((item) => <option key={item.id} value={item.id}>{item.department_name}</option>)}
                                </select>
                            </Field>
                            <Field label="Store">
                                <select value={form.store_id} onChange={(e) => setValue("store_id", e.target.value)}>
                                    <option value="">Select an option</option>
                                    {options.stores.map((item) => <option key={item.id} value={item.id}>{item.store_name}</option>)}
                                </select>
                            </Field>
                            <Field label="Particular Name"><input value={form.particular_name} onChange={(e) => setValue("particular_name", e.target.value)} placeholder="Particular Name" required /></Field>
                            <Field label="Category"><input value={form.category} onChange={(e) => setValue("category", e.target.value)} placeholder="Category" /></Field>
                            <Field label="Type"><input value={form.type} onChange={(e) => setValue("type", e.target.value)} placeholder="Type" /></Field>
                            <Field label="Size"><input value={form.size} onChange={(e) => setValue("size", e.target.value)} placeholder="Size" /></Field>
                            <Field label="Color"><input value={form.color} onChange={(e) => setValue("color", e.target.value)} placeholder="Color" /></Field>
                            <Field label="Brand"><input value={form.brand} onChange={(e) => setValue("brand", e.target.value)} placeholder="Brand" /></Field>
                            <Field label="Rate"><input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => setValue("rate", e.target.value)} placeholder="Rate" /></Field>
                            <Field label="Buy Date"><input type="date" value={form.buy_date} onChange={(e) => setValue("buy_date", e.target.value)} /></Field>
                            <Field label="Expiry Date"><input type="date" value={form.expiry_date} onChange={(e) => setValue("expiry_date", e.target.value)} /></Field>
                            <Field label="Location/Address">
                                <div className="asset-location-control">
                                    <input value={form.location_address} onChange={(e) => setValue("location_address", e.target.value)} placeholder="Location/Address" />
                                    <button type="button" onClick={locate} title="Use current location"><FaMapMarkerAlt /></button>
                                </div>
                            </Field>
                            <Field label="Email"><input type="email" value={form.email} onChange={(e) => setValue("email", e.target.value)} placeholder="Email" /></Field>
                            <Field label="Mobile"><input value={form.mobile} onChange={(e) => setValue("mobile", e.target.value)} placeholder="Mobile" inputMode="tel" /></Field>
                            <Field label="Remark" full><textarea value={form.remark} onChange={(e) => setValue("remark", e.target.value)} placeholder="Remark" rows="3" /></Field>
                            <Field label="Attachments" full>
                                <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                            </Field>
                        </div>
                    ) : (
                        <div className="asset-form-grid">
                            <Field label="Name"><input value={form.name} onChange={(e) => setValue("name", e.target.value)} placeholder="Name" required /></Field>
                            <Field label="Store Name">
                                <select value={form.store_id} onChange={(e) => setValue("store_id", e.target.value)}>
                                    <option value="">Select store</option>
                                    {options.stores.map((item) => <option key={item.id} value={item.id}>{item.store_name}</option>)}
                                </select>
                            </Field>
                            <Field label="Department">
                                <select value={form.department_id} onChange={(e) => setValue("department_id", e.target.value)}>
                                    <option value="">Select department</option>
                                    {options.departments.map((item) => <option key={item.id} value={item.id}>{item.department_name}</option>)}
                                </select>
                            </Field>
                            <Field label="Location/Address">
                                <div className="asset-location-control">
                                    <input value={form.location_address} onChange={(e) => setValue("location_address", e.target.value)} placeholder="Location/Address" />
                                    <button type="button" onClick={locate} title="Use current location"><FaMapMarkerAlt /></button>
                                </div>
                            </Field>
                            <Field label="Status">
                                <select value={form.status} onChange={(e) => setValue("status", e.target.value)}>
                                    <option>Unresolved</option>
                                    <option>Resolved</option>
                                    <option>Escalated to Management</option>
                                    <option>Under Review</option>
                                </select>
                            </Field>
                            <Field label="Date of Issue"><input type="date" value={form.date_of_issue} onChange={(e) => setValue("date_of_issue", e.target.value)} /></Field>
                            <Field label="Short Description" full><textarea value={form.short_description} onChange={(e) => setValue("short_description", e.target.value)} placeholder="Short Description" rows="3" /></Field>
                            <Field label="Remark" full><textarea value={form.remark} onChange={(e) => setValue("remark", e.target.value)} placeholder="Remark" rows="3" /></Field>
                            <Field label="Custom Field Name"><input value={form.custom_field_name} onChange={(e) => setValue("custom_field_name", e.target.value)} placeholder="e.g. Case Number" /></Field>
                            <Field label="Custom Field Value"><input value={form.custom_field_value} onChange={(e) => setValue("custom_field_value", e.target.value)} placeholder="Custom Field Value" /></Field>
                            <Field label="Attachments" full>
                                <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                            </Field>
                        </div>
                    )}

                    {isMarketing && (
                        <div className="additional-fields-section">
                            <div className="additional-fields-heading">
                                <strong>Additional Fields</strong>
                                <button type="button" className="asset-link-button" onClick={addAdditionalField}>+ Add More Fields</button>
                            </div>
                            {(form.additional_fields || []).map((item, index) => (
                                <div className="additional-field-row" key={`${index}-${item.name}`}>
                                    <input value={item.name} onChange={(e) => updateAdditionalField(index, "name", e.target.value)} placeholder="Field name" />
                                    <input value={item.value} onChange={(e) => updateAdditionalField(index, "value", e.target.value)} placeholder="Field value" />
                                    <button type="button" className="asset-remove-field" onClick={() => removeAdditionalField(index)}><FaTimes /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <div className="asset-form-error">{error}</div>}

                    <div className="asset-modal-footer">
                        <button type="button" className="asset-secondary-button" onClick={onClose}>Cancel</button>
                        <button type="submit" className="asset-primary-button" disabled={saving}>
                            {saving ? "Saving..." : initialData ? "Update" : isMarketing ? "Submit Asset" : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AssetManagement({ type = "marketing" }) {
    const isMarketing = type === "marketing";
    const title = isMarketing ? "Marketing Assets" : "Legal Assets";
    const subtitle = isMarketing
        ? "Manage all marketing materials, assets and promotional items."
        : "Manage and track all legal related assets, documents and notices.";
    const columns = isMarketing ? MARKETING_COLUMNS : LEGAL_COLUMNS;
    const permissions = useMemo(getPermissions, [type]);

    const [rows, setRows] = useState([]);
    const [options, setOptions] = useState({ departments: [], stores: [], categories: [], statuses: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ store: "", department: "", category: "", status: "", dateFrom: "", dateTo: "" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(() => columns.map(([key]) => key));
    const [showColumns, setShowColumns] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);

    const defaultVisible = isMarketing
        ? ["particular_name", "store_name", "category", "type", "rate", "size", "color", "brand", "department_name", "buy_date", "expiry_date", "days_to_expire", "status", "attachments", "created_at"]
        : LEGAL_COLUMNS.map(([key]) => key);

    useEffect(() => {
        setVisibleColumns(defaultVisible);
        setFilters({ store: "", department: "", category: "", status: "", dateFrom: "", dateTo: "" });
        setSearch("");
        setPage(1);
    }, [type]);

    const load = useCallback(async () => {
        if (!permissions.canView) { setLoading(false); return; }
        setLoading(true);
        setError("");
        try {
            const result = await fetchAssets(type, {
                page,
                pageSize,
                search,
                column: "",
                filterValue: "",
                ...filters,
            });
            setRows(result.data || []);
            setTotal(Number(result.pagination?.total || 0));
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to load assets.");
        } finally { setLoading(false); }
    }, [type, page, pageSize, search, filters, permissions.canView]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetchAssetOptions()
            .then((data) => setOptions(data || { departments: [], stores: [], categories: [], statuses: [] }))
            .catch(() => setOptions({ departments: [], stores: [], categories: [], statuses: [] }));
    }, [type]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasFilters = Boolean(search || Object.values(filters).some(Boolean));

    const openAdd = () => { if (permissions.canAdd) { setEditing(null); setModalOpen(true); } };
    const openEdit = (row) => { if (permissions.canEdit) { setEditing(row); setModalOpen(true); } };

    const remove = async (row) => {
        if (!permissions.canDelete) return;
        if (!window.confirm(`Delete this ${isMarketing ? "marketing" : "legal"} asset?`)) return;
        try { await deleteAsset(type, row.id); await load(); }
        catch (err) { setError(err?.response?.data?.message || "Unable to delete the asset."); }
    };

    const bulkUpload = async (file) => importAssets(type, file);

    const exportCsv = async () => {
        setExporting(true);
        setError("");
        try {
            const blob = await exportAssets(type, { search, ...filters });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${type}-assets-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to export CSV.");
        } finally { setExporting(false); }
    };

    const clearFilters = () => {
        setSearch("");
        setFilters({ store: "", department: "", category: "", status: "", dateFrom: "", dateTo: "" });
        setPage(1);
    };

    const confirmDeleteAll = async () => {
        if (!permissions.canDelete) return;
        setDeletingAll(true);
        try {
            const result = await deleteAllAssets(type);
            if (!result?.success) throw new Error(result?.message || "Delete all failed.");
            setShowDeleteAllDialog(false);
            setPage(1);
            await load();
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Unable to delete all assets.");
        } finally { setDeletingAll(false); }
    };

    const toggleColumn = (key) => setVisibleColumns((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);

    const renderCell = (row, key) => {
        if (key === "rate") return formatMoney(row[key]);
        if (["buy_date", "expiry_date", "date_of_issue"].includes(key)) return formatDate(row[key]);
        if (key === "created_at") return formatDateTime(row[key]);
        if (key === "days_to_expire") {
            if (row.days_to_expire === null || row.days_to_expire === undefined || row.days_to_expire === "") return "—";
            const days = Number(row.days_to_expire);
            return <span className={`expiry-value ${days < 0 ? "expired" : days <= 30 ? "soon" : "healthy"}`}>{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}</span>;
        }
        if (key === "status") {
            const status = String(row.status || "—");
            return <span className={`asset-status ${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span>;
        }
        if (key === "attachments") {
            const items = Array.isArray(row.attachments) ? row.attachments : [];
            if (!items.length) return "—";
            return <div className="attachment-list">{items.map((item, index) => <a key={`${item.filename || item.url}-${index}`} href={attachmentUrl(item)} target="_blank" rel="noreferrer" title={item.originalname || item.filename || "Attachment"}><FaPaperclip /></a>)}</div>;
        }
        if (key === "custom_field") return row.custom_field_name || row.custom_field_value ? `${row.custom_field_name || "Custom Field"}: ${row.custom_field_value || "—"}` : "—";
        if (key === "remark") return row.remark ? <span className="table-text-clamp" title={row.remark}>{row.remark}</span> : <button type="button" className="asset-inline-link" onClick={() => openEdit(row)}>Add Remark</button>;
        if (key === "short_description") return row.short_description ? <span className="table-text-clamp" title={row.short_description}>{row.short_description}</span> : "—";
        return row[key] === null || row[key] === undefined || row[key] === "" ? "—" : row[key];
    };

    if (!permissions.canView) return <div className="asset-page"><section className="asset-card asset-access-card"><strong>Access Restricted</strong><span>You do not have permission to view Asset Master.</span></section></div>;

    return (
        <div className="asset-page">
            <section className="asset-card">
                <div className={`asset-premium-header ${isMarketing ? "marketing" : "legal"}`}>
                    <div className="asset-premium-copy">
                        <div className="asset-title-row"><h1>{title}</h1><FaInfoCircle className="asset-info-icon" title={subtitle} /></div>
                        <p>{subtitle}</p>
                        <div className="asset-action-row">
                            {permissions.canAdd && <button className="asset-primary-button" onClick={openAdd}><FaPlus /> Add Entry</button>}
                            {permissions.canAdd && <button className="asset-outline-button" onClick={() => setShowBulkModal(true)}><FaCloudUploadAlt /> Bulk Upload</button>}
                            <button className="asset-outline-button" onClick={exportCsv} disabled={exporting}><FaDownload /> {exporting ? "Exporting..." : "Export CSV"}</button>
                            <div className="asset-menu-wrap">
                                <button className="asset-outline-button" onClick={() => { setShowColumns((v) => !v); setShowFilters(false); }}><FaColumns /> Columns <FaChevronDown /></button>
                                {showColumns && <div className="asset-dropdown asset-columns-dropdown"><strong>Visible Columns</strong>{columns.map(([key, label]) => <label key={key}><input type="checkbox" checked={visibleColumns.includes(key)} onChange={() => toggleColumn(key)} />{label}</label>)}<button type="button" onClick={() => setVisibleColumns(defaultVisible)}>Reset columns</button></div>}
                            </div>
                            {permissions.canDelete && <button className="asset-danger-button" onClick={() => setShowDeleteAllDialog(true)} disabled={!total}><FaTrash /> Delete All</button>}
                        </div>
                    </div>
                    <div className="asset-illustration"><div className="asset-art-card"><div className="asset-art-icon">{isMarketing ? <FaBullhorn /> : <FaBalanceScale />}</div><span>{isMarketing ? "Campaign assets" : "Legal records"}</span></div><i /><i /></div>
                    <div className="asset-search-panel">
                        <div className="asset-search-input"><FaSearch /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Global Search..." /></div>
                        <button className={`asset-filter-button ${showFilters || hasFilters ? "active" : ""}`} onClick={() => { setShowFilters((v) => !v); setShowColumns(false); }}><FaFilter /> Filter <FaChevronDown /></button>
                    </div>
                </div>

                {showFilters && <div className="asset-premium-filters">
                    <label>Store<select value={filters.store} onChange={(e) => { setFilters((p) => ({ ...p, store: e.target.value })); setPage(1); }}><option value="">All Stores</option>{options.stores.map((x) => <option key={x.id} value={x.store_name}>{x.store_name}</option>)}</select></label>
                    <label>Department<select value={filters.department} onChange={(e) => { setFilters((p) => ({ ...p, department: e.target.value })); setPage(1); }}><option value="">All Departments</option>{options.departments.map((x) => <option key={x.id} value={x.department_name}>{x.department_name}</option>)}</select></label>
                    {isMarketing ? <label>Category<select value={filters.category} onChange={(e) => { setFilters((p) => ({ ...p, category: e.target.value })); setPage(1); }}><option value="">All Categories</option>{options.categories?.map((x) => <option key={x} value={x}>{x}</option>)}</select></label> : <label>Status<select value={filters.status} onChange={(e) => { setFilters((p) => ({ ...p, status: e.target.value })); setPage(1); }}><option value="">All Status</option>{options.statuses?.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>}
                    {isMarketing && <label>Status<select value={filters.status} onChange={(e) => { setFilters((p) => ({ ...p, status: e.target.value })); setPage(1); }}><option value="">All Status</option><option>Active</option><option>Expiring Soon</option><option>Expired</option><option>No Expiry</option></select></label>}
                    <label className="asset-date-filter"><span><FaCalendarAlt /> {isMarketing ? "Expiry Date" : "Date of Issue"}</span><div><input type="date" value={filters.dateFrom} onChange={(e) => { setFilters((p) => ({ ...p, dateFrom: e.target.value })); setPage(1); }} /><b>to</b><input type="date" value={filters.dateTo} onChange={(e) => { setFilters((p) => ({ ...p, dateTo: e.target.value })); setPage(1); }} /></div></label>
                    <button className="asset-clear-button" onClick={clearFilters} disabled={!hasFilters}><FaBroom /> Clear Filters</button>
                </div>}

                {error && <div className="asset-page-error">{error}</div>}
                <div className="asset-table-wrap">
                    <div className="asset-table-caption"><span><strong>{total}</strong> {isMarketing ? "marketing assets" : "legal assets"}</span><small>Live database view</small></div>
                    <table className="asset-table"><thead><tr>{columns.filter(([key]) => visibleColumns.includes(key)).map(([key, label]) => <th key={key}>{label}</th>)}<th>Actions</th></tr></thead>
                        <tbody>{loading ? <tr><td colSpan={visibleColumns.length + 1} className="asset-empty">Loading assets...</td></tr> : rows.length === 0 ? <tr><td colSpan={visibleColumns.length + 1} className="asset-empty"><div className="asset-empty-premium"><div>{isMarketing ? <FaBullhorn /> : <FaBalanceScale />}</div><strong>No assets found</strong><span>{hasFilters ? "Clear filters or add a new entry." : "Add your first asset to get started."}</span></div></td></tr> : rows.map((row) => <tr key={row.id}>{columns.filter(([key]) => visibleColumns.includes(key)).map(([key]) => <td key={key}>{renderCell(row, key)}</td>)}<td><div className="asset-row-actions">{permissions.canEdit && <button title="Edit" onClick={() => openEdit(row)}><FaEdit /></button>}{permissions.canDelete && <button title="Delete" onClick={() => remove(row)}><FaTrash /></button>}{row.attachments?.[0] && <a title="Open attachment" href={attachmentUrl(row.attachments[0])} target="_blank" rel="noreferrer"><FaExternalLinkAlt /></a>}</div></td></tr>)}</tbody>
                    </table>
                </div>
                <div className="asset-pagination"><span>Total: {total} entries{total ? ` (Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)})` : ""}</span><span>Items per page <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10,20,50,100].map((n) => <option key={n} value={n}>{n}</option>)}</select></span><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></div>
            </section>

            <AssetModal type={type} open={modalOpen} initialData={editing} options={options} onClose={() => { setModalOpen(false); setEditing(null); }} onSaved={async () => { setModalOpen(false); setEditing(null); await load(); }} />
            <BulkUploadModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title={`Bulk Upload ${title}`} uploadFunction={bulkUpload} onSuccess={load} acceptedFile=".csv,.xlsx,.xls" sampleFile={`https://miarcus-backend.onrender.com/api/assets/${type}/sample`} />
            <ConfirmDialog open={showDeleteAllDialog} title={`Delete All ${title}`} message={`Are you sure you want to permanently delete all ${total} records? This action cannot be undone.`} confirmText={deletingAll ? "Deleting..." : "Delete All"} cancelText="Cancel" confirmVariant="danger" onConfirm={confirmDeleteAll} onCancel={() => !deletingAll && setShowDeleteAllDialog(false)} />
        </div>
    );
}

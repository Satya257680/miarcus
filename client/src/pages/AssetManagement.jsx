import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaPaperclip,
    FaMapMarkerAlt,
    FaTimes,
    FaCloudUploadAlt,
    FaInfoCircle,
    FaExternalLinkAlt,
} from "react-icons/fa";

import PageHeader from "../components/common/PageHeader";
import PageToolbar from "../components/common/PageToolbar";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import ActionButtons from "../components/common/ActionButtons";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BulkUploadModal from "../components/common/BulkUploadModal";
import { API_BASE_URL } from "../axiosConfig.js";
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

const API = API_BASE_URL;

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
    ["buy_date", "Buy Date"],
    ["expiry_date", "Expiry Date"],
    ["days_to_expire", "Days to Expire"],
    ["status", "Status"],
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
    department_id: "", store_id: "", particular_name: "", category: "", type: "",
    size: "", color: "", brand: "", rate: "", buy_date: "", expiry_date: "",
    location_address: "", email: "", mobile: "", remark: "", additional_fields: [],
    location_lat: "", location_lng: "",
};

const LEGAL_DEFAULT = {
    name: "", department_id: "", store_id: "", location_address: "", status: "Unresolved",
    date_of_issue: "", short_description: "", remark: "", custom_field_name: "", custom_field_value: "",
};

const getPermissions = () => {
    let user = {};
    let permissions = {};
    try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch {}
    try { permissions = JSON.parse(localStorage.getItem("permissions") || "{}"); } catch {}

    const admin = user?.administrator === true || user?.administrator === 1 || user?.administrator === "1" ||
        user?.is_admin === true || user?.is_admin === 1 || user?.is_admin === "1";
    const permission = permissions?.["Asset Master"] || "None";
    return {
        canView: admin || ["View", "Add", "Edit", "Full"].includes(permission),
        canAdd: admin || ["Add", "Edit", "Full"].includes(permission),
        canEdit: admin || ["Edit", "Full"].includes(permission),
        canDelete: admin || permission === "Full",
    };
};

const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
};

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", {
        day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    });
};

const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(number) : String(value);
};

const toInputDate = (value) => {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? text.slice(0, 10) : date.toISOString().slice(0, 10);
};

const attachmentUrl = (item) => {
    if (!item) return "";
    if (item.url) return item.url.startsWith("http") ? item.url : `${API}${item.url}`;
    return `${API}/uploads/${item.filename || ""}`;
};

// Small form-field wrapper used by both Marketing and Legal asset forms.
// Keeping it local prevents the Add/Edit modal from crashing when it renders.
function Field({ label, children, full = false }) {
    return (
        <label className={`asset-field ${full ? "full" : ""}`}>
            <span className="asset-field-label">{label}</span>
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
                                    {(options.departments || []).map((item) => <option key={item.id} value={item.id}>{item.department_name}</option>)}
                                </select>
                            </Field>
                            <Field label="Store">
                                <select value={form.store_id} onChange={(e) => setValue("store_id", e.target.value)}>
                                    <option value="">Select an option</option>
                                    {(options.stores || []).map((item) => <option key={item.id} value={item.id}>{item.store_name}</option>)}
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
                                    {(options.stores || []).map((item) => <option key={item.id} value={item.id}>{item.store_name}</option>)}
                                </select>
                            </Field>
                            <Field label="Department">
                                <select value={form.department_id} onChange={(e) => setValue("department_id", e.target.value)}>
                                    <option value="">Select department</option>
                                    {(options.departments || []).map((item) => <option key={item.id} value={item.id}>{item.department_name}</option>)}
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
    const permissions = useMemo(getPermissions, []);

    const [rows, setRows] = useState([]);
    const [options, setOptions] = useState({ departments: [], stores: [], categories: [], statuses: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);

    const load = useCallback(async () => {
        if (!permissions.canView) { setLoading(false); return; }
        setLoading(true);
        setError("");
        try {
            const result = await fetchAssets(type, { page, pageSize, search });
            setRows(Array.isArray(result?.data) ? result.data : []);
            setTotal(Number(result?.pagination?.total || 0));
        } catch (err) {
            setRows([]);
            setTotal(0);
            setError(err?.response?.data?.message || "Unable to load assets.");
        } finally { setLoading(false); }
    }, [type, page, pageSize, search, permissions.canView]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        setPage(1);
        setSearch("");
        fetchAssetOptions()
            .then((data) => setOptions(data || { departments: [], stores: [], categories: [], statuses: [] }))
            .catch(() => setOptions({ departments: [], stores: [], categories: [], statuses: [] }));
    }, [type]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const openAdd = () => { if (permissions.canAdd) { setEditing(null); setModalOpen(true); } };
    const openEdit = (row) => { if (permissions.canEdit) { setEditing(row); setModalOpen(true); } };

    const remove = async (row) => {
        if (!permissions.canDelete) return;
        if (!window.confirm(`Delete this ${isMarketing ? "marketing" : "legal"} asset?`)) return;
        try { await deleteAsset(type, row.id); await load(); }
        catch (err) { setError(err?.response?.data?.message || "Unable to delete the asset."); }
    };

    const handleBulkUpload = async (file) => {
        try {
            const result = await importAssets(type, file);
            if (!result?.success) throw new Error(result?.message || "Bulk upload failed.");
            return result;
        } catch (err) {
            throw new Error(err?.response?.data?.message || err?.message || "Bulk upload failed.");
        }
    };

    const exportCsv = async () => {
        setExporting(true);
        setError("");
        try {
            const blob = await exportAssets(type, { search });
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
            setError(err?.response?.data?.message || err?.message || "Unable to delete all assets.");
        } finally { setDeletingAll(false); }
    };

    const renderCell = (row, key) => {
        if (key === "rate") return formatMoney(row[key]);
        if (["buy_date", "expiry_date", "date_of_issue"].includes(key)) return formatDate(row[key]);
        if (key === "created_at") return formatDateTime(row[key]);
        if (key === "days_to_expire") {
            if (row.days_to_expire === null || row.days_to_expire === undefined || row.days_to_expire === "") return "-";
            const days = Number(row.days_to_expire);
            return <span className={`expiry-value ${days < 0 ? "expired" : days <= 30 ? "soon" : "healthy"}`}>{days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}</span>;
        }
        if (key === "status") return <span className={`asset-status ${String(row.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{row.status || "-"}</span>;
        if (key === "attachments") {
            const items = Array.isArray(row.attachments) ? row.attachments : [];
            if (!items.length) return "-";
            return <div className="attachment-list">{items.map((item, index) => <a key={`${item.filename || item.url}-${index}`} href={attachmentUrl(item)} target="_blank" rel="noreferrer" title={item.originalname || item.filename || "Attachment"}><FaPaperclip /></a>)}</div>;
        }
        if (key === "custom_field") return row.custom_field_name || row.custom_field_value ? `${row.custom_field_name || "Custom Field"}: ${row.custom_field_value || "-"}` : "-";
        if (key === "remark" || key === "short_description" || key === "location_address") {
            const value = row[key];
            return value ? <span className="asset-wrap-cell" title={value}>{value}</span> : "-";
        }
        return row[key] === null || row[key] === undefined || row[key] === "" ? "-" : row[key];
    };

    const tableColumns = [
        ...columns.map(([key, label]) => ({
            key,
            title: label,
            minWidth: key === "actions" ? "220px" : key === "location_address" || key === "remark" || key === "short_description" ? "220px" : "130px",
            render: (row) => renderCell(row, key),
        })),
        {
            key: "actions",
            title: "Actions",
            width: "220px",
            minWidth: "220px",
            align: "center",
            render: (row) => (
                <div className="asset-actions-cell">
                    <ActionButtons showEdit={permissions.canEdit} onEdit={() => openEdit(row)} showDelete={permissions.canDelete} onDelete={() => remove(row)} />
                    {row.attachments?.[0] && <a className="asset-open-link" href={attachmentUrl(row.attachments[0])} target="_blank" rel="noreferrer" title="Open attachment"><FaExternalLinkAlt /></a>}
                </div>
            ),
        },
    ];

    if (!permissions.canView) {
        return <div className="asset-page"><section className="asset-access-card"><strong>Access Restricted</strong><span>You do not have permission to view Asset Master.</span></section></div>;
    }

    return (
        <div className="asset-page">
            <PageHeader
                title={title}
                subtitle={subtitle}
                actions={<span className="asset-page-info"><FaInfoCircle /> Asset Master</span>}
            />

            <PageToolbar
                search={search}
                setSearch={(value) => { setSearch(value); setPage(1); }}
                placeholder={`Search ${isMarketing ? "Marketing" : "Legal"} Assets...`}
                showAdd={permissions.canAdd}
                addText={isMarketing ? "Add Marketing Asset" : "Add Legal Asset"}
                onAdd={openAdd}
                showExport
                onExport={exportCsv}
                showBulk
                onBulk={() => setShowBulkModal(true)}
                showDeleteAll={permissions.canDelete && total > 0}
                onDeleteAll={() => setShowDeleteAllDialog(true)}
            />

            {error && <div className="asset-page-error">{error}</div>}

            <Card title={isMarketing ? "Marketing Asset List" : "Legal Asset List"} subtitle={`Total Records: ${total}`} className="asset-list-card" noPadding>
                <DataTable
                    columns={tableColumns}
                    data={rows}
                    loading={loading}
                    emptyTitle={isMarketing ? "No Marketing Assets Found" : "No Legal Assets Found"}
                    emptyDescription={search ? "No records match your search." : `There are no ${isMarketing ? "marketing" : "legal"} assets available.`}
                />
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRecords={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                />
            </Card>

            <AssetModal
                type={type}
                open={modalOpen}
                initialData={editing}
                options={options}
                onClose={() => { setModalOpen(false); setEditing(null); }}
                onSaved={async () => { setModalOpen(false); setEditing(null); await load(); }}
            />

            <BulkUploadModal
                isOpen={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                title={`Bulk Upload ${isMarketing ? "Marketing Assets" : "Legal Assets"}`}
                uploadFunction={handleBulkUpload}
                onSuccess={load}
                acceptedFile=".csv,.xlsx,.xls"
                sampleFile={`${API_BASE_URL}/api/assets/${type}/sample`}
            />

            <ConfirmDialog
                open={showDeleteAllDialog}
                title={`Delete All ${title}`}
                message={`Are you sure you want to permanently delete all ${total} records? This action cannot be undone.`}
                confirmText={deletingAll ? "Deleting..." : "Delete All"}
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={confirmDeleteAll}
                onCancel={() => !deletingAll && setShowDeleteAllDialog(false)}
            />
        </div>
    );
}

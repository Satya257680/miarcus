import PremiumLoader from "../components/premium/PremiumLoader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeFilters, hasActiveFilters, deleteAllLabel, deleteAllMessage } from "../utils/deleteScope";
import {
    FaPlus,
    FaSearch,
    FaUpload,
    FaDownload,
    FaSyncAlt,
    FaTrash,
    FaEdit,
    FaTimes,
    FaCamera,
    FaShoppingBag,
    FaBoxOpen,
    FaCheckCircle,
    FaCircle,
    FaTags,
    FaExclamationTriangle,
} from "react-icons/fa";
import {
    createListing,
    deleteAllListings,
    deleteListing,
    exportListings,
    fetchListingSummary,
    fetchListingTracker,
    importListings,
    updateListing,
} from "../services/listingTrackerService";
import "../styles/pages/ListingTracker.css";
import "../styles/premium/PagePremium.css";
import "../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import ExportButton from "../components/common/ExportButton";
import { exportFromCSV } from "../utils/exportUtils.js";

const EMPTY_FORM = {
    ppk_code: "",
    shopify_handle: "",
    product_name: "",
    category: "",
    barcode: "",
    sku: "",
    mrp: "",
    season: "",
    collection_name: "",
    image_link: "",
    photoshoot: false,
    product_listed: false,
    remark: "",
};

const formatNumber = (value) =>
    new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatPercent = (value) =>
    `${Math.round(Number(value || 0))}%`;

const getInitialPermissions = () => {
    let user = {};
    let permissions = {};

    try {
        user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        user = {};
    }

    try {
        permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    } catch {
        permissions = {};
    }

    const admin =
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.administrator === "1" ||
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        user?.is_admin === "1";

    const permission = permissions?.["Listing Tracker"];

    return {
        admin,
        canAdd: admin || ["Add", "Edit", "Full"].includes(permission),
        canEdit: admin || ["Edit", "Full"].includes(permission),
        canDelete: admin || permission === "Full",
    };
};


// ======================================================
// Small SVG charts for the dashboard cards
// ======================================================

function ReadinessBarChart({ bars = [] }) {
    const ticks = [100, 75, 50, 25, 0];
    return (
        <div className="lt-bar-chart" role="img" aria-label={bars.map((b) => `${b.label} ${Math.round(b.value)}%`).join(", ")}>
            <div className="lt-bar-axis">
                {ticks.map((t) => <span key={t}>{t}%</span>)}
            </div>
            <div className="lt-bar-main">
                <div className="lt-bar-area">
                    {ticks.map((t) => (
                        <i key={t} className="lt-bar-grid" style={{ bottom: `${t}%` }} />
                    ))}
                    {bars.map((bar) => {
                        const h = Math.max(0, Math.min(100, bar.value));
                        return (
                            <div className="lt-bar-col" key={bar.label} title={`${bar.label}: ${bar.value.toFixed(1)}% (${bar.count})`}>
                                <div className="lt-bar-fill" style={{ height: `${h}%`, background: bar.color }}>
                                    <span className="lt-bar-value">{bar.value.toFixed(0)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="lt-bar-labels">
                    {bars.map((bar) => (
                        <div className="lt-bar-label" key={bar.label}>
                            <strong>{bar.label}</strong>
                            <small>{bar.count}</small>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SignalsPieChart({ slices = [], centerLabel = "", centerValue = "" }) {
    const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
    const r = 70;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="lt-pie">
            <svg viewBox="0 0 200 200" className="lt-pie-svg" role="img" aria-label={slices.map((s) => `${s.label} ${s.value}`).join(", ")}>
                <circle cx="100" cy="100" r={r} fill="none" stroke="var(--pp-line, #ebe7f5)" strokeWidth="34" />
                {total > 0 && slices.map((slice) => {
                    const len = (Math.max(0, slice.value) / total) * c;
                    const el = (
                        <circle
                            key={slice.label}
                            cx="100"
                            cy="100"
                            r={r}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="34"
                            strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 100 100)"
                        >
                            <title>{`${slice.label}: ${slice.value}`}</title>
                        </circle>
                    );
                    offset += len;
                    return el;
                })}
                <text x="100" y="96" textAnchor="middle" className="lt-pie-center-value">{centerValue}</text>
                <text x="100" y="118" textAnchor="middle" className="lt-pie-center-label">{centerLabel}</text>
            </svg>
            <ul className="lt-pie-legend">
                {slices.map((slice) => (
                    <li key={slice.label}>
                        <i style={{ background: slice.color }} />
                        <span>{slice.label}</span>
                        <strong>{slice.valueLabel ?? slice.value}</strong>
                        <small>{slice.note || (total ? `${((slice.value / total) * 100).toFixed(1)}%` : "0%")}</small>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function ListingTracker() {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        photoshootYes: 0,
        photoshootNo: 0,
        listedYes: 0,
        listedNo: 0,
        collections: [],
    });

    const [search, setSearch] = useState("");
    const [collection, setCollection] = useState("");
    const [category, setCategory] = useState("");
    const [photoshoot, setPhotoshoot] = useState("");
    const [listed, setListed] = useState("");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [lastSynced, setLastSynced] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [importing, setImporting] = useState(false);
    const importInputRef = useRef(null);

    const permissions = useMemo(getInitialPermissions, []);

    const categories = useMemo(() => {
        const values = summary.categories || [];
        return values.map((item) => item.category).filter(Boolean);
    }, [summary.categories]);

    const loadData = useCallback(
        async ({ silent = false } = {}) => {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            try {
                const params = {
                    page,
                    pageSize,
                    search: search.trim(),
                    collection,
                    category,
                    photoshoot,
                    listed,
                };

                const [listResponse, summaryResponse] =
                    await Promise.all([
                        fetchListingTracker(params),
                        fetchListingSummary({
                            search: search.trim(),
                            collection,
                            category,
                            photoshoot,
                            listed,
                        }),
                    ]);

                setRows(listResponse.data?.data || []);
                setTotal(Number(listResponse.data?.pagination?.total || 0));
                setSummary(
                    summaryResponse.data?.data || {
                        total: 0,
                        photoshootYes: 0,
                        photoshootNo: 0,
                        listedYes: 0,
                        listedNo: 0,
                        collections: [],
                        categories: [],
                    }
                );
                setLastSynced(new Date());
                setError("");
            } catch (err) {
                console.error("Listing Tracker load failed:", err);
                setError(
                    err.response?.data?.message ||
                    "Unable to load Listing Tracker data."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [
            page,
            pageSize,
            search,
            collection,
            category,
            photoshoot,
            listed,
        ]
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 280);

        return () => clearTimeout(timer);
    }, [loadData]);

    // Live refresh keeps the dashboard current without requiring
    // users to manually reload the page.
    useEffect(() => {
        const interval = setInterval(() => {
            loadData({ silent: true });
        }, 20000);

        return () => clearInterval(interval);
    }, [loadData]);

    useEffect(() => {
        setPage(1);
    }, [search, collection, category, photoshoot, listed, pageSize]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const openAdd = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setModalOpen(true);
        setError("");
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm({
            ppk_code: row.ppk_code || "",
            shopify_handle: row.shopify_handle || "",
            product_name: row.product_name || "",
            category: row.category || "",
            barcode: row.barcode || "",
            sku: row.sku || "",
            mrp: row.mrp ?? "",
            season: row.season || "",
            collection_name: row.collection_name || "",
            image_link: row.image_link || "",
            photoshoot: Boolean(row.photoshoot),
            product_listed: Boolean(row.product_listed),
            remark: row.remark || "",
        });
        setModalOpen(true);
        setError("");
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setEditing(null);
        setForm({ ...EMPTY_FORM });
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleToggle = (name) => {
        setForm((previous) => ({
            ...previous,
            [name]: !previous[name],
        }));
    };

    const handleSave = async (event) => {
        event.preventDefault();

        if (!form.ppk_code.trim()) {
            setError("PPK Code is required.");
            return;
        }

        if (!form.product_name.trim()) {
            setError("Product Name is required.");
            return;
        }

        if (!form.sku.trim()) {
            setError("SKU is required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const payload = {
                ...form,
                ppk_code: form.ppk_code.trim(),
                product_name: form.product_name.trim(),
                sku: form.sku.trim(),
                mrp: form.mrp === "" ? null : Number(form.mrp),
            };

            if (editing) {
                await updateListing(editing.id, payload);
            } else {
                await createListing(payload);
            }

            closeModal();
            await loadData({ silent: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to save product."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        if (
            !window.confirm(
                `Delete "${row.product_name || row.sku || row.ppk_code}"?`
            )
        ) {
            return;
        }

        try {
            await deleteListing(row.id);
            await loadData({ silent: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete the product."
            );
        }
    };

    const handleDeleteAll = async () => {
        if (!total) return;

        const filters = activeFilters({ search, collection, category, photoshoot, listed });
        const filtered = hasActiveFilters(filters);

        const confirmed = window.confirm(
            filtered
                ? `${deleteAllMessage(true, total, "products")} Continue?`
                : `No filter is applied. This will permanently delete ALL ${formatNumber(total)} products. Continue?`
        );

        if (!confirmed) return;

        try {
            await deleteAllListings(filtered ? filters : null);
            setPage(1);
            await loadData({ silent: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to delete products."
            );
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".csv")) {
            setError("Please select a CSV file.");
            event.target.value = "";
            return;
        }

        setImporting(true);
        setError("");

        try {
            const response = await importListings(file);
            const imported = Number(response.data?.data?.imported || 0);
            const skipped = Number(response.data?.data?.skipped || 0);

            window.alert(
                `Import completed.\nImported: ${imported}\nSkipped: ${skipped}`
            );

            setPage(1);
            await loadData({ silent: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "CSV import failed."
            );
        } finally {
            setImporting(false);
            event.target.value = "";
        }
    };

    const handleExport = async (format = "csv") => {
        try {
            const response = await exportListings({
                search: search.trim(),
                collection,
                category,
                photoshoot,
                listed,
            });

            const csvText = await response.data.text();

            await exportFromCSV({
                csvText,
                filename: `miarcus-listing-tracker-${new Date()
                    .toISOString()
                    .slice(0, 10)}`,
                format,
                title: "Listing Tracker",
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to export products."
            );
        }
    };

    const photosPercent =
        summary.total > 0
            ? (summary.photoshootYes / summary.total) * 100
            : 0;

    const listedPercent =
        summary.total > 0
            ? (summary.listedYes / summary.total) * 100
            : 0;

    const collectionOptions = summary.collections || [];

    const pageButtons = [];
    const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));

    for (
        let number = startPage;
        number <= Math.min(totalPages, startPage + 4);
        number += 1
    ) {
        pageButtons.push(number);
    }

    return (
        <div className="listing-page pp-premium">
            {importing && (
                <PremiumLoader
                    overlay
                    title="Importing Your Data..."
                    message="Your CSV is being validated and saved to the product register."
                    caption="Importing products... please do not close this page."
                />
            )}
            <div className="listing-shell">
                <PremiumHero
                    icon={FaTags}
                    eyebrow="Product Operations"
                    title="Listing Tracker"
                    tone="indigo"
                    badge={refreshing ? "Syncing…" : "Live · 20 sec"}
                    badgeTone="mint"
                    subtitle="Track product readiness from SKU creation to photoshoot completion and online listing — with live operational visibility."
                    meta={[
                        { label: "Products", value: formatNumber(summary.total) },
                        { label: "Photoshoot", value: formatPercent(photosPercent) },
                        { label: "Listed", value: formatPercent(listedPercent) }
                    ]}
                />

                <InsightStrip
                    items={[
                        { key: "total", label: "Total products", value: formatNumber(summary.total), hint: "Across the current filter", tone: "violet", icon: FaBoxOpen },
                        { key: "photo", label: "Photoshoot complete", value: formatPercent(photosPercent), hint: `${formatNumber(summary.photoshootYes)} products ready`, tone: "green", icon: FaCamera, onClick: () => setPhotoshoot(photoshoot === "yes" ? "" : "yes"), active: photoshoot === "yes" },
                        { key: "listed", label: "Product listed", value: formatPercent(listedPercent), hint: `${formatNumber(summary.listedYes)} products live`, tone: "blue", icon: FaShoppingBag, onClick: () => setListed(listed === "yes" ? "" : "yes"), active: listed === "yes" },
                        { key: "action", label: "Action required", value: formatNumber(Math.max(summary.photoshootNo, summary.listedNo)), hint: "Highest outstanding count", tone: "red", icon: FaExclamationTriangle, onClick: () => setListed(listed === "no" ? "" : "no"), active: listed === "no" }
                    ]}
                />

                {error && (
                    <div className="listing-error">
                        {error}
                    </div>
                )}

                <div className="listing-toolbar">
                    <div className="listing-search">
                        <FaSearch size={13} />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search PPK, SKU, barcode, product or Shopify handle…"
                        />
                    </div>

                    <select
                        className="listing-select"
                        value={collection}
                        onChange={(event) => setCollection(event.target.value)}
                    >
                        <option value="">All collections</option>
                        {collectionOptions.map((item) => (
                            <option key={item.collection_name} value={item.collection_name}>
                                {item.collection_name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="listing-select"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                    >
                        <option value="">All categories</option>
                        {categories.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>

                    <select
                        className="listing-select"
                        value={photoshoot}
                        onChange={(event) => setPhotoshoot(event.target.value)}
                    >
                        <option value="">Photoshoot: All</option>
                        <option value="yes">Photoshoot: Yes</option>
                        <option value="no">Photoshoot: No</option>
                    </select>

                    <select
                        className="listing-select"
                        value={listed}
                        onChange={(event) => setListed(event.target.value)}
                    >
                        <option value="">Listed: All</option>
                        <option value="yes">Listed: Yes</option>
                        <option value="no">Listed: No</option>
                    </select>

                    <button
                        className="listing-btn outline"
                        onClick={() => loadData({ silent: true })}
                        disabled={refreshing}
                        title="Refresh"
                    >
                        <FaSyncAlt className={refreshing ? "listing-spin" : ""} />
                        Refresh
                    </button>

                    {permissions.canAdd && (
                        <button className="listing-btn primary" onClick={openAdd}>
                            <FaPlus /> Add Product
                        </button>
                    )}

                    {permissions.canAdd && (
                        <>
                            <button
                                className="listing-btn secondary"
                                onClick={() => importInputRef.current?.click()}
                                disabled={importing}
                            >
                                <FaUpload />
                                {importing ? "Importing…" : "Import CSV"}
                            </button>
                            <input
                                ref={importInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleImport}
                                hidden
                            />
                        </>
                    )}

                    <ExportButton onExport={handleExport} />

                    {permissions.canDelete && (
                        <button
                            className="listing-btn danger"
                            onClick={handleDeleteAll}
                            disabled={!total}
                        >
                            <FaTrash /> {deleteAllLabel(hasActiveFilters({ search, collection, category, photoshoot, listed }), total)}
                        </button>
                    )}
                </div>

                <div className="listing-dashboard-grid">
                    <div className="listing-card">
                        <div className="listing-card-header">
                            <div>
                                <h2>Readiness Overview</h2>
                                <p>How far products have moved through the listing workflow.</p>
                            </div>
                        </div>

                        <div className="listing-card-body">
                            <ReadinessBarChart
                                bars={[
                                    { label: "Photoshoot done", value: Number(photosPercent) || 0, count: `${formatNumber(summary.photoshootYes)} of ${formatNumber(summary.total)}`, color: "linear-gradient(180deg, #a78bfa, #6d28d9)" },
                                    { label: "Product listed", value: Number(listedPercent) || 0, count: `${formatNumber(summary.listedYes)} of ${formatNumber(summary.total)}`, color: "linear-gradient(180deg, #34d399, #047857)" },
                                    { label: "Photoshoot pending", value: summary.total ? (summary.photoshootNo / summary.total) * 100 : 0, count: formatNumber(summary.photoshootNo), color: "linear-gradient(180deg, #fcd34d, #d97706)" },
                                    { label: "Listing pending", value: summary.total ? (summary.listedNo / summary.total) * 100 : 0, count: formatNumber(summary.listedNo), color: "linear-gradient(180deg, #fda4af, #e11d48)" }
                                ]}
                            />

                            <div className="lt-subhead">Listed by collection</div>
                            <div className="listing-collection-list">
                                {collectionOptions.length ? (
                                    collectionOptions.slice(0, 10).map((item) => (
                                        <div
                                            className="listing-collection-row"
                                            key={item.collection_name}
                                        >
                                            <div className="listing-collection-name">
                                                {item.collection_name}
                                            </div>
                                            <div className="listing-collection-count">
                                                {formatNumber(item.total)}
                                            </div>
                                            <div className="lt-hbar" title={`${formatPercent(item.listed_percent)} listed`}>
                                                <i style={{ width: `${Math.max(0, Math.min(100, Number(item.listed_percent) || 0))}%` }} />
                                            </div>
                                            <div className="listing-collection-rate">
                                                {formatPercent(item.listed_percent)} listed
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="listing-empty">
                                        No collection data yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="listing-card">
                        <div className="listing-card-header">
                            <div>
                                <h2>Operational Signals</h2>
                                <p>Current gaps that need attention.</p>
                            </div>
                            <FaChartIcon />
                        </div>

                        <div className="listing-card-body">
                            <SignalsPieChart
                                centerValue={formatNumber(summary.photoshootNo + summary.listedNo)}
                                centerLabel="open gaps"
                                slices={[
                                    { label: "Photoshoot pending", value: summary.photoshootNo, valueLabel: formatNumber(summary.photoshootNo), color: "#f59e0b", note: summary.total ? `${((summary.photoshootNo / summary.total) * 100).toFixed(1)}% of catalogue` : "" },
                                    { label: "Listing pending", value: summary.listedNo, valueLabel: formatNumber(summary.listedNo), color: "#e11d48", note: summary.total ? `${((summary.listedNo / summary.total) * 100).toFixed(1)}% of catalogue` : "" }
                                ]}
                            />
                            <div className="listing-card-header" style={{ padding: "13px 0 0", marginTop: 10 }}>
                                <div>
                                    <h2 style={{ fontSize: 13 }}>Last sync</h2>
                                    <p>
                                        {lastSynced
                                            ? lastSynced.toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                            })
                                            : "Waiting for first sync"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="listing-card listing-table-card">
                    <div className="listing-card-header">
                        <div>
                            <h2>Product Register</h2>
                            <p>
                                {formatNumber(total)} matching records · page {page} of {totalPages}
                            </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FaBoxOpen color="#6d57c8" />
                            <span style={{ fontSize: 11, color: "#73858b" }}>
                                {loading ? "Loading…" : "Ready"}
                            </span>
                        </div>
                    </div>

                    <div className="listing-table-wrap">
                        {loading ? (
                            <div className="listing-loading"><PremiumLoader compact title="Loading product register" /></div>
                        ) : rows.length === 0 ? (
                            <div className="listing-empty">
                                No products match the current filters.
                            </div>
                        ) : (
                            <table className="listing-table">
                                <thead>
                                    <tr>
                                        <th>PPK Code</th>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Barcode</th>
                                        <th>SKU</th>
                                        <th>MRP</th>
                                        <th>Season</th>
                                        <th>Collection</th>
                                        <th>Photoshoot</th>
                                        <th>Listed</th>
                                        <th>Remark</th>
                                        <th className="listing-actions-column">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="listing-code">{row.ppk_code || "—"}</td>
                                            <td>
                                                <div className="listing-product-name" title={row.product_name}>
                                                    {row.product_name || "Unnamed product"}
                                                </div>
                                                {row.shopify_handle && (
                                                    <div className="listing-muted">
                                                        {row.shopify_handle}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{row.category || "—"}</td>
                                            <td>{row.barcode || "—"}</td>
                                            <td className="listing-code">{row.sku || "—"}</td>
                                            <td>
                                                {row.mrp === null || row.mrp === undefined
                                                    ? "—"
                                                    : `₹${formatNumber(row.mrp)}`}
                                            </td>
                                            <td>{row.season || "—"}</td>
                                            <td>{row.collection_name || "—"}</td>
                                            <td>
                                                <span className={`listing-status ${row.photoshoot ? "yes" : "no"}`}>
                                                    {row.photoshoot ? <FaCheckCircle /> : <FaCircle />}
                                                    {row.photoshoot ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`listing-status ${row.product_listed ? "yes" : "no"}`}>
                                                    {row.product_listed ? <FaCheckCircle /> : <FaCircle />}
                                                    {row.product_listed ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td>
                                                <div
                                                    className="listing-remark"
                                                    title={row.remark || "Add remark"}
                                                >
                                                    {row.remark || "Add Remark"}
                                                </div>
                                            </td>
                                            <td className="listing-actions-column">
                                                <div className="listing-actions">
                                                    {permissions.canEdit && (
                                                        <button
                                                            className="listing-btn outline icon"
                                                            onClick={() => openEdit(row)}
                                                            title="Edit"
                                                        >
                                                            <FaEdit /> <span>Edit</span>
                                                        </button>
                                                    )}
                                                    {permissions.canDelete && (
                                                        <button
                                                            className="listing-btn danger icon"
                                                            onClick={() => handleDelete(row)}
                                                            title="Delete"
                                                        >
                                                            <FaTrash /> <span>Delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="listing-pagination">
                        <div className="listing-page-info">
                            Showing {total ? ((page - 1) * pageSize) + 1 : 0}
                            {" – "}
                            {Math.min(page * pageSize, total)}
                            {" of "}
                            {formatNumber(total)} entries
                        </div>

                        <div className="listing-page-controls">
                            <select
                                className="listing-select"
                                value={pageSize}
                                onChange={(event) => setPageSize(Number(event.target.value))}
                                style={{ minWidth: 80, height: 32 }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>

                            <button
                                className="listing-page-number"
                                disabled={page <= 1}
                                onClick={() => setPage((previous) => previous - 1)}
                            >
                                ‹
                            </button>

                            {pageButtons.map((number) => (
                                <button
                                    key={number}
                                    className={`listing-page-number ${
                                        number === page ? "active" : ""
                                    }`}
                                    onClick={() => setPage(number)}
                                >
                                    {number}
                                </button>
                            ))}

                            <button
                                className="listing-page-number"
                                disabled={page >= totalPages}
                                onClick={() => setPage((previous) => previous + 1)}
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {modalOpen && (
                <div
                    className="listing-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}
                >
                    <div className="listing-modal">
                        <div className="listing-modal-header">
                            <div>
                                <h2>{editing ? "Edit Product" : "Add Product"}</h2>
                                <p>
                                    Keep product identity, readiness and listing status
                                    accurate in real time.
                                </p>
                            </div>
                            <button
                                className="listing-modal-close"
                                onClick={closeModal}
                                title="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form className="listing-form" onSubmit={handleSave}>
                            <div className="listing-form-grid">
                                <Field label="PPK Code" required>
                                    <input
                                        name="ppk_code"
                                        value={form.ppk_code}
                                        onChange={handleFormChange}
                                        placeholder="e.g. C-044926"
                                    />
                                </Field>

                                <Field label="SKU" required>
                                    <input
                                        name="sku"
                                        value={form.sku}
                                        onChange={handleFormChange}
                                        placeholder="Unique stock keeping unit"
                                    />
                                </Field>

                                <Field label="Product Name" required>
                                    <input
                                        name="product_name"
                                        value={form.product_name}
                                        onChange={handleFormChange}
                                        placeholder="e.g. Cotton Bedding Set"
                                    />
                                </Field>

                                <Field label="Category">
                                    <input
                                        name="category"
                                        value={form.category}
                                        onChange={handleFormChange}
                                        placeholder="e.g. BEDDING"
                                    />
                                </Field>

                                <Field label="Barcode">
                                    <input
                                        name="barcode"
                                        value={form.barcode}
                                        onChange={handleFormChange}
                                        placeholder="EAN / UPC / internal barcode"
                                    />
                                </Field>

                                <Field label="MRP">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="mrp"
                                        value={form.mrp}
                                        onChange={handleFormChange}
                                        placeholder="0.00"
                                    />
                                </Field>

                                <Field label="Season">
                                    <input
                                        name="season"
                                        value={form.season}
                                        onChange={handleFormChange}
                                        placeholder="e.g. ALL WEATHER"
                                    />
                                </Field>

                                <Field label="Collection Name">
                                    <input
                                        name="collection_name"
                                        value={form.collection_name}
                                        onChange={handleFormChange}
                                        placeholder="e.g. SS26"
                                    />
                                </Field>

                                <Field label="Shopify Handle">
                                    <input
                                        name="shopify_handle"
                                        value={form.shopify_handle}
                                        onChange={handleFormChange}
                                        placeholder="product-url-handle"
                                    />
                                </Field>

                                <Field label="Image Link">
                                    <input
                                        name="image_link"
                                        value={form.image_link}
                                        onChange={handleFormChange}
                                        placeholder="https://…"
                                    />
                                </Field>

                                <div className="listing-field full">
                                    <label>Workflow Status</label>
                                    <div className="listing-switch-grid">
                                        <StatusToggle
                                            label="Photoshoot completed"
                                            help="Product photography is ready."
                                            checked={form.photoshoot}
                                            onChange={() => handleToggle("photoshoot")}
                                        />
                                        <StatusToggle
                                            label="Product listed"
                                            help="Product is available on the online store."
                                            checked={form.product_listed}
                                            onChange={() => handleToggle("product_listed")}
                                        />
                                    </div>
                                </div>

                                <Field label="Remark" full>
                                    <textarea
                                        name="remark"
                                        value={form.remark}
                                        onChange={handleFormChange}
                                        placeholder="Add a short operational note…"
                                    />
                                </Field>
                            </div>

                            {error && (
                                <div className="listing-error" style={{ marginTop: 15 }}>
                                    {error}
                                </div>
                            )}

                            <div className="listing-modal-footer">
                                <button
                                    type="button"
                                    className="listing-btn outline"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="listing-btn primary"
                                    disabled={saving}
                                >
                                    {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
                                </button>
                            </div>
                        </form>

                        {!editing && (
                            <div className="listing-import-help">
                                <strong>CSV tip:</strong> bulk imports can use headers such as
                                PPK Code, Product Name, Category, Barcode, SKU, MRP, Season,
                                Collection Name, Image Link, Photoshoot, Product Listed and Remark.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, required, full, children }) {
    return (
        <div className={`listing-field ${full ? "full" : ""}`}>
            <label>
                {label} {required && <span style={{ color: "#d94343" }}>*</span>}
            </label>
            {children}
        </div>
    );
}

function StatusToggle({ label, help, checked, onChange }) {
    return (
        <div className="listing-switch">
            <div className="listing-switch-copy">
                <strong>{label}</strong>
                <span>{help}</span>
            </div>
            <label className="listing-toggle">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                />
                <span className="listing-toggle-track" />
            </label>
        </div>
    );
}

function FaChartIcon() {
    return (
        <span
            aria-hidden="true"
            style={{
                display: "inline-flex",
                width: 30,
                height: 30,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                background: "#f4f1ff",
                color: "#6d57c8",
                fontWeight: 800,
                fontSize: 12,
            }}
        >
            •••
        </span>
    );
}

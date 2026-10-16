import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import {
    FaArrowRight,
    FaBuilding,
    FaCheck,
    FaCheckCircle,
    FaChevronDown,
    FaClipboardCheck,
    FaCog,
    FaEdit,
    FaExclamationTriangle,
    FaFilter,
    FaFolderOpen,
    FaIdBadge,
    FaLock,
    FaPaperPlane,
    FaQuoteLeft,
    FaSearch,
    FaShieldAlt,
    FaSitemap,
    FaStore,
    FaSyncAlt,
    FaThLarge,
    FaTimes,
    FaUndo,
    FaUserCheck,
    FaUserTie,
    FaUsers,
} from "react-icons/fa";

import "../styles/FilterAccess.css";

// ======================================================
// FILTER ACCESS (admin only)
// ======================================================
// Per-user, per-module filter scope on top of existing RBAC.
// "Use default access" stores nothing, so users keep today's rules
// until an administrator changes something on purpose.
// ======================================================

const PAGE_SIZE = 10;
const GLOBAL = "__global__";
const GLOBAL_KEYS = ["department", "store", "checklist_type"];

const FILTER_META = {
    department: {
        title: "Department access",
        plural: "Departments",
        desc: "Select which departments this user can see in the module filters.",
        icon: FaSitemap,
        tone: "violet",
    },
    designation: {
        title: "Designation access",
        plural: "Designations",
        desc: "Select which designations this user can see. Matches the employee who submitted the checklist.",
        icon: FaIdBadge,
        tone: "pink",
    },
    store: {
        title: "Store access",
        plural: "Stores",
        desc: "Select which stores this user can see in the module filters.",
        icon: FaStore,
        tone: "blue",
    },
    checklist_type: {
        title: "Checklist type access",
        plural: "Checklist Types",
        desc: "Select which checklist types this user can work with.",
        icon: FaClipboardCheck,
        tone: "green",
    },
    nso_project: {
        title: "NSO Project access",
        plural: "NSO Projects",
        desc: "Select which NSO projects this user can see in the module filters.",
        icon: FaFolderOpen,
        tone: "amber",
    },
};

const GLOBAL_FIELDS = {
    department: { ids: "department_ids", all: "all_departments" },
    store: { ids: "store_ids", all: "all_stores" },
    checklist_type: { ids: "checklist_type_ids", all: "all_checklist_types" },
};

const optionLabel = (key, row) => {
    if (!row) return "";
    if (key === "department") return row.department_name || `Department ${row.id}`;
    if (key === "designation") return row.designation_name || `Designation ${row.id}`;
    if (key === "store") return row.store_name || `Store ${row.id}`;
    if (key === "checklist_type") return row.checklist_name || `Checklist type ${row.id}`;
    if (key === "nso_project") return `#${row.id} - ${row.location || "NSO Project"}${row.city ? `, ${row.city}` : ""}`;
    return String(row.id);
};

const photoUrl = (photo) => {
    if (!photo) return "";
    if (/^(data:|blob:|https?:\/\/)/.test(photo)) return photo;
    return `${String(API_BASE_URL || "").replace(/\/+$/, "")}/uploads/${photo}`;
};

const initials = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?";

const errorText = (error, fallback) =>
    error?.response?.data?.message || fallback;

const blankPolicies = (keys) =>
    Object.fromEntries(keys.map((key) => [key, { policy: "default", ids: [] }]));

const sameRule = (a, b) =>
    a?.policy === b?.policy &&
    (a?.policy !== "selected" ||
        JSON.stringify([...(a?.ids || [])].sort((x, y) => x - y)) ===
            JSON.stringify([...(b?.ids || [])].sort((x, y) => x - y)));

const globalToPolicies = (access) => {
    const result = {};
    for (const key of GLOBAL_KEYS) {
        const field = GLOBAL_FIELDS[key];
        const ids = Array.isArray(access?.[field.ids]) ? access[field.ids].map(Number) : null;
        const all = access?.[field.all];
        if (all === true) result[key] = { policy: "all", ids: [] };
        else if (all === false || ids) result[key] = { policy: "selected", ids: ids || [] };
        else result[key] = { policy: "default", ids: [] };
    }
    return result;
};

const policyToGlobal = (key, rule) => {
    const field = GLOBAL_FIELDS[key];
    if (rule.policy === "all") return { [field.all]: true, [field.ids]: null };
    if (rule.policy === "selected") return { [field.all]: false, [field.ids]: rule.ids };
    return { [field.all]: null, [field.ids]: null };
};

const scopePill = (rule, plural) => {
    if (!rule || rule.policy === "default") return { text: "Default", tone: "" };
    if (rule.policy === "all") return { text: `All ${plural.toLowerCase()}`, tone: "green" };
    if (rule.policy === "none") return { text: "No access", tone: "red" };
    return { text: `${rule.ids.length} selected`, tone: "purple" };
};

// ======================================================
// MULTI SELECT WITH SEARCH
// ======================================================

function MultiSelect({ options, value, onChange, plural, disabled }) {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState("");
    const boxRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => {
            if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const selected = useMemo(() => new Set(value.map(Number)), [value]);
    const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
    const shown = useMemo(() => {
        const q = term.trim().toLowerCase();
        return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    }, [options, term]);

    const toggle = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange([...next]);
    };

    const chips = value.slice(0, 2);
    const extra = value.length - chips.length;

    return (
        <div className={`fa-multi ${open ? "open" : ""}`} ref={boxRef}>
            <button
                type="button"
                className="fa-multi-field"
                onClick={() => !disabled && setOpen((v) => !v)}
                disabled={disabled}
                aria-expanded={open}
            >
                <span className="fa-chips">
                    {value.length === 0 && (
                        <span className="fa-chip-empty">Choose {plural.toLowerCase()}…</span>
                    )}
                    {chips.map((id) => (
                        <span className="fa-chip" key={id}>
                            {byId.get(Number(id))?.label || `#${id}`}
                            <span
                                role="button"
                                tabIndex={0}
                                className="fa-chip-x"
                                aria-label="Remove"
                                onClick={(e) => { e.stopPropagation(); toggle(Number(id)); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggle(Number(id)); } }}
                            >
                                <FaTimes />
                            </span>
                        </span>
                    ))}
                    {extra > 0 && <span className="fa-chip fa-chip-more">+{extra}</span>}
                </span>
                <FaChevronDown className="fa-multi-caret" />
            </button>

            {open && (
                <div className="fa-pop" role="listbox" aria-multiselectable="true">
                    <div className="fa-pop-search">
                        <FaSearch />
                        <input
                            autoFocus
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder={`Search ${plural.toLowerCase()}…`}
                        />
                    </div>
                    <div className="fa-pop-actions">
                        <button
                            type="button"
                            onClick={() => onChange([...new Set([...value.map(Number), ...shown.map((o) => o.id)])])}
                        >
                            Select all shown
                        </button>
                        <button type="button" onClick={() => onChange([])}>Clear</button>
                        <span>{value.length} selected</span>
                    </div>
                    <div className="fa-pop-list">
                        {shown.map((o) => (
                            <label key={o.id} className={`fa-pop-item ${selected.has(o.id) ? "on" : ""}`}>
                                <input
                                    type="checkbox"
                                    checked={selected.has(o.id)}
                                    onChange={() => toggle(o.id)}
                                />
                                <span>{o.label}</span>
                                {o.hint && <small>{o.hint}</small>}
                            </label>
                        ))}
                        {shown.length === 0 && <div className="fa-pop-empty">No matching {plural.toLowerCase()}.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ======================================================
// PAGE
// ======================================================

export default function FilterAccess() {
    const [users, setUsers] = useState([]);
    const [catalog, setCatalog] = useState({ modules: [], values: {} });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [toast, setToast] = useState(null);

    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [storeFilter, setStoreFilter] = useState("");
    const [modeFilter, setModeFilter] = useState("");
    const [page, setPage] = useState(1);

    const [editing, setEditing] = useState(null);

    const toastTimer = useRef(null);

    const showToast = (text, tone = "success") => {
        setToast({ text, tone });
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 4200);
    };

    useEffect(() => () => window.clearTimeout(toastTimer.current), []);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        const [u, c] = await Promise.allSettled([
            axios.get("/api/filter-access/users"),
            axios.get("/api/filter-access/catalog"),
        ]);
        if (u.status === "fulfilled") setUsers(u.value.data?.users || []);
        if (c.status === "fulfilled") {
            setCatalog({ modules: c.value.data?.modules || [], values: c.value.data?.values || {} });
        }
        const failed = [u, c].find((r) => r.status === "rejected");
        if (failed) setLoadError(errorText(failed.reason, "Unable to load Filter Access. Sign in with an administrator account."));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const values = catalog.values || {};
    const primaryModule = catalog.modules[0]?.name || "Action Points";

    const storeName = useMemo(() => {
        const map = new Map((values.store || []).map((s) => [Number(s.id), s.store_name]));
        return (id) => map.get(Number(id)) || "";
    }, [values.store]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter((u) => {
            if (q) {
                const text = `${u.name || ""} ${u.employee_id || ""} ${u.email || ""} ${u.department || ""} ${u.designation || ""}`.toLowerCase();
                if (!text.includes(q)) return false;
            }
            if (deptFilter && Number(u.department_id) !== Number(deptFilter)) return false;
            if (desigFilter && Number(u.designation_id) !== Number(desigFilter)) return false;
            if (storeFilter && !(u.store_ids || []).includes(Number(storeFilter))) return false;
            if (modeFilter === "custom" && (!u.has_custom_access || u.is_admin)) return false;
            if (modeFilter === "default" && (u.has_custom_access || u.is_admin)) return false;
            if (modeFilter === "admin" && !u.is_admin) return false;
            return true;
        });
    }, [users, search, deptFilter, desigFilter, storeFilter, modeFilter]);

    useEffect(() => { setPage(1); }, [search, deptFilter, desigFilter, storeFilter, modeFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const customCount = users.filter((u) => u.has_custom_access && !u.is_admin).length;
    const hasFilters = search || deptFilter || desigFilter || storeFilter || modeFilter;

    const clearFilters = () => {
        setSearch("");
        setDeptFilter("");
        setDesigFilter("");
        setStoreFilter("");
        setModeFilter("");
    };

    return (
        <main className="fa-page">
            <header className="fa-hero">
                <div className="fa-hero-text">
                    <span className="fa-eyebrow">MIARCUS ADMIN CONSOLE</span>
                    <h1>Filter Access Management</h1>
                    <p>Configure optional access overrides for individual users. Leave any setting untouched to keep existing rules.</p>
                    <div className="fa-hero-tags">
                        <span><FaShieldAlt /> Flexible permissions</span>
                        <span><FaUsers /> Role based control</span>
                        <span><FaLock /> Secure &amp; centralized</span>
                    </div>
                </div>
                <div className="fa-hero-art" aria-hidden="true">
                    <div className="fa-shield"><FaShieldAlt /><FaLock className="fa-shield-lock" /></div>
                    <span className="fa-float f1"><FaUserCheck /></span>
                    <span className="fa-float f2"><FaUsers /></span>
                    <span className="fa-float f3"><FaFilter /></span>
                </div>
                <button type="button" className="fa-refresh" onClick={load} disabled={loading}>
                    <FaSyncAlt className={loading ? "spin" : ""} /> Refresh
                </button>
            </header>

            <section className="fa-stats">
                <article>
                    <span className="fa-stat-icon violet"><FaUsers /></span>
                    <div><strong>{users.length}</strong><span>Total users</span></div>
                </article>
                <article>
                    <span className="fa-stat-icon green"><FaCheckCircle /></span>
                    <div><strong>{customCount}</strong><span>Custom access</span></div>
                </article>
                <article>
                    <span className="fa-stat-icon blue"><FaLock /></span>
                    <div><strong>{Math.max(0, users.length - customCount)}</strong><span>Using default rules</span></div>
                </article>
            </section>

            {loadError && (
                <div className="fa-alert error" role="alert">
                    <FaExclamationTriangle /> <span>{loadError}</span>
                    <button type="button" onClick={load}>Try again</button>
                </div>
            )}

            <section className="fa-panel">
                <div className="fa-toolbar">
                    <div className="fa-search">
                        <FaSearch />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by employee, ID, department or designation…"
                        />
                    </div>
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} aria-label="Department">
                        <option value="">All Departments</option>
                        {(values.department || []).map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                    </select>
                    <select value={desigFilter} onChange={(e) => setDesigFilter(e.target.value)} aria-label="Designation">
                        <option value="">All Designations</option>
                        {(values.designation || []).map((d) => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
                    </select>
                    <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} aria-label="Store">
                        <option value="">All Stores</option>
                        {(values.store || []).map((s) => <option key={s.id} value={s.id}>{s.store_name}</option>)}
                    </select>
                    <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} aria-label="Access mode">
                        <option value="">All Access Modes</option>
                        <option value="custom">Custom access</option>
                        <option value="default">Role based</option>
                        <option value="admin">Administrators</option>
                    </select>
                    <button type="button" className="fa-clear" onClick={clearFilters} disabled={!hasFilters}>
                        <FaTimes /> Clear Filters
                    </button>
                </div>

                <div className="fa-table-wrap">
                    <table className="fa-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Store Scope</th>
                                <th>Checklist Scope</th>
                                <th>Access Mode</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && Array.from({ length: 6 }).map((_, i) => (
                                <tr key={`sk-${i}`} className="fa-skeleton-row">
                                    {Array.from({ length: 7 }).map((__, j) => <td key={j}><span className="fa-skeleton" /></td>)}
                                </tr>
                            ))}

                            {!loading && pageRows.map((u) => {
                                const rules = u.modules?.[primaryModule] || {};
                                const store = scopePill(rules.store, "Stores");
                                const checklist = scopePill(rules.checklist_type, "Types");
                                return (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="fa-employee">
                                                <span className={`fa-avatar tone-${u.id % 5}`}>{(u.name || "?").trim().charAt(0).toUpperCase()}</span>
                                                <span><b>{u.name}</b><small>{u.employee_id || u.email || `User #${u.id}`}</small></span>
                                            </div>
                                        </td>
                                        <td>{u.department || "—"}</td>
                                        <td>{u.designation || "—"}</td>
                                        <td><span className={`fa-pill ${u.is_admin ? "green" : store.tone}`}>{u.is_admin ? "All stores" : store.text}</span></td>
                                        <td><span className={`fa-pill ${u.is_admin ? "green" : checklist.tone}`}>{u.is_admin ? "All types" : checklist.text}</span></td>
                                        <td>
                                            <span className={`fa-pill mode ${u.is_admin ? "admin" : u.has_custom_access ? "custom" : ""}`}>
                                                {u.is_admin ? "Administrator" : u.has_custom_access ? "Custom" : "Role based"}
                                            </span>
                                        </td>
                                        <td>
                                            <button type="button" className="fa-edit" onClick={() => setEditing(u)}>
                                                <FaEdit /> Edit access <FaArrowRight />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {!loading && pageRows.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="fa-empty">
                                        <FaSearch />
                                        <b>No users found</b>
                                        <span>{hasFilters ? "Try a different search or clear the filters." : "No users are available."}</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <footer className="fa-foot">
                    <span>
                        Showing <b>{filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} - {Math.min(safePage * PAGE_SIZE, filtered.length)}</b> of <b>{filtered.length}</b> Users
                    </span>
                    <div className="fa-pager">
                        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Previous</button>
                        <span className="fa-page-no">Page {safePage} of {totalPages}</span>
                        <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next</button>
                    </div>
                </footer>
            </section>

            {editing && (
                <EditAccessModal
                    user={editing}
                    catalog={catalog}
                    storeName={storeName}
                    onClose={() => setEditing(null)}
                    onSaved={(message) => {
                        setEditing(null);
                        showToast(message);
                        load();
                    }}
                />
            )}

            {toast && (
                <div className={`fa-toast ${toast.tone}`} role="status">
                    <FaCheckCircle /> {toast.text}
                </div>
            )}
        </main>
    );
}

// ======================================================
// EDIT MODAL
// ======================================================

function EditAccessModal({ user, catalog, storeName, onClose, onSaved }) {
    const modules = catalog.modules || [];
    const values = catalog.values || {};

    const [moduleName, setModuleName] = useState(modules[0]?.name || GLOBAL);
    const [original, setOriginal] = useState(null);
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // Load this user's module rules + existing global overrides.
    useEffect(() => {
        let alive = true;
        (async () => {
            setBusy(true);
            setError("");
            try {
                const [mod, glob] = await Promise.all([
                    axios.get(`/api/filter-access/users/${user.id}`),
                    axios.get(`/api/users/${user.id}/access-config`),
                ]);
                if (!alive) return;
                const state = { ...(mod.data?.modules || {}) };
                for (const m of modules) {
                    state[m.name] = { ...blankPolicies(m.filters.map((f) => f.key)), ...(state[m.name] || {}) };
                }
                state[GLOBAL] = globalToPolicies(glob.data?.access || {});
                setOriginal(state);
                setDraft(JSON.parse(JSON.stringify(state)));
            } catch (e) {
                if (alive) setError(errorText(e, "Could not load this user's access settings."));
            } finally {
                if (alive) setBusy(false);
            }
        })();
        return () => { alive = false; };
    }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escape closes; lock background scroll.
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape" && !saving) onClose(); };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose, saving]);

    const filterKeys = moduleName === GLOBAL
        ? GLOBAL_KEYS
        : (modules.find((m) => m.name === moduleName)?.filters || []).map((f) => f.key);

    const changedModules = useMemo(() => {
        if (!draft || !original) return [];
        return Object.keys(draft).filter((name) =>
            Object.keys(draft[name]).some((key) => !sameRule(draft[name][key], original[name]?.[key]))
        );
    }, [draft, original]);

    const setRule = (key, patch) => {
        setDraft((old) => ({
            ...old,
            [moduleName]: {
                ...old[moduleName],
                [key]: { ...old[moduleName][key], ...patch },
            },
        }));
    };

    const optionsFor = (key) => {
        let rows = values[key] || [];
        // Designations follow the department selection (dependent filter).
        if (key === "designation" && draft?.[moduleName]?.department?.policy === "selected") {
            const allowed = new Set(draft[moduleName].department.ids.map(Number));
            rows = rows.filter((r) => r.department_id == null || allowed.has(Number(r.department_id)));
        }
        return rows.map((r) => ({
            id: Number(r.id),
            label: optionLabel(key, r),
            hint: key === "store" ? r.city || "" : "",
        }));
    };

    const save = async () => {
        if (!changedModules.length) { onClose(); return; }
        for (const name of changedModules) {
            for (const [key, rule] of Object.entries(draft[name])) {
                if (rule.policy === "selected" && rule.ids.length === 0) {
                    setError(`${FILTER_META[key]?.plural || key}: choose at least one value, or pick another access option.`);
                    if (name !== moduleName) setModuleName(name);
                    return;
                }
            }
        }
        setSaving(true);
        setError("");
        try {
            for (const name of changedModules) {
                const changed = Object.fromEntries(
                    Object.entries(draft[name]).filter(([key, rule]) => !sameRule(rule, original[name]?.[key]))
                );
                if (name === GLOBAL) {
                    const body = Object.assign({}, ...Object.entries(changed).map(([key, rule]) => policyToGlobal(key, rule)));
                    await axios.put(`/api/users/${user.id}/access-config`, body);
                } else {
                    await axios.put(
                        `/api/filter-access/users/${user.id}/modules/${encodeURIComponent(name)}`,
                        { filters: changed }
                    );
                }
            }
            onSaved(`Filter access saved for ${user.name}. It applies from their next request.`);
        } catch (e) {
            setError(errorText(e, "Could not save filter access."));
        } finally {
            setSaving(false);
        }
    };

    const resetAll = async () => {
        if (!window.confirm(`Remove every filter access override for ${user.name}? Existing role-based rules will apply.`)) return;
        setSaving(true);
        setError("");
        try {
            await axios.delete(`/api/filter-access/users/${user.id}`);
            onSaved(`All overrides removed for ${user.name}. Role-based rules apply.`);
        } catch (e) {
            setError(errorText(e, "Could not reset access."));
            setSaving(false);
        }
    };

    const resetModule = () => {
        setDraft((old) => ({ ...old, [moduleName]: blankPolicies(filterKeys) }));
    };

    const primaryStore = user.store_ids?.length ? storeName(user.store_ids[0]) : "";
    const photo = photoUrl(user.profile_photo);
    const moduleTitle = moduleName === GLOBAL ? "all modules" : `${moduleName} module`;

    return (
        <div
            className="fa-overlay"
            role="presentation"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
        >
            <div className="fa-modal" role="dialog" aria-modal="true" aria-labelledby="fa-modal-title">
                <div className="fa-modal-head">
                    <span className="fa-modal-icon"><FaFilter /></span>
                    <div>
                        <h2 id="fa-modal-title">Filter Access</h2>
                        <p>Configure which filter options this user can access in each module.</p>
                    </div>
                    <button type="button" className="fa-close" onClick={onClose} disabled={saving} aria-label="Close">
                        <FaTimes />
                    </button>
                </div>

                <div className="fa-modal-body">
                    {/* ---------- USER PANEL ---------- */}
                    <aside className="fa-user">
                        <div className="fa-portrait">
                            <span className="fa-orbit o1"><FaUsers /></span>
                            <span className="fa-orbit o2"><FaFilter /></span>
                            <span className="fa-orbit o3"><FaBuilding /></span>
                            <span className="fa-orbit o4"><FaCheck /></span>
                            <div className="fa-portrait-ring">
                                {photo
                                    ? <img src={photo} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                    : <span>{initials(user.name)}</span>}
                            </div>
                        </div>
                        <h3>{user.name}</h3>
                        <p className="fa-user-id">Employee ID: {user.employee_id || "—"}</p>
                        <span className={`fa-status ${String(user.status).toLowerCase() === "active" ? "on" : ""}`}>
                            <FaCheckCircle /> {user.status || "Active"}
                        </span>

                        <div className="fa-user-cards">
                            <div><span className="ic"><FaUserTie /></span><b>{user.designation || "—"}</b><small>Designation</small></div>
                            <div><span className="ic"><FaSitemap /></span><b>{user.department || "—"}</b><small>Department</small></div>
                            <div><span className="ic amber"><FaStore /></span><b>{primaryStore || "—"}</b><small>Primary Store</small></div>
                        </div>

                        <div className="fa-quote">
                            <FaQuoteLeft className="q" />
                            <p>Restricted data.<br />Stronger privacy.<br />Better control.</p>
                            <span className="send"><FaPaperPlane /></span>
                        </div>
                    </aside>

                    {/* ---------- SETTINGS ---------- */}
                    <section className="fa-settings">
                        <div className="fa-card fa-module-card">
                            <span className="fa-tile violet"><FaThLarge /></span>
                            <div>
                                <b>Available Modules</b>
                                <small>Only modules whose data is protected by Filter Access are shown here.</small>
                            </div>
                            <label className="fa-select-wrap">
                                <select value={moduleName} onChange={(e) => setModuleName(e.target.value)} disabled={busy}>
                                    {modules.map((m) => (
                                        <option key={m.name} value={m.name}>
                                            {m.name}{changedModules.includes(m.name) ? " •" : ""}
                                        </option>
                                    ))}
                                    <option value={GLOBAL}>
                                        Global defaults (all modules){changedModules.includes(GLOBAL) ? " •" : ""}
                                    </option>
                                </select>
                            </label>
                        </div>

                        {user.is_admin && (
                            <div className="fa-alert info">
                                <FaShieldAlt /> <span>{user.name} is an administrator. Administrators always see everything, so these settings only take effect if administrator rights are removed.</span>
                            </div>
                        )}
                        {error && (
                            <div className="fa-alert error" role="alert"><FaExclamationTriangle /> <span>{error}</span></div>
                        )}

                        <div className="fa-card fa-rules">
                            <h3>Filter Access Settings</h3>
                            <p className="fa-sub">
                                {moduleName === GLOBAL
                                    ? "Defaults used by every module when a module filter is left on “Use default access”. They also trim the Department, Store and Checklist Type lists across the portal."
                                    : `Control which filter options are available for this user in ${moduleTitle}.`}
                            </p>

                            {busy && Array.from({ length: 4 }).map((_, i) => (
                                <div className="fa-rule skeleton" key={i}><span className="fa-skeleton" /></div>
                            ))}

                            {!busy && draft && filterKeys.map((key) => {
                                const meta = FILTER_META[key];
                                const rule = draft[moduleName][key];
                                const Icon = meta.icon;
                                const options = optionsFor(key);
                                return (
                                    <div className={`fa-rule tone-${meta.tone}`} key={key}>
                                        <span className={`fa-tile ${meta.tone}`}><Icon /></span>
                                        <div className="fa-rule-text">
                                            <b>{meta.title}</b>
                                            <small>{meta.desc}</small>
                                        </div>
                                        <span className="fa-optional">Optional</span>
                                        <div className="fa-rule-control">
                                            <label className="fa-select-wrap">
                                                <select
                                                    value={rule.policy}
                                                    disabled={saving}
                                                    onChange={(e) => setRule(key, { policy: e.target.value, ids: e.target.value === "selected" ? rule.ids : [] })}
                                                >
                                                    <option value="default">Use default access</option>
                                                    <option value="all">All {meta.plural}</option>
                                                    <option value="selected">Selected {meta.plural}</option>
                                                    {moduleName !== GLOBAL && <option value="none">No access</option>}
                                                </select>
                                            </label>
                                            {rule.policy === "selected" && (
                                                <MultiSelect
                                                    options={options}
                                                    value={rule.ids}
                                                    plural={meta.plural}
                                                    disabled={saving}
                                                    onChange={(ids) => setRule(key, { ids })}
                                                />
                                            )}
                                            {rule.policy === "none" && (
                                                <small className="fa-note red">Filter hidden; records with a {meta.plural.toLowerCase().replace(/s$/, "")} are not shown.</small>
                                            )}
                                            {key === "designation" && rule.policy === "selected" && draft[moduleName].department?.policy === "selected" && (
                                                <small className="fa-note">Showing designations of the selected departments.</small>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={`fa-card fa-advanced ${advancedOpen ? "open" : ""}`}>
                            <button type="button" className="fa-adv-head" onClick={() => setAdvancedOpen((v) => !v)} aria-expanded={advancedOpen}>
                                <span className="fa-tile violet"><FaCog /></span>
                                <div><b>Advanced Options</b><small>These settings apply only to the selected module.</small></div>
                                <FaChevronDown className="caret" />
                            </button>
                            {advancedOpen && (
                                <div className="fa-adv-body">
                                    <ul>
                                        <li><b>Use default access</b> keeps the user on today&apos;s rules. Nothing is stored.</li>
                                        <li><b>All</b> allows every value within the user&apos;s existing module permissions.</li>
                                        <li><b>Selected</b> allows only the chosen values. An empty selection is not allowed.</li>
                                        <li><b>No access</b> hides the filter and blocks records that carry that value.</li>
                                        <li>Filter Access never opens a module. Module permissions (View / Add / Edit / Full) are still set on the Users page.</li>
                                    </ul>
                                    <button type="button" className="fa-link" onClick={resetModule} disabled={busy || saving}>
                                        <FaUndo /> Set every filter in this {moduleName === GLOBAL ? "section" : "module"} to default
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="fa-modal-foot">
                    <button type="button" className="fa-reset" onClick={resetAll} disabled={saving || busy}>
                        <FaUndo /> Reset all overrides
                    </button>
                    <div>
                        <button type="button" className="fa-cancel" onClick={onClose} disabled={saving}>Cancel</button>
                        <button type="button" className="fa-save" onClick={save} disabled={saving || busy}>
                            {saving ? <FaSyncAlt className="spin" /> : <FaCheck />} {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

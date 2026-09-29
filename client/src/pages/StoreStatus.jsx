import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../axiosConfig.js";

import {
    FaStore,
    FaWifi,
    FaPowerOff,
    FaUserSlash,
    FaSearch,
    FaSyncAlt,
    FaUserTie,
    FaPhoneAlt,
    FaChevronDown,
    FaChevronUp,
    FaMapMarkerAlt,
    FaTh,
    FaList,
    FaClock,
} from "react-icons/fa";

import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import PremiumLoader from "../components/premium/PremiumLoader";
import SearchableSelect from "../components/common/SearchableSelect";
import { initials, avatarTone } from "../utils/premiumFormat";

import "../styles/premium/PagePremium.css";
import "../styles/pages/StoreStatus.css";

// ======================================================
// STORE STATUS (ADMIN ONLY)
// ------------------------------------------------------
// One manager per store decides the store's status:
//   Online     -> the store manager has Mi Arcus open now
//   Offline    -> not active; exact "offline since" time shown
//   No Manager -> no Store Manager / ASM linked to the store
// Head-office / ASM / regional users linked to "All Stores"
// never make a store online.
// Live: refreshes every 15 seconds.
// ======================================================

const REFRESH_MS = 15 * 1000;
const ALL = "all";

const formatAgo = (seconds) => {
    if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "";
    const s = Math.max(0, Number(seconds));
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h} hr${h > 1 ? "s" : ""}${m ? ` ${m} min` : ""} ago`;
    }
    const d = Math.floor(s / 86400);
    return `${d} day${d > 1 ? "s" : ""} ago`;
};

// "29 Sep 2026, 04:12:35 PM"
const formatExact = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
};

const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const pageLabel = (path) => {
    if (!path) return "";
    const clean = String(path).replace(/^\/+/, "").split("/")[0] || "dashboard";
    return clean.replace(/-/g, " ");
};

const STATUS_LABEL = {
    online: "Online",
    offline: "Offline",
    no_manager: "No Manager",
};

// Text shown under the manager name.
const presenceLine = (person) => {
    if (!person) return "";
    if (person.is_online) {
        return person.online_since_today
            ? `Online since ${formatTime(person.online_since_today)}`
            : "Online now";
    }
    if (person.never_logged_in) return "Never logged in";
    if (person.offline_since) {
        return `Offline since ${formatExact(person.offline_since)}`;
    }
    return "Offline";
};

function StatusPill({ status }) {
    return (
        <span className={`sst-pill ${status}`}>
            <i />
            {STATUS_LABEL[status] || status}
        </span>
    );
}

function StoreStatus() {
    const [stores, setStores] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [, setTick] = useState(0);

    const [storeId, setStoreId] = useState(ALL);
    const [status, setStatus] = useState(ALL);
    const [search, setSearch] = useState("");
    const [view, setView] = useState("table");
    const [expanded, setExpanded] = useState({});

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);

        try {
            const { data } = await axios.get("/api/store-presence/stores");
            setStores(Array.isArray(data?.data) ? data.data : []);
            setSummary(data?.summary || null);
            setUpdatedAt(new Date());
            setError("");
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to load store status.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Live refresh
    useEffect(() => {
        load(false);

        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") load(true);
        }, REFRESH_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") load(true);
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    // "Updated 5 s ago" ticker
    useEffect(() => {
        const t = window.setInterval(() => setTick((n) => n + 1), 1000);
        return () => window.clearInterval(t);
    }, []);

    // The dropdown shows the option value itself, so values are the
    // readable store labels; storeId is resolved from the label.
    const allLabel = `All Stores (${stores.length})`;

    const storeLabel = useCallback(
        (s, list) => {
            const dup = list.filter((x) => x.store_name === s.store_name).length > 1;
            return dup && s.store_code ? `${s.store_name} (${s.store_code})` : String(s.store_name || `Store ${s.id}`);
        },
        []
    );

    const storeOptions = useMemo(
        () => [
            { value: allLabel, label: allLabel },
            ...[...stores]
                .sort((a, b) => String(a.store_name).localeCompare(String(b.store_name)))
                .map((s) => ({
                    value: storeLabel(s, stores),
                    label: storeLabel(s, stores),
                    id: String(s.id),
                    hint: [s.store_code, s.manager_name].filter(Boolean).join(" · "),
                })),
        ],
        [stores, allLabel, storeLabel]
    );

    const selectedStoreLabel = useMemo(() => {
        if (storeId === ALL) return "";
        const opt = storeOptions.find((o) => o.id === String(storeId));
        return opt ? opt.value : "";
    }, [storeId, storeOptions, allLabel]);

    const onStoreChange = (value) => {
        const opt = storeOptions.find((o) => o.value === value);
        setStoreId(opt?.id || ALL);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return stores
            .filter((store) => {
                if (storeId !== ALL && String(store.id) !== String(storeId)) return false;
                if (status !== ALL && store.status !== status) return false;
                if (!q) return true;

                return [
                    store.store_name,
                    store.store_code,
                    store.city,
                    store.state,
                    ...(store.managers || []).map((m) => m.name),
                ]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(q));
            })
            .sort((a, b) => {
                const rank = { online: 0, offline: 1, no_manager: 2 };
                if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
                return String(a.store_name || "").localeCompare(String(b.store_name || ""));
            });
    }, [stores, storeId, status, search]);

    const singleStore = storeId !== ALL;

    const total = summary?.total ?? stores.length;
    const online = summary?.online ?? 0;
    const offline = summary?.offline ?? 0;
    const noManager = summary?.no_manager ?? 0;

    const insights = [
        { key: "all", label: "Total Stores", value: total, hint: "Click to show all", tone: "violet", icon: FaStore, onClick: () => setStatus(ALL), active: status === ALL },
        { key: "online", label: "Online", value: online, hint: "Store manager active now", tone: "green", icon: FaWifi, onClick: () => setStatus("online"), active: status === "online" },
        { key: "offline", label: "Offline", value: offline, hint: "Manager not active", tone: "red", icon: FaPowerOff, onClick: () => setStatus("offline"), active: status === "offline" },
        { key: "none", label: "No Manager", value: noManager, hint: "No store manager linked", tone: "amber", icon: FaUserSlash, onClick: () => setStatus("no_manager"), active: status === "no_manager" },
    ];

    const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    const secondsSinceUpdate = updatedAt ? Math.floor((Date.now() - updatedAt.getTime()) / 1000) : null;

    const renderStaff = (store) => (
        <ul className="sst-staff">
            {(store.managers || []).slice(1).concat(store.staff || []).map((person) => (
                <li key={person.user_id}>
                    <i className={person.is_online ? "on" : "off"} />
                    <div>
                        <strong>{person.name}</strong>
                        <span>{person.designation || person.email}</span>
                    </div>
                    <small title={person.offline_since ? formatExact(person.offline_since) : ""}>
                        {person.is_online
                            ? `Online${person.last_path ? ` · ${pageLabel(person.last_path)}` : ""}`
                            : person.never_logged_in
                                ? "Never logged in"
                                : `Offline · ${formatAgo(person.offline_seconds_ago)}`}
                    </small>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="store-status-page pp-premium">
            <PremiumHero
                icon={FaWifi}
                eyebrow="Live Monitoring"
                title="Store Status"
                badge="Admin only"
                subtitle="Each store's status comes from its own Store Manager — online now, or the exact time they went offline."
                tone="teal"
                meta={[
                    { label: "Online", value: `${online}/${total}` },
                    { label: "Updated", value: updatedAt ? updatedAt.toLocaleTimeString("en-IN") : null },
                ]}
                actions={
                    <button type="button" className="sst-refresh" onClick={() => load(true)} disabled={refreshing || loading}>
                        <FaSyncAlt className={refreshing ? "sst-spin" : ""} />
                        Refresh
                    </button>
                }
            />

            <InsightStrip items={insights} loading={loading} />

            <div className="sst-panel">
                <div className="sst-toolbar">
                    <div className="sst-store-select">
                        <SearchableSelect
                            value={selectedStoreLabel}
                            onChange={onStoreChange}
                            options={storeOptions}
                            placeholder={`${allLabel} — type to find a store`}
                            allowCustom={false}
                            icon={<FaStore />}
                            countLabel="stores"
                        />
                    </div>

                    <div className="sst-search">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search store, code, city or manager..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="sst-tabs" role="tablist">
                        {[
                            [ALL, "All"],
                            ["online", "Online"],
                            ["offline", "Offline"],
                            ["no_manager", "No Manager"],
                        ].map(([key, label]) => (
                            <button key={key} type="button" className={status === key ? "active" : ""} onClick={() => setStatus(key)}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {!singleStore && (
                        <div className="sst-view">
                            <button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")} title="Table view">
                                <FaList />
                            </button>
                            <button type="button" className={view === "cards" ? "active" : ""} onClick={() => setView("cards")} title="Card view">
                                <FaTh />
                            </button>
                        </div>
                    )}
                </div>

                <div className="sst-live">
                    <span className="sst-live-dot" />
                    <b>Live</b>
                    <span>
                        {secondsSinceUpdate === null ? "Loading…" : `Updated ${secondsSinceUpdate}s ago · refreshes every 15 s`}
                    </span>
                    <span className="sst-live-sep">•</span>
                    <span>
                        Showing <b>{filtered.length}</b> of {total} stores
                        {singleStore && (
                            <button type="button" className="sst-link" onClick={() => setStoreId(ALL)}>
                                Show all stores
                            </button>
                        )}
                    </span>
                </div>

                {error && <div className="sst-error">{error}</div>}

                {loading ? (
                    <div className="sst-loading">
                        <PremiumLoader compact title="Loading store status" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="sst-empty">
                        <FaStore />
                        <strong>No stores found</strong>
                        <span>Try another store, search or filter.</span>
                    </div>
                ) : singleStore ? (
                    /* ============ ONE STORE ============ */
                    filtered.map((store) => (
                        <div key={store.id} className={`sst-single ${store.status}`}>
                            <div className="sst-single-head">
                                <div className="sst-store-icon"><FaStore /></div>
                                <div className="sst-store-copy">
                                    <h2>{store.store_name}</h2>
                                    <span>
                                        {store.store_code && <b>{store.store_code}</b>}
                                        {(store.city || store.state) && (
                                            <>
                                                <FaMapMarkerAlt />
                                                {[store.city, store.state].filter(Boolean).join(", ")}
                                            </>
                                        )}
                                    </span>
                                </div>
                                <StatusPill status={store.status} />
                            </div>

                            <div className="sst-single-grid">
                                {(store.managers.length ? store.managers : [null]).map((m, i) => (
                                    <div key={m?.user_id || i} className="sst-manager big">
                                        <div className={`sst-avatar ${avatarTone(m?.name || store.store_name)}`}>
                                            {m ? initials(m.name) : "?"}
                                            {m && <em className={m.is_online ? "on" : "off"} />}
                                        </div>
                                        <div className="sst-manager-copy">
                                            <small><FaUserTie /> {store.manager_role || "Store Manager"}</small>
                                            <strong>{m?.name || "No manager linked to this store"}</strong>
                                            <span className={m?.is_online ? "is-on" : "is-off"}>{m ? presenceLine(m) : "Link a Store Manager in Settings → Users"}</span>
                                            {m && !m.is_online && m.offline_since && (
                                                <span className="sst-muted">{formatAgo(m.offline_seconds_ago)}</span>
                                            )}
                                            {m?.is_online && m.last_path && (
                                                <span className="sst-muted">Currently on: {pageLabel(m.last_path)}</span>
                                            )}
                                        </div>
                                        {m?.contact && (
                                            <a className="sst-call" href={`tel:${m.contact}`} title={`Call ${m.contact}`}>
                                                <FaPhoneAlt />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <h4 className="sst-sub">
                                Store staff <span>{store.staff_online} online of {store.staff_count}</span>
                            </h4>
                            {store.staff.length ? renderStaff({ ...store, managers: [] }) : <p className="sst-muted">No other staff linked to this store.</p>}
                        </div>
                    ))
                ) : view === "table" ? (
                    /* ============ TABLE ============ */
                    <div className="sst-table-wrap">
                        <table className="sst-table">
                            <thead>
                                <tr>
                                    <th>Store</th>
                                    <th>Store Manager</th>
                                    <th>Status</th>
                                    <th>Online since / Offline since</th>
                                    <th>Staff online</th>
                                    <th>Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((store) => {
                                    const m = store.manager;
                                    return (
                                        <tr key={store.id} className={store.status} onClick={() => setStoreId(String(store.id))} title="Click to open this store">
                                            <td>
                                                <strong>{store.store_name}</strong>
                                                <small>{[store.store_code, store.city].filter(Boolean).join(" · ")}</small>
                                            </td>
                                            <td>
                                                <div className="sst-cell-person">
                                                    <div className={`sst-avatar sm ${avatarTone(m?.name || store.store_name)}`}>
                                                        {m ? initials(m.name) : "?"}
                                                    </div>
                                                    <div>
                                                        <strong>{m?.name || "—"}</strong>
                                                        <small>
                                                            {store.manager_role || "No manager linked"}
                                                            {store.managers.length > 1 ? ` (+${store.managers.length - 1})` : ""}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><StatusPill status={store.status} /></td>
                                            <td>
                                                {store.status === "online" && (
                                                    <>
                                                        <strong className="is-on">{m?.online_since_today ? `Since ${formatTime(m.online_since_today)}` : "Online now"}</strong>
                                                        <small>{m?.last_path ? `On: ${pageLabel(m.last_path)}` : ""}</small>
                                                    </>
                                                )}
                                                {store.status === "offline" && (
                                                    store.never_logged_in ? (
                                                        <strong className="sst-muted">Never logged in</strong>
                                                    ) : (
                                                        <>
                                                            <strong className="is-off"><FaClock /> {formatExact(store.offline_since)}</strong>
                                                            <small>{formatAgo(store.offline_seconds_ago)}</small>
                                                        </>
                                                    )
                                                )}
                                                {store.status === "no_manager" && <span className="sst-muted">—</span>}
                                            </td>
                                            <td className="sst-nowrap">
                                                <strong>{store.staff_online}</strong>
                                                <small> / {store.staff_count}</small>
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                {m?.contact ? (
                                                    <a className="sst-call-link" href={`tel:${m.contact}`}>
                                                        <FaPhoneAlt /> {m.contact}
                                                    </a>
                                                ) : (
                                                    <span className="sst-muted">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ============ CARDS ============ */
                    <div className="sst-grid">
                        {filtered.map((store) => {
                            const isOpen = Boolean(expanded[store.id]);
                            const m = store.manager;
                            const others = store.managers.length - 1 + store.staff.length;

                            return (
                                <article key={store.id} className={`sst-card ${store.status}`}>
                                    <header className="sst-card-head">
                                        <div className="sst-store-icon"><FaStore /></div>
                                        <div className="sst-store-copy">
                                            <h3 title={store.store_name}>
                                                <button type="button" className="sst-title-btn" onClick={() => setStoreId(String(store.id))}>
                                                    {store.store_name}
                                                </button>
                                            </h3>
                                            <span>
                                                {store.store_code && <b>{store.store_code}</b>}
                                                {(store.city || store.state) && (
                                                    <>
                                                        <FaMapMarkerAlt />
                                                        {[store.city, store.state].filter(Boolean).join(", ")}
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <StatusPill status={store.status} />
                                    </header>

                                    <div className="sst-manager">
                                        <div className={`sst-avatar ${avatarTone(m?.name || store.store_name)}`}>
                                            {m ? initials(m.name) : "?"}
                                            {m && <em className={m.is_online ? "on" : "off"} />}
                                        </div>
                                        <div className="sst-manager-copy">
                                            <small><FaUserTie /> {store.manager_role || "Store Manager"}</small>
                                            <strong>{m?.name || "Not linked"}</strong>
                                            <span className={m?.is_online ? "is-on" : "is-off"}>{m ? presenceLine(m) : "No store manager in Users"}</span>
                                        </div>
                                        {m?.contact && (
                                            <a className="sst-call" href={`tel:${m.contact}`} title={`Call ${m.contact}`}>
                                                <FaPhoneAlt />
                                            </a>
                                        )}
                                    </div>

                                    {others > 0 && (
                                        <>
                                            <button type="button" className="sst-toggle" onClick={() => toggle(store.id)}>
                                                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                                                {isOpen ? "Hide staff" : `Staff (${store.staff_online} online of ${others})`}
                                            </button>
                                            {isOpen && renderStaff(store)}
                                        </>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}

                <p className="sst-note">
                    A store is <b>Online</b> only when <b>its own Store Manager</b> (or Assistant Store Manager when there is
                    no Store Manager) has Mi Arcus open. Head office, ASM and regional users linked to many stores are not counted.
                    Offline time = the moment they logged out / closed the site, or their last activity.
                </p>
            </div>
        </div>
    );
}

export default StoreStatus;

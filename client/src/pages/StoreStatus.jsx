import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../axiosConfig.js";

import {
    FaStore,
    FaWifi,
    FaPowerOff,
    FaUsers,
    FaSearch,
    FaSyncAlt,
    FaUserTie,
    FaPhoneAlt,
    FaChevronDown,
    FaChevronUp,
    FaMapMarkerAlt,
} from "react-icons/fa";

import PremiumHero from "../components/premium/PremiumHero";
import InsightStrip from "../components/premium/InsightStrip";
import PremiumLoader from "../components/premium/PremiumLoader";
import { initials, avatarTone } from "../utils/premiumFormat";

import "../styles/premium/PagePremium.css";
import "../styles/pages/StoreStatus.css";

// ======================================================
// STORE STATUS (ADMIN ONLY)
// ------------------------------------------------------
// Shows which stores currently have somebody using the
// Mi Arcus website (ONLINE) and which do not (OFFLINE),
// together with the store manager's name.
// Auto-refreshes every 30 seconds.
// ======================================================

const REFRESH_MS = 30 * 1000;

const formatAgo = (seconds) => {
    if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
        return "Never";
    }

    const s = Math.max(0, Number(seconds));

    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) {
        const h = Math.floor(s / 3600);
        return `${h} hr${h > 1 ? "s" : ""} ago`;
    }

    const d = Math.floor(s / 86400);
    return `${d} day${d > 1 ? "s" : ""} ago`;
};

const pageLabel = (path) => {
    if (!path) return "";
    const clean = String(path).replace(/^\/+/, "").split("/")[0] || "dashboard";
    return clean.replace(/-/g, " ");
};

function StoreStatus() {
    const [stores, setStores] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
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

    useEffect(() => {
        load(false);

        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") load(true);
        }, REFRESH_MS);

        return () => window.clearInterval(timer);
    }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return stores
            .filter((store) => {
                if (filter === "online" && !store.is_online) return false;
                if (filter === "offline" && store.is_online) return false;

                if (!q) return true;

                return [
                    store.store_name,
                    store.store_code,
                    store.city,
                    store.state,
                    store.manager_name,
                    ...(store.staff || []).map((p) => p.name),
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(q));
            })
            .sort((a, b) => {
                if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
                return String(a.store_name || "").localeCompare(String(b.store_name || ""));
            });
    }, [stores, search, filter]);

    const total = summary?.total ?? stores.length;
    const online = summary?.online ?? stores.filter((s) => s.is_online).length;
    const offline = summary?.offline ?? total - online;

    const insights = [
        {
            key: "all",
            label: "Total Stores",
            value: total,
            hint: "All stores in the system",
            tone: "violet",
            icon: FaStore,
            onClick: () => setFilter("all"),
            active: filter === "all",
        },
        {
            key: "online",
            label: "Online",
            value: online,
            hint: "Someone is using Mi Arcus now",
            tone: "green",
            icon: FaWifi,
            onClick: () => setFilter("online"),
            active: filter === "online",
        },
        {
            key: "offline",
            label: "Offline",
            value: offline,
            hint: "No active user right now",
            tone: "red",
            icon: FaPowerOff,
            onClick: () => setFilter("offline"),
            active: filter === "offline",
        },
        {
            key: "users",
            label: "Users Online",
            value: summary?.users_online ?? 0,
            hint: "Across all stores",
            tone: "blue",
            icon: FaUsers,
        },
    ];

    const toggle = (id) =>
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="store-status-page pp-premium">
            <PremiumHero
                icon={FaWifi}
                eyebrow="Live Monitoring"
                title="Store Status"
                badge="Admin only"
                subtitle="Which stores are using the Mi Arcus portal right now — with store manager and active staff."
                tone="teal"
                meta={[
                    { label: "Online", value: `${online}/${total}` },
                    { label: "Updated", value: updatedAt ? updatedAt.toLocaleTimeString() : null },
                ]}
                actions={
                    <button
                        type="button"
                        className="ss-refresh"
                        onClick={() => load(true)}
                        disabled={refreshing || loading}
                    >
                        <FaSyncAlt className={refreshing ? "ss-spin" : ""} />
                        Refresh
                    </button>
                }
            />

            <InsightStrip items={insights} loading={loading} />

            <div className="ss-panel">
                <div className="ss-toolbar">
                    <div className="ss-search">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search store, code, city or manager..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="ss-tabs" role="tablist">
                        {[
                            ["all", "All"],
                            ["online", "Online"],
                            ["offline", "Offline"],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                className={filter === key ? "active" : ""}
                                onClick={() => setFilter(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <p className="ss-note">
                    A store is <b>Online</b> when its manager or any staff member assigned to it
                    has the website open (checked every ~45 seconds). Auto-refreshes every 30 seconds.
                </p>

                {error && <div className="ss-error">{error}</div>}

                {loading ? (
                    <div className="ss-loading">
                        <PremiumLoader compact title="Loading store status" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="ss-empty">
                        <FaStore />
                        <strong>No stores found</strong>
                        <span>Try another search or filter.</span>
                    </div>
                ) : (
                    <div className="ss-grid">
                        {filtered.map((store) => {
                            const isOpen = Boolean(expanded[store.id]);
                            const manager = store.manager_user;

                            return (
                                <article
                                    key={store.id}
                                    className={`ss-card ${store.is_online ? "is-online" : "is-offline"}`}
                                >
                                    <header className="ss-card-head">
                                        <div className="ss-store-icon">
                                            <FaStore />
                                        </div>

                                        <div className="ss-store-copy">
                                            <h3 title={store.store_name}>{store.store_name}</h3>
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

                                        <span className={`ss-pill ${store.is_online ? "online" : "offline"}`}>
                                            <i />
                                            {store.is_online ? "Online" : "Offline"}
                                        </span>
                                    </header>

                                    <div className="ss-manager">
                                        <div
                                            className={`ss-avatar ${avatarTone(store.manager_name || store.store_name)}`}
                                        >
                                            {initials(store.manager_name || "?")}
                                            {manager && (
                                                <em className={manager.is_online ? "on" : "off"} />
                                            )}
                                        </div>

                                        <div className="ss-manager-copy">
                                            <small><FaUserTie /> Store Manager</small>
                                            <strong>{store.manager_name || "Not assigned"}</strong>
                                            <span>
                                                {manager
                                                    ? manager.is_online
                                                        ? "Online now"
                                                        : `Last seen: ${formatAgo(manager.seconds_ago)}`
                                                    : store.manager_name
                                                        ? "No portal login linked"
                                                        : ""}
                                            </span>
                                        </div>

                                        {(manager?.contact || store.store_contact) && (
                                            <a
                                                className="ss-call"
                                                href={`tel:${manager?.contact || store.store_contact}`}
                                                title="Call"
                                            >
                                                <FaPhoneAlt />
                                            </a>
                                        )}
                                    </div>

                                    <div className="ss-meta">
                                        <div>
                                            <small>Online users</small>
                                            <strong>
                                                {store.online_count}
                                                <span> / {store.staff_count}</span>
                                            </strong>
                                        </div>
                                        <div>
                                            <small>Last activity</small>
                                            <strong>{formatAgo(store.last_active_seconds_ago)}</strong>
                                        </div>
                                        <div>
                                            <small>Last active by</small>
                                            <strong title={store.last_active_by || ""}>
                                                {store.last_active_by || "—"}
                                            </strong>
                                        </div>
                                    </div>

                                    {store.staff?.length > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                className="ss-toggle"
                                                onClick={() => toggle(store.id)}
                                            >
                                                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                                                {isOpen ? "Hide staff" : `View staff (${store.staff.length})`}
                                            </button>

                                            {isOpen && (
                                                <ul className="ss-staff">
                                                    {store.staff.map((person) => (
                                                        <li key={person.user_id}>
                                                            <i className={person.is_online ? "on" : "off"} />
                                                            <div>
                                                                <strong>
                                                                    {person.name}
                                                                    {person.role === "Manager" && (
                                                                        <em>Manager</em>
                                                                    )}
                                                                </strong>
                                                                <span>
                                                                    {person.designation || person.email}
                                                                </span>
                                                            </div>
                                                            <small>
                                                                {person.is_online
                                                                    ? `Online${person.last_path ? ` · ${pageLabel(person.last_path)}` : ""}`
                                                                    : formatAgo(person.seconds_ago)}
                                                            </small>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default StoreStatus;

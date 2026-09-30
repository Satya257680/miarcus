import PremiumLoader from "../premium/PremiumLoader";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "../../axiosConfig";
import {
    FaBell,
    FaCheckDouble,
    FaSyncAlt,
    FaTrashAlt,
    FaTimes,
    FaChevronRight,
    FaPhoneAlt,
    FaVideo,
    FaCommentDots,
    FaClipboardCheck,
    FaBolt,
    FaCalendarCheck,
    FaImages,
    FaBullhorn,
    FaReceipt,
    FaWallet,
    FaStore,
    FaUsers,
    FaGraduationCap,
    FaRoute,
    FaBoxes,
    FaCogs,
    FaHeadset,
    FaMoneyBillWave,
    FaInfoCircle,
} from "react-icons/fa";
import "../../styles/NotificationCenter.css";

// ==========================================================
// NOTIFICATION CENTER (premium)
// ----------------------------------------------------------
// • Desktop: dropdown under the bell
// • Phones: full-width sheet under the app header (the old
//   panel was cut off on the left side of the screen)
// • Tabs: All · Unread · Calls & Chat
// • Grouped by Today / Yesterday / Earlier with module icons
// • Live: new notifications arrive over SSE and show a toast
//
// Who receives what is decided on the server
// (server/services/notificationAudience.js).
// ==========================================================

const idOf = (n) => n?.id ?? n?.notification_id;
const isRead = (n) =>
    Number(n?.notification_is_read ?? n?.is_read ?? (n?.read_at ? 1 : 0)) === 1;

// Employee Location is intentionally silent, and generic System events are
// not user-facing notifications.
const isHiddenNotification = (n) => {
    const moduleName = String(n?.module_name ?? n?.module ?? "").trim().toLowerCase();
    const title = String(n?.title ?? "").trim().toLowerCase();
    return (
        moduleName === "employee location" ||
        moduleName === "system" ||
        title === "system created" ||
        title === "system updated"
    );
};

const MOBILE_QUERY = "(max-width: 768px)";
const isMobileNow = () =>
    typeof window !== "undefined" && window.matchMedia?.(MOBILE_QUERY).matches;

// ----------------------------------------------------------
// Module → icon + colour
// ----------------------------------------------------------
const MODULE_STYLES = [
    [/call/, FaPhoneAlt, "green"],
    [/chat|message/, FaCommentDots, "blue"],
    [/checklist|question/, FaClipboardCheck, "violet"],
    [/action/, FaBolt, "amber"],
    [/attendance/, FaCalendarCheck, "teal"],
    [/gallery|photo|attachment/, FaImages, "pink"],
    [/announcement/, FaBullhorn, "orange"],
    [/expense/, FaReceipt, "rose"],
    [/petty/, FaWallet, "rose"],
    [/collection|billing/, FaMoneyBillWave, "green"],
    [/store|nso|opening/, FaStore, "indigo"],
    [/user|department|designation|reports to/, FaUsers, "slate"],
    [/quiz|training/, FaGraduationCap, "indigo"],
    [/travel|sales|visit/, FaRoute, "teal"],
    [/asset|inventory/, FaBoxes, "amber"],
    [/help/, FaHeadset, "blue"],
    [/setting|type/, FaCogs, "slate"],
];

const styleOf = (item) => {
    const type = String(item?.type || "").toLowerCase();
    const action = String(item?.action_name || "").toLowerCase();
    const key = `${item?.module_name || ""} ${item?.title || ""}`.toLowerCase();

    if (type === "call" || action === "call") {
        return { Icon: /video/i.test(item?.message || "") ? FaVideo : FaPhoneAlt, tone: "green", call: true };
    }
    for (const [re, Icon, tone] of MODULE_STYLES) {
        if (re.test(key)) return { Icon, tone, call: false };
    }
    if (type === "warning") return { Icon: FaInfoCircle, tone: "amber", call: false };
    if (type === "success") return { Icon: FaCheckDouble, tone: "green", call: false };
    return { Icon: FaBell, tone: "violet", call: false };
};

const moduleLabel = (item) => {
    const raw = String(item?.module_name || "").trim();
    if (!raw) return "";
    return raw
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

const isChatItem = (item) => {
    const key = `${item?.module_name || ""} ${item?.type || ""} ${item?.action_name || ""}`.toLowerCase();
    return /chat|call|message/.test(key);
};

// ----------------------------------------------------------
// Time helpers
// ----------------------------------------------------------
const toDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const relativeTime = (value) => {
    const date = toDate(value);
    if (!date) return "";
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return "Just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24 && date.getDate() === new Date().getDate()) return `${hours}h ago`;
    return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const dayGroup = (value) => {
    const date = toDate(value);
    if (!date) return "Earlier";
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const t = date.getTime();
    if (t >= start) return "Today";
    if (t >= start - 86400000) return "Yesterday";
    return "Earlier";
};

const TABS = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "chat", label: "Calls & Chat" },
];

export default function NotificationCenter({ className = "", onNavigate, refreshMs = 30000 }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState("all");
    const [confirmClear, setConfirmClear] = useState(false);
    const [toast, setToast] = useState(null);
    const [mobile, setMobile] = useState(isMobileNow);
    const [, setClock] = useState(0);
    const ref = useRef(null);
    const panelRef = useRef(null);
    const toastTimer = useRef(null);

    const unread = useMemo(() => items.filter((row) => !isRead(row)).length, [items]);

    const load = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await axios.get("/api/notification-center");
            const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
            setItems(rows.filter((row) => !isHiddenNotification(row)));
        } catch (error) {
            console.error("Notification center load failed:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // phone / desktop layout
    useEffect(() => {
        if (typeof window.matchMedia !== "function") return undefined;
        const media = window.matchMedia(MOBILE_QUERY);
        const onChange = () => setMobile(media.matches);
        if (media.addEventListener) media.addEventListener("change", onChange);
        else media.addListener(onChange);
        return () => {
            if (media.removeEventListener) media.removeEventListener("change", onChange);
            else media.removeListener(onChange);
        };
    }, []);

    // keep "2m ago" fresh while open
    useEffect(() => {
        if (!open) return undefined;
        const timer = window.setInterval(() => setClock((c) => c + 1), 30000);
        return () => window.clearInterval(timer);
    }, [open]);

    useEffect(() => {
        load(true);

        const token = localStorage.getItem("token");
        // axios baseURL may be "/api" (IIS) — keep exactly one "/api".
        const rawBase = String(axios.defaults.baseURL || "").replace(/\/+$/, "");
        const apiOrigin = rawBase.replace(/\/api$/, "");

        let stream = null;
        let reconnectTimer = null;

        const connect = () => {
            if (!token || typeof window.EventSource === "undefined") return;
            try {
                stream = new EventSource(`${apiOrigin}/api/notifications/stream?token=${encodeURIComponent(token)}`);
                stream.addEventListener("notification", (event) => {
                    try {
                        const incoming = JSON.parse(event.data || "{}");
                        if (!incoming?.id || isHiddenNotification(incoming)) return;
                        setItems((current) => [incoming, ...current.filter((item) => idOf(item) !== idOf(incoming))].slice(0, 100));
                        setToast(incoming);
                        if (toastTimer.current) window.clearTimeout(toastTimer.current);
                        toastTimer.current = window.setTimeout(
                            () => setToast(null),
                            styleOf(incoming).call ? 15000 : 5000
                        );
                    } catch (error) {
                        console.error("Notification stream payload failed:", error);
                    }
                });
                stream.onerror = () => {
                    stream?.close();
                    stream = null;
                    if (!reconnectTimer) {
                        reconnectTimer = window.setTimeout(() => {
                            reconnectTimer = null;
                            connect();
                        }, 5000);
                    }
                };
            } catch (error) {
                console.error("Notification stream connection failed:", error);
            }
        };

        connect();
        const timer = window.setInterval(() => load(true), Math.max(10000, refreshMs));

        return () => {
            window.clearInterval(timer);
            if (reconnectTimer) window.clearTimeout(reconnectTimer);
            if (toastTimer.current) window.clearTimeout(toastTimer.current);
            stream?.close();
        };
    }, [refreshMs]);

    // outside click / Escape
    useEffect(() => {
        if (!open) return undefined;
        const outside = (event) => {
            if (ref.current?.contains(event.target)) return;
            if (panelRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        const onKey = (event) => event.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", outside);
        document.addEventListener("touchstart", outside, { passive: true });
        document.addEventListener("keydown", onKey);
        if (mobile) document.body.classList.add("nc-sheet-open");
        return () => {
            document.removeEventListener("mousedown", outside);
            document.removeEventListener("touchstart", outside);
            document.removeEventListener("keydown", onKey);
            document.body.classList.remove("nc-sheet-open");
        };
    }, [open, mobile]);

    const sorted = useMemo(
        () => items.slice().sort(
            (a, b) =>
                new Date(b?.created_at || 0).getTime() -
                new Date(a?.created_at || 0).getTime()
        ).slice(0, 100),
        [items]
    );

    const filtered = useMemo(() => {
        if (tab === "unread") return sorted.filter((item) => !isRead(item));
        if (tab === "chat") return sorted.filter(isChatItem);
        return sorted;
    }, [sorted, tab]);

    const groups = useMemo(() => {
        const map = new Map();
        filtered.forEach((item) => {
            const key = dayGroup(item?.created_at);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return [...map.entries()];
    }, [filtered]);

    const chatUnread = useMemo(() => sorted.filter((item) => isChatItem(item) && !isRead(item)).length, [sorted]);

    const markRead = async (item) => {
        const id = idOf(item);
        if (!id || isRead(item)) return;
        setItems((current) => current.map((n) =>
            idOf(n) === id
                ? { ...n, is_read: 1, notification_is_read: 1, read_at: new Date().toISOString() }
                : n
        ));
        try {
            await axios.patch(`/api/notification-center/${id}/read`);
        } catch (error) {
            console.error("Mark notification read failed:", error);
        }
    };

    const clearOne = async (item) => {
        const id = idOf(item);
        if (!id || busy) return;
        setItems((current) => current.filter((n) => idOf(n) !== id));
        try {
            await axios.delete(`/api/notification-center/${id}`);
        } catch (error) {
            console.error("Clear notification failed:", error);
            load(true);
        }
    };

    const clearAll = async () => {
        if (!items.length || busy) return;
        setBusy(true);
        try {
            await axios.delete("/api/notification-center");
            setItems([]);
        } catch (error) {
            console.error("Clear all notifications failed:", error);
        } finally {
            setBusy(false);
            setConfirmClear(false);
        }
    };

    const markAllRead = async () => {
        if (!unread || busy) return;
        setBusy(true);
        try {
            await axios.patch("/api/notification-center/read-all");
            setItems((current) => current.map((n) => ({
                ...n, is_read: 1, notification_is_read: 1,
                read_at: n.read_at || new Date().toISOString()
            })));
        } catch (error) {
            console.error("Mark all notifications read failed:", error);
        } finally {
            setBusy(false);
        }
    };

    const openItem = async (item) => {
        await markRead(item);
        setToast(null);
        if (!item?.link) return;
        setOpen(false);
        if (onNavigate) onNavigate(item.link, item);
        else window.location.href = item.link;
    };

    const toggle = () => {
        setOpen((value) => !value);
        setConfirmClear(false);
        if (!open) load(true);
    };

    const panel = open && (
        <div
            ref={panelRef}
            className={`nc-panel ${mobile ? "nc-panel--sheet" : ""}`}
            role="dialog"
            aria-label="Notifications"
        >
            <div className="nc-head">
                <div className="nc-head-title">
                    <span className="nc-head-icon"><FaBell /></span>
                    <div>
                        <h3>Notifications</h3>
                        <span>{unread ? `${unread} unread` : "You're all caught up"}</span>
                    </div>
                </div>
                <div className="nc-head-actions">
                    <button
                        type="button"
                        className="nc-icon-btn"
                        title="Refresh"
                        disabled={loading || busy}
                        onClick={() => load(false)}
                    >
                        <FaSyncAlt className={loading ? "nc-spin" : ""} />
                    </button>
                    <button type="button" className="nc-icon-btn" title="Close" onClick={() => setOpen(false)}>
                        <FaTimes />
                    </button>
                </div>
            </div>

            <div className="nc-tabs" role="tablist">
                {TABS.map((t) => {
                    const count = t.key === "unread" ? unread : t.key === "chat" ? chatUnread : sorted.length;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.key}
                            className={`nc-tab ${tab === t.key ? "is-active" : ""}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label}
                            {count > 0 && <span className="nc-tab-count">{count > 99 ? "99+" : count}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="nc-toolbar">
                {confirmClear ? (
                    <div className="nc-confirm">
                        <span>Clear all notifications?</span>
                        <button type="button" className="nc-link" onClick={() => setConfirmClear(false)}>Cancel</button>
                        <button type="button" className="nc-link nc-link--danger" disabled={busy} onClick={clearAll}>
                            Yes, clear
                        </button>
                    </div>
                ) : (
                    <>
                        <button type="button" className="nc-link" disabled={!unread || busy} onClick={markAllRead}>
                            <FaCheckDouble /> Mark all read
                        </button>
                        <button
                            type="button"
                            className="nc-link nc-link--danger"
                            disabled={!items.length || busy}
                            onClick={() => setConfirmClear(true)}
                        >
                            <FaTrashAlt /> Clear all
                        </button>
                    </>
                )}
            </div>

            <div className="nc-list">
                {loading && !items.length && (
                    <div className="nc-empty"><PremiumLoader compact title="Loading notifications" /></div>
                )}

                {!loading && !filtered.length && (
                    <div className="nc-empty">
                        <span className="nc-empty-icon"><FaBell /></span>
                        <strong>{tab === "unread" ? "No unread notifications" : tab === "chat" ? "No calls or messages" : "No notifications"}</strong>
                        <span>You're all caught up.</span>
                    </div>
                )}

                {groups.map(([label, rows]) => (
                    <section key={label} className="nc-group">
                        <h4 className="nc-group-title">{label}</h4>
                        {rows.map((item) => {
                            const id = idOf(item);
                            const unreadItem = !isRead(item);
                            const { Icon, tone, call } = styleOf(item);
                            const module = moduleLabel(item);
                            return (
                                <article
                                    key={id}
                                    className={`nc-item tone-${tone} ${unreadItem ? "is-unread" : ""} ${call ? "is-call" : ""}`}
                                >
                                    <button type="button" className="nc-item-main" onClick={() => openItem(item)}>
                                        <span className="nc-item-icon"><Icon /></span>
                                        <span className="nc-item-body">
                                            <span className="nc-item-top">
                                                <strong>{item?.title || "Notification"}</strong>
                                                {unreadItem && <i className="nc-dot" aria-label="Unread" />}
                                            </span>
                                            {item?.message && <span className="nc-item-msg">{item.message}</span>}
                                            <span className="nc-item-meta">
                                                {module && <span className="nc-chip">{module}</span>}
                                                <span>{relativeTime(item?.created_at)}</span>
                                            </span>
                                        </span>
                                        {item?.link && <FaChevronRight className="nc-item-go" />}
                                    </button>
                                    <button
                                        type="button"
                                        className="nc-item-del"
                                        title="Remove"
                                        aria-label="Remove notification"
                                        onClick={() => clearOne(item)}
                                    >
                                        <FaTrashAlt />
                                    </button>
                                </article>
                            );
                        })}
                    </section>
                ))}
            </div>

            <div className="nc-foot">
                {sorted.length
                    ? `Showing ${filtered.length} of ${sorted.length} notification${sorted.length > 1 ? "s" : ""}`
                    : "Only notifications for your stores and modules appear here"}
            </div>
        </div>
    );

    const toastNode = toast && !open && (() => {
        const { Icon, tone, call } = styleOf(toast);
        return (
            <div className={`nc-toast tone-${tone} ${call ? "is-call" : ""}`} role="status">
                <button type="button" className="nc-toast-main" onClick={() => openItem(toast)}>
                    <span className="nc-item-icon"><Icon /></span>
                    <span className="nc-item-body">
                        <strong>{toast.title || "New notification"}</strong>
                        {toast.message && <span className="nc-item-msg">{toast.message}</span>}
                    </span>
                    {call && <span className="nc-toast-cta">Open</span>}
                </button>
                <button type="button" className="nc-toast-x" aria-label="Dismiss" onClick={() => setToast(null)}>
                    <FaTimes />
                </button>
            </div>
        );
    })();

    return (
        <div ref={ref} className={`notification-center ${className}`}>
            <button
                type="button"
                className={`notification-center-trigger ${open ? "is-open" : ""} ${unread ? "has-unread" : ""}`}
                onClick={toggle}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                aria-expanded={open}
            >
                <FaBell />
                {unread > 0 && (
                    <span className="notification-center-count">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {mobile && open
                ? createPortal(
                    <>
                        <div className="nc-backdrop" onClick={() => setOpen(false)} />
                        {panel}
                    </>,
                    document.body
                )
                : panel}

            {toastNode && createPortal(toastNode, document.body)}
        </div>
    );
}

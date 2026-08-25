import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../../axiosConfig";
import { FaBell, FaCheck, FaExternalLinkAlt, FaSyncAlt, FaTrash } from "react-icons/fa";
import "../../styles/NotificationCenter.css";

const idOf = (n) => n?.id ?? n?.notification_id;
const isRead = (n) =>
    Number(n?.notification_is_read ?? n?.is_read ?? (n?.read_at ? 1 : 0)) === 1;

const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
};

export default function NotificationCenter({ className = "", onNavigate, refreshMs = 30000 }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);

    const load = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await axios.get("/api/notification-center");
            const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
            setItems(rows);
            setUnread(Number(response?.data?.unread || 0));
        } catch (error) {
            console.error("Notification center load failed:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        load(true);
        const timer = window.setInterval(() => load(true), Math.max(10000, refreshMs));
        return () => window.clearInterval(timer);
    }, [refreshMs]);

    useEffect(() => {
        const outside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", outside);
        return () => document.removeEventListener("mousedown", outside);
    }, []);

    const visible = useMemo(
        () => items.slice().sort(
            (a, b) =>
                new Date(b?.created_at || 0).getTime() -
                new Date(a?.created_at || 0).getTime()
        ).slice(0, 100),
        [items]
    );

    const markRead = async (item) => {
        const id = idOf(item);
        if (!id || isRead(item) || busy) return;
        setBusy(true);
        try {
            await axios.patch(`/api/notification-center/${id}/read`);
            setItems((current) => current.map((n) =>
                idOf(n) === id
                    ? { ...n, is_read: 1, notification_is_read: 1, read_at: new Date().toISOString() }
                    : n
            ));
            setUnread((value) => Math.max(0, value - 1));
        } catch (error) {
            console.error("Mark notification read failed:", error);
        } finally {
            setBusy(false);
        }
    };

    const clearOne = async (item) => {
        const id = idOf(item);
        if (!id || busy) return;
        setBusy(true);
        try {
            await axios.delete(`/api/notification-center/${id}`);
            setItems((current) => current.filter((n) => idOf(n) !== id));
            if (!isRead(item)) setUnread((value) => Math.max(0, value - 1));
        } catch (error) {
            console.error("Clear notification failed:", error);
        } finally {
            setBusy(false);
        }
    };

    const clearAll = async () => {
        if (!items.length || busy) return;
        if (!window.confirm("Clear all notifications for your account?")) return;
        setBusy(true);
        try {
            await axios.delete("/api/notification-center");
            setItems([]);
            setUnread(0);
        } catch (error) {
            console.error("Clear all notifications failed:", error);
        } finally {
            setBusy(false);
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
            setUnread(0);
        } catch (error) {
            console.error("Mark all notifications read failed:", error);
        } finally {
            setBusy(false);
        }
    };

    const openItem = async (item) => {
        await markRead(item);
        if (!item?.link) return;
        setOpen(false);
        if (onNavigate) onNavigate(item.link, item);
        else window.location.href = item.link;
    };

    return (
        <div ref={ref} className={`notification-center ${className}`}>
            <button
                type="button"
                className="notification-center-trigger"
                onClick={() => {
                    setOpen((value) => !value);
                    if (!open) load(true);
                }}
                aria-label="Notifications"
                aria-expanded={open}
            >
                <FaBell />
                {unread > 0 && (
                    <span className="notification-center-count">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="notification-center-panel">
                    <div className="notification-center-header">
                        <div>
                            <h3>Notifications</h3>
                            <span>{unread} unread</span>
                        </div>
                        <button
                            type="button"
                            className="notification-refresh-btn"
                            title="Refresh"
                            disabled={loading || busy}
                            onClick={() => load(false)}
                        >
                            <FaSyncAlt className={loading ? "notification-spin" : ""} />
                        </button>
                    </div>

                    <div className="notification-center-actions">
                        <button type="button" disabled={!unread || busy} onClick={markAllRead}>
                            <FaCheck /> Mark all read
                        </button>
                        <button
                            type="button"
                            className="notification-clear-all"
                            disabled={!items.length || busy}
                            onClick={clearAll}
                        >
                            <FaTrash /> Clear all
                        </button>
                    </div>

                    <div className="notification-center-list">
                        {loading && <div className="notification-center-empty">Loading notifications...</div>}
                        {!loading && !visible.length && (
                            <div className="notification-center-empty">
                                <FaBell />
                                <strong>No notifications</strong>
                                <span>You are all caught up.</span>
                            </div>
                        )}

                        {!loading && visible.map((item) => {
                            const id = idOf(item);
                            const unreadItem = !isRead(item);

                            return (
                                <div key={id} className={`notification-center-item ${unreadItem ? "is-unread" : ""}`}>
                                    <button
                                        type="button"
                                        className="notification-center-content"
                                        onClick={() => openItem(item)}
                                    >
                                        <span className="notification-center-item-dot" />
                                        <span>
                                            <strong>{item?.title || "Notification"}</strong>
                                            <p>{item?.message || ""}</p>
                                            <small>{formatTime(item?.created_at)}</small>
                                        </span>
                                    </button>

                                    <div className="notification-center-item-actions">
                                        {item?.link && (
                                            <button type="button" title="Open" onClick={() => openItem(item)}>
                                                <FaExternalLinkAlt />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            title="Clear"
                                            disabled={busy}
                                            onClick={() => clearOne(item)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="notification-center-footer">
                        {visible.length ? `Showing ${visible.length} notifications` : "No notifications"}
                    </div>
                </div>
            )}
        </div>
    );
}

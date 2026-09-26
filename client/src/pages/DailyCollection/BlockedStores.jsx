import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../axiosConfig.js";
import {
    FaLock,
    FaUnlock,
    FaSearch,
    FaSyncAlt,
    FaPhoneAlt,
    FaEnvelope,
    FaStore,
    FaHistory,
    FaUserLock,
    FaCheckCircle,
    FaInfoCircle,
    FaCog,
} from "react-icons/fa";
import PremiumLoader from "../../components/premium/PremiumLoader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import "../../styles/pages/DailyCollectionPremium.css";

// ======================================================
// DAILY COLLECTION — BLOCKED STORES
//
// Every store whose manager did not submit within 12 hours
// of the midnight deadline is blocked automatically and is
// listed here. The manager requests access (email / call);
// only an administrator can unblock, and the manager is
// emailed "Your Daily Collection module is now ready for
// submission" the moment access is restored.
// ======================================================

const formatDay = (value) => {
    if (!value) return "-";
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = match ? new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const splitList = (value) =>
    String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

export default function BlockedStores() {
    const [blocked, setBlocked] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("blocked");
    const [target, setTarget] = useState(null);
    const [unblocking, setUnblocking] = useState(false);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const { data } = await axios.get("/api/daily-collection/blocked-stores");
            setBlocked(Array.isArray(data?.blocked) ? data.blocked : []);
            setHistory(Array.isArray(data?.history) ? data.history : []);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load blocked stores.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(() => load({ silent: true }), 60000);
        return () => clearInterval(timer);
    }, [load]);

    const rows = tab === "blocked" ? blocked : history;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) =>
            [row.store_name, row.store_code, row.city, row.manager_names, row.manager_emails, row.manager_phones, row.reason, row.report_date]
                .some((value) => String(value || "").toLowerCase().includes(q))
        );
    }, [rows, search]);

    const blockedUsers = blocked.reduce((sum, row) => sum + Number(row.blocked_user_count || 0), 0);
    const restoredThisMonth = history.filter((row) => {
        const date = new Date(row.unblocked_at);
        return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() < 30 * 86400000;
    }).length;

    const confirmUnblock = async () => {
        if (!target) return;
        setUnblocking(true);
        setError("");
        try {
            const { data } = await axios.post(`/api/daily-collection/blocked/${target.control_id}/unblock`);
            setNotice(
                data?.message ||
                    `Daily Collection access restored for ${target.store_name}.`
            );
            setTarget(null);
            await load({ silent: true });
        } catch (err) {
            setError(err.response?.data?.message || "Unable to restore Daily Collection access.");
        } finally {
            setUnblocking(false);
        }
    };

    return (
        <div className="dcb-page">
            <section className="dcb-hero">
                <div className="dcb-hero-text">
                    <span className="dcb-eyebrow"><FaLock /> DAILY COLLECTION MODULE</span>
                    <h1>Blocked Stores</h1>
                    <p>
                        Stores that did not submit their Daily Collection within 12 hours are blocked automatically.
                        When the manager requests access by email or call, restore it here — the manager is emailed
                        instantly that the module is ready for submission.
                    </p>
                </div>
                <div className="dcb-hero-actions">
                    <button type="button" className="dcb-btn ghost" onClick={() => load({ silent: true })} disabled={refreshing || loading}>
                        <FaSyncAlt className={refreshing ? "dcb-spin" : ""} /> Refresh
                    </button>
                    <Link to="/settings/daily-collection-email" className="dcb-btn light">
                        <FaCog /> Email Routing
                    </Link>
                </div>
            </section>

            <section className="dcb-kpis">
                <div className="dcb-kpi red">
                    <span><FaStore /></span>
                    <div><small>Blocked Stores</small><b>{blocked.length}</b><em>Waiting for an administrator</em></div>
                </div>
                <div className="dcb-kpi amber">
                    <span><FaUserLock /></span>
                    <div><small>Blocked Managers</small><b>{blockedUsers}</b><em>Linked store manager accounts</em></div>
                </div>
                <div className="dcb-kpi green">
                    <span><FaCheckCircle /></span>
                    <div><small>Restored (30 days)</small><b>{restoredThisMonth}</b><em>Unblocked by administrators</em></div>
                </div>
                <div className="dcb-kpi violet">
                    <span><FaInfoCircle /></span>
                    <div><small>Auto-block Rule</small><b>12 hrs</b><em>After the 12:00 AM deadline</em></div>
                </div>
            </section>

            {notice && (
                <div className="dcb-alert success" role="status">
                    <FaCheckCircle /> {notice}
                    <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button>
                </div>
            )}
            {error && <div className="dcb-alert error">{error}</div>}

            <section className="dcb-card">
                <div className="dcb-toolbar">
                    <div className="dcb-tabs">
                        <button type="button" className={tab === "blocked" ? "active" : ""} onClick={() => setTab("blocked")}>
                            <FaLock /> Blocked <span>{blocked.length}</span>
                        </button>
                        <button type="button" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
                            <FaHistory /> Restored History <span>{history.length}</span>
                        </button>
                    </div>
                    <div className="dcb-search">
                        <FaSearch />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search store, code, manager, phone..." />
                    </div>
                </div>

                {loading ? (
                    <PremiumLoader compact title="Loading Blocked Stores" />
                ) : filtered.length === 0 ? (
                    <div className="dcb-empty">
                        <span>{tab === "blocked" ? <FaUnlock /> : <FaHistory />}</span>
                        <b>{tab === "blocked" ? "No blocked stores" : "No restored stores yet"}</b>
                        <small>
                            {tab === "blocked"
                                ? "Every store can submit its Daily Collection right now."
                                : "Stores you unblock will be listed here."}
                        </small>
                    </div>
                ) : (
                    <div className="dcb-table-wrap">
                        <table className="dcb-table">
                            <thead>
                                {tab === "blocked" ? (
                                    <tr>
                                        <th>#</th>
                                        <th>Store</th>
                                        <th>Collection Date</th>
                                        <th>Blocked At</th>
                                        <th>Reason</th>
                                        <th>Store Manager</th>
                                        <th>Contact</th>
                                        <th>Action</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th>#</th>
                                        <th>Store</th>
                                        <th>Collection Date</th>
                                        <th>Blocked At</th>
                                        <th>Restored At</th>
                                        <th>Restored By</th>
                                        <th>Store Manager</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {filtered.map((row, index) => {
                                    const phones = splitList(row.manager_phones);
                                    const emails = splitList(row.manager_emails);
                                    return tab === "blocked" ? (
                                        <tr key={`${row.store_id}-${row.report_date}`}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <div className="dcb-store">
                                                    <span className="dcb-store-icon"><FaStore /></span>
                                                    <div>
                                                        <b>{row.store_name}</b>
                                                        <small>{[row.store_code, row.city].filter(Boolean).join(" · ") || "-"}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="dcb-date">{formatDay(row.report_date)}</span></td>
                                            <td>{formatDateTime(row.blocked_at)}</td>
                                            <td>
                                                <span className="dcb-pill red"><FaLock /> {row.blocked_by ? "Blocked by admin" : "Auto-blocked"}</span>
                                                <small className="dcb-reason">{row.reason || "No submission within 12 hours"}</small>
                                            </td>
                                            <td>{row.manager_names || "-"}</td>
                                            <td>
                                                <div className="dcb-contact">
                                                    {phones.map((phone) => (
                                                        <a key={phone} href={`tel:${phone}`}><FaPhoneAlt /> {phone}</a>
                                                    ))}
                                                    {emails.map((email) => (
                                                        <a key={email} href={`mailto:${email}`}><FaEnvelope /> {email}</a>
                                                    ))}
                                                    {!phones.length && !emails.length && <span className="dcb-muted">No contact saved</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <button type="button" className="dcb-unblock" onClick={() => setTarget(row)}>
                                                    <FaUnlock /> Unblock
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={`${row.store_id}-${row.report_date}-${row.unblocked_at}`}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <div className="dcb-store">
                                                    <span className="dcb-store-icon green"><FaStore /></span>
                                                    <div>
                                                        <b>{row.store_name}</b>
                                                        <small>{row.store_code || "-"}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="dcb-date">{formatDay(row.report_date)}</span></td>
                                            <td>{formatDateTime(row.blocked_at)}</td>
                                            <td><span className="dcb-pill green"><FaUnlock /> {formatDateTime(row.unblocked_at)}</span></td>
                                            <td>{row.unblocked_by_name || "-"}</td>
                                            <td>{row.manager_names || "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={Boolean(target)}
                title="Unblock Daily Collection"
                message={target
                    ? `Restore Daily Collection access for ${target.store_name} (${formatDay(target.report_date)})? The store manager will receive an email that the module is ready for submission.`
                    : ""}
                confirmText={unblocking ? "Unblocking..." : "Unblock & Email Manager"}
                cancelText="Cancel"
                confirmVariant="primary"
                loading={unblocking}
                onConfirm={confirmUnblock}
                onCancel={() => !unblocking && setTarget(null)}
            />
        </div>
    );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    FaBell,
    FaBuilding,
    FaCalendarAlt,
    FaClock,
    FaCrosshairs,
    FaHistory,
    FaLock,
    FaMapMarkerAlt,
    FaRoute,
    FaSearch,
    FaShieldAlt,
    FaSignal,
    FaUserCircle,
    FaUsers,
    FaWifi
} from "react-icons/fa";
import "../styles/EmployeeLocation.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EmployeeLocation = () => {
    const [employees, setEmployees] = useState([]);
    const [selected, setSelected] = useState(null);
    const [history, setHistory] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const getAuthConfig = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`
        }
    });

    const loadLive = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const response = await axios.get(
                `${API}/api/location/live`,
                {
                    ...getAuthConfig(),
                    params: { search, status }
                }
            );
            const list = response.data?.employees || [];
            setEmployees(list);
            setLastRefresh(new Date());
            setSelected((current) => {
                if (!current) return list[0] || null;
                return list.find((item) => item.employee_id === current.employee_id) || list[0] || null;
            });
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load employee locations.");
        } finally {
            setLoading(false);
        }
    }, [search, status]);

    const loadHistory = useCallback(async (employee) => {
        if (!employee) {
            setHistory([]);
            return;
        }
        try {
            setHistoryLoading(true);
            const response = await axios.get(
                `${API}/api/location/history/${employee.employee_id}`,
                {
                    ...getAuthConfig(),
                    params: { date }
                }
            );
            setHistory(response.data?.history || []);
        } catch (err) {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [date]);

    useEffect(() => {
        loadLive();
    }, [loadLive]);

    useEffect(() => {
        loadHistory(selected);
    }, [selected, date, loadHistory]);

    useEffect(() => {
        const timer = setInterval(loadLive, 30000);
        return () => clearInterval(timer);
    }, [loadLive]);

    const onlineCount = employees.filter((item) => item.status === "online").length;
    const offlineCount = employees.length - onlineCount;

    const mapUrl = useMemo(() => {
        if (!selected) return "https://www.openstreetmap.org/export/embed.html?bbox=73.80%2C18.48%2C73.98%2C18.60&layer=mapnik";
        const lat = Number(selected.latitude);
        const lng = Number(selected.longitude);
        const delta = 0.055;
        const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
    }, [selected]);

    const openExternalMap = () => {
        if (!selected) return;
        window.open(
            `https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    return (
        <div className="employee-location-page">
            <section className="location-hero">
                <div>
                    <div className="eyebrow"><FaShieldAlt /> Employee privacy controlled</div>
                    <h1>Live Employee Location</h1>
                    <p>Monitor authorized employee locations during configured working hours.</p>
                </div>
                <div className="provider-pill">
                    <span className="provider-dot" /> Demo Provider
                    <small>Ready for authorized telecom API</small>
                </div>
            </section>

            <div className="location-flow">
                <div className="flow-card"><b>1</b><FaUserCircle /><strong>Employee Enrolled</strong><span>Authorized device/user</span></div>
                <div className="flow-arrow">→</div>
                <div className="flow-card"><b>2</b><FaLock /><strong>Permission</strong><span>Company policy applies</span></div>
                <div className="flow-arrow">→</div>
                <div className="flow-card"><b>3</b><FaClock /><strong>Working Hours</strong><span>09:00 AM – 06:00 PM</span></div>
                <div className="flow-arrow">→</div>
                <div className="flow-card"><b>4</b><FaSignal /><strong>Location Updates</strong><span>Provider adapter</span></div>
                <div className="flow-arrow">→</div>
                <div className="flow-card"><b>5</b><FaMapMarkerAlt /><strong>Admin Map</strong><span>Live + history</span></div>
            </div>

            <div className="location-stats">
                <div className="stat-card stat-green"><FaWifi /><div><strong>{onlineCount}</strong><span>Online now</span></div></div>
                <div className="stat-card stat-gray"><FaUsers /><div><strong>{employees.length}</strong><span>Employees shown</span></div></div>
                <div className="stat-card stat-orange"><FaClock /><div><strong>09:00 – 18:00</strong><span>Tracking window</span></div></div>
                <div className="stat-card stat-blue"><FaHistory /><div><strong>{lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><span>Last refresh</span></div></div>
            </div>

            <section className="location-toolbar">
                <div className="search-box">
                    <FaSearch />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search employee, ID or mobile..."
                    />
                </div>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">All status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                </select>
                <label className="date-control"><FaCalendarAlt /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
                <button className="refresh-button" onClick={loadLive} disabled={loading}>
                    <FaCrosshairs /> {loading ? "Refreshing..." : "Refresh"}
                </button>
            </section>

            {error && <div className="location-error">{error}</div>}

            <section className="location-dashboard-grid">
                <aside className="employee-panel">
                    <div className="panel-heading">
                        <div><h2>Employees</h2><span>{onlineCount} online · {offlineCount} offline</span></div>
                        <FaUsers />
                    </div>
                    <div className="employee-list">
                        {loading && !employees.length ? (
                            <div className="location-empty">Loading employees...</div>
                        ) : employees.length ? employees.map((employee) => (
                            <button
                                key={employee.employee_id}
                                className={`employee-row ${selected?.employee_id === employee.employee_id ? "selected" : ""}`}
                                onClick={() => setSelected(employee)}
                            >
                                <div className="avatar"><FaUserCircle /></div>
                                <div className="employee-row-main">
                                    <strong>{employee.name}</strong>
                                    <span>{employee.employee_code} · {employee.department}</span>
                                    <small className={employee.status === "online" ? "online" : "offline"}>
                                        <i /> {employee.status === "online" ? "Online" : `Last seen ${employee.last_update}`}
                                    </small>
                                </div>
                                <FaMapMarkerAlt className={employee.status === "online" ? "row-pin active" : "row-pin"} />
                            </button>
                        )) : <div className="location-empty">No employees match your search.</div>}
                    </div>
                </aside>

                <div className="map-panel">
                    <div className="map-header">
                        <div><h2>Live Location</h2><span>{selected ? selected.address : "Select an employee"}</span></div>
                        {selected && <button onClick={openExternalMap}>Open in Maps ↗</button>}
                    </div>
                    <div className="map-container">
                        <iframe
                            title="Employee location map"
                            src={mapUrl}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                        {selected && <div className="map-overlay-card">
                            <div className="map-avatar"><FaUserCircle /></div>
                            <div><strong>{selected.name}</strong><span><i className={selected.status === "online" ? "online-dot" : "offline-dot"} /> {selected.status === "online" ? "Live location" : "Offline"}</span></div>
                            <div className="accuracy">±{selected.accuracy} m</div>
                        </div>}
                    </div>
                </div>

                <aside className="details-panel">
                    {selected ? (
                        <>
                            <div className="details-header"><span>Employee Details</span><FaUserCircle /></div>
                            <div className="profile-summary">
                                <div className="large-avatar"><FaUserCircle /></div>
                                <div><h2>{selected.name}</h2><span>{selected.status === "online" ? "● Online" : "● Offline"}</span></div>
                            </div>
                            <div className="detail-list">
                                <div><span>Employee ID</span><strong>{selected.employee_code}</strong></div>
                                <div><span>Mobile</span><strong>{selected.mobile}</strong></div>
                                <div><span>Department</span><strong>{selected.department}</strong></div>
                                <div><span>Designation</span><strong>{selected.designation}</strong></div>
                                <div><span>Accuracy</span><strong>±{selected.accuracy} metres</strong></div>
                                <div><span>Battery</span><strong>{selected.battery}%</strong></div>
                            </div>
                            <div className="today-summary">
                                <h3>Today's Summary</h3>
                                <div><span>Total distance</span><strong>18.6 km</strong></div>
                                <div><span>Working duration</span><strong>08h 24m</strong></div>
                                <div><span>Active time</span><strong>06h 45m</strong></div>
                                <div><span>Last update</span><strong>{selected.last_update}</strong></div>
                            </div>
                            <button className="history-button" onClick={() => loadHistory(selected)}><FaHistory /> View Full History</button>
                        </>
                    ) : <div className="location-empty">Select an employee to view details.</div>}
                </aside>
            </section>

            <section className="timeline-section">
                <div className="section-title"><div><h2>Today's Location Flow</h2><span>Working-hours sample timeline</span></div><FaRoute /></div>
                {historyLoading ? <div className="location-empty">Loading timeline...</div> : (
                    <div className="timeline-row">
                        {history.map((point, index) => (
                            <div className="timeline-item" key={point.id}>
                                <strong>{point.time}</strong>
                                <div className={`timeline-icon tone-${index % 4}`}><FaMapMarkerAlt /></div>
                                <b>{point.label}</b>
                                <span>Location captured</span>
                                {index < history.length - 1 && <div className="timeline-line">→</div>}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="privacy-grid">
                <div className="privacy-card green"><FaClock /><div><h3>Working Hours</h3><p>Tracking window: <b>09:00 AM – 06:00 PM</b>, Asia/Kolkata.</p><span>Outside this window, the production provider must not collect location.</span></div></div>
                <div className="privacy-card purple"><FaLock /><div><h3>Privacy & Access</h3><p>Location data is restricted by Miarcus RBAC.</p><span>Every live/history lookup is recorded in the access log.</span></div></div>
                <div className="privacy-card blue"><FaSignal /><div><h3>Provider Adapter</h3><p>Current mode: <b>Mock / Test</b>.</p><span>Replace the provider adapter with the company's authorized telecom API when available.</span></div></div>
            </section>
        </div>
    );
};

export default EmployeeLocation;

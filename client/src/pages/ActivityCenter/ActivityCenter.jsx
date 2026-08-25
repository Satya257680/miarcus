import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaSearch,
    FaEye,
    FaSyncAlt,
    FaTrash,
    FaTrashAlt,
    FaFilter,
} from "react-icons/fa";

import {
    getActivities,
    deleteActivity,
    deleteAllActivities,
} from "../../services/activityService";

import "../../styles/pages/ActivityCenter.css";

function ActivityCenter() {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [moduleName, setModuleName] = useState("");
    const [activityType, setActivityType] = useState("");
    const [action, setAction] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [newStoreOpeningId, setNewStoreOpeningId] = useState("");
    const [page, setPage] = useState(1);
    const [lastPageSize, setLastPageSize] = useState(0);

    const limit = 10;

    const buildFilters = () => ({
        search,
        status,
        priority,
        module_name: moduleName,
        activity_type: activityType,
        action,
        date_from: dateFrom,
        date_to: dateTo,
        new_store_opening_id: newStoreOpeningId,
        page,
        limit,
    });

    const loadActivities = async (overridePage = page) => {
        try {
            setLoading(true);
            const response = await getActivities({
                ...buildFilters(),
                page: overridePage,
            });
            const rows = (response.data?.data || []).filter((item) =>
                String(item?.module_name || "").trim().toLowerCase() !== "employee location"
            );
            setActivities(rows);
            setLastPageSize(rows.length);
        } catch (error) {
            console.error("Activity Center Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActivities(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleSearch = () => {
        if (page !== 1) setPage(1);
        else loadActivities(1);
    };

    const handleReset = () => {
        setSearch("");
        setStatus("");
        setPriority("");
        setModuleName("");
        setActivityType("");
        setAction("");
        setDateFrom("");
        setDateTo("");
        setNewStoreOpeningId("");
        if (page !== 1) setPage(1);
        else setTimeout(() => loadActivities(1), 0);
    };

    const handleDelete = async (activity) => {
        if (!window.confirm(`Delete activity #${activity.id}? This cannot be undone.`)) return;
        try {
            await deleteActivity(activity.id);
            await loadActivities(page);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete activity.");
        }
    };

    const handleDeleteAll = async () => {
        const filters = buildFilters();
        delete filters.page;
        delete filters.limit;

        if (!window.confirm("Delete all activities matching the current filters? This cannot be undone.")) return;

        try {
            const response = await deleteAllActivities(filters);
            alert(response.data?.message || "Activities deleted successfully.");
            setPage(1);
            await loadActivities(1);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete activities.");
        }
    };

    const canGoNext = lastPageSize === limit;

    return (
        <div className="activity-page">
            <div className="activity-header">
                <div>
                    <h2>Activity Center</h2>
                    <p>Complete system activity history across every module.</p>
                </div>
                <div className="activity-header-actions">
                    <button className="refresh-btn" onClick={() => loadActivities(page)} disabled={loading}>
                        <FaSyncAlt /> {loading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button className="delete-all-btn" onClick={handleDeleteAll}>
                        <FaTrashAlt /> Delete All
                    </button>
                </div>
            </div>

            <div className="activity-filters">
                <div className="filter-title"><FaFilter /> Filters</div>
                <input type="text" placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select value={moduleName} onChange={(e) => setModuleName(e.target.value)}>
                    <option value="">All Modules</option>
                    <option>Action Points</option>
                    <option>Announcements</option>
                    <option>Gallery</option>
                    <option>Attendance</option>
                    <option>Checklist Submission</option>
                    <option>Checklist Reports</option>
                    <option>Checklist Types</option>
                    <option>Questions</option>
                    <option>Departments</option>
                    <option>Designations</option>
                    <option>Reports To</option>
                    <option>New Store Openings</option>
                    <option>NSO Rules</option>
                    <option>Expenses</option>
                    <option>Petty Cash</option>
                    <option>Billing</option>
                    <option>Sales Team</option>
                    <option>Listing Tracker</option>
                    <option>Quiz</option>
                    <option>Activity Center</option>
                    <option>Users</option>
                    <option>Stores</option>
                </select>
                <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                    <option value="">All Activity Types</option>
                    <option value="User Activity">User Activity</option>
                    <option value="Action Points Activity">Action Points Activity</option>
                    <option value="Announcements Activity">Announcements Activity</option>
                    <option value="Attendance Activity">Attendance Activity</option>
                    <option value="Checklist Submission Activity">Checklist Submission Activity</option>
                    <option value="Expenses Activity">Expenses Activity</option>
                    <option value="Sales Team Activity">Sales Team Activity</option>
                </select>
                <select value={action} onChange={(e) => setAction(e.target.value)}>
                    <option value="">All Actions</option>
                    <option value="Created">Created</option>
                    <option value="Updated">Updated</option>
                    <option value="Deleted">Deleted</option>
                    <option value="Disabled">Disabled</option>
                    <option value="Enabled">Enabled</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Completed">Completed</option>
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="">All Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
                <input type="number" min="1" placeholder="NSO Project ID" value={newStoreOpeningId} onChange={(e) => setNewStoreOpeningId(e.target.value)} />
                <button className="search-btn" onClick={handleSearch}><FaSearch /> Search</button>
                <button className="reset-btn" onClick={handleReset}>Reset</button>
            </div>

            <div className="activity-table-wrapper">
                <table className="activity-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Activity</th>
                            <th>Module</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Created By</th>
                            <th>Created Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" className="table-message">Loading activities...</td></tr>
                        ) : activities.length === 0 ? (
                            <tr><td colSpan="8" className="table-message">No activities found.</td></tr>
                        ) : activities.map((activity) => (
                            <tr key={activity.id}>
                                <td>{activity.id}</td>
                                <td>
                                    <div className="activity-title-cell">{activity.title}</div>
                                    <small>{activity.description || "Activity"}</small>
                                </td>
                                <td><span className="module-pill">{activity.module_name}</span></td>
                                <td><span className={`status-pill ${String(activity.status || "").toLowerCase().replace(/\s+/g, "-")}`}>{activity.status}</span></td>
                                <td>{activity.priority}</td>
                                <td>{activity.created_by_name || "System"}</td>
                                <td>{activity.created_at ? new Date(activity.created_at).toLocaleString() : "-"}</td>
                                <td>
                                    <div className="row-actions">
                                        <button className="view-btn" onClick={() => navigate(`/activity-center/${activity.id}`)}><FaEye /> View</button>
                                        <button className="delete-btn" onClick={() => handleDelete(activity)} title="Delete activity"><FaTrash /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
                <span>Page {page}</span>
                <button disabled={!canGoNext || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
        </div>
    );
}

export default ActivityCenter;

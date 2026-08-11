import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaEye, FaSyncAlt } from "react-icons/fa";

import { getActivities } from "../../services/activityService";

import "../../styles/pages/ActivityCenter.css";

function ActivityCenter() {
    const navigate = useNavigate();
    // ======================================================
    // STATES
    // ======================================================

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");

    const [status, setStatus] = useState("");

    const [priority, setPriority] = useState("");

    const [newStoreOpeningId, setNewStoreOpeningId] = useState("");

    const [page, setPage] = useState(1);

    const limit = 10;

    // ======================================================
    // LOAD ACTIVITIES
    // ======================================================

    const loadActivities = async () => {
        try {
            setLoading(true);

            const response = await getActivities({
                search,
                status,
                priority,
                new_store_opening_id: newStoreOpeningId,
                page,
                limit,
            });

            setActivities(response.data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActivities();
    }, [page]);

    // ======================================================
    // SEARCH
    // ======================================================

    const handleSearch = () => {
        setPage(1);
        loadActivities();
    };

    // ======================================================
    // RESET
    // ======================================================

    const handleReset = () => {
        setSearch("");
        setStatus("");
        setPriority("");
        setNewStoreOpeningId("");
        setPage(1);

        setTimeout(() => {
            loadActivities();
        }, 100);
    };

   // ======================================================
// VIEW
// ======================================================

const handleView = (activity) => {

    navigate(`/activity-center/${activity.id}`);

};
    // ======================================================
    // UI
    // ======================================================

    return (
        <div className="activity-page">

            <div className="activity-header">

                <h2>Activity Center</h2>

                <button
                    className="refresh-btn"
                    onClick={loadActivities}
                >
                    <FaSyncAlt />
                    Refresh
                </button>

            </div>

            {/* ======================================================
                SEARCH SECTION
            ====================================================== */}

            <div className="activity-filters">

                <input
                    type="text"
                    placeholder="Search Activity..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                </select>

                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                >
                    <option value="">All Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                </select>

                <input
                    type="number"
                    min="1"
                    placeholder="NSO Project ID"
                    value={newStoreOpeningId}
                    onChange={(e) => setNewStoreOpeningId(e.target.value)}
                />

                <button
                    className="search-btn"
                    onClick={handleSearch}
                >
                    <FaSearch />
                    Search
                </button>

                <button
                    className="reset-btn"
                    onClick={handleReset}
                >
                    Reset
                </button>

            </div>

            {/* ======================================================
                TABLE
            ====================================================== */}

            <div className="activity-table-wrapper">

                <table className="activity-table">

                    <thead>

                        <tr>

                            <th>ID</th>

                            <th>Title</th>

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

                            <tr>

                                <td colSpan="8">

                                    Loading...

                                </td>

                            </tr>

                        ) : activities.length === 0 ? (

                            <tr>

                                <td colSpan="8">

                                    No Activities Found

                                </td>

                            </tr>

                        ) : (

                            activities.map((activity) => (

                                <tr key={activity.id}>

                                    <td>{activity.id}</td>

                                    <td>{activity.title}</td>

                                    <td>{activity.module_name}</td>

                                    <td>{activity.status}</td>

                                    <td>{activity.priority}</td>

                                    <td>{activity.created_by_name}</td>

                                    <td>

                                        {new Date(
                                            activity.created_at
                                        ).toLocaleDateString()}

                                    </td>

                                    <td>

                                        <button
                                            className="view-btn"
                                            onClick={() =>
                                                handleView(activity)
                                            }
                                        >
                                            <FaEye />
                                            View
                                        </button>

                                    </td>

                                </tr>

                            ))

                        )}

                    </tbody>

                </table>

            </div>

            {/* ======================================================
                PAGINATION
            ====================================================== */}

            <div className="pagination">

                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                >
                    Previous
                </button>

                <span>

                    Page {page}

                </span>

                <button
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </button>

            </div>

        </div>
    );
}

export default ActivityCenter;
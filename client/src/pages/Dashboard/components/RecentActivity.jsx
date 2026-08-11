import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    FaUser,
    FaStore,
    FaClipboardCheck,
    FaBuilding,
    FaArrowRight,
} from "react-icons/fa";

import { getRecentActivities } from "../../../services/dashboardService";

import "../../../styles/dashboard/RecentActivity.css";

function RecentActivity() {

    const navigate = useNavigate();

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        loadActivities();

    }, []);

    const loadActivities = async () => {

        try {

            const response = await getRecentActivities();

            setActivities(response.data || []);

        } catch (err) {

            console.error("Recent Activity Error:", err);

        } finally {

            setLoading(false);

        }

    };

    const getIcon = (type) => {

        switch (type) {

            case "User":
                return <FaUser className="activity-icon user" />;

            case "Store":
                return <FaStore className="activity-icon store" />;

            case "Checklist":
                return <FaClipboardCheck className="activity-icon checklist" />;

            case "New Store Opening":
                return <FaBuilding className="activity-icon nso" />;

            default:
                return <FaClipboardCheck className="activity-icon" />;
        }

    };

    const formatTime = (date) => {

        if (!date) return "";

        const diff = Math.floor(
            (new Date() - new Date(date)) / 1000
        );

        if (diff < 60)
            return `${diff} sec ago`;

        if (diff < 3600)
            return `${Math.floor(diff / 60)} min ago`;

        if (diff < 86400)
            return `${Math.floor(diff / 3600)} hr ago`;

        return `${Math.floor(diff / 86400)} day(s) ago`;

    };

    // ==========================================
    // VIEW ALL
    // ==========================================

    const handleViewAll = () => {

        navigate("/activity-center");

    };

    // ==========================================
    // OPEN ACTIVITY
    // ==========================================

    const openActivity = (activity) => {

        navigate("/activity-center", {
            state: activity
        });

    };

    return (

        <div className="recent-activity-card">

            <div className="recent-header">

                <div>

                    <h2>Recent Activity</h2>

                    <p>Latest activities across the system</p>

                </div>

                <button
                    className="view-all-btn"
                    onClick={handleViewAll}
                >
                    View All
                    <FaArrowRight />
                </button>

            </div>

            {loading ? (

                <div className="activity-loading">

                    Loading...

                </div>

            ) : activities.length === 0 ? (

                <div className="activity-empty">

                    No recent activities found.

                </div>

            ) : (

                <div className="activity-list">

                    {activities.slice(0, 6).map((item, index) => (

                        <div
                            key={index}
                            className="activity-card"
                            onClick={() => openActivity(item)}
                            style={{ cursor: "pointer" }}
                        >

                            <div className="activity-card-icon">

                                {getIcon(item.type)}

                            </div>

                            <div className="activity-card-body">

                                <h4>{item.title || item.type}</h4>

                                <p>{item.activity || item.description || "Activity"}</p>

                                <span>

                                    {formatTime(item.created_at)}

                                </span>

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}

export default RecentActivity;
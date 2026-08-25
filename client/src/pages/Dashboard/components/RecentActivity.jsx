import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    FaUser,
    FaStore,
    FaClipboardCheck,
    FaBuilding,
    FaArrowRight,
    FaBullhorn,
    FaImages,
    FaCalendarCheck,
    FaListAlt,
    FaTasks,
    FaQuestionCircle,
    FaUsers,
    FaMoneyBillWave,
    FaChartLine,
    FaBox,
    FaCreditCard,
    FaCog,
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

            const visibleActivities = (response.data || []).filter((item) =>
                String(item?.module_name || item?.type || "").trim().toLowerCase() !== "employee location"
            );
            setActivities(visibleActivities);

        } catch (err) {

            console.error("Recent Activity Error:", err);

        } finally {

            setLoading(false);

        }

    };

    const getIcon = (type, moduleName) => {
        const key = String(moduleName || type || "").toLowerCase();
        if (key.includes("user")) return <FaUser className="activity-icon user" />;
        if (key.includes("announcement")) return <FaBullhorn className="activity-icon announcement" />;
        if (key.includes("gallery")) return <FaImages className="activity-icon gallery" />;
        if (key.includes("attendance")) return <FaCalendarCheck className="activity-icon attendance" />;
        if (key.includes("checklist")) return <FaClipboardCheck className="activity-icon checklist" />;
        if (key.includes("action point")) return <FaTasks className="activity-icon action" />;
        if (key.includes("question")) return <FaQuestionCircle className="activity-icon question" />;
        if (key.includes("department") || key.includes("designation") || key.includes("reports")) return <FaUsers className="activity-icon users" />;
        if (key.includes("expense") || key.includes("petty cash")) return <FaMoneyBillWave className="activity-icon finance" />;
        if (key.includes("billing")) return <FaCreditCard className="activity-icon billing" />;
        if (key.includes("listing") || key.includes("sales")) return <FaChartLine className="activity-icon sales" />;
        if (key.includes("asset")) return <FaBox className="activity-icon asset" />;
        if (key.includes("store")) return <FaStore className="activity-icon store" />;
        if (key.includes("nso")) return <FaBuilding className="activity-icon nso" />;
        if (key.includes("setting") || key.includes("quiz")) return <FaCog className="activity-icon settings" />;
        return <FaClipboardCheck className="activity-icon" />;
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
        if (activity?.id) {
            navigate(`/activity-center/${activity.id}`);
        } else {
            navigate("/activity-center");
        }
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

                                {getIcon(item.type, item.module_name)}

                            </div>

                            <div className="activity-card-body">

                                <div className="activity-module-label">{item.module_name || item.type}</div>
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
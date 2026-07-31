import { useState, useEffect } from "react";
import { getDashboardStats } from "../../../services/dashboardService";
import {
  FaTasks,
  FaBullhorn,
  FaBoxes,
  FaCalendarAlt,
  FaClipboardList,
  FaChartBar,
  FaMoneyBillWave,
  FaLayerGroup,
  FaGlobe,
  FaStore,
  FaBook,
  FaQuestionCircle,
  FaUsers,
  FaCog,
  FaChartLine,

  // Dashboard KPI Icons
  FaUserFriends,
  FaStoreAlt,
  FaClipboardCheck,
  FaExclamationTriangle,

} from "react-icons/fa";

import { Navigate, useNavigate } from "react-router-dom";

import { PageHeader } from "../../../components/common/PageHeader";
import { SearchBar } from "../../../components/common/SearchBar";
import { Card } from "../../../components/common/Card";
import ModuleGrid from "../components/ModuleGrid";
import "../../../styles/dashboard/Dashboard.css";

function Dashboard() {

  const [search, setSearch] = useState("");

  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalChecklists: 0,
    pendingActionPoints: 0,
  });

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const navigate = useNavigate();

  // ======================================================
  // Load Dashboard Statistics
  // ======================================================

  const loadDashboardStats = async () => {

    try {

      const response = await getDashboardStats();

      setDashboardStats(response.data);

    } catch (error) {

      console.error("Dashboard Stats Error:", error);

    }

  };

  useEffect(() => {

    loadDashboardStats();

  }, []);

  useEffect(() => {

    const timer = setInterval(() => {

      setCurrentDateTime(new Date());

    }, 1000);

    return () => clearInterval(timer);

  }, []);

  // ======================================================
  // User & Permissions
  // ======================================================

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const permissions = JSON.parse(
    localStorage.getItem("permissions") || "{}"
  );

  const isAdmin =
    user.administrator === true ||
    user.administrator === 1;

  // ======================================================
  // Dashboard Permission
  // ======================================================

  if (
    !isAdmin &&
    (!permissions.Dashboard ||
      permissions.Dashboard === "None")
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

 // ======================================================
// Dashboard Modules
// ======================================================

const modules = [
  {
    title: "Action Points",
    description: "Manage and track assigned action points.",
    permission: ["Action Points"],
    icon: <FaTasks />,
    link: "/action-points",
  },
  {
    title: "Announcements",
    description: "View and manage company announcements.",
    permission: ["Announcements"],
    icon: <FaBullhorn />,
    link: "/announcements",
  },
  {
    title: "Asset Master",
    description: "Maintain and monitor company assets.",
    permission: ["Asset Master"],
    icon: <FaBoxes />,
    link: "/asset-master",
  },
  {
    title: "Attendance",
    description: "Track employee attendance records.",
    permission: ["Attendance"],
    icon: <FaCalendarAlt />,
    link: "/attendance",
  },
  {
    title: "Checklist",
    description: "Submit and manage daily checklists.",
    permission: ["Checklist Submit", "Checklist"],
    icon: <FaClipboardList />,
    link: "/checklist-submit",
  },
  {
    title: "Reports",
    description: "Generate and view business reports.",
    permission: ["Checklist Reports", "Reports"],
    icon: <FaChartBar />,
    link: "/checklist-reports",
  },
  {
    title: "Expenses",
    description: "Manage employee expense records.",
    permission: ["Expenses"],
    icon: <FaMoneyBillWave />,
    link: "/expenses",
  },
  {
    title: "Collection Tracking",
    description: "Monitor collections and payment status.",
    permission: ["Collection Tracking"],
    icon: <FaLayerGroup />,
    link: "/collection-tracking",
  },
  {
    title: "Inventory Planning",
    description: "Plan and monitor inventory requirements.",
    permission: ["Inventory Planning"],
    icon: <FaLayerGroup />,
    link: "/inventory-planning",
  },
  {
    title: "Listing Tracker",
    description: "Track listings and marketplace updates.",
    permission: ["Listing Tracker"],
    icon: <FaGlobe />,
    link: "/listing-tracker",
  },
  {
    title: "New Store Openings",
    description: "Manage new store opening activities.",
    permission: ["New Store Openings"],
    icon: <FaStore />,
    link: "/new-store-openings",
  },
  {
    title: "NSO Rules",
    description: "Configure and maintain NSO business rules.",
    permission: ["NSO Rules"],
    icon: <FaBook />,
    link: "/nso-rules",
  },
  {
    title: "Quiz",
    description: "Take quizzes and evaluate knowledge.",
    permission: ["Quiz"],
    icon: <FaQuestionCircle />,
    link: "/quiz",
  },
  {
    title: "Sales Team",
    description: "Manage sales team information.",
    permission: ["Sales Team"],
    icon: <FaUsers />,
    link: "/sales-team",
  },
  {
    title: "Settings",
    description: "Configure users, stores, and system settings.",
    permission: ["Settings"],
    icon: <FaCog />,
    link: "/settings",
  },
];
// ======================================================
// Greeting, Time & Date
// ======================================================
const now = currentDateTime;

const currentHour = now.getHours();

let greeting = "";

if (currentHour >= 5 && currentHour < 12) {

  greeting = "Good Morning";

} else if (currentHour >= 12 && currentHour < 17) {

  greeting = "Good Afternoon";

} else if (currentHour >= 17 && currentHour < 21) {

  greeting = "Good Evening";

} else {

  greeting = "Good Night";

}

const currentTime = now.toLocaleTimeString("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const currentDate = now.toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
  // ======================================================
  // Visible Modules
  // ======================================================

  const visibleModules = isAdmin
    ? modules
    : modules.filter((module) =>
        module.permission.some((key) => {
          const permission = permissions[key];

          return (
            permission &&
            permission !== "None"
          );
        })
      );

  // ======================================================
  // Search
  // ======================================================

  const filteredModules = visibleModules.filter((module) =>
    module.title
      .toLowerCase()
      .includes(search.toLowerCase())
  );

 return (

    <div className="dashboard-page">

        <PageHeader
            title="Dashboard"
            subtitle={
                <>
                    <span className="dashboard-greeting">
                        {greeting}
                    </span>
                    {", "}
                    <span className="dashboard-username">
                        {user.name || "User"}
                    </span>
                    {" 👋"}
                </>
            }
        />

        {/* ==========================================
            Welcome Card
        ========================================== */}

        <Card className="dashboard-welcome-card">

            <div className="dashboard-welcome">

                <div className="dashboard-welcome-left">

                    <h2>
                        MIARCUS Management Portal
                    </h2>

                    <p>
                        Access all modules from one place. Use the search below to quickly find the module you need.
                    </p>

                    <div className="dashboard-user-info">

                        <span>
                            👤 {user.name || "User"}
                        </span>

                        <span>
                            {user.designation || (isAdmin ? "Administrator" : "User")}
                        </span>

                        <span>
                            🕒 {currentTime}
                        </span>

                        <span>
                            📅 {currentDate}
                        </span>

                    </div>

                </div>

                <div
                    className="dashboard-welcome-right analytics-icon"
                    onClick={() => navigate("/dashboard-analytics")}
                    title="Dashboard Analytics"
                >
                    <FaChartLine />
                </div>

            </div>

        </Card>

        {/* ==========================================
            Search
        ========================================== */}

        <div className="dashboard-search-wrapper">

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search modules..."
            />

        </div>

        {/* ==========================================
            Modules
        ========================================== */}

        <ModuleGrid
            modules={filteredModules}
        />

        {/* ==========================================
            Dashboard Statistics
        ========================================== */}

        <div className="dashboard-stats-grid">

            <Card className="dashboard-stat-card">

                <div className="dashboard-stat-top">

                    <div className="dashboard-stat-icon users">
                        <FaUserFriends />
                    </div>

                    <div>

                        <h3>Total Users</h3>

                        <h2>{dashboardStats.totalUsers}</h2>

                        <p>Registered Users</p>

                    </div>

                </div>

            </Card>

            <Card className="dashboard-stat-card">

                <div className="dashboard-stat-top">

                    <div className="dashboard-stat-icon stores">
                        <FaStore />
                    </div>

                    <div>

                        <h3>Total Stores</h3>

                        <h2>{dashboardStats.totalStores}</h2>

                        <p>Active Stores</p>

                    </div>

                </div>

            </Card>

            <Card className="dashboard-stat-card">

                <div className="dashboard-stat-top">

                    <div className="dashboard-stat-icon checklist">
                        <FaClipboardCheck />
                    </div>

                    <div>

                        <h3>Checklist Submissions</h3>

                        <h2>{dashboardStats.totalChecklists}</h2>

                        <p>Total Submissions</p>

                    </div>

                </div>

            </Card>

            <Card className="dashboard-stat-card">

                <div className="dashboard-stat-top">

                    <div className="dashboard-stat-icon pending">
                        <FaExclamationTriangle />
                    </div>

                    <div>

                        <h3>Pending Action Points</h3>

                        <h2>{dashboardStats.pendingActionPoints}</h2>

                        <p>Need Attention</p>

                    </div>

                </div>

            </Card>

        </div>

    </div>


);

}

export default Dashboard;
import { useState, useEffect, useMemo } from "react";
import {
  getDashboardStats,
  getNSOSummary,
} from "../../../services/dashboardService";
import announcementService from "../../../services/announcementService";
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
  FaThLarge,

  // Dashboard KPI Icons
  FaUserFriends,
  FaStoreAlt,
  FaClipboardCheck,
  FaExclamationTriangle,

} from "react-icons/fa";

import { Navigate, Link, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../../components/common/PageHeader";
import SearchBar from "../../../components/common/SearchBar";
import Card from "../../../components/common/Card";
import ModuleGrid from "../components/ModuleGrid";
import "../../../styles/dashboard/Dashboard.css";
import RecentActivity from "../components/RecentActivity";

// ======================================================
// Module Category Filters
// ======================================================

const CATEGORY_FILTERS = [
  { id: "all", label: "All Modules", icon: <FaThLarge /> },
  { id: "core", label: "Core", icon: <FaClipboardCheck /> },
  { id: "reports", label: "Reports", icon: <FaChartBar /> },
  { id: "management", label: "Management", icon: <FaCog /> },
];

function Dashboard() {

  const [search, setSearch] = useState("");

  const [searchParams] = useSearchParams();

  const [activeCategory, setActiveCategory] = useState("all");

  const [nsoSummary, setNsoSummary] = useState({
    total: 0,
    ready_for_opening: 0,
    opened: 0,
    on_hold: 0
  });

  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalChecklists: 0,
    pendingActionPoints: 0,
    openActionPoints: 0,
  });

  const [announcementsCount, setAnnouncementsCount] = useState(0);

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const navigate = useNavigate();

  // ======================================================
  // Pick up a search term handed off from the topbar's
  // "Search modules, stores, checkpoints..." box.
  // ======================================================

  useEffect(() => {
    const query = searchParams.get("search");

    if (query) {
      setSearch(query);
    }
    // Only read this once, on the initial navigation from the topbar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======================================================
  // Load Dashboard Statistics
  // ======================================================

  const loadDashboardStats = async () => {

    try {

      const response = await getDashboardStats();

      setDashboardStats(response.data);

      try {
        const nsoResponse = await getNSOSummary();
        setNsoSummary(nsoResponse.data || {});
      } catch (nsoError) {
        console.error("NSO Summary Error:", nsoError);
      }

    } catch (error) {

      console.error("Dashboard Stats Error:", error);

    }

  };

  // ======================================================
  // Load Announcements Count
  // ======================================================

  const loadAnnouncementsCount = async () => {

    try {

      const data = await announcementService.getAll();

      const list = Array.isArray(data?.announcements)
        ? data.announcements
        : [];

      setAnnouncementsCount(list.length);

    } catch (error) {

      console.error("Announcements Count Error:", error);

    }

  };

  useEffect(() => {

    loadDashboardStats();
    loadAnnouncementsCount();

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
      category: "core",
      color: "purple",
    },
    {
      title: "Announcements",
      description: "View and manage company announcements.",
      permission: ["Announcements"],
      icon: <FaBullhorn />,
      link: "/announcements",
      category: "core",
      color: "pink",
    },
    {
      title: "Asset Master",
      description: "Maintain and monitor company assets.",
      permission: ["Asset Master"],
      icon: <FaBoxes />,
      link: "/asset-master",
      category: "management",
      color: "violet",
    },
    {
      title: "Attendance",
      description: "Track employee attendance records.",
      permission: ["Attendance"],
      icon: <FaCalendarAlt />,
      link: "/attendance",
      category: "core",
      color: "blue",
    },
    {
      title: "Checklist",
      description: "Submit and manage daily checklists.",
      permission: ["Checklist Submit", "Checklist"],
      icon: <FaClipboardList />,
      link: "/checklist-submit",
      category: "core",
      color: "green",
    },
    {
      title: "Reports",
      description: "Generate and view business reports.",
      permission: ["Checklist Reports", "Reports"],
      icon: <FaChartBar />,
      link: "/checklist-reports",
      category: "reports",
      color: "blue",
    },
    {
      title: "Expenses",
      description: "Manage employee expense records.",
      permission: ["Expenses"],
      icon: <FaMoneyBillWave />,
      link: "/expenses",
      category: "management",
      color: "orange",
    },
    {
      title: "Collection Tracking",
      description: "Monitor collections and payment status.",
      permission: ["Collection Tracking"],
      icon: <FaLayerGroup />,
      link: "/collection-tracking",
      category: "reports",
      color: "teal",
    },
    {
      title: "Inventory Planning",
      description: "Plan and monitor inventory requirements.",
      permission: ["Inventory Planning"],
      icon: <FaLayerGroup />,
      link: "/inventory-planning",
      category: "management",
      color: "violet",
    },
    {
      title: "Listing Tracker",
      description: "Track listings and marketplace updates.",
      permission: ["Listing Tracker"],
      icon: <FaGlobe />,
      link: "/listing-tracker",
      category: "reports",
      color: "blue",
    },
    {
      title: "New Store Openings",
      description: "Manage new store opening activities.",
      permission: ["New Store Openings"],
      icon: <FaStore />,
      link: "/new-store-openings",
      category: "management",
      color: "orange",
    },
    {
      title: "NSO Rules",
      description: "Configure and maintain NSO business rules.",
      permission: ["NSO Rules"],
      icon: <FaBook />,
      link: "/nso-rules",
      category: "management",
      color: "pink",
    },
    {
      title: "Quiz",
      description: "Take quizzes and evaluate knowledge.",
      permission: ["Quiz"],
      icon: <FaQuestionCircle />,
      link: "/quiz/take",
      category: "core",
      color: "teal",
    },
    {
      title: "Sales Team",
      description: "Manage sales team information.",
      permission: ["Sales Team"],
      icon: <FaUsers />,
      link: "/visit-planner",
      category: "management",
      color: "purple",
    },
    {
      title: "Settings",
      description: "Configure users, stores, and system settings.",
      permission: ["Settings"],
      icon: <FaCog />,
      link: "/settings",
      category: "management",
      color: "green",
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
  // Category + Search Filtering
  // ======================================================

  const categorizedModules =
    activeCategory === "all"
      ? visibleModules
      : visibleModules.filter(
          (module) => module.category === activeCategory
        );

  const filteredModules = categorizedModules.filter((module) =>
    module.title
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ======================================================
  // Top KPI Cards (mirrors the Mi Arcus Portal preview)
  // ======================================================

  const statCards = useMemo(
    () => [
      {
        key: "stores",
        label: "Total Stores",
        value: dashboardStats.totalStores || 0,
        caption: "Active Stores",
        icon: <FaStoreAlt />,
        color: "stat-blue",
      },
      {
        key: "employees",
        label: "Active Employees",
        value: dashboardStats.totalUsers || 0,
        caption: "Registered Users",
        icon: <FaUserFriends />,
        color: "stat-purple",
      },
      {
        key: "checklists",
        label: "Pending Checklists",
        value: dashboardStats.pendingActionPoints || 0,
        caption: "Awaiting Submission",
        icon: <FaClipboardList />,
        color: "stat-orange",
      },
      {
        key: "actionPoints",
        label: "Action Points",
        value:
          dashboardStats.openActionPoints ??
          dashboardStats.totalActionPoints ??
          0,
        caption: "Need Attention",
        icon: <FaTasks />,
        color: "stat-indigo",
      },
      {
        key: "announcements",
        label: "Announcements",
        value: announcementsCount,
        caption: "Company Updates",
        icon: <FaBullhorn />,
        color: "stat-pink",
      },
    ],
    [dashboardStats, announcementsCount]
  );

  return (

    <div className="dashboard-page">

      <PageHeader
        title="Dashboard"
        subtitle={
          <>
            <span className="dashboard-greeting-line">
              <span className="dashboard-greeting">
                {greeting}
              </span>
              {", "}
              <span className="dashboard-username">
                {user.name || "User"}
              </span>
              {" 👋"}
            </span>

            <span className="dashboard-subline">
              Here&apos;s what&apos;s happening in your Mi Arcus portal today.
            </span>
          </>
        }
        actions={
          <div className="dashboard-hero-side">

            <div className="dashboard-datetime-card">
              <span className="dashboard-datetime-icon">
                <FaCalendarAlt />
              </span>

              <div className="dashboard-datetime-text">
                <span className="dashboard-datetime-date">
                  {currentDate}
                </span>
                <span className="dashboard-datetime-time">
                  {currentTime}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="dashboard-quote-card"
              onClick={() => navigate("/dashboard-analytics")}
              title="Open Dashboard Analytics"
            >
              <img
                src="/miarcus-brand-theme.png"
                alt=""
                className="dashboard-quote-logo"
              />
              <p>&ldquo;Better Stores, Brighter Tomorrows&rdquo;</p>
            </button>

          </div>
        }
      />

      {/* ==========================================
          KPI STAT CARDS
      ========================================== */}

      <div className="dashboard-stats-grid dashboard-stats-grid-v2">

        {statCards.map((stat) => (

          <Card key={stat.key} className="dashboard-stat-card dashboard-stat-card-v2">

            <div className={`dashboard-stat-icon ${stat.color}`}>
              {stat.icon}
            </div>

            <div className="dashboard-stat-body">
              <p className="dashboard-stat-label">{stat.label}</p>
              <h2>{stat.value}</h2>
              <p className="dashboard-stat-caption">{stat.caption}</p>
            </div>

          </Card>

        ))}

      </div>

      {/* ==========================================
          SEARCH + QUICK ACTIONS
      ========================================== */}

      <div className="dashboard-toolbar">

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search modules..."
          className="dashboard-search-wrapper"
        />

        <div className="dashboard-toolbar-actions">

          <Link to="/checklist-reports" className="dashboard-btn dashboard-btn-primary">
            <FaChartBar />
            View Reports
          </Link>

          <Link to="/dashboard-analytics" className="dashboard-btn dashboard-btn-outline">
            <FaChartLine />
            Analytics
          </Link>

        </div>

      </div>

      {/* ==========================================
          MODULES
      ========================================== */}

      <div className="dashboard-modules-header">

        <div>
          <h2>Modules</h2>
          <p>Access all modules from one place. Click on a module to get started.</p>
        </div>

        <div className="dashboard-filter-pills">

          {CATEGORY_FILTERS.map((filter) => (

            <button
              key={filter.id}
              type="button"
              className={`dashboard-pill ${
                activeCategory === filter.id ? "active" : ""
              }`}
              onClick={() => setActiveCategory(filter.id)}
            >
              {filter.icon}
              <span>{filter.label}</span>
            </button>

          ))}

        </div>

      </div>

      <ModuleGrid
        modules={filteredModules}
      />

      {filteredModules.length === 0 && (
        <p className="dashboard-empty-modules">
          No modules match &ldquo;{search}&rdquo; in this category.
        </p>
      )}

      {/* ==========================================
          NSO BUSINESS SUMMARY
      ========================================== */}

      <div className="dashboard-stats-grid">

        <Card className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon stores">
              <FaStore />
            </div>

            <div>
              <h3>NSO Projects</h3>
              <h2>{nsoSummary.total || 0}</h2>
              <p>Total New Store Openings</p>
            </div>
          </div>
        </Card>

        <Card className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon checklist">
              <FaClipboardCheck />
            </div>

            <div>
              <h3>Ready For Opening</h3>
              <h2>{nsoSummary.ready_for_opening || 0}</h2>
              <p>Projects at opening gate</p>
            </div>
          </div>
        </Card>

        <Card className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon checklist">
              <FaChartLine />
            </div>

            <div>
              <h3>Opened</h3>
              <h2>{nsoSummary.opened || 0}</h2>
              <p>Successfully opened projects</p>
            </div>
          </div>
        </Card>

        <Card className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <div className="dashboard-stat-icon pending">
              <FaExclamationTriangle />
            </div>

            <div>
              <h3>On Hold</h3>
              <h2>{nsoSummary.on_hold || 0}</h2>
              <p>Projects requiring attention</p>
            </div>
          </div>
        </Card>

      </div>

      {/* ==========================================
          Recent Activity
      ========================================== */}

      <RecentActivity />

    </div>

  );

}

export default Dashboard;

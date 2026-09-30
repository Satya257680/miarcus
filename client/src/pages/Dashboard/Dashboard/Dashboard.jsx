import { useState, useEffect, useRef } from "react";
import { getDashboardStats, getNSOSummary } from "../../../services/dashboardService";
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

  // Welcome card chips
  FaUser,
  FaShieldAlt,
  FaClock,
  FaArrowRight,

} from "react-icons/fa";

import { Navigate, useNavigate } from "react-router-dom";
import SearchBar from "../../../components/common/SearchBar";
import Card from "../../../components/common/Card";
import ModuleGrid from "../components/ModuleGrid";
import "../../../styles/dashboard/Dashboard.css";
import "../../../styles/dashboard/Dashboard3D.css";
import RecentActivity from "../components/RecentActivity";

function Dashboard() {

  const [search, setSearch] = useState("");

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
  });

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const navigate = useNavigate();

  // ======================================================
  // 3D tilt for the welcome card (mouse / trackpad only)
  // ======================================================

  const stageRef = useRef(null);
  const tiltFrame = useRef(0);

  const handleTiltMove = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = requestAnimationFrame(() => {
      stage.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
      stage.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
      stage.style.setProperty("--glare-x", `${((x + 0.5) * 100).toFixed(1)}%`);
      stage.style.setProperty("--glare-y", `${((y + 0.5) * 100).toFixed(1)}%`);
      stage.classList.add("is-tilting");
    });
  };

  const handleTiltLeave = () => {
    const stage = stageRef.current;
    if (!stage) return;
    cancelAnimationFrame(tiltFrame.current);
    stage.style.setProperty("--tilt-x", "0deg");
    stage.style.setProperty("--tilt-y", "0deg");
    stage.classList.remove("is-tilting");
  };

  useEffect(() => () => cancelAnimationFrame(tiltFrame.current), []);

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
  // Real-time refresh
  // - loads immediately
  // - re-polls every 30 seconds
  // - re-loads instantly when the tab / window regains focus
  //   (e.g. after closing Action Points in another tab)
  // ======================================================

  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {

    let cancelled = false;

    const refresh = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      await loadDashboardStats();
      if (!cancelled) setLastUpdated(new Date());
    };

    refresh();

    const poll = setInterval(refresh, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(poll);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      link: "/quiz/take",
    },
    {
      title: "Sales Team",
      description: "Manage sales team information.",
      permission: ["Sales Team"],
      icon: <FaUsers />,
      link: "/visit-planner",
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

      {/* ==========================================
          3D Page Title + Greeting
      ========================================== */}

      <header className="dash3d-header">

        <h1 className="dash3d-title">
          Dashboard
        </h1>

        <p className="dash3d-greeting">
          <span className="dashboard-greeting">
            {greeting},
          </span>{" "}
          <span className="dashboard-username">
            {user.name || "User"}
          </span>
          <span className="dash3d-wave" aria-hidden="true"> 👋</span>
        </p>

      </header>

      {/* ==========================================
          Welcome Card (3D)
      ========================================== */}

      <div
        className="dash3d-stage"
        ref={stageRef}
        onPointerMove={handleTiltMove}
        onPointerLeave={handleTiltLeave}
      >

        <Card className="dashboard-welcome-card dash3d-card">

          <span className="dash3d-glare" aria-hidden="true" />
          <span className="dash3d-orb dash3d-orb--a" aria-hidden="true" />
          <span className="dash3d-orb dash3d-orb--b" aria-hidden="true" />

          <div className="dashboard-welcome">

            <div className="dashboard-welcome-left">

              <h2 className="dash3d-portal-title">
                MIARCUS Management Portal
              </h2>

              <p>
                Access all modules from one place. Use the search below to quickly find the module you need.
              </p>

              <div className="dashboard-user-info">

                <span>
                  <FaUser /> {user.name || "User"}
                </span>

                <span>
                  <FaShieldAlt /> {user.designation || (isAdmin ? "Administrator" : "User")}
                </span>

                <span>
                  <FaClock /> {currentTime}
                </span>

                <span>
                  <FaCalendarAlt /> {currentDate}
                </span>

              </div>

            </div>

            <div className="dashboard-welcome-visual dash3d-photo">

              <div className="dash3d-photo-frame">

                <img
                  src="/miarcus-storefront.png"
                  alt="Mi Arcus storefront"
                  className="dashboard-welcome-image"
                />

                <span className="dash3d-photo-sheen" aria-hidden="true" />

              </div>

            </div>

            <div className="dashboard-welcome-analytics-wrap">

              <button
                type="button"
                className="dashboard-welcome-analytics dash3d-analytics"
                onClick={() => navigate("/dashboard-analytics")}
                title="Dashboard Analytics"
                aria-label="Dashboard Analytics"
              >
                <FaChartLine />
              </button>

              <span className="dashboard-analytics-label">Analytics</span>

              {/* Mobile: full-width 3D analytics button */}
              <button
                type="button"
                className="dash3d-analytics-mobile"
                onClick={() => navigate("/dashboard-analytics")}
              >
                <span className="dash3d-analytics-mobile-icon"><FaChartLine /></span>
                <span>
                  <strong>View Analytics</strong>
                  <small>Live business insights</small>
                </span>
                <FaArrowRight className="dash3d-analytics-mobile-arrow" />
              </button>

            </div>

          </div>

        </Card>

      </div>

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

              <h2>{Number(dashboardStats.totalChecklists || 0).toLocaleString("en-IN")}</h2>

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

              <h2
                style={{ cursor: "pointer" }}
                title="Open Action Points"
                onClick={() => navigate("/action-points")}
              >
                {Number(dashboardStats.pendingActionPoints || 0).toLocaleString("en-IN")}
              </h2>

              <p>
                Open + In Progress
                {lastUpdated && (
                  <span style={{ display: "block", fontSize: 11, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>
                    ● Live · {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                )}
              </p>

            </div>

          </div>

        </Card>

      </div>

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
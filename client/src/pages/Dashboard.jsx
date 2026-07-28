import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import {
  FaSearch,
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
} from "react-icons/fa";

import "../styles/Dashboard.css";

function Dashboard() {

  const [search, setSearch] = useState("");

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
      permission: ["Action Points"],
      icon: <FaTasks />,
      link: "/action-points",
    },
    {
      title: "Announcements",
      permission: ["Announcements"],
      icon: <FaBullhorn />,
      link: "/announcements",
    },
    {
      title: "Asset Master",
      permission: ["Asset Master"],
      icon: <FaBoxes />,
      link: "/asset-master",
    },
    {
      title: "Attendance",
      permission: ["Attendance"],
      icon: <FaCalendarAlt />,
      link: "/attendance",
    },
    {
      title: "Checklist",
      permission: ["Checklist Submit", "Checklist"],
      icon: <FaClipboardList />,
      link: "/checklist-submit",
    },
    {
      title: "Reports",
      permission: ["Checklist Reports", "Reports"],
      icon: <FaChartBar />,
      link: "/checklist-reports",
    },
    {
      title: "Expenses",
      permission: ["Expenses"],
      icon: <FaMoneyBillWave />,
      link: "/expenses",
    },
    {
      title: "Collection Tracking",
      permission: ["Collection Tracking"],
      icon: <FaLayerGroup />,
      link: "/collection-tracking",
    },
    {
      title: "Inventory Planning",
      permission: ["Inventory Planning"],
      icon: <FaLayerGroup />,
      link: "/inventory-planning",
    },
    {
      title: "Listing Tracker",
      permission: ["Listing Tracker"],
      icon: <FaGlobe />,
      link: "/listing-tracker",
    },
    {
      title: "New Store Openings",
      permission: ["New Store Openings"],
      icon: <FaStore />,
      link: "/new-store-openings",
    },
    {
      title: "NSO Rules",
      permission: ["NSO Rules"],
      icon: <FaBook />,
      link: "/nso-rules",
    },
    {
      title: "Quiz",
      permission: ["Quiz"],
      icon: <FaQuestionCircle />,
      link: "/quiz",
    },
    {
      title: "Sales Team",
      permission: ["Sales Team"],
      icon: <FaUsers />,
      link: "/sales-team",
    },
    {
      title: "Settings",
      permission: ["Settings"],
      icon: <FaCog />,
      link: "/settings",
    },
  ];

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

      {/* Search */}

      <div className="dashboard-search">

        <FaSearch className="search-icon" />

        <input
          type="text"
          placeholder="Search modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>

      {/* Dashboard Cards */}

      <div className="dashboard-grid">

        {filteredModules.map((module, index) => (

          <Link
            key={index}
            to={module.link}
            className="dashboard-card"
          >

            <div className="card-icon-box">

              <div className="card-icon">

                {module.icon}

              </div>

            </div>

            <h3>{module.title}</h3>

          </Link>

        ))}

      </div>

    </div>
  );
}

export default Dashboard;
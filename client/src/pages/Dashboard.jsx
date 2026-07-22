import { useState } from "react";
import { Link } from "react-router-dom";

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

  const modules = [
    {
      title: "Action Points",
      icon: <FaTasks />,
      link: "/action-points",
    },
    {
      title: "Announcements",
      icon: <FaBullhorn />,
      link: "/announcements",
    },
    {
      title: "Asset Master",
      icon: <FaBoxes />,
      link: "/asset-master",
    },
    {
      title: "Attendance",
      icon: <FaCalendarAlt />,
      link: "/attendance",
    },
    {
      title: "Checklist",
      icon: <FaClipboardList />,
      link: "/checklist-submit",
    },
    {
      title: "Reports",
      icon: <FaChartBar />,
      link: "/checklist-reports",
    },
    {
      title: "Expenses",
      icon: <FaMoneyBillWave />,
      link: "/expenses",
    },
    {
      title: "Collection Tracking",
      icon: <FaLayerGroup />,
      link: "/collection-tracking",
    },
    {
      title: "Inventory Planning",
      icon: <FaLayerGroup />,
      link: "/inventory-planning",
    },
    {
      title: "Listing Tracker",
      icon: <FaGlobe />,
      link: "/listing-tracker",
    },
    {
      title: "New Store Openings",
      icon: <FaStore />,
      link: "/new-store-openings",
    },
    {
      title: "NSO Rules",
      icon: <FaBook />,
      link: "/nso-rules",
    },
    {
      title: "Quiz",
      icon: <FaQuestionCircle />,
      link: "/quiz",
    },
    {
      title: "Sales Team",
      icon: <FaUsers />,
      link: "/sales-team",
    },
    {
      title: "Settings",
      icon: <FaCog />,
      link: "/settings",
    },
  ];

  const filteredModules = modules.filter((module) =>
    module.title.toLowerCase().includes(search.toLowerCase())
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

      {/* Cards */}

      <div className="dashboard-grid">

        {filteredModules.map((module, index) => (

          <Link
            key={index}
            to={module.link}
            className="dashboard-card"
          >

            <div className="card-icon">

              {module.icon}

            </div>

            <h3>{module.title}</h3>

          </Link>

        ))}

      </div>

    </div>
  );
}

export default Dashboard;
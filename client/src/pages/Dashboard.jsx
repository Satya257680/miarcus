import { useState } from "react";
import { Link } from "react-router-dom";

import "./Dashboard.css";

import {
  FaHome,
  FaClipboardList,
  FaTasks,
  FaBullhorn,
  FaBoxes,
  FaCalendarAlt,
  FaChartBar,
  FaMoneyBillWave,
  FaLayerGroup,
  FaGlobe,
  FaStore,
  FaBook,
  FaQuestionCircle,
  FaUsers,
  FaCog,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaBell,
} from "react-icons/fa";

function Dashboard() {

  const [collapsed, setCollapsed] = useState(false);

  return (

    <div className={`dashboard ${collapsed ? "collapsed" : ""}`}>

      {/* ================= Sidebar ================= */}

      <aside className="sidebar">

        <div className="sidebar-top">

          <ul className="menu">

            <li className="active">
              <FaHome />
              {!collapsed && <span>Dashboard</span>}
            </li>

           <Link to="/action-points" className="menu-link">
  <li>
    <FaTasks />
    {!collapsed && <span>ActionPoints</span>}
  </li>
</Link>

            <li>
              <FaBullhorn />
              {!collapsed && <span>Announcements</span>}
            </li>

            <li>
              <FaBoxes />
              {!collapsed && <span>Asset Master</span>}
            </li>

            <li>
              <FaCalendarAlt />
              {!collapsed && <span>Attendance</span>}
            </li>

            <li>
              <FaChartBar />
              {!collapsed && <span>Checklist Reports</span>}
            </li>

            <li>
              <FaClipboardList />
              {!collapsed && <span>Checklist Submission</span>}
            </li>

            <li>
              <FaLayerGroup />
              {!collapsed && <span>Collection Tracking</span>}
            </li>

            <li>
              <FaMoneyBillWave />
              {!collapsed && <span>Expenses</span>}
            </li>

            <li>
              <FaLayerGroup />
              {!collapsed && <span>Inventory Planning</span>}
            </li>

            <li>
              <FaGlobe />
              {!collapsed && <span>Listing Tracker</span>}
            </li>
                        <li>
              <FaStore />
              {!collapsed && <span>New Store Openings</span>}
            </li>

            <li>
              <FaBook />
              {!collapsed && <span>NSO Rules</span>}
            </li>

            <li>
              <FaQuestionCircle />
              {!collapsed && <span>Quiz</span>}
            </li>

            <li>
              <FaUsers />
              {!collapsed && <span>Sales Team</span>}
            </li>

            <li>
              <FaCog />
              {!collapsed && <span>Settings</span>}
            </li>

          </ul>

        </div>

        {/* ================= Sidebar Bottom ================= */}

        <div className="sidebar-bottom">

          <ul className="menu">

            <li>
              <FaUserCircle />
              {!collapsed && <span>Profile</span>}
            </li>

            <li className="logout">
              <FaSignOutAlt />
              {!collapsed && <span>Logout</span>}
            </li>

          </ul>

        </div>

      </aside>

      {/* ================= Main ================= */}

      <main className="main">

        {/* ================= Navbar ================= */}

        <div className="navbar">

          {/* Left */}

          <div className="navbar-left">

            <button
              className="menu-btn"
              onClick={() => setCollapsed(!collapsed)}
            >
              <FaBars />
            </button>

          </div>

          {/* Center */}

          <div className="navbar-center">

            <img
              src="/MiarcusT.png"
              alt="Miarcus Logo"
              className="navbar-logo"
            />

          </div>

          {/* Right */}

          <div className="navbar-right">

            <button className="notification-btn">

              <FaBell />

              <span className="notify-count">
                99+
              </span>

            </button>

            <button className="logout-btn">
              Logout
            </button>

          </div>

        </div>
                {/* ================= Dashboard Content ================= */}

        <div className="content">

          <div className="welcome-card">

            <h1>Dashboard</h1>

            <p>
              Welcome to the Miarcus Dashboard.
            </p>

          </div>

        </div>

      </main>

    </div>

  );

}

export default Dashboard;
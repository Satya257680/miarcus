import { useState } from "react";
import { Link } from "react-router-dom";

import "../styles/Dashboard.css";

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
  FaSignOutAlt,
  FaBars,
  FaBell,
  FaSearch,
} from "react-icons/fa";

function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [notificationCount] = useState(99);

  return (
    <div className={`dashboard ${collapsed ? "collapsed" : ""}`}>

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

        <div className="sidebar-header">

          <button
            className="menu-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            <FaBars />
          </button>

          {!collapsed && (
            <img
              src="/MiarcusT.png"
              alt="Miarcus"
              className="sidebar-logo"
            />
          )}

        </div>

        <div className="sidebar-top">

          <ul className="menu">

            <li className="active">
              <FaHome />
              {!collapsed && <span>Dashboard</span>}
            </li>

            <Link to="/action-points" className="menu-link">
              <li>
                <FaTasks />
                {!collapsed && <span>Action Points</span>}
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

        <div className="sidebar-bottom">

          <button
            className="logout-side-btn"
            onClick={() => setShowLogout(true)}
          >
            <FaSignOutAlt />
            {!collapsed && <span>Logout</span>}
          </button>

        </div>

      </aside>

      {/* ================= MAIN ================= */}

      <main className="main">

        {/* ================= TOP NAVBAR ================= */}

        <header className="navbar">

        

<div className="navbar-center">
    
</div>

          <div className="navbar-right">

            <button className="notification-btn">

              <FaBell />

              <span className="notify-count">
                {notificationCount}
              </span>

            </button>

            <button
              className="logout-btn"
              onClick={() => setShowLogout(true)}
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>

          </div>

        </header>
                {/* ================= SEARCH ================= */}

        <section className="dashboard-content">

          <div className="search-wrapper">

            <div className="search-box">

              <FaSearch className="search-icon" />

              <input
                type="text"
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

            </div>

          </div>

          {/* ================= MODULES ================= */}

         

          <div className="dashboard-grid">

            <Link to="/action-points" className="card-link">

              <div className="dashboard-card">

                <div className="card-icon-box">

                  <FaTasks className="card-icon" />

                </div>

                <h3>Action Points</h3>

              </div>

            </Link>

            <div className="dashboard-card">

              <div className="card-icon-box">

                <FaBullhorn className="card-icon" />

              </div>

              <h3>Announcements</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">

                <FaBoxes className="card-icon" />

              </div>

              <h3>Asset Master</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">

                <FaCalendarAlt className="card-icon" />

              </div>

              <h3>Attendance</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">

                <FaClipboardList className="card-icon" />

              </div>

              <h3>Checklist</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">

                <FaChartBar className="card-icon" />

              </div>

              <h3>Reports</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">

                <FaMoneyBillWave className="card-icon" />

              </div>

              <h3>Expenses</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">

                <FaLayerGroup className="card-icon" />

              </div>

              <h3>Collection Tracking</h3>

            </div>
                        <div className="dashboard-card">

              <div className="card-icon-box">
                <FaLayerGroup className="card-icon" />
              </div>

              <h3>Inventory Planning</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">
                <FaGlobe className="card-icon" />
              </div>

              <h3>Listing Tracker</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">
                <FaStore className="card-icon" />
              </div>

              <h3>New Store Openings</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">
                <FaBook className="card-icon" />
              </div>

              <h3>NSO Rules</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">
                <FaQuestionCircle className="card-icon" />
              </div>

              <h3>Quiz</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">
                <FaUsers className="card-icon" />
              </div>

              <h3>Sales Team</h3>

            </div>

            <div className="dashboard-card">

              <div className="card-icon-box">
                <FaCog className="card-icon" />
              </div>

              <h3>Settings</h3>

            </div>

          </div>

        </section>

        {/* ================= LOGOUT MODAL ================= */}

        {showLogout && (

          <div className="logout-overlay">

            <div className="logout-modal">

              <h2>Logout</h2>

              <p>
                Are you sure you want to logout?
              </p>

              <div className="logout-actions">

                <button
                  className="cancel-btn"
                  onClick={() => setShowLogout(false)}
                >
                  Cancel
                </button>

                <button
                  className="confirm-btn"
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = "/";
                  }}
                >
                  Logout
                </button>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default Dashboard;
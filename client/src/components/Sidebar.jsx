import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  FaHome,
  FaTasks,
  FaClipboardList,
  FaClipboardCheck,
  FaCog,
  FaChevronDown,
  FaChevronRight,
  FaBuilding,
  FaUserTie,
  FaUsers,
  FaListAlt,
  FaQuestionCircle,
  FaUserCircle,
  FaSitemap,
} from "react-icons/fa";

import "./Sidebar.css";

function Sidebar({ collapsed }) {
  const location = useLocation();

  // ==========================================
  // Settings Dropdown
  // ==========================================

  const [settingsOpen, setSettingsOpen] = useState(true);

  // Automatically keep Settings open
  // when user is inside any Settings page
  useEffect(() => {
    const settingsRoutes = [
      "/checklist-types",
      "/questions",
      "/departments",
      "/designations",
      "/stores",
      "/users",
      "/reports-to",
    ];

    if (settingsRoutes.includes(location.pathname)) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
    >
      <nav>

        {/* ==========================================
            DASHBOARD
        ========================================== */}

        <NavLink
          to="/dashboard"
          className="menu-item"
        >
          <FaHome />

          {!collapsed && (
            <span>Dashboard</span>
          )}
        </NavLink>


        {/* ==========================================
            ACTION POINTS
        ========================================== */}

        <NavLink
          to="/action-points"
          className="menu-item"
        >
          <FaTasks />

          {!collapsed && (
            <span>Action Points</span>
          )}
        </NavLink>


        {/* ==========================================
            CHECKLIST REPORTS
        ========================================== */}

        <NavLink
          to="/checklist-reports"
          className="menu-item"
        >
          <FaClipboardList />

          {!collapsed && (
            <span>Checklist Reports</span>
          )}
        </NavLink>


        {/* ==========================================
            CHECKLIST SUBMISSION
        ========================================== */}

        <NavLink
          to="/checklist-submit"
          className="menu-item"
        >
          <FaClipboardCheck />

          {!collapsed && (
            <span>Checklist Submit</span>
          )}
        </NavLink>


        {/* ==========================================
            SETTINGS
        ========================================== */}

        <button
          type="button"
          className="menu-item settings-btn"
          onClick={() =>
            setSettingsOpen((previous) => !previous)
          }
        >

          <div className="settings-left">

            <FaCog />

            {!collapsed && (
              <span>Settings</span>
            )}

          </div>

          {!collapsed &&
            (settingsOpen ? (
              <FaChevronDown />
            ) : (
              <FaChevronRight />
            ))}

        </button>


        {/* ==========================================
            SETTINGS SUBMENU
        ========================================== */}

        {settingsOpen && !collapsed && (

          <div className="submenu">

            {/* Checklist Types */}

            <NavLink
              to="/checklist-types"
              className="submenu-item"
            >
              <FaListAlt />

              <span>
                Checklist Types
              </span>
            </NavLink>


            {/* Questions */}

            <NavLink
              to="/questions"
              className="submenu-item"
            >
              <FaQuestionCircle />

              <span>
                Questions
              </span>
            </NavLink>


            {/* Departments */}

            <NavLink
              to="/departments"
              className="submenu-item"
            >
              <FaBuilding />

              <span>
                Departments
              </span>
            </NavLink>


            {/* Designations */}

            <NavLink
              to="/designations"
              className="submenu-item"
            >
              <FaUserTie />

              <span>
                Designations
              </span>
            </NavLink>


            {/* Store Management */}

            <NavLink
              to="/stores"
              className="submenu-item"
            >
              <FaBuilding />

              <span>
                Store Management
              </span>
            </NavLink>


            {/* Users */}

            <NavLink
              to="/users"
              className="submenu-item"
            >
              <FaUsers />

              <span>
                Users
              </span>
            </NavLink>


            {/* Reports To */}

            <NavLink
              to="/reports-to"
              className="submenu-item"
            >
              <FaSitemap />

              <span>
                Reports To
              </span>
            </NavLink>

          </div>

        )}


        {/* ==========================================
            PROFILE
        ========================================== */}

        <NavLink
          to="/profile"
          className="menu-item"
        >
          <FaUserCircle />

          {!collapsed && (
            <span>Profile</span>
          )}
        </NavLink>

      </nav>
    </aside>
  );
}

export default Sidebar;
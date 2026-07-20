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

  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    const settingsRoutes = [
      "/users",
      "/reports-to",
      "/checklist-types",
      "/questions",
      "/departments",
      "/designations",
      "/stores",
    ];

    if (settingsRoutes.includes(location.pathname)) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <nav>

        {/* Dashboard */}
        <NavLink to="/dashboard" className="menu-item">
          <FaHome />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* Action Points */}
        <NavLink to="/action-points" className="menu-item">
          <FaTasks />
          {!collapsed && <span>Action Points</span>}
        </NavLink>

        {/* Checklist Reports */}
        <NavLink to="/checklist-reports" className="menu-item">
          <FaClipboardList />
          {!collapsed && <span>Checklist Reports</span>}
        </NavLink>

        {/* Checklist Submit */}
        <NavLink to="/checklist-submit" className="menu-item">
          <FaClipboardCheck />
          {!collapsed && <span>Checklist Submit</span>}
        </NavLink>

        {/* Settings */}
        <button
          className="menu-item settings-btn"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <div className="settings-left">
            <FaCog />
            {!collapsed && <span>Settings</span>}
          </div>

          {!collapsed &&
            (settingsOpen ? (
              <FaChevronDown />
            ) : (
              <FaChevronRight />
            ))}
        </button>

        {settingsOpen && !collapsed && (
          <div className="submenu">

            {/* Checklist Types */}
            <NavLink
              to="/checklist-types"
              className="submenu-item"
            >
              <FaListAlt />
              <span>Checklist Types</span>
            </NavLink>

            {/* Questions */}
            <NavLink
              to="/questions"
              className="submenu-item"
            >
              <FaQuestionCircle />
              <span>Questions</span>
            </NavLink>

            {/* Departments */}
            <NavLink
              to="/departments"
              className="submenu-item"
            >
              <FaBuilding />
              <span>Departments</span>
            </NavLink>

            {/* Designations */}
            <NavLink
              to="/designations"
              className="submenu-item"
            >
              <FaUserTie />
              <span>Designations</span>
            </NavLink>

            {/* Store Management */}
            <NavLink
              to="/stores"
              className="submenu-item"
            >
              <FaBuilding />
              <span>Store Management</span>
            </NavLink>

            {/* Users */}
            <NavLink
              to="/users"
              className="submenu-item"
            >
              <FaUsers />
              <span>Users</span>
            </NavLink>

            {/* Reports To */}
            <NavLink
              to="/reports-to"
              className="submenu-item"
            >
              <FaSitemap />
              <span>Reports To</span>
            </NavLink>

          </div>
        )}

        {/* Profile */}
        <NavLink to="/profile" className="menu-item">
          <FaUserCircle />
          {!collapsed && <span>Profile</span>}
        </NavLink>

      </nav>
    </aside>
  );
}

export default Sidebar;
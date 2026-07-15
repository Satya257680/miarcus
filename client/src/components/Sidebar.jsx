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
} from "react-icons/fa";

import "./Sidebar.css";

function Sidebar({ collapsed }) {
  const location = useLocation();

  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    if (
      location.pathname === "/users" ||
      location.pathname === "/checklist-types" ||
      location.pathname === "/questions" ||
      location.pathname === "/departments" ||
      location.pathname === "/designations" ||
      location.pathname === "/store-management"
    ) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <nav>
        <NavLink to="/dashboard" className="menu-item">
          <FaHome />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink to="/action-points" className="menu-item">
          <FaTasks />
          {!collapsed && <span>Action Points</span>}
        </NavLink>

        <NavLink to="/checklist-reports" className="menu-item">
          <FaClipboardList />
          {!collapsed && <span>Checklist Reports</span>}
        </NavLink>

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
            (settingsOpen ? <FaChevronDown /> : <FaChevronRight />)}
        </button>

        {settingsOpen && !collapsed && (
          <div className="submenu">

            <NavLink
              to="/checklist-types"
              className="submenu-item"
            >
              <FaListAlt />
              <span>Checklist Types</span>
            </NavLink>

            <NavLink
              to="/questions"
              className="submenu-item"
            >
              <FaQuestionCircle />
              <span>Questions</span>
            </NavLink>

            <NavLink
              to="/departments"
              className="submenu-item"
            >
              <FaBuilding />
              <span>Departments</span>
            </NavLink>

            <NavLink
              to="/designations"
              className="submenu-item"
            >
              <FaUserTie />
              <span>Designations</span>
            </NavLink>

            <NavLink
              to="/store-management"
              className="submenu-item"
            >
              <FaBuilding />
              <span>Store Management</span>
            </NavLink>

            <NavLink
              to="/users"
              className="submenu-item"
            >
              <FaUsers />
              <span>Users</span>
            </NavLink>

          </div>
        )}

        <NavLink to="/profile" className="menu-item">
          <FaUserCircle />
          {!collapsed && <span>Profile</span>}
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
import { useState } from "react";
import { NavLink } from "react-router-dom";

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

function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useState(true);

  return (
    <aside className="sidebar">

      <nav>

        <NavLink to="/dashboard" className="menu-item">
          <FaHome />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/action-points" className="menu-item">
          <FaTasks />
          <span>Action Points</span>
        </NavLink>

        <NavLink to="/checklist-reports" className="menu-item">
          <FaClipboardList />
          <span>Checklist Reports</span>
        </NavLink>

        <NavLink to="/checklist-submit" className="menu-item">
          <FaClipboardCheck />
          <span>Checklist Submit</span>
        </NavLink>

        {/* Settings */}

        <button
          className="menu-item settings-btn"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <div className="settings-left">
            <FaCog />
            <span>Settings</span>
          </div>

          {settingsOpen ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        {settingsOpen && (
          <div className="submenu">

            <NavLink
              to="/settings/checklist-types"
              className="submenu-item"
            >
              <FaListAlt />
              <span>Checklist Types</span>
            </NavLink>

            <NavLink
              to="/settings/questions"
              className="submenu-item"
            >
              <FaQuestionCircle />
              <span>Questions</span>
            </NavLink>

            <NavLink
              to="/settings/departments"
              className="submenu-item"
            >
              <FaBuilding />
              <span>Departments</span>
            </NavLink>

            <NavLink
              to="/settings/designations"
              className="submenu-item"
            >
              <FaUserTie />
              <span>Designations</span>
            </NavLink>

            <NavLink
              to="/settings/store-management"
              className="submenu-item"
            >
              <FaBuilding />
              <span>Store Management</span>
            </NavLink>

            <NavLink
              to="/settings/users"
              className="submenu-item"
            >
              <FaUsers />
              <span>Users</span>
            </NavLink>

          </div>
        )}

        <NavLink to="/profile" className="menu-item">
          <FaUserCircle />
          <span>Profile</span>
        </NavLink>

      </nav>

    </aside>
  );
}

export default Sidebar;
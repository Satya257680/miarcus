import { NavLink } from "react-router-dom";

import {
  FaHome,
  FaTasks,
  FaClipboardList,
  FaClipboardCheck,
  FaCog,
  FaBell,
  FaStore,
  FaUserCircle,
} from "react-icons/fa";

import "../../styles/layout/Sidebar.css";

function Sidebar({ collapsed }) {

  // ==========================================
  // RBAC
  // ==========================================

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const permissions = JSON.parse(
    localStorage.getItem("permissions") || "{}"
  );

  const isAdministrator = user?.administrator === true;

  const hasPermission = (moduleName) => {

    if (isAdministrator) return true;

    const permission = permissions[moduleName];

    return [
      "View",
      "Add",
      "Edit",
      "Full",
    ].includes(permission);

  };

  return (

    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
    >

      <nav>

        {/* ==========================================
            DASHBOARD
        ========================================== */}

        {hasPermission("Dashboard") && (

          <NavLink
            to="/dashboard"
            className="menu-item"
          >
            <FaHome />

            {!collapsed && (
              <span>Dashboard</span>
            )}

          </NavLink>

        )}

        {/* ==========================================
            ACTION POINTS
        ========================================== */}

        {hasPermission("Action Points") && (

          <NavLink
            to="/action-points"
            className="menu-item"
          >
            <FaTasks />

            {!collapsed && (
              <span>Action Points</span>
            )}

          </NavLink>

        )}

        {/* ==========================================
            CHECKLIST REPORTS
        ========================================== */}

        {hasPermission("Checklist Reports") && (

          <NavLink
            to="/checklist-reports"
            className="menu-item"
          >
            <FaClipboardList />

            {!collapsed && (
              <span>Checklist Reports</span>
            )}

          </NavLink>

        )}

        {/* ==========================================
            CHECKLIST SUBMISSION
        ========================================== */}

        {hasPermission("Checklist Submission") && (

          <NavLink
            to="/checklist-submit"
            className="menu-item"
          >
            <FaClipboardCheck />

            {!collapsed && (
              <span>Checklist Submit</span>
            )}

          </NavLink>

        )}

        {/* ==========================================
            NEW STORE OPENINGS
        ========================================== */}

        {hasPermission("New Store Openings") && (

          <NavLink
            to="/new-store-openings"
            className="menu-item"
          >
            <FaStore />

            {!collapsed && (
              <span>New Store Openings</span>
            )}

          </NavLink>

        )}

        {/* ==========================================
            NSO RULES
        ========================================== */}

        {hasPermission("NSO Rules") && (

          <NavLink
            to="/nso-rules"
            className="menu-item"
          >
            <FaBell />

            {!collapsed && (
              <span>NSO Rules</span>
            )}

          </NavLink>

        )}

        {/* ==========================================
            SETTINGS
        ========================================== */}

        {(

          isAdministrator ||

          hasPermission("Users") ||

          hasPermission("Departments") ||

          hasPermission("Designations") ||

          hasPermission("Stores") ||

          hasPermission("Questions") ||

          hasPermission("Checklist Types") ||

          hasPermission("Reports To")

        ) && (

          <NavLink
            to="/settings"
            className="menu-item"
          >
            <FaCog />

            {!collapsed && (
              <span>Settings</span>
            )}

          </NavLink>

        )}

        {/* ==========================================
            PROFILE
        ========================================== */}

        <div className="sidebar-footer">

          <NavLink
            to="/profile"
            className="menu-item"
          >
            <FaUserCircle />

            {!collapsed && (
              <span>Profile</span>
            )}

          </NavLink>

        </div>

      </nav>

    </aside>

  );

}

export default Sidebar;
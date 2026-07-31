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
  FaBell,
  FaStore,
} from "react-icons/fa";

import "../../styles/layout/Sidebar.css";

function Sidebar({ collapsed }) {

  const location = useLocation();

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

  // ==========================================
  // Settings Dropdown
  // ==========================================

  const [settingsOpen, setSettingsOpen] = useState(true);

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

            {hasPermission("Checklist Types") && (

              <NavLink
                to="/checklist-types"
                className="submenu-item"
              >
                <FaListAlt />

                <span>Checklist Types</span>

              </NavLink>

            )}

            {/* Questions */}

            {hasPermission("Questions") && (

              <NavLink
                to="/questions"
                className="submenu-item"
              >
                <FaQuestionCircle />

                <span>Questions</span>

              </NavLink>

            )}

            {/* Departments */}

            {hasPermission("Departments") && (

              <NavLink
                to="/departments"
                className="submenu-item"
              >
                <FaBuilding />

                <span>Departments</span>

              </NavLink>

            )}

            {/* Designations */}

            {hasPermission("Designations") && (

              <NavLink
                to="/designations"
                className="submenu-item"
              >
                <FaUserTie />

                <span>Designations</span>

              </NavLink>

            )}

            {/* Store Management */}

            {hasPermission("Stores") && (

              <NavLink
                to="/stores"
                className="submenu-item"
              >
                <FaBuilding />

                <span>Store Management</span>

              </NavLink>

            )}

            {/* Users */}

            {hasPermission("Users") && (

              <NavLink
                to="/users"
                className="submenu-item"
              >
                <FaUsers />

                <span>Users</span>

              </NavLink>

            )}

            {/* Reports To */}

            {hasPermission("Reports To") && (

              <NavLink
                to="/reports-to"
                className="submenu-item"
              >
                <FaSitemap />

                <span>Reports To</span>

              </NavLink>

            )}

          </div>

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
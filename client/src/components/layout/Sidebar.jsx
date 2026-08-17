import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";

import {
  FaHome,
  FaTasks,
  FaClipboardList,
  FaClipboardCheck,
  FaCog,
  FaBell,
  FaStore,
  FaUserCircle,
  FaBullhorn,
  FaQuestionCircle,
  FaEnvelope,
  FaChartBar,
  FaChevronDown,
  FaWallet,
  FaReceipt,
  FaCheckDouble,
} from "react-icons/fa";

import "../../styles/layout/Sidebar.css";

function Sidebar({ collapsed }) {

  const location = useLocation();
  const quizOpenByPath = location.pathname.startsWith("/quiz/");
  const expenseOpenByPath = location.pathname.startsWith("/expenses/");
  const [quizOpen, setQuizOpen] = useState(quizOpenByPath);
  const [expenseOpen, setExpenseOpen] = useState(expenseOpenByPath);

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

  const hasAnyPermission = (moduleNames) =>
    isAdministrator ||
    moduleNames.some((moduleName) =>
      ["View", "Add", "Edit", "Full"].includes(
        permissions[moduleName]
      )
    );

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
            ANNOUNCEMENTS
        ========================================== */}

        {hasPermission("Announcements") && (

          <NavLink
            to="/announcements"
            className="menu-item"
          >
            <FaBullhorn />

            {!collapsed && (
              <span>Announcements</span>
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
            EXPENSES
        ========================================== */}

        {hasAnyPermission([
          "Expenses",
          "Expense Entry",
          "Track Expenses",
          "Approve Expenses"
        ]) && (
          <div
            className={`sidebar-group ${expenseOpen || expenseOpenByPath ? "open" : ""}`}
          >
            <button
              type="button"
              className={`menu-item sidebar-group-toggle ${expenseOpenByPath ? "active" : ""}`}
              onClick={() => setExpenseOpen((prev) => !prev)}
            >
              <FaWallet />
              {!collapsed && <span>Expenses</span>}
              {!collapsed && <FaChevronDown className="submenu-chevron" />}
            </button>

            {!collapsed && (expenseOpen || expenseOpenByPath) && (
              <div className="sidebar-submenu">
                {hasAnyPermission(["Expenses", "Expense Entry"]) && (
                  <NavLink to="/expenses/entry" className="menu-item submenu-item">
                    <FaReceipt />
                    <span>Expense Entry</span>
                  </NavLink>
                )}

                {hasAnyPermission(["Expenses", "Track Expenses"]) && (
                  <NavLink to="/expenses/track" className="menu-item submenu-item">
                    <FaReceipt />
                    <span>Track Expenses</span>
                  </NavLink>
                )}

                {hasAnyPermission(["Expenses", "Approve Expenses"]) && (
                  <NavLink to="/expenses/approve" className="menu-item submenu-item">
                    <FaCheckDouble />
                    <span>Approve Expenses</span>
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            QUIZ
        ========================================== */}

        {hasPermission("Quiz") && (
          <div className={`sidebar-group ${quizOpen || quizOpenByPath ? "open" : ""}`}>
            <button
              type="button"
              className={`menu-item sidebar-group-toggle ${quizOpenByPath ? "active" : ""}`}
              onClick={() => setQuizOpen((prev) => !prev)}
            >
              <FaQuestionCircle />
              {!collapsed && <span>Quiz</span>}
              {!collapsed && <FaChevronDown className="submenu-chevron" />}
            </button>

            {!collapsed && (quizOpen || quizOpenByPath) && (
              <div className="sidebar-submenu">
                <NavLink to="/quiz/take" className="menu-item submenu-item">
                  <FaClipboardCheck />
                  <span>Take Quiz</span>
                </NavLink>
                <NavLink to="/quiz/setup" className="menu-item submenu-item">
                  <FaCog />
                  <span>Quiz Setup</span>
                </NavLink>
                <NavLink to="/quiz/report" className="menu-item submenu-item">
                  <FaChartBar />
                  <span>Training Report</span>
                </NavLink>
                <NavLink to="/quiz/email" className="menu-item submenu-item">
                  <FaEnvelope />
                  <span>Email Setting</span>
                </NavLink>
              </div>
            )}
          </div>
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
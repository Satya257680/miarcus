import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

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

  // ======================================================
  // PATH DETECTION
  // ======================================================

  const expenseOpenByPath =
    location.pathname === "/expenses" ||
    location.pathname.startsWith("/expenses/");

  const quizOpenByPath =
    location.pathname === "/quiz" ||
    location.pathname.startsWith("/quiz/");

  // ======================================================
  // MENU OPEN/CLOSE STATE
  // ======================================================

  const [expenseOpen, setExpenseOpen] =
    useState(expenseOpenByPath);

  const [quizOpen, setQuizOpen] =
    useState(quizOpenByPath);

  // ======================================================
  // KEEP MENU OPEN WHEN DIRECT URL IS OPENED
  // ======================================================

  useEffect(() => {
    if (expenseOpenByPath) {
      setExpenseOpen(true);
    }
  }, [expenseOpenByPath]);

  useEffect(() => {
    if (quizOpenByPath) {
      setQuizOpen(true);
    }
  }, [quizOpenByPath]);

  // ======================================================
  // RBAC
  // ======================================================

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const permissions = JSON.parse(
    localStorage.getItem("permissions") || "{}"
  );

  const isAdministrator =
    user?.administrator === true;

  // ======================================================
  // PERMISSION HELPERS
  // ======================================================

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

  const hasAnyPermission = (moduleNames) => {
    if (isAdministrator) return true;

    return moduleNames.some((moduleName) =>
      [
        "View",
        "Add",
        "Edit",
        "Full",
      ].includes(permissions[moduleName])
    );
  };

  // ======================================================
  // EXPENSE PERMISSIONS
  // ======================================================

  const expensePermission =
    permissions["Expenses"];

  const canEnterExpense =
    isAdministrator ||
    ["Add", "Edit", "Full"].includes(
      expensePermission
    );

  const canTrackExpenses =
    isAdministrator ||
    ["View", "Add", "Edit", "Full"].includes(
      expensePermission
    );

  const canApproveExpenses =
    isAdministrator ||
    ["Edit", "Full"].includes(
      expensePermission
    );

  // ======================================================
  // QUIZ PERMISSION
  // ======================================================

  const canAccessQuiz =
    isAdministrator ||
    hasPermission("Quiz");

  // ======================================================
  // COMMON NAVLINK CLASS
  // ======================================================

  const getMenuClass = ({ isActive }) =>
    `menu-item ${isActive ? "active" : ""}`;

  return (
    <aside
      className={`sidebar ${
        collapsed ? "collapsed" : ""
      }`}
    >
      <nav>

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {hasPermission("Dashboard") && (
          <NavLink
            to="/dashboard"
            className={getMenuClass}
          >
            <FaHome />

            {!collapsed && (
              <span>Dashboard</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            ANNOUNCEMENTS
        ================================================== */}

        {hasPermission("Announcements") && (
          <NavLink
            to="/announcements"
            className={getMenuClass}
          >
            <FaBullhorn />

            {!collapsed && (
              <span>Announcements</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            ACTION POINTS
        ================================================== */}

        {hasPermission("Action Points") && (
          <NavLink
            to="/action-points"
            className={getMenuClass}
          >
            <FaTasks />

            {!collapsed && (
              <span>Action Points</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            CHECKLIST REPORTS
        ================================================== */}

        {hasPermission("Checklist Reports") && (
          <NavLink
            to="/checklist-reports"
            className={getMenuClass}
          >
            <FaClipboardList />

            {!collapsed && (
              <span>Checklist Reports</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            CHECKLIST SUBMIT
        ================================================== */}

        {hasPermission("Checklist Submission") && (
          <NavLink
            to="/checklist-submit"
            className={getMenuClass}
          >
            <FaClipboardCheck />

            {!collapsed && (
              <span>Checklist Submit</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            NEW STORE OPENINGS
        ================================================== */}

        {hasPermission("New Store Openings") && (
          <NavLink
            to="/new-store-openings"
            className={getMenuClass}
          >
            <FaStore />

            {!collapsed && (
              <span>New Store Openings</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            NSO RULES
        ================================================== */}

        {hasPermission("NSO Rules") && (
          <NavLink
            to="/nso-rules"
            className={getMenuClass}
          >
            <FaBell />

            {!collapsed && (
              <span>NSO Rules</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            EXPENSES
        ================================================== */}

        {hasAnyPermission([
          "Expenses",
          "Expense Entry",
          "Track Expenses",
          "Approve Expenses",
        ]) && (
          <div
            className={`sidebar-group ${
              expenseOpenByPath || expenseOpen
                ? "open"
                : ""
            }`}
          >
            <button
              type="button"
              className={`sidebar-group-toggle ${
                expenseOpenByPath
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setExpenseOpen(
                  (previous) => !previous
                )
              }
              aria-expanded={
                expenseOpen ||
                expenseOpenByPath
              }
            >
              <span className="sidebar-group-content">
                <FaWallet />

                {!collapsed && (
                  <span>Expenses</span>
                )}
              </span>

              {!collapsed && (
                <FaChevronDown
                  className={`submenu-chevron ${
                    expenseOpen ||
                    expenseOpenByPath
                      ? "rotated"
                      : ""
                  }`}
                />
              )}
            </button>

            {!collapsed &&
              (expenseOpen ||
                expenseOpenByPath) && (
                <div className="sidebar-submenu">

                  {/* EXPENSE ENTRY */}

                  {canEnterExpense && (
                    <NavLink
                      to="/expenses/entry"
                      className={({ isActive }) =>
                        `submenu-item ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                    >
                      <FaReceipt />

                      <span>
                        Expense Entry
                      </span>
                    </NavLink>
                  )}

                  {/* TRACK EXPENSES */}

                  {canTrackExpenses && (
                    <NavLink
                      to="/expenses/track"
                      className={({ isActive }) =>
                        `submenu-item ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                    >
                      <FaReceipt />

                      <span>
                        Track Expenses
                      </span>
                    </NavLink>
                  )}

                  {/* APPROVE EXPENSES */}

                  {canApproveExpenses && (
                    <NavLink
                      to="/expenses/approve"
                      className={({ isActive }) =>
                        `submenu-item ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                    >
                      <FaCheckDouble />

                      <span>
                        Approve Expenses
                      </span>
                    </NavLink>
                  )}

                </div>
              )}
          </div>
        )}

        {/* ==================================================
            QUIZ
        ================================================== */}

        {canAccessQuiz && (
          <div
            className={`sidebar-group ${
              quizOpenByPath || quizOpen
                ? "open"
                : ""
            }`}
          >
            <button
              type="button"
              className={`sidebar-group-toggle ${
                quizOpenByPath
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setQuizOpen(
                  (previous) => !previous
                )
              }
              aria-expanded={
                quizOpen ||
                quizOpenByPath
              }
            >
              <span className="sidebar-group-content">
                <FaQuestionCircle />

                {!collapsed && (
                  <span>Quiz</span>
                )}
              </span>

              {!collapsed && (
                <FaChevronDown
                  className={`submenu-chevron ${
                    quizOpen ||
                    quizOpenByPath
                      ? "rotated"
                      : ""
                  }`}
                />
              )}
            </button>

            {!collapsed &&
              (quizOpen ||
                quizOpenByPath) && (
                <div className="sidebar-submenu">

                  {/* TAKE QUIZ */}

                  <NavLink
                    to="/quiz/take"
                    className={({ isActive }) =>
                      `submenu-item ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                  >
                    <FaClipboardCheck />

                    <span>
                      Take Quiz
                    </span>
                  </NavLink>

                  {/* QUIZ SETUP */}

                  <NavLink
                    to="/quiz/setup"
                    className={({ isActive }) =>
                      `submenu-item ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                  >
                    <FaCog />

                    <span>
                      Quiz Setup
                    </span>
                  </NavLink>

                  {/* TRAINING REPORT */}

                  <NavLink
                    to="/quiz/report"
                    className={({ isActive }) =>
                      `submenu-item ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                  >
                    <FaChartBar />

                    <span>
                      Training Report
                    </span>
                  </NavLink>

                  {/* EMAIL SETTING */}

                  <NavLink
                    to="/quiz/email"
                    className={({ isActive }) =>
                      `submenu-item ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                  >
                    <FaEnvelope />

                    <span>
                      Email Setting
                    </span>
                  </NavLink>

                </div>
              )}
          </div>
        )}

        {/* ==================================================
            SETTINGS
        ================================================== */}

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
            className={getMenuClass}
          >
            <FaCog />

            {!collapsed && (
              <span>Settings</span>
            )}
          </NavLink>
        )}

        {/* ==================================================
            PROFILE
        ================================================== */}

        <div className="sidebar-footer">
          <NavLink
            to="/profile"
            className={getMenuClass}
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
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
    FaUsers,
    FaBuilding,
    FaIdBadge,
    FaClipboard,
    FaSitemap,
    FaMoneyBillWave,
    FaImages,
    FaMapMarkedAlt,
    FaMapMarkerAlt,
    FaPlane,
    FaCheckCircle,
    FaChartLine,
    FaListAlt
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

    const pettyCashOpenByPath =
        location.pathname === "/petty-cash" ||
        location.pathname.startsWith("/petty-cash/");

    const quizOpenByPath =
        location.pathname === "/quiz" ||
        location.pathname.startsWith("/quiz/");

    const billingOpenByPath =
        location.pathname === "/billing" ||
        location.pathname.startsWith("/billing/");

    const salesTeamOpenByPath =
        location.pathname === "/visit-planner" ||
        location.pathname === "/travel-plan" ||
        location.pathname === "/travel-plan-approval" ||
        location.pathname === "/sales-review";

    const settingsOpenByPath =
        location.pathname === "/settings" ||
        location.pathname.startsWith("/settings/") ||
        location.pathname === "/users" ||
        location.pathname.startsWith("/users/") ||
        location.pathname === "/departments" ||
        location.pathname.startsWith("/departments/") ||
        location.pathname === "/designations" ||
        location.pathname.startsWith("/designations/") ||
        location.pathname === "/stores" ||
        location.pathname.startsWith("/stores/") ||
        location.pathname === "/questions" ||
        location.pathname.startsWith("/questions/") ||
        location.pathname === "/checklist-types" ||
        location.pathname.startsWith("/checklist-types/") ||
        location.pathname === "/reports-to" ||
        location.pathname.startsWith("/reports-to/");

    // ======================================================
    // MENU OPEN/CLOSE STATE
    // ======================================================

    const [expenseOpen, setExpenseOpen] =
        useState(expenseOpenByPath);

    const [pettyCashOpen, setPettyCashOpen] =
        useState(pettyCashOpenByPath);

    const [quizOpen, setQuizOpen] =
        useState(quizOpenByPath);

    const [billingOpen, setBillingOpen] =
        useState(billingOpenByPath);

    const [salesTeamOpen, setSalesTeamOpen] =
        useState(salesTeamOpenByPath);

    const [settingsOpen, setSettingsOpen] =
        useState(settingsOpenByPath);

    // ======================================================
    // KEEP GROUP OPEN WHEN DIRECT URL IS OPENED
    // ======================================================

    useEffect(() => {
        if (expenseOpenByPath) {
            setExpenseOpen(true);
        }
    }, [expenseOpenByPath]);

    useEffect(() => {
        if (pettyCashOpenByPath) {
            setPettyCashOpen(true);
        }
    }, [pettyCashOpenByPath]);

    useEffect(() => {
        if (quizOpenByPath) {
            setQuizOpen(true);
        }
    }, [quizOpenByPath]);

    useEffect(() => {
        if (billingOpenByPath) {
            setBillingOpen(true);
        }
    }, [billingOpenByPath]);

    useEffect(() => {
        if (salesTeamOpenByPath) {
            setSalesTeamOpen(true);
        }
    }, [salesTeamOpenByPath]);

    useEffect(() => {
        if (settingsOpenByPath) {
            setSettingsOpen(true);
        }
    }, [settingsOpenByPath]);

    // ======================================================
    // RBAC
    // ======================================================

    let user = {};
    let permissions = {};

    try {
        user = JSON.parse(
            localStorage.getItem("user") || "{}"
        );
    } catch {
        user = {};
    }

    try {
        permissions = JSON.parse(
            localStorage.getItem("permissions") || "{}"
        );
    } catch {
        permissions = {};
    }

    const isAdministrator =
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.administrator === "1" ||
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        user?.is_admin === "1";

    // ======================================================
    // PERMISSION HELPERS
    // ======================================================

    const hasPermission = (moduleName) => {
        if (isAdministrator) {
            return true;
        }

        const permission =
            permissions?.[moduleName];

        return [
            "View",
            "Add",
            "Edit",
            "Full"
        ].includes(permission);
    };

    const hasAnyPermission = (moduleNames) => {
        if (isAdministrator) {
            return true;
        }

        return moduleNames.some(
            (moduleName) =>
                [
                    "View",
                    "Add",
                    "Edit",
                    "Full"
                ].includes(
                    permissions?.[moduleName]
                )
        );
    };

    // ======================================================
    // EXPENSE PERMISSIONS
    // ======================================================

    const expensePermission =
        permissions?.Expenses;

    const canEnterExpense =
        isAdministrator ||
        [
            "Add",
            "Edit",
            "Full"
        ].includes(
            expensePermission
        );

    const canTrackExpenses =
        isAdministrator ||
        [
            "View",
            "Add",
            "Edit",
            "Full"
        ].includes(
            expensePermission
        );

    const canApproveExpenses =
        isAdministrator ||
        [
            "Edit",
            "Full"
        ].includes(
            expensePermission
        );

    // ======================================================
    // PETTY CASH PERMISSION
    // ======================================================

    const pettyCashPermission =
        permissions?.["Petty Cash"] ||
        permissions?.Expenses;

    const canAccessPettyCash =
        isAdministrator ||
        ["View", "Add", "Edit", "Full"].includes(pettyCashPermission);


    // ======================================================
    // QUIZ PERMISSION
    // ======================================================

    const canAccessQuiz =
        isAdministrator ||
        hasPermission("Quiz");

    const canAccessBilling =
        isAdministrator ||
        hasPermission("Billing");

    const canAddBilling =
        isAdministrator ||
        ["Add", "Edit", "Full"].includes(permissions?.Billing);

    // ======================================================
    // SALES TEAM PERMISSIONS
    // ======================================================

    const canSalesVisitPlanner = isAdministrator || hasPermission("Visit Planner");
    const canSalesTravelPlan = isAdministrator || hasPermission("Travel Plan");
    const canSalesApprovals = isAdministrator || hasPermission("Travel Plan Approvals");
    const canSalesReview = isAdministrator || hasPermission("Sales Review");
    const canAccessSalesTeam = canSalesVisitPlanner || canSalesTravelPlan || canSalesApprovals || canSalesReview;

    // ======================================================
    // LISTING TRACKER
    // ======================================================

    const canAccessListingTracker =
        isAdministrator ||
        hasPermission("Listing Tracker");

    // ======================================================
    // SETTINGS PERMISSIONS
    // ======================================================

    const canAccessSettings =
        isAdministrator ||
        hasAnyPermission([
            "Users",
            "Departments",
            "Designations",
            "Store Management",
            "Stores",
            "Questions",
            "Checklist Types",
            "Reports To"
        ]);

    const canUsers =
        isAdministrator ||
        hasPermission("Users");

    const canDepartments =
        isAdministrator ||
        hasPermission("Departments");

    const canDesignations =
        isAdministrator ||
        hasPermission("Designations");

    const canStores =
        isAdministrator ||
        hasPermission("Store Management") ||
        hasPermission("Stores");

    const canQuestions =
        isAdministrator ||
        hasPermission("Questions");

    const canChecklistTypes =
        isAdministrator ||
        hasPermission("Checklist Types");

    const canReportsTo =
        isAdministrator ||
        hasPermission("Reports To");

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
                            <span>
                                Dashboard
                            </span>
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
                            <span>
                                Announcements
                            </span>
                        )}
                    </NavLink>
                )}

                {/* ==================================================
                    GALLERY
                ================================================== */}

                {hasPermission("Gallery") && (
                    <NavLink
                        to="/gallery"
                        className={getMenuClass}
                    >
                        <FaImages />

                        {!collapsed && (
                            <span>
                                Gallery
                            </span>
                        )}
                    </NavLink>
                )}

                {/* ==================================================
                    EMPLOYEE LOCATION
                ================================================== */}

                {hasPermission("Employee Location") && (
                    <NavLink
                        to="/employee-location"
                        className={getMenuClass}
                    >
                        <FaMapMarkedAlt />

                        {!collapsed && (
                            <span>
                                Employee Location
                            </span>
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
                            <span>
                                Action Points
                            </span>
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
                            <span>
                                Checklist Reports
                            </span>
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
                            <span>
                                Checklist Submit
                            </span>
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
                            <span>
                                New Store Openings
                            </span>
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
                            <span>
                                NSO Rules
                            </span>
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
                    "Approve Expenses"
                ]) && (
                    <div
                        className={`sidebar-group ${
                            expenseOpenByPath ||
                            expenseOpen
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
                                    (previous) =>
                                        !previous
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
                                    <span>
                                        Expenses
                                    </span>
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
                            (
                                expenseOpen ||
                                expenseOpenByPath
                            ) && (
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
                    PETTY CASH — SEPARATE MODULE
                ================================================== */}

                {canAccessPettyCash && (
                    <div className={`sidebar-group ${pettyCashOpenByPath || pettyCashOpen ? "open" : ""}`}>
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${pettyCashOpenByPath ? "active" : ""}`}
                            onClick={() => setPettyCashOpen((previous) => !previous)}
                            aria-expanded={pettyCashOpen || pettyCashOpenByPath}
                        >
                            <span className="sidebar-group-content">
                                <FaMoneyBillWave />
                                {!collapsed && <span>Petty Cash</span>}
                            </span>
                            {!collapsed && (
                                <FaChevronDown className={`submenu-chevron ${pettyCashOpen || pettyCashOpenByPath ? "rotated" : ""}`} />
                            )}
                        </button>

                        {!collapsed && (pettyCashOpen || pettyCashOpenByPath) && (
                            <div className="sidebar-submenu">
                                <NavLink to="/petty-cash" className={({isActive}) => `submenu-item ${isActive && location.pathname === "/petty-cash" ? "active" : ""}`}>
                                    <FaMoneyBillWave />
                                    <span>Petty Cash Dashboard</span>
                                </NavLink>
                                <NavLink to="/petty-cash/email-settings" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                    <FaEnvelope />
                                    <span>Email Notifications</span>
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================================================
                    BILLING
                ================================================== */}

                {canAccessBilling && (
                    <div
                        className={`sidebar-group ${
                            billingOpenByPath || billingOpen ? "open" : ""
                        }`}
                    >
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${billingOpenByPath ? "active" : ""}`}
                            onClick={() => setBillingOpen(previous => !previous)}
                            aria-expanded={billingOpen || billingOpenByPath}
                        >
                            <span className="sidebar-group-content">
                                <FaMoneyBillWave />
                                {!collapsed && <span>Billing</span>}
                            </span>
                            {!collapsed && (
                                <FaChevronDown
                                    className={`submenu-chevron ${billingOpen || billingOpenByPath ? "rotated" : ""}`}
                                />
                            )}
                        </button>

                        {!collapsed && (billingOpen || billingOpenByPath) && (
                            <div className="sidebar-submenu">
                                {canAddBilling && (
                                    <NavLink to="/billing/entry" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaReceipt />
                                        <span>Billing Entry</span>
                                    </NavLink>
                                )}

                                <NavLink to="/billing/bills" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                    <FaReceipt />
                                    <span>Bills</span>
                                </NavLink>

                                <NavLink to="/billing/daily-report" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                    <FaChartBar />
                                    <span>Daily Report</span>
                                </NavLink>
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
                            quizOpenByPath ||
                            quizOpen
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
                                    (previous) =>
                                        !previous
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
                                    <span>
                                        Quiz
                                    </span>
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
                            (
                                quizOpen ||
                                quizOpenByPath
                            ) && (
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
                    SALES TEAM
                ================================================== */}

                {canAccessSalesTeam && (
                    <div className={`sidebar-group ${salesTeamOpenByPath || salesTeamOpen ? "open" : ""}`}>
                        <button type="button" className={`sidebar-group-toggle ${salesTeamOpenByPath ? "active" : ""}`} onClick={() => setSalesTeamOpen((previous) => !previous)} aria-expanded={salesTeamOpen || salesTeamOpenByPath}>
                            <span className="sidebar-group-content"><FaUsers />{!collapsed && <span>Sales Team</span>}</span>
                            {!collapsed && <FaChevronDown className={`submenu-chevron ${salesTeamOpen || salesTeamOpenByPath ? "rotated" : ""}`} />}
                        </button>
                        {!collapsed && (salesTeamOpen || salesTeamOpenByPath) && (
                            <div className="sidebar-submenu">
                                {canSalesVisitPlanner && <NavLink to="/visit-planner" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaMapMarkerAlt /><span>Visit Planner</span></NavLink>}
                                {canSalesTravelPlan && <NavLink to="/travel-plan" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaPlane /><span>Travel Plan</span></NavLink>}
                                {canSalesApprovals && <NavLink to="/travel-plan-approval" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaCheckCircle /><span>Travel Plan Approvals</span></NavLink>}
                                {canSalesReview && <NavLink to="/sales-review" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaChartLine /><span>Sales Review</span></NavLink>}
                            </div>
                        )}
                    </div>
                )}

                {/* ==================================================
                    LISTING TRACKER
                ================================================== */}

                {canAccessListingTracker && (
                    <NavLink
                        to="/listing-tracker"
                        className={getMenuClass}
                    >
                        <FaListAlt />

                        {!collapsed && (
                            <span>
                                Listing Tracker
                            </span>
                        )}
                    </NavLink>
                )}

                {/* ==================================================
                    SETTINGS
                ================================================== */}

                {canAccessSettings && (
                    <div
                        className={`sidebar-group ${
                            settingsOpenByPath ||
                            settingsOpen
                                ? "open"
                                : ""
                        }`}
                    >

                        {/* SETTINGS HEADER */}

                        <button
                            type="button"
                            className={`sidebar-group-toggle ${
                                settingsOpenByPath
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                setSettingsOpen(
                                    (previous) =>
                                        !previous
                                )
                            }
                            aria-expanded={
                                settingsOpen ||
                                settingsOpenByPath
                            }
                        >

                            <span className="sidebar-group-content">

                                <FaCog />

                                {!collapsed && (
                                    <span>
                                        Settings
                                    </span>
                                )}

                            </span>

                            {!collapsed && (
                                <FaChevronDown
                                    className={`submenu-chevron ${
                                        settingsOpen ||
                                        settingsOpenByPath
                                            ? "rotated"
                                            : ""
                                    }`}
                                />
                            )}

                        </button>

                        {/* SETTINGS SUBMENU */}

                        {!collapsed &&
                            (
                                settingsOpen ||
                                settingsOpenByPath
                            ) && (
                                <div className="sidebar-submenu">

                                    {/* USERS */}

                                    {canUsers && (
                                        <NavLink
                                            to="/settings/users"
                                            className={({ isActive }) =>
                                                `submenu-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >
                                            <FaUsers />

                                            <span>
                                                Users
                                            </span>
                                        </NavLink>
                                    )}

                                    {/* DEPARTMENTS */}

                                    {canDepartments && (
                                        <NavLink
                                            to="/settings/departments"
                                            className={({ isActive }) =>
                                                `submenu-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >
                                            <FaBuilding />

                                            <span>
                                                Departments
                                            </span>
                                        </NavLink>
                                    )}

                                    {/* DESIGNATIONS */}

                                    {canDesignations && (
                                        <NavLink
                                            to="/settings/designations"
                                            className={({ isActive }) =>
                                                `submenu-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >
                                            <FaIdBadge />

                                            <span>
                                                Designations
                                            </span>
                                        </NavLink>
                                    )}

                                    {/* STORE MANAGEMENT */}

                                    {canStores && (
                                        <NavLink
                                            to="/settings/stores"
                                            className={({ isActive }) =>
                                                `submenu-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >
                                            <FaStore />

                                            <span>
                                                Store Management
                                            </span>
                                        </NavLink>
                                    )}

                                    {/* QUESTIONS */}

                                    {canQuestions && (
                                        <NavLink
                                            to="/settings/questions"
                                            className={({ isActive }) =>
                                                `submenu-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >
                                            <FaQuestionCircle />

                                            <span>
                                                Questions
                                            </span>
                                        </NavLink>
                                    )}

                                    {/* CHECKLIST TYPES */}

                                    {canChecklistTypes && (
                                        <NavLink
                                            to="/settings/checklist-types"
                                            className={({ isActive }) =>
                                                `submenu-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >
                                            <FaClipboard />

                                            <span>
                                                Checklist Types
                                            </span>
                                        </NavLink>
                                    )}

                                    {/* REPORTS TO */}

                                    {canReportsTo && (
                                        <NavLink
                                            to="/settings/reports-to"
                                            className={({ isActive }) =>
                                                `submenu-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >
                                            <FaSitemap />

                                            <span>
                                                Reports To
                                            </span>
                                        </NavLink>
                                    )}

                                </div>
                            )}

                    </div>
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
                            <span>
                                Profile
                            </span>
                        )}
                    </NavLink>

                </div>

            </nav>
        </aside>
    );
}

export default Sidebar;
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
    FaMoneyCheckAlt,
    FaImages,
    FaMapMarkedAlt,
    FaMapMarkerAlt,
    FaPlane,
    FaCheckCircle,
    FaChartLine,
    FaListAlt,
    FaCalendarCheck,
    FaBoxes,
    FaBalanceScale,
    FaCloudUploadAlt,
    FaTags,
    FaPlus,
    FaComments
} from "react-icons/fa";

import "../../styles/layout/Sidebar.css";

function Sidebar({ collapsed }) {
    const location = useLocation();

    // ======================================================
    // PATH DETECTION
    // ======================================================

    const assetMasterOpenByPath =
        location.pathname === "/asset-management" ||
        location.pathname === "/legal-assets";

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

    const dailyCollectionOpenByPath =
        location.pathname === "/daily-collection" ||
        location.pathname.startsWith("/daily-collection/");

    const salesTeamOpenByPath =
        location.pathname === "/visit-planner" ||
        location.pathname === "/travel-plan" ||
        location.pathname === "/travel-plan-approval" ||
        location.pathname === "/sales-review";

    const inventoryPlanningOpenByPath =
        location.pathname === "/inventory-planning" ||
        location.pathname.startsWith("/inventory-planning/");

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

    const [assetMasterOpen, setAssetMasterOpen] =
        useState(assetMasterOpenByPath);

    const [expenseOpen, setExpenseOpen] =
        useState(expenseOpenByPath);

    const [pettyCashOpen, setPettyCashOpen] =
        useState(pettyCashOpenByPath);

    const [quizOpen, setQuizOpen] =
        useState(quizOpenByPath);

    const [billingOpen, setBillingOpen] =
        useState(billingOpenByPath);

    const [dailyCollectionOpen, setDailyCollectionOpen] =
        useState(dailyCollectionOpenByPath);

    const [salesTeamOpen, setSalesTeamOpen] =
        useState(salesTeamOpenByPath);

    const [inventoryPlanningOpen, setInventoryPlanningOpen] =
        useState(inventoryPlanningOpenByPath);

    const [settingsOpen, setSettingsOpen] =
        useState(settingsOpenByPath);

    // Collection Tracking has its own toggle state so its arrow
    // behaves exactly like every other expandable sidebar group.
    const collectionTrackingOpenByPath =
        location.pathname.startsWith("/collection-tracking");

    const [collectionTrackingOpen, setCollectionTrackingOpen] =
        useState(collectionTrackingOpenByPath);

    useEffect(() => {
        if (collectionTrackingOpenByPath) {
            setCollectionTrackingOpen(true);
        }
    }, [collectionTrackingOpenByPath]);

    useEffect(() => {
        if (assetMasterOpenByPath) {
            setAssetMasterOpen(true);
        }
    }, [assetMasterOpenByPath]);

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
        if (dailyCollectionOpenByPath) {
            setDailyCollectionOpen(true);
        }
    }, [dailyCollectionOpenByPath]);

    useEffect(() => {
        if (salesTeamOpenByPath) setSalesTeamOpen(true);
    }, [salesTeamOpenByPath]);

    useEffect(() => {
        if (inventoryPlanningOpenByPath) setInventoryPlanningOpen(true);
    }, [inventoryPlanningOpenByPath]);

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

    const hasFullAttendanceAccess =
        isAdministrator || permissions?.["Attendance"] === "Full";

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

    const canAccessDailyCollection =
        isAdministrator ||
        hasPermission("Daily Collection");

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

    const canAccessInventoryPlanning =
        isAdministrator ||
        hasPermission("Inventory Planning");

    const canAccessCollectionTracking =
        isAdministrator ||
        hasPermission("Collection Tracking");

    // ==================================================
    // TEAM CHAT
    // ==================================================

    const canAccessChat =
        isAdministrator ||
        hasPermission("Chat");

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
                    ASSET MASTER
                ================================================== */}

                {hasPermission("Asset Master") && (
                    <div className={`sidebar-group ${assetMasterOpen ? "open" : ""}`}>
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${assetMasterOpen ? "active" : ""}`}
                            onClick={() => setAssetMasterOpen((previous) => !previous)}
                            aria-expanded={assetMasterOpen}
                        >
                            <span className="sidebar-group-content">
                                <FaBoxes />
                                {!collapsed && <span>Asset Master</span>}
                            </span>
                            {!collapsed && (
                                <FaChevronDown className={`submenu-chevron ${assetMasterOpen ? "rotated" : ""}`} />
                            )}
                        </button>

                        {!collapsed && assetMasterOpen && (
                            <div className="sidebar-submenu">
                                <NavLink to="/asset-management" className={({ isActive }) => `submenu-item ${isActive ? "active" : ""}`}>
                                    <FaImages />
                                    <span>Marketing Assets</span>
                                </NavLink>
                                <NavLink to="/legal-assets" className={({ isActive }) => `submenu-item ${isActive ? "active" : ""}`}>
                                    <FaBalanceScale />
                                    <span>Legal Assets</span>
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================================================
                    ATTENDANCE
                ================================================== */}

                <div className={`sidebar-group ${
                    location.pathname === "/attendance" || location.pathname === "/attendance-reports" ? "open" : ""
                }`}>
                    <NavLink
                        to="/attendance"
                        className={getMenuClass}
                    >
                        <FaCalendarCheck />
                        {!collapsed && <span>Attendance</span>}
                    </NavLink>
                    {!collapsed && hasFullAttendanceAccess && (
                        <div className="sidebar-submenu">
                            <NavLink
                                to="/attendance-reports"
                                className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}
                            >
                                <FaChartBar /><span>Attendance Reports</span>
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* ==================================================
                    EMPLOYEE LOCATION
                ================================================== */}

                {isAdministrator && hasPermission("Employee Location") && (
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
                    TEAM CHAT
                ================================================== */}

                {canAccessChat && (
                    <NavLink
                        to="/chat"
                        className={getMenuClass}
                    >
                        <FaComments />

                        {!collapsed && (
                            <span>
                                Chat
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
                            className={`sidebar-group-toggle ${expenseOpen ? "active" : ""}`}
                            onClick={() =>
                                setExpenseOpen(
                                    (previous) =>
                                        !previous
                                )
                            }
                            aria-expanded={expenseOpen}
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
                                    className={`submenu-chevron ${expenseOpen ? "rotated" : ""}`}
                                />
                            )}
                        </button>

                        {!collapsed && expenseOpen && (
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
                    <div className={`sidebar-group ${pettyCashOpen ? "open" : ""}`}>
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${pettyCashOpen ? "active" : ""}`}
                            onClick={() => setPettyCashOpen((previous) => !previous)}
                            aria-expanded={pettyCashOpen}
                        >
                            <span className="sidebar-group-content">
                                <FaMoneyBillWave />
                                {!collapsed && <span>Petty Cash</span>}
                            </span>
                            {!collapsed && (
                                <FaChevronDown className={`submenu-chevron ${pettyCashOpen ? "rotated" : ""}`} />
                            )}
                        </button>

                        {!collapsed && pettyCashOpen && (
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
                        className={`sidebar-group ${billingOpen ? "open" : ""}`}
                    >
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${billingOpen ? "active" : ""}`}
                            onClick={() => setBillingOpen(previous => !previous)}
                            aria-expanded={billingOpen}
                        >
                            <span className="sidebar-group-content">
                                <FaMoneyBillWave />
                                {!collapsed && <span>Billing</span>}
                            </span>
                            {!collapsed && (
                                <FaChevronDown
                                    className={`submenu-chevron ${billingOpen ? "rotated" : ""}`}
                                />
                            )}
                        </button>

                        {!collapsed && billingOpen && (
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
                    DAILY COLLECTION — SEPARATE MODULE
                ================================================== */}

                {canAccessDailyCollection && (
                    <div className={`sidebar-group ${dailyCollectionOpen ? "open" : ""}`}>
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${dailyCollectionOpen ? "active" : ""}`}
                            onClick={() => setDailyCollectionOpen((previous) => !previous)}
                            aria-expanded={dailyCollectionOpen}
                        >
                            <span className="sidebar-group-content">
                                <FaMoneyCheckAlt />
                                {!collapsed && <span>Daily Collection</span>}
                            </span>
                            {!collapsed && (
                                <FaChevronDown className={`submenu-chevron ${dailyCollectionOpen ? "rotated" : ""}`} />
                            )}
                        </button>

                        {!collapsed && dailyCollectionOpen && (
                            <div className="sidebar-submenu">
                                <NavLink to="/daily-collection" className={({isActive}) => `submenu-item ${isActive && location.pathname === "/daily-collection" ? "active" : ""}`}>
                                    <FaMoneyCheckAlt />
                                    <span>Daily Entry</span>
                                </NavLink>
                                <NavLink to="/daily-collection/report" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                    <FaChartBar />
                                    <span>Daily Data Report</span>
                                </NavLink>
                                <NavLink to="/daily-collection/reports" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                    <FaChartLine />
                                    <span>Collection Reports</span>
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
                        className={`sidebar-group ${quizOpen ? "open" : ""}`}
                    >
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${quizOpen ? "active" : ""}`}
                            onClick={() =>
                                setQuizOpen(
                                    (previous) =>
                                        !previous
                                )
                            }
                            aria-expanded={quizOpen}
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
                                    className={`submenu-chevron ${quizOpen ? "rotated" : ""}`}
                                />
                            )}

                        </button>

                        {!collapsed && quizOpen && (
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
                    <div className={`sidebar-group ${salesTeamOpen ? "open" : ""}`}>
                        <button type="button" className={`sidebar-group-toggle ${salesTeamOpen ? "active" : ""}`} onClick={() => setSalesTeamOpen((previous) => !previous)} aria-expanded={salesTeamOpen}>
                            <span className="sidebar-group-content"><FaUsers />{!collapsed && <span>Sales Team</span>}</span>
                            {!collapsed && <FaChevronDown className={`submenu-chevron ${salesTeamOpen ? "rotated" : ""}`} />}
                        </button>
                        {!collapsed && salesTeamOpen && (
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
                    INVENTORY PLANNING
                ================================================== */}

                {canAccessInventoryPlanning && (
                    <div className={`sidebar-group ${inventoryPlanningOpen ? "open" : ""}`}>
                        <button type="button" className={`sidebar-group-toggle ${inventoryPlanningOpen ? "active" : ""}`} onClick={() => setInventoryPlanningOpen(v => !v)} aria-expanded={inventoryPlanningOpen}>
                            <span className="sidebar-group-content"><FaBoxes />{!collapsed && <span>Inventory Planning</span>}</span>
                            {!collapsed && <FaChevronDown className={`submenu-chevron ${inventoryPlanningOpen ? "rotated" : ""}`} />}
                        </button>
                        {!collapsed && inventoryPlanningOpen && (
                            <div className="sidebar-submenu">
                                <NavLink to="/inventory-planning/erp-upload" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaCloudUploadAlt /><span>ERP Data Upload</span></NavLink>
                                <NavLink to="/inventory-planning" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaChartLine /><span>Inventory Planning</span></NavLink>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================================================
                    COLLECTION TRACKING
                ================================================== */}
                {canAccessCollectionTracking && (
                    <div
                        className={`sidebar-group ${
                            collectionTrackingOpen ? "open" : ""
                        }`}
                    >
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${
                                collectionTrackingOpenByPath
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                setCollectionTrackingOpen(
                                    (previous) => !previous
                                )
                            }
                            aria-expanded={collectionTrackingOpen}
                            aria-controls="collection-tracking-submenu"
                        >
                            <span className="sidebar-group-content">
                                <FaTags />
                                {!collapsed && (
                                    <span>Collection Tracking</span>
                                )}
                            </span>

                            {!collapsed && (
                                <FaChevronDown
                                    className={`submenu-chevron ${
                                        collectionTrackingOpen
                                            ? "rotated"
                                            : ""
                                    }`}
                                />
                            )}
                        </button>

                        {!collapsed && collectionTrackingOpen && (
                            <div
                                id="collection-tracking-submenu"
                                className="sidebar-submenu"
                            >
                                <NavLink
                                    to="/collection-tracking/add-products"
                                    className={({ isActive }) =>
                                        `submenu-item ${
                                            isActive ? "active" : ""
                                        }`
                                    }
                                >
                                    <FaPlus />
                                    <span>Add Products</span>
                                </NavLink>

                                <NavLink
                                    to="/collection-tracking"
                                    end
                                    className={({ isActive }) =>
                                        `submenu-item ${
                                            isActive ? "active" : ""
                                        }`
                                    }
                                >
                                    <FaBoxes />
                                    <span>SKU Details</span>
                                </NavLink>

                                <NavLink
                                    to="/collection-tracking/insight"
                                    className={({ isActive }) =>
                                        `submenu-item ${
                                            isActive ? "active" : ""
                                        }`
                                    }
                                >
                                    <FaChartBar />
                                    <span>Insight</span>
                                </NavLink>

                                <NavLink
                                    to="/collection-tracking/requests"
                                    className={({ isActive }) =>
                                        `submenu-item ${
                                            isActive ? "active" : ""
                                        }`
                                    }
                                >
                                    <FaEnvelope />
                                    <span>Requests</span>
                                </NavLink>

                                <NavLink
                                    to="/collection-tracking/permissions"
                                    className={({ isActive }) =>
                                        `submenu-item ${
                                            isActive ? "active" : ""
                                        }`
                                    }
                                >
                                    <FaCheckDouble />
                                    <span>Collection Permissions</span>
                                </NavLink>

                                <NavLink
                                    to="/collection-tracking/master-data"
                                    className={({ isActive }) =>
                                        `submenu-item ${
                                            isActive ? "active" : ""
                                        }`
                                    }
                                >
                                    <FaClipboard />
                                    <span>Master Data</span>
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================================================
                    SETTINGS
                ================================================== */}

                {canAccessSettings && (
                    <div
                        className={`sidebar-group ${settingsOpen ? "open" : ""}`}
                    >

                        {/* SETTINGS HEADER */}

                        <button
                            type="button"
                            className={`sidebar-group-toggle ${settingsOpen ? "active" : ""}`}
                            onClick={() =>
                                setSettingsOpen(
                                    (previous) =>
                                        !previous
                                )
                            }
                            aria-expanded={settingsOpen}
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
                                    className={`submenu-chevron ${settingsOpen ? "rotated" : ""}`}
                                />
                            )}

                        </button>

                        {/* SETTINGS SUBMENU */}

                        {!collapsed && settingsOpen && (
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
                                            to="/settings/hierarchy"
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
                                                Hierarchy
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
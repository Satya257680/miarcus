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
    FaComments,
    FaLifeRing,
    FaKey
} from "react-icons/fa";

import InstallAppButton from "../InstallAppButton";
import { useRbacVersion } from "../../hooks/usePermission";
import { canAccessPage, isAdministratorUser } from "../../utils/rbac";

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
    //
    // Every menu item is tied to a PAGE key from
    // config/rbacCatalog.js. A page is shown only when:
    //   • the module level is at least View (or the page's
    //     minimum, e.g. Expense Entry needs Add), and
    //   • the page has not been switched off for this user.
    // Module = None  →  the whole group disappears.
    // Administrator  →  everything is visible.
    //
    // useRbacVersion() re-renders the sidebar as soon as the
    // server reports new permissions (no logout needed).
    // ======================================================

    useRbacVersion();

    const isAdministrator = isAdministratorUser();

    const can = (pageKey) => canAccessPage(pageKey);

    const canAny = (...pageKeys) => pageKeys.some((key) => can(key));

    // Overview
    const canDashboard = can("dashboard.home");
    const canAnnouncements = can("announcements.list");
    const canGallery = can("gallery.library");
    const canAccessChat = can("chat.messages");

    // Asset Master
    const canMarketingAssets = can("assets.marketing");
    const canLegalAssets = can("assets.legal");
    const canAccessAssetMaster = canMarketingAssets || canLegalAssets;

    // Attendance
    const canAttendance = can("attendance.mark");
    const hasFullAttendanceAccess = can("attendance.reports");
    const canAccessAttendance = canAttendance || hasFullAttendanceAccess;

    // Operations
    const canEmployeeLocation = can("location.live");
    const canActionPoints = can("actionpoints.list");
    const canChecklistReports = can("checklist.reports");
    const canChecklistSubmit = can("checklist.submit");
    const canNewStoreOpenings = can("nso.openings");
    const canNsoRules = can("nso.rules");

    // Expenses
    const canEnterExpense = can("expenses.entry");
    const canTrackExpenses = can("expenses.track");
    const canApproveExpenses = can("expenses.approve");
    const canAccessExpenses = canEnterExpense || canTrackExpenses || canApproveExpenses;

    // Petty Cash
    const canPettyCashDashboard = can("pettycash.dashboard");
    const canPettyCashEmail = can("pettycash.email");
    const canAccessPettyCash = canPettyCashDashboard || canPettyCashEmail;

    // Billing
    const canAddBilling = can("billing.entry");
    const canBills = can("billing.bills");
    const canBillingDaily = can("billing.daily");
    const canAccessBilling = canAddBilling || canBills || canBillingDaily;

    // Daily Collection
    const canDailyEntry = can("dailycollection.entry");
    const canDailyData = can("dailycollection.data");
    const canDailyReports = can("dailycollection.reports");
    const canAccessDailyCollection = canDailyEntry || canDailyData || canDailyReports;

    // Quiz
    const canTakeQuiz = can("quiz.take");
    const canQuizSetup = can("quiz.setup");
    const canQuizReport = can("quiz.report");
    const canQuizEmail = can("quiz.email");
    const canAccessQuiz = canTakeQuiz || canQuizSetup || canQuizReport || canQuizEmail;

    // Sales Team
    const canSalesVisitPlanner = can("sales.visit");
    const canSalesTravelPlan = can("sales.travel");
    const canSalesApprovals = can("sales.approvals");
    const canSalesReview = can("sales.review");
    const canAccessSalesTeam = canSalesVisitPlanner || canSalesTravelPlan || canSalesApprovals || canSalesReview;

    // Merchandising & Inventory
    const canAccessListingTracker = can("listing.tracker");
    const canErpUpload = can("inventory.erp");
    const canInventoryPlanning = can("inventory.planning");
    const canAccessInventoryPlanning = canErpUpload || canInventoryPlanning;

    const canCollectionAdd = can("collection.add");
    const canCollectionSku = can("collection.sku");
    const canCollectionInsight = can("collection.insight");
    const canCollectionRequests = can("collection.requests");
    const canCollectionPermissions = can("collection.permissions");
    const canCollectionMaster = can("collection.master");
    const canAccessCollectionTracking = canAny(
        "collection.add",
        "collection.sku",
        "collection.insight",
        "collection.requests",
        "collection.permissions",
        "collection.master"
    );

    // Settings
    const canUsers = can("settings.users");
    const canDepartments = can("settings.departments");
    const canDesignations = can("settings.designations");
    const canStores = can("settings.stores");
    const canQuestions = can("settings.questions");
    const canChecklistTypes = can("settings.checklisttypes");
    const canReportsTo = can("settings.hierarchy");
    const canAccessSettings =
        canUsers || canDepartments || canDesignations || canStores ||
        canQuestions || canChecklistTypes || canReportsTo;

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
            <div className="sidebar-nav-scroll">
                <nav>

                {/* ==================================================
                    DASHBOARD
                ================================================== */}

                {canDashboard && (
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

                {canAnnouncements && (
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

                {canGallery && (
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

                {canAccessAssetMaster && (
                    <div className={`sidebar-group ${assetMasterOpen ? "open" : ""}`}>
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${assetMasterOpenByPath ? "has-active" : ""} ${assetMasterOpen ? "is-open" : ""}`}
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
                                {canMarketingAssets && (
                                    <NavLink to="/asset-management" className={({ isActive }) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaImages />
                                        <span>Marketing Assets</span>
                                    </NavLink>
                                )}
                                {canLegalAssets && (
                                    <NavLink to="/legal-assets" className={({ isActive }) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaBalanceScale />
                                        <span>Legal Assets</span>
                                    </NavLink>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ==================================================
                    ATTENDANCE
                ================================================== */}

                {canAccessAttendance && (
                <div className={`sidebar-group ${
                    location.pathname === "/attendance" || location.pathname === "/attendance-reports" ? "open" : ""
                }`}>
                    <NavLink
                        to={canAttendance ? "/attendance" : "/attendance-reports"}
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
                )}

                {/* ==================================================
                    EMPLOYEE LOCATION
                ================================================== */}

                {canEmployeeLocation && (
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
                    PASSWORD MANAGEMENT
                    (Administrators / Super Admin only)

                    Every user's password is created and managed by
                    an administrator here — this is also where a
                    forgotten password gets reset, since self-service
                    "Forgot Password" is disabled for everyone except
                    the Super Admin account.
                ================================================== */}

                {isAdministrator && (
                    <NavLink
                        to="/settings/password-management"
                        className={getMenuClass}
                    >
                        <FaKey />

                        {!collapsed && (
                            <span>
                                Password Management
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
                    24×7 HELP CENTER
                ================================================== */}
                <NavLink
                    to="/help-center"
                    className={getMenuClass}
                >
                    <FaLifeRing />
                    {!collapsed && <span>Help Center</span>}
                </NavLink>

                {/* ==================================================
                    ACTION POINTS
                ================================================== */}

                {canActionPoints && (
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

                {canChecklistReports && (
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

                {canChecklistSubmit && (
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

                {canNewStoreOpenings && (
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

                {canNsoRules && (
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

                {canAccessExpenses && (
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
                            className={`sidebar-group-toggle ${expenseOpenByPath ? "has-active" : ""} ${expenseOpen ? "is-open" : ""}`}
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
                            className={`sidebar-group-toggle ${pettyCashOpenByPath ? "has-active" : ""} ${pettyCashOpen ? "is-open" : ""}`}
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
                                {canPettyCashDashboard && (
                                    <NavLink to="/petty-cash" className={({isActive}) => `submenu-item ${isActive && location.pathname === "/petty-cash" ? "active" : ""}`}>
                                        <FaMoneyBillWave />
                                        <span>Petty Cash Dashboard</span>
                                    </NavLink>
                                )}
                                {canPettyCashEmail && (
                                    <NavLink to="/petty-cash/email-settings" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaEnvelope />
                                        <span>Email Notifications</span>
                                    </NavLink>
                                )}
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
                            className={`sidebar-group-toggle ${billingOpenByPath ? "has-active" : ""} ${billingOpen ? "is-open" : ""}`}
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

                                {canBills && (
                                    <NavLink to="/billing/bills" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaReceipt />
                                        <span>Bills</span>
                                    </NavLink>
                                )}

                                {canBillingDaily && (
                                    <NavLink to="/billing/daily-report" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaChartBar />
                                        <span>Daily Report</span>
                                    </NavLink>
                                )}

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
                            className={`sidebar-group-toggle ${dailyCollectionOpenByPath ? "has-active" : ""} ${dailyCollectionOpen ? "is-open" : ""}`}
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
                                {canDailyEntry && (
                                    <NavLink to="/daily-collection" className={({isActive}) => `submenu-item ${isActive && location.pathname === "/daily-collection" ? "active" : ""}`}>
                                        <FaMoneyCheckAlt />
                                        <span>Daily Entry</span>
                                    </NavLink>
                                )}
                                {canDailyData && (
                                    <NavLink to="/daily-collection/report" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaChartBar />
                                        <span>Daily Data Report</span>
                                    </NavLink>
                                )}
                                {canDailyReports && (
                                    <NavLink to="/daily-collection/reports" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}>
                                        <FaChartLine />
                                        <span>Collection Reports</span>
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
                        className={`sidebar-group ${quizOpen ? "open" : ""}`}
                    >
                        <button
                            type="button"
                            className={`sidebar-group-toggle ${quizOpenByPath ? "has-active" : ""} ${quizOpen ? "is-open" : ""}`}
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

                                    {canTakeQuiz && (
    
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

                                    )}

                                    {/* QUIZ SETUP */}

                                    {canQuizSetup && (
    
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

                                    )}

                                    {/* TRAINING REPORT */}

                                    {canQuizReport && (
    
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

                                    )}

                                    {/* EMAIL SETTING */}

                                    {canQuizEmail && (
    
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

                                    )}

                                </div>
                            )}
                    </div>
                )}

                {/* ==================================================
                    SALES TEAM
                ================================================== */}

                {canAccessSalesTeam && (
                    <div className={`sidebar-group ${salesTeamOpen ? "open" : ""}`}>
                        <button type="button" className={`sidebar-group-toggle ${salesTeamOpenByPath ? "has-active" : ""} ${salesTeamOpen ? "is-open" : ""}`} onClick={() => setSalesTeamOpen((previous) => !previous)} aria-expanded={salesTeamOpen}>
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
                        <button type="button" className={`sidebar-group-toggle ${inventoryPlanningOpenByPath ? "has-active" : ""} ${inventoryPlanningOpen ? "is-open" : ""}`} onClick={() => setInventoryPlanningOpen(v => !v)} aria-expanded={inventoryPlanningOpen}>
                            <span className="sidebar-group-content"><FaBoxes />{!collapsed && <span>Inventory Planning</span>}</span>
                            {!collapsed && <FaChevronDown className={`submenu-chevron ${inventoryPlanningOpen ? "rotated" : ""}`} />}
                        </button>
                        {!collapsed && inventoryPlanningOpen && (
                            <div className="sidebar-submenu">
                                {canErpUpload && <NavLink to="/inventory-planning/erp-upload" className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaCloudUploadAlt /><span>ERP Data Upload</span></NavLink>}
                                {canInventoryPlanning && <NavLink to="/inventory-planning" end className={({isActive}) => `submenu-item ${isActive ? "active" : ""}`}><FaChartLine /><span>Inventory Planning</span></NavLink>}
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
                                    ? "has-active"
                                    : ""
                            } ${collectionTrackingOpen ? "is-open" : ""}`}
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
                                {canCollectionAdd && (
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
                                )}

                                {canCollectionSku && (
    
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

                                )}

                                {canCollectionInsight && (
    
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

                                )}

                                {canCollectionRequests && (
    
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

                                )}

                                {canCollectionPermissions && (
    
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

                                )}

                                {canCollectionMaster && (
    
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

                                )}
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
                            className={`sidebar-group-toggle ${settingsOpenByPath ? "has-active" : ""} ${settingsOpen ? "is-open" : ""}`}
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

                    {/* ==============================================
                        INSTALL AS APP
                        Optional — lets anybody install Miarcus as a
                        standalone app from their browser. Renders
                        nothing once it's already installed.
                    ============================================== */}

                    <InstallAppButton
                        variant="sidebar"
                        collapsed={collapsed}
                    />

                </div>

                </nav>
            </div>

            <div className="sidebar-branding">
                <img
                    src="/miarcus-logo.png"
                    alt="MIARCUS"
                    className="sidebar-branding-logo"
                />
                <div className="sidebar-branding-copy">
                    <strong>MIARCUS</strong>
                    <span>Retail operations, all in one place</span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
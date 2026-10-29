import { lazy, Suspense } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

// ======================================================
// LAYOUT
// ======================================================
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import ModulePermissionRoute from "./components/layout/ModulePermissionRoute";
const PettyCashEmailSettings = lazy(() => import("./pages/PettyCash/PettyCashEmailSettings"));

// ======================================================
// PUBLIC PAGES
// ======================================================
import Landing from "./pages/Landing";
import Login from "./pages/Login";
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ActivateAccount = lazy(() => import("./pages/ActivateAccount"));

// NEW: PUBLIC LEGAL PAGES
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));

// ======================================================
// DASHBOARD
// ======================================================
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard/Dashboard"));
const DashboardAnalytics = lazy(() => import("./pages/Dashboard/Dashboard/DashboardAnalytics"));

// ======================================================
// CHECKLIST
// ======================================================
const ChecklistSubmission = lazy(() => import("./pages/ChecklistSubmission"));
const ChecklistAccessControl = lazy(() => import("./pages/ChecklistAccessControl"));
const ChecklistReports = lazy(() => import("./pages/ChecklistReports"));
const ChecklistTracker = lazy(() => import("./pages/ChecklistTracker"));
const ActionPoints = lazy(() => import("./pages/ActionPoints"));
const CompletedActionPoints = lazy(() => import("./pages/CompletedActionPoints"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Gallery = lazy(() => import("./pages/Gallery"));
const GalleryMobile = lazy(() => import("./pages/GalleryMobile"));
const EmployeeLocation = lazy(() => import("./pages/EmployeeLocation"));
const EmployeeLocationReports = lazy(() => import("./pages/EmployeeLocationReports"));

// ======================================================
// ADMIN / SETTINGS MODULES
// ======================================================
const Users = lazy(() => import("./pages/Users"));
const FilterAccess = lazy(() => import("./pages/FilterAccess"));
const PasswordManagement = lazy(() => import("./pages/PasswordManagement"));
const StoreStatus = lazy(() => import("./pages/StoreStatus"));
const Departments = lazy(() => import("./pages/Departments"));
const Designations = lazy(() => import("./pages/Designations"));
const StoreManagement = lazy(() => import("./pages/StoreManagement"));
const ChecklistTypes = lazy(() => import("./pages/ChecklistTypes"));
const Questions = lazy(() => import("./pages/Questions"));
const ReportsTo = lazy(() => import("./pages/ReportsTo"));

// ======================================================
// NEW STORE OPENING
// ======================================================
const NSORules = lazy(() => import("./pages/NSORules"));
const IssueControlCenter = lazy(() => import("./pages/IssueControlCenter"));
const NewStoreOpenings = lazy(() => import("./pages/NewStoreOpenings"));
const NSOTracking = lazy(() => import("./pages/NSOTracking"));

// ======================================================
// PROFILE & SETTINGS
// ======================================================
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Appearance = lazy(() => import("./pages/Settings/Appearance"));
const NSOEmailSettings = lazy(() => import("./pages/Settings/NSOEmailSettings"));
const DailyCollectionEmailSettings = lazy(() => import("./pages/Settings/DailyCollectionEmailSettings"));
const BlockedStores = lazy(() => import("./pages/DailyCollection/BlockedStores"));
const NSOTrackingDetails = lazy(() => import("./pages/NSOTrackingDetails"));
const NSOTrackingEdit = lazy(() => import("./pages/NSOTrackingEdit"));
const ChecklistEmailSettings = lazy(() => import("./pages/Settings/ChecklistEmailSettings"));
const ActionPointEmailSettings = lazy(() => import("./pages/Settings/ActionPointEmailSettings"));
const TravelPlanEmailSettings = lazy(() => import("./pages/Settings/TravelPlanEmailSettings"));

// ======================================================
// ACTIVITY CENTER
// ======================================================
const ActivityCenter = lazy(() => import("./pages/ActivityCenter/ActivityCenter"));
const ActivityDetails = lazy(() => import("./pages/ActivityCenter/ActivityDetails"));

// ======================================================
// QUIZ
// ======================================================
const QuizSetup = lazy(() => import("./pages/Quiz/QuizSetup"));
const TakeQuiz = lazy(() => import("./pages/Quiz/TakeQuiz"));
const TrainingReport = lazy(() => import("./pages/Quiz/TrainingReport"));
const EmailSettings = lazy(() => import("./pages/Quiz/EmailSettings"));
const PublicQuiz = lazy(() => import("./pages/Quiz/PublicQuiz"));
const LearningDevelopment = lazy(() => import("./pages/LearningDevelopment"));
const LndAccessControl = lazy(() => import("./pages/LndAccessControl"));
const LndManage = lazy(() => import("./pages/LndManage"));

// ======================================================
// EXPENSES
// ======================================================
const ExpenseEntry = lazy(() => import("./pages/Expenses/ExpensesEntry"));
const TrackExpenses = lazy(() => import("./pages/Expenses/TrackExpenses"));
const ApproveExpenses = lazy(() => import("./pages/Expenses/ApproveExpenses"));
const PettyCash = lazy(() => import("./pages/PettyCash/PettyCash"));
const PettyCashDetail = lazy(() => import("./pages/PettyCash/PettyCashDetail"));
const PettyCashAdvanceForm = lazy(() => import("./pages/PettyCash/PettyCashAdvanceForm"));
const PettyCashRegisters = () => import("./pages/PettyCash/PettyCashRegisters");
const PettyCashExpenses = lazy(() => PettyCashRegisters().then((m) => ({ default: m.PettyCashExpenses })));
const PettyCashDeposits = lazy(() => PettyCashRegisters().then((m) => ({ default: m.PettyCashDeposits })));
const PettyCashAuditTrail = lazy(() => PettyCashRegisters().then((m) => ({ default: m.PettyCashAuditTrail })));

// ======================================================
// BILLING
// ======================================================
const BillingEntry = lazy(() => import("./pages/Billing/BillingEntry"));
const Bills = lazy(() => import("./pages/Billing/Bills"));
const DailyBillingReport = lazy(() => import("./pages/Billing/DailyBillingReport"));
const DailyCollection = lazy(() => import("./pages/Billing/DailyCollection"));
const DailyCollectionReport = lazy(() => import("./pages/DailyCollection/DailyCollectionReport"));
const CollectionReports = lazy(() => import("./pages/DailyCollection/CollectionReports"));
const BillingAudit = lazy(() => import("./pages/Billing/BillingAudit"));
const VisitPlanner = lazy(() => import("./pages/SalesTeam/VisitPlanner"));
const TravelPlan = lazy(() => import("./pages/SalesTeam/TravelPlan"));
const TravelPlanApprovals = lazy(() => import("./pages/SalesTeam/TravelPlanApprovals"));
const SalesReview = lazy(() => import("./pages/SalesTeam/SalesReview"));
const ListingTracker = lazy(() => import("./pages/ListingTracker"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AttendanceReports = lazy(() => import("./pages/AttendanceReports"));
const AssetManagement = lazy(() => import("./pages/AssetManagement"));
const ERPDataUpload = lazy(() => import("./pages/InventoryPlanning/ERPDataUpload"));
const InventoryPlanning = lazy(() => import("./pages/InventoryPlanning/InventoryPlanning"));
const CollectionModule = () => import("./pages/CollectionTracking/CollectionTracking");
const CollectionTracking = lazy(() => CollectionModule().then((m) => ({ default: m.ProductList })));
const CollectionAddProduct = lazy(() => CollectionModule().then((m) => ({ default: m.AddProduct })));
const CollectionDetails = lazy(() => CollectionModule().then((m) => ({ default: m.Details })));
const CollectionMasterData = lazy(() => CollectionModule().then((m) => ({ default: m.MasterData })));
const CollectionInsight = lazy(() => CollectionModule().then((m) => ({ default: m.Insight })));
const CollectionRequests = lazy(() => CollectionModule().then((m) => ({ default: m.Requests })));
const CollectionPermissions = lazy(() => CollectionModule().then((m) => ({ default: m.Permissions })));
const Chat = lazy(() => import("./pages/Chat/Chat"));
const HelpCenter = lazy(() => import("./pages/HelpCenter/HelpCenter"));


function App() {
    return (
        <BrowserRouter>

            <Suspense
                fallback={
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            minHeight: "100vh",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "sans-serif",
                            color: "#64748b"
                        }}
                    >
                        Loading…
                    </div>
                }
            >

            <Routes>

                {/* ==================================================
                    PUBLIC ROUTES
                ================================================== */}

                <Route
                    path="/"
                    element={<Landing />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />

                <Route
                    path="/verify-otp"
                    element={<VerifyOTP />}
                />

                <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                />

                <Route
                    path="/activate-account/:token"
                    element={<ActivateAccount />}
                />

                {/* ==================================================
                    GOOGLE OAUTH VERIFICATION / LEGAL PAGES
                    These routes MUST remain PUBLIC.
                ================================================== */}

                <Route
                    path="/privacy-policy"
                    element={<PrivacyPolicy />}
                />

                <Route
                    path="/terms"
                    element={<Terms />}
                />

                {/* ==================================================
                    PUBLIC QUIZ
                ================================================== */}

                <Route
                    path="/quiz/:token"
                    element={<PublicQuiz />}
                />

                {/* ==================================================
                    MOBILE GALLERY UPLOAD
                ================================================== */}

                <Route
                    path="/gallery/mobile/:token"
                    element={<GalleryMobile />}
                />

                {/* Public customer Help Center / Zarvis FAQ */}
                <Route
                    path="/help"
                    element={<HelpCenter publicMode />}
                />

                {/* ==================================================
                    PROTECTED APPLICATION ROUTES
                ================================================== */}

                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >

                    {/* ==================================================
                        DASHBOARD
                    ================================================== */}

                    <Route
                        path="/dashboard"
                        element={
                            <ModulePermissionRoute page="dashboard.home">
                                <Dashboard />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/dashboard-analytics"
                        element={
                            <ModulePermissionRoute page="dashboard.analytics">
                                <DashboardAnalytics />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        TEAM CHAT / CALLING
                    ================================================== */}

                    <Route
                        path="/chat"
                        element={
                            <ModulePermissionRoute page="chat.messages">
                                <Chat />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        24×7 HELP CENTER / ZARVIS
                        Available to every authenticated employee.
                        Admin controls are enforced inside the API.
                    ================================================== */}
                    <Route
                        path="/help-center"
                        element={<HelpCenter />}
                    />

                    {/* ==================================================
                        ACTIVITY CENTER
                    ================================================== */}

                    <Route
                        path="/activity-center"
                        element={
                            <ModulePermissionRoute page="activity.center">
                                <ActivityCenter />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/activity-center/:id"
                        element={
                            <ModulePermissionRoute page="activity.center">
                                <ActivityDetails />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        CHECKLIST
                    ================================================== */}

                    <Route
                        path="/checklist-access-control"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <ChecklistAccessControl />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/checklist-submit"
                        element={
                            <ModulePermissionRoute page="checklist.submit">
                                <ChecklistSubmission />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/checklist-reports"
                        element={
                            <ModulePermissionRoute page="checklist.reports">
                                <ChecklistReports />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/checklist-tracker"
                        element={
                            <ModulePermissionRoute page="checklist.reports">
                                <ChecklistTracker />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/action-points"
                        element={
                            <ModulePermissionRoute page="actionpoints.list">
                                <ActionPoints />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/completed-action-points"
                        element={
                            <ModulePermissionRoute page="actionpoints.completed">
                                <CompletedActionPoints />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        ASSET MASTER
                    ================================================== */}

                    <Route
                        path="/asset-management"
                        element={
                            <ModulePermissionRoute page="assets.marketing">
                                <AssetManagement type="marketing" />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/asset-master"
                        element={
                            <Navigate to="/asset-management" replace />
                        }
                    />

                    <Route
                        path="/legal-assets"
                        element={
                            <ModulePermissionRoute page="assets.legal">
                                <AssetManagement type="legal" />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        ANNOUNCEMENTS
                    ================================================== */}

                    <Route
                        path="/announcements"
                        element={
                            <ModulePermissionRoute page="announcements.list">
                                <Announcements />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        GALLERY
                    ================================================== */}

                    <Route
                        path="/gallery"
                        element={
                            <ModulePermissionRoute page="gallery.library">
                                <Gallery />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        ATTENDANCE
                    ================================================== */}

                    <Route
                        path="/attendance"
                        element={
                            <ModulePermissionRoute page="attendance.mark">
                                <Attendance />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/attendance-reports"
                        element={
                            <ModulePermissionRoute page="attendance.reports">
                                <AttendanceReports />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        EMPLOYEE LOCATION
                    ================================================== */}

                    <Route
                        path="/employee-location"
                        element={
                            <ModulePermissionRoute page="location.live">
                                <EmployeeLocation />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/employee-location/reports"
                        element={
                            <ModulePermissionRoute page="location.reports">
                                <EmployeeLocationReports />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        SETTINGS
                    ================================================== */}

                    <Route
                        path="/settings"
                        element={<Settings />}
                    />

                    <Route
                        path="/settings/appearance"
                        element={<Appearance />}
                    />

                    <Route
                        path="/settings/daily-collection-email"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <DailyCollectionEmailSettings />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/settings/new-store-openings-email"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <NSOEmailSettings />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/settings/checklist-email"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <ChecklistEmailSettings />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/settings/action-point-email"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <ActionPointEmailSettings />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/settings/travel-plan-email"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <TravelPlanEmailSettings />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ADMIN FILTER ACCESS (formerly "User Access") */}
                    <Route
                        path="/settings/filter-access"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <FilterAccess />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* Old bookmark / link -> new page */}
                    <Route
                        path="/settings/user-access"
                        element={<Navigate to="/settings/filter-access" replace />}
                    />

                    {/* USERS */}
                    <Route
                        path="/settings/users"
                        element={
                            <ModulePermissionRoute page="settings.users">
                                <Users />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* STORE STATUS (ADMIN ONLY) */}
                    <Route
                        path="/store-status"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <StoreStatus />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* PASSWORD MANAGEMENT */}
                    <Route
                        path="/settings/password-management"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <PasswordManagement />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* DEPARTMENTS */}
                    <Route
                        path="/settings/departments"
                        element={
                            <ModulePermissionRoute page="settings.departments">
                                <Departments />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* DESIGNATIONS */}
                    <Route
                        path="/settings/designations"
                        element={
                            <ModulePermissionRoute page="settings.designations">
                                <Designations />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* STORES */}
                    <Route
                        path="/settings/stores"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <StoreManagement />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* QUESTIONS */}
                    <Route
                        path="/settings/questions"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <Questions />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* CHECKLIST TYPES */}
                    <Route
                        path="/settings/checklist-types"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <ChecklistTypes />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* REPORTS TO */}
                    <Route
                        path="/settings/hierarchy"
                        element={
                            <ModulePermissionRoute page="settings.hierarchy">
                                <ReportsTo />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/settings/reports-to"
                        element={
                            <ModulePermissionRoute page="settings.hierarchy">
                                <ReportsTo />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        LEGACY ADMIN ROUTES
                    ================================================== */}

                    <Route
                        path="/users"
                        element={
                            <ModulePermissionRoute page="settings.users">
                                <Users />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/departments"
                        element={
                            <ModulePermissionRoute page="settings.departments">
                                <Departments />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/designations"
                        element={
                            <ModulePermissionRoute page="settings.designations">
                                <Designations />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/stores"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <StoreManagement />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/questions"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <Questions />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/checklist-types"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <ChecklistTypes />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/reports-to"
                        element={
                            <ModulePermissionRoute page="settings.hierarchy">
                                <ReportsTo />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        NEW STORE OPENING
                    ================================================== */}

                    <Route
                        path="/new-store-openings"
                        element={
                            <ModulePermissionRoute page="nso.openings">
                                <NewStoreOpenings />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/nso-rules"
                        element={
                            <ModulePermissionRoute page="nso.rules">
                                <NSORules />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/issue-control-center"
                        element={
                            <ModulePermissionRoute page="nso.rules">
                                <IssueControlCenter />
                            </ModulePermissionRoute>
                        }
                    />
                    <Route
                        path="/issue-control-center/new"
                        element={
                            <ModulePermissionRoute page="nso.rules">
                                <IssueControlCenter />
                            </ModulePermissionRoute>
                        }
                    />
                    <Route
                        path="/issue-control-center/:id/edit"
                        element={
                            <ModulePermissionRoute page="nso.rules">
                                <IssueControlCenter />
                            </ModulePermissionRoute>
                        }
                    />
                    <Route
                        path="/issue-control-center/new"
                        element={
                            <ModulePermissionRoute page="nso.rules">
                                <IssueControlCenter />
                            </ModulePermissionRoute>
                        }
                    />
                    <Route
                        path="/issue-control-center/:id/edit"
                        element={
                            <ModulePermissionRoute page="nso.rules">
                                <IssueControlCenter />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/nso-tracking"
                        element={
                            <ModulePermissionRoute page="nso.tracking">
                                <NSOTracking />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/nso-tracking/:id"
                        element={
                            <ModulePermissionRoute page="nso.tracking">
                                <NSOTrackingDetails />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/nso-tracking/:id/edit"
                        element={
                            <ModulePermissionRoute page="nso.tracking">
                                <NSOTrackingEdit />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        LEARNING & DEVELOPMENT (owner-controlled)
                    ================================================== */}

                    <Route
                        path="/learning-development/access"
                        element={
                            <ModulePermissionRoute page="lnd.access">
                                <LndAccessControl />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/learning-development/manage"
                        element={
                            <ModulePermissionRoute page="lnd.manage">
                                <LndManage />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/learning-development/*"
                        element={
                            <ModulePermissionRoute page="lnd.home">
                                <LearningDevelopment />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        QUIZ
                    ================================================== */}

                    <Route
                        path="/quiz/take"
                        element={
                            <ModulePermissionRoute page="quiz.take">
                                <TakeQuiz />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/quiz/setup"
                        element={
                            <ModulePermissionRoute page="quiz.setup">
                                <QuizSetup />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/quiz/report"
                        element={
                            <ModulePermissionRoute page="quiz.report">
                                <TrainingReport />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/quiz/email"
                        element={
                            <ModulePermissionRoute page="quiz.email">
                                <EmailSettings />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        EXPENSES
                    ================================================== */}

                    <Route
                        path="/expenses/entry"
                        element={
                            <ModulePermissionRoute page="expenses.entry">
                                <ExpenseEntry />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/expenses/track"
                        element={
                            <ModulePermissionRoute page="expenses.track">
                                <TrackExpenses />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/expenses/approve"
                        element={
                            <ModulePermissionRoute page="expenses.approve">
                                <ApproveExpenses />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        LEGACY / DIRECT EXPENSE URLS
                    ================================================== */}

                    <Route
                        path="/expense-entry"
                        element={
                            <ModulePermissionRoute page="expenses.entry">
                                <ExpenseEntry />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/track-expenses"
                        element={
                            <ModulePermissionRoute page="expenses.track">
                                <TrackExpenses />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/approve-expenses"
                        element={
                            <ModulePermissionRoute page="expenses.approve">
                                <ApproveExpenses />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/expenses"
                        element={
                            <Navigate
                                to="/expenses/track"
                                replace
                            />
                        }
                    />

                    {/* ==================================================
                        PETTY CASH
                    ================================================== */}

                    <Route
                        path="/petty-cash"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCash />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/new"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCashAdvanceForm />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/advances"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCash mode="manage" />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/expenses"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCashExpenses />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/deposits"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCashDeposits />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/audit-trail"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCashAuditTrail />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/:id/edit"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCashAdvanceForm />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/:id"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCashDetail />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/email-settings"
                        element={
                            <ModulePermissionRoute page="pettycash.email">
                                <PettyCashEmailSettings />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        BILLING
                    ================================================== */}

                    <Route
                        path="/billing/entry"
                        element={
                            <ModulePermissionRoute page="billing.entry">
                                <BillingEntry />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/billing/bills"
                        element={
                            <ModulePermissionRoute page="billing.bills">
                                <Bills />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/billing/bills/:id/edit"
                        element={
                            <ModulePermissionRoute page="billing.bills">
                                <BillingEntry />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/billing/bills/:id"
                        element={
                            <ModulePermissionRoute page="billing.bills">
                                <BillingAudit />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/billing/daily-report"
                        element={
                            <ModulePermissionRoute page="billing.daily">
                                <DailyBillingReport />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/daily-collection"
                        element={
                            <ModulePermissionRoute page="dailycollection.entry">
                                <DailyCollection />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/daily-collection/report"
                        element={
                            <ModulePermissionRoute page="dailycollection.data">
                                <DailyCollectionReport />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/daily-collection/reports"
                        element={
                            <ModulePermissionRoute page="dailycollection.reports">
                                <CollectionReports />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/daily-collection/blocked"
                        element={
                            <ModulePermissionRoute adminOnly>
                                <BlockedStores />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/billing/daily-collection"
                        element={
                            <Navigate
                                to="/daily-collection"
                                replace
                            />
                        }
                    />

                    {/* ==================================================
                        SALES TEAM
                    ================================================== */}

                    <Route
                        path="/visit-planner"
                        element={
                            <ModulePermissionRoute page="sales.visit">
                                <VisitPlanner />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/travel-plan"
                        element={
                            <ModulePermissionRoute page="sales.travel">
                                <TravelPlan />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/travel-plan-approval"
                        element={
                            <ModulePermissionRoute page="sales.approvals">
                                <TravelPlanApprovals />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/sales-review"
                        element={
                            <ModulePermissionRoute page="sales.review">
                                <SalesReview />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/listing-tracker"
                        element={
                            <ModulePermissionRoute page="listing.tracker">
                                <ListingTracker />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/inventory-planning/erp-upload"
                        element={
                            <ModulePermissionRoute page="inventory.erp">
                                <ERPDataUpload />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/inventory-planning"
                        element={
                            <ModulePermissionRoute page="inventory.planning">
                                <InventoryPlanning />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* COLLECTION TRACKING */}
                    <Route
                        path="/collection-tracking"
                        element={
                            <ModulePermissionRoute page="collection.sku">
                                <CollectionTracking />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/collection-tracking/add-products"
                        element={
                            <ModulePermissionRoute page="collection.add">
                                <CollectionAddProduct />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/collection-tracking/sku-details/:id"
                        element={
                            <ModulePermissionRoute page="collection.sku">
                                <CollectionDetails />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/collection-tracking/insight"
                        element={
                            <ModulePermissionRoute page="collection.insight">
                                <CollectionInsight />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/collection-tracking/requests"
                        element={
                            <ModulePermissionRoute page="collection.requests">
                                <CollectionRequests />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/collection-tracking/permissions"
                        element={
                            <ModulePermissionRoute page="collection.permissions">
                                <CollectionPermissions />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/collection-tracking/master-data"
                        element={
                            <ModulePermissionRoute page="collection.master">
                                <CollectionMasterData />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* ==================================================
                        PROFILE
                    ================================================== */}

                    <Route
                        path="/profile"
                        element={<Profile />}
                    />

                </Route>

                {/* ==================================================
                    FALLBACK
                ================================================== */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>

            </Suspense>

        </BrowserRouter>
    );
}

export default App;
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
import PettyCashEmailSettings from "./pages/PettyCash/PettyCashEmailSettings";

// ======================================================
// PUBLIC PAGES
// ======================================================
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import ActivateAccount from "./pages/ActivateAccount";

// NEW: PUBLIC LEGAL PAGES
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";

// ======================================================
// DASHBOARD
// ======================================================
import Dashboard from "./pages/Dashboard/Dashboard/Dashboard";
import DashboardAnalytics from "./pages/Dashboard/Dashboard/DashboardAnalytics";

// ======================================================
// CHECKLIST
// ======================================================
import ChecklistSubmission from "./pages/ChecklistSubmission";
import ChecklistReports from "./pages/ChecklistReports";
import ActionPoints from "./pages/ActionPoints";
import Announcements from "./pages/Announcements";
import Gallery from "./pages/Gallery";
import GalleryMobile from "./pages/GalleryMobile";
import EmployeeLocation from "./pages/EmployeeLocation";

// ======================================================
// ADMIN / SETTINGS MODULES
// ======================================================
import Users from "./pages/Users";
import PasswordManagement from "./pages/PasswordManagement";
import Departments from "./pages/Departments";
import Designations from "./pages/Designations";
import StoreManagement from "./pages/StoreManagement";
import ChecklistTypes from "./pages/ChecklistTypes";
import Questions from "./pages/Questions";
import ReportsTo from "./pages/ReportsTo";

// ======================================================
// NEW STORE OPENING
// ======================================================
import NSORules from "./pages/NSORules";
import NewStoreOpenings from "./pages/NewStoreOpenings";
import NSOTracking from "./pages/NSOTracking";

// ======================================================
// PROFILE & SETTINGS
// ======================================================
import Profile from "./pages/Profile";
import Settings from "./pages/Settings/Settings";
import Appearance from "./pages/Settings/Appearance";
import NSOEmailSettings from "./pages/Settings/NSOEmailSettings";
import ChecklistEmailSettings from "./pages/Settings/ChecklistEmailSettings";

// ======================================================
// ACTIVITY CENTER
// ======================================================
import ActivityCenter from "./pages/ActivityCenter/ActivityCenter";
import ActivityDetails from "./pages/ActivityCenter/ActivityDetails";

// ======================================================
// QUIZ
// ======================================================
import QuizSetup from "./pages/Quiz/QuizSetup";
import TakeQuiz from "./pages/Quiz/TakeQuiz";
import TrainingReport from "./pages/Quiz/TrainingReport";
import EmailSettings from "./pages/Quiz/EmailSettings";
import PublicQuiz from "./pages/Quiz/PublicQuiz";

// ======================================================
// EXPENSES
// ======================================================
import ExpenseEntry from "./pages/Expenses/ExpensesEntry";
import TrackExpenses from "./pages/Expenses/TrackExpenses";
import ApproveExpenses from "./pages/Expenses/ApproveExpenses";
import PettyCash from "./pages/PettyCash/PettyCash";

// ======================================================
// BILLING
// ======================================================
import BillingEntry from "./pages/Billing/BillingEntry";
import Bills from "./pages/Billing/Bills";
import DailyBillingReport from "./pages/Billing/DailyBillingReport";
import DailyCollection from "./pages/Billing/DailyCollection";
import DailyCollectionReport from "./pages/DailyCollection/DailyCollectionReport";
import CollectionReports from "./pages/DailyCollection/CollectionReports";
import BillingAudit from "./pages/Billing/BillingAudit";
import VisitPlanner from "./pages/SalesTeam/VisitPlanner";
import TravelPlan from "./pages/SalesTeam/TravelPlan";
import TravelPlanApprovals from "./pages/SalesTeam/TravelPlanApprovals";
import SalesReview from "./pages/SalesTeam/SalesReview";
import ListingTracker from "./pages/ListingTracker";
import Attendance from "./pages/Attendance";
import AttendanceReports from "./pages/AttendanceReports";
import AssetManagement from "./pages/AssetManagement";
import ERPDataUpload from "./pages/InventoryPlanning/ERPDataUpload";
import InventoryPlanning from "./pages/InventoryPlanning/InventoryPlanning";
import {
    ProductList as CollectionTracking,
    AddProduct as CollectionAddProduct,
    Details as CollectionDetails,
    MasterData as CollectionMasterData,
    Insight as CollectionInsight,
    Requests as CollectionRequests,
    Permissions as CollectionPermissions
} from "./pages/CollectionTracking/CollectionTracking";
import Chat from "./pages/Chat/Chat";
import HelpCenter from "./pages/HelpCenter/HelpCenter";


function App() {
    return (
        <BrowserRouter>

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
                        path="/action-points"
                        element={
                            <ModulePermissionRoute page="actionpoints.list">
                                <ActionPoints />
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

                    {/* USERS */}
                    <Route
                        path="/settings/users"
                        element={
                            <ModulePermissionRoute page="settings.users">
                                <Users />
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
                            <ModulePermissionRoute page="settings.stores">
                                <StoreManagement />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* QUESTIONS */}
                    <Route
                        path="/settings/questions"
                        element={
                            <ModulePermissionRoute page="settings.questions">
                                <Questions />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* CHECKLIST TYPES */}
                    <Route
                        path="/settings/checklist-types"
                        element={
                            <ModulePermissionRoute page="settings.checklisttypes">
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
                            <ModulePermissionRoute page="settings.stores">
                                <StoreManagement />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/questions"
                        element={
                            <ModulePermissionRoute page="settings.questions">
                                <Questions />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/checklist-types"
                        element={
                            <ModulePermissionRoute page="settings.checklisttypes">
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
                        path="/nso-tracking"
                        element={
                            <ModulePermissionRoute page="nso.tracking">
                                <NSOTracking />
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
                        path="/petty-cash/:id"
                        element={
                            <ModulePermissionRoute page="pettycash.dashboard">
                                <PettyCash />
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

        </BrowserRouter>
    );
}

export default App;
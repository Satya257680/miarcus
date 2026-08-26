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
import ExpensePermissionRoute from "./components/layout/ExpensePermissionRoute";
import PettyCashPermissionRoute from "./components/layout/PettyCashPermissionRoute";
import ModulePermissionRoute from "./components/layout/ModulePermissionRoute";
import PettyCashEmailSettings from "./pages/PettyCash/PettyCashEmailSettings";

// ======================================================
// PUBLIC PAGES
// ======================================================
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import ActivateAccount from "./pages/ActivateAccount";

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

// ======================================================
// ACTIVITY CENTER
// ======================================================
import ActivityCenter from "./pages/ActivityCenter/ActivityCenter";
import ActivityDetails from "./pages/ActivityCenter/ActivityDetails";
import Signup from "./pages/Signup";

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
import {ProductList as CollectionTracking,AddProduct as CollectionAddProduct,Details as CollectionDetails,MasterData as CollectionMasterData,Insight as CollectionInsight,Requests as CollectionRequests,Permissions as CollectionPermissions} from "./pages/CollectionTracking/CollectionTracking";
import Chat from "./pages/Chat/Chat";


function App() {
    return (
        <BrowserRouter>

            <Routes>

                {/* ==================================================
                    PUBLIC ROUTES
                ================================================== */}

                <Route
                    path="/"
                    element={<Login />}
                />

                <Route
                    path="/signup"
                    element={<Signup />}
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
                        element={<Dashboard />}
                    />

                    <Route
                        path="/dashboard-analytics"
                        element={<DashboardAnalytics />}
                    />

                    {/* ==================================================
                        TEAM CHAT / CALLING
                    ================================================== */}

                    <Route
                        path="/chat"
                        element={
                            <ModulePermissionRoute moduleName="Chat">
                                <Chat />
                            </ModulePermissionRoute>
                        }
                    />


                    {/* ==================================================
                        ACTIVITY CENTER
                    ================================================== */}

                    <Route
                        path="/activity-center"
                        element={<ActivityCenter />}
                    />

                    <Route
                        path="/activity-center/:id"
                        element={<ActivityDetails />}
                    />


                    {/* ==================================================
                        CHECKLIST
                    ================================================== */}

                    <Route
                        path="/checklist-submit"
                        element={<ChecklistSubmission />}
                    />

                    <Route
                        path="/checklist-reports"
                        element={<ChecklistReports />}
                    />

                    <Route
                        path="/action-points"
                        element={<ActionPoints />}
                    />

                    {/* ==================================================
                        ASSET MASTER
                    ================================================== */}

                    <Route
                        path="/asset-management"
                        element={
                            <ModulePermissionRoute moduleName="Asset Master">
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
                            <ModulePermissionRoute moduleName="Asset Master">
                                <AssetManagement type="legal" />
                            </ModulePermissionRoute>
                        }
                    />


                    {/* ==================================================
                        ANNOUNCEMENTS
                    ================================================== */}

                    <Route
                        path="/announcements"
                        element={<Announcements />}
                    />

                    {/* ==================================================
                        GALLERY
                    ================================================== */}

                    <Route
                        path="/gallery"
                        element={<Gallery />}
                    />

                    {/* ==================================================
                        ATTENDANCE
                    ================================================== */}

                    <Route
                        path="/attendance"
                        element={<Attendance />}
                    />

                    <Route
                        path="/attendance-reports"
                        element={
                            <ModulePermissionRoute
                                moduleName="Attendance"
                                requiredPermission="Full"
                            >
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
                            <ModulePermissionRoute moduleName="Employee Location" adminOnly>
                                <EmployeeLocation />
                            </ModulePermissionRoute>
                        }
                    />


                    {/* ==================================================
                        ==================================================
                        SETTINGS
                        ==================================================
                    ================================================== */}

                    {/* --------------------------------------------------
                        SETTINGS MAIN PAGE
                    -------------------------------------------------- */}

                    <Route
                        path="/settings"
                        element={<Settings />}
                    />

                    <Route
                        path="/settings/appearance"
                        element={<Appearance />}
                    />


                    {/* --------------------------------------------------
                        SETTINGS → USERS
                    -------------------------------------------------- */}

                    <Route
                        path="/settings/users"
                        element={<Users />}
                    />


                    {/* --------------------------------------------------
                        SETTINGS → DEPARTMENTS
                    -------------------------------------------------- */}

                    <Route
                        path="/settings/departments"
                        element={<Departments />}
                    />


                    {/* --------------------------------------------------
                        SETTINGS → DESIGNATIONS
                    -------------------------------------------------- */}

                    <Route
                        path="/settings/designations"
                        element={<Designations />}
                    />


                    {/* --------------------------------------------------
                        SETTINGS → STORE MANAGEMENT
                    -------------------------------------------------- */}

                    <Route
                        path="/settings/stores"
                        element={<StoreManagement />}
                    />


                    {/* --------------------------------------------------
                        SETTINGS → QUESTIONS
                    -------------------------------------------------- */}

                    <Route
                        path="/settings/questions"
                        element={<Questions />}
                    />


                    {/* --------------------------------------------------
                        SETTINGS → CHECKLIST TYPES
                    -------------------------------------------------- */}

                    <Route
                        path="/settings/checklist-types"
                        element={<ChecklistTypes />}
                    />


                    {/* --------------------------------------------------
                        SETTINGS → REPORTS TO
                    -------------------------------------------------- */}

                    <Route
                        path="/settings/hierarchy"
                        element={<ReportsTo />}
                    />

                    <Route
                        path="/settings/reports-to"
                        element={<ReportsTo />}
                    />


                    {/* ==================================================
                        LEGACY ADMIN ROUTES
                        --------------------------------------------------
                        These are intentionally kept so existing links,
                        bookmarks and internal navigation continue working.
                    ================================================== */}

                    <Route
                        path="/users"
                        element={<Users />}
                    />

                    <Route
                        path="/departments"
                        element={<Departments />}
                    />

                    <Route
                        path="/designations"
                        element={<Designations />}
                    />

                    <Route
                        path="/stores"
                        element={<StoreManagement />}
                    />

                    <Route
                        path="/questions"
                        element={<Questions />}
                    />

                    <Route
                        path="/checklist-types"
                        element={<ChecklistTypes />}
                    />

                    <Route
                        path="/reports-to"
                        element={<ReportsTo />}
                    />


                    {/* ==================================================
                        NEW STORE OPENING
                    ================================================== */}

                    <Route
                        path="/new-store-openings"
                        element={<NewStoreOpenings />}
                    />

                    <Route
                        path="/nso-rules"
                        element={<NSORules />}
                    />

                    <Route
                        path="/nso-tracking"
                        element={<NSOTracking />}
                    />


                    {/* ==================================================
                        QUIZ
                    ================================================== */}

                    <Route
                        path="/quiz/take"
                        element={<TakeQuiz />}
                    />

                    <Route
                        path="/quiz/setup"
                        element={<QuizSetup />}
                    />

                    <Route
                        path="/quiz/report"
                        element={<TrainingReport />}
                    />

                    <Route
                        path="/quiz/email"
                        element={<EmailSettings />}
                    />


                    {/* ==================================================
                        EXPENSES
                    ================================================== */}

                    <Route
                        path="/expenses/entry"
                        element={
                            <ExpensePermissionRoute required="Add">
                                <ExpenseEntry />
                            </ExpensePermissionRoute>
                        }
                    />

                    <Route
                        path="/expenses/track"
                        element={<TrackExpenses />}
                    />

                    <Route
                        path="/expenses/approve"
                        element={
                            <ExpensePermissionRoute required="Edit">
                                <ApproveExpenses />
                            </ExpensePermissionRoute>
                        }
                    />


                    {/* ==================================================
                        LEGACY / DIRECT EXPENSE URLS
                    ================================================== */}

                    <Route
                        path="/expense-entry"
                        element={
                            <ExpensePermissionRoute required="Add">
                                <ExpenseEntry />
                            </ExpensePermissionRoute>
                        }
                    />

                    <Route
                        path="/track-expenses"
                        element={<TrackExpenses />}
                    />

                    <Route
                        path="/approve-expenses"
                        element={
                            <ExpensePermissionRoute required="Edit">
                                <ApproveExpenses />
                            </ExpensePermissionRoute>
                        }
                    />

                    <Route
                        path="/expenses"
                        element={
                            <Navigate
                                to="/expenses/entry"
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
                            <PettyCashPermissionRoute required="View">
                                <PettyCash />
                            </PettyCashPermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/:id"
                        element={
                            <PettyCashPermissionRoute required="View">
                                <PettyCash />
                            </PettyCashPermissionRoute>
                        }
                    />

                    <Route
                        path="/petty-cash/email-settings"
                        element={
                            <PettyCashPermissionRoute required="View">
                                <PettyCashEmailSettings />
                            </PettyCashPermissionRoute>
                        }
                    />


                    {/* ==================================================
                        BILLING
                    ================================================== */}

                    <Route
                        path="/billing/entry"
                        element={<BillingEntry />}
                    />

                    <Route
                        path="/billing/bills"
                        element={<Bills />}
                    />

                    <Route
                        path="/billing/bills/:id"
                        element={<BillingAudit />}
                    />

                    <Route
                        path="/billing/daily-report"
                        element={<DailyBillingReport />}
                    />

                    <Route
                        path="/daily-collection"
                        element={
                            <ModulePermissionRoute moduleName="Daily Collection">
                                <DailyCollection />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/daily-collection/report"
                        element={
                            <ModulePermissionRoute moduleName="Daily Collection" requiredPermission="View">
                                <DailyCollectionReport />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* Legacy route kept for bookmarks; it no longer belongs to Billing. */}
                    <Route
                        path="/billing/daily-collection"
                        element={<Navigate to="/daily-collection" replace />}
                    />


                    {/* ==================================================
                        SALES TEAM
                    ================================================== */}

                    <Route path="/visit-planner" element={<ModulePermissionRoute moduleName="Visit Planner"><VisitPlanner /></ModulePermissionRoute>} />
                    <Route path="/travel-plan" element={<ModulePermissionRoute moduleName="Travel Plan"><TravelPlan /></ModulePermissionRoute>} />
                    <Route path="/travel-plan-approval" element={<ModulePermissionRoute moduleName="Travel Plan Approvals"><TravelPlanApprovals /></ModulePermissionRoute>} />
                    <Route path="/sales-review" element={<ModulePermissionRoute moduleName="Sales Review"><SalesReview /></ModulePermissionRoute>} />
                    <Route
                        path="/listing-tracker"
                        element={
                            <ModulePermissionRoute moduleName="Listing Tracker">
                                <ListingTracker />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/inventory-planning/erp-upload"
                        element={
                            <ModulePermissionRoute moduleName="Inventory Planning">
                                <ERPDataUpload />
                            </ModulePermissionRoute>
                        }
                    />

                    <Route
                        path="/inventory-planning"
                        element={
                            <ModulePermissionRoute moduleName="Inventory Planning">
                                <InventoryPlanning />
                            </ModulePermissionRoute>
                        }
                    />

                    {/* COLLECTION TRACKING */}
                    <Route path="/collection-tracking" element={<ModulePermissionRoute moduleName="Collection Tracking"><CollectionTracking /></ModulePermissionRoute>} />
                    <Route path="/collection-tracking/add-products" element={<ModulePermissionRoute moduleName="Collection Tracking"><CollectionAddProduct /></ModulePermissionRoute>} />
                    <Route path="/collection-tracking/sku-details/:id" element={<ModulePermissionRoute moduleName="Collection Tracking"><CollectionDetails /></ModulePermissionRoute>} />
                    <Route path="/collection-tracking/insight" element={<ModulePermissionRoute moduleName="Collection Tracking"><CollectionInsight /></ModulePermissionRoute>} />
                    <Route path="/collection-tracking/requests" element={<ModulePermissionRoute moduleName="Collection Tracking"><CollectionRequests /></ModulePermissionRoute>} />
                    <Route path="/collection-tracking/permissions" element={<ModulePermissionRoute moduleName="Collection Tracking"><CollectionPermissions /></ModulePermissionRoute>} />
                    <Route path="/collection-tracking/master-data" element={<ModulePermissionRoute moduleName="Collection Tracking"><CollectionMasterData /></ModulePermissionRoute>} />

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
                    --------------------------------------------------
                    Only genuinely unknown URLs go to Login.
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
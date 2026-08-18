import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ======================================================
// LAYOUT
// ======================================================
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import ExpensePermissionRoute from "./components/layout/ExpensePermissionRoute";

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

// ======================================================
// ADMIN
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

// ======================================================
// ACTIVITY CENTER
// ======================================================
import ActivityCenter from "./pages/ActivityCenter/ActivityCenter";
import ActivityDetails from "./pages/ActivityCenter/ActivityDetails";
import Signup from "./pages/Signup";

// ==================================================
// QUIZ
// ==================================================
import QuizSetup from "./pages/Quiz/QuizSetup";
import TakeQuiz from "./pages/Quiz/TakeQuiz";
import TrainingReport from "./pages/Quiz/TrainingReport";
import EmailSettings from "./pages/Quiz/EmailSettings";
import PublicQuiz from "./pages/Quiz/PublicQuiz";

// ==================================================
// EXPENSES
// ==================================================
import ExpenseEntry from "./pages/Expenses/ExpensesEntry";
import TrackExpenses from "./pages/Expenses/TrackExpenses";
import ApproveExpenses from "./pages/Expenses/ApproveExpenses";

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

                {/* Public reusable Quiz link */}
                <Route
                    path="/quiz/:token"
                    element={<PublicQuiz />}
                />

                {/* ==================================================
                    PROTECTED ROUTES
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
                        ANNOUNCEMENTS
                    ================================================== */}

                    <Route
                        path="/announcements"
                        element={<Announcements />}
                    />

                    {/* ==================================================
                        ADMIN
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

                    {/* Legacy / direct Expense URLs */}
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
                        element={<Navigate to="/expenses/entry" replace />}
                    />

                    {/* ==================================================
                        SETTINGS
                    ================================================== */}

                    <Route
                        path="/settings"
                        element={<Settings />}
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
                    element={<Navigate to="/" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
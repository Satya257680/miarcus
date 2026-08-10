import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ======================================================
// LAYOUT
// ======================================================
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// ======================================================
// PUBLIC PAGES
// ======================================================
import Login from "./pages/login";
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
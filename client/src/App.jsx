import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import ActionPoints from "./pages/ActionPoints";
import Users from "./pages/Users";
import ReportsTo from "./pages/ReportsTo";
import ChecklistReports from "./pages/ChecklistReports";
import Profile from "./pages/Profile";
import Departments from "./pages/Departments";
import Designations from "./pages/Designations";
import StoreManagement from "./pages/StoreManagement";
import ChecklistTypes from "./pages/ChecklistTypes";
import Questions from "./pages/Questions"; // ✅ NEW

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= Public Routes ================= */}

        <Route path="/" element={<Login />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* ================= Protected Routes ================= */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          {/* Action Points */}
          <Route
            path="action-points"
            element={<ActionPoints />}
          />

          {/* Departments */}
          <Route
            path="departments"
            element={<Departments />}
          />

          {/* Designations */}
          <Route
            path="designations"
            element={<Designations />}
          />

          {/* Store Management */}
          <Route
            path="stores"
            element={<StoreManagement />}
          />

          {/* Checklist Types */}
          <Route
            path="checklist-types"
            element={<ChecklistTypes />}
          />

          {/* ✅ Checklist Questions */}
          <Route
            path="questions"
            element={<Questions />}
          />

          {/* Users */}
          <Route
            path="users"
            element={<Users />}
          />

          {/* Reports To */}
          <Route
            path="reports-to"
            element={<ReportsTo />}
          />

          {/* Checklist Reports */}
          <Route
            path="checklist-reports"
            element={<ChecklistReports />}
          />

          {/* Profile */}
          <Route
            path="profile"
            element={<Profile />}
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
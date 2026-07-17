import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import ActionPoints from "./pages/ActionPoints";
import Users from "./pages/Users";
import ReportsTo from "./pages/ReportsTo";
import ChecklistReports from "./pages/ChecklistReports";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= Public Routes ================= */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ================= Private Routes ================= */}
        <Route path="/" element={<Layout />}>

          <Route path="dashboard" element={<Dashboard />} />

          <Route path="action-points" element={<ActionPoints />} />

          <Route path="users" element={<Users />} />

          <Route path="reports-to" element={<ReportsTo />} />

          {/* ✅ Checklist Reports */}
          <Route
            path="checklist-reports"
            element={<ChecklistReports />}
          />

          <Route path="profile" element={<Profile />} />

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
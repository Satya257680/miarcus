import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

import "../../styles/layout/Layout.css";
import "../../styles/theme.css";
import "../../styles/layout/SidebarSimple.css";
import ThemeProvider from "../../context/ThemeProvider";
import LocationTrackingGate from "../LocationTrackingGate";
import "../../styles/LocationTrackingGate.css";
import RbacActionGuard from "./RbacActionGuard";
import { refreshAccess } from "../../utils/rbac";
import "../../styles/rbac.css";

function Layout() {

  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);

  // ==========================================
  // Toggle Sidebar
  // ==========================================

  const toggleSidebar = () => {

    setCollapsed((prev) => !prev);

  };

  // ==========================================
  // Check Login
  // ==========================================

  useEffect(() => {

    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!user || !token) {

      navigate("/login", { replace: true });

    }

  }, [navigate]);

  // ==========================================
  // Keep RBAC in sync with the server
  // ==========================================
  // Permissions are re-read on load, whenever the tab regains focus
  // and every 3 minutes — so when an admin changes someone's access
  // the sidebar / pages update without a logout.

  useEffect(() => {

    refreshAccess();

    const onFocus = () => refreshAccess();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshAccess();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(refreshAccess, 3 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };

  }, []);

  return (

    <ThemeProvider>

      <div className="layout">

        <LocationTrackingGate />

        {/* Top Navigation */}

        <Topbar
          toggleSidebar={toggleSidebar}
        />

        <div className="layout-body">

          {/* Sidebar */}

          <Sidebar
            collapsed={collapsed}
          />

          {/* Main Content */}

          <main
            className={`page-content ${
              collapsed ? "expanded" : ""
            }`}
          >
            <Outlet />
          </main>

          {/* View / Add / Edit / Full enforcement for page buttons */}
          <RbacActionGuard />

        </div>

      </div>

    </ThemeProvider>

  );

}

export default Layout;
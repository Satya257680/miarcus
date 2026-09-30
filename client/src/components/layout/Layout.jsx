import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

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
import useStorePresence from "../../hooks/useStorePresence";
import MobileBottomNav from "./MobileBottomNav";
import "../../styles/mobile/MobileApp.css";

// Phones only (tablets / laptops / desktops keep the existing layout).
const MOBILE_QUERY = "(max-width: 768px)";

const getIsMobile = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(MOBILE_QUERY).matches;

function Layout() {

  const navigate = useNavigate();

  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  // Mobile: the sidebar becomes a slide-in drawer (closed by default)
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;

    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileMenuOpen(false);
    };

    onChange();

    if (media.addEventListener) media.addEventListener("change", onChange);
    else media.addListener(onChange);

    return () => {
      if (media.removeEventListener) media.removeEventListener("change", onChange);
      else media.removeListener(onChange);
    };
  }, []);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock background scroll + allow Escape to close the drawer
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.body.classList.add("mobile-menu-open");

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("mobile-menu-open");
    };
  }, [mobileMenuOpen]);

  // Online / offline heartbeat for the admin Store Status page.
  useStorePresence();

  // ==========================================
  // Toggle Sidebar
  // ==========================================

  const toggleSidebar = () => {

    if (isMobile) {
      setMobileMenuOpen((prev) => !prev);
      return;
    }

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

      <div className={`layout ${isMobile ? "layout--mobile" : ""}`}>

        <LocationTrackingGate />

        {/* Top Navigation */}

        <Topbar
          toggleSidebar={toggleSidebar}
        />

        <div className="layout-body">

          {/* Sidebar */}

          {/* On desktop the shell uses display:contents (no layout change).
              On phones it turns into an off-canvas drawer. */}
          <div
            className={`sidebar-shell ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={(event) => {
              // Tapping a link inside the drawer closes it
              if (isMobile && event.target.closest && event.target.closest("a")) {
                setMobileMenuOpen(false);
              }
            }}
          >
            <Sidebar
              collapsed={isMobile ? false : collapsed}
            />
          </div>

          {isMobile && (
            <div
              className={`mobile-drawer-backdrop ${mobileMenuOpen ? "is-open" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Main Content */}

          <main
            className={`page-content ${
              collapsed && !isMobile ? "expanded" : ""
            }`}
          >
            <Outlet />
          </main>

          {/* View / Add / Edit / Full enforcement for page buttons */}
          <RbacActionGuard />

        </div>

        {/* App-style bottom navigation — phones only */}
        {isMobile && (
          <MobileBottomNav
            menuOpen={mobileMenuOpen}
            onMore={() => setMobileMenuOpen((prev) => !prev)}
          />
        )}

      </div>

    </ThemeProvider>

  );

}

export default Layout;
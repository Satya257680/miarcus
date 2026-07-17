import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

import "../styles/Layout.css";

function Layout() {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Redirect to login if user is not logged in
  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="layout">

      <Topbar toggleSidebar={toggleSidebar} />

      <div className="layout-body">

        <Sidebar collapsed={collapsed} />

        <main
          className={`page-content ${collapsed ? "expanded" : ""}`}
        >
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default Layout;
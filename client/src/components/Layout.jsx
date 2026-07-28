import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

import "../styles/Layout.css";

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

      navigate("/", { replace: true });

    }

  }, [navigate]);

  return (

    <div className="layout">

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

      </div>

    </div>

  );

}

export default Layout;
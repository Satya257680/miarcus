import { useState } from "react";
import { Outlet } from "react-router-dom";

import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

import "../styles/Layout.css";

function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

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
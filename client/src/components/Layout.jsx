import { Outlet } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import "../styles/Layout.css";

function Layout() {
  return (
    <div className="layout">

      <Topbar />

      <div className="layout-body">

        <Sidebar />

        <main className="page-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default Layout;
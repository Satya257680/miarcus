import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function Layout({ children }) {
  return (
    <div className="dashboard">

      <Sidebar />

      <main className="main">

        <Topbar />

        <div className="content">
          {children}
        </div>

      </main>

    </div>
  );
}

export default Layout;
import { FaBars, FaBell, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useLocation } from "react-router-dom";

import miarcusLogo from "../assets/Miarcus.png";
import "./Topbar.css";

function Topbar() {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return "Dashboard";

      case "/action-points":
        return "Action Points";

      case "/checklist":
        return "Checklist";

      case "/users":
        return "Users";

      case "/profile":
        return "Profile";

      default:
        return "MIARCUS ERP";
    }
  };

  return (
    <header className="topbar">

      {/* Left */}
      <div className="topbar-left">
        <button className="menu-btn">
          <FaBars />
        </button>

        
      </div>

      {/* Center */}
      <img
          src={miarcusLogo}
          alt="MIARCUS"
          className="topbar-logo"
        />
      {/* Right */}
      <div className="topbar-right">

        <button className="icon-btn">
          <FaBell />
        </button>

        <button className="profile-btn">
          <FaUserCircle />
          <span>Profile</span>
        </button>

        <button className="logout-btn">
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

      </div>

    </header>
  );
}

export default Topbar;
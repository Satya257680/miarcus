import "./Topbar.css";
import {
  FaBars,
  FaBell,
  FaUserCircle,
} from "react-icons/fa";

function Topbar({ collapsed, setCollapsed }) {
  return (
    <header className="topbar">

      <div className="topbar-left">

        <button
          className="menu-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          <FaBars />
        </button>

        <h2>Dashboard</h2>

      </div>

      <div className="topbar-right">

        <button className="icon-btn">
          <FaBell />
          <span className="badge">3</span>
        </button>

        <div className="profile">

          <FaUserCircle className="profile-icon"/>

          <div className="profile-info">
            <h4>Admin</h4>
            <p>Administrator</p>
          </div>

        </div>

      </div>

    </header>
  );
}

export default Topbar;
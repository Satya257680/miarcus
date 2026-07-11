import {
  FaBars,
  FaHome,
  FaTasks,
  FaBullhorn,
  FaBoxes,
  FaCalendarAlt,
  FaChartBar,
  FaClipboardList,
  FaLayerGroup,
  FaMoneyBillWave,
  FaGlobe,
  FaStore,
  FaBook,
  FaQuestionCircle,
  FaUsers,
  FaCog,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import "./Sidebar.css";

function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>

      {/* Header */}
      <div className="sidebar-header">
        <button
          className="menu-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          <FaBars />
        </button>

        {!collapsed && (
          <h2 className="sidebar-title">MIARCUS</h2>
        )}
      </div>

      {/* Menu */}
      <div className="sidebar-menu">
        <ul>

          <li className="active">
            <FaHome />
            {!collapsed && <span>Dashboard</span>}
          </li>

          <li>
            <FaTasks />
            {!collapsed && <span>Action Points</span>}
          </li>

          <li>
            <FaBullhorn />
            {!collapsed && <span>Announcements</span>}
          </li>

          <li>
            <FaBoxes />
            {!collapsed && <span>Asset Master</span>}
          </li>

          <li>
            <FaCalendarAlt />
            {!collapsed && <span>Attendance</span>}
          </li>

          <li>
            <FaChartBar />
            {!collapsed && <span>Checklist Reports</span>}
          </li>

          <li>
            <FaClipboardList />
            {!collapsed && <span>Checklist Submission</span>}
          </li>

          <li>
            <FaLayerGroup />
            {!collapsed && <span>Collection Tracking</span>}
          </li>

          <li>
            <FaMoneyBillWave />
            {!collapsed && <span>Expenses</span>}
          </li>

          <li>
            <FaLayerGroup />
            {!collapsed && <span>Inventory Planning</span>}
          </li>

          <li>
            <FaGlobe />
            {!collapsed && <span>Listing Tracker</span>}
          </li>

          <li>
            <FaStore />
            {!collapsed && <span>New Store Openings</span>}
          </li>

          <li>
            <FaBook />
            {!collapsed && <span>NSO Rules</span>}
          </li>

          <li>
            <FaQuestionCircle />
            {!collapsed && <span>Quiz</span>}
          </li>

          <li>
            <FaUsers />
            {!collapsed && <span>Sales Team</span>}
          </li>

          <li>
            <FaCog />
            {!collapsed && <span>Settings</span>}
          </li>

        </ul>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">

        <div className="profile">
          <FaUserCircle />
          {!collapsed && <span>Profile</span>}
        </div>

        <button className="logout-btn">
          <FaSignOutAlt />
          {!collapsed && <span>Logout</span>}
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;
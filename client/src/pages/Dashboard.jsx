import "./Dashboard.css";
import {
  FaHome,
  FaClipboardList,
  FaTasks,
  FaBullhorn,
  FaBoxes,
  FaCalendarAlt,
  FaChartBar,
  FaMoneyBillWave,
  FaLayerGroup,
  FaGlobe,
  FaStore,
  FaBook,
  FaQuestionCircle,
  FaUsers,
  FaCog,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

function Dashboard() {
  return (
    <div className="dashboard">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="sidebar-top">
          <ul className="menu">

            <li className="active">
              <FaHome />
              <span>Dashboard</span>
            </li>

            <li>
              <FaTasks />
              <span>Action Points</span>
            </li>

            <li>
              <FaBullhorn />
              <span>Announcements</span>
            </li>

            <li>
              <FaBoxes />
              <span>Asset Master</span>
            </li>

            <li>
              <FaCalendarAlt />
              <span>Attendance</span>
            </li>

            <li>
              <FaChartBar />
              <span>Checklist Reports</span>
            </li>

            <li>
              <FaClipboardList />
              <span>Checklist Submission</span>
            </li>

            <li>
              <FaLayerGroup />
              <span>Collection Tracking</span>
            </li>

            <li>
              <FaMoneyBillWave />
              <span>Expenses</span>
            </li>

            <li>
              <FaLayerGroup />
              <span>Inventory Planning</span>
            </li>

            <li>
              <FaGlobe />
              <span>Listing Tracker</span>
            </li>

            <li>
              <FaStore />
              <span>New Store Openings</span>
            </li>

            <li>
              <FaBook />
              <span>NSO Rules</span>
            </li>

            <li>
              <FaQuestionCircle />
              <span>Quiz</span>
            </li>

            <li>
              <FaUsers />
              <span>Sales Team</span>
            </li>

            <li>
              <FaCog />
              <span>Settings</span>
            </li>

          </ul>
        </div>

        <div className="sidebar-bottom">
          <ul className="menu">

            <li>
              <FaUserCircle />
              <span>Profile</span>
            </li>

            <li className="logout">
              <FaSignOutAlt />
              <span>Logout</span>
            </li>

          </ul>
        </div>

      </aside>

      {/* Main */}
      <main className="main">

        {/* Header */}
        <header className="topbar">

          <img
            src="/miarcusT.png"
            alt="Miarcus"
            className="logo-img"
          />

          <div className="welcome-text">
          
            <h2>Welcome to Miarcus 👋</h2>
            <p>Manage your dashboard efficiently.</p>
          </div>

        </header>

        {/* Welcome Card */}
        <section className="welcome-card">

          <h1>Dashboard</h1>

          <p>
            Welcome to the Miarcus Dashboard.
          </p>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;
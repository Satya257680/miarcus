import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard">

      <div className="sidebar">
        <h2>Miarcus</h2>

        <ul>
          <li>🏠 Dashboard</li>
          <li>✅ Checklist</li>
          <li>✅ Action Points</li>
          <li>👤 Profile</li>
          <li>⚙️ Settings</li>
          <li>🚪 Logout</li>
        </ul>
      </div>

      <div className="main-content">

        <div className="header">
          <h1>Dashboard</h1>
          <p>Welcome to Miarcus Portal</p>
        </div>

        <div className="cards">

          <div className="card">
            <h3>Total Users</h3>
            <h1>150</h1>
          </div>

          <div className="card">
            <h3>Completed Checklist</h3>
            <h1>96</h1>
          </div>

          <div className="card">
            <h3>Pending Tasks</h3>
            <h1>54</h1>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
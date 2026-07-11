import "./ActionPoints.css";
import {
  FaPlusSquare,
  FaDownload,
  FaRedoAlt,
  FaSearch,
} from "react-icons/fa";

function ActionPoints() {
  return (
    <div className="action-page">

      <div className="action-card">

        <h2 className="title">
          Action Points
        </h2>

        {/* ================= Filters ================= */}

        <div className="filter-row">

          <select>
            <option>All Stores/Locations</option>
          </select>

          <select>
            <option>All Departments</option>
          </select>

          <select>
            <option>All Statuses</option>
          </select>

          <select>
            <option>All Checklist Types</option>
          </select>

          <div className="date-group">

            <label>Start Date:</label>

            <input type="date" />

          </div>

          <div className="date-group">

            <label>End Date:</label>

            <input type="date" />

          </div>

        </div>

        {/* ================= Bottom ================= */}

        <div className="bottom-row">

          <div className="search-box">

            <FaSearch />

            <input
              type="text"
              placeholder="Search action points..."
            />

          </div>

          <div className="button-group">

            <button className="create-btn">

              <FaPlusSquare />

              Create Point

            </button>

            <button className="export-btn">

              <FaDownload />

              Export CSV

            </button>

            <button className="clear-btn">

              <FaRedoAlt />

              Clear Filters

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ActionPoints;
import { useEffect, useState } from "react";
import axios from "axios";

import "../styles/ActionPoints.css";

import {
  FaPlusSquare,
  FaDownload,
  FaRedoAlt,
  FaSearch,
} from "react-icons/fa";

function ActionPoints() {

  const [stores, setStores] = useState([]);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {

      const res = await axios.get(
        "http://localhost:5000/api/stores"
      );

      setStores(res.data);

    } catch (err) {

      console.log(err);

    }
  };

  return (

    <div className="action-page">

      {/* ================= Filter Card ================= */}

      <div className="action-card">

        <h2 className="title">
          Action Points
        </h2>

        {/* ================= Filters ================= */}

        <div className="filter-row">

          {/* Stores */}

          <select>

            <option value="">
              All Stores/Locations
            </option>

            {stores.map((store) => (

              <option
                key={store.id}
                value={store.id}
              >
                {store.store_name} ({store.store_code})
              </option>

            ))}

          </select>

          {/* Departments */}

          <select>

            <option>
              All Departments
            </option>

          </select>

          {/* Status */}

          <select>

            <option>
              All Statuses
            </option>

          </select>

          {/* Checklist */}

          <select>

            <option>
              All Checklist Types
            </option>

          </select>

          {/* Start Date */}

          <div className="date-group">

            <label>
              Start Date
            </label>

            <input type="date" />

          </div>

          {/* End Date */}

          <div className="date-group">

            <label>
              End Date
            </label>

            <input type="date" />

          </div>

        </div>

        {/* ================= Search & Buttons ================= */}

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

      {/* ================= Table ================= */}

      <div className="table-container">

        <table className="action-table">

          <thead>

            <tr>

              
            </tr>

          </thead>

          <tbody>

            <tr>

              <td
                colSpan="13"
                className="no-data"
              >
                No Action Points Found
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

  );
}

export default ActionPoints;
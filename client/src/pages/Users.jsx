import { useEffect, useState } from "react";
import axios from "axios";

import {
  FaSearch,
  FaPlus,
  FaUpload,
  FaTrash,
} from "react-icons/fa";

import "../styles/Users.css";

function Users() {

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  // =============================
  // Load Users
  // =============================

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/api/users"
      );

      setUsers(res.data.users);

    } catch (err) {

      console.log(err);

    }

  };

  return (

    <div className="users-page">

      {/* Header */}

      <div className="users-header">

        <h2>Users</h2>

        <div className="users-actions">

          <div className="search-box">

            <FaSearch />

            <input
              type="text"
              placeholder="Search User..."
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
            />

          </div>

          <button className="add-btn">
            <FaPlus />
            Add User
          </button>

          <button className="export-btn">
            <FaUpload />
            Export
          </button>

          <button className="delete-btn">
            <FaTrash />
            Delete
          </button>

        </div>

      </div>

      {/* Table */}

      <table className="users-table">

        <thead>

          <tr>

            <th>ID</th>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>

          </tr>

        </thead>

        <tbody>

          {users
            .filter((user)=>
              user.name
                ?.toLowerCase()
                .includes(search.toLowerCase())
            )
            .map((user)=>(

              <tr key={user.id}>

                <td>{user.id}</td>

                <td>{user.employee_id}</td>

                <td>{user.name}</td>

                <td>{user.email}</td>

                <td>{user.department}</td>

                <td>{user.designation}</td>

                <td>{user.status}</td>

              </tr>

            ))}

        </tbody>

      </table>

    </div>

  );

}

export default Users;
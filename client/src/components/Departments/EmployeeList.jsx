import { FaSearch } from "react-icons/fa";

function EmployeeList({
  users = [],
  search,
  setSearch,
  selectedUsers,
  setSelectedUsers,
}) {
  // Filter Users
  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase();

    return (
      user.name?.toLowerCase().includes(keyword) ||
      user.employee_id?.toLowerCase().includes(keyword) ||
      user.email?.toLowerCase().includes(keyword)
    );
  });

  // Select All Visible Users
  const allVisibleSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((user) => selectedUsers.includes(user.id));

  const handleSelectAll = (checked) => {
    if (checked) {
      const ids = filteredUsers.map((user) => user.id);

      setSelectedUsers([...new Set([...selectedUsers, ...ids])]);
    } else {
      setSelectedUsers(
        selectedUsers.filter(
          (id) => !filteredUsers.some((user) => user.id === id)
        )
      );
    }
  };

  // Toggle Single User
  const toggleUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter((item) => item !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  return (
    <div className="employee-wrapper">

      <h3 className="employee-title">Assign Employees</h3>

      {/* Toolbar */}

      <div className="employee-toolbar">

        <label className="select-all">

          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />

          <span>Select all (visible)</span>

        </label>

        <div className="employee-search">

          <FaSearch className="search-icon" />

          <input
            type="text"
            placeholder="Search name, employee ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

        </div>

      </div>

      {/* Employee List */}

      <div className="employee-grid">

        {filteredUsers.length === 0 ? (

          <div className="employee-empty">
            No employees found.
          </div>

        ) : (

          filteredUsers.map((user) => (

            <label
              key={user.id}
              className="employee-card"
            >

              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={() => toggleUser(user.id)}
              />

              <div className="employee-info">

                <div className="employee-name">
                  {user.name}
                </div>

                <div className="employee-id">
                  {user.employee_id}
                </div>

              </div>

            </label>

          ))

        )}

      </div>

    </div>
  );
}

export default EmployeeList;
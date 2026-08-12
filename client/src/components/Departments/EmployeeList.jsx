import { FaSearch, FaUsers } from "react-icons/fa";
import "./EmployeeList.css";

function EmployeeList({
    users = [],
    search,
    setSearch,
    selectedUsers,
    setSelectedUsers,
}) {

    // =====================================================
    // FILTER USERS
    // =====================================================

    const filteredUsers = users.filter((user) => {
        const keyword = (search || "").toLowerCase().trim();

        return (
            user.name?.toLowerCase().includes(keyword) ||
            user.employee_id
                ?.toLowerCase()
                .includes(keyword) ||
            user.email
                ?.toLowerCase()
                .includes(keyword)
        );
    });


    // =====================================================
    // SELECT ALL VISIBLE USERS
    // =====================================================

    const allVisibleSelected =
        filteredUsers.length > 0 &&
        filteredUsers.every((user) =>
            selectedUsers.includes(user.id)
        );


    // =====================================================
    // SELECT ALL
    // =====================================================

    const handleSelectAll = (checked) => {

        if (checked) {

            const ids = filteredUsers.map(
                (user) => user.id
            );

            setSelectedUsers([
                ...new Set([
                    ...selectedUsers,
                    ...ids,
                ]),
            ]);

        } else {

            setSelectedUsers(
                selectedUsers.filter(
                    (id) =>
                        !filteredUsers.some(
                            (user) => user.id === id
                        )
                )
            );
        }
    };


    // =====================================================
    // TOGGLE SINGLE USER
    // =====================================================

    const toggleUser = (id) => {

        if (selectedUsers.includes(id)) {

            setSelectedUsers(
                selectedUsers.filter(
                    (item) => item !== id
                )
            );

        } else {

            setSelectedUsers([
                ...selectedUsers,
                id,
            ]);
        }
    };


    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="employee-wrapper">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="employee-header">

                <div className="employee-heading">

                    <div className="employee-heading-icon">
                        <FaUsers />
                    </div>

                    <div>
                        <h3>
                            Assign Employees
                        </h3>

                        <p>
                            Select employees for this department
                        </p>
                    </div>

                </div>


                <div className="employee-count">

                    {selectedUsers.length} selected

                </div>

            </div>


            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="employee-toolbar">

                {/* Select All */}

                <label className="select-all">

                    <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(e) =>
                            handleSelectAll(
                                e.target.checked
                            )
                        }
                    />

                    <span>
                        Select all visible
                    </span>

                </label>


                {/* Search */}

                <div className="employee-search">

                    <FaSearch className="search-icon" />

                    <input
                        type="text"
                        placeholder="Search name, employee ID or email..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                    {search && (
                        <button
                            type="button"
                            className="clear-search"
                            onClick={() =>
                                setSearch("")
                            }
                            title="Clear search"
                        >
                            ×
                        </button>
                    )}

                </div>

            </div>


            {/* =================================================
                EMPLOYEE LIST
            ================================================= */}

            <div className="employee-grid">

                {filteredUsers.length === 0 ? (

                    <div className="employee-empty">

                        <div className="employee-empty-icon">
                            <FaUsers />
                        </div>

                        <div className="employee-empty-title">
                            No employees found
                        </div>

                        <div className="employee-empty-text">
                            Try changing your search.
                        </div>

                    </div>

                ) : (

                    filteredUsers.map((user) => {

                        const isSelected =
                            selectedUsers.includes(
                                user.id
                            );

                        return (

                            <label
                                key={user.id}
                                className={`employee-card ${
                                    isSelected
                                        ? "selected"
                                        : ""
                                }`}
                            >

                                {/* Checkbox */}

                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                        toggleUser(
                                            user.id
                                        )
                                    }
                                />


                                {/* Employee Avatar */}

                                <div className="employee-avatar">

                                    {user.name
                                        ?.charAt(0)
                                        ?.toUpperCase() || "U"}

                                </div>


                                {/* Employee Information */}

                                <div className="employee-info">

                                    <div className="employee-name">
                                        {user.name || "Unknown User"}
                                    </div>

                                    <div className="employee-id">
                                        {user.employee_id ||
                                            "No Employee ID"}
                                    </div>

                                    {user.email && (
                                        <div className="employee-email">
                                            {user.email}
                                        </div>
                                    )}

                                </div>


                                {/* Selected Indicator */}

                                {isSelected && (
                                    <div className="employee-selected-indicator">
                                        ✓
                                    </div>
                                )}

                            </label>

                        );
                    })

                )}

            </div>

        </div>
    );
}

export default EmployeeList;
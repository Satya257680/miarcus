const db = require("../config/db");

// ==========================
// Get All Users
// ==========================

const getAllUsers = (callback) => {

    const sql = `
        SELECT
            u.id,
            u.employee_id,
            u.name,
            u.email,
            u.password,
            u.profile_photo,
            u.reports_to,
            u.status,
            u.created_at,

            u.department_id,
            d.department_name AS department,

            u.designation_id,
            dg.designation_name AS designation

        FROM users u

        LEFT JOIN departments d
            ON u.department_id = d.id

        LEFT JOIN designations dg
            ON u.designation_id = dg.id

        ORDER BY u.id DESC
    `;

    db.query(sql, callback);

};

// ==========================
// Add User
// ==========================

const addUser = (user, callback) => {

    const sql = `
        INSERT INTO users
        (
            employee_id,
            name,
            email,
            password,
            department_id,
            designation_id,
            reports_to,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            user.employeeId,
            user.fullName,
            user.email,
            user.password,
            user.department_id,
            user.designation_id,

            user.reportsTo
                ? user.reportsTo.name || user.reportsTo
                : "",

            user.active ? "Active" : "Inactive",
        ],
        callback
    );

};

// ==========================
// Bulk Insert Users
// ==========================

const bulkInsertUsers = (users, callback) => {

    const sql = `
        INSERT INTO users
        (
            employee_id,
            name,
            email,
            password,
            department,
            designation,
            reports_to,
            status
        )
        VALUES ?
    `;

    const values = users.map((user) => [

        user["Employee ID"] || "",
        user["Name"] || "",
        user["Email"] || "",
        user["Password"] || "123456",
        user["Department"] || "",
        user["Designation"] || "",
        user["Reports To"] || "",
        user["Status"] || "Active",

    ]);

    db.query(sql, [values], callback);

};

// ==========================
// Update User
// ==========================

const updateUser = (id, user, callback) => {

    const sql = `
        UPDATE users
        SET
            employee_id = ?,
            name = ?,
            email = ?,
            department_id = ?,
            designation_id = ?,
            reports_to = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            user.employeeId,
            user.fullName,
            user.email,
            user.department_id,
            user.designation_id,

            user.reportsTo
                ? user.reportsTo.name || user.reportsTo
                : "",

            user.status,
            id,
        ],
        callback
    );

};

// ==========================
// Disable User
// ==========================

const disableUser = (id, callback) => {

    db.query(
        "UPDATE users SET status='Inactive' WHERE id=?",
        [id],
        callback
    );

};

// ==========================
// Delete User
// ==========================

const deleteUser = (id, callback) => {

    db.query(
        "DELETE FROM users WHERE id=?",
        [id],
        callback
    );

};

// ==========================
// Delete All Users
// ==========================

const deleteAllUsers = (callback) => {

    db.query(
        "DELETE FROM users",
        callback
    );

};

// ==========================
// Get User Names
// ==========================

const getUserNames = (callback) => {

    const sql = `
        SELECT
            id,
            name
        FROM users
        ORDER BY name ASC
    `;

    db.query(sql, callback);

};

// ==========================
// Export
// ==========================

module.exports = {
    getAllUsers,
    addUser,
    bulkInsertUsers,
    updateUser,
    disableUser,
    deleteUser,
    deleteAllUsers,
    getUserNames,
};
const db = require("../config/db");

// ==========================
// Get All Users
// ==========================

const getAllUsers = (callback) => {

    const sql = `
        SELECT *
        FROM users
        ORDER BY id DESC
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
            department,
            designation,
            reports_to,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            user.employee_id,
            user.name,
            user.email,
            user.password,
            user.department,
            user.designation,
            user.reports_to,
            user.status,
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

        user.employee_id || "",
        user.name || "",
        user.email || "",
        user.password || "123456",
        user.department || "",
        user.designation || "",
        user.reports_to || "",
        user.status || "Active",

    ]);

    db.query(sql, [values], callback);

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
// Export
// ==========================

module.exports = {
    getAllUsers,
    addUser,
    bulkInsertUsers,
    deleteAllUsers,
};
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
            user.status
        ],
        callback
    );

};

// ==========================
// Export
// ==========================

module.exports = {
    getAllUsers,
    addUser,
};
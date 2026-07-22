const db = require("../config/db");

// Get all departments
const getAllDepartments = (callback) => {
  const sql = `
    SELECT *
    FROM departments
    ORDER BY created_at DESC
  `;

  db.query(sql, callback);
};

// Get department by ID
const getDepartmentById = (id, callback) => {
  const sql = `
    SELECT *
    FROM departments
    WHERE id = ?
  `;

  db.query(sql, [id], callback);
};

// Check duplicate department name
const checkDepartmentExists = (departmentName, callback) => {
  const sql = `
    SELECT id
    FROM departments
    WHERE department_name = ?
  `;

  db.query(sql, [departmentName], callback);
};

// Add department
const createDepartment = (department, callback) => {
  const sql = `
    INSERT INTO departments
    (department_name, description, status)
    VALUES (?, ?, ?)
  `;

  db.query(
    sql,
    [
      department.department_name,
      department.description,
      department.status,
    ],
    callback
  );
};

// Update department
const updateDepartment = (id, department, callback) => {
  const sql = `
    UPDATE departments
    SET
      department_name = ?,
      description = ?,
      status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      department.department_name,
      department.description,
      department.status,
      id,
    ],
    callback
  );
};

// Delete department
const deleteDepartment = (id, callback) => {
  const sql = `
    DELETE FROM departments
    WHERE id = ?
  `;

  db.query(sql, [id], callback);
};


// ==============================
// Assign Users to Department
// ==============================

const assignUsers = (departmentId, userIds, callback) => {
  if (!userIds || userIds.length === 0) {
    return callback(null);
  }

  const sql = `
    INSERT INTO department_users
    (department_id, user_id)
    VALUES ?
  `;

  const values = userIds.map((userId) => [
    departmentId,
    userId,
  ]);

  db.query(sql, [values], callback);
};

// ==============================
// Remove Assigned Users
// ==============================

const removeAssignedUsers = (departmentId, callback) => {
  const sql = `
    DELETE FROM department_users
    WHERE department_id = ?
  `;

  db.query(sql, [departmentId], callback);
};

// ==============================
// Get Assigned Users
// ==============================

const getAssignedUsers = (departmentId, callback) => {
  const sql = `
    SELECT user_id
    FROM department_users
    WHERE department_id = ?
  `;

  db.query(sql, [departmentId], callback);
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  checkDepartmentExists,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Employee Assignment
  assignUsers,
  removeAssignedUsers,
  getAssignedUsers,
};
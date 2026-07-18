const db = require("../config/db");

// ==========================
// Get All Designations
// ==========================

const getAllDesignations = (callback) => {
  const sql = `
    SELECT
      d.id,
      d.department_id,
      dep.department_name,
      d.designation_name,
      d.description,
      d.status,
      d.created_at,
      COUNT(du.user_id) AS assigned_users
    FROM designations d
    JOIN departments dep
      ON d.department_id = dep.id
    LEFT JOIN designation_users du
      ON d.id = du.designation_id
    GROUP BY
      d.id,
      d.department_id,
      dep.department_name,
      d.designation_name,
      d.description,
      d.status,
      d.created_at
    ORDER BY d.id DESC
  `;

  db.query(sql, callback);
};

// ==========================
// Get Designation By ID
// ==========================

const getDesignationById = (id, callback) => {
  db.query(
    "SELECT * FROM designations WHERE id = ?",
    [id],
    callback
  );
};

// ==========================
// Check Duplicate Designation
// ==========================

const checkDesignationExists = (
  designation_name,
  department_id,
  callback
) => {
  db.query(
    `SELECT *
     FROM designations
     WHERE designation_name = ?
     AND department_id = ?`,
    [designation_name, department_id],
    callback
  );
};

// ==========================
// Create Designation
// ==========================

const createDesignation = (data, callback) => {
  db.query(
    `INSERT INTO designations
      (department_id, designation_name, description, status)
     VALUES (?, ?, ?, ?)`,
    [
      data.department_id,
      data.designation_name,
      data.description,
      data.status,
    ],
    callback
  );
};

// ==========================
// Update Designation
// ==========================

const updateDesignation = (id, data, callback) => {
  db.query(
    `UPDATE designations
     SET
       department_id = ?,
       designation_name = ?,
       description = ?,
       status = ?
     WHERE id = ?`,
    [
      data.department_id,
      data.designation_name,
      data.description,
      data.status,
      id,
    ],
    callback
  );
};

// ==========================
// Delete Designation
// ==========================

const deleteDesignation = (id, callback) => {
  db.query(
    "DELETE FROM designations WHERE id = ?",
    [id],
    callback
  );
};

// ==========================
// Assign Users
// ==========================

const assignUsers = (designationId, users, callback) => {
  if (!users || users.length === 0) {
    return callback(null);
  }

  const values = users.map((userId) => [
    designationId,
    userId,
  ]);

  db.query(
    "INSERT INTO designation_users (designation_id, user_id) VALUES ?",
    [values],
    callback
  );
};

// ==========================
// Remove Assigned Users
// ==========================

const removeAssignedUsers = (designationId, callback) => {
  db.query(
    "DELETE FROM designation_users WHERE designation_id = ?",
    [designationId],
    callback
  );
};

// ==========================
// Get Assigned Users
// ==========================

const getAssignedUsers = (designationId, callback) => {
  db.query(
    `SELECT user_id
     FROM designation_users
     WHERE designation_id = ?`,
    [designationId],
    callback
  );
};

// ==========================
// Export
// ==========================

module.exports = {
  getAllDesignations,
  getDesignationById,
  checkDesignationExists,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  assignUsers,
  removeAssignedUsers,
  getAssignedUsers,
};
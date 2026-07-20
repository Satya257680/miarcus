const db = require("../config/db");

// ==============================
// Get All Checklist Types
// ==============================

const getAllChecklistTypes = (callback) => {
  const sql = `
    SELECT
      ct.id,
      ct.checklist_name,
      ct.allow_past_submission,
      ct.cutoff_time,
      ct.status,
      ct.created_at,

      GROUP_CONCAT(
        DISTINCT d.department_name
        ORDER BY d.department_name
        SEPARATOR ', '
      ) AS departments

    FROM checklist_types ct

    LEFT JOIN checklist_type_departments ctd
      ON ct.id = ctd.checklist_type_id

    LEFT JOIN departments d
      ON d.id = ctd.department_id

    GROUP BY ct.id

    ORDER BY ct.created_at DESC
  `;

  db.query(sql, callback);
};

// ==============================
// Get Checklist Type By ID
// ==============================

const getChecklistTypeById = (id, callback) => {

  const sql = `
    SELECT
      ct.*,

      (
        SELECT GROUP_CONCAT(department_id)
        FROM checklist_type_departments
        WHERE checklist_type_id = ct.id
      ) AS department_ids,

      (
        SELECT GROUP_CONCAT(user_id)
        FROM checklist_type_users
        WHERE checklist_type_id = ct.id
      ) AS user_ids

    FROM checklist_types ct
    WHERE ct.id = ?
  `;

  db.query(sql, [id], callback);
};

// ==============================
// Create Checklist Type
// ==============================

const createChecklistType = (data, callback) => {

  const sql = `
    INSERT INTO checklist_types
    (
      checklist_name,
      allow_past_submission,
      cutoff_time,
      status
    )
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      data.checklist_name,
      data.allow_past_submission ? 1 : 0,
      data.cutoff_time || null,
      data.status || "Active",
    ],
    callback
  );
};

// ==============================
// Save Departments
// ==============================

const saveDepartments = (
  checklistId,
  departments,
  callback
) => {

  if (!departments || departments.length === 0) {
    return callback(null);
  }

  const values = departments.map((departmentId) => [
    checklistId,
    departmentId,
  ]);

  db.query(
    `
      INSERT INTO checklist_type_departments
      (
        checklist_type_id,
        department_id
      )
      VALUES ?
    `,
    [values],
    callback
  );
};

// ==============================
// Save Users
// ==============================

const saveUsers = (
  checklistId,
  users,
  callback
) => {

  if (!users || users.length === 0) {
    return callback(null);
  }

  const values = users.map((userId) => [
    checklistId,
    userId,
  ]);

  db.query(
    `
      INSERT INTO checklist_type_users
      (
        checklist_type_id,
        user_id
      )
      VALUES ?
    `,
    [values],
    callback
  );
};

// ==============================
// Delete Departments
// ==============================

const deleteDepartments = (
  checklistId,
  callback
) => {

  db.query(
    `
      DELETE FROM checklist_type_departments
      WHERE checklist_type_id = ?
    `,
    [checklistId],
    callback
  );
};

// ==============================
// Delete Users
// ==============================

const deleteUsers = (
  checklistId,
  callback
) => {

  db.query(
    `
      DELETE FROM checklist_type_users
      WHERE checklist_type_id = ?
    `,
    [checklistId],
    callback
  );
};

// ==============================
// Update Checklist Type
// ==============================

const updateChecklistType = (
  id,
  data,
  callback
) => {

  const sql = `
    UPDATE checklist_types
    SET
      checklist_name = ?,
      allow_past_submission = ?,
      cutoff_time = ?,
      status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      data.checklist_name,
      data.allow_past_submission ? 1 : 0,
      data.cutoff_time || null,
      data.status || "Active",
      id,
    ],
    callback
  );
};

// ==============================
// Delete Checklist Type
// ==============================

const deleteChecklistType = (
  id,
  callback
) => {

  db.query(
    `
      DELETE FROM checklist_types
      WHERE id = ?
    `,
    [id],
    callback
  );
};

// ==============================
// Delete All Checklist Types
// ==============================

const deleteAllChecklistTypes = (callback) => {

  db.query(
    `
      DELETE FROM checklist_types
    `,
    callback
  );
};
// ==============================
// Export Checklist Types
// ==============================

const getChecklistTypesForExport = (callback) => {

  const sql = `
    SELECT
      ct.checklist_name,
      GROUP_CONCAT(DISTINCT d.department_name SEPARATOR ', ') AS departments,
      ct.allow_past_submission,
      ct.cutoff_time,
      ct.status

    FROM checklist_types ct

    LEFT JOIN checklist_type_departments ctd
      ON ct.id = ctd.checklist_type_id

    LEFT JOIN departments d
      ON d.id = ctd.department_id

    GROUP BY ct.id

    ORDER BY ct.id
  `;

  db.query(sql, callback);

};
module.exports = {
  getAllChecklistTypes,
  getChecklistTypeById,
  createChecklistType,
  saveDepartments,
  saveUsers,
  deleteDepartments,
  deleteUsers,
  updateChecklistType,
  deleteChecklistType,
  deleteAllChecklistTypes,
  getChecklistTypesForExport,
};
const db = require("../config/db");

// ===============================
// Get All Managers
// ===============================
const getAllReports = (callback) => {
  const sql = `
    SELECT *
    FROM reports_to
    ORDER BY id DESC
  `;

  db.query(sql, callback);
};

// ===============================
// Add Manager
// ===============================
const addReport = (data, callback) => {
  const sql = `
    INSERT INTO reports_to
    (
      manager_name,
      department,
      designation,
      status
    )
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      data.manager_name,
      data.department,
      data.designation,
      data.status,
    ],
    callback
  );
};

// ===============================
// Bulk Insert Managers
// ===============================
const bulkInsertReports = (reports, callback) => {

  const sql = `
    INSERT INTO reports_to
    (
      manager_name,
      department,
      designation,
      status
    )
    VALUES ?
  `;

  const values = reports.map((report) => [
    report["Manager Name"] || "",
    report["Department"] || "",
    report["Designation"] || "",
    report["Status"] || "Active",
  ]);

  db.query(sql, [values], callback);
};

// ===============================
// Update Manager
// ===============================
const updateReport = (id, data, callback) => {
  const sql = `
    UPDATE reports_to
    SET
      manager_name=?,
      department=?,
      designation=?,
      status=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      data.manager_name,
      data.department,
      data.designation,
      data.status,
      id,
    ],
    callback
  );
};

// ===============================
// Delete Manager
// ===============================
const deleteReport = (id, callback) => {
  db.query(
    "DELETE FROM reports_to WHERE id=?",
    [id],
    callback
  );
};

module.exports = {
  getAllReports,
  addReport,
  bulkInsertReports,
  updateReport,
  deleteReport,
};
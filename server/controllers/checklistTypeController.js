const ChecklistType = require("../models/checklistTypeModel");
const ExcelJS = require("exceljs");
const db = require("../config/db");


// ==============================
// Get All Checklist Types
// ==============================

exports.getChecklistTypes = (req, res) => {
  ChecklistType.getAllChecklistTypes((err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      data: rows,
    });
  });
};

// ==============================
// Get Checklist Type By ID
// ==============================

exports.getChecklistTypeById = (req, res) => {
  ChecklistType.getChecklistTypeById(req.params.id, (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Checklist Type not found",
      });
    }

    const checklist = rows[0];

    checklist.departments = checklist.department_ids
      ? checklist.department_ids.split(",").map(Number)
      : [];

    checklist.users = checklist.user_ids
      ? checklist.user_ids.split(",").map(Number)
      : [];

    res.json({
      success: true,
      data: checklist,
    });
  });
};

// ==============================
// Create Checklist Type
// ==============================

exports.createChecklistType = (req, res) => {
  const {
    checklist_name,
    allow_past_submission,
    cutoff_time,
    status,
    departments = [],
    users = [],
  } = req.body;

  if (!checklist_name) {
    return res.status(400).json({
      success: false,
      message: "Checklist Name is required.",
    });
  }

  ChecklistType.createChecklistType(
    {
      checklist_name,
      allow_past_submission,
      cutoff_time,
      status,
    },
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      const checklistId = result.insertId;

      ChecklistType.saveDepartments(
        checklistId,
        departments,
        (deptErr) => {
          if (deptErr) {
            return res.status(500).json({
              success: false,
              message: deptErr.message,
            });
          }

          ChecklistType.saveUsers(
            checklistId,
            users,
            (userErr) => {
              if (userErr) {
                return res.status(500).json({
                  success: false,
                  message: userErr.message,
                });
              }

              res.status(201).json({
                success: true,
                message: "Checklist Type created successfully.",
              });
            }
          );
        }
      );
    }
  );
};
// ==============================
// Update Checklist Type
// ==============================

exports.updateChecklistType = (req, res) => {

  const id = req.params.id;

  const {
    checklist_name,
    allow_past_submission,
    cutoff_time,
    status,
    departments = [],
    users = [],
  } = req.body;

  ChecklistType.updateChecklistType(
    id,
    {
      checklist_name,
      allow_past_submission,
      cutoff_time,
      status,
    },
    (err) => {

      if (err) {
        return res.status(500).json({
          success: false,
          message: err.message,
        });
      }

      ChecklistType.deleteDepartments(id, (deptDeleteErr) => {

        if (deptDeleteErr) {
          return res.status(500).json({
            success: false,
            message: deptDeleteErr.message,
          });
        }

        ChecklistType.saveDepartments(
          id,
          departments,
          (deptSaveErr) => {

            if (deptSaveErr) {
              return res.status(500).json({
                success: false,
                message: deptSaveErr.message,
              });
            }

            ChecklistType.deleteUsers(id, (userDeleteErr) => {

              if (userDeleteErr) {
                return res.status(500).json({
                  success: false,
                  message: userDeleteErr.message,
                });
              }

              ChecklistType.saveUsers(
                id,
                users,
                (userSaveErr) => {

                  if (userSaveErr) {
                    return res.status(500).json({
                      success: false,
                      message: userSaveErr.message,
                    });
                  }

                  res.json({
                    success: true,
                    message: "Checklist Type updated successfully.",
                  });

                }
              );

            });

          }
        );

      });

    }
  );

};

// ==============================
// Delete Checklist Type
// ==============================

exports.deleteChecklistType = (req, res) => {

  ChecklistType.deleteChecklistType(req.params.id, (err) => {

    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "Checklist Type deleted successfully.",
    });

  });

};

// ==============================
// Delete All Checklist Types
// ==============================

exports.deleteAllChecklistTypes = (req, res) => {

  ChecklistType.deleteAllChecklistTypes((err) => {

    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "All Checklist Types deleted successfully.",
    });

  });

};
// ==============================
// Export Checklist Types
// ==============================

exports.exportChecklistTypes = (req, res) => {

  ChecklistType.getChecklistTypesForExport(async (err, rows) => {

    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Checklist Types");

    worksheet.columns = [
      { header: "Checklist Name", key: "checklist_name", width: 30 },
      { header: "Departments", key: "departments", width: 30 },
      { header: "Allow Past Submission", key: "allow_past_submission", width: 20 },
      { header: "Cutoff Time", key: "cutoff_time", width: 20 },
      { header: "Status", key: "status", width: 15 },
    ];

    rows.forEach((row) => {
      worksheet.addRow({
        checklist_name: row.checklist_name,
        departments: row.departments || "",
        allow_past_submission: row.allow_past_submission ? "Yes" : "No",
        cutoff_time: row.cutoff_time || "",
        status: row.status,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ChecklistTypes.xlsx"
    );

    await workbook.xlsx.write(res);

    res.end();

  });

};
// ==============================
// Import Checklist Types
// ==============================

exports.importChecklistTypes = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file.",
      });
    }

    console.log(req.file);

    const workbook = new ExcelJS.Workbook();

    // Load Excel from memory buffer
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: "Worksheet not found.",
      });
    }

    let imported = 0;

    for (let i = 2; i <= worksheet.rowCount; i++) {

      const row = worksheet.getRow(i);

      const checklist_name = row.getCell(1).text.trim();

      const allow_past_submission =
        row.getCell(3).text.trim().toLowerCase() === "yes" ? 1 : 0;

      const cutoff_time = row.getCell(4).text.trim() || null;

      const status = row.getCell(5).text.trim() || "Active";

      if (!checklist_name) continue;

      await new Promise((resolve, reject) => {

        db.query(
          `
          INSERT INTO checklist_types
          (
            checklist_name,
            allow_past_submission,
            cutoff_time,
            status
          )
          VALUES (?, ?, ?, ?)
          `,
          [
            checklist_name,
            allow_past_submission,
            cutoff_time,
            status,
          ],
          (err) => {
            if (err) return reject(err);

            imported++;

            resolve();
          }
        );

      });

    }

    res.json({
      success: true,
      message: `${imported} Checklist Types imported successfully.`,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};
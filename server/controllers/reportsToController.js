const fs = require("fs");
const XLSX = require("xlsx");

const Report = require("../models/reportsToModel");

// ===============================
// Get All Managers
// ===============================
const getReports = (req, res) => {
  Report.getAllReports((err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database Error",
      });
    }

    res.json({
      success: true,
      reports: result,
    });
  });
};

// ===============================
// Add Manager
// ===============================
const createReport = (req, res) => {
  const {
    manager_name,
    department,
    designation,
    status,
  } = req.body;

  Report.addReport(
    {
      manager_name,
      department,
      designation,
      status,
    },
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Unable to add manager",
        });
      }

      res.json({
        success: true,
        message: "Manager Added Successfully",
      });
    }
  );
};

// ===============================
// Bulk Upload Managers
// ===============================
const bulkUploadReports = (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = XLSX.readFile(req.file.path);

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]];

    const reports = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      blankrows: false,
    });

    const filteredReports = reports.filter((item) => {

      return (
        String(item["Manager Name"] || "").trim() !== ""
      );

    });

    if (filteredReports.length === 0) {

      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        success: false,
        message: "No valid managers found.",
      });

    }

    Report.bulkInsertReports(filteredReports, (err, result) => {

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (err) {

        console.log(err);

        return res.status(500).json({
          success: false,
          message: "Bulk Upload Failed",
          error: err.sqlMessage,
        });

      }

      res.json({
        success: true,
        message: `${result.affectedRows} managers uploaded successfully`,
      });

    });

  } catch (err) {

    console.log(err);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Upload Error",
    });

  }
};

// ===============================
// Update Manager
// ===============================
const editReport = (req, res) => {
  Report.updateReport(req.params.id, req.body, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Update Failed",
      });
    }

    res.json({
      success: true,
      message: "Manager Updated Successfully",
    });
  });
};

// ===============================
// Delete Manager
// ===============================
const removeReport = (req, res) => {
  Report.deleteReport(req.params.id, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Delete Failed",
      });
    }

    res.json({
      success: true,
      message: "Manager Deleted Successfully",
    });
  });
};

module.exports = {
  getReports,
  createReport,
  bulkUploadReports,
  editReport,
  removeReport,
};
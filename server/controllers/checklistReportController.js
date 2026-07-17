const Report = require("../models/checklistReportModel");
const { Parser } = require("json2csv");
const fs = require("fs");
const csv = require("csv-parser");

// ======================
// GET REPORTS
// ======================
exports.getReports = (req, res) => {
  Report.getReports(req.query, (err, reports) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      reports,
    });
  });
};

// ======================
// ADD REPORT
// ======================
exports.addReport = (req, res) => {
  Report.addReport(req.body, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "Checklist Report Added Successfully",
    });
  });
};

// ======================
// DELETE REPORT
// ======================
exports.deleteReport = (req, res) => {
  Report.deleteReport(req.params.id, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "Deleted Successfully",
    });
  });
};

// ======================
// EXPORT CSV
// ======================
exports.exportCSV = (req, res) => {
  Report.getReports({}, (err, reports) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    if (!reports || reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Reports Found",
      });
    }

    const fields = [
      "submitted_at",
      "status",
      "checklist_name",
      "store",
      "employee",
      "question",
      "answer",
      "comment",
      "attachment",
      "department",
      "device",
      "geo_location",
    ];

    const parser = new Parser({ fields });

    const csvData = parser.parse(reports);

    res.header("Content-Type", "text/csv");
    res.attachment("ChecklistReports.csv");
    res.send(csvData);
  });
};

// ======================
// IMPORT CSV
// ======================
exports.importCSV = (req, res) => {

  try {

    console.log("===== IMPORT START =====");
    console.log("FILE =>", req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const rows = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        console.log("ROW =>", row);
        rows.push(row);
      })
      .on("end", () => {

        console.log("TOTAL ROWS =>", rows.length);

        Report.importReports(rows, (err) => {

          if (err) {
            console.error("MYSQL ERROR =>", err);

            return res.status(500).json({
              success: false,
              message: err.message
            });
          }

          fs.unlink(req.file.path, () => {});

          res.json({
            success: true,
            message: "Imported Successfully"
          });

        });

      })
      .on("error", (err) => {

        console.error("CSV ERROR =>", err);

        res.status(500).json({
          success: false,
          message: err.message
        });

      });

  } catch (err) {

    console.error("SERVER ERROR =>", err);

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};
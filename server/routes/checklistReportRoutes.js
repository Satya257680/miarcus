const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const {

    getAllReports,

    getReportById,

    updateReport,

    deleteReport,

    importReportsCSV

} = require("../controllers/checklistReportController");


// ======================================================
// CHECKLIST REPORT ROUTES
// Base URL:
// /api/checklist-reports
// ======================================================


// ======================================================
// GET ALL REPORTS
// GET /api/checklist-reports
// ======================================================

router.get(
    "/",
    getAllReports
);


// ======================================================
// IMPORT CSV REPORTS
// POST /api/checklist-reports/import
// ======================================================

router.post(
    "/import",
    upload.single("file"),
    (req, res, next) => {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message: "Please upload CSV file."

            });

        }

        next();

    },
    importReportsCSV
);


// ======================================================
// GET REPORT DETAILS
// GET /api/checklist-reports/:id
// ======================================================

router.get(
    "/:id",
    getReportById
);


// ======================================================
// UPDATE REPORT
// PUT /api/checklist-reports/:id
// ======================================================

router.put(
    "/:id",
    updateReport
);


// ======================================================
// DELETE REPORT
// DELETE /api/checklist-reports/:id
// ======================================================

router.delete(
    "/:id",
    deleteReport
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
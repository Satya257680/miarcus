const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

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
// Permission: View
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware("Checklist Reports", "View"),
    getAllReports
);


// ======================================================
// IMPORT CSV REPORTS
// POST /api/checklist-reports/import
// Permission: Add
// ======================================================

router.post(
    "/import",
    authMiddleware,
    permissionMiddleware("Checklist Reports", "Add"),
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
// Permission: View
// ======================================================

router.get(
    "/:id",
    authMiddleware,
    permissionMiddleware("Checklist Reports", "View"),
    getReportById
);


// ======================================================
// UPDATE REPORT
// PUT /api/checklist-reports/:id
// Permission: Edit
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware("Checklist Reports", "Edit"),
    updateReport
);


// ======================================================
// DELETE REPORT
// DELETE /api/checklist-reports/:id
// Permission: Full
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware("Checklist Reports", "Full"),
    deleteReport
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
const express = require("express");

const router = express.Router();

const multer = require("multer");

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({

    storage: multer.memoryStorage()

});

// ======================================================
// CONTROLLER
// ======================================================

const {

    getAllReports,

    getReportById,

    updateReport,

    deleteReport,

    bulkUploadChecklistReports,

    exportReports

} = require("../controllers/checklistReportController");

// ======================================================
// BASE URL
// /api/checklist-reports
// ======================================================

// ======================================================
// GET ALL REPORTS
// GET /api/checklist-reports
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "View"

    ),

    getAllReports

);

// ======================================================
// EXPORT REPORTS
// GET /api/checklist-reports/export
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "View"

    ),

    exportReports

);

// ======================================================
// BULK UPLOAD REPORTS
// POST /api/checklist-reports/bulk-upload
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "Add"

    ),

    upload.single("file"),

    bulkUploadChecklistReports

);

// ======================================================
// GET REPORT BY ID
// GET /api/checklist-reports/:id
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "View"

    ),

    getReportById

);

// ======================================================
// UPDATE REPORT
// PUT /api/checklist-reports/:id
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "Edit"

    ),

    updateReport

);

// ======================================================
// DELETE REPORT
// DELETE /api/checklist-reports/:id
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Reports",

        "Full"

    ),

    deleteReport

);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
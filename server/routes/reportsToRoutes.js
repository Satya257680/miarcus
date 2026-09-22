const express = require("express");

const multer = require("multer");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

const extendUploadTimeout = require("../middleware/extendUploadTimeout");



// ======================================================
// CONTROLLER
// ======================================================

const reportsToController = require("../controllers/reportsToController");





// ======================================================
// MULTER CONFIGURATION
//
// UNLIMITED UPLOAD SIZE
// Previously raised from 10 MB to 100 MB; now uncapped entirely so a
// genuinely large bulk-upload spreadsheet is never rejected before
// the controller ever sees it (`limits.fileSize` left unset = no
// limit, same fix as Checklist Reports / Users bulk upload — see
// middleware/bulkFileUpload.js). The IIS reverse-proxy in front of
// this app (server/web.config) still applies its own ceiling, raised
// to the maximum IIS supports.
// ======================================================

const upload = multer({
    dest: "uploads/",
    limits: { files: 1, parts: 20, fields: 20, fieldSize: 1024 * 1024 }
});







// ======================================================
// BASE URL
// /api/reports-to
// ======================================================







// ======================================================
// GET ALL REPORTS
// GET /api/reports-to
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Reports To",

        "View"

    ),

    reportsToController.getReports

);








// ======================================================
// EXPORT REPORTS
// GET /api/reports/export
// Permission : View
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Reports To",

        "View"

    ),

    reportsToController.exportReports

);




// ======================================================
// CREATE REPORT
// POST /api/reports-to
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Reports To",

        "Add"

    ),

    reportsToController.createReport

);








// ======================================================
// BULK UPLOAD REPORTS
// POST /api/reports-to/bulk-upload
// Permission : Add
// ======================================================

router.post(

    "/bulk-upload",

    extendUploadTimeout,

    authMiddleware,

    permissionMiddleware(

        "Reports To",

        "Add"

    ),

    upload.single("file"),

    reportsToController.bulkUploadReports

);








// ======================================================
// UPDATE REPORT
// PUT /api/reports-to/:id
// Permission : Edit
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Reports To",

        "Edit"

    ),

    reportsToController.editReport

);








// ======================================================
// DELETE REPORT
// DELETE /api/reports-to/:id
// Permission : Full
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Reports To",

        "Full"

    ),

    reportsToController.removeReport

);








// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
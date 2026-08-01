const express = require("express");

const multer = require("multer");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");



// ======================================================
// CONTROLLER
// ======================================================

const reportsToController = require("../controllers/reportsToController");





// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({

    dest:"uploads/"

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
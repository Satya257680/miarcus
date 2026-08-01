const express = require("express");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require(
    "../middleware/authMiddleware"
);


const permissionMiddleware = require(
    "../middleware/permissionMiddleware"
);


const upload = require(
    "../middleware/upload"
);




// ======================================================
// CONTROLLER
// ======================================================

const {

    createSubmission,

    getAllSubmissions,

    getSubmissionById,

    updateStatus,

    exportSubmissions


} = require(
    "../controllers/checklistSubmissionController"
);





// ======================================================
// BASE URL
// /api/checklist-submissions
// ======================================================






// ======================================================
// CREATE CHECKLIST SUBMISSION
// POST /api/checklist-submissions
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "Add"

    ),

    upload.single("attachment"),

    createSubmission

);







// ======================================================
// GET ALL SUBMISSIONS
// SEARCH + PAGINATION
// GET /api/checklist-submissions
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    getAllSubmissions

);








// ======================================================
// EXPORT SUBMISSIONS
// GET /api/checklist-submissions/export
// Permission : View
// IMPORTANT BEFORE /:id
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    exportSubmissions

);








// ======================================================
// GET SINGLE SUBMISSION
// GET /api/checklist-submissions/:id
// Permission : View
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    getSubmissionById

);








// ======================================================
// UPDATE STATUS
// PUT /api/checklist-submissions/:id/status
// Permission : Edit
// ======================================================

router.put(

    "/:id/status",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "Edit"

    ),

    updateStatus

);








// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
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

const syncGalleryAttachment = require(
    "../middleware/galleryAttachmentSync"
);

const ChecklistSubmission = require(
    "../models/checklistSubmissionModel"
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

    syncGalleryAttachment("Checklist Submission", "attachment"),

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
// IMPORTANT: KEEP BEFORE /:id
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
// SUBMISSION FORM OPTIONS
// ------------------------------------------------------
// The Checklist Submission form needs Checklist Types,
// Stores and Questions to build itself. Those are master
// data (Settings → Administrator only), so the form reads
// them through these endpoints, which are guarded by the
// user's "Checklist Submission" permission instead of the
// Settings permissions. Read-only — nothing here can change
// master data.
//
// GET /api/checklist-submissions/form-options/checklist-types
// GET /api/checklist-submissions/form-options/stores
// GET /api/checklist-submissions/form-options/questions?checklist_type_id=ID
// Permission : Checklist Submission → View
// IMPORTANT: KEEP BEFORE /:id
// ======================================================

const checklistTypeController = require(
    "../controllers/checklistTypeController"
);

const questionController = require(
    "../controllers/questionController"
);

const { getStores } = require(
    "../controllers/storeController"
);

router.get(

    "/form-options/checklist-types",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    checklistTypeController.getChecklistTypes

);

router.get(

    "/form-options/stores",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    getStores

);

router.get(

    "/form-options/questions",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    (req, res, next) => {

        // Only the questions of one checklist type are exposed
        // here — never the full question bank.
        if (!req.query.checklist_type_id) {

            return res.status(400).json({

                success: false,

                message: "checklist_type_id is required"

            });

        }

        return next();

    },

    questionController.getQuestions

);

// ======================================================
// GET SUBMISSIONS FOR NEW STORE OPENING
// GET /api/checklist-submissions/by-nso/:newStoreOpeningId
// Permission : View
// IMPORTANT: KEEP BEFORE /:id
// ======================================================

router.get(

    "/by-nso/:newStoreOpeningId",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    (req, res) => {

        ChecklistSubmission.getByNewStoreOpeningId(
            req.params.newStoreOpeningId,
            (err, rows) => {
                if (err) {
                    console.error("GET NSO SUBMISSIONS ERROR:", err);
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }
                return res.json({
                    success: true,
                    data: rows
                });
            }
        );
    }
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
// UPDATE SUBMISSION STATUS
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
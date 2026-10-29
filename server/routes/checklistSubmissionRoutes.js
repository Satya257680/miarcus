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

    // "attachment" (optional, 1 file) + "question_photos"
    // (photo evidence for individual questions).
    upload.checklistEvidence(),

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

    (req, res) => {
        const ChecklistType = require("../models/checklistTypeModel");
        const access = require("../services/checklistAccessService");
        ChecklistType.getAllChecklistTypes(async (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: err.message });
            }
            try {
                // Only the checklist types this user may submit
                // (Checklist Access Control). Admins see everything.
                const userAccess = await access.getUserAccess(req.user.id);
                const data = rows.filter((row) => access.canUseType(userAccess, row.checklist_name));
                return res.status(200).json({ success: true, count: data.length, data });
            } catch (error) {
                console.error("Checklist access check failed:", error.message);
                return res.status(500).json({ success: false, message: "Failed to load checklist types" });
            }
        });
    }

);

router.get(

    "/form-options/stores",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    // Stores the user can submit a checklist for:
    //   1. administrators and all-store users (e.g. ASM designations) ->
    //      every store; everyone else -> the stores assigned to them;
    //   2. then narrowed by the user's Filter Access global Store default,
    //      if an administrator set one (nothing set = unchanged).
    // BUG FIX: all-store users used to be routed through
    // storeController.getStores, which trimmed the list with the
    // department rule and returned no stores at all.
    async (req, res, next) => {
        try {
            const { getStoreScope } = require("../services/notificationAudience");
            const filterAccess = require("../utils/filterAccess");
            const Store = require("../models/storeModel");

            const scope = await getStoreScope(req.user?.id);
            const admin = filterAccess.isAdministrator(req.user);

            let globalStore = null;
            if (!admin) {
                const globals = await filterAccess.getGlobalPolicies(req.user.id);
                globalStore = globals.store || null;
            }

            Store.getAllStores((err, rows) => {
                if (err) return res.status(500).json({ success: false, message: "Failed to fetch stores" });

                let data = rows || [];

                if (!admin && !scope.allStores) {
                    const assigned = new Set((scope.storeIds || []).map(Number));
                    data = data.filter((store) => assigned.has(Number(store.id)));
                }

                if (globalStore?.policy === "selected") {
                    const allowed = new Set(globalStore.ids.map(Number));
                    data = data.filter((store) => allowed.has(Number(store.id)));
                } else if (globalStore?.policy === "none") {
                    data = [];
                }

                return res.status(200).json({ success: true, count: data.length, data });
            });
        } catch (error) {
            return next(error);
        }
    }

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

    async (req, res, next) => {
        // Never expose the questions of a checklist the user may not submit.
        try {
            const access = require("../services/checklistAccessService");
            const ChecklistType = require("../models/checklistTypeModel");
            const userAccess = await access.getUserAccess(req.user.id);
            if (userAccess.unrestricted) return next();
            ChecklistType.getChecklistTypeById(Number(req.query.checklist_type_id), (err, rows) => {
                if (err) return res.status(500).json({ success: false, message: "Failed to verify checklist access" });
                const type = rows && rows[0];
                if (type && !access.canUseType(userAccess, type.checklist_name)) {
                    return res.status(403).json({ success: false, message: "You do not have access to this checklist." });
                }
                return next();
            });
        } catch (error) {
            return next(error);
        }
    },
    questionController.getQuestions

);

// ======================================================
// LOCKED QUESTIONS (per store, per question)
// GET /api/checklist-submissions/form-options/locked-questions
//     ?checklist_type_id=ID&store_id=ID
// Permission : Checklist Submission → View
// IMPORTANT: KEEP BEFORE /:id
//
// Questions of this Opening / Closing checklist that the selected store
// may not answer right now because an Action Point raised from that
// question for THAT store is still unresolved. Only the user's own
// stores can be queried. See services/checklistQuestionLockService.js.
// ======================================================

router.get(

    "/form-options/locked-questions",

    authMiddleware,

    permissionMiddleware(

        "Checklist Submission",

        "View"

    ),

    async (req, res) => {
        try {
            const lockService = require("../services/checklistQuestionLockService");
            const checklistTypeId = Number(req.query.checklist_type_id);
            const storeId = Number(req.query.store_id);

            if (!Number.isInteger(checklistTypeId) || checklistTypeId <= 0 ||
                !Number.isInteger(storeId) || storeId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "checklist_type_id and store_id are required"
                });
            }

            if (!(await lockService.canUserAccessStore(req.user, storeId))) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this store."
                });
            }

            const data = await lockService.getLockedQuestions({ storeId, checklistTypeId });

            return res.status(200).json({
                success: true,
                count: data.length,
                message: lockService.LOCKED_MESSAGE,
                data
            });
        } catch (error) {
            console.error("LOCKED QUESTIONS ERROR:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to load question availability."
            });
        }
    }

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
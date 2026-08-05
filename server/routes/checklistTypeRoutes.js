const express = require("express");

const multer = require("multer");

const router = express.Router();

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

const checklistTypeController = require("../controllers/checklistTypeController");

// ======================================================
// BASE URL
// /api/checklist-types
// ======================================================

// ======================================================
// GET ALL CHECKLIST TYPES
// GET /api/checklist-types
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "View"

    ),

    checklistTypeController.getChecklistTypes

);

// ======================================================
// EXPORT CHECKLIST TYPES
// GET /api/checklist-types/export
// Permission : View
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "View"

    ),

    checklistTypeController.exportChecklistTypes

);

// ======================================================
// CREATE CHECKLIST TYPE
// POST /api/checklist-types
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "Add"

    ),

    checklistTypeController.createChecklistType

);

// ======================================================
// BULK UPLOAD CHECKLIST TYPES
// POST /api/checklist-types/bulk-upload
// Permission : Add
// Supports CSV, XLSX and XLS
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "Add"

    ),

    upload.single("file"),

    checklistTypeController.bulkUploadChecklistTypes

);

// ======================================================
// DELETE ALL CHECKLIST TYPES
// DELETE /api/checklist-types/delete-all
// Permission : Full
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "Full"

    ),

    checklistTypeController.deleteAllChecklistTypes

);

// ======================================================
// GET CHECKLIST TYPE BY ID
// GET /api/checklist-types/:id
// Permission : View
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "View"

    ),

    checklistTypeController.getChecklistTypeById

);

// ======================================================
// UPDATE CHECKLIST TYPE
// PUT /api/checklist-types/:id
// Permission : Edit
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "Edit"

    ),

    checklistTypeController.updateChecklistType

);

// ======================================================
// DELETE CHECKLIST TYPE
// DELETE /api/checklist-types/:id
// Permission : Full
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Checklist Types",

        "Full"

    ),

    checklistTypeController.deleteChecklistType

);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
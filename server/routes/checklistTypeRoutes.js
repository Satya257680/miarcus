const express = require("express");

const multer = require("multer");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

// Master data (create / edit / delete / import / export) is
// Administrator-only. Read access stays permission-based because
// other modules (Action Points, Expenses, Reports...) read it.
const adminOnly = require("../middleware/adminOnly");

const extendUploadTimeout = require("../middleware/extendUploadTimeout");

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
    storage: multer.memoryStorage(),
    limits: { files: 1, parts: 20, fields: 20, fieldSize: 1024 * 1024 }
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

    adminOnly,

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

    adminOnly,

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

    extendUploadTimeout,

    authMiddleware,

    adminOnly,

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

    adminOnly,

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

    adminOnly,

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

    adminOnly,

    checklistTypeController.deleteChecklistType

);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
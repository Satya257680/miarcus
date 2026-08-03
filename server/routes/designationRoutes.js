const express = require("express");

const router = express.Router();

// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");

const upload = require("../middleware/upload");

// ======================================================
// CONTROLLER
// ======================================================

const designationController = require("../controllers/designationController");

// ======================================================
// GET ALL DESIGNATIONS
// GET /api/designations
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "View"

    ),

    designationController.getAllDesignations

);

// ======================================================
// EXPORT DESIGNATIONS
// GET /api/designations/export
// Permission : View
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "View"

    ),

    designationController.exportDesignations

);

// ======================================================
// DOWNLOAD SAMPLE FILE
// GET /api/designations/sample
// Permission : View
// ======================================================

router.get(

    "/sample",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "View"

    ),

    designationController.downloadSampleFile

);

// ======================================================
// BULK UPLOAD DESIGNATIONS
// POST /api/designations/bulk-upload
// Permission : Add
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "Add"

    ),

    upload.single("file"),

    designationController.bulkUploadDesignations

);

// ======================================================
// DELETE ALL DESIGNATIONS
// DELETE /api/designations/delete-all
// Permission : Full
// IMPORTANT: MUST COME BEFORE /:id
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "Full"

    ),

    designationController.deleteAllDesignations

);

// ======================================================
// GET ASSIGNED USERS
// GET /api/designations/:id/users
// Permission : View
// ======================================================

router.get(

    "/:id/users",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "View"

    ),

    designationController.getAssignedUsers

);

// ======================================================
// GET DESIGNATION BY ID
// GET /api/designations/:id
// Permission : View
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "View"

    ),

    designationController.getDesignationById

);

// ======================================================
// CREATE DESIGNATION
// POST /api/designations
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "Add"

    ),

    designationController.createDesignation

);

// ======================================================
// UPDATE DESIGNATION
// PUT /api/designations/:id
// Permission : Edit
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "Edit"

    ),

    designationController.updateDesignation

);

// ======================================================
// DELETE DESIGNATION
// DELETE /api/designations/:id
// Permission : Full
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Designations",

        "Full"

    ),

    designationController.deleteDesignation

);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
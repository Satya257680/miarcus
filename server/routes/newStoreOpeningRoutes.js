const express = require("express");

const router = express.Router();


// ======================================================
// UPLOAD
// ======================================================

const upload = require("../middleware/upload");



// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");



// ======================================================
// CONTROLLER
// ======================================================

const {

    getAllNewStoreOpenings,

    getNewStoreOpeningById,

    createNewStoreOpening,

    updateNewStoreOpening,

    deleteNewStoreOpening,

    deleteAllNewStoreOpenings,

    exportNewStoreOpeningsCSV,

    bulkUploadNewStoreOpenings


} = require("../controllers/newStoreOpeningController");




// ======================================================
// NEW STORE OPENINGS ROUTES
// Base URL:
// /api/new-store-openings
// ======================================================






// ======================================================
// EXPORT CSV
// IMPORTANT: BEFORE "/:id"
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "View"
    ),

    exportNewStoreOpeningsCSV

);







// ======================================================
// BULK IMPORT
// EXCEL UPLOAD
// IMPORTANT: BEFORE "/:id"
// ======================================================

router.post(

    "/bulk-upload",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "Add"
    ),

    upload.single("file"),

    bulkUploadNewStoreOpenings

);







// ======================================================
// GET ALL
// SEARCH + PAGINATION
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "View"
    ),

    getAllNewStoreOpenings

);







// ======================================================
// GET BY ID
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "View"
    ),

    getNewStoreOpeningById

);







// ======================================================
// CREATE
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "Add"
    ),

    upload.single("attachment"),

    createNewStoreOpening

);







// ======================================================
// UPDATE
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "Edit"
    ),

    upload.single("attachment"),

    updateNewStoreOpening

);







// ======================================================
// DELETE ALL
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "Full"
    ),

    deleteAllNewStoreOpenings

);







// ======================================================
// DELETE SINGLE
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(
        "New Store Openings",
        "Full"
    ),

    deleteNewStoreOpening

);







module.exports = router;
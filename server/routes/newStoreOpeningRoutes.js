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

    exportNewStoreOpeningsCSV

} = require("../controllers/newStoreOpeningController");

// ======================================================
// NEW STORE OPENINGS ROUTES
// Base URL:
// /api/new-store-openings
// ======================================================



// ======================================================
// EXPORT CSV
// IMPORTANT: MUST BE BEFORE "/:id"
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware("New Store Openings", "View"),

    exportNewStoreOpeningsCSV

);



// ======================================================
// GET ALL
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware("New Store Openings", "View"),

    getAllNewStoreOpenings

);



// ======================================================
// GET BY ID
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware("New Store Openings", "View"),

    getNewStoreOpeningById

);



// ======================================================
// CREATE
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware("New Store Openings", "Add"),

    upload.single("attachment"),

    createNewStoreOpening

);



// ======================================================
// UPDATE
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware("New Store Openings", "Edit"),

    upload.single("attachment"),

    updateNewStoreOpening

);



// ======================================================
// DELETE
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware("New Store Openings", "Full"),

    deleteNewStoreOpening

);

module.exports = router;
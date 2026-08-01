const express = require("express");

const router = express.Router();


// ======================================================
// MIDDLEWARE
// ======================================================

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");


// ======================================================
// CONTROLLER
// ======================================================

const {

    getAllNSOTracking,

    getNSOTrackingById,

    getByStoreOpening,

    createNSOTracking,

    updateNSOTracking,

    updateStatus,

    deleteNSOTracking,

    deleteAllNSOTracking,

    exportNSOTracking


} = require("../controllers/nsoTrackingController");




// ======================================================
// BASE URL
// /api/nso-tracking
// ======================================================



// ======================================================
// EXPORT CSV
// IMPORTANT: BEFORE /:id
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),

    exportNSOTracking

);





// ======================================================
// GET ALL
// SEARCH + PAGINATION
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),

    getAllNSOTracking

);





// ======================================================
// GET BY NEW STORE OPENING ID
// ======================================================

router.get(

    "/store/:id",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),

    getByStoreOpening

);





// ======================================================
// CREATE
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "Add"
    ),

    createNSOTracking

);





// ======================================================
// DELETE ALL
// ======================================================

router.delete(

    "/delete-all",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "Full"
    ),

    deleteAllNSOTracking

);





// ======================================================
// UPDATE STATUS
// ======================================================

router.patch(

    "/status/:id",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "Edit"
    ),

    updateStatus

);





// ======================================================
// GET BY ID
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "View"
    ),

    getNSOTrackingById

);





// ======================================================
// UPDATE
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "Edit"
    ),

    updateNSOTracking

);





// ======================================================
// DELETE
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(
        "NSO Tracking",
        "Full"
    ),

    deleteNSOTracking

);



module.exports = router;
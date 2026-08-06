const express = require("express");

const router = express.Router();



// ======================================================
// MIDDLEWARE
// ======================================================

const upload = require("../middleware/upload");

const authMiddleware = require("../middleware/authMiddleware");

const permissionMiddleware = require("../middleware/permissionMiddleware");



// ======================================================
// CONTROLLER
// ======================================================

const {

    getAllActionPoints,

    getActionPointById,

    exportActionPointsCSV,

    createActionPoint,

    updateActionPoint,

    takeAction,

    deleteActionPoint,

    deleteAllActionPoints

} = require("../controllers/actionPointController");



// ======================================================
// BASE URL
// /api/action-points
// ======================================================



// ======================================================
// GET ALL ACTION POINTS
// GET /api/action-points
// Permission : View
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "View"

    ),

    getAllActionPoints

);



// ======================================================
// EXPORT CSV
// GET /api/action-points/export
// IMPORTANT : BEFORE /:id
// Permission : View
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "View"

    ),

    exportActionPointsCSV

);



// ======================================================
// GET ACTION POINT BY ID
// GET /api/action-points/:id
// Permission : View
// ======================================================

router.get(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "View"

    ),

    getActionPointById

);



// ======================================================
// CREATE ACTION POINT
// POST /api/action-points
// Permission : Add
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "Add"

    ),

    upload.single(

        "attachment"

    ),

    createActionPoint

);



// ======================================================
// UPDATE ACTION POINT
// PUT /api/action-points/:id
// Permission : Edit
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "Edit"

    ),

    upload.single(

        "attachment"

    ),

    updateActionPoint

);



// ======================================================
// TAKE ACTION
// PUT /api/action-points/:id/take-action
// Permission : Edit
// ======================================================

router.put(

    "/:id/take-action",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "Edit"

    ),

    takeAction

);



// ======================================================
// DELETE ACTION POINT
// DELETE /api/action-points/:id
// Permission : Full
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "Full"

    ),

    deleteActionPoint

);



// ======================================================
// DELETE ALL ACTION POINTS
// DELETE /api/action-points
// Permission : Full
// ======================================================

router.delete(

    "/",

    authMiddleware,

    permissionMiddleware(

        "Action Points",

        "Full"

    ),

    deleteAllActionPoints

);



// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
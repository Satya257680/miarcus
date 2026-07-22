const express = require("express");

const router = express.Router();


// ================= UPLOAD =================

const upload = require("../middleware/upload");




// ================= CONTROLLER =================

const {

    getAllActionPoints,

    exportActionPointsCSV,

    createActionPoint,

    updateActionPoint,

    deleteActionPoint,

    takeAction

} = require("../controllers/actionPointController");









// ======================================================
// ACTION POINT ROUTES
// Base URL:
// /api/action-points
// ======================================================







// ======================================================
// GET ALL ACTION POINTS
// GET
// /api/action-points
//
// Query:
//
// page
// limit
// search
// store_id
// department_id
// status
// checklist_type_id
// start_date
// end_date
//
// ======================================================

router.get(

    "/",

    getAllActionPoints

);









// ======================================================
// EXPORT CSV
// GET
// /api/action-points/export
// ======================================================

router.get(

    "/export",

    exportActionPointsCSV

);









// ======================================================
// CREATE ACTION POINT
// POST
// /api/action-points
//
// FORM DATA:
//
// submission_id
// question_id
// answer
// remarks
// store_id
// department_id
// sla
// attachment
//
// ======================================================

router.post(

    "/",

    upload.single("attachment"),

    createActionPoint

);









// ======================================================
// UPDATE ACTION POINT
// PUT
// /api/action-points/:id
//
// FORM DATA:
//
// answer
// remarks
// attachment
//
// ======================================================

router.put(

    "/:id",

    upload.single("attachment"),

    updateActionPoint

);









// ======================================================
// TAKE ACTION
// PUT
// /api/action-points/:id/take-action
//
// BODY:
//
// action_taken
// remarks
// completion_date
//
// ======================================================

router.put(

    "/:id/take-action",

    takeAction

);









// ======================================================
// DELETE ACTION POINT
// DELETE
// /api/action-points/:id
// ======================================================

router.delete(

    "/:id",

    deleteActionPoint

);









module.exports = router;
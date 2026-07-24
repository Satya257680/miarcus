const express = require("express");

const router = express.Router();

// ================= UPLOAD =================

const upload = require("../middleware/upload");

// ================= MIDDLEWARE =================

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

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
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware("Action Points", "View"),

    getAllActionPoints

);

// ======================================================
// EXPORT CSV
// ======================================================

router.get(

    "/export",

    authMiddleware,

    permissionMiddleware("Action Points", "View"),

    exportActionPointsCSV

);

// ======================================================
// CREATE ACTION POINT
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware("Action Points", "Add"),

    upload.single("attachment"),

    createActionPoint

);

// ======================================================
// UPDATE ACTION POINT
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware("Action Points", "Edit"),

    upload.single("attachment"),

    updateActionPoint

);

// ======================================================
// TAKE ACTION
// ======================================================

router.put(

    "/:id/take-action",

    authMiddleware,

    permissionMiddleware("Action Points", "Edit"),

    takeAction

);

// ======================================================
// DELETE ACTION POINT
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware("Action Points", "Full"),

    deleteActionPoint

);

module.exports = router;
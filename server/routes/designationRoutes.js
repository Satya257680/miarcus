const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const designationController = require("../controllers/designationController");

// ======================================================
// GET ALL DESIGNATIONS
// ======================================================

router.get(

    "/",

    authMiddleware,

    permissionMiddleware("Designations", "View"),

    designationController.getAllDesignations

);

// ======================================================
// CREATE DESIGNATION
// ======================================================

router.post(

    "/",

    authMiddleware,

    permissionMiddleware("Designations", "Add"),

    designationController.createDesignation

);

// ======================================================
// UPDATE DESIGNATION
// ======================================================

router.put(

    "/:id",

    authMiddleware,

    permissionMiddleware("Designations", "Edit"),

    designationController.updateDesignation

);

// ======================================================
// DELETE DESIGNATION
// ======================================================

router.delete(

    "/:id",

    authMiddleware,

    permissionMiddleware("Designations", "Full"),

    designationController.deleteDesignation

);

module.exports = router;
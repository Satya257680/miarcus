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

const designationController = require("../controllers/designationController");

// ======================================================
// GET ALL DESIGNATIONS
// Permission: View / Add / Edit / Full
// ======================================================

router.get(
    "/",
    authMiddleware,
    permissionMiddleware("Designations", "View"),
    designationController.getAllDesignations
);

// ======================================================
// CREATE DESIGNATION
// Permission: Add / Edit / Full
// ======================================================

router.post(
    "/",
    authMiddleware,
    permissionMiddleware("Designations", "Add"),
    designationController.createDesignation
);

// ======================================================
// UPDATE DESIGNATION
// Permission: Edit / Full
// ======================================================

router.put(
    "/:id",
    authMiddleware,
    permissionMiddleware("Designations", "Edit"),
    designationController.updateDesignation
);

// ======================================================
// DELETE DESIGNATION
// Permission: Full
// ======================================================

router.delete(
    "/:id",
    authMiddleware,
    permissionMiddleware("Designations", "Full"),
    designationController.deleteDesignation
);

module.exports = router;